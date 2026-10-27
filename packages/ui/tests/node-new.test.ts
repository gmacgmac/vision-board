// A card the agent added later (stage5-follow-ups FE_01, `item.new`): the NEW tab on the bottom edge
// (not a button), the card's name ending ", new", and the markup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '#format';
import type { BoardState } from '#actions';
import { nodeState, nodeTemplate } from '../src/index.ts';

const r: ViewNode = { id: '44', n: 44, region: 'r', kind: 'risk', title: 'The floor undercuts self-serve' };
const board = (): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), flags: new Set() });

test('no new fact: no NEW, the name as before', () => {
  assert.equal(nodeState(r, board()).fresh, undefined);
  assert.equal(nodeState(r, board(), undefined, false, { new: false }).fresh, undefined);
  assert.equal(nodeState(r, board()).label, 'Item 44, Risk: The floor undercuts self-serve');
});

test('a new card: the name ends ", new"', () => {
  const st = nodeState(r, board(), undefined, false, { new: true });
  assert.equal(st.fresh, true);
  assert.equal(st.label, 'Item 44, Risk: The floor undercuts self-serve, new');
});

test('new comes after the other words in the name', () => {
  const st = nodeState(r, board(), undefined, false, { new: true, awaiting: true });
  assert.equal(st.label.endsWith(', awaiting context, new'), true);
});

test('a non-item is never new', () => {
  const topic: ViewNode = { id: 't', region: 'r', kind: 'topic', title: 'Stack' };
  assert.equal(nodeState(topic, board(), undefined, false, { new: true }).fresh, undefined);
});

test('template: the hidden NEW tab in the bottom slot is not a button and is hidden from the tree', () => {
  assert.match(nodeTemplate(r), /<span class="vb-node-btab" data-tab="new" aria-hidden="true" hidden>NEW<\/span>/);
  const topic: ViewNode = { id: 't', region: 'r', kind: 'topic', title: 'Stack' };
  assert.equal(nodeTemplate(topic).includes('data-tab="new"'), false);
});
