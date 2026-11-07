// A Send counts only what went (point 377): a `send` line's `head` is the ledger line its answers were
// read through (`resolve('answers')`), and only those count as sent. The board's watermark (`sentHead`)
// is the highest `head` (or, on a line with none, the Send's own `seq`), never lowered: what the answers
// chip, `board.unsent` and a note's history count from. Old lines fold as they always did.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LedgerState } from '../src/index.ts';
import { acksRead, answersChip, conditionsOf, resolveChip, sendHead, sentAfter } from '../src/index.ts';
import { B, scene } from './ledger-v3.ts';

const unsent = (s: LedgerState) => conditionsOf(s, { board: 'b' }).filter((c) => c.kind === 'board.unsent').map((c) => c.seq);
const v19 = () => { const l = scene(); l.v = 19; return l; };

test('a Send with no head covers every answer up to its own line, as every Send before v19 did', () => {
  const l = scene();
  l.v = 18;
  l.act({ action: 'ack', n: 1, ver: 1 });
  const send = l.act({ action: 'send', board: 'b' });
  const s = l.state();
  assert.equal(s.sentHead.get('b'), send);
  assert.equal(s.lastSend.get('b'), send);
  assert.deepEqual(unsent(s), []);
  assert.equal(answersChip(s, 'b'), null);
});

test('watermark: the Send acknowledges answers through its head; an answer after the read stays for the next round', () => {
  const l = v19();
  l.act({ action: 'ack', n: 1, ver: 1 });
  const read = resolveChip(l.state(), 'answers', { board: 'b', since: 0 });
  assert.ok(!('refused' in read) && read.ack.head === l.seq && read.ack.board === 'b', 'resolve acknowledges the board and the line it read through');
  const late = l.act({ action: 'drop', n: 2, ver: 1 });
  l.act({ action: 'send', board: 'b', ...sendHead(l.state(), 'b', acksRead(['refused' in read ? {} : read.ack], 'b')) });
  const s = l.state();
  assert.equal(s.sentHead.get('b'), late - 1);
  assert.deepEqual(unsent(s), [late], 'the late ✗ is unsent');
  const chip = answersChip(s, 'b')!;
  assert.equal(chip.ref.since, late - 1);
  assert.match(chip.preview!, /^2 \(question\): ✗$/m);
  assert.doesNotMatch(chip.preview!, /^1 \(/m, 'the ✓ that went does not go again');
});

test('a mark changed after the read counts against what was read: ✓ went, then cleared, the clear is owed', () => {
  const l = v19();
  l.act({ action: 'ack', n: 1, ver: 1 });
  const head = l.seq;
  const clear = l.act({ action: 'reopen', n: 1, ver: 1 });
  assert.deepEqual(unsent(l.state()), [], 'before the Send: ✓ then cleared is nothing (D-045 ruling 9)');
  l.act({ action: 'send', board: 'b', head });
  assert.deepEqual(unsent(l.state()), [clear], 'after it: the agent was told ✓, so the clear is news');
});

test('an answer after the read on a card that has since left the board is not owed', () => {
  const l = v19();
  l.act({ action: 'ack', n: 1, ver: 1 });
  const head = l.seq;
  l.act({ action: 'drop', n: 2, ver: 1 });
  l.agent(B, { type: 'retire', board: 'b', cards: [2] });
  l.act({ action: 'send', board: 'b', head });
  assert.deepEqual(unsent(l.state()), []);
});

test('removed chip: a Send whose head is the watermark acknowledges nothing; the answers stay unsent', () => {
  const l = v19();
  const ack = l.act({ action: 'ack', n: 1, ver: 1 });
  const before = l.state();
  const chip = answersChip(before, 'b')!;
  l.act({ action: 'send', board: 'b', ...sendHead(before, 'b', null) });
  const s = l.state();
  assert.equal(s.sentHead.get('b') ?? 0, 0);
  assert.deepEqual(unsent(s), [ack]);
  assert.deepEqual(answersChip(s, 'b')!.ref, chip.ref, 'the same chip comes back for the next message');
});

test('a retry never double-counts: a stale or repeated head never moves the watermark back', () => {
  const l = v19();
  l.act({ action: 'ack', n: 1, ver: 1 });
  const first = l.seq;
  l.act({ action: 'drop', n: 2, ver: 1 });
  const second = l.seq;
  l.act({ action: 'send', board: 'b', head: second });
  l.act({ action: 'send', board: 'b', head: first });
  l.act({ action: 'send', board: 'b', head: second });
  const s = l.state();
  assert.equal(s.sentHead.get('b'), second);
  assert.deepEqual(unsent(s), []);
});

test('rounds: answer, Send, answer while the bot works, Send again: each round carries its own; a note is history once its round went', () => {
  const l = v19();
  const note1 = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why?' });
  const read1 = l.seq;
  const note2 = l.act({ action: 'comment', n: 2, ver: 1, text: 'And this?' });
  l.act({ action: 'send', board: 'b', head: read1 });
  let s = l.state();
  assert.equal(sentAfter(s, 'b', note1), true, 'round 1 went: its note is history');
  assert.equal(sentAfter(s, 'b', note2), false, 'made after the read: still the person\'s to change');
  const round2 = resolveChip(s, 'answers', answersChip(s, 'b')!.ref);
  assert.ok(!('refused' in round2));
  assert.match(round2.text, /And this\?/);
  assert.doesNotMatch(round2.text, /Why\?/);
  const ack = l.act({ action: 'ack', n: 3, ver: 1 });
  l.act({ action: 'send', board: 'b', head: ack });
  s = l.state();
  assert.equal(sentAfter(s, 'b', note2), true);
  assert.deepEqual(unsent(s), []);
  assert.equal(answersChip(s, 'b'), null);
});

test('sendHead: what the board records for what the host says went', () => {
  const l = v19();
  l.act({ action: 'ack', n: 1, ver: 1 });
  const s = l.state();
  assert.deepEqual(sendHead(s, 'b', undefined), {}, 'left out: no chat carried it, the Send covers its own line');
  assert.deepEqual(sendHead(s, 'b', null), { head: 0 }, 'null: nothing new acknowledged');
  assert.deepEqual(sendHead(s, 'b', { head: 7 }), { head: 7 });
  assert.deepEqual(sendHead(s, 'b', { head: 'x' } as never), { head: 0 }, 'a read with no head acknowledges nothing');
});

test('acksRead: what a host\'s record(acks) says went for the board (plugin.md § The chat)', () => {
  assert.equal(acksRead(null, 'b'), undefined, 'null, a host with no chat: the Send covers every answer up to its own line');
  assert.equal(acksRead([], 'b'), null, '[]: nothing new acknowledged');
  assert.deepEqual(acksRead([{ board: 'c', head: 3 }, { board: 'b', head: 5, extra: 'kept out' }, { board: 'b', head: 9 }], 'b'), { head: 5 }, 'the first ack of this board; another board\'s passed over');
  assert.equal(acksRead([{ board: 'b', head: -1 }, { board: 'b', head: 1.5 }, { board: 'b', head: '4' }, { head: 4 }], 'b'), null, 'a head that names no line, or no board: passed over');
});
