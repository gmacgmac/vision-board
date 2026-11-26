// Agents from other folders (ledger v23, api.md 215, D-120): the fold keeps the person's allow while it stands, the act
// rules refuse what would change nothing, only the person does either, and neither touches a board: no head, no
// answer, not in check_responses, and no board's lock holds it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent } from '#format';
import { FOLDER_ACTIONS, LEDGER_FORMAT } from '#format';
import type { LedgerState } from '../src/index.ts';
import { ACTIONS, otherFoldersIn, passesLock, responsesAfter, scopeOf, validateAct } from '../src/index.ts';
import { isAnswer } from '../src/registry.ts';
import { scene } from './ledger-v3.ts';

const asAct = (s: LedgerState, action: string): ActEvent =>
  ({ v: LEDGER_FORMAT, seq: s.seq + 1, at: '2026-11-26T09:00:00Z', by: 'person', type: 'act', action }) as ActEvent;

test('the fold: off at first, an allow lets other folders in, a stop ends it', () => {
  const l = scene();
  assert.equal(otherFoldersIn(l.state()), false);
  const at = l.act({ action: 'folders-allow' });
  assert.deepEqual([otherFoldersIn(l.state()), l.state().otherFolders], [true, at]);
  l.act({ action: 'folders-revoke' });
  assert.equal(otherFoldersIn(l.state()), false);
});

test('the rules: an allow while let in, or a stop while not, is refused; the other way goes', () => {
  const l = scene();
  assert.deepEqual(validateAct(asAct(l.state(), 'folders-allow'), l.state(), 'b'), []);
  assert.match(validateAct(asAct(l.state(), 'folders-revoke'), l.state(), 'b')[0]!, /are not let in/);
  l.act({ action: 'folders-allow' });
  assert.match(validateAct(asAct(l.state(), 'folders-allow'), l.state(), 'b')[0]!, /already let in/);
  assert.deepEqual(validateAct(asAct(l.state(), 'folders-revoke'), l.state(), 'b2'), [], 'sent from any board');
});

test('only the person does it; it touches no board, answers nothing and no lock holds it', () => {
  const l = scene();
  const before = l.state();
  l.act({ action: 'folders-allow' });
  l.act({ action: 'folders-revoke' });
  const s = l.state();
  assert.deepEqual([s.heads, s.dates, s.seen, s.unsent], [before.heads, before.dates, before.seen, before.unsent]);
  for (const e of s.acts.slice(-2)) assert.deepEqual(scopeOf(s, e), { cards: [] });
  assert.deepEqual(responsesAfter(s, 'b', before.seq), []);
  for (const action of FOLDER_ACTIONS) {
    assert.equal(ACTIONS[action].by, 'person', action);
    assert.equal(isAnswer(action), false, action);
    assert.equal(passesLock({ type: 'act', action }), true, `${action} is on the ledger, so no board's lock holds it`);
  }
});
