// Ledger v14 (N39, api.md 135): the person's `archive` and `restore` name a whole board, and
// nothing else; the board must exist. They are the person's own marks
// (`PRIVATE_ACTIONS`, `BOARD_MARKS`), which no agent reads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOARD_MARKS, eventProblems, LEDGER_FORMAT, PRIVATE_ACTIONS, readLedger } from '../src/index.ts';

const at = '2026-10-12T09:00:00Z';
const A = 'a-abcd1234';
const lines = (...events: object[]) => events.map((e, i) => JSON.stringify({ v: LEDGER_FORMAT, seq: i + 1, at, ...e }));

test('archive and restore are the person\'s board marks, private like the bookmark', () => {
  for (const a of ['archive', 'restore']) assert.ok(BOARD_MARKS.has(a as never), a);
  for (const a of ['bookmark', 'unbookmark', 'archive', 'restore']) assert.ok(PRIVATE_ACTIONS.has(a as never), a);
});

test('archive and restore a board that exists; an unknown board is refused', () => {
  const read = readLedger(lines(
    { by: 'agent', agent: A, type: 'join', label: 'Chat' },
    { by: 'agent', agent: A, type: 'board', board: 'b', title: 'B' },
    { by: 'person', type: 'act', action: 'archive', board: 'b' },
    { by: 'person', type: 'act', action: 'restore', board: 'b' },
    { by: 'person', type: 'act', action: 'archive', board: 'nope' },
  ));
  assert.deepEqual(read.problems, ['line 5: board: unknown "nope"']);
  assert.equal(read.events.length, 4);
});

test('an archive names its board, and nothing else', () => {
  const act = (e: object) => ({ v: LEDGER_FORMAT, seq: 1, at, by: 'person', type: 'act', action: 'archive', board: 'b', ...e });
  assert.deepEqual(eventProblems(act({})), []);
  assert.deepEqual(eventProblems(act({ board: undefined })), ['archive: board required']);
  assert.deepEqual(eventProblems(act({ n: 1 })), ['n: an archive names its board, and nothing else']);
  assert.deepEqual(eventProblems({ ...act({ region: 'r' }), action: 'restore' }), ['region: a restore names its board, and nothing else']);
});
