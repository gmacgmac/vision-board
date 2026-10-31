// The board's engine part with no HTTP server (ENGINE_01; api.md § The engine): on a temporary data
// folder holding the roadmap fixture, it answers a read route and a write route, resolves a chip
// (and refuses a changed one), the selection and the person's answers since a line, lists and calls every
// tool in MCP's shapes (an input that does not fit, or a problem, is `isError`; a board write says what
// it changed), serves them through the MCP server's own protocol, and tells a watcher of a write made
// through another engine on the same folder. The caller is passed in, as a host passes it.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { AnswersText, ChipRefusal } from '#actions';
import { answersChip, roundOf, selectionChip } from '#actions';
import { boardWriteSummary } from '#agent';
import { FIXTURES_DIR, TOOLS_FILE } from '#format/files';
import { createMcpServer, INSTRUCTIONS_JOINED, MODERN } from '#mcp';
import type { Caller, Engine, EngineChange } from '../server/engine/index.ts';
import { createEngine, TOOL_CHANGE } from '../server/engine/index.ts';
import { makeTempDir } from '#format/testing';

const PERSON: Caller = { by: 'person' };
const dirs: string[] = [];
after(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });

/** A data folder holding the roadmap fixture as its ledger. */
function dataDir(): string {
  const dir = makeTempDir('vb-engine-');
  dirs.push(dir);
  fs.copyFileSync(path.join(FIXTURES_DIR, 'roadmap.ledger.jsonl'), path.join(dir, 'ledger.jsonl'));
  return dir;
}

const open = (dir = dataDir()): Engine => createEngine({ dir, name: () => '~/example', warn: () => {} });

/** A route's answer, which must be one. */
async function call(engine: Engine, method: string, rel: string, extra: { body?: unknown; caller?: Caller; query?: string } = {}) {
  const r = await engine.route({ method, path: rel, query: new URLSearchParams(extra.query ?? ''), body: extra.body }, { caller: extra.caller });
  assert.ok(r, `${method} ${rel} is an engine route`);
  return r;
}

/** A tool's result, which must have worked. */
async function tool(engine: Engine, name: string, input: Record<string, unknown>, caller?: Caller): Promise<any> {
  const out = await engine.tools.call(name, input, caller && { caller });
  assert.equal(out.isError, false, `${name}: ${JSON.stringify(out)}`);
  assert.deepEqual(JSON.parse(out.content[0]!.text), out.structuredContent, 'the text is the answer, as MCP asks');
  return out.structuredContent;
}

/** An engine with an agent that made board `plans` (a region and two questions). */
async function withPlans() {
  const engine = open();
  const joined = await tool(engine, 'join', { label: 'Engine test' });
  const agent: Caller = { by: 'agent', agent: joined.agent };
  const items = [
    { type: 'board', title: 'Plans' },
    { type: 'region', region: { id: 'now', title: 'Now', mode: 'grid' } },
    { type: 'node', node: { region: 'now', kind: 'question', title: 'Ship on Friday?' } },
    { type: 'node', node: { region: 'now', kind: 'question', title: 'Who reviews?' } },
  ];
  const wrote = await tool(engine, 'write_board', { board: 'plans', items }, agent);
  assert.deepEqual(wrote.results.map((r: any) => r.ok), [true, true, true, true]);
  return { engine, agent, joined };
}

test('a read route answers with no HTTP server: list_boards names the host\'s folder', async () => {
  const engine = open();
  const r = await call(engine, 'GET', 'boards');
  assert.equal(r.status, 200);
  const body = r.body as { project: string; boards: { board: string }[]; head: number };
  assert.equal(body.project, '~/example');
  assert.ok(body.boards.some((b) => b.board === 'roadmap'));
  assert.deepEqual((await call(engine, 'GET', '/boards/roadmap')).status, 200, 'a leading slash is the same path');
  assert.equal(await engine.route({ method: 'GET', path: 'chats' }), null, 'a chat route is the standalone host\'s');
  assert.equal(await engine.route({ method: 'GET', path: 'nothing/here' }), null);
  const missing = await call(engine, 'GET', 'boards/nope');
  assert.deepEqual([missing.status, (missing.body as { type: string }).type.endsWith('/not-found')], [404, true]);
});

