// The server's own argument check (api.md 47) and the stdio framing, in process: required and
// unknown fields, enums, code-point lengths, unions by `type`, JSON text for a list, and a
// cancelled request that is never answered while the next one is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { createInterface } from 'node:readline';
import type { McpServer, RpcResponse } from '../src/index.ts';
import { INSTRUCTIONS, INSTRUCTIONS_JOINED, LEGACY, TOOLS, checkArgs, createMcpServer, serveStdio, split, routeOf } from '../src/index.ts';

const input = (name: string) => TOOLS.get(name)!.inputSchema;

test('required, unknown and wrongly typed fields each get a line with their pointer', () => {
  const r = checkArgs(input('show_node'), { board: 'pricing', n: 'three', colour: 'red' });
  assert.deepEqual(r.problems, ['/n: must be integer, not string', '/colour: is not a field here']);
  assert.deepEqual(checkArgs(input('show_node'), {}).problems, ['/board: is required', '/n: is required']);
});

test('lengths count code points, as the board server does; blank text is refused', () => {
  const label = (s: string) => checkArgs(input('join'), { label: s }).problems;
  assert.deepEqual(label('😀'.repeat(80)), []);
  assert.deepEqual(label('😀'.repeat(81)), ['/label: must be at most 80 characters']);
  assert.deepEqual(label('   '), ['/label: must not be blank']);
});

test('a write item is checked against the form its `type` names; an unknown type lists the forms', () => {
  const items = (x: unknown) => checkArgs(input('write_board'), { board: 'b', items: [x] }).problems;
  assert.deepEqual(items({ type: 'node', node: { region: 'r', kind: 'idea', title: 'T' } }),
    ['/items/0/node/kind: must be one of "question", "finding", "decision", "risk", "action", "topic", "note"']);
  assert.match(items({ type: 'poster' })[0]!, /^\/items\/0\/type: must be one of "board", "region", "node"/);
  assert.deepEqual(items({ type: 'link', from: { key: 'a' }, to: 3 }), []);
});

test('a list sent as JSON text is parsed; the checked value is what gets sent', () => {
  const r = checkArgs(input('write_board'), { board: 'b', items: '[{"type":"board","title":"B"}]' });
  assert.deepEqual(r.problems, []);
  assert.deepEqual((r.value as { items: unknown }).items, [{ type: 'board', title: 'B' }]);
});

test('split: path and query by name, body fields into the body, the secret only where the operation takes it', () => {
  assert.deepEqual(split(routeOf('check_responses'), { board: 'b', after: 3, wait: 0 }, 'env-secret'),
    { input: { board: 'b', after: 3, wait: 0 }, secret: 'env-secret' });
  assert.deepEqual(split(routeOf('write_board'), { board: 'b', items: [], secret: 'own' }),
    { input: { board: 'b', body: { items: [] } }, secret: 'own' });
  assert.deepEqual(split(routeOf('join'), { label: 'L', secret: 'ignored' }, 'env'), { input: { body: { label: 'L' } } });
});

test('with VB_AGENT_SECRET set, the instructions say the identity is given: no join, no secret to save', async () => {
  const init = async (secret?: string) => {
    const r = await createMcpServer({ base: 'http://127.0.0.1:1', ...(secret && { secret }) })
      .handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: LEGACY } });
    return (r as unknown as { result: { instructions: string } }).result.instructions;
  };
  assert.equal(await init(), INSTRUCTIONS);
  assert.equal(await init('s'.repeat(43)), INSTRUCTIONS_JOINED);
  assert.match(INSTRUCTIONS_JOINED, /do not call `join`/);
  assert.doesNotMatch(INSTRUCTIONS_JOINED, /save/);
});

test('stdio: requests run at once and answer by id; a cancelled one is never answered; end of input ends it', async () => {
  const handled: string[] = [];
  const server: McpServer = {
    async handle(message, signal) {
      handled.push(message.method);
      if (message.method === 'slow') {
        await new Promise((resolve) => signal!.addEventListener('abort', resolve));
        handled.push('slow aborted');
      }
      return message.id === undefined ? undefined : { jsonrpc: '2.0', id: message.id, result: { resultType: 'complete', method: message.method } };
    },
  };
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const answers: RpcResponse[] = [];
  createInterface({ input: stdout }).on('line', (line) => answers.push(JSON.parse(line)));
  const done = serveStdio(server, { input: stdin, output: stdout });
  stdin.write('{"jsonrpc":"2.0","id":1,"method":"slow"}\n');
  stdin.write('{"jsonrpc":"2.0","id":2,"method":"fast"}\n');
  stdin.write('{"jsonrpc":"2.0","method":"notifications/cancelled","params":{"requestId":1}}\n');
  stdin.write('[1,2]\n');
  while (answers.length < 2) await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(handled, ['slow', 'fast', 'slow aborted'], 'cancelled while the input is still open');
  stdin.end();
  await done;
  assert.deepEqual(answers.map((a) => ('result' in a ? a.id : a.error.code)), [2, -32600]);
});
