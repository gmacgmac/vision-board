// A card the agent added later (stage5-follow-ups FE_01, `item.new`): the change badge reads New (D-099), and the
// card's name ends ", new".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '#format';
import type { BoardState } from '#actions';
import { nodeState } from '../src/index.ts';

const r: ViewNode = { id: '44', n: 44, region: 'r', kind: 'risk', title: 'The floor undercuts self-serve' };
const board = (): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), bookmarks: new Set() });

test('no new fact: no New badge, the name as before', () => {
  assert.equal(nodeState(r, board()).marks.badge, 'none');
  assert.equal(nodeState(r, board(), undefined, false, { new: false }).marks.badge, 'none');
  assert.equal(nodeState(r, board()).label, 'Item 44, Risk: The floor undercuts self-serve');
});

test('a new card: the badge reads New and the name ends ", new"', () => {
  const st = nodeState(r, board(), undefined, false, { new: true });
  assert.equal(st.marks.badge, 'new');
  assert.equal(st.label, 'Item 44, Risk: The floor undercuts self-serve, new');
});

test('new comes after the other words in the name', () => {
  const st = nodeState(r, board(), undefined, false, { new: true, awaiting: true });
  assert.equal(st.label.endsWith(', awaiting context, new'), true);
});

test('a non-item is never new', () => {
  const topic: ViewNode = { id: 't', region: 'r', kind: 'topic', title: 'Stack' };
  assert.equal(nodeState(topic, board(), undefined, false, { new: true }).marks.badge, 'none');
});
