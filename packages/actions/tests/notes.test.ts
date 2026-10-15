// A person's note on a card (2e_FE_01, api.md 58-61): one note not yet sent per card, editable
// and removable until a Send, history after it. Edits and removals are new acts naming the note
// by the `seq` of the act that made it (D-017: the ledger stays append-only). Every read the agent
// has shows a note's latest text, and a removed note is gone from all of them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent } from '../../format/src/index.ts';
import { boardView, eventProblems } from '../../format/src/index.ts';
import {
  boardState, nodeDetail, openItems, pendingItems, replyText, responsesAfter, validateAct,
} from '../src/index.ts';
import { A, scene } from './ledger-v3.ts';

/** The shared scene, with v4 lines from here on, and a comment on item 1. */
function withNote(text = 'Why per seat?') {
  const l = scene();
  l.v = 4;
  const note = l.act({ action: 'comment', n: 1, ver: 1, text });
  return { l, note };
}

/** A candidate person act, as the server would stamp it, for `validateAct`. */
const next = (l: ReturnType<typeof scene>, f: Partial<ActEvent>): ActEvent =>
  ({ v: 4, seq: l.seq + 1, at: '2026-10-05T10:00:00Z', by: 'person', type: 'act', action: 'ack', ...f } as ActEvent);

const notesOn = (l: ReturnType<typeof scene>, n = 1) => boardState(l.state(), 'b').items.get(String(n))?.notes ?? [];

test('shape: note-edit needs n, note and text; note-remove needs n and note; kind is comment or context', () => {
  const base = { v: 4, seq: 9, at: '2026-10-05T10:00:00Z', by: 'person', type: 'act' };
  assert.deepEqual(eventProblems({ ...base, action: 'note-edit', n: 1, note: 5, text: 'New' }), []);
  assert.deepEqual(eventProblems({ ...base, action: 'note-edit', n: 1, note: 5, text: 'New', kind: 'context' }), []);
  assert.deepEqual(eventProblems({ ...base, action: 'note-remove', n: 1, note: 5 }), []);
  assert.ok(eventProblems({ ...base, action: 'note-edit', n: 1, note: 5 }).length, 'no text');
  assert.ok(eventProblems({ ...base, action: 'note-edit', n: 1, text: 'x' }).length, 'no note');
  assert.ok(eventProblems({ ...base, action: 'note-remove', note: 5 }).length, 'no n');
  assert.ok(eventProblems({ ...base, action: 'note-edit', n: 1, note: 5, text: 'x', kind: 'ack' }).length, 'bad kind');
});

test('edit before Send: the note keeps its seq and shows the latest text', () => {
  const { l, note } = withNote();
  assert.deepEqual(validateAct(next(l, { action: 'note-edit', id: 1, note, text: 'Why per seat, not per use?' }), l.state(), 'b'), []);
  l.act({ action: 'note-edit', n: 1, note, text: 'Why per seat, not per use?' });
  assert.deepEqual(notesOn(l).map((x) => [x.seq, x.kind, x.text]), [[note, 'comment', 'Why per seat, not per use?']]);
  assert.equal(boardState(l.state(), 'b').items.get('1')!.status, 'commented');
});

test('an edit with a kind changes what the note asks for; either kind is a note (D-045)', () => {
  const { l, note } = withNote();
  l.act({ action: 'note-edit', n: 1, note, text: 'Explain the seat price.', kind: 'context' });
  const s = l.state();
  assert.deepEqual(notesOn(l).map((x) => x.kind), ['context']);
  assert.equal(boardState(s, 'b').items.get('1')!.status, 'commented');
  assert.deepEqual(pendingItems(s, 'b'), [{ n: 1, ask: { kind: 'context', seq: note } }]);
  l.act({ action: 'note-edit', n: 1, note, text: 'Why per seat?', kind: 'comment' });
  assert.equal(boardState(l.state(), 'b').items.get('1')!.status, 'commented', 'still a note');
});

test('edits never create a second owed item; the owed ask is the note that was edited', () => {
  const { l, note } = withNote();
  l.act({ action: 'note-edit', n: 1, note, text: 'Second try' });
  l.act({ action: 'note-edit', n: 1, note, text: 'Third try' });
  const s = l.state();
  assert.deepEqual(pendingItems(s, 'b'), [{ n: 1, ask: { kind: 'comment', seq: note } }]);
  assert.deepEqual(openItems(s, 'b').filter((x) => x.pending).map((x) => [x.n, x.pending]), [[1, 'comment']]);
  l.agent(A, { type: 'reply', n: 1, text: 'Because.', to: note });
  assert.deepEqual(pendingItems(l.state(), 'b'), [], 'a reply naming the note answers it, whatever its text now');
});

test('the numbered reply and show_node use the latest text', () => {
  const { l, note } = withNote();
  l.act({ action: 'note-edit', n: 1, note, text: 'Edited words' });
  const s = l.state();
  const reply = replyText(boardView(s, 'b'), boardState(s, 'b'));
  assert.match(reply, /^1 \(question\): comment: Edited words$/m);
  assert.doesNotMatch(reply, /Why per seat/);
  assert.deepEqual(nodeDetail(s, 1)!.notes.map((x) => [x.seq, x.text]), [[note, 'Edited words']]);
});

