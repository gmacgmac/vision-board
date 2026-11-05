// One tab for updates and a proposal (oneChangeTab flag, point 444; node-core.ts `changeTab`): with both,
// the proposal tab says both and is named for both, and the steps go in its box (`oneTab`); either alone,
// or the flag off, as before.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '#format';
import type { BoardState } from '#actions';
import type { CardConditions, CardProposal } from '../src/index.ts';
import { nodeState } from '../src/index.ts';

const q: ViewNode = { id: '3', n: 3, region: 'r', kind: 'question', title: 'Move to monthly billing?' };
const board = (): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), flags: new Set() });
const prop = (f: Partial<CardProposal> = {}): CardProposal =>
  ({ seq: 20, action: 'ack', reason: 'both agreed', when: 'Nov 5, 16:10', stale: false, ...f });
const st = (c: CardConditions) => nodeState(q, board(), undefined, false, c);
const step = { ver: 2, when: 'Nov 5, 16:09', changes: [] };

test('both, flag on: one tab, "1 update · proposal", named for both, in the updated amber, steps in the box', () => {
  const s = st({ oneTab: true, proposals: [prop()], updates: { count: 1 } });
  assert.deepEqual([s.proposal!.tab, s.proposal!.label, s.proposal!.box, s.proposal!.updated], ['1 update · proposal', '1 update and a proposal on item 3', '1 update and a proposal on item 3', true]);
  assert.equal(s.oneTab, true);
  assert.equal(s.updates!.tab, '1 update', 'the updates view is kept: the box\'s stepper reads it');
  assert.equal(s.label, 'Item 3, Question: Move to monthly billing?, Open, 1 proposal, 1 unseen update');
});

test('both, plural and out of date: "2 updates · 2 proposals", "1 update · out of date"', () => {
  const two = st({ oneTab: true, proposals: [prop(), prop({ seq: 21 })], updates: { count: 2 } }).proposal!;
  assert.deepEqual([two.tab, two.label], ['2 updates · 2 proposals', '2 updates and 2 proposals on item 3']);
  const stale = st({ oneTab: true, proposals: [prop({ stale: true })], updates: { count: 1 } }).proposal!;
  assert.deepEqual([stale.tab, stale.label, stale.stale], ['1 update · out of date', '1 update and a proposal on item 3, out of date', true]);
  assert.equal(stale.entries[0]!.why, '3 changed after this was proposed. Ask the agent to look again.', 'the box marks it as today');
});

test('stepping keeps the one tab; past the last step the tab is the proposal\'s own, the steps still in the box', () => {
  const on = st({ oneTab: true, proposals: [prop()], updates: { count: 0, steps: [step], at: 0 } });
  assert.equal(on.proposal!.tab, '1 update · proposal');
  const done = st({ oneTab: true, proposals: [prop()], updates: { count: 0, steps: [step], at: 1 } });
  assert.deepEqual([done.proposal!.tab, done.proposal!.updated, done.oneTab], ['Proposal', undefined, true]);
});

test('either alone, or the flag off: as before', () => {
  const alone = st({ oneTab: true, proposals: [prop()] });
  assert.deepEqual([alone.proposal!.tab, alone.proposal!.updated, alone.oneTab], ['Proposal', undefined, undefined]);
  const updates = st({ oneTab: true, updates: { count: 1 } });
  assert.deepEqual([updates.updates!.tab, updates.proposal, updates.oneTab], ['1 update', undefined, undefined]);
  const off = st({ proposals: [prop()], updates: { count: 1 } });
  assert.deepEqual([off.proposal!.tab, off.updates!.tab, off.oneTab], ['Proposal', '1 update', undefined]);
});
