// Ask now (D-099 3, api.md 188): an `ask` names the notes it carried and the context the agent was given. It is not
// a Send: `lastSend` and `sentHead` stay, and the board's other answers still wait for Send. An asked note is not
// unsent, the next Send does not carry it, it locks as a sent one, the one-unsent-note rule counts it as sent, and
// `check_responses` reports it with the ask and its context. Only the person asks, and only about a note of theirs on
// the board, not removed, sent or asked before.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent } from '#format';
import { readLedger, LEDGER_FORMAT } from '#format';
import type { LedgerState } from '../src/index.ts';
import { askedBy, conditionsOf, replyScope, responsesAfter, sentNotes, validateAct } from '../src/index.ts';
import { A, scene } from './ledger-v3.ts';

const unsent = (s: LedgerState) => conditionsOf(s, { board: 'b' }).filter((c) => c.kind === 'board.unsent').map((c) => c.seq);

/** The scene at v20: a note on card 1, and a ✓ on card 2, neither sent. */
function noted() {
  const l = scene();
  const note = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why this one?' });
  const check = l.act({ action: 'ack', n: 2, ver: 1 });
  return { l, note, check };
}

const ask = (s: LedgerState, f: Partial<ActEvent>): ActEvent =>
  ({ v: LEDGER_FORMAT, seq: s.seq + 1, at: '2026-11-16T10:00:00Z', by: 'person', type: 'act', action: 'ask', board: 'b', context: 'board', ...f }) as ActEvent;

test('an ask is no Send: the asked note leaves what Send carries, the other answers stay, lastSend and sentHead stay', () => {
  const { l, note, check } = noted();
  assert.deepEqual(unsent(l.state()), [check]);
  const asked = l.act({ action: 'ask', board: 'b', lines: [note], context: 'board' });
  const s = l.state();
  assert.deepEqual(askedBy(s, 'b', note), { seq: asked, context: 'board' });
  assert.deepEqual([s.lastSend.get('b'), s.sentHead.get('b')], [undefined, undefined]);
  assert.deepEqual(unsent(s), [check], 'the ✓ still waits for Send');
  assert.deepEqual([...s.unsent.get('b')!], [check]);
  assert.deepEqual([...replyScope(s, 'b', 0).cards], [2], 'the next Send carries the ✓, not the asked note');
});

test('an ask alone lights no Send', () => {
  const l = scene();
  const note = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why?' });
  l.act({ action: 'ask', board: 'b', lines: [note], context: 'node' });
  assert.deepEqual(unsent(l.state()), []);
});

test('the asked note is locked as a sent one, and the card can take a new note', () => {
  const { l, note } = noted();
  l.act({ action: 'ask', board: 'b', lines: [note], context: 'board' });
  const s = l.state();
  assert.deepEqual(sentNotes(s, 'b', s.items.get(1)!.notes).map((x) => [x.seq, x.sent, x.locked]), [[note, true, true]]);
  const edit = { v: LEDGER_FORMAT, seq: s.seq + 1, at: '2026-11-16T10:00:00Z', by: 'person', type: 'act', action: 'note-edit', id: 1, note, text: 'Edited' } as ActEvent;
  assert.match(validateAct(edit, s, 'b').join(), /was sent to the agent/);
  const again = { ...edit, action: 'comment', ver: 1, text: 'And another thing.', note: undefined } as ActEvent;
  assert.deepEqual(validateAct(again, s, 'b'), [], 'the one-unsent-note rule counts the asked note as sent');
});

test('check_responses reports the asked note as it reports a sent one, and the ask with its context', () => {
  const { l, note } = noted();
  const asked = l.act({ action: 'ask', board: 'b', lines: [note], context: 'board' });
  const out = responsesAfter(l.state(), 'b', 0, A);
  assert.ok(out.some((e) => e.seq === note && e.action === 'comment'));
  assert.deepEqual(out.filter((e) => e.action === 'ask').map((e) => [e.seq, e.lines, e.context]), [[asked, [note], 'board']]);
});

test('validateAct: only the person asks, about a note of theirs on the board, not removed, sent or asked before', () => {
  const { l, note, check } = noted();
  const other = l.act({ action: 'comment', n: 4, ver: 1, text: 'On b2.' });
  const theirs = l.act({ action: 'comment', board: 'b', region: 'q', text: 'Is q right?', person: 'Sam' });
  const gone = l.act({ action: 'comment', n: 2, ver: 1, text: 'Never mind.' });
  l.act({ action: 'note-remove', n: 2, note: gone });
  const s = l.state();
  assert.deepEqual(validateAct(ask(s, { lines: [note] }), s, 'b'), []);
  const refused = (f: Partial<ActEvent>, board = 'b') => validateAct(ask(s, f), s, board).join(' ');
  assert.match(refused({ lines: [note], by: 'agent', agent: A }), /only the person/);
  assert.match(refused({ lines: [check] }), /is not a note/);
  assert.match(refused({ lines: [other] }), /is on board "b2", not "b"/);
  assert.match(refused({ lines: [theirs] }), /is not yours/);
  assert.match(refused({ lines: [gone] }), /was removed/);
  assert.match(refused({ lines: [note], board: 'b2' }, 'b'), /names board "b2"/);
  l.act({ action: 'ask', board: 'b', lines: [note], context: 'board' });
  const later = l.state();
  assert.match(validateAct(ask(later, { lines: [note] }), later, 'b').join(), /already asked about/);
  const fresh = l.act({ action: 'comment', board: 'b', region: 'r', text: 'And r?' });
  l.act({ action: 'send', board: 'b' });
  const sent = l.state();
  assert.match(validateAct(ask(sent, { lines: [fresh] }), sent, 'b').join(), /already sent to the agent/);
});

test('the ledger: an ask names lines it already holds', () => {
  const { l, note } = noted();
  const line = (lines: number[]) => JSON.stringify({ v: LEDGER_FORMAT, seq: l.seq + 1, at: '2026-11-16T10:00:00Z', by: 'person', type: 'act', action: 'ask', board: 'b', lines, context: 'session' });
  assert.deepEqual(readLedger([...l.lines, line([note])]).problems, []);
  assert.match(readLedger([...l.lines, line([note, l.seq + 5])]).problems.join(), /lines: each a line before this one/);
});
