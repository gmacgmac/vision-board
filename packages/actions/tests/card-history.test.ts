// A card's history (card-polish BE_02): one row per thing that happened to the card, newest first,
// time and one line. No note, reply, reason or handover words are ever copied, and the person's
// private marks and seen lines never show. Lines are matched by the card's identity (D-041): on
// board b2 identity 4 is card 1, and its history is its own. The page's per-card times (card-times.ts)
// say the same. Fixture words are invented.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LedgerEvent } from '#format';
import { readLedger } from '#format';
import type { HistoryRow } from '../src/index.ts';
import { cardHistory, cardTimeRows, foldLedger, HISTORY_KINDS, TIME_KINDS } from '../src/index.ts';
import type { Ledger } from './ledger-v3.ts';
import { A, B, scene } from './ledger-v3.ts';

const NOTE = 'Moonlit walrus parade';
const EDITED = 'Moonlit walrus parade, revised';
const GROUP = 'Velvet anchor question';
const REPLY = 'Copper lantern answer';
const REASON = 'Saffron kettle reason';
const BUNDLE = { situation: 'Quiet orchard', background: 'Hollow drum', assessment: 'Paper comet', recommendation: 'Tin violin' };
const WORDS = [NOTE, EDITED, GROUP, REPLY, REASON, ...Object.values(BUNDLE)];

/** The scene at v18 with app card 5 (`calculator`) on board b. */
function base(): Ledger {
  const l = scene();
  l.v = 18;
  l.agent(A, { type: 'node', board: 'b', n: 5, ver: 1, node: { region: 'r', kind: 'app', title: 'Calculator', app: { id: 'calculator' } } });
  return l;
}

const events = (l: Ledger): LedgerEvent[] => {
  const read = readLedger(l.lines);
  assert.deepEqual(read.problems, []);
  return read.events;
};

const said = (rows: HistoryRow[]) => rows.map((r) => [r.kind, r.words]);

/** Every kind but the app's on card 1, oldest first; returns the seqs a test names. */
function everything(l: Ledger) {
  const note = l.act({ action: 'comment', n: 1, ver: 1, text: NOTE });
  l.act({ action: 'context', n: 1, ver: 1 });
  const group = l.act({ action: 'comment', nodes: [1, 2], text: GROUP });
  l.act({ action: 'note-edit', n: 1, note, text: EDITED });
  const reply = l.agent(A, { type: 'reply', n: 1, to: note, text: REPLY });
  l.agent(A, { type: 'node', board: 'b', n: 1, ver: 2, node: { region: 'r', kind: 'question', title: 'Node 1, redrawn' } });
  l.act({ action: 'ack', n: 1, ver: 2 });
  l.act({ action: 'drop', n: 1, ver: 2 });
  l.act({ action: 'reopen', n: 1, ver: 2 });
  l.act({ action: 'later', n: 1, ver: 2 });
  l.agent(A, { type: 'park', n: 1, bundle: BUNDLE });
  l.act({ action: 'size', n: 1, size: 's' });
  l.act({ action: 'size', n: 1, size: 'auto' });
  l.act({ action: 'move', n: 1, region: 'q' });
  l.act({ action: 'move', n: 1, region: 'later' });
  l.act({ action: 'pin', n: 1, x: 10, y: 20 });
  l.act({ action: 'unpin', n: 1 });
  const drop = l.agent(A, { type: 'propose', n: 1, ver: 2, action: 'drop', reason: REASON });
  l.act({ action: 'drop', n: 1, ver: 2, proposal: drop });
  const ack = l.agent(B, { type: 'propose', n: 1, ver: 2, action: 'ack', reason: REASON });
  l.act({ action: 'reject', n: 1, proposal: ack });
  const marks = [
    l.act({ action: 'flag', n: 1 }), l.act({ action: 'notes-hide', n: 1 }),
    l.act({ action: 'unflag', n: 1 }), l.act({ action: 'notes-show', n: 1 }), l.seen(1, 2),
  ];
  l.agent(A, { type: 'retire', board: 'b', cards: [1] });
  return { note, group, reply, marks };
}

