// The person removes cards and containers (N24 rulings 1-5, api.md 141): `retire_cards` writes the
// same `retire` line an agent's item writes, by the person. Cards by board number (one or several in
// one line) or a whole container with every card in it now; a card still owed an answer may go
// (agents keep their refusal) and nothing on it is owed after; numbers are never given again; agents
// read the removal as a retire; a locked or archived board refuses it. Board `desk` is drawn after the
// seeded boards, so its numbers are far below the identities: a slip from one to the other fails.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { cardId } from '../../../packages/format/src/index.ts';
import { conditionsOf, LOCKED_PERSON } from '../../../packages/actions/src/index.ts';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
let A: Joined;
before(async () => {
  h = await startBoard();
  A = await h.join('Desk chat');
  const r = await write([
    { type: 'board', title: 'Desk' }, region('r'), region('q'),
    card('r', 'One', 'question'), card('r', 'Two', 'finding'), card('r', 'Three', 'question'),
    card('q', 'Four', 'topic'), card('q', 'Five', 'risk'), card('r', 'Six', 'decision'),
  ]);
  assert.deepEqual(r.results.slice(3).map((x: any) => x.n), [1, 2, 3, 4, 5, 6]);
});
after(() => h.close());

async function write(items: unknown[]): Promise<any> {
  return h.ok('write_board', { board: 'desk', body: { items } }, { as: A.client });
}
const region = (id: string) => ({ type: 'region', region: { id, title: id.toUpperCase(), mode: 'grid' } });
const card = (where: string, title: string, kind: string) => ({ type: 'node', node: { region: where, kind, title } });
const id = (n: number) => cardId(h.ledger.state().index, 'desk', n)!;
const act = (body: object) => h.ok('act', { board: 'desk', body: { type: 'act', ...body } });
const remove = (body: object) => h.ok('retire_cards', { board: 'desk', body });
const refused = (body: object, status = 422, code = 'invalid') => h.fails('retire_cards', { board: 'desk', body }, status, code);
const lineAt = (seq: number) => h.ledger.events().find((e) => e.seq === seq)!;

test('remove one card: the person\'s retire line, by identity; the answer by board number; it leaves every agent read', async () => {
  const drawn = h.ledger.state().drawnHeads.get('desk');
  const stored = await remove({ cards: [2] });
  assert.deepEqual([stored.type, stored.by, stored.board, stored.cards, 'agent' in stored], ['retire', 'person', 'desk', [2], false]);
  const line = lineAt(stored.seq);
  assert.deepEqual(line.type === 'retire' && [line.by, line.cards, line.region], ['person', [id(2)], undefined]);
  assert.ok(id(2) > 2, 'the identity is not the number');
  const board = await h.ok('get_board', { board: 'desk' });
  assert.deepEqual(board.view.nodes.map((x: any) => x.n), [1, 3, 4, 5, 6]);
  const shown = await h.ok('show_node', { board: 'desk', n: 2 });
  assert.deepEqual([shown.n, shown.retired, shown.versions[0].node.title], [2, stored.seq, 'Two']);
  // A person's line is no agent drawing: no version, no "the agent drew" (api.md 92, 141).
  assert.equal(h.ledger.state().drawnHeads.get('desk'), drawn);
});

test('remove a selection: one line takes every card; numbers are never given again', async () => {
  const stored = await remove({ cards: [3, 6] });
  assert.deepEqual(stored.cards, [3, 6]);
  assert.deepEqual((lineAt(stored.seq) as { cards: number[] }).cards, [id(3), id(6)]);
  const board = await h.ok('get_board', { board: 'desk' });
  assert.deepEqual(board.view.nodes.map((x: any) => x.n), [1, 4, 5]);
  const fresh = await write([card('r', 'Seven', 'question')]);
  assert.equal(fresh.results[0].n, 7, '2, 3 and 6 are never given again');
});

