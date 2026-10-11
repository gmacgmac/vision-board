// A card's proposals (proposals-seen-parking FE_01, D-018): the PROPOSAL tab, OUT OF DATE once the
// card changed, the box's words newest first, the card's name, and the box's markup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '../../format/src/index.ts';
import type { BoardState } from '../../actions/src/index.ts';
import type { CardProposal } from '../src/index.ts';
import { nodeState, nodeTemplate, proposalsMarkup } from '../src/index.ts';

const q: ViewNode = { id: '47', n: 47, region: 'r', kind: 'question', title: 'Will they take the discount?' };
const board = (): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), flags: new Set() });
const prop = (f: Partial<CardProposal> = {}): CardProposal =>
  ({ seq: 812, action: 'drop', reason: 'the client declined', when: 'Oct 8, 13:48', stale: false, ...f });
const withProps = (...list: CardProposal[]) => nodeState(q, board(), undefined, false, { proposals: list });

test('no proposal: no tab, and the name as before', () => {
  const st = nodeState(q, board());
  assert.equal(st.proposal, undefined);
  assert.equal(st.label, 'Item 47, Question: Will they take the discount?, Open');
  assert.equal(withProps().proposal, undefined, 'an empty list is none');
});

test('an open proposal: the PROPOSAL tab and the box, with who, what, from where and when', () => {
  const st = withProps(prop({ source: 'Email pasted in chat', agent: 'Pricing chat' }));
  assert.deepEqual(st.proposal, {
    tab: 'Proposal', stale: false, label: 'Proposal on item 47', box: 'Proposal on item 47',
    entries: [{
      seq: 812, stale: false, head: 'Pricing chat proposes', what: 'Drop 47: the client declined',
      from: 'Email pasted in chat · Oct 8, 13:48', accept: 'Accept: drop 47', reject: 'Reject: drop 47',
    }],
  });
  assert.equal(st.label, 'Item 47, Question: Will they take the discount?, Open, 1 proposal');
  assert.equal(nodeState(q, board(), undefined, true, { proposals: [prop()] }).label.endsWith(', 1 proposal, selected'), true);
});

test('out of date: the tab and the name say so, the box says why, Accept is named out of date', () => {
  const st = withProps(prop({ stale: true, action: 'ack' }));
  const p = st.proposal!;
  assert.deepEqual([p.tab, p.stale, p.label], ['Out of date', true, 'Proposal on item 47, out of date']);
  assert.deepEqual(p.entries[0], {
    seq: 812, stale: true, head: 'The agent proposed · out of date', what: 'Acknowledge 47: the client declined', from: 'Oct 8, 13:48',
    why: '47 changed after this was proposed. Ask the agent to look again.',
    accept: 'Accept: acknowledge 47 (out of date)', reject: 'Reject: acknowledge 47',
  });
  assert.equal(st.label.endsWith(', Open, 1 proposal, out of date'), true);
});

test('several on one card: newest first; the tab stays PROPOSAL while any can be accepted', () => {
  const st = withProps(prop({ seq: 5, stale: true }), prop({ seq: 9 }));
  assert.deepEqual(st.proposal!.entries.map((e) => e.seq), [9, 5]);
  assert.deepEqual([st.proposal!.tab, st.proposal!.label, st.proposal!.box], ['Proposal', '2 proposals on item 47', 'Proposals on item 47']);
  assert.equal(st.label.endsWith(', 2 proposals, 1 out of date'), true);
  assert.equal(withProps(prop({ seq: 5, stale: true }), prop({ seq: 9, stale: true })).label.endsWith(', 2 proposals, out of date'), true);
});

test('a non-item has no proposal tab', () => {
  const topic: ViewNode = { id: 't', region: 'r', kind: 'topic', title: 'Stack' };
  assert.equal(nodeState(topic, board(), undefined, false, { proposals: [prop()] }).proposal, undefined);
  assert.equal(nodeTemplate(topic).includes('vb-node-btab'), false);
});

test('template: an item has the hidden tab on the bottom edge and its box, which the tab controls', () => {
  const html = nodeTemplate(q);
  assert.match(html, /<div class="vb-node-btabs"><button type="button" class="vb-node-btab" data-tab="proposal" aria-haspopup="dialog" aria-expanded="false" aria-controls="vb-pop-proposal-47" hidden><\/button>/);
  assert.match(html, /<div class="vb-tip vb-card-pop" data-pop="proposal" id="vb-pop-proposal-47" role="dialog" tabindex="-1"><\/div>/);
});

test('markup: Reject and Accept name the proposal; out of date, Accept is aria-disabled and described by the reason', () => {
  const open = proposalsMarkup(withProps(prop({ reason: 'a <b>bold</b> claim' })).proposal!);
  assert.match(open, /data-proposal="812" data-answer="reject" aria-label="Reject: drop 47">Reject</);
  assert.match(open, /data-proposal="812" data-answer="accept" aria-label="Accept: drop 47">Accept</);
  assert.equal(open.includes('<b>'), false, 'every text run is escaped');
  const stale = proposalsMarkup(withProps(prop({ stale: true })).proposal!);
  assert.match(stale, /<p class="vb-prop-why" id="vb-prop-why-812">47 changed after this was proposed\. Ask the agent to look again\.<\/p>/);
  assert.match(stale, /data-answer="accept" aria-label="Accept: drop 47 \(out of date\)" aria-disabled="true" aria-describedby="vb-prop-why-812">/);
});
