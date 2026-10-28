// The board's cards as search documents (SEARCH_01, `boardSearchDocs`): one per card on the view
// shown, by its number, with its title, text, container, the person's notes and the agents' replies.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { View } from '#format';
import { boardView } from '#format';
import { boardSearchDocs, boardState, placedView, SEARCH_FIELDS } from '../src/index.ts';
import { A, scene } from './ledger-v3.ts';

/** The shared scene (cards 1 and 2 on board b, in containers r and q; card 3 in Old, drawn by an
 * old line with no text), card 1 redrawn with words, a note, the agent's reply to it, a note on
 * cards 1 and 2 together, and a note taken back. */
function fixture() {
  const l = scene();
  l.v = 5;
  l.agent(A, { type: 'region', board: 'b', region: { id: 'r', title: 'Pricing questions', mode: 'grid' } });
  l.node(A, 1, 2, { region: 'r', title: 'Annual pricing', body: 'Per seat, billed yearly.' });
  const note = l.act({ action: 'comment', n: 1, ver: 2, text: 'Too high for small teams?' });
  l.agent(A, { type: 'reply', n: 1, text: 'A starter tier could help.', to: note });
  l.act({ action: 'comment', nodes: [1, 2], text: 'Same question on both' });
  const gone = l.act({ action: 'comment', n: 2, ver: 1, text: 'Never mind' });
  l.act({ action: 'note-remove', n: 2, note: gone });
  return l;
}

const parts = (d: { fields: { name: string; text: string }[] } | undefined) => d?.fields.map((f) => [f.name, f.text]);

test('one document per card on the view shown, by its number, in the view\'s order; no other board\'s', () => {
  const s = fixture().state();
  const view = boardView(s, 'b');
  const docs = boardSearchDocs(s, 'b', view);
  assert.deepEqual(docs.map((d) => d.id), view.nodes.map((n) => n.id));
  assert.deepEqual(docs.map((d) => d.id), ['1', '2', '3']);
});

test('a card\'s title, text, container, the person\'s notes and the agent\'s replies, each weighted', () => {
  const s = fixture().state();
  const [one, two] = boardSearchDocs(s, 'b', boardView(s, 'b'));
  assert.deepEqual(parts(one), [
    ['title', 'Annual pricing'], ['body', 'Per seat, billed yearly.'], ['container', 'Pricing questions'],
    ['note', 'Too high for small teams?'], ['note', 'Same question on both'], ['reply', 'A starter tier could help.'],
  ]);
  assert.deepEqual(one!.fields.map((f) => f.weight), [3, 2, 1, 1, 1, 1]);
  assert.deepEqual(SEARCH_FIELDS, { title: 3, body: 2, container: 1, note: 1, reply: 1 });
  assert.deepEqual(parts(two), [['title', 'Node 2'], ['container', 'q'], ['note', 'Same question on both']],
    'a note on a group is on each card; a note taken back is gone; no text, no body');
});

test('the view shown decides: a past version\'s words, and the container the person moved a card to', () => {
  const l = fixture();
  l.act({ action: 'move', n: 1, region: 'q' });
  const s = l.state();
  const view = boardView(s, 'b');
  const past: View = { ...view, nodes: view.nodes.map((n) => (n.id === '1' ? { ...n, title: 'Pricing (draft)', body: undefined } : n)) };
  const [one] = boardSearchDocs(s, 'b', placedView(past, boardState(s, 'b')));
  assert.deepEqual(parts(one)!.slice(0, 2), [['title', 'Pricing (draft)'], ['container', 'q']]);
});

test('a card the ledger does not know keeps its own words and has no notes', () => {
  const s = fixture().state();
  const view = boardView(s, 'b');
  const odd: View = { ...view, nodes: [{ id: '99', n: 99, region: 'r', kind: 'note', title: 'Stray' }] };
  assert.deepEqual(parts(boardSearchDocs(s, 'b', odd)[0]), [['title', 'Stray'], ['container', 'Pricing questions']]);
});
