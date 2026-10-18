// An archived board is gone for agents, as if it never existed (N39 rulings 3, 7, 8, api.md 136).
// The contract walk: every agent operation openapi.json lists (not a hand-written list) is called
// on board "ghost" before it exists and again once the person has archived it, with no credentials
// and with the secret of the agent that made it, and each answer must be the same (status, problem
// type, title, words, pointers). An operation that names no board must never mention it. A new
// agent operation needs its inputs in contract-walk.ts, or this test fails. Then: restore brings
// every answer back as it was, and a check_responses waiting on the board when it is archived ends
// not found.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { OperationId } from '../../../packages/format/src/index.ts';
import type { CallInput, Client } from '../../../packages/client/src/index.ts';
import { ApiProblem } from '../../../packages/client/src/index.ts';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Rec } from './openapi-ajv.ts';
import { agentOps, answer as call } from './contract-walk.ts';

const GHOST = 'ghost';
const TITLE = 'Ghost board';
let h: Harness;
let A: Joined;
before(async () => {
  h = await startBoard();
  A = await h.join('Ghost chat');
});
after(() => h.close());

/** Every agent operation, in openapi.json's order, with its input for board "ghost" (contract-walk.ts). */
const AGENT_OPS = agentOps(GHOST);
const answer = (id: OperationId, input: CallInput, as: Client) => call(h, id, input, as);

/** Each agent operation's answers on "ghost": with no credentials (unless it needs a secret) and as A. */
async function walk(): Promise<Map<string, { status: number; body: unknown }>> {
  const out = new Map<string, { status: number; body: unknown }>();
  for (const o of AGENT_OPS) {
    if (!o.agentOnly) out.set(`${o.id} (no credentials)`, await answer(o.id, o.input, h.client));
    out.set(`${o.id} (its maker)`, await answer(o.id, o.input, A.client));
  }
  return out;
}

const mentions = (body: unknown) => /ghost/i.test(JSON.stringify(body ?? null));
/** An answer without the ledger's position, which every line moves: `head`, and a View's `version`. */
const withoutHead = ({ head: _head, ...rest }: Rec) => (rest.view ? { ...rest, view: { ...rest.view, version: 0 } } : rest);
let unknown: Map<string, { status: number; body: unknown }>;
let drawn: Map<string, { status: number; body: unknown }>;

test('the walk covers every agent operation, and the board operations of ruling 3', () => {
  const names = AGENT_OPS.map((o) => o.id);
  for (const id of ['list_boards', 'get_board', 'show_node', 'show_container', 'show_layout', 'list_open', 'check_responses', 'join', 'request_grant', 'write_board'])
    assert.ok(names.includes(id as OperationId), id);
  assert.deepEqual(AGENT_OPS.filter((o) => !o.namesBoard).map((o) => o.id), ['list_boards', 'join', 'list_apps']);
});

test('before "ghost" exists, every operation naming it is not found', async () => {
  unknown = await walk();
  for (const [name, a] of unknown) {
    const op = AGENT_OPS.find((o) => name.startsWith(`${o.id} `))!;
    if (op.namesBoard) assert.deepEqual([name, a.status, (a.body as Rec).type], [name, 404, 'https://vision-board.invalid/problems/not-found']);
    else assert.ok(!mentions(a.body), name);
  }
});

test('drawn, the board answers every operation', async () => {
  const items = [
    { type: 'board', title: TITLE, key: 'ghost-board' },
    { type: 'region', region: { id: 'ideas', title: 'Ideas', mode: 'grid' }, key: 'ghost-ideas' },
    { type: 'node', node: { region: 'ideas', kind: 'question', title: 'Keep the ghost?' }, key: 'ghost-node' },
  ];
  const wrote = await h.ok('write_board', { board: GHOST, body: { items } }, { as: A.client });
  assert.ok(wrote.results.every((r: Rec) => r.ok));
  await h.ok('act', { board: GHOST, body: { type: 'act', action: 'comment', n: 1, ver: 1, text: 'Why keep it?' } });
  await h.ok('act', { board: GHOST, body: { type: 'act', action: 'send', board: GHOST } });
  await walk(); // writes what the walk writes (a node, a join); walked again, it only replays
  drawn = await walk();
  for (const [name, a] of drawn) assert.ok(a.status < 300, `${name} answered ${a.status}`);
  assert.ok(mentions(drawn.get('list_boards (no credentials)')!.body));
});

test('archived, every operation naming it answers exactly as before it existed; the others never mention it', async () => {
  const before = h.ledger.state().seq;
  await h.ok('act', { board: GHOST, body: { type: 'act', action: 'archive', board: GHOST } });
  const now = await walk();
  assert.deepEqual([...now.keys()], [...unknown.keys()]);
  for (const [name, a] of now) {
    const op = AGENT_OPS.find((o) => name.startsWith(`${o.id} `))!;
    if (op.namesBoard) assert.deepEqual(a, unknown.get(name), name);
    else assert.ok(!mentions(a.body), name);
  }
  assert.equal(h.ledger.events().filter((e) => e.seq > before + 1 && e.type !== 'join').length, 0, 'nothing written but the joins');
});

test('watch_board, a stream with no credentials, is not found as for a board that never was', async () => {
  const gone = await h.fails('watch_board', { board: GHOST }, 404, 'not-found');
  const never = await h.fails('watch_board', { board: 'never-was' }, 404, 'not-found');
  assert.equal(gone.detail, never.detail.replace('never-was', GHOST));
});

test('restored, every answer is as it was before the archive (but the ledger\'s position)', async () => {
  await h.ok('act', { board: GHOST, body: { type: 'act', action: 'restore', board: GHOST } });
  const back = await walk();
  const strip = (x: { status: number; body: unknown }) => ({ status: x.status, body: withoutHead(x.body as Rec) });
  for (const [name, a] of back) {
    // A join is a new agent each time: a new id and secret.
    if (name.startsWith('join')) assert.equal(a.status, drawn.get(name)!.status, name);
    else assert.deepEqual(strip(a), strip(drawn.get(name)!), name);
  }
});

test('a check_responses waiting on the board when it is archived ends not found', async () => {
  const waiting = h.agent(undefined).call('check_responses', { board: GHOST, after: h.ledger.state().seq, wait: 1 }).then(() => undefined, (err: unknown) => err);
  await new Promise((r) => setTimeout(r, 100));
  await h.ok('act', { board: GHOST, body: { type: 'act', action: 'archive', board: GHOST } });
  const err = await waiting;
  assert.ok(err instanceof ApiProblem && err.status === 404, String(err));
  assert.equal(err.detail, `There is no board "${GHOST}". Call list_boards to see the boards.`);
  await h.ok('act', { board: GHOST, body: { type: 'act', action: 'restore', board: GHOST } });
});
