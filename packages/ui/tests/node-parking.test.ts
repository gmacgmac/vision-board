// Parking and replies on a card (proposals-seen-parking FE_03): the quiet Awaiting tab while the handover is owed,
// the handover as a section of the node's body (DESIGN_01), an agent's reply under the note it answers in a
// conversation, a reply naming no note in its place by time among the notes (review-polish decision 8), a container
// note's replies, and the markup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ParkBundle, ViewNode } from '#format';
import type { BoardState, ItemNote } from '#actions';
import type { CardReply, RegionState } from '../src/index.ts';
import { conversation, handoverMarkup, nodeState, nodeTemplate, regionNote, regionState } from '../src/index.ts';

const r: ViewNode = { id: '12', n: 12, region: 'r', kind: 'question', title: 'Does the trial need a card?' };
const board = (f: Partial<BoardState> = {}): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), bookmarks: new Set(), ...f });
const later = (notes: ItemNote[] = []) => board({ items: new Map([['12', { status: 'later', notes }]]) });
const note = (seq: number, text = 'Is this right?'): ItemNote => ({ seq, kind: 'comment', text, at: '2026-10-08T00:00:00Z', sent: true });
const reply = (seq: number, text: string, f: Partial<CardReply> = {}): CardReply => ({ seq, text, at: '2026-10-08T00:00:00Z', ...f });
const bundle: ParkBundle = {
  situation: 'The trial **starts** without a card.', background: 'Support asked twice.', assessment: 'Low risk.',
  recommendation: 'Ship it.', sources: ['Support thread', 'Pricing sheet'],
};

test('awaiting: the Awaiting tab shows and the name says so', () => {
  const st = nodeState(r, later(), undefined, false, { awaiting: true });
  assert.equal(st.marks.awaiting, true);
  assert.equal(st.label, 'Item 12, Question: Does the trial need a card?, Saved for later, awaiting context');
  assert.equal(nodeState(r, later()).marks.awaiting, false);
  assert.equal(nodeState({ ...r, n: undefined, kind: 'topic' }, later(), undefined, false, { awaiting: true }).marks.awaiting, false, 'a non-item owes no handover');
});

test('handover: the heading and the four headed sections, then the sources', () => {
  const st = nodeState(r, later(), undefined, false, { handover: bundle });
  assert.deepEqual(st.handover, {
    tab: 'Handover',
    sections: [
      { head: 'Situation', text: 'The trial **starts** without a card.' }, { head: 'Background', text: 'Support asked twice.' },
      { head: 'Assessment', text: 'Low risk.' }, { head: 'Recommendation', text: 'Ship it.' },
    ],
    sources: ['Support thread', 'Pricing sheet'],
  });
  assert.equal(st.label.endsWith(', Saved for later, handover ready'), true);
  assert.deepEqual(nodeState(r, later(), undefined, false, { handover: { ...bundle, sources: undefined } }).handover!.sources, []);
});

test('handover: none while the handover is owed again, none for a non-item', () => {
  assert.equal(nodeState(r, later(), undefined, false, { handover: bundle, awaiting: true }).handover, undefined);
  assert.equal(nodeState({ ...r, n: undefined, kind: 'topic' }, later(), undefined, false, { handover: bundle }).handover, undefined);
});

test('handoverMarkup: Markdown in each section, the sources as a list, every text run escaped', () => {
  const html = handoverMarkup(nodeState(r, later(), undefined, false, { handover: { ...bundle, sources: ['<b>x</b>'] } }).handover!);
  assert.match(html, /^<section class="vb-hand"><h4 class="vb-hand-head">Situation<\/h4><div class="vb-hand-text"><p class="vb-md-p">The trial <strong>starts<\/strong> without a card\.<\/p><\/div><\/section>/);
  assert.ok(html.indexOf('Recommendation') < html.indexOf('Sources'));
  assert.ok(html.includes('<ul class="vb-hand-sources"><li>&#60;b&#62;x&#60;/b&#62;</li></ul>'));
  assert.ok(!html.includes('<b>'));
});

test('replies: each sits under the note it answers, in time order, the oldest note first (review-polish ruling 8)', () => {
  const entries = conversation([note(20, 'one'), note(30, 'two')],
    [reply(41, 'Second answer', { to: 20, agent: 'Pricing chat' }), reply(40, 'First answer', { to: 20 }), reply(50, 'On two', { to: 30 })]);
  assert.deepEqual(entries.map((x) => [x.seq, 'replies' in x ? x.replies?.map((y) => [y.seq, y.who, y.text]) : undefined]), [
    [20, [[40, 'Agent', 'First answer'], [41, 'Agent · Pricing chat', 'Second answer']]],
    [30, [[50, 'Agent', 'On two']]],
  ]);
});

test('replies: a note with none carries none; a reply naming no note takes its place by time among the notes', () => {
  const entries = conversation([note(20)], [reply(61, 'To a gone note', { to: 99 }), reply(10, 'Before the note'), reply(60, 'Also: the sheet is updated', { agent: 'Pricing chat' })]);
  assert.deepEqual(entries.map((x) => [x.seq, 'orphan' in x]), [[10, true], [20, false], [60, true], [61, true]]);
  assert.ok(!('replies' in entries[1]!), 'the note with no reply carries no replies');
  assert.deepEqual(conversation([], [reply(70, 'Heads up')]), [{ seq: 70, who: 'Agent', text: 'Heads up', at: '2026-10-08T00:00:00Z', orphan: true }]);
});

test('replies: the notes mark counts the notes and the replies, and fills while a reply is unread', () => {
  const marks = nodeState(r, later([note(20)]), undefined, false, { replies: [reply(41, 'Yes', { to: 20, unseen: true })], new: true }).marks;
  assert.deepEqual([marks.notes, marks.notesText], ['unread', '2']);
  assert.equal(nodeState(r, board()).marks.notes, 'none', 'none without notes or replies');
});

test('nodeTemplate: an item gets the handover section and the Awaiting tab, both hidden; a non-item neither', () => {
  const html = nodeTemplate(r);
  assert.match(html, /<section class="vb-node-handover" aria-label="Handover" hidden><\/section>/);
  assert.match(html, /<span class="vb-mark vb-mark-awaiting" title="The handover is still owed" hidden>Awaiting<\/span>/);
  assert.doesNotMatch(nodeTemplate({ ...r, n: undefined, kind: 'topic' }), /handover|awaiting/i);
});

test('a container note: the replies that name it, oldest first; none for another note', () => {
  const n = note(184, 'Should the trial skip the card step?');
  const replies = [reply(186, 'Yes.', { to: 184, agent: 'Pricing chat' }), reply(187, 'Elsewhere', { to: 9 }), reply(188, 'No `to`')];
  assert.deepEqual(regionNote([n], false, replies)!.replies, [{ seq: 186, who: 'Agent · Pricing chat', name: 'Pricing chat', text: 'Yes.', at: '2026-10-08T00:00:00Z' }]);
  assert.equal(regionNote([n], false)!.replies, undefined);
  const view = { title: 'B', version: 1, regions: [{ id: 'g', title: 'G', mode: 'grid' as const }], nodes: [], links: [] };
  const st: RegionState = regionState({ id: 'g', mode: 'grid' }, view as never, board({ regionNotes: new Map([['g', [n]]]) }), new Set(), undefined, new Set(), replies);
  assert.equal(st.note!.replies!.length, 1);
});
