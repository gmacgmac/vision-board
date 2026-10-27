// Go to a card by typing its number (cortex-tasks/board/2026-10-15_board-app_go-to-card-number.md):
// digits build the number; Enter goes to a card drawn on the board, says "No card 99" for a number
// the board never gave and "Card 7 was removed" for a retired card, with the version where it last
// appeared; Esc closes; Backspace edits; with the goAfterPause flag a pause goes by itself.
// What a number names (`goTarget`) is packages/actions' test (go-target.test.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { GoTarget } from '#actions';
import type { GoBox, GoDeps } from '../src/board/go-to-card.ts';
import { createGoTo, goDigits } from '../src/board/go-to-card.ts';
import { commandForKey } from '../src/board/commands.ts';

test('a digit is the go command; the box keeps digits only, at most six', () => {
  for (const k of '0123456789') assert.equal(commandForKey(k), 'go-to-card', k);
  assert.equal(goDigits('1a2 3'), '123');
  assert.equal(goDigits('12345678'), '123456');
  assert.equal(goDigits(''), '');
});

/** A go box over fixed targets, recording what it did; a fake clock when `pause` is given. */
function box(targets: Record<number, GoTarget>, pause?: number) {
  const did: string[] = [];
  const shown: (GoBox | null)[] = [];
  let timer: { f: () => void; ms: number } | null = null;
  const d: GoDeps = {
    find: (n) => targets[n] ?? { to: 'none' },
    arrive: (id) => void did.push(`arrive ${id}`),
    past: async (v, until) => { did.push(`past ${v} ${until}`); },
    show: (b) => void shown.push(b && { ...b }),
    ...(pause !== undefined && { pause }),
    timer: { set: (f, ms) => { timer = { f, ms }; return timer; }, clear: (h) => { if (h === timer) timer = null; } },
  };
  const go = createGoTo(d);
  return { go, did, shown, last: () => shown.at(-1), tick: () => { const t = timer; timer = null; t?.f(); }, timer: () => timer };
}

test('digits build the number: the key that opens the box is its first digit, typing adds the rest', () => {
  const b = box({});
  assert.equal(b.go.open('1'), true);
  assert.deepEqual(b.last(), { text: '1' });
  b.go.edit('12');
  assert.deepEqual(b.last(), { text: '12' });
  b.go.edit('12x');
  assert.deepEqual(b.last(), { text: '12' });
  assert.equal(b.go.open('x'), false, 'only a digit opens it');
});

test('Enter on a card goes there and closes the box', () => {
  const b = box({ 12: { to: 'card', id: '12' } });
  b.go.open('1');
  b.go.edit('12');
  b.go.enter();
  assert.deepEqual(b.did, ['arrive 12']);
  assert.equal(b.last(), null);
  assert.equal(b.go.box, null);
});

test('Enter on an unknown number says "No card 99" and keeps the box open; typing again clears it', () => {
  const b = box({});
  b.go.open('9');
  b.go.edit('99');
  b.go.enter();
  assert.deepEqual(b.did, []);
  assert.deepEqual(b.last(), { text: '99', said: 'No card 99' });
  b.go.edit('9');
  assert.deepEqual(b.last(), { text: '9' });
});

test('Enter on a retired card says it was removed and offers its last version; the offer opens it and goes there', async () => {
  const b = box({ 7: { to: 'retired', version: 40, until: 44 } });
  b.go.open('7');
  b.go.enter();
  assert.deepEqual(b.last(), { text: '7', said: 'Card 7 was removed', past: { version: 40, until: 44, label: 'Show v40, where it last appeared' } });
  await b.go.openPast();
  assert.equal(b.go.box, null);
  // In that version card 7 is drawn: the box goes to it there (here the targets stay, so it says none).
  assert.deepEqual(b.did, ['past 40 44']);
  const c = box({ 7: { to: 'retired' } });
  c.go.open('7');
  c.go.enter();
  assert.deepEqual(c.last(), { text: '7', said: 'Card 7 was removed' }, 'no version to offer');
});

test('Enter on a card hidden with the answered cards says so and keeps the box open', () => {
  const b = box({ 4: { to: 'hidden' } });
  b.go.open('4');
  b.go.enter();
  assert.deepEqual(b.last(), { text: '4', said: 'Card 4 is hidden with the answered cards (H shows them)' });
});

test('Esc closes the box without going; Backspace edits, and Enter on nothing does nothing', () => {
  const b = box({ 1: { to: 'card', id: '1' } });
  b.go.open('1');
  b.go.edit('12');
  b.go.edit('1'); // Backspace
  assert.deepEqual(b.last(), { text: '1' });
  b.go.edit(''); // Backspace again: the box stays, empty
  assert.deepEqual(b.last(), { text: '' });
  b.go.enter();
  assert.deepEqual(b.did, []);
  b.go.close();
  assert.equal(b.last(), null);
  b.go.close(); // twice is once
  assert.equal(b.shown.filter((x) => x === null).length, 1);
});

test('nothing goes by itself; with the goAfterPause flag a pause after the last digit goes', () => {
  const off = box({ 3: { to: 'card', id: '3' } });
  off.go.open('3');
  assert.equal(off.timer(), null);
  const on = box({ 3: { to: 'card', id: '3' }, 31: { to: 'card', id: '31' } }, 1000);
  on.go.open('3');
  assert.equal(on.timer()?.ms, 1000);
  on.go.edit('31'); // a new digit starts the pause again
  on.tick();
  assert.deepEqual(on.did, ['arrive 31']);
  on.go.open('5');
  on.go.close(); // Esc stops the pause
  assert.equal(on.timer(), null);
  on.go.open('5');
  on.go.edit(''); // nothing typed: nothing to go to
  assert.equal(on.timer(), null);
});

test('a number chosen elsewhere (the open list) goes as Enter would, closing an open box; not there, the box says why', () => {
  const b = box({ 12: { to: 'card', id: '12' } });
  b.go.open('9');
  b.go.to(12);
  assert.deepEqual(b.did, ['arrive 12']);
  assert.equal(b.go.box, null);
  const c = box({ 1: { to: 'card', id: '1' } }, 1000);
  c.go.to(1);
  assert.deepEqual(c.did, ['arrive 1']);
  assert.equal(c.timer(), null, 'no pause starts');
  const d = box({ 4: { to: 'hidden' } });
  d.go.to(4);
  assert.deepEqual(d.last(), { text: '4', said: 'Card 4 is hidden with the answered cards (H shows them)' });
});
