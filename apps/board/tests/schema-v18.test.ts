// Ledger v18 (api.md 156, card-polish BE_01): the person's `notes-hide` and `notes-show` on one card. A ledger
// holding the pair reads whole, and the schema and `eventProblems` agree on every line. The pair's broken forms are in
// schema-cases.ts; a line of an older format is refused and migrated (schema-v20.test.ts, D-103).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEDGER_FORMAT, eventProblems, readLedger } from '#format';
import { LEDGER_EVENT_ID, schemaProblems } from '../server/schema.ts';

test('a ledger with the pair reads whole, beside a bookmark on the same card', () => {
  const AT = '2026-10-19T09:00:00.000Z';
  const person = { v: LEDGER_FORMAT, by: 'person', at: AT };
  const agent = { v: LEDGER_FORMAT, by: 'agent', agent: 'a-abcd1234', at: AT };
  const lines = [
    { ...agent, seq: 1, type: 'board', board: 'b', title: 'Pricing' },
    { ...agent, seq: 2, type: 'region', board: 'b', region: { id: 'plan', title: 'Plan', mode: 'grid' } },
    { ...agent, seq: 3, type: 'node', board: 'b', n: 1, ver: 1, node: { region: 'plan', kind: 'question', title: 'Keep it?' } },
    { ...person, seq: 4, type: 'act', action: 'bookmark', n: 1 },
    { ...person, seq: 5, type: 'act', action: 'notes-hide', n: 1 },
    { ...person, seq: 6, type: 'act', action: 'notes-show', n: 1 },
  ];
  for (const e of lines) {
    assert.deepEqual(schemaProblems(LEDGER_EVENT_ID, e), [], `seq ${e.seq}`);
    assert.deepEqual(eventProblems(e), [], `seq ${e.seq}`);
  }
  assert.deepEqual(readLedger(lines.map((e) => JSON.stringify(e))).problems, []);
});
