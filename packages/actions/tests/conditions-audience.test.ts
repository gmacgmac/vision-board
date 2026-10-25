// The conditions table (BE_04, D-033, api.md 87), who is told (split out of conditions.test.ts): an
// agent is never told the person's rows, and agent scoping goes through the permissions table, so a
// board revoke ends what an agent is told it owes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ConditionContext, ConditionKind, LedgerState } from '../src/index.ts';
import { CONDITION_KINDS, CONDITIONS, conditionsOf, openContainers, openItems, pendingItems, responsesAfter } from '../src/index.ts';
import { A, B, C, scene } from './ledger-v3.ts';

const v8 = () => { const l = scene(); l.v = 8; return l; };
const kinds = (s: LedgerState, ctx: ConditionContext, ...ks: ConditionKind[]) => conditionsOf(s, ctx).filter((c) => ks.includes(c.kind));

test('an agent is never told the person\'s rows; the person is told every agent\'s', () => {
  const l = v8();
  l.request(C, 'r');
  l.act({ action: 'comment', n: 1, ver: 1, text: 'For A.' });
  const person = new Set(CONDITION_KINDS.filter((k) => CONDITIONS[k].audience === 'person'));
  assert.ok(conditionsOf(l.state(), { board: 'b' }).some((c) => person.has(c.kind)));
  for (const agent of [A, B, C]) assert.ok(!conditionsOf(l.state(), { board: 'b', agent }).some((c) => person.has(c.kind)), agent);
});

test('a board revoke (D-034) ends what the agent is told it owes there, and the container acts it hears about', () => {
  const l = v8();
  const card = l.act({ action: 'comment', n: 2, ver: 1, text: 'For B.' });
  const note = l.act({ action: 'comment', board: 'b', region: 'q', text: 'On all of q.' });
  const mode = l.act({ action: 'mode', board: 'b', region: 'q', mode: 'list' });
  const owed = () => kinds(l.state(), { board: 'b', agent: B }, 'item.owed', 'container.owed').map((c) => c.seq);
  const heard = () => responsesAfter(l.state(), 'b', 0, B).map((e) => e.seq);
  assert.deepEqual(owed(), [card, note]);
  assert.deepEqual(heard(), [card, note, mode]);
  const revoke = l.act({ action: 'revoke', holder: B, board: 'b' });
  assert.deepEqual(owed(), []);
  assert.deepEqual(pendingItems(l.state(), 'b', B), []);
  assert.deepEqual([openItems(l.state(), 'b', B), openContainers(l.state(), 'b', B)], [[], []]);
  assert.deepEqual(heard(), [revoke], 'it hears only that it lost the board');
  assert.deepEqual(kinds(l.state(), { board: 'b' }, 'item.owed', 'container.owed').map((c) => c.seq), [card, note], 'still owed to the board');
});