test('remove before Send: the note is gone from every read and owes nothing', () => {
  const { l, note } = withNote();
  const cursor = l.seq - 1;
  assert.deepEqual(validateAct(next(l, { action: 'note-remove', id: 1, note }), l.state(), 'b'), []);
  l.act({ action: 'note-remove', n: 1, note });
  const s = l.state();
  assert.deepEqual(notesOn(l), []);
  assert.equal(boardState(s, 'b').items.get('1')!.status, 'open', 'as if the comment was never made');
  assert.deepEqual(nodeDetail(s, 1)!.notes, []);
  assert.deepEqual(pendingItems(s, 'b'), []);
  assert.equal(openItems(s, 'b').find((x) => x.n === 1)!.pending, undefined);
  assert.doesNotMatch(replyText(boardView(s, 'b'), boardState(s, 'b')), /^1 /m);
  assert.deepEqual(responsesAfter(s, 'b', cursor), [], 'a note removed before the agent could read it never shows');
});

test('removing the latest note hands the owed ask back to the one before it', () => {
  const { l, note: first } = withNote('First');
  l.act({ action: 'send', board: 'b' });
  const second = l.act({ action: 'context', n: 1, ver: 1, text: 'Second' });
  assert.deepEqual(pendingItems(l.state(), 'b'), [{ n: 1, ask: { kind: 'context', seq: second } }]);
  l.act({ action: 'note-remove', n: 1, note: second });
  const s = l.state();
  assert.deepEqual(pendingItems(s, 'b'), [{ n: 1, ask: { kind: 'comment', seq: first } }]);
  assert.equal(boardState(s, 'b').items.get('1')!.status, 'commented');
});

test('after Send the note is history: edit and remove are refused; it is marked sent', () => {
  const { l, note } = withNote();
  l.act({ action: 'send', board: 'b' });
  const s = l.state();
  assert.deepEqual(notesOn(l).map((x) => x.sent), [true]);
  for (const f of [{ action: 'note-edit', text: 'Late' }, { action: 'note-remove' }] as const) {
    const p = validateAct(next(l, { ...f, id: 1, note }), s, 'b');
    assert.ok(p.some((x) => x.includes('sent')), `${f.action}: ${p.join('; ')}`);
  }
});

test('a note not yet sent is unmarked, and the pin order is the order the notes were made', () => {
  const { l, note } = withNote('One');
  l.act({ action: 'send', board: 'b' });
  const two = l.act({ action: 'comment', n: 1, ver: 1, text: 'Two' });
  const notes = notesOn(l);
  assert.deepEqual(notes.map((x) => [x.seq, x.sent ?? false]), [[note, true], [two, false]]);
});

test('one note not yet sent per card: a second comment or context with text is refused until Send', () => {
  const { l } = withNote();
  for (const action of ['comment', 'context'] as const) {
    const p = validateAct(next(l, { action, id: 1, ver: 1, text: 'Another' }), l.state(), 'b');
    assert.ok(p.some((x) => x.includes('note-edit')), `${action}: ${p.join('; ')}`);
  }
  assert.deepEqual(validateAct(next(l, { action: 'context', id: 1, ver: 1 }), l.state(), 'b'), [],
    'asking for context without words adds no note');
  l.act({ action: 'send', board: 'b' });
  assert.deepEqual(validateAct(next(l, { action: 'comment', id: 1, ver: 1, text: 'Another' }), l.state(), 'b'), []);
});

test('edit and remove name a live note of the person on that node', () => {
  const { l, note } = withNote();
  const ack = l.act({ action: 'ack', n: 1, ver: 1 });
  const s = l.state();
  const refused = (f: Partial<ActEvent>, word: string) => {
    const p = validateAct(next(l, { action: 'note-edit', id: 1, note, text: 'x', ...f }), s, 'b');
    assert.ok(p.some((x) => x.includes(word)), `${JSON.stringify(f)}: ${p.join('; ')}`);
  };
  refused({ note: 999 }, 'not a note');
  refused({ note: ack }, 'not a note');
  refused({ id: 2 }, 'node 1');
  refused({ person: 'Sam' }, 'not yours');
  l.act({ action: 'note-remove', n: 1, note });
  const p = validateAct(next(l, { action: 'note-remove', id: 1, note }), l.state(), 'b');
  assert.ok(p.some((x) => x.includes('removed')), p.join('; '));
});

test('check_responses: a note shows once with its latest text, and again when edited after the cursor', () => {
  const { l, note } = withNote();
  l.act({ action: 'note-edit', n: 1, note, text: 'Edited' });
  let got = responsesAfter(l.state(), 'b', 0);
  assert.deepEqual(got.filter((e) => e.id === 1).map((e) => [e.seq, e.action, e.text]), [[note, 'comment', 'Edited']]);
  const cursor = l.seq;
  l.act({ action: 'note-edit', n: 1, note, text: 'Edited again', kind: 'context' });
  got = responsesAfter(l.state(), 'b', cursor);
  assert.deepEqual(got.map((e) => [e.seq, e.action, e.text]), [[note, 'context', 'Edited again']]);
  const cursor2 = l.seq;
  const removed = l.act({ action: 'note-remove', n: 1, note });
  got = responsesAfter(l.state(), 'b', cursor2);
  assert.deepEqual(got.map((e) => [e.seq, e.action, e.note]), [[removed, 'note-remove', note]],
    'a removal shows only for a note the agent may already have read');
});
