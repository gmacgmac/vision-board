// One note on a group of cards (3_FE_02 rulings 3-4, api.md 62-65): a `comment` or `context` act
// may carry `nodes` (two or more item numbers on one board) in place of `n`. It is ONE note under
// its own `seq`, shown on every card it names, edited or removed from any of them, and the agent
// sees it once with all its numbers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent } from '#format';
import { boardView, eventProblems, readLedger } from '#format';
import {
  boardState, nodeDetail, pendingItems, replyText, responsesAfter, validateAct,
} from '../src/index.ts';
import { A, B, scene } from './ledger-v3.ts';

const AT = '2026-10-05T10:00:00Z';
const base = { v: 5, seq: 9, at: AT, by: 'person', type: 'act' };

/** The shared scene with v5 lines from here on; items 1 (region r) and 2 (region q) on board b. */
function withGroup(text = 'Same price question on both') {
  const l = scene();
  l.v = 5;
  const note = l.act({ action: 'comment', nodes: [1, 2], text });
  return { l, note };
}

const next = (l: ReturnType<typeof scene>, f: Partial<ActEvent>): ActEvent =>
  ({ v: 5, seq: l.seq + 1, at: AT, by: 'person', type: 'act', action: 'ack', ...f } as ActEvent);
const notesOn = (l: ReturnType<typeof scene>, n: number) => boardState(l.state(), 'b').items.get(String(n))?.notes ?? [];

test('shape: comment or context with nodes in place of n and ver; two or more distinct numbers', () => {
  assert.deepEqual(eventProblems({ ...base, action: 'comment', nodes: [1, 2], text: 'Both' }), []);
  assert.deepEqual(eventProblems({ ...base, action: 'context', nodes: [1, 2, 3], text: 'Explain' }), []);
  const refused: [string, object][] = [
    ['nodes and n', { action: 'comment', nodes: [1, 2], n: 1, text: 'x' }],
    ['nodes and ver', { action: 'comment', nodes: [1, 2], ver: 1, text: 'x' }],
    ['one node', { action: 'comment', nodes: [1], text: 'x' }],
    ['a repeated node', { action: 'comment', nodes: [1, 1], text: 'x' }],
    ['a node 0', { action: 'comment', nodes: [0, 1], text: 'x' }],
    ['on an ack', { action: 'ack', nodes: [1, 2] }],
    ['a context without words', { action: 'context', nodes: [1, 2] }],
    ['a comment without words', { action: 'comment', nodes: [1, 2] }],
  ];
  for (const [name, f] of refused) assert.ok(eventProblems({ ...base, ...f }).length, name);
});

test('context: every named node exists; the ledger refuses an unknown one', () => {
  const l = scene();
  l.v = 5;
  l.act({ action: 'comment', nodes: [1, 99], text: 'x' });
  assert.ok(readLedger(l.lines).problems.some((p) => p.includes('unknown node 99')));
});

test('validateAct: items on one board, the board the act was sent to', () => {
  const { l } = withGroup();
  const s = l.state();
  assert.deepEqual(validateAct(next(l, { action: 'comment', nodes: [1, 3], text: 'Again' }), s, 'b'), []);
  const refused = (f: Partial<ActEvent>, word: string, board = 'b') => {
    const p = validateAct(next(l, { action: 'comment', text: 'x', ...f }), s, board);
    assert.ok(p.some((x) => x.startsWith('nodes') && x.includes(word)), `${JSON.stringify(f)}: ${p.join('; ')}`);
  };
  refused({ nodes: [1, 4] }, 'one board');
  refused({ nodes: [1, 2] }, 'board "b"', 'b2');
  l.agent(A, { type: 'node', board: 'b', n: 5, ver: 1, node: { region: 'r', kind: 'note', title: 'Plain' } });
  // Any cards, any kinds: the kind decides, and every kind takes a comment (api.md 118).
  assert.deepEqual(validateAct(next(l, { action: 'comment', nodes: [1, 5], text: 'x' }), l.state(), 'b'), []);
});

test('one note under one seq, on every card it names; each card reads commented', () => {
  const { l, note } = withGroup();
  const s = l.state();
  for (const n of [1, 2]) {
    assert.deepEqual(notesOn(l, n).map((x) => [x.seq, x.kind, x.text, x.nodes]),
      [[note, 'comment', 'Same price question on both', [1, 2]]], `card ${n}`);
    assert.equal(boardState(s, 'b').items.get(String(n))!.status, 'commented');
  }
  assert.deepEqual(nodeDetail(s, 2)!.notes.map((x) => [x.seq, x.nodes]), [[note, [1, 2]]]);
  assert.equal(notesOn(l, 3).length, 0);
});