test('a write route takes the caller its host passes: the person makes a board, an agent or nobody may not', async () => {
  const engine = open();
  const made = await call(engine, 'PUT', 'boards/ideas', { body: { title: 'Ideas' }, caller: PERSON });
  assert.equal(made.status, 201);
  assert.ok(engine.ledger.state().boards.has('ideas'));
  const agent = await call(engine, 'PUT', 'boards/ideas', { body: { title: 'Mine' }, caller: { by: 'agent', agent: 'a-k3m9x2pq' } });
  const nobody = await call(engine, 'PUT', 'boards/ideas', { body: { title: 'Mine' } });
  assert.deepEqual([agent.status, nobody.status], [403, 403]);
  const bad = await call(engine, 'PUT', 'boards/ideas', { body: { title: 7 }, caller: PERSON });
  assert.equal(bad.status, 422, 'the body is held to the request schema');
  assert.match(String(bad.headers?.['Content-Type']), /problem\+json/);
});

test('resolve: a card chip says its title until the card changes; a note chip; a board chip; anything else is refused', async () => {
  const { engine, agent } = await withPlans();
  assert.deepEqual(engine.resolve('card', { board: 'plans', n: 1, ver: 1 }), { where: 'Board "plans", card 1', text: 'Ship on Friday?' });
  await call(engine, 'POST', 'boards/plans/act', { body: { type: 'act', action: 'comment', n: 2, ver: 1, text: 'Ask the team.' }, caller: PERSON });
  const seq = engine.ledger.state().seq;
  const note = engine.resolve('note', { board: 'plans', seq, rev: seq });
  assert.deepEqual(note, { where: `Board "plans", note ${seq} on card 2 "Who reviews?"`, text: 'Ask the team.' });
  await tool(engine, 'write_board', { board: 'plans', items: [{ type: 'node', n: 1, node: { region: 'now', kind: 'question', title: 'Ship on Monday?' } }] }, agent);
  assert.equal((engine.resolve('card', { board: 'plans', n: 1, ver: 1 }) as { refused: string }).refused, 'changed');
  assert.equal((engine.resolve('card', { board: 'plans', n: 9, ver: 1 }) as { refused: string }).refused, 'gone');
  assert.equal((engine.resolve('image', { board: 'plans' }) as { refused: string }).refused, 'gone');
  const whole = engine.resolve('board', { board: 'plans', head: 1 }) as { where: string; text: string };
  assert.equal(whole.where, 'Board "plans"');
  assert.equal((JSON.parse(whole.text) as { head: number }).head, engine.ledger.state().seq, 'the board as it is now; an older head is no refusal');
  assert.equal((engine.resolve('board', { board: 'nope', head: 1 }) as { refused: string }).refused, 'gone');
  assert.equal((engine.resolve('card', 'plans/1') as { refused: string }).refused, 'gone');
});

test('resolve: the answers chip says the person\'s answers since a line, as its agent reads them, exactly the round; none says nothing; a locked board waits; a board that is not there is refused', async () => {
  const { engine, agent } = await withPlans();
  const since = engine.ledger.state().seq;
  const id = agent.by === 'agent' ? agent.agent : undefined;
  const none = engine.resolve('answers', { board: 'plans', since, agent: id });
  assert.deepEqual('refused' in none ? none : [none.text, none.count], ['', 0], 'nothing answered yet: no text, no refusal');
  await call(engine, 'POST', 'boards/plans/act', { body: { type: 'act', action: 'comment', n: 1, ver: 1, text: 'Friday is fine.' }, caller: PERSON });
  const said = engine.resolve('answers', { board: 'plans', since }) as AnswersText;
  assert.match(said.text, /^The person updated the board:/);
  assert.match(said.text, /Friday is fine\./);
  assert.equal(said.where, 'Board "plans"');
  assert.equal(said.text, roundOf(engine.ledger.state(), 'plans', since)!.text, 'what the agent is told is the round, word for word');
  assert.deepEqual([said.count, [...said.notes]], [1, [engine.ledger.state().seq]], 'and the notes it carries, so none is attached again');
  const chip = answersChip(engine.ledger.state(), 'plans', id);
  assert.equal(chip?.preview, (engine.resolve(chip!.kind, chip!.ref) as AnswersText).text, 'the chip the page makes resolves to its own preview');
  await call(engine, 'POST', 'boards/plans/act', { body: { type: 'act', action: 'lock', board: 'plans' }, caller: PERSON });
  assert.equal((engine.resolve('answers', { board: 'plans', since }) as AnswersText).text, '', 'a locked board\'s answers wait for the unlock');
  assert.equal((engine.resolve('answers', { board: 'nope', since: 0 }) as ChipRefusal).refused, 'gone');
});