test('a card still owed an answer: the agent is refused, the person removes it, and nothing on it is owed after', async () => {
  await act({ action: 'comment', n: 1, ver: 1, text: 'Why this one?' });
  const agent = await write([{ type: 'retire', n: 1 }]);
  assert.match(agent.results[0].problem.errors[0].detail, /card 1 has a comment you haven't answered/);
  const owed = () => conditionsOf(h.ledger.state(), { board: 'desk', agent: A.agent }).filter((c) => c.kind === 'item.owed');
  assert.equal(owed().length, 1);
  const unsent = () => conditionsOf(h.ledger.state(), { board: 'desk' }).some((c) => c.kind === 'board.unsent');
  assert.equal(unsent(), true, 'the comment waits for a Send');
  await remove({ cards: [1] });
  assert.deepEqual([owed(), unsent()], [[], false], 'owed nothing, and nothing new for a Send');
  const open = await h.ok('list_open', { board: 'desk' }, { as: A.client });
  assert.equal(open.items.some((x: any) => x.n === 1), false);
  const reply = await write([{ type: 'reply', n: 1, text: 'Late.' }]);
  assert.equal(reply.results[0].problem.errors[0].detail, 'n: card 1 is retired');
});

test('remove a container: every card in it now goes with it, its unanswered note too; its id is never used again', async () => {
  await act({ action: 'move', n: 7, region: 'q' });
  await act({ action: 'comment', board: 'desk', region: 'q', text: 'Is Q still needed?' });
  const stored = await remove({ region: 'q' });
  assert.deepEqual([stored.region, stored.cards], ['q', [4, 5, 7]], 'the card the person moved in goes too');
  const board = await h.ok('get_board', { board: 'desk' });
  assert.deepEqual([board.view.regions.map((x: any) => x.id), board.view.nodes.length], [['r'], 0]);
  const box = await h.ok('show_container', { board: 'desk', region: 'q' });
  assert.deepEqual([box.retired, box.nodes.map((x: any) => x.n)], [stored.seq, [4, 5, 7]]);
  assert.equal(conditionsOf(h.ledger.state(), { board: 'desk', agent: A.agent }).some((c) => c.kind === 'container.owed'), false);
  const reuse = await write([region('q')]);
  assert.equal(reuse.results[0].problem.errors[0].detail, 'region.id: container "q" was retired; pick another id');
});

test('refused: a card already retired, a number never given, Later, both or neither, and any agent', async () => {
  await write([card('r', 'Eight', 'question'), card('r', 'Nine', 'finding')]);
  const before = h.ledger.state().seq;
  const twice = await refused({ cards: [8, 2] });
  assert.deepEqual(twice.errors, [{ pointer: '/cards', detail: 'cards: card 2 is already retired' }]);
  assert.deepEqual((await refused({ cards: [8, 99] })).errors, [{ pointer: '/cards/1', detail: 'board desk has no card 99' }]);
  assert.equal((await refused({ region: 'later' })).errors![0]!.detail, 'region: "later" is the board\'s built-in Later, not a container to retire');
  assert.equal((await refused({ region: 'nope' })).errors![0]!.detail, 'region: unknown "nope" on board "desk"');
  for (const body of [{}, { cards: [] }, { cards: [8, 8] }, { cards: [8], region: 'r' }]) await refused(body);
  await h.fails('retire_cards', { board: 'desk', body: { cards: [8] } }, 403, 'forbidden', A.client);
  await h.fails('retire_cards', { board: 'nowhere', body: { cards: [1] } }, 404, 'not-found');
  assert.equal(h.ledger.state().seq, before, 'nothing written');
});

test('a locked board refuses it (423, the person\'s words) and an archived one until it is restored (D-042, D-043)', async () => {
  await act({ action: 'lock', board: 'desk' });
  const before = h.ledger.state().seq;
  const locked = await refused({ cards: [8] }, 423, 'locked');
  assert.equal(locked.detail, LOCKED_PERSON);
  await act({ action: 'unlock', board: 'desk' });
  await act({ action: 'archive', board: 'desk' });
  const archived = await refused({ cards: [8] });
  assert.equal(archived.errors![0]!.detail, 'board: "desk" is archived; restore it from the board picker first');
  await act({ action: 'restore', board: 'desk' });
  assert.equal(h.ledger.events().filter((e) => e.seq > before && e.type === 'retire').length, 0);
  assert.deepEqual((await remove({ cards: [8] })).cards, [8]);
});
