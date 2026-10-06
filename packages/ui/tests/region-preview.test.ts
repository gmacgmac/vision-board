// The container note's preview popover (3_FE_04 step 4G ruling 2, WCAG 1.4.13): opens on hover or
// keyboard focus of Comment when there is a note, stays while the pointer is on Comment or on it,
// Esc dismisses it without moving anything, touch opens it with a tap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PreviewEvent, PreviewState } from '../src/region/region-preview.ts';
import { PREVIEW_CLOSED, previewShown, previewStep } from '../src/region/region-preview.ts';

const run = (...events: PreviewEvent[]): PreviewState => events.reduce(previewStep, PREVIEW_CLOSED);
const open = (...events: PreviewEvent[]) => previewShown(run(...events), true);

test('closed at rest, and never shown without a note', () => {
  assert.equal(previewShown(PREVIEW_CLOSED, true), false);
  for (const e of ['button-enter', 'focus-in', 'tap'] as const) assert.equal(previewShown(run(e), false), false, e);
});

test('hover: opens on Comment, stays while the pointer crosses onto the popover, closes when it leaves both', () => {
  assert.equal(open('button-enter'), true);
  assert.equal(open('button-enter', 'popover-enter', 'button-leave'), true, 'hoverable');
  assert.equal(open('button-enter', 'popover-enter', 'button-leave', 'popover-leave'), false);
  assert.equal(open('button-enter', 'button-leave'), false);
});

test('keyboard focus: opens on Comment, stays while focus is in the popover, closes when focus leaves', () => {
  assert.equal(open('focus-in'), true);
  assert.equal(open('focus-in', 'focus-in'), true, 'focus moving from Comment into the popover');
  assert.equal(open('focus-in', 'focus-out'), false);
  assert.equal(open('focus-in', 'button-enter', 'button-leave'), true, 'persistent: the pointer leaving does not close it under focus');
});

test('Esc dismisses it without moving the pointer or focus; it stays shut until they come back', () => {
  assert.equal(open('button-enter', 'escape'), false);
  assert.equal(open('focus-in', 'escape'), false);
  assert.equal(open('focus-in', 'escape', 'focus-in'), false, 'focus moving inside does not reopen it');
  assert.equal(open('focus-in', 'escape', 'focus-out', 'focus-in'), true, 'focus coming back does');
  assert.equal(open('button-enter', 'escape', 'button-enter'), true, 'the pointer coming back does');
  assert.equal(open('focus-in', 'escape', 'button-enter'), true, 'a fresh pointer arrival opens it again');
});

test('close (the bubble opened from Comment or Edit) gives way like Esc', () => {
  assert.equal(open('button-enter', 'close'), false);
  assert.equal(open('focus-in', 'popover-enter', 'close'), false);
  assert.equal(open('focus-in', 'close', 'focus-out', 'focus-in'), true);
  // A pointer that rested on the popover as it hid needs no leave event to reopen later.
  assert.equal(run('popover-enter', 'close').popover, false);
});

test('touch: a tap opens it, a press outside closes it, Esc too', () => {
  assert.equal(open('tap'), true);
  assert.equal(open('tap', 'outside'), false);
  assert.equal(open('tap', 'escape'), false);
  assert.equal(open('tap', 'escape', 'tap'), true);
  assert.equal(open('button-enter', 'outside'), true, 'a press outside does not close what the pointer still holds open');
});
