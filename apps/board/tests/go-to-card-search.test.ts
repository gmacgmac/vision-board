// Search in the Go to card box (cardSearch flag, SEARCH_02; tracker M7, rulings 317 and 322): `/`
// opens the box empty; words typed mark the matching cards (`data-found`) and the world (`data-search`),
// the box says "1 of 3" and which part of the current match matched; ↓/↑ step through the matches,
// wrapping, and bring each into view; Enter goes to the current one (the finding path, `arrive`);
// Esc and an empty box clear the marks; digits alone still go by number. The index is built once per
// state change (`key`). What a query matches is packages/search's test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SearchDoc } from '#search';
import type { GoBox, GoDeps } from '../src/board/find/go-to-card.ts';
import { createGoTo } from '../src/board/find/go-to-card.ts';
import { commandForKey } from '../src/board/input/commands.ts';

const doc = (id: string, title: string, more: { body?: string; note?: string } = {}): SearchDoc => ({
  id, fields: [{ name: 'title', text: title, weight: 3 }, ...(more.body ? [{ name: 'body', text: more.body, weight: 2 }] : []),
    ...(more.note ? [{ name: 'note', text: more.note, weight: 1 }] : [])],
});
const DOCS = [
  doc('1', 'Annual pricing'), doc('2', 'Launch plan', { body: 'Pricing for the annual tier' }),
  doc('3', 'Hiring'), doc('4', 'Budget', { note: 'Check the annual pricing again' }), doc('12', 'Card twelve'),
];

/** A box with search over `docs`, recording what it did, what it marked and what it brought in. */
function box(docs: SearchDoc[] = DOCS) {
  const did: string[] = [];
  const shown: (GoBox | null)[] = [];
  const marks = new Map<string, string>();
  let world = false;
  let key = 1;
  let built = 0;
  const d: GoDeps = {
    find: (n) => (docs.some((x) => x.id === String(n)) ? { to: 'card', id: String(n) } : { to: 'none' }),
    arrive: (id) => void did.push(`arrive ${id}`),
    past: async () => {},
    show: (b) => void shown.push(b && structuredClone(b)),
    search: {
      key: () => key,
      docs: () => { built += 1; return docs; },
      reveal: (id) => void did.push(`reveal ${id}`),
      world: { toggleAttribute: (_: string, on?: boolean) => { world = !!on; return world; } },
      card: (id) => ({ setAttribute: (_: string, v: string) => { marks.set(id, v); }, removeAttribute: () => { marks.delete(id); } }),
    },
  };
  const go = createGoTo(d);
  return { go, did, last: () => shown.at(-1), marks: () => Object.fromEntries(marks), world: () => world, built: () => built, change: () => { key += 1; } };
}

test('/ is the go command\'s key; with search it opens the box empty, without it does nothing', () => {
  assert.equal(commandForKey('/'), 'go-to-card');
  const b = box();
  assert.equal(b.go.open('/'), true);
  assert.deepEqual(b.last(), { text: '' });
  const off = createGoTo({ find: () => ({ to: 'none' }), arrive: () => {}, past: async () => {}, show: () => {} });
  assert.equal(off.open('/'), false, 'cardSearch off: / is not the box\'s');
});

test('words ring the matches, best first, dim the rest; the box says "1 of 3" and which part matched', () => {
  const b = box();
  b.go.open('/');
  b.go.edit('pric ann');
  assert.equal(b.world(), true);
  assert.deepEqual(b.marks(), { 1: 'current', 2: 'match', 4: 'match' });
  assert.deepEqual(b.last(), { text: 'pric ann', found: { count: '1 of 3', part: 'Card 1, in the title' } });
  assert.deepEqual(b.did, [], 'typing moves nothing');
});

