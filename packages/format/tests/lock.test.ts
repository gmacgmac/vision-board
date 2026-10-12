// Ledger v15 (N40, api.md 138): the person's `lock` and `unlock` name a whole board, and nothing
// else; the board must exist. Older lines stay valid. They are the person's own marks
// (`PRIVATE_ACTIONS`, `BOARD_MARKS`), whose lines no agent reads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTION_IDS, BOARD_MARKS, eventProblems, LEDGER_FORMAT, LEDGER_FORMATS, PRIVATE_ACTIONS, readLedger } from '../src/index.ts';

const at = '2026-10-12T09:00:00Z';
const A = 'a-abcd1234';
const lines = (...events: object[]) => events.map((e, i) => JSON.stringify({ v: 15, seq: i + 1, at, ...e }));

test('v15 is the format written; every older format still reads', () => {
  assert.equal(LEDGER_FORMAT, 15);
  assert.deepEqual(LEDGER_FORMATS, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
});

test('lock and unlock are acts, and the person\'s board marks, private like the flag and archive', () => {
  for (const a of ['lock', 'unlock'] as const) {
    assert.ok(ACTION_IDS.includes(a), a);
    assert.ok(BOARD_MARKS.has(a), a);
    assert.ok(PRIVATE_ACTIONS.has(a), a);
  }
  assert.deepEqual([...BOARD_MARKS], ['archive', 'restore', 'lock', 'unlock']);
});

test('a v15 ledger: lock and unlock a board that exists; an unknown board is refused', () => {
  const read = readLedger(lines(
    { by: 'agent', agent: A, type: 'join', label: 'Chat' },
    { by: 'agent', agent: A, type: 'board', board: 'b', title: 'B' },
    { by: 'person', type: 'act', action: 'lock', board: 'b' },
    { by: 'person', type: 'act', action: 'unlock', board: 'b' },
    { by: 'person', type: 'act', action: 'lock', board: 'nope' },
  ));
  assert.deepEqual(read.problems, ['line 5: board: unknown "nope"']);
  assert.equal(read.events.length, 4);
});

test('a v14 ledger still reads beside v15 lines', () => {
  const v14 = JSON.stringify({ v: 14, seq: 1, at, by: 'agent', agent: A, type: 'join', label: 'Chat' });
  const read = readLedger([v14, ...lines({ by: 'agent', agent: A, type: 'board', board: 'b', title: 'B' }).map((l) => l.replace('"seq":1', '"seq":2'))]);
  assert.deepEqual(read.problems, []);
});

test('a lock names its board, and nothing else', () => {
  const act = (e: object) => ({ v: 15, seq: 1, at, by: 'person', type: 'act', action: 'lock', board: 'b', ...e });
  assert.deepEqual(eventProblems(act({})), []);
  assert.deepEqual(eventProblems(act({ board: undefined })), ['lock: board required']);
  assert.deepEqual(eventProblems(act({ n: 1 })), ['n: a lock names its board, and nothing else']);
  assert.deepEqual(eventProblems({ ...act({ region: 'r' }), action: 'unlock' }), ['region: an unlock names its board, and nothing else']);
});