test('a card with its own note not yet sent may also be in a group note; a second own note is still refused', () => {
  const l = scene();
  l.v = 5;
  const own = l.act({ action: 'comment', n: 1, ver: 1, text: 'Mine' });
  assert.deepEqual(validateAct(next(l, { action: 'comment', nodes: [1, 2], text: 'Ours' }), l.state(), 'b'), []);
  const group = l.act({ action: 'comment', nodes: [1, 2], text: 'Ours' });
  assert.deepEqual(notesOn(l, 1).map((x) => x.seq), [own, group]);
  const p = validateAct(next(l, { action: 'comment', id: 2, ver: 1, text: 'Another' }), l.state(), 'b');
  assert.deepEqual(p, [], 'card 2 has no note of its own yet');
  const p1 = validateAct(next(l, { action: 'comment', id: 1, ver: 1, text: 'Another' }), l.state(), 'b');
  assert.ok(p1.some((x) => x.includes(`note ${own}`)), p1.join('; '));
});

test('edit and remove from any of its pins; never from a card it does not name', () => {
  const { l, note } = withGroup();
  assert.deepEqual(validateAct(next(l, { action: 'note-edit', id: 2, note, text: 'Edited from 2' }), l.state(), 'b'), []);
  l.act({ action: 'note-edit', n: 2, note, text: 'Edited from 2' });
  assert.deepEqual([1, 2].map((n) => notesOn(l, n)[0]!.text), ['Edited from 2', 'Edited from 2']);
  const p = validateAct(next(l, { action: 'note-edit', id: 3, note, text: 'x' }), l.state(), 'b');
  assert.ok(p.some((x) => x.startsWith('note:') && x.includes('1, 2')), p.join('; '));
  l.act({ action: 'note-remove', n: 1, note });
  const s = l.state();
  assert.deepEqual([1, 2].map((n) => notesOn(l, n).length), [0, 0]);
  assert.deepEqual([1, 2].map((n) => boardState(s, 'b').items.get(String(n))!.status), ['open', 'open']);
  assert.deepEqual(pendingItems(s, 'b'), []);
});

test('an edit that sets the kind changes every card it names; either kind is a note (D-045)', () => {
  const { l, note } = withGroup();
  l.act({ action: 'note-edit', n: 1, note, text: 'Explain the price', kind: 'context' });
  const s = l.state();
  assert.equal(s.asks.get(note)!.kind, 'context');
  assert.deepEqual([1, 2].map((n) => boardState(s, 'b').items.get(String(n))!.status), ['commented', 'commented']);
});

test('after Send the group note is history on every card', () => {
  const { l, note } = withGroup();
  l.act({ action: 'send', board: 'b' });
  assert.deepEqual([1, 2].map((n) => notesOn(l, n)[0]!.sent), [true, true]);
  const p = validateAct(next(l, { action: 'note-edit', id: 2, note, text: 'Late' }), l.state(), 'b');
  assert.ok(p.some((x) => x.includes('sent')), p.join('; '));
});

test('owed: each card it names; one reply naming the note answers it on all of them', () => {
  const { l, note } = withGroup();
  assert.deepEqual(pendingItems(l.state(), 'b').map((x) => [x.n, x.ask?.seq]), [[1, note], [2, note]]);
  l.agent(A, { type: 'reply', n: 1, text: 'Both are per seat.', to: note });
  assert.deepEqual(pendingItems(l.state(), 'b'), []);
});

test('owed per card: a newer version of one card answers the note there only', () => {
  const { l, note } = withGroup();
  l.node(B, 2, 2, { region: 'q', title: 'Node 2, redrawn' });
  assert.deepEqual(pendingItems(l.state(), 'b').map((x) => [x.n, x.ask?.seq]), [[1, note]]);
});

test('check_responses: the agent sees the note once, with all its numbers', () => {
  const { l, note } = withGroup();
  const got = responsesAfter(l.state(), 'b', 0).filter((e) => e.seq === note);
  assert.deepEqual(got.map((e) => [e.action, e.nodes, e.id, e.text]), [['comment', [1, 2], undefined, 'Same price question on both']]);
  assert.equal(responsesAfter(l.state(), 'b', 0, B).filter((e) => e.seq === note).length, 1, 'B holds q: it concerns B');
  const cursor = l.seq;
  l.act({ action: 'note-edit', n: 2, note, text: 'Edited' });
  assert.deepEqual(responsesAfter(l.state(), 'b', cursor).map((e) => [e.seq, e.nodes, e.text]), [[note, [1, 2], 'Edited']]);
});

test('the numbered reply names the group once, with its numbers', () => {
  const l = scene();
  l.v = 5;
  l.act({ action: 'ack', n: 3, ver: 1 });
  l.act({ action: 'comment', nodes: [1, 2], text: 'Same question' });
  const s = l.state();
  const reply = replyText(boardView(s, 'b'), boardState(s, 'b'));
  assert.match(reply, /^1, 2 \(question, question\): comment: Same question$/m);
  assert.match(reply, /^3 \(question\): ✓$/m);
  assert.doesNotMatch(reply, /^1 \(question\): comment/m);
  // A note never answers a card (D-045): both wait for the agent's answer (D-046, round 2 ruling 3).
  assert.match(reply, /\nWaiting for your reply: 1, 2$/, 'a note never answers a card (D-045)');
  assert.doesNotMatch(reply, /Still open/);
  assert.equal(reply.match(/Same question/g)!.length, 1);
});