test('every kind on one card, newest first, each in one line', () => {
  const l = base();
  everything(l);
  const lines = events(l);
  const rows = cardHistory(lines, 1);
  assert.deepEqual(said(rows), [
    ['removed', 'Agent removed it'],
    ['proposal-answered', 'You turned down the proposal'],
    ['proposed', 'Agent proposed ✓'],
    ['proposal-answered', 'You accepted the proposal (✗)'],
    ['proposed', 'Agent proposed ✗'],
    ['reset', 'You reset its place'],
    ['pinned', 'You placed it'],
    ['moved', 'You moved it to Later'],
    ['moved', 'You moved it to another container'],
    ['size', 'You set its size back to automatic'],
    ['size', 'You set its size to S'],
    ['parked', 'Agent parked it'],
    ['later', 'You saved it for later'],
    ['reopened', 'You reopened it'],
    ['cross', 'You marked it ✗'],
    ['check', 'You marked it ✓'],
    ['drawn', 'Agent drew v2'],
    ['replied', 'Agent replied to note 1'],
    ['note-edited', 'You edited note 1'],
    ['note-sent', 'You sent note 2 on 2 cards'],
    ['context', 'You asked for more context'],
    ['note-sent', 'You sent note 1'],
    ['drawn', 'Agent drew v1'],
  ]);
  assert.ok(rows.every((r, i) => i === 0 || rows[i - 1]!.seq > r.seq), 'newest first');
  const at = new Map(lines.map((e) => [e.seq, e.at]));
  assert.ok(rows.every((r) => r.at === at.get(r.seq)), 'each row carries its line\'s time');
  assert.ok(rows.every((r) => (r.who === 'agent') === (r.agent !== undefined)), 'only an agent row names an agent');
  assert.deepEqual(new Set(rows.filter((r) => r.who === 'agent').map((r) => r.agent)), new Set([A, B]), 'by id with no labels');
});

test('every kind the model names is drawn by some line, and the app\'s allow and stop show on its card', () => {
  const l = base();
  everything(l);
  l.act({ action: 'app-allow', app: 'calculator', hash: 'a'.repeat(64) });
  l.act({ action: 'app-allow', app: 'converter', hash: 'a'.repeat(64) });
  l.act({ action: 'app-revoke', app: 'calculator' });
  l.act({ action: 'note-remove', n: 5, note: l.act({ action: 'comment', n: 5, ver: 1, text: NOTE }) });
  const app = cardHistory(events(l), 5);
  assert.deepEqual(said(app), [
    ['note-removed', 'You removed a note'], ['note-sent', 'You sent a note'],
    ['app-stopped', 'You stopped the app'], ['app-allowed', 'You allowed the app'], ['drawn', 'Agent drew v1'],
  ]);
  const seen = new Set([...cardHistory(events(l), 1), ...app].map((r) => r.kind));
  assert.deepEqual(HISTORY_KINDS.filter((k) => !seen.has(k)), []);
  assert.equal(cardHistory(events(l), 1).some((r) => r.kind.startsWith('app-')), false, 'not on a card without the app');
});

test('an allow before the card names the app is not on it', () => {
  const l = scene();
  l.v = 18;
  l.act({ action: 'app-allow', app: 'calculator', hash: 'a'.repeat(64) });
  l.agent(A, { type: 'node', board: 'b', n: 5, ver: 1, node: { region: 'r', kind: 'app', title: 'Calculator', app: { id: 'calculator' } } });
  assert.deepEqual(said(cardHistory(events(l), 5)), [['drawn', 'Agent drew v1']]);
});

test('no row copies a note, reply, reason or handover, and no private mark or seen line shows', () => {
  const l = base();
  const { marks } = everything(l);
  const rows = cardHistory(events(l), 1);
  const all = JSON.stringify(rows);
  for (const w of WORDS) assert.equal(all.includes(w), false, w);
  for (const seq of marks) assert.equal(rows.some((r) => r.seq === seq), false, `line ${seq}`);
});

test('note and reply rows carry the seq the box links to; the agent is named by its label when given', () => {
  const l = base();
  const { note, group, reply } = everything(l);
  const rows = cardHistory(events(l), 1, foldLedger(events(l)).agents);
  const of = (kind: string) => rows.filter((r) => r.kind === kind).map(({ note: n, reply: r }) => ({ n, r }));
  assert.deepEqual(of('note-sent'), [{ n: group, r: undefined }, { n: note, r: undefined }]);
  assert.deepEqual(of('note-edited'), [{ n: note, r: undefined }]);
  assert.deepEqual(of('replied'), [{ n: note, r: reply }]);
  assert.deepEqual(of('context'), [{ n: undefined, r: undefined }], 'More context with no words is no note');
  assert.equal(rows.find((r) => r.kind === 'drawn')!.agent, 'Pricing chat');
  assert.equal(rows.find((r) => r.kind === 'proposed' && r.words.endsWith('✓'))!.agent, 'Review chat');
});