test('↓ steps to the next match and brings it in, ↑ back, both wrapping; the part follows the match', () => {
  const b = box();
  b.go.open('/');
  b.go.edit('pric ann');
  b.go.step(1);
  assert.deepEqual(b.marks(), { 1: 'match', 2: 'current', 4: 'match' });
  assert.deepEqual(b.last()?.found, { count: '2 of 3', part: 'Card 2, in the text' });
  b.go.step(1);
  assert.deepEqual(b.last()?.found, { count: '3 of 3', part: 'Card 4, in a note' });
  b.go.step(1);
  assert.deepEqual(b.last()?.found?.count, '1 of 3', 'wraps to the first');
  b.go.step(-1);
  assert.deepEqual(b.last()?.found?.count, '3 of 3', 'and back to the last');
  assert.deepEqual(b.did, ['reveal 2', 'reveal 4', 'reveal 1', 'reveal 4']);
});

test('Enter goes to the current match by the finding path, closes the box and clears every mark', () => {
  const b = box();
  b.go.open('/');
  b.go.edit('pric ann');
  b.go.step(1);
  b.go.enter();
  assert.deepEqual(b.did, ['reveal 2', 'arrive 2']);
  assert.equal(b.go.box, null);
  assert.deepEqual(b.marks(), {});
  assert.equal(b.world(), false);
});

test('Esc clears the marks and closes; an empty box clears them and stays open', () => {
  const b = box();
  b.go.open('/');
  b.go.edit('annual');
  assert.equal(b.world(), true);
  b.go.edit('');
  assert.deepEqual(b.last(), { text: '' });
  assert.deepEqual(b.marks(), {});
  assert.equal(b.world(), false);
  b.go.edit('hiring');
  assert.deepEqual(b.marks(), { 3: 'current' });
  b.go.close();
  assert.equal(b.last(), null);
  assert.deepEqual(b.marks(), {});
  assert.equal(b.world(), false);
});

test('"No matches" when none: nothing is marked or dimmed, and Enter goes nowhere', () => {
  const b = box();
  b.go.open('/');
  b.go.edit('zebra');
  assert.deepEqual(b.last(), { text: 'zebra', said: 'No matches' });
  assert.equal(b.world(), false);
  b.go.step(1);
  b.go.enter();
  assert.deepEqual(b.did, []);
  assert.notEqual(b.go.box, null);
});

test('digits alone still go by number, with no search; digits and words search', () => {
  const b = box();
  b.go.open('1');
  b.go.edit('12');
  assert.deepEqual(b.last(), { text: '12' });
  assert.equal(b.world(), false);
  b.go.enter();
  assert.deepEqual(b.did, ['arrive 12']);
  const c = box();
  c.go.open('/');
  c.go.edit('99');
  c.go.enter();
  assert.deepEqual(c.last(), { text: '99', said: 'No card 99' });
});

test('the index is built once per state change, not per keystroke', () => {
  const b = box();
  b.go.open('/');
  for (const t of ['a', 'an', 'ann', 'annu']) b.go.edit(t);
  assert.equal(b.built(), 1);
  b.change();
  b.go.edit('annua');
  assert.equal(b.built(), 2);
});

test('refresh after a redraw searches again, keeping the current match where it still matches', () => {
  const docs = [...DOCS];
  const b = box(docs);
  b.go.open('/');
  b.go.edit('annual');
  b.go.step(1);
  assert.equal(b.marks()[2], 'current');
  docs.unshift(doc('5', 'Annual review'));
  b.change();
  b.go.refresh();
  assert.equal(b.marks()[2], 'current', 'still on card 2');
  assert.equal(b.marks()[5], 'match');
  assert.equal(b.last()?.found?.count, '3 of 4');
  b.go.close();
  b.go.refresh();
  assert.equal(b.go.box, null, 'nothing to refresh once closed');
});

test('going to a number chosen elsewhere clears a search showing', () => {
  const b = box();
  b.go.open('/');
  b.go.edit('annual');
  b.go.to(3);
  assert.deepEqual(b.did, ['arrive 3']);
  assert.deepEqual(b.marks(), {});
  assert.equal(b.world(), false);
});
