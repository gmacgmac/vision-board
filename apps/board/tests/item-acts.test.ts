// The review buttons on one card (item-acts.ts), answer-model ruling 8 (D-045): pressing a lit ✓ or ✗
// clears it and the toast says "N cleared"; ✗ while ✓ is lit switches straight to ✗; a second press
// of the same button within 400 ms is ignored, so a double click never undoes itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActionId, ViewNode } from '#format';
import type { BoardState, ItemStatus } from '#actions';
import { createItemActs, REPEAT_MS } from '../src/board/cards/item-acts.ts';

const card: ViewNode = { id: '12', n: 12, region: 'r', kind: 'decision', title: 'Keep the free tier' };

/** One decision whose status follows what was recorded; the clock moves by hand. */
function harness(focusLeft?: (id: string) => boolean) {
  let status: ItemStatus = 'open';
  let clock = 1000;
  const log: string[] = [];
  const focused: string[] = [];
  const state = (): BoardState => ({
    items: new Map([['12', { status, notes: [] }]]), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(),
    moves: new Map(), regionPins: new Map(), regionNotes: new Map(), bookmarks: new Set(),
  });
  const set: Partial<Record<ActionId, ItemStatus>> = { ack: 'acknowledged', drop: 'dropped', later: 'later', reopen: 'open' };
  const act = createItemActs({
    ...(focusLeft && { focusLeft }),
    node: (id) => (id === '12' ? card : undefined), state,
    notes: { press: (id) => void log.push(`note ${id}`) },
    moves: { status: async (_id, a) => { status = set[a]!; log.push(a); return true; } },
    record: async (f) => { status = set[f.action]!; log.push(f.action); return true; },
    target: () => ({ n: 12, ver: 1 }), hiding: () => false, hidden: () => new Set(), neighbour: () => null,
    focusCard: (id) => void focused.push(id), toast: (t) => void log.push(`toast ${t}`), now: () => clock,
  });
  return { act, log, focused, status: () => status, wait: (ms: number) => { clock += ms; } };
}

test('a lit ✓ pressed again clears it, and the toast says "12 cleared"', async () => {
  const h = harness();
  await h.act('12', 'ack');
  h.wait(REPEAT_MS);
  await h.act('12', 'ack');
  assert.equal(h.status(), 'open');
  assert.deepEqual(h.log, ['ack', 'toast 12 ✓', 'reopen', 'toast 12 cleared']);
});

test('✗ while ✓ is lit switches straight to ✗', async () => {
  const h = harness();
  await h.act('12', 'ack');
  await h.act('12', 'drop');
  assert.equal(h.status(), 'dropped');
  assert.deepEqual(h.log, ['ack', 'toast 12 ✓', 'drop', 'toast 12 ✗']);
});

test('a double click on ✓ leaves it ticked; the same press after 400 ms clears it', async () => {
  const h = harness();
  await h.act('12', 'ack');
  h.wait(REPEAT_MS - 1);
  await h.act('12', 'ack');
  assert.equal(h.status(), 'acknowledged', 'the second press within 400 ms is ignored');
  h.wait(REPEAT_MS);
  await h.act('12', 'ack');
  assert.equal(h.status(), 'open');
});

test('Comment opens the note; More context is not a button any card has', async () => {
  const h = harness();
  await h.act('12', 'comment');
  await h.act('12', 'context');
  assert.deepEqual(h.log, ['note 12']);
});

// KEY_01 (focusLeads flag): the write answers later than the keyboard moves; a press gives focus back to
// its card only when focus is still there or lost, never when the person has moved on.
test('after the write, focus returns to the card unless the person has moved it elsewhere', async () => {
  const stay = harness(() => false);
  await stay.act('12', 'ack');
  assert.deepEqual(stay.focused, ['12']);
  const moved = harness(() => true);
  await moved.act('12', 'ack');
  assert.deepEqual(moved.focused, [], 'focus left where the person put it');
  assert.deepEqual(moved.log, ['ack', 'toast 12 ✓'], 'the toast still says it');
});

test('without the flag (no focusLeft), focus always returns to the card, as before', async () => {
  const h = harness();
  await h.act('12', 'drop');
  assert.deepEqual(h.focused, ['12']);
});

// FE_02 (nodeEdges): the disc's picker reads what a press came to, so its mark can say a write failed.
test('a press says what it came to: written, failed, or nothing sent (a repeat, a note, a card it does not take)', async () => {
  const h = harness();
  assert.equal(await h.act('12', 'ack'), true);
  assert.equal(await h.act('12', 'ack'), undefined, 'a second press within 400 ms sends nothing');
  assert.equal(await h.act('12', 'comment'), undefined);
  assert.equal(await h.act('99', 'ack'), undefined);
  const failing = createItemActs({
    node: () => card, state: () => ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), bookmarks: new Set() }),
    notes: { press: () => undefined }, moves: { status: async () => false }, record: async () => false,
    target: () => ({ n: 12, ver: 1 }), hiding: () => false, hidden: () => new Set(), neighbour: () => null, focusCard: () => undefined, toast: () => undefined,
  });
  assert.equal(await failing('12', 'drop'), false);
});

// FIX_03: a press acts on the answer the person sees, not on the state drawn before the last write landed. A clear still
// on its way when ✓ is pressed again leaves the card ticked (it was "12 cleared" twice), and the writes keep their order.
test('✓ pressed while the clear is still on its way ticks again, after the clear', async () => {
  let status: ItemStatus = 'acknowledged';
  let clock = 1000;
  const log: string[] = [];
  let land: () => void = () => undefined;
  const set: Partial<Record<ActionId, ItemStatus>> = { ack: 'acknowledged', drop: 'dropped', later: 'later', reopen: 'open' };
  const act = createItemActs({
    node: () => card,
    state: () => ({ items: new Map([['12', { status, notes: [] }]]), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(),
      moves: new Map(), regionPins: new Map(), regionNotes: new Map(), bookmarks: new Set() }),
    notes: { press: () => undefined },
    // The clear takes a moment to land; what it changes is drawn only then.
    moves: { status: (_id, a) => new Promise((r) => { log.push(`${a} sent`); land = () => { status = set[a]!; r(true); }; }) },
    record: async (f) => { log.push(`${f.action} sent`); status = set[f.action]!; return true; },
    target: () => ({ n: 12, ver: 1 }), hiding: () => false, hidden: () => new Set(), neighbour: () => null,
    focusCard: () => undefined, toast: (t) => void log.push(`toast ${t}`), now: () => clock,
  });
  const clearing = act('12', 'ack');
  clock += REPEAT_MS;
  const ticking = act('12', 'ack');
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(log, ['reopen sent'], 'the tick waits for the clear');
  land();
  await Promise.all([clearing, ticking]);
  assert.equal(status, 'acknowledged');
  assert.deepEqual(log.filter((x) => x.endsWith('sent')), ['reopen sent', 'ack sent']);
  assert.deepEqual(log.filter((x) => x.startsWith('toast')).sort(), ['toast 12 cleared', 'toast 12 ✓']);
});