test('a removed note: its rows say "a note" and link nowhere; the notes after it number as the card does', () => {
  const l = base();
  const first = l.act({ action: 'comment', n: 1, ver: 1, text: NOTE });
  const second = l.act({ action: 'comment', n: 1, ver: 1, text: GROUP });
  l.agent(A, { type: 'reply', n: 1, to: first, text: REPLY });
  l.act({ action: 'note-remove', n: 1, note: first });
  const rows = cardHistory(events(l), 1);
  assert.deepEqual(said(rows), [
    ['note-removed', 'You removed a note'],
    ['replied', 'Agent replied to a note'],
    ['note-sent', 'You sent note 1'],
    ['note-sent', 'You sent a note'],
    ['drawn', 'Agent drew v1'],
  ]);
  assert.deepEqual(rows.filter((r) => r.note !== undefined).map((r) => r.note), [second]);
  const notes = foldLedger(events(l)).items.get(1)!.notes;
  assert.deepEqual(notes.map((x) => x.seq), [second], 'the card numbers the same notes');
});

test('a group note shows on each card it names, its edit too, whichever card the edit line names', () => {
  const l = base();
  const group = l.act({ action: 'comment', nodes: [1, 2], text: GROUP });
  l.act({ action: 'note-edit', n: 1, note: group, text: EDITED });
  for (const id of [1, 2]) {
    assert.deepEqual(said(cardHistory(events(l), id)).slice(0, 2), [['note-edited', 'You edited note 1'], ['note-sent', 'You sent note 1 on 2 cards']], `card ${id}`);
  }
  assert.equal(cardHistory(events(l), 3).length, 1, 'not on a card it does not name');
});

test('a card is its identity: identity 4 is card 1 on b2, and each keeps its own history', () => {
  const l = base();
  l.act({ action: 'ack', n: 4, ver: 1 });
  l.act({ action: 'drop', n: 1, ver: 1 });
  const lines = events(l);
  assert.deepEqual(said(cardHistory(lines, 4)), [['check', 'You marked it ✓'], ['drawn', 'Agent drew v1']]);
  assert.deepEqual(said(cardHistory(lines, 1)), [['cross', 'You marked it ✗'], ['drawn', 'Agent drew v1']]);
  const own = lines.filter((e) => 'id' in e && e.id === 4);
  assert.deepEqual(cardHistory(own, 4), cardHistory(lines, 4), 'the card\'s own lines give the same history');
});

// The page's per-card times (card-polish FE_03): folded with the ledger, the history box's few kinds
// only, in `cardHistory`'s words, so the two never disagree; no words and no private mark kept.
const boxRows = (lines: LedgerEvent[], id: number) => {
  const s = foldLedger(lines);
  return cardHistory(lines, id, s.agents).filter((r) => TIME_KINDS.has(r.kind));
};

test('card times: the box\'s kinds only, newest first, as cardHistory says them, on every card a line names', () => {
  const l = base();
  everything(l);
  l.act({ action: 'app-allow', app: 'calculator', hash: 'a'.repeat(64) });
  l.act({ action: 'app-revoke', app: 'calculator' });
  const lines = events(l);
  const s = foldLedger(lines);
  for (const id of [1, 2, 5]) assert.deepEqual(cardTimeRows(s, id), boxRows(lines, id), `card ${id}`);
  assert.deepEqual(cardTimeRows(s, 1).map((r) => r.kind), ['reopened', 'cross', 'check', 'drawn', 'replied', 'note-sent', 'note-sent', 'drawn']);
  assert.deepEqual(said(cardTimeRows(s, 5)), [['app-stopped', 'You stopped the app'], ['app-allowed', 'You allowed the app'], ['drawn', 'Agent drew v1']]);
  assert.deepEqual([...TIME_KINDS].sort(), ['app-allowed', 'app-stopped', 'check', 'cross', 'drawn', 'note-sent', 'reopened', 'replied']);
});

test('card times keep no words and no private mark, and a removed note numbers as the card does', () => {
  const l = base();
  const { marks } = everything(l);
  const first = l.act({ action: 'comment', n: 3, ver: 1, text: NOTE });
  l.act({ action: 'comment', n: 3, ver: 1, text: GROUP });
  l.agent(A, { type: 'reply', n: 3, to: first, text: REPLY });
  l.act({ action: 'note-remove', n: 3, note: first });
  const lines = events(l);
  const s = foldLedger(lines);
  const kept = JSON.stringify([...s.times]);
  for (const w of WORDS) assert.equal(kept.includes(w), false, w);
  assert.equal([...s.times.values()].flat().some((t) => marks.includes(t.seq)), false, 'no private mark or seen');
  assert.deepEqual(said(cardTimeRows(s, 3)), [['replied', 'Agent replied to a note'], ['note-sent', 'You sent note 1'], ['note-sent', 'You sent a note'], ['drawn', 'Agent drew v1']]);
  assert.deepEqual(cardTimeRows(s, 3), boxRows(lines, 3));
});
