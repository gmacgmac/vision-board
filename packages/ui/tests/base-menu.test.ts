// The menu's keys (base/menu-core.ts, the WAI-ARIA menu pattern): Up and Down wrap, Home and End go
// to the ends, Esc closes with focus back, Tab closes and lets focus move on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MENU_BACK_KEYS, menuStep } from '../src/base/menu-core.ts';

test('Down moves to the next item and wraps from the last to the first', () => {
  assert.deepEqual(menuStep('ArrowDown', 0, 3), { focus: 1 });
  assert.deepEqual(menuStep('ArrowDown', 2, 3), { focus: 0 });
});

test('Up moves to the previous item and wraps from the first to the last', () => {
  assert.deepEqual(menuStep('ArrowUp', 2, 3), { focus: 1 });
  assert.deepEqual(menuStep('ArrowUp', 0, 3), { focus: 2 });
});

test('with no item focused, Down goes to the first and Up to the last', () => {
  assert.deepEqual(menuStep('ArrowDown', -1, 3), { focus: 0 });
  assert.deepEqual(menuStep('ArrowUp', -1, 3), { focus: 2 });
});

test('Home and End go to the first and the last', () => {
  assert.deepEqual(menuStep('Home', 1, 4), { focus: 0 });
  assert.deepEqual(menuStep('End', 1, 4), { focus: 3 });
});

test('Esc closes with focus back; Tab closes and lets focus move on', () => {
  assert.deepEqual(MENU_BACK_KEYS, ['Escape']);
  assert.deepEqual(menuStep('Escape', 0, 3), { close: 'back' });
  assert.deepEqual(menuStep('Tab', 0, 3), { close: 'on' });
});

test('a menu may name more keys that close it with focus back (the rail menu: Left)', () => {
  assert.equal(menuStep('ArrowLeft', 0, 3), null);
  assert.deepEqual(menuStep('ArrowLeft', 0, 3, ['ArrowLeft']), { close: 'back' });
  assert.deepEqual(menuStep('Escape', 0, 3, ['ArrowLeft']), { close: 'back' });
});

test('any other key does nothing, and an empty menu moves nowhere', () => {
  assert.equal(menuStep('a', 0, 3), null);
  assert.equal(menuStep('Enter', 0, 3), null);
  assert.equal(menuStep('ArrowDown', -1, 0), null);
  assert.deepEqual(menuStep('Escape', -1, 0), { close: 'back' });
});
