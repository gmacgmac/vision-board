// The MCP server end to end: the real executable as a child process, a real board server on a
// free port, spoken to over stdio as a client would (api.md 45-48). A modern 2026-07-28 session
// covers server/discover, tools/list and the agent loop (join, a write with a needs-grant item,
// request_grant, the person's grant, check_responses, the resent write, show_node); a legacy
// 2025-11-25 session covers the handshake. Every structuredContent is held to its outputSchema.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import { createClient } from '../../client/src/index.ts';
import { TOOL_FILE } from '../src/index.ts';
import type { Board, Session } from './support.ts';
import { MODERN_META, call, startBoard, startMcp } from './support.ts';

const ajv = new Ajv2020({ strict: true, strictRequired: false, allErrors: true });
const outputs = new Map(TOOL_FILE.tools.map((t) => [t.name, ajv.compile(t.outputSchema)]));
const SERVER_INFO = 'io.modelcontextprotocol/serverInfo';

let board: Board;
let mcp: Session;
before(async () => {
  board = await startBoard();
  mcp = startMcp({ VB_SERVER: board.base });
});
after(async () => { await mcp.close(); await board.close(); });

/** A tool call that should work: not an error, and its structuredContent fits the outputSchema. */
async function ok(name: string, args: Record<string, unknown>): Promise<any> {
  const r = await call(mcp, name, args);
  assert.equal(r.isError, false, `${name}: ${JSON.stringify(r)}`);
  assert.equal(r.resultType, 'complete');
  assert.equal(r._meta[SERVER_INFO].name, 'vision-board');
  const validate = outputs.get(name)!;
  assert.ok(validate(r.structuredContent), `${name} output: ${JSON.stringify(validate.errors?.slice(0, 3))}`);
  assert.deepEqual(JSON.parse(r.content[0].text), r.structuredContent, 'the text block is the same answer');
  return r.structuredContent;
}

/** The board page: it sends the person cookie the server set with the page. */
async function person() {
  const page = await fetch(`${board.base}/`);
  const cookie = /^(vb_person=[^;]+)/.exec(page.headers.get('set-cookie') ?? '')![1]!;
  return createClient({ base: board.base, fetch: (url, init) => fetch(url, { ...init, headers: { ...(init?.headers as Record<string, string>), Cookie: cookie } }) });
}

test('server/discover: both versions, the tools capability, serverInfo, instructions, caching', async () => {
  const r = (await mcp.request('server/discover', { _meta: MODERN_META })).result;
  assert.deepEqual(r.supportedVersions, ['2026-07-28', '2025-11-25']);
  assert.deepEqual(r.capabilities, { tools: {} });
  assert.equal(r.resultType, 'complete');
  assert.deepEqual(r._meta[SERVER_INFO], { name: 'vision-board', title: 'Vision Board', version: TOOL_FILE.apiVersion });
  assert.match(r.instructions, /join.*save.*secret.*key.*check_responses/s);
  assert.deepEqual([typeof r.ttlMs, r.cacheScope], ['number', 'public']);
});

test('tools/list: the generated tools, unchanged, with ttlMs and cacheScope', async () => {
  const r = (await mcp.request('tools/list', { _meta: MODERN_META })).result;
  assert.deepEqual(r.tools, TOOL_FILE.tools);
  assert.deepEqual([r.resultType, typeof r.ttlMs, r.cacheScope], ['complete', 'number', 'public']);
});

let secret = '';
let head = 0;
let request = 0;

test('join: an agent id and a secret, once', async () => {
  const r = await ok('join', { label: 'MCP chat' });
  assert.match(r.agent, /^a-[a-z0-9]{8}$/);
  assert.match(r.secret, /^[A-Za-z0-9_-]{43}$/);
  secret = r.secret;
});

const QUESTION = { type: 'node', key: 'mcp-q', node: { region: 'options', kind: 'question', title: 'Monthly or yearly billing?' } };

test('write_board: on a board granted to it, a new region is written; an item in a container it does not hold fails needs-grant; not an error', async () => {
  // D-034: ask for another agent's board first.
  const board = await ok('request_grant', { board: 'pricing', reason: 'I keep notes on pricing.', secret });
  await (await person()).call('act', { board: 'pricing', body: { type: 'act', action: 'grant', request: board.request } });
  const r = await ok('write_board', {
    board: 'pricing', secret,
    items: [{ type: 'region', key: 'mcp-notes', region: { id: 'mcp-notes', title: 'MCP notes', mode: 'list' } }, QUESTION],
  });
  assert.equal(r.results[0].ok, true);
  assert.deepEqual([r.results[1].ok, r.results[1].key], [false, 'mcp-q']);
  assert.equal(r.results[1].problem.type, 'https://vision-board.invalid/problems/needs-grant');
  assert.deepEqual([r.results[1].problem.board, r.results[1].problem.region], ['pricing', 'options']);
  head = r.head;
});

test('write_board: a batch whose every item fails is isError, and still carries its per-item results', async () => {
  const r = await call(mcp, 'write_board', { board: 'pricing', secret, items: [QUESTION] });
  assert.equal(r.isError, true);
  assert.equal(r.structuredContent.results[0].problem.type, 'https://vision-board.invalid/problems/needs-grant');
  assert.ok(outputs.get('write_board')!(r.structuredContent));
});

test('request_grant, the person grants it, check_responses reads the grant', async () => {
  const asked = await ok('request_grant', { board: 'pricing', region: 'options', reason: 'I need to add the billing question.', secret });
  request = asked.request;
  assert.ok(request > 0);
  await (await person()).call('act', { board: 'pricing', body: { type: 'act', action: 'grant', request } });
  const r = await ok('check_responses', { board: 'pricing', after: head, secret });
  assert.deepEqual(r.responses.map((e: any) => [e.action, e.request]), [['grant', request]]);
  assert.ok(r.head > head);
});

