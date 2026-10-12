// A locked board is read-only for every agent (N40 rulings 1, 3, 7, api.md 138-139). The contract
// walk (contract-walk.ts): every agent operation openapi.json lists is called on board "vault" as
// the agent that made it and as another agent, before the lock, while locked, and after the unlock.
// Locked, every operation that writes (any method but GET) and names the board answers 423 `locked`
// in the same words, and nothing is written; every read answers as before, `get_board` and
// `list_boards` adding `locked: true`; `join`, which names no board, still answers. A new agent
// operation is in the walk by itself, so it is covered or the test fails. Unlocked, every answer is
// as it was. Only the person locks and unlocks; an agent's act is forbidden.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { LOCKED } from '../../../packages/actions/src/index.ts';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Rec } from './openapi-ajv.ts';
import { agentOps, answer, WALK_REGION } from './contract-walk.ts';

const VAULT = 'vault';
let h: Harness;
let A: Joined;
let B: Joined;
before(async () => {
  h = await startBoard();
  A = await h.join('Vault chat');
  B = await h.join('Other chat');
  const items = [
    { type: 'board', title: 'Vault', key: 'vault-board' },
    { type: 'region', region: { id: WALK_REGION, title: 'Ideas', mode: 'grid' }, key: 'vault-ideas' },
    { type: 'node', node: { region: WALK_REGION, kind: 'question', title: 'Keep it locked?' }, key: 'vault-node' },
  ];
  assert.ok((await h.ok('write_board', { board: VAULT, body: { items } }, { as: A.client })).results.every((r: Rec) => r.ok));
  await h.ok('request_grant', { body: { board: VAULT, reason: 'Adding ideas.' } }, { as: B.client });
});
after(() => h.close());

const AGENT_OPS = agentOps(VAULT);
const act = (action: string) => h.ok('act', { board: VAULT, body: { type: 'act', action, board: VAULT } });
type Answers = Map<string, { status: number; body: unknown }>;

/** Each agent operation's answer on "vault", as its maker and as another agent. */
async function walk(): Promise<Answers> {
  const out: Answers = new Map();
  for (const o of AGENT_OPS) for (const [who, as] of [['maker', A], ['other', B]] as const) out.set(`${o.id} (${who})`, await answer(h, o.id, o.input, as.client));
  return out;
}
const opOf = (name: string) => AGENT_OPS.find((o) => name.startsWith(`${o.id} `))!;
/** An answer without what moves on every line (`head`, a View's `version`) and without `locked`. */
function plain(a: { status: number; body: unknown }) {
  const { head: _h, locked: _l, ...rest } = (a.body ?? {}) as Rec;
  const body = rest.view ? { ...rest, view: { ...rest.view, version: 0 } } : rest.boards ? { ...rest, boards: rest.boards.map(({ locked: _x, ...b }: Rec) => b) } : rest;
  return { status: a.status, body };
}
let open: Answers;

test('the walk covers every agent operation; the writes are the operations that are not GET', () => {
  const writes = AGENT_OPS.filter((o) => o.writes).map((o) => o.id);
  assert.deepEqual(writes, ['join', 'request_grant', 'write_board']);
  assert.deepEqual(AGENT_OPS.filter((o) => o.writes && !o.namesBoard).map((o) => o.id), ['join'], 'join names no board');
  for (const id of ['list_boards', 'get_board', 'show_node', 'show_container', 'show_layout', 'list_open', 'check_responses'])
    assert.ok(AGENT_OPS.some((o) => o.id === id && !o.writes), id);
});

test('open, the board answers every operation, and no read says locked', async () => {
  await walk(); // writes what the walk writes (a node, a join, a request); walked again, it replays
  open = await walk();
  for (const [name, a] of open) assert.ok(a.status < 300, `${name} answered ${a.status}`);
  assert.doesNotMatch(JSON.stringify([...open.values()].map((a) => a.body)), /"locked"/);
});

test('locked, every write naming the board is refused 423 `locked` in the same words, and nothing is written', async () => {
  await act('lock');
  const seq = h.ledger.state().seq;
  const now = await walk();
  for (const [name, a] of now) {
    const op = opOf(name);
    if (!op.writes) continue;
    if (!op.namesBoard) {
      assert.equal(a.status, 201, `${name} names no board, so it still answers`);
      continue;
    }
    const body = a.body as Rec;
    assert.deepEqual([a.status, body.type, body.title, body.detail], [423, 'https://vision-board.invalid/problems/locked', 'Locked', LOCKED], name);
  }
  assert.deepEqual(h.ledger.events().filter((e) => e.seq > seq).map((e) => e.type), ['join', 'join'], 'only the walk\'s two joins');
});

test('locked, every read answers as before, and get_board and list_boards say `locked: true`', async () => {
  const now = await walk();
  for (const [name, a] of now) {
    const op = opOf(name);
    if (op.writes) continue;
    assert.deepEqual(plain(a), plain(open.get(name)!), name);
  }
  assert.equal((now.get('get_board (maker)')!.body as Rec).locked, true);
  const row = (now.get('list_boards (other)')!.body as Rec).boards.find((b: Rec) => b.board === VAULT);
  assert.equal(row.locked, true);
  assert.ok((now.get('list_boards (other)')!.body as Rec).boards.filter((b: Rec) => b.board !== VAULT).every((b: Rec) => !('locked' in b)));
});

test('a write the ledger module is handed for a locked board is refused too, whatever route it came by', () => {
  const seq = h.ledger.state().seq;
  const card = h.ledger.state().index.cards.get(VAULT)![0]!;
  assert.throws(() => h.ledger.append({ type: 'reply', n: card, text: 'Still here.' }, { by: 'agent', agent: A.agent }),
    (err: any) => err.status === 423 && err.body.detail === LOCKED);
  assert.equal(h.ledger.state().seq, seq);
});

test('only the person locks and unlocks: an agent\'s act is forbidden', async () => {
  for (const action of ['unlock', 'lock']) {
    const refused = await h.fails('act', { board: VAULT, body: { type: 'act', action, board: VAULT } }, 403, 'forbidden', A.client);
    assert.match(refused.detail, /Only the person can do this/);
  }
  assert.equal((await h.ok('get_board', { board: VAULT })).locked, true);
});

test('unlocked, every answer is as it was before the lock (but the ledger\'s position)', async () => {
  await act('unlock');
  const back = await walk();
  for (const [name, a] of back) {
    // A join is a new agent each time: a new id and secret.
    if (name.startsWith('join')) assert.equal(a.status, open.get(name)!.status, name);
    else assert.deepEqual(plain(a), plain(open.get(name)!), name);
  }
  assert.equal('locked' in (await h.ok('get_board', { board: VAULT })), false);
});

test('lock twice, unlock an open board, or an unknown board: refused in plain words', async () => {
  await act('lock');
  const twice = await h.fails('act', { board: VAULT, body: { type: 'act', action: 'lock', board: VAULT } }, 422, 'invalid');
  assert.equal(twice.errors[0]!.detail, `board: "${VAULT}" is already locked`);
  await act('unlock');
  const again = await h.fails('act', { board: VAULT, body: { type: 'act', action: 'unlock', board: VAULT } }, 422, 'invalid');
  assert.equal(again.errors[0]!.detail, `board: "${VAULT}" isn't locked`);
  await h.fails('act', { board: 'no-such', body: { type: 'act', action: 'lock', board: 'no-such' } }, 404, 'not-found');
});