test('resolve: the selection chip names its cards as they stand, in the order selected; a card gone stops it', async () => {
  const { engine } = await withPlans();
  const chip = selectionChip('plans', [{ n: 2, title: 'Who reviews?' }, { n: 1, title: 'Ship on Friday?' }])!;
  assert.deepEqual([chip.kind, chip.ref, chip.label], ['selection', { board: 'plans', cards: [2, 1] }, '2 selected']);
  assert.deepEqual(engine.resolve(chip.kind, chip.ref), { where: 'Board "plans"', text: chip.preview });
  assert.equal(selectionChip('plans', []), null);
  assert.equal((engine.resolve('selection', { board: 'plans', cards: [9] }) as ChipRefusal).refused, 'gone');
  assert.equal((engine.resolve('selection', { board: 'plans' }) as ChipRefusal).refused, 'gone');
});

test('tools: one per agent operation the engine serves, listed in MCP\'s shape; each runs with the caller passed in', async () => {
  const { engine, agent } = await withPlans();
  const table = (JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8')) as { tools: { name: string; description: string; input: unknown }[] }).tools;
  const listed = engine.tools.list();
  assert.deepEqual(listed.map((t) => t.name).sort(), table.map((t) => t.name).filter((n) => n !== 'list_apps' && n !== 'read_attachment').sort(), 'list_apps is the app host\'s, read_attachment is beside its chat');
  for (const t of listed) {
    const row = table.find((r) => r.name === t.name)!;
    assert.deepEqual([t.description, t.inputSchema], [row.description, row.input], `${t.name}: the table's words and JSON Schema`);
  }
  const inputs: Record<string, Record<string, unknown>> = {
    list_boards: {}, get_board: { board: 'plans' }, show_node: { board: 'plans', n: 1 }, show_container: { board: 'plans', region: 'now' },
    show_layout: { board: 'plans', region: 'now' }, list_open: { board: 'plans' }, check_responses: { board: 'plans', after: 0 },
    join: { label: 'Second agent' }, request_grant: { board: 'roadmap', region: 'review', reason: 'For the test.' },
    write_board: { board: 'plans', items: [{ type: 'node', node: { region: 'now', kind: 'question', title: 'Which day?' } }] },
  };
  assert.deepEqual(Object.keys(inputs).sort(), listed.map((t) => t.name).sort(), 'every tool is tried');
  for (const [name, input] of Object.entries(inputs)) await tool(engine, name, input, agent);
  assert.match(JSON.stringify(await tool(engine, 'show_node', { board: 'plans', n: 3 })), /Which day\?/, 'the write went in');
  assert.ok((await tool(engine, 'check_responses', { board: 'plans', after: 0 })).head > 0, 'the query defaults are filled in');
});

test('tools: an error is `isError` with words, never a throw: an input that does not fit, a problem, a tool the engine has not, a write whose every item failed', async () => {
  const { engine, agent } = await withPlans();
  const unfit = await engine.tools.call('get_board', { board: 'Not An Id' }, { caller: agent });
  assert.equal(unfit.isError, true);
  assert.match(unfit.content[0]!.text, /\/board: /, 'the pointer goes with its words');
  assert.equal(unfit.structuredContent, undefined, 'a problem is text only, as vb-mcp answers it');
  const noAgent = await engine.tools.call('write_board', { board: 'plans', items: [] });
  assert.equal(noAgent.isError, true, 'an agent operation needs the agent');
  assert.equal((await engine.tools.call('read_attachment', { path: 'a.txt' })).isError, true, 'not this engine\'s tool');
  const failed = await engine.tools.call('write_board', { board: 'plans', items: [{ type: 'node', n: 99, node: { region: 'now', kind: 'question', title: 'No such card' } }] }, { caller: agent });
  assert.equal(failed.isError, true, 'nothing was written');
  assert.equal((failed.structuredContent as { results: { ok: boolean }[] }).results[0]!.ok, false, 'and it keeps its per-item results');
});

test('tools: a board write says what it changed, in one shape for any host, the same facts a chat\'s stream reads from its text', async () => {
  const { engine, agent } = await withPlans();
  const wrote = await engine.tools.call('write_board', { board: 'plans', items: [{ type: 'node', n: 1, node: { region: 'now', kind: 'question', title: 'Ship on Monday?' } }] }, { caller: agent });
  const head = engine.ledger.state().seq;
  assert.deepEqual(wrote._meta?.[TOOL_CHANGE], { board: 'plans', cards: [1], head });
  assert.deepEqual(wrote._meta?.[TOOL_CHANGE], { board: 'plans', ...boardWriteSummary(wrote.content) });
  assert.equal((await engine.tools.call('get_board', { board: 'plans' }, { caller: agent }))._meta, undefined, 'a read changed nothing');
});

test('tools: a held call ends when its host\'s signal does', async () => {
  const { engine, agent } = await withPlans();
  const gone = new AbortController();
  const held = engine.tools.call('check_responses', { board: 'plans', after: 9999, wait: 60 }, { caller: agent, signal: gone.signal });
  setTimeout(() => gone.abort(), 20);
  assert.deepEqual(((await held).structuredContent as { responses: unknown[] }).responses, []);
});

test('the MCP server serves the engine\'s tools as it serves its own: one list, another transport\'s callers', async () => {
  const { engine, agent } = await withPlans();
  const server = createMcpServer({ tools: { list: engine.tools.list, call: (name, input, ctx) => engine.tools.call(name, input, { ...ctx, caller: agent }) } });
  const meta = { _meta: { 'io.modelcontextprotocol/protocolVersion': MODERN, 'io.modelcontextprotocol/clientCapabilities': {} } };
  const ask = async (method: string, params: object) => (await server.handle({ jsonrpc: '2.0', id: 1, method, params: { ...params, ...meta } })) as any;
  assert.deepEqual((await ask('tools/list', {})).result.tools, engine.tools.list());
  assert.equal((await ask('server/discover', {})).result.instructions, INSTRUCTIONS_JOINED, 'the host vouches for the caller: no join, no secret');
  const wrote = (await ask('tools/call', { name: 'write_board', arguments: { board: 'plans', items: [{ type: 'node', node: { region: 'now', kind: 'question', title: 'Which day?' } }] } })).result;
  assert.equal(wrote.isError, false);
  assert.deepEqual(wrote._meta[TOOL_CHANGE], { board: 'plans', cards: [3], head: engine.ledger.state().seq }, 'the change goes through beside the server\'s own `_meta`');
  assert.ok(wrote._meta['io.modelcontextprotocol/serverInfo']);
  assert.equal((await ask('tools/call', { name: 'get_board', arguments: { board: 'Not An Id' } })).result.isError, true);
  assert.equal((await ask('tools/call', { name: 'read_attachment', arguments: {} })).error.code, -32602, 'a tool not listed is a protocol error, as MCP says');
});

test('watch: a write through another engine on the same folder is told, with its board and the head', async () => {
  const dir = dataDir();
  const a = open(dir);
  const b = open(dir);
  const seen: EngineChange[] = [];
  const told = new Promise<void>((resolve) => {
    const stop = a.watch((c) => { seen.push(c); if (c.board === 'ideas') { stop(); resolve(); } });
  });
  const made = await call(b, 'PUT', 'boards/ideas', { body: { title: 'Ideas' }, caller: PERSON });
  assert.equal(made.status, 201);
  await told;
  assert.deepEqual(seen.at(-1), { board: 'ideas', head: b.ledger.state().seq });
  assert.equal(a.ledger.state().seq, b.ledger.state().seq, 'the watcher\'s fold took the line in');
  const next = await call(a, 'PUT', 'boards/more', { body: { title: 'More' }, caller: PERSON });
  assert.equal(next.status, 201);
  assert.equal(a.ledger.state().seq, b.ledger.state().seq + 1, 'the next line follows the other writer\'s, never repeats its seq');
});

test('a held check_responses ends when its host\'s signal does, and answers as a timed-out wait would', async () => {
  const engine = open();
  const gone = new AbortController();
  const held = engine.route({ method: 'GET', path: 'boards/roadmap/responses', query: new URLSearchParams('after=999&wait=60') }, { signal: gone.signal });
  setTimeout(() => gone.abort(), 20);
  const r = await held;
  assert.deepEqual([r?.status, (r?.body as { responses: unknown[] }).responses], [200, []]);
});
