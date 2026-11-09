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
import { ledgerFiles } from '#format';
import { FIXTURES_DIR, TOOLS_FILE } from '#format/files';
import { descriptionEdits, inputEdits, ruleEdits } from '../server/words/plugin-tools.ts';
import { createMcpServer, INSTRUCTIONS_JOINED, MODERN } from '#mcp';
import type { Caller, Engine, EngineChange } from '../server/engine/index.ts';
import { CHANGE_META, CHANGE_WORDS, changeOf, createEngine } from '../server/engine/index.ts';
import { makeTempDir } from '#format/testing';

const PERSON: Caller = { by: 'person' };
const dirs: string[] = [];
after(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });

/** A ledger folder holding the roadmap fixture as its ledger. */
function dataDir(): string {
  const dir = makeTempDir('vb-engine-');
  dirs.push(dir);
  fs.copyFileSync(path.join(FIXTURES_DIR, 'roadmap.ledger.jsonl'), ledgerFiles(dir).ledger);
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
  // A host registers its bot once, through `route`: `join` is no tool of a plugin bot's.
  const joined = (await engine.route({ method: 'POST', path: 'agents', body: { label: 'Engine test' } }))!.body as { agent: string; secret: string };
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

test('tools: one per tool the table marks for a plugin (x-hosts), listed in MCP\'s shape; each runs with the caller passed in', async () => {
  const { engine, agent } = await withPlans();
  const table = (JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8')) as { tools: { name: string; description: string; input: any; hosts: string[]; inputHosts?: Record<string, string[]> }[] }).tools;
  const listed = engine.tools.list();
  assert.deepEqual(listed.map((t) => t.name).sort(), table.filter((t) => t.hosts.includes('plugin')).map((t) => t.name).sort(), 'the engine gives exactly what the table marks: a manifest made from it never declares a tool the engine has not');
  for (const gone of ['list_apps', 'read_attachment', 'join']) assert.equal((await engine.tools.call(gone, {})).isError, true, `${gone} is the standalone app's`);
  for (const t of listed) {
    const row = table.find((r) => r.name === t.name)!;
    const words = [...descriptionEdits, ...ruleEdits].filter((e) => e.tool === t.name).reduce((text, { from, to }) => text.replace(from, to), row.description);
    // The botToolRules flag (on): an input the table gives other hosts only is not this host's (bot-tool-rules.test.ts).
    const gone = Object.entries(row.inputHosts ?? {}).filter(([, hosts]) => !hosts.includes('plugin')).map(([name]) => name);
    const given = { ...row.input, properties: Object.fromEntries(Object.entries(row.input.properties).filter(([name]) => !gone.includes(name))) };
    const input: any = JSON.parse(inputEdits.filter((e) => e.tool === t.name).reduce((text, { from, to }) => text.replaceAll(from, to), JSON.stringify(given)));
    // And the engine places cards (engine/tools.ts `PLACED`): no `widths` on a region, no `size` on a node.
    if (t.name === 'write_board') for (const shape of input.properties.items.items.oneOf) { delete shape.properties?.region?.properties?.widths; delete shape.properties?.node?.properties?.size; }
    assert.deepEqual([t.description, t.inputSchema], [words, input], `${t.name}: the table's words (less what only the standalone bot has, words/plugin-tools.ts) and JSON Schema`);
  }
  const inputs: Record<string, Record<string, unknown>> = {
    list_boards: {}, get_board: { board: 'plans' }, show_node: { board: 'plans', n: 1 }, show_container: { board: 'plans', region: 'now' },
    show_layout: { board: 'plans', region: 'now' }, list_open: { board: 'plans' }, check_responses: { board: 'plans', after: 0 },
    request_grant: { board: 'roadmap', region: 'review', reason: 'For the test.' },
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

test('a board write says what it changed: the change line under `plugin/change`, in one shape for any host, the same facts a chat\'s stream reads from its text (plugin.md § Tools)', async () => {
  const { engine, agent } = await withPlans();
  assert.equal(CHANGE_META, 'plugin/change');
  const write = (items: unknown[]) => engine.tools.call('write_board', { board: 'plans', items }, { caller: agent });
  const one = await write([{ type: 'node', n: 1, key: 'monday', node: { region: 'now', kind: 'question', title: 'Ship on Monday?' } }]);
  assert.deepEqual(one._meta?.[CHANGE_META], { words: 'vision-board.change.card', count: 1, subject: 'plans', reveal: { board: 'plans', cards: [1] } });
  assert.deepEqual((one._meta?.[CHANGE_META] as { reveal: { cards: number[] } }).reveal.cards, boardWriteSummary(one.content).cards, 'the cards a CLI\'s stream reads');
  const two = await write([{ type: 'node', n: 1, node: { region: 'now', kind: 'question', title: 'Ship on Tuesday?' } }, { type: 'node', n: 2, node: { region: 'now', kind: 'question', title: 'Who reviews it?' } }]);
  assert.deepEqual(two._meta?.[CHANGE_META], { words: 'vision-board.change.cards', count: 2, subject: 'plans', reveal: { board: 'plans', cards: [1, 2] } });
  const board = await write([{ type: 'region', region: { id: 'next', title: 'Next', mode: 'grid' } }]);
  assert.deepEqual(board._meta?.[CHANGE_META], { words: 'vision-board.change.board', count: 0, subject: 'plans', reveal: { board: 'plans', cards: [] } }, 'the board changed (a container), no card');
  const again = await write([{ type: 'node', n: 1, key: 'monday', node: { region: 'now', kind: 'question', title: 'Ship on Monday?' } }]);
  assert.equal(again.isError, false);
  assert.equal(again._meta, undefined, 'a retry\'s replay appended nothing: no change line');
  assert.equal((await write([{ type: 'node', n: 99, node: { region: 'now', kind: 'question', title: 'No such card' } }]))._meta, undefined, 'a write whose every item failed');
  assert.equal((await engine.tools.call('get_board', { board: 'plans' }, { caller: agent }))._meta, undefined, 'a read changed nothing');
  assert.deepEqual(Object.values(CHANGE_WORDS), ['vision-board.change.board', 'vision-board.change.card', 'vision-board.change.cards']);
  const many = changeOf('plans', Array.from({ length: 501 }, (_, i) => i + 1));
  assert.deepEqual([many.words, many.count, many.subject, many.reveal], ['vision-board.change.cards', 501, 'plans', undefined], 'a reveal over the bounds is left out, not trimmed');
});

test('tools: a held call ends when its host\'s signal does (botToolRules off: on, a host\'s bot has no wait, bot-tool-rules.test.ts)', async () => {
  const engine = createEngine({ dir: dataDir(), name: () => '~/example', warn: () => {}, flags: { botToolRules: false } });
  const joined = (await engine.route({ method: 'POST', path: 'agents', body: { label: 'Engine test' } }))!.body as { agent: string };
  const agent: Caller = { by: 'agent', agent: joined.agent };
  await tool(engine, 'write_board', { board: 'plans', items: [{ type: 'board', title: 'Plans' }] }, agent);
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
  assert.deepEqual(wrote._meta[CHANGE_META], { words: 'vision-board.change.card', count: 1, subject: 'plans', reveal: { board: 'plans', cards: [3] } }, 'the change goes through beside the server\'s own `_meta`');
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
  // The ledger's follow timer is unref'd (ledger.ts `follow`): hold the loop open until the watcher is told.
  const hold = setInterval(() => {}, 1000);
  try { await told; } finally { clearInterval(hold); }
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

test('image: the route a host points `imageRoute` at answers as the standalone route does: a picture and its ETag, 304, HEAD, an svg under its own policy, and only what is in the images folder', async () => {
  const dir = dataDir();
  const engine = open(dir);
  const images = ledgerFiles(dir).images;
  fs.mkdirSync(path.join(images, 'shots'), { recursive: true });
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(path.join(images, 'shots', 'a.png'), png);
  fs.writeFileSync(path.join(images, 'p.svg'), '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
  fs.writeFileSync(path.join(dir, 'secret.png'), png);

  const got = engine.image({ method: 'GET', path: 'shots/a.png' });
  assert.equal(got.status, 200);
  assert.deepEqual(got.body, png);
  assert.equal(got.headers!['Content-Type'], 'image/png');
  assert.equal(got.headers!['X-Content-Type-Options'], 'nosniff');
  const same = engine.image({ method: 'HEAD', path: 'shots/a.png', ifNoneMatch: got.headers!.ETag });
  assert.deepEqual([same.status, same.body], [304, null]);
  const head = engine.image({ method: 'HEAD', path: 'shots/a.png' });
  assert.deepEqual([head.status, head.body, head.headers!.ETag], [200, null, got.headers!.ETag]);
  assert.match(engine.image({ method: 'GET', path: 'p.svg' }).headers!['Content-Security-Policy']!, /sandbox/);

  assert.equal(engine.image({ method: 'GET', path: '../secret.png' }).status, 404, 'out of the folder');
  assert.equal(engine.image({ method: 'GET', path: '..%2Fsecret.png' }).status, 404, 'encoded, the same');
  assert.equal(engine.image({ method: 'GET', path: 'none.png' }).status, 404);
  assert.equal(engine.image({ method: 'POST', path: 'shots/a.png' }).status, 405);
  const off = createEngine({ dir, flags: { svgImages: false } });
  assert.equal(off.image({ method: 'GET', path: 'p.svg' }).status, 415, 'the flag, as the host gave it');
});
