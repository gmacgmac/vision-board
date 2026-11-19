// Board numbers and identities on the page (D-041 proposed, api.md 125): an act's or a card seen's
// answer names cards by their number on the board it was sent to; the page applies it to its state,
// which is by identity, so `answerEvent` turns each back. On board b no number equals its identity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger, LEDGER_FORMAT } from '#format';
import type { View, ViewNode } from '#format';
import { applyEvent, boardData, foldLedger } from '#actions';
import { answerEvent, idOf, numOf, readingOrder } from '../src/board/card-numbers.ts';
import { lineMaker } from '#format/testing';

const A = 'a-aaaa1111';
const maker = lineMaker({ at: '2026-10-11T12' });
const { line } = maker;
const agent = (e: object) => line({ by: 'agent', agent: A, ...e });
const card = (board: string, n: number) => agent({ type: 'node', board, n, ver: 1, node: { region: 'r', kind: 'question', title: `Card ${n}` } });

function state() {
  maker.reset();
  const lines = [
    agent({ type: 'join', label: 'Pricing chat' }),
    agent({ type: 'board', board: 'a', title: 'A' }), agent({ type: 'region', board: 'a', region: { id: 'r', title: 'R', mode: 'grid' } }),
    card('a', 1), card('a', 2),
    agent({ type: 'board', board: 'b', title: 'B' }), agent({ type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'column' } }),
    card('b', 3), card('b', 4),
  ];
  const { events, problems } = readLedger(lines);
  assert.deepEqual(problems, []);
  return foldLedger(events);
}

test('a number on a board and its identity, both ways', () => {
  const s = state();
  assert.deepEqual([idOf(s, 'b', 1), idOf(s, 'b', 2), idOf(s, 'a', 1), idOf(s, 'b', 3)], [3, 4, 1, undefined]);
  assert.deepEqual([numOf(s, 3), numOf(s, 4), numOf(s, 2), numOf(s, 9)], [1, 2, 2, undefined]);
});

test('an old list mode reads as column (api.md 129)', () => {
  assert.equal(boardData(state(), 'b').view.regions[0]!.mode, 'column');
});

test('an answer applied in place lands on the card it names on the board it was sent to', () => {
  const s = state();
  const ack = answerEvent(s, 'b', { v: LEDGER_FORMAT, seq: s.seq + 1, at: '2026-10-11T12:30:00Z', by: 'person', type: 'act', action: 'ack', n: 2, ver: 1 });
  assert.equal((ack as { id?: number }).id, 4);
  applyEvent(s, ack);
  const note = answerEvent(s, 'b', { v: LEDGER_FORMAT, seq: s.seq + 1, at: '2026-10-11T12:31:00Z', by: 'person', type: 'act', action: 'comment', nodes: [1, 2], text: 'Both?' });
  assert.deepEqual((note as { nodes?: number[] }).nodes, [3, 4]);
  applyEvent(s, note);
  const seen = answerEvent(s, 'b', { v: LEDGER_FORMAT, seq: s.seq + 1, at: '2026-10-11T12:32:00Z', by: 'person', type: 'seen', n: 1, ver: 1 });
  assert.equal((seen as { id?: number }).id, 3);
  const b = boardData(s, 'b');
  assert.equal(b.state.items.get('2')?.status, 'acknowledged', 'board b\'s 2, the ledger\'s 4');
  assert.deepEqual(b.state.items.get('1')?.notes.map((x) => x.nodes), [[1, 2]], 'the note names b\'s cards by number');
  assert.equal(boardData(s, 'a').state.items.get('2'), undefined, 'board a\'s 2 untouched');
});

/** A view of `nodes` (id = number), as the page draws it: [n, region, timeline?]. */
const viewOf = (nodes: [number | undefined, string, string?][]): View => ({
  format: 1, session: 's', version: 1, title: 'T', regions: [], links: [],
  nodes: nodes.map(([n, region, timeline], i): ViewNode => ({ id: String(n ?? `x${i}`), region, kind: 'topic', title: `C${i}`,
    ...(n !== undefined && { n }), ...(timeline && { timeline }) })),
});
const order = (v: View) => readingOrder(v).map((x) => x.id);

test('reading order with no timeline: card-number order exactly, cards with no number last, as given', () => {
  assert.deepEqual(order(viewOf([[3, 'a'], [1, 'b'], [undefined, 'a'], [2, 'a'], [undefined, 'b']])), ['1', '2', '3', 'x2', 'x4']);
});

test('reading order in a container with a timeline: its dated cards in the line\'s order, then its others; other containers as before (FIX_03, 601)', () => {
  const v = viewOf([
    [1, 'loose'], [2, 'plan', '2026-11-03'], [3, 'plan', '2026-09-15'], [4, 'plan'], [5, 'other'],
    [6, 'plan', '2026-10'], [7, 'plan', '2026-11-03'], [8, 'plan'], [9, 'after', '2027-02'], [10, 'after'],
  ]);
  // plan's place is its first card's (2): 3 (Sep 15), 6 (Oct), 2 and 7 (Nov 3, equal dates by number), then 4 and 8;
  // card 5 of another container keeps its place after card 4, as today.
  assert.deepEqual(order(v), ['1', '3', '6', '2', '7', '4', '5', '8', '9', '10']);
  // The container's first card undated: the line still comes first in it.
  assert.deepEqual(order(viewOf([[1, 'p'], [2, 'p', '2027'], [3, 'p', '2026']])), ['3', '2', '1']);
});
