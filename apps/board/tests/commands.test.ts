// The selection bar's buttons from the one command table (selection-bar-shorter): short words on
// the bar, the whole meaning and the key in the tooltip and the accessible name; no Clear.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { commandTitle, SELECTION_COMMANDS, selectionButtons } from '../src/board/input/commands.ts';

test('the bar reads Comment, Move to, Reset places, Remove, Zoom; Clear is not a button', () => {
  assert.deepEqual(selectionButtons(2, true).map((b) => b.label), ['Comment', 'Move to', 'Reset places', 'Remove', 'Zoom']);
  assert.ok(!SELECTION_COMMANDS.some((id) => (id as string) === 'clear'));
  // Without the personRemove flag there is no Remove.
  assert.deepEqual(selectionButtons(2, false).map((b) => b.label), ['Comment', 'Move to', 'Reset places', 'Zoom']);
});

test('Remove and Zoom carry their full words and key as the title; the unchanged buttons carry none', () => {
  const by = (count: number) => Object.fromEntries(selectionButtons(count, true).map((b) => [b.id, 'title' in b ? b.title : undefined]));
  assert.equal(by(2).remove, 'Remove the selected cards · Delete');
  assert.equal(by(1).remove, 'Remove the selected card · Delete');
  assert.equal(by(2)['zoom-selection'], 'Zoom to the selection · Z');
  assert.deepEqual([by(2).comment, by(2).move, by(2)['reset-places']], [undefined, undefined, undefined]);
  assert.equal(commandTitle('zoom-selection'), 'Zoom to the selection · Z');
});