let n = 0;
test('write_board: the same item, resent with the same key after the grant, is written', async () => {
  const r = await ok('write_board', { board: 'pricing', secret, items: [QUESTION] });
  assert.deepEqual([r.results[0].ok, r.results[0].key, r.results[0].ver], [true, 'mcp-q', 1]);
  n = r.results[0].n;
});

test('show_node: the node just written, with its history', async () => {
  const r = await ok('show_node', { board: 'pricing', n });
  assert.deepEqual([r.n, r.region, r.versions.length, r.versions[0].node.title], [n, 'options', 1, 'Monthly or yearly billing?']);
});

test('arguments as JSON text (some models send them so) are parsed when the schema wants a list', async () => {
  const r = await ok('write_board', { board: 'pricing', secret, items: JSON.stringify([QUESTION]) });
  assert.equal(r.results[0].replayed, true, 'same key, same content: nothing written again');
});

test('a problem answer is isError with the problem as text only, no structuredContent', async () => {
  const r = await call(mcp, 'get_board', { board: 'no-such-board' });
  assert.equal(r.isError, true);
  assert.equal('structuredContent' in r, false);
  assert.equal(r.content.length, 1);
  assert.match(r.content[0].text, /no-such-board/);
});

test('arguments that do not fit the input schema are isError, naming each field; nothing is sent', async () => {
  const r = await call(mcp, 'show_node', { board: 'Bad Id', extra: 1 });
  assert.equal(r.isError, true);
  assert.equal('structuredContent' in r, false);
  const text = r.content[0].text;
  for (const want of ['/n: is required', '/board: must match', '/extra: is not a field here']) assert.ok(text.includes(want), text);
});

test('an unknown tool is a JSON-RPC error, not a tool result', async () => {
  const r = await mcp.request('tools/call', { name: 'drop_everything', arguments: {}, _meta: MODERN_META });
  assert.equal(r.error.code, -32602);
  assert.match(r.error.message, /drop_everything/);
});

test('an unknown protocol version, or none outside a legacy session, gets -32022 with the supported list', async () => {
  const unknown = await mcp.request('tools/list', { _meta: { ...MODERN_META, 'io.modelcontextprotocol/protocolVersion': '1900-01-01' } });
  assert.deepEqual([unknown.error.code, unknown.error.data], [-32022, { supported: ['2026-07-28', '2025-11-25'], requested: '1900-01-01' }]);
  const missing = await mcp.request('tools/list', {});
  assert.deepEqual([missing.error.code, missing.error.data.supported], [-32022, ['2026-07-28', '2025-11-25']]);
});

test('a modern request without client capabilities is malformed (-32602); an unknown method is -32601', async () => {
  const { 'io.modelcontextprotocol/clientCapabilities': _caps, ...noCaps } = MODERN_META;
  assert.equal((await mcp.request('tools/list', { _meta: noCaps })).error.code, -32602);
  assert.equal((await mcp.request('resources/list', { _meta: MODERN_META })).error.code, -32601);
});

test('a line that is not JSON gets a parse error; the server never sent a notification', async () => {
  const before = mcp.lines.length;
  mcp.raw('{not json');
  await mcp.request('server/discover', { _meta: MODERN_META });
  assert.equal(mcp.lines[before].error.code, -32700);
  assert.ok(mcp.lines.every((m) => 'id' in m || 'error' in m), 'only responses: no notifications/message');
});

test('legacy 2025-11-25: initialize, notifications/initialized, tools/list, tools/call and ping', async () => {
  const legacy = startMcp({ VB_SERVER: board.base });
  try {
    const init = (await legacy.request('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'old', version: '1' } })).result;
    assert.equal(init.protocolVersion, '2025-11-25');
    assert.deepEqual([init.capabilities, init.serverInfo.name], [{ tools: {} }, 'vision-board']);
    assert.match(init.instructions, /join/);
    legacy.notify('notifications/initialized');
    const list = (await legacy.request('tools/list')).result;
    assert.deepEqual(list.tools.map((t: any) => t.name), TOOL_FILE.tools.map((t) => t.name));
    const boards = (await legacy.request('tools/call', { name: 'list_boards', arguments: {} })).result;
    assert.equal(boards.isError, false);
    assert.deepEqual(boards.structuredContent.boards.map((b: any) => b.board), ['roadmap', 'pricing']);
    assert.deepEqual(Object.keys((await legacy.request('ping')).result).sort(), ['_meta', 'resultType']);
    assert.equal(legacy.lines.length, 4, 'the notification got no answer');
  } finally { await legacy.close(); }
});

test('no board server: isError, telling the agent to start it with npm run board', async () => {
  const lonely = startMcp({ VB_SERVER: 'http://127.0.0.1:1' });
  try {
    const r = await call(lonely, 'list_boards', {});
    assert.equal(r.isError, true);
    assert.equal('structuredContent' in r, false);
    assert.match(r.content[0].text, /^The board server at http:\/\/127\.0\.0\.1:1 is not answering .*`npm run board`/);
  } finally { await lonely.close(); }
});

test('VB_AGENT_SECRET stands in for a missing secret argument', async () => {
  const shared = startMcp({ VB_SERVER: board.base, VB_AGENT_SECRET: secret });
  try {
    const r = await call(shared, 'request_grant', { board: 'pricing', region: 'options', reason: 'Asking again.' });
    assert.equal(r.isError, false, JSON.stringify(r));
    assert.equal(r.structuredContent.held, true, 'the env secret is the agent that already holds options');
  } finally { await shared.close(); }
});
