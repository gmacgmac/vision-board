// A card's proposals (proposals-seen-parking FE_01, D-018): the box's words newest first, out of date once the card
// changed, the card's name, the disc's dashed ring (D-099, DESIGN_01), and the box's markup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '#format';
import type { BoardState } from '#actions';
import type { CardProposal } from '../src/index.ts';
import { nodeState, nodeTemplate, proposalsMarkup } from '../src/index.ts';

const q: ViewNode = { id: '47', n: 47, region: 'r', kind: 'question', title: 'Will they take the discount?' };
const board = (): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), bookmarks: new Set() });
const prop = (f: Partial<CardProposal> = {}): CardProposal =>
  ({ seq: 812, action: 'drop', reason: 'the client declined', when: 'Oct 8, 13:48', stale: false, ...f });
const withProps = (...list: CardProposal[]) => nodeState(q, board(), undefined, false, { proposals: list });

test('no proposal: no box contents, and the name as before', () => {
  const st = nodeState(q, board());
  assert.equal(st.proposal, undefined);
  assert.equal(st.label, 'Item 47, Question: Will they take the discount?, Open');
  assert.equal(withProps().proposal, undefined, 'an empty list is none');
});

test('an open proposal: the box, with who, what, from where and when; the disc carries it', () => {
  const st = withProps(prop({ source: 'Email pasted in chat', agent: 'Pricing chat' }));
  assert.equal(st.marks.proposed, 'drop');
  assert.deepEqual(st.proposal, {
    box: 'Proposal on item 47',
    entries: [{
      seq: 812, stale: false, head: 'Pricing chat proposes', what: 'Cross 47: the client declined',
      from: 'Email pasted in chat · Oct 8, 13:48', accept: 'Accept: cross 47', reject: 'Reject: cross 47',
    }],
  });
  assert.equal(st.label, 'Item 47, Question: Will they take the discount?, Open, 1 proposal');
  assert.equal(nodeState(q, board(), undefined, true, { proposals: [prop()] }).label.endsWith(', 1 proposal, selected'), true);
});

test('out of date: the name says so, the box says why, Accept is named out of date; the disc carries none', () => {
  const st = withProps(prop({ stale: true, action: 'ack' }));
  const p = st.proposal!;
  assert.equal(st.marks.proposed, undefined);
  assert.deepEqual(p.entries[0], {
    seq: 812, stale: true, head: 'The agent proposed · out of date', what: 'Check 47: the client declined', from: 'Oct 8, 13:48',
    why: '47 changed after this was proposed. Ask the agent to look again.',
    accept: 'Accept: check 47 (out of date)', reject: 'Reject: check 47',
  });
  assert.equal(st.label.endsWith(', Open, 1 proposal, out of date'), true);
});

test('several on one card: newest first; the disc carries the newest that can be accepted', () => {
  const st = withProps(prop({ seq: 5, stale: true }), prop({ seq: 9, action: 'ack' }));
  assert.deepEqual(st.proposal!.entries.map((e) => e.seq), [9, 5]);
  assert.equal(st.proposal!.box, 'Proposals on item 47');
  assert.equal(st.marks.proposed, 'ack');
  assert.equal(st.label.endsWith(', 2 proposals, 1 out of date'), true);
  assert.equal(withProps(prop({ seq: 5, stale: true }), prop({ seq: 9, stale: true })).label.endsWith(', 2 proposals, out of date'), true);
});

test('a non-item has no proposal and no box', () => {
  const topic: ViewNode = { id: 't', region: 'r', kind: 'topic', title: 'Stack' };
  assert.equal(nodeState(topic, board(), undefined, false, { proposals: [prop()] }).proposal, undefined);
  assert.equal(nodeTemplate(topic).includes('data-pop="proposal"'), false);
});

test('template: an item has its proposal box beside it, empty until a proposal comes', () => {
  assert.match(nodeTemplate(q), /<div class="vb-tip vb-card-pop vb-node-box" data-pop="proposal" id="vb-pop-proposal-47" role="dialog" tabindex="-1"><\/div>/);
});

test('markup: Reject and Accept name the proposal; out of date, Accept is aria-disabled and described by the reason', () => {
  const open = proposalsMarkup(withProps(prop({ reason: 'a <b>bold</b> claim' })).proposal!);
  assert.match(open, /data-proposal="812" data-answer="reject" aria-label="Reject: cross 47">Reject</);
  assert.match(open, /data-proposal="812" data-answer="accept" aria-label="Accept: cross 47">Accept</);
  assert.equal(open.includes('<b>'), false, 'every text run is escaped');
  const stale = proposalsMarkup(withProps(prop({ stale: true })).proposal!);
  assert.match(stale, /<p class="vb-prop-why" id="vb-prop-why-812">47 changed after this was proposed\. Ask the agent to look again\.<\/p>/);
  assert.match(stale, /data-answer="accept" aria-label="Accept: cross 47 \(out of date\)" aria-disabled="true" aria-describedby="vb-prop-why-812">/);
});
