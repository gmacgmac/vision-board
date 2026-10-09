// The chat conditions table (PLAN ruling 11): one test per row, each saying what starts it and
// what ends it, and a coverage test that fails when a row has no case.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatConditionKind, ChatHost, ChatState } from '../src/index.ts';
import { applyEvents, canSend, canStop, CHAT_CONDITION_KINDS, CHAT_CONDITIONS, chatConditions, chatStatus, EMPTY_CHAT } from '../src/index.ts';
import type { Draft } from './support.ts';
import { stamp, TURN, WRITE } from './support.ts';

const run = (drafts: Draft[]) => applyEvents(EMPTY_CHAT, stamp(drafts));
const holds = (k: ChatConditionKind, s: ChatState, host: ChatHost = {}) => CHAT_CONDITIONS[k].holds(s, host);
const ASK: Draft = { kind: 'approval_request', approvalId: 'ap-1', facts: WRITE, expiresAt: '2026-10-08T09:02:00Z' };
const tested = new Set<ChatConditionKind>();

test('busy: from the person\'s message to the line that ends the turn', () => {
  tested.add('busy');
  assert.equal(holds('busy', EMPTY_CHAT), false);
  assert.equal(holds('busy', run(TURN.slice(0, 1))), true);
  assert.equal(holds('busy', run(TURN.slice(0, 7))), true);
  assert.equal(holds('busy', run(TURN)), false);
  assert.deepEqual(chatStatus(run(TURN.slice(0, 1))), { kind: 'busy', label: 'Working', tone: 'active' });
  assert.equal(canSend(run(TURN.slice(0, 1))), false);
  assert.equal(canStop(run(TURN.slice(0, 1))), true);
});

test('waiting: from an approval request to its result, or the turn\'s end', () => {
  tested.add('waiting');
  const asked = run([TURN[0]!, ASK]);
  assert.equal(holds('waiting', asked), true);
  assert.deepEqual(chatStatus(asked), { kind: 'waiting', label: 'Waiting for you', tone: 'attention' });
  assert.equal(holds('waiting', run([TURN[0]!, ASK, { kind: 'approval_result', approvalId: 'ap-1', approved: true, status: 'approved', scope: 'once' }])), false);
  assert.equal(holds('waiting', run([TURN[0]!, ASK, { kind: 'system', text: 'Stopped.', turn: 'stopped' }])), false);
  assert.equal(canStop(asked), true);
});

test('blocked: while the host gives a reason, and no longer', () => {
  tested.add('blocked');
  const host = { blocked: 'A past version is showing.' };
  assert.equal(holds('blocked', EMPTY_CHAT, host), true);
  assert.equal(holds('blocked', EMPTY_CHAT, {}), false);
  assert.deepEqual(chatStatus(EMPTY_CHAT, host), { kind: 'blocked', label: 'Can\'t send', tone: 'quiet' });
  assert.equal(canSend(EMPTY_CHAT, host), false);
  assert.equal(canStop(EMPTY_CHAT, host), false);
  // A turn already running can still be stopped, and the header says it is working.
  assert.equal(canStop(run(TURN.slice(0, 1)), host), true);
  assert.equal(chatStatus(run(TURN.slice(0, 1)), host).kind, 'busy');
});

test('stopped: from a stopped turn to the next message', () => {
  tested.add('stopped');
  const s = run([TURN[0]!, { kind: 'system', text: 'Stopped.', turn: 'stopped' }]);
  assert.equal(holds('stopped', s), true);
  assert.deepEqual(chatStatus(s), { kind: 'stopped', label: 'Stopped', tone: 'quiet' });
  assert.equal(canSend(s), true);
  assert.equal(holds('stopped', run([TURN[0]!, { kind: 'system', text: 'Stopped.', turn: 'stopped' }, TURN[0]!])), false);
});

test('error: from a failed turn to the next message', () => {
  tested.add('error');
  const s = run([TURN[0]!, { kind: 'system', text: 'Claude Code ended without a result.', turn: 'error' }]);
  assert.equal(holds('error', s), true);
  assert.deepEqual(chatStatus(s), { kind: 'error', label: 'Error', tone: 'danger' });
  assert.equal(canSend(s), true);
  assert.equal(holds('error', run([TURN[0]!, { kind: 'system', text: 'Failed.', turn: 'error' }, TURN[0]!])), false);
});

test('ready: nothing holds, so the person can send and there is nothing to stop', () => {
  assert.deepEqual(chatConditions(run(TURN)), []);
  assert.deepEqual(chatStatus(run(TURN)), { kind: 'ready', label: 'Ready', tone: 'quiet' });
  assert.equal(canSend(EMPTY_CHAT), true);
  assert.equal(canStop(EMPTY_CHAT), false);
});

test('every row says what starts and ends it, and has a test above', () => {
  for (const k of CHAT_CONDITION_KINDS) {
    assert.ok(CHAT_CONDITIONS[k].startsWhen && CHAT_CONDITIONS[k].endsWhen, k);
    assert.ok(tested.has(k), `no test for the ${k} row`);
  }
});
