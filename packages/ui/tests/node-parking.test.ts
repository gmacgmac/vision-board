// Parking and replies on a card (proposals-seen-parking FE_03): "Awaiting" in place of the status
// word, the handover tab and its box, an agent's reply under the note it answers, a reply naming no
// note after the notes, a container note's replies, and the markup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ParkBundle, ViewNode } from '../../format/src/index.ts';
import type { BoardState, ItemNote } from '../../actions/src/index.ts';
import type { CardReply, RegionState } from '../src/index.ts';
import { AWAITING, handoverMarkup, nodeState, nodeTemplate, notesMarkup, regionNote, regionState } from '../src/index.ts';

const r: ViewNode = { id: '12', n: 12, region: 'r', kind: 'question', title: 'Does the trial need a card?' };
const board = (f: Partial<BoardState> = {}): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), flags: new Set(), ...f });
const later = (notes: ItemNote[] = []) => board({ items: new Map([['12', { status: 'later', notes }]]) });
const note = (seq: number, text = 'Is this right?'): ItemNote => ({ seq, kind: 'comment', text, at: '2026-10-08T00:00:00Z', sent: true });
const reply = (seq: number, text: string, f: Partial<CardReply> = {}): CardReply => ({ seq, text, ...f });
const bundle: ParkBundle = {
  situation: 'The trial **starts** without a card.', background: 'Support asked twice.', assessment: 'Low risk.',
  recommendation: 'Ship it.', sources: ['Support thread', 'Pricing sheet'],
};

test('awaiting: the footer word reads Awaiting, the name says so, the tip is "Awaiting context"', () => {
  const st = nodeState(r, later(), undefined, false, { awaiting: true });
  assert.equal(st.statusWord, AWAITING.word);
  assert.equal(st.awaiting, true);
  assert.equal(AWAITING.tip, 'Awaiting context');
  assert.equal(st.label, 'Item 12, Question: Does the trial need a card?, Saved for later, awaiting context');
  const plain = nodeState(r, later());
  assert.equal(plain.statusWord, 'Saved for later');
  assert.equal(plain.awaiting, undefined);
  assert.equal(nodeState({ ...r, n: undefined, kind: 'topic' }, later(), undefined, false, { awaiting: true }).statusWord, '', 'a non-item has no state');
});

test('handover: the tab and the four headed sections, then the sources', () => {
  const st = nodeState(r, later(), undefined, false, { handover: bundle });
  assert.deepEqual(st.handover, {
    tab: 'Handover', label: 'Handover on item 12', box: 'Handover on item 12',
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

test('replies: each sits under the note it answers, in the order given, the latest note first', () => {
  const v = nodeState(r, later([note(20, 'one'), note(30, 'two')]), undefined, false, {
    replies: [reply(40, 'First answer', { to: 20 }), reply(41, 'Second answer', { to: 20, agent: 'Pricing chat' }), reply(50, 'On two', { to: 30 })],
  }).notes!;
  assert.deepEqual(v.entries.map((x) => [x.seq, x.replies?.map((y) => [y.seq, y.who, y.text])]), [
    [30, [[50, 'Agent reply', 'On two']]],
    [20, [[40, 'Agent reply', 'First answer'], [41, 'Agent reply · Pricing chat', 'Second answer']]],
  ]);
  assert.equal(v.orphans, undefined);
  assert.equal(v.pin!.seq, 30);
});

test('replies: a note with none carries none; a reply naming no note comes after the notes', () => {
  const v = nodeState(r, later([note(20)]), undefined, false, { replies: [reply(60, 'Also: the sheet is updated', { agent: 'Pricing chat' }), reply(61, 'To a gone note', { to: 99 })] }).notes!;
  assert.equal(v.entries[0]!.replies, undefined);
  assert.deepEqual(v.orphans!.map((x) => x.seq), [60, 61]);
  const html = notesMarkup(v);
  assert.ok(html.indexOf('data-note="20"') < html.indexOf('data-reply="60"'));
});

test('replies: with no notes at all the block still shows them, and there is no pin', () => {
  const v = nodeState(r, board(), undefined, false, { replies: [reply(70, 'Heads up')] }).notes!;
  assert.deepEqual(v.entries, []);
  assert.equal(v.pin, undefined);
  assert.equal(v.orphans!.length, 1);
  assert.equal(nodeState(r, board()).notes, undefined, 'none without notes or replies');
});

test('notesMarkup: a reply is read-only (no data-note), a tab stop with Markdown and the full-text tip', () => {
  const html = notesMarkup(nodeState(r, later([note(20)]), undefined, false, { replies: [reply(41, 'Yes: **no card** <i>', { to: 20, agent: 'Pricing chat' })] }).notes!);
  assert.match(html, /<\/div><div class="vb-node-reply" data-reply="41" tabindex="0"><span class="vb-node-note-who">Agent reply · Pricing chat<\/span>/);
  assert.equal(html.match(/data-note=/g)!.length, 1);
  assert.ok(html.includes('<strong>no card</strong> &#60;i&#62;'));
  assert.equal(html.match(/<div class="vb-tip vb-note-tip" aria-hidden="true">/g)!.length, 2);
});

test('nodeTemplate: an item gets the handover tab and box, the status tip and the three bottom tabs hidden; a non-item none', () => {
  const html = nodeTemplate(r);
  assert.match(html, /data-tab="handover" aria-haspopup="dialog" aria-expanded="false" aria-controls="vb-pop-handover-12" hidden>/);
  assert.match(html, /<div class="vb-tip vb-card-pop" data-pop="handover" id="vb-pop-handover-12" role="dialog" tabindex="0"><\/div>/);
  assert.match(html, /<span class="vb-tip vb-status-tip" aria-hidden="true"><\/span>/);
  assert.doesNotMatch(nodeTemplate({ ...r, n: undefined, kind: 'topic' }), /handover|status-tip/);
});

test('a container note: the replies that name it, oldest first; none for another note', () => {
  const n = note(184, 'Should the trial skip the card step?');
  const replies = [reply(186, 'Yes.', { to: 184, agent: 'Pricing chat' }), reply(187, 'Elsewhere', { to: 9 }), reply(188, 'No `to`')];
  assert.deepEqual(regionNote([n], false, replies)!.replies, [{ seq: 186, who: 'Agent reply · Pricing chat', text: 'Yes.' }]);
  assert.equal(regionNote([n], false)!.replies, undefined);
  const view = { title: 'B', version: 1, regions: [{ id: 'g', title: 'G', mode: 'grid' as const }], nodes: [], links: [] };
  const st: RegionState = regionState({ id: 'g', mode: 'grid' }, view as never, board({ regionNotes: new Map([['g', [n]]]) }), new Set(), undefined, new Set(), replies);
  assert.equal(st.note!.replies!.length, 1);
});
