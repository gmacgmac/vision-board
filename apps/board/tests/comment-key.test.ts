// Which cards the Comment command writes on (selection/comment-key.ts, KEY_01, point 394): C acts on
// the card the keyboard focus is on; a selection of two or more the person made on purpose counts
// when the focus is in it, or nowhere. N and the bar's button are the selection's, wherever focus is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commentOnSelection } from '../src/board/selection/comment-key.ts';

test('C with two or more selected and focus on one of them is the group note', () => {
  assert.equal(commentOnSelection(['1', '3'], 'c', '3', true), true);
});

test('C with two or more selected and focus on a card outside them is that card\'s own note', () => {
  assert.equal(commentOnSelection(['1', '3'], 'c', '2', true), false);
});

test('C with two or more selected and no card focused is the group note', () => {
  assert.equal(commentOnSelection(['1', '3'], 'c', null, true), true);
});

test('C with one or no card selected is never the selection\'s: it is the focused card\'s own', () => {
  assert.equal(commentOnSelection(['1'], 'c', '1', true), false);
  assert.equal(commentOnSelection([], 'c', '2', true), false);
});

test('N and the bar\'s button (no key) are the selection\'s wherever focus is', () => {
  assert.equal(commentOnSelection(['1', '3'], 'n', '2', true), true);
  assert.equal(commentOnSelection(['1', '3'], undefined, '2', true), true);
  assert.equal(commentOnSelection(['1'], 'n', '2', true), true);
  assert.equal(commentOnSelection([], 'n', '2', true), false);
});

test('with the focusLeads flag off, C follows the selection as before', () => {
  assert.equal(commentOnSelection(['1', '3'], 'c', '2', false), true);
  assert.equal(commentOnSelection(['1'], 'c', '1', false), false);
});
