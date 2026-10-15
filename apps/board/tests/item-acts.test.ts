// The review buttons on one card (item-acts.ts), answer-model ruling 8 (D-045): pressing a lit ✓ or ✗
// clears it and the toast says "N cleared"; ✗ while ✓ is lit switches straight to ✗; a second press
// of the same button within 400 ms is ignored, so a double click never undoes itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActionId, ViewNode } from '../../../packages/format/src/index.ts';
import type { BoardState, ItemStatus } from '../../../packages/actions/src/index.ts';
import { createItemActs, REPEAT_MS } from '../src/board/item-acts.ts';

const card: ViewNode = { id: '12', n: 12, region: 'r', kind: 'decision', title: 'Keep the free tier' };

/** One decision whose status follows what was recorded; the clock moves by hand. */
function harness() {
  let status: ItemStatus = 'open';
  let clock = 1000;
  const log: string[] = [];
  const state = (): BoardState => ({
    items: new Map([['12', { status, notes: [] }]]), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(),
    moves: new Map(), regionPins: new Map(), regionNotes: new Map(), flags: new Set(),
  });
  const set: Partial<Record<ActionId, ItemStatus>> = { ack: 'acknowledged', drop: 'dropped', later: 'later', reopen: 'open' };
  const act = createItemActs({
    node: (id) => (id === '12' ? card : undefined), state,
    notes: { press: (id) => void log.push(`note ${id}`) },
    moves: { status: async (_id, a) => { status = set[a]!; log.push(a); return true; } },
    record: async (f) => { status = set[f.action]!; log.push(f.action); return true; },
    target: () => ({ n: 12, ver: 1 }), hiding: () => false, hidden: () => new Set(), neighbour: () => null,
    focusCard: () => {}, toast: (t) => void log.push(`toast ${t}`), now: () => clock,
  });
  return { act, log, status: () => status, wait: (ms: number) => { clock += ms; } };
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
