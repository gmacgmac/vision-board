// Ledger v19 (api.md 169, point 377): a Send's `head`, the line its answers were read through. The format only
// adds, so a v18 line still reads; `head` is a Send's alone, from 0, never past the ledger's last line; and the
// schema and `eventProblems` agree on every line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTION_IDS, LEDGER_FORMAT, eventProblems, readLedger } from '#format';
import { LEDGER_EVENT_ID, schemaProblems } from '../server/schema.ts';
import { VALID, act } from './schema-cases.ts';

test('old ledgers read unchanged: every event type and action, written as v18, still reads', () => {
  assert.equal(LEDGER_FORMAT, 19);
  for (const [type, e] of Object.entries(VALID)) {
    const old = { ...e, v: 18 };
    assert.deepEqual(schemaProblems(LEDGER_EVENT_ID, old), [], type);
    assert.deepEqual(eventProblems(old), [], type);
  }
  for (const action of ACTION_IDS) {
    const old = { ...act(action), v: 18 };
    assert.deepEqual(schemaProblems(LEDGER_EVENT_ID, old), [], action);
    assert.deepEqual(eventProblems(old), [], action);
  }
});

test('a send may carry head from 0; no other action may; and both checks agree', () => {
  for (const head of [0, 1, 40]) {
    assert.deepEqual(schemaProblems(LEDGER_EVENT_ID, act('send', { head })), [], `head ${head}`);
    assert.deepEqual(eventProblems(act('send', { head })), [], `head ${head}`);
  }
  for (const bad of [act('send', { head: -1 }), act('send', { head: 1.5 }), act('send', { head: '3' }), act('ack', { head: 1 }), act('lock', { head: 1 })]) {
    assert.notDeepEqual(schemaProblems(LEDGER_EVENT_ID, bad), [], JSON.stringify(bad));
    assert.notDeepEqual(eventProblems(bad), [], JSON.stringify(bad));
  }
});

test('a v19 ledger reads whole beside v18 lines; a head past the ledger\'s last line is refused', () => {
  const AT = '2026-11-02T09:00:00.000Z';
  const agent = { by: 'agent', agent: 'a-abcd1234', at: AT, v: 18 };
  const person = { by: 'person', at: AT };
  const lines = [
    { ...agent, seq: 1, type: 'board', board: 'b', title: 'Pricing' },
    { ...agent, seq: 2, type: 'region', board: 'b', region: { id: 'plan', title: 'Plan', mode: 'grid' } },
    { ...agent, seq: 3, type: 'node', board: 'b', n: 1, ver: 1, node: { region: 'plan', kind: 'question', title: 'Keep it?' } },
    { ...person, v: 18, seq: 4, type: 'act', action: 'send', board: 'b' },
    { ...person, v: 19, seq: 5, type: 'act', action: 'send', board: 'b', head: 4 },
  ];
  const text = (ls: object[]) => ls.map((e) => JSON.stringify(e));
  assert.deepEqual(readLedger(text(lines)).problems, []);
  const ahead = readLedger(text([...lines, { ...person, v: 19, seq: 6, type: 'act', action: 'send', board: 'b', head: 6 }]));
  assert.equal(ahead.problems.length, 1);
  assert.match(JSON.stringify(ahead.problems), /head: the ledger is at line 5/);
});
