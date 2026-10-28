// The board's selection (3_FE_01 ruling 8): view state, not a ledger event, in one page module
// with a small API the lasso and the selection bar (3_FE_02) will call. Each change names only
// the ids whose state changed, so the page updates only those cards (ruling 10), and says what
// the live region announces (ruling 9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSelection, selectionText } from '../src/board/selection/selection.ts';
import type { SelectionChange } from '../src/board/selection/selection.ts';

function watched() {
  const sel = createSelection();
  const changes: SelectionChange[] = [];
  sel.onChange((c) => changes.push(c));
  return { sel, changes };
}

test('select only: the card alone, whatever was selected before', () => {
  const { sel, changes } = watched();
  sel.select(['1', '2'], 'add');
  sel.select(['3'], 'only');
  assert.deepEqual(sel.selected(), ['3']);
  assert.deepEqual(changes.at(-1)?.changed.sort(), ['1', '2', '3']);
});

test('toggle adds an unselected card and removes a selected one; add and remove do one way only', () => {
  const { sel } = watched();
  sel.select(['1'], 'toggle');
  sel.select(['2'], 'toggle');
  assert.deepEqual(sel.selected(), ['1', '2']);
  sel.select(['1'], 'toggle');
  assert.deepEqual(sel.selected(), ['2']);
  sel.select(['2', '3'], 'add');
  assert.deepEqual(sel.selected(), ['2', '3']);
  sel.select(['2', '9'], 'remove');
  assert.deepEqual(sel.selected(), ['3']);
  assert.equal(sel.has('3'), true);
  assert.equal(sel.has('2'), false);
});

test('a change names only the ids whose state changed, and nothing fires when nothing changed', () => {
  const { sel, changes } = watched();
  sel.select(['1', '2'], 'add');
  assert.deepEqual(changes.length, 1);
  sel.select(['2', '3'], 'add');
  assert.deepEqual(changes[1]!.changed, ['3']);
  sel.select(['3'], 'add');
  sel.select(['9'], 'remove');
  assert.equal(changes.length, 2);
  sel.select(['1', '2', '3'], 'only');
  assert.equal(changes.length, 2, 'the same set again is no change');
  sel.clear();
  assert.deepEqual(changes[2]!.changed.sort(), ['1', '2', '3']);
  sel.clear();
  assert.equal(changes.length, 3, 'clearing an empty selection is no change');
});

test('keep drops the ids that left the board and keeps the rest (ruling 8: it survives a redraw)', () => {
  const { sel, changes } = watched();
  sel.select(['1', '2', '3'], 'add');
  sel.keep(['1', '3', '4']);
  assert.deepEqual(sel.selected(), ['1', '3']);
  assert.deepEqual(changes.at(-1)!.changed, ['2']);
  sel.keep(['1', '3']);
  assert.equal(changes.length, 2, 'nothing left the board');
});

test('each change carries the text the live region announces', () => {
  const { sel, changes } = watched();
  sel.select(['1'], 'only');
  sel.select(['2', '3'], 'add');
  sel.clear();
  assert.deepEqual(changes.map((c) => c.text), ['1 card selected', '3 cards selected', 'Selection cleared']);
  assert.equal(selectionText(0), 'Selection cleared');
  assert.equal(selectionText(1), '1 card selected');
  assert.equal(selectionText(50), '50 cards selected');
});

test('a listener can stop listening', () => {
  const sel = createSelection();
  let calls = 0;
  const off = sel.onChange(() => { calls += 1; });
  sel.select(['1'], 'only');
  off();
  sel.select(['2'], 'only');
  assert.equal(calls, 1);
});

test('a change says how it came about: the person\'s own select by default, `find` when asked', () => {
  const { sel, changes } = watched();
  sel.select(['1'], 'only');
  sel.select(['2'], 'only', 'find');
  sel.select(['3'], 'add', 'find');
  sel.select(['3'], 'toggle');
  assert.deepEqual(changes.map((c) => c.by), ['select', 'find', 'find', 'select']);
  sel.clear();
  assert.equal(changes.at(-1)?.by, 'select');
});
