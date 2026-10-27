// The board's engine part with no HTTP server (ENGINE_01; api.md § The engine): on a temporary data
// folder holding the roadmap fixture, it answers a read route and a write route, resolves a chip
// (and refuses a changed one), gives the person's answers since a line (`turn`), runs every tool (and
// refuses an input that does not fit), and tells a watcher of a write made through another engine on
// the same folder. The caller is passed in, as a host passes it.
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { FIXTURES_DIR, TOOLS_FILE } from '#format/files';
import type { Caller, Engine, EngineChange } from '../server/engine/index.ts';
import { createEngine } from '../server/engine/index.ts';

const PERSON: Caller = { by: 'person' };
const dirs: string[] = [];
after(() => { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); });

/** A data folder holding the roadmap fixture as its ledger. */
function dataDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-engine-'));
  dirs.push(dir);
  fs.copyFileSync(path.join(FIXTURES_DIR, 'roadmap.ledger.jsonl'), path.join(dir, 'ledger.jsonl'));
  return dir;
}

const open = (dir = dataDir()): Engine => createEngine({ dir, name: () => '~/example', warn: () => {} });

/** A route's answer, which must be one. */
async function call(engine: Engine, method: string, rel: string, extra: { body?: unknown; caller?: Caller; query?: string } = {}) {
  const r = await engine.route({ method, path: rel, query: new URLSearchParams(extra.query ?? ''), body: extra.body, caller: extra.caller });
  assert.ok(r, `${method} ${rel} is an engine route`);
  return r;
}

/** A tool's result, which must have worked. */
async function tool(engine: Engine, name: string, input: Record<string, unknown>, caller?: Caller): Promise<any> {
  const out = await engine.tools[name]!(input, caller);
  assert.ok(out.ok, `${name}: ${JSON.stringify(out)}`);
  return out.result;
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

test('turn: the person\'s answers since a line, as the agent reads them; none, and a board that is not there', async () => {
  const { engine, agent } = await withPlans();
  const since = engine.ledger.state().seq;
  assert.equal(engine.turn({ board: 'plans', since, agent: agent.by === 'agent' ? agent.agent : undefined }), undefined, 'nothing answered yet');
  await call(engine, 'POST', 'boards/plans/act', { body: { type: 'act', action: 'comment', n: 1, ver: 1, text: 'Friday is fine.' }, caller: PERSON });
  const turn = engine.turn({ board: 'plans', since }) as { text: string; count: number };
  assert.match(turn.text, /^The person updated the board:/);
  assert.match(turn.text, /Friday is fine\./);
  assert.equal((engine.turn({ board: 'nope', since: 0 }) as { refused: string }).refused, 'gone');
});

test('tools: one per agent operation the engine serves, each runs with the caller passed in; a bad input is refused', async () => {
  const { engine, agent } = await withPlans();
  const table = (JSON.parse(fs.readFileSync(TOOLS_FILE, 'utf8')) as { tools: { name: string }[] }).tools.map((t) => t.name);
  assert.deepEqual(Object.keys(engine.tools).sort(), table.filter((n) => n !== 'list_apps').sort(), 'list_apps is the app host\'s');
  const inputs: Record<string, Record<string, unknown>> = {
    list_boards: {}, get_board: { board: 'plans' }, show_node: { board: 'plans', n: 1 }, show_container: { board: 'plans', region: 'now' },
    show_layout: { board: 'plans', region: 'now' }, list_open: { board: 'plans' }, check_responses: { board: 'plans', after: 0 },
    join: { label: 'Second agent' }, request_grant: { board: 'roadmap', region: 'review', reason: 'For the test.' },
    write_board: { board: 'plans', items: [{ type: 'node', node: { region: 'now', kind: 'question', title: 'Which day?' } }] },
  };
  assert.deepEqual(Object.keys(inputs).sort(), Object.keys(engine.tools).sort(), 'every tool is tried');
  for (const [name, input] of Object.entries(inputs)) await tool(engine, name, input, agent);
  assert.match(JSON.stringify(await tool(engine, 'show_node', { board: 'plans', n: 3 })), /Which day\?/, 'the write went in');
  assert.ok((await tool(engine, 'check_responses', { board: 'plans', after: 0 })).head > 0, 'the query defaults are filled in');
  const refused = await engine.tools.get_board!({ board: 'Not An Id' }, agent);
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.deepEqual([refused.problem.status, refused.problem.errors?.[0]?.pointer], [422, '/board']);
  const noAgent = await engine.tools.write_board!(inputs.write_board!, undefined);
  assert.equal(noAgent.ok ? 0 : noAgent.problem.status, 401, 'an agent operation needs the agent');
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
  const held = engine.route({ method: 'GET', path: 'boards/roadmap/responses', query: new URLSearchParams('after=999&wait=60'), signal: gone.signal });
  setTimeout(() => gone.abort(), 20);
  const r = await held;
  assert.deepEqual([r?.status, (r?.body as { responses: unknown[] }).responses], [200, []]);
});
