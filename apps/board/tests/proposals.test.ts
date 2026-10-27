// The page's proposals (proposals-seen-parking FE_01): the acts for Accept and Reject, the toast, the
// bar's words and Accept all's confirm step, over the rows packages/actions builds from the ledger
// (packages/actions/tests/proposal-rows.test.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProposalRow } from '#actions';
import { acceptAllPlan } from '#actions';
import { acceptAllWords, answerDone, barWords, proposalAct } from '../src/board/proposals.ts';

const row = (n: number, seq: number, action: 'ack' | 'drop', reason: string, stale = false): ProposalRow =>
  ({ n, seq, action, reason, when: '13:08', stale });
const ROWS = [row(3, 12, 'drop', 'the new prices remove it'), row(3, 11, 'ack', 'the sheet confirms it'), row(2, 10, 'ack', 'the draft is done', true), row(1, 9, 'drop', 'the client declined')];

test('the bar: the count and how many are out of date', () => {
  assert.deepEqual(barWords(ROWS), { count: '4 proposals', stale: '1 out of date', n: '4', noun: 'proposals' });
  assert.deepEqual(barWords(ROWS.slice(0, 1)), { count: '1 proposal', stale: '', n: '1', noun: 'proposal' });
});

test('acts: accept is the proposal\'s own action at the card\'s version; reject names it', () => {
  const r = ROWS.at(-1)!;
  assert.deepEqual(proposalAct(r, 'accept', 1), { action: 'drop', n: 1, ver: 1, proposal: 9 });
  assert.deepEqual(proposalAct(r, 'reject'), { action: 'reject', n: 1, proposal: 9 });
  assert.deepEqual([answerDone(r, 'accept'), answerDone(r, 'reject')], ['Accepted: cross 1', 'Rejected: cross 1']);
});

test('an accept needs the card\'s version: with none the act is never built', () => {
  assert.equal(proposalAct(ROWS[0]!, 'accept'), undefined);
  assert.deepEqual(proposalAct(ROWS[0]!, 'reject'), { action: 'reject', n: 3, proposal: 12 });
});

test('Accept all\'s confirm step: what it applies, then what it leaves out and why', () => {
  const w = acceptAllWords(acceptAllPlan(ROWS));
  assert.deepEqual([w.heading, w.confirm, w.done], ['Accept these 2 proposals?', 'Apply 2 proposals', 'Accepted 2 proposals']);
  assert.deepEqual(w.items, [{ ref: '1', text: 'Cross: the client declined' }, { ref: '3', text: 'Cross: the new prices remove it' }]);
  assert.deepEqual(w.skipped, [
    { ref: '2', text: 'Check: the draft is done (2 changed after this was proposed)' },
    { ref: '3', text: 'Check: the sheet confirms it (a newer proposal on 3 is applied)' },
  ]);
});
