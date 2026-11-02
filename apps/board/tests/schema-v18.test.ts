// Ledger v18 (api.md 156, card-polish BE_01): the person's `notes-hide` and `notes-show` on one card.
// The format only adds, so a v17 line still reads; a v18 ledger holding the pair reads whole, and the
// schema and `eventProblems` agree on every line. The pair's broken forms are in schema-cases.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTION_IDS, LEDGER_FORMAT, eventProblems, readLedger } from '#format';
import { LEDGER_EVENT_ID, schemaProblems } from '../server/schema.ts';
import { VALID, act } from './schema-cases.ts';

test('v17 lines still read: every event type and action, written one format earlier', () => {
  for (const [type, e] of Object.entries(VALID)) {
    const old = { ...e, v: 17 };
    assert.deepEqual(schemaProblems(LEDGER_EVENT_ID, old), [], type);
    assert.deepEqual(eventProblems(old), [], type);
  }
  for (const action of ACTION_IDS.filter((a) => !a.startsWith('notes-'))) {
    const old = { ...act(action), v: 17 };
    assert.deepEqual(schemaProblems(LEDGER_EVENT_ID, old), [], action);
    assert.deepEqual(eventProblems(old), [], action);
  }
});

test('a v18 ledger with the pair reads whole, beside lines of the format before', () => {
  assert.ok(LEDGER_FORMAT >= 18);
  const AT = '2026-10-19T09:00:00.000Z';
  const person = { by: 'person', at: AT };
  const agent = { by: 'agent', agent: 'a-abcd1234', at: AT, v: 17 };
  const lines = [
    { ...agent, seq: 1, type: 'board', board: 'b', title: 'Pricing' },
    { ...agent, seq: 2, type: 'region', board: 'b', region: { id: 'plan', title: 'Plan', mode: 'grid' } },
    { ...agent, seq: 3, type: 'node', board: 'b', n: 1, ver: 1, node: { region: 'plan', kind: 'question', title: 'Keep it?' } },
    { ...person, v: 17, seq: 4, type: 'act', action: 'flag', n: 1 },
    { ...person, v: 18, seq: 5, type: 'act', action: 'notes-hide', n: 1 },
    { ...person, v: 18, seq: 6, type: 'act', action: 'notes-show', n: 1 },
  ];
  for (const e of lines) {
    assert.deepEqual(schemaProblems(LEDGER_EVENT_ID, e), [], `seq ${e.seq}`);
    assert.deepEqual(eventProblems(e), [], `seq ${e.seq}`);
  }
  assert.deepEqual(readLedger(lines.map((e) => JSON.stringify(e))).problems, []);
});
