// `retire` end to end (field report batch 2 ruling 1, assumptions B and C, api.md 126-127): a card
// or a whole container, by board number; refused while a card still owes the person an answer;
// replayed by key; the card leaves every read and keeps its history and number; a retired container
// still answers show_container. Board `shelf` is drawn after roadmap and pricing, so its card
// numbers are far below the identities the ledger holds: a slip from one to the other fails.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { cardId } from '#format';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
let A: Joined;
let B: Joined;
before(async () => {
  h = await startBoard();
  A = await h.join('Shelf chat');
  B = await h.join('Other chat');
  const r = await write(A, [
    { type: 'board', title: 'Shelf' }, region('r'), region('q'),
    card('r', 'One', 'question'), card('r', 'Two', 'finding'), card('r', 'Three', 'question'), card('q', 'Four', 'topic'),
  ]);
  assert.deepEqual(r.results.slice(3).map((x: any) => x.n), [1, 2, 3, 4]);
});
after(() => h.close());

async function write(who: Joined, items: unknown[]): Promise<any> {
  return h.ok('write_board', { board: 'shelf', body: { items } }, { as: who.client });
}
const region = (id: string) => ({ type: 'region', region: { id, title: id.toUpperCase(), mode: 'grid' } });
const card = (where: string, title: string, kind: string) => ({ type: 'node', node: { region: where, kind, title } });
const codes = (r: any) => r.results.map((x: any) => (x.ok ? 'ok' : x.problem.type.split('/').pop()));
const id = (n: number) => cardId(h.ledger.state().index, 'shelf', n)!;
const act = (body: object) => h.ok('act', { board: 'shelf', body: { type: 'act', ...body } });

test('retire a card: refused while its comment is unanswered, then written by number; the line holds identities', async () => {
  const asked = await act({ action: 'comment', n: 2, ver: 1, text: 'Is this still true?' });
  const refused = await write(A, [{ type: 'retire', n: 2, key: 'r2' }]);
  assert.deepEqual(codes(refused), ['invalid']);
  assert.deepEqual(refused.results[0].problem.errors, [{ pointer: '/items/0/n', detail: 'card 2 has a comment you haven\'t answered: answer it with a reply or an append first' }]);
  await write(A, [{ type: 'reply', n: 2, text: 'No longer.', to: asked.seq }]);
  const r = await write(A, [{ type: 'retire', n: 2, key: 'r2' }]);
  assert.deepEqual([codes(r), r.results[0].retired, 'n' in r.results[0]], [['ok'], [2], false]);
  const line = h.ledger.events().find((e) => e.seq === r.results[0].seq)!;
  assert.deepEqual(line.type === 'retire' && [line.board, line.cards, line.key], ['shelf', [id(2)], 'r2']);
  assert.ok(id(2) > 2, 'the identity is not the number');
  // The same key and content: the first result, nothing written; other content: a conflict.
  const again = await write(A, [{ type: 'retire', n: 2, key: 'r2' }]);
  assert.deepEqual([again.results[0].replayed, again.results[0].retired, again.results[0].seq], [true, [2], r.results[0].seq]);
  assert.deepEqual(codes(await write(A, [{ type: 'retire', n: 3, key: 'r2' }])), ['conflict']);
  // Already retired; a number the board never gave.
  const twice = await write(A, [{ type: 'retire', n: 2 }, { type: 'retire', n: 9 }]);
  assert.deepEqual(twice.results.map((x: any) => x.problem.errors[0]), [
    { pointer: '/items/0/n', detail: 'cards: card 2 is already retired' }, { pointer: '/items/1/n', detail: 'board shelf has no card 9' },
  ]);
});

test('a retired card leaves get_board, list_open and the views; show_node still answers with retired; no number is given twice', async () => {
  const board = await h.ok('get_board', { board: 'shelf' });
  assert.deepEqual(board.view.nodes.map((x: any) => x.n), [1, 3, 4]);
  assert.deepEqual(Object.keys(board.versions), ['1', '3', '4']);
  assert.equal('2' in board.state.items, false);
  assert.deepEqual((await h.ok('list_open', { board: 'shelf' })).items.map((x: any) => x.n), [1, 3]);
  const shown = await h.ok('show_node', { board: 'shelf', n: 2 });
  assert.deepEqual([shown.n, shown.versions[0].node.title, typeof shown.retired], [2, 'Two', 'number']);
  assert.deepEqual(shown.notes.map((x: any) => x.text), ['Is this still true?']);
  const p = await write(A, [{ ...card('r', 'Two, again', 'finding'), n: 2 }, { type: 'reply', n: 2, text: 'Late.' }]);
  assert.deepEqual(p.results.map((x: any) => x.problem.errors[0].detail), [
    'n: card 2 is retired; draw a new card instead', 'n: card 2 is retired',
  ]);
  const fresh = await write(A, [card('r', 'Five', 'question')]);
  assert.equal(fresh.results[0].n, 5, 'assumption C: 2 is never given again');
  const flag = await h.fails('act', { board: 'shelf', body: { type: 'act', action: 'flag', n: 2 } }, 422, 'invalid');
  assert.match(flag.errors[0]!.detail, /card 2 is retired/);
});

test('retire a container: its holder only; every card in it now goes with it; show_container still answers', async () => {
  assert.deepEqual(codes(await write(B, [{ type: 'retire', region: 'q' }])), ['needs-grant']);
  await act({ action: 'move', n: 3, region: 'q' });
  const r = await write(A, [{ type: 'retire', region: 'q', key: 'rq' }]);
  assert.deepEqual([codes(r), r.results[0].retired], [['ok'], [3, 4]], 'the card the person moved in goes too');
  const board = await h.ok('get_board', { board: 'shelf' });
  assert.deepEqual([board.view.regions.map((x: any) => x.id), board.view.nodes.map((x: any) => x.n)], [['r'], [1, 5]]);
  const box = await h.ok('show_container', { board: 'shelf', region: 'q' });
  assert.deepEqual([typeof box.retired, box.nodes.map((x: any) => [x.n, x.retired === r.results[0].seq])], ['number', [[3, true], [4, true]]]);
  const reuse = await write(A, [region('q'), card('q', 'Six', 'topic'), { type: 'retire', region: 'later' }]);
  assert.deepEqual(reuse.results.map((x: any) => [x.problem.errors[0].pointer, x.problem.errors[0].detail]), [
    ['/items/0/region/id', 'region.id: container "q" was retired; pick another id'],
    ['/items/1/node/region', 'node.region: container "q" was retired'],
    ['/items/2/region', 'region: "later" is the board\'s built-in Later, not a container to retire'],
  ]);
  const again = await write(A, [{ type: 'retire', region: 'q', key: 'rq' }]);
  assert.deepEqual([again.results[0].replayed, again.results[0].retired], [true, [3, 4]]);
});
