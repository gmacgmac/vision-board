// The page's proposals (proposals-seen-parking FE_01): which are open or out of date comes from the
// conditions table (`pageConditions`); the rows the cards and the bar show, the bar's words, the acts
// for Accept and Reject, and what Accept all applies and leaves out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger } from '#format';
import { applyEvent, foldLedger } from '#actions';
import type { LedgerState } from '#actions';
import { pageConditions } from '../src/board/board-data.ts';
import { acceptAllPlan, acceptAllWords, answerDone, answerable, barWords, proposalAct, proposalRows } from '../src/board/proposals.ts';

const A = 'a-aaaa1111';
let seq = 0;
const line = (e: object) => JSON.stringify({ v: 10, seq: ++seq, at: `2026-10-08T13:${String(seq).padStart(2, '0')}:00Z`, ...e });
const agent = (e: object) => line({ by: 'agent', agent: A, ...e });
const node = (n: number, ver: number, kind = 'question') =>
  agent({ type: 'node', board: 'b', n, ver, node: { region: 'r', kind, title: `Card ${n}`, item: true } });
const propose = (n: number, action: string, reason: string, source?: string) =>
  agent({ type: 'propose', n, ver: 1, action, reason, ...(source && { source }) });

/** Card 1: a drop from an email. Card 2: an acknowledge, out of date after an edit. Card 3: an
 *  acknowledge, then a newer drop. Card 4: an acknowledge already rejected. */
function ledger(): LedgerState {
  const lines = [
    agent({ type: 'join', label: 'Pricing chat' }), agent({ type: 'board', board: 'b', title: 'B' }),
    agent({ type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'grid' } }),
    node(1, 1), node(2, 1, 'action'), node(3, 1, 'decision'), node(4, 1),
    propose(1, 'drop', 'the client declined', 'Email pasted in chat'), propose(2, 'ack', 'the draft is done'), node(2, 2, 'action'),
    propose(3, 'ack', 'the sheet confirms it'), propose(3, 'drop', 'the new prices remove it'), propose(4, 'ack', 'settled'),
    line({ by: 'person', type: 'act', action: 'reject', n: 4, proposal: seq }),
  ];
  const read = readLedger(lines);
  assert.deepEqual(read.problems, []);
  return foldLedger(read.events);
}

const time = (at: string) => at.slice(11, 16);

test('pageConditions: the open proposals and the out-of-date one, never a rejected one', () => {
  seq = 0;
  const found = pageConditions(ledger(), 'b').proposals;
  assert.deepEqual(found.map((p) => [p.n, p.stale]).sort(), [[1, false], [2, true], [3, false], [3, false]]);
});

test('rows: newest first, worded from the ledger, the agent named by its label', () => {
  seq = 0;
  const s = ledger();
  const rows = proposalRows(s, pageConditions(s, 'b').proposals, time);
  assert.deepEqual(rows.map((r) => [r.n, r.action, r.stale]), [[3, 'drop', false], [3, 'ack', false], [2, 'ack', true], [1, 'drop', false]]);
  assert.deepEqual(rows.at(-1), { n: 1, seq: rows.at(-1)!.seq, action: 'drop', reason: 'the client declined', when: '13:08', stale: false,
    source: 'Email pasted in chat', agent: 'Pricing chat' });
  assert.deepEqual(barWords(rows), { count: '4 proposals', stale: '1 out of date', n: '4', noun: 'proposals' });
  assert.deepEqual(barWords(rows.slice(0, 1)), { count: '1 proposal', stale: '', n: '1', noun: 'proposal' });
});

test('acts: accept is the proposal\'s own action at the card\'s version; reject names it', () => {
  seq = 0;
  const s = ledger();
  const row = proposalRows(s, pageConditions(s, 'b').proposals, time).at(-1)!;
  assert.deepEqual(proposalAct(row, 'accept', 1), { action: 'drop', n: 1, ver: 1, proposal: row.seq });
  assert.deepEqual(proposalAct(row, 'reject'), { action: 'reject', n: 1, proposal: row.seq });
  assert.deepEqual([answerDone(row, 'accept'), answerDone(row, 'reject')], ['Accepted: cross 1', 'Rejected: cross 1']);
});

test('Accept all: the newest on each card not out of date, in card order; the rest listed with why', () => {
  seq = 0;
  const s = ledger();
  const plan = acceptAllPlan(proposalRows(s, pageConditions(s, 'b').proposals, time));
  assert.deepEqual(plan.apply.map((r) => [r.n, r.action]), [[1, 'drop'], [3, 'drop']]);
  const w = acceptAllWords(plan);
  assert.deepEqual([w.heading, w.confirm, w.done], ['Accept these 2 proposals?', 'Apply 2 proposals', 'Accepted 2 proposals']);
  assert.deepEqual(w.items, [{ ref: '1', text: 'Cross: the client declined' }, { ref: '3', text: 'Cross: the new prices remove it' }]);
  assert.deepEqual(w.skipped, [
    { ref: '2', text: 'Check: the draft is done (2 changed after this was proposed)' },
    { ref: '3', text: 'Check: the sheet confirms it (a newer proposal on 3 is applied)' },
  ]);
});

test('a decision on the card ends its proposals: no row is left for it', () => {
  seq = 0;
  const s = ledger();
  applyEvent(s, { v: 10, seq: s.seq + 1, at: '2026-10-08T14:00:00Z', by: 'person', type: 'act', action: 'ack', id: 3, ver: 1 });
  assert.deepEqual(pageConditions(s, 'b').proposals.map((p) => p.n).sort(), [1, 2]);
});

test('a retire ends the proposals on its cards: no row is left for them', () => {
  seq = 0;
  const s = ledger();
  applyEvent(s, { v: 10, seq: s.seq + 1, at: '2026-10-08T14:00:00Z', by: 'agent', agent: A, type: 'retire', board: 'b', cards: [3, 2] });
  assert.deepEqual(pageConditions(s, 'b').proposals.map((p) => p.n), [1]);
});

test('an accept needs the card\'s version: with none the act is never built and the row is not answerable', () => {
  seq = 0;
  const s = ledger();
  const rows = proposalRows(s, pageConditions(s, 'b').proposals, time);
  assert.equal(proposalAct(rows[0]!, 'accept'), undefined);
  assert.deepEqual(proposalAct(rows[0]!, 'reject'), { action: 'reject', n: rows[0]!.n, proposal: rows[0]!.seq });
  const ver = (n: number) => (n === 3 ? undefined : 1);
  assert.deepEqual(answerable(rows, ver).map((r) => [r.n, r.action]), [[2, 'ack'], [1, 'drop']], 'card 3 has no version on the board: its rows go');
});
