// Nothing new to send (field report batch 1, ruling 1; tracker N33): `board.unsent`, the conditions
// row behind Send to agent. It holds while the open board has an act of the person's since its last
// Send that the Send message carries (✓, ✗, a note, More context, Later, Reopen, a proposal turned
// down, a note on a whole container); arranging the board alone (pin, size, mode, a move between
// containers) never counts, and a note written and removed before Send leaves nothing to send. It
// agrees with the Send message's own scope (pending.ts `replyScope` from the last Send) on every
// step here and on every fixture ledger.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LATER_REGION, readLedger } from '#format';
import type { ConditionContext, LedgerState } from '../src/index.ts';
import { conditionsOf, foldLedger, replyScope } from '../src/index.ts';
import { A, scene } from './ledger-v3.ts';
import { FIXTURE_LEDGERS } from '#format/testing';

/** Every fixture ledger, the gallery's too: real ledgers in the real schema. */
const FIXTURES = Object.values(FIXTURE_LEDGERS);

const unsent = (s: LedgerState, ctx: ConditionContext = { board: 'b' }) => conditionsOf(s, ctx).filter((c) => c.kind === 'board.unsent');

/** What the Send message would carry on `board`: the cards and containers answered since what its Sends carried. */
function carried(s: LedgerState, board: string): number {
  const scope = replyScope(s, board, s.sentHead.get(board) ?? 0);
  return scope.cards.size + scope.regions.size;
}

const v8 = () => { const l = scene(); l.v = 8; return l; };

test('an answer since the last Send holds it, with that line; a Send ends it', () => {
  const l = v8();
  assert.deepEqual(unsent(l.state()), [], 'nothing answered yet');
  const ack = l.act({ action: 'ack', n: 1, ver: 1 });
  assert.deepEqual(unsent(l.state()), [{ kind: 'board.unsent', board: 'b', seq: ack }]);
  l.act({ action: 'send', board: 'b' });
  assert.deepEqual(unsent(l.state()), [], 'a Send ends it');
  const drop = l.act({ action: 'drop', n: 2, ver: 1 });
  const note = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why?' });
  assert.deepEqual(unsent(l.state()).map((c) => c.seq), [note], 'the latest answer is the line');
  assert.ok(drop < note);
});

test('the open board only, and the person\'s row only', () => {
  const l = v8();
  l.act({ action: 'ack', n: 4, ver: 1 });
  assert.deepEqual(unsent(l.state()), [], 'an answer on another board');
  assert.equal(unsent(l.state(), { board: 'b2' }).length, 1);
  assert.deepEqual(unsent(l.state(), {}), [], 'no open board, no row');
  assert.deepEqual(unsent(l.state(), { board: 'b2', agent: A }), [], 'agents are never told it');
});

test('arranging the board is not an answer: pin, size, mode and a move between containers', () => {
  const l = v8();
  l.act({ action: 'pin', n: 1, x: 10, y: 20 });
  l.act({ action: 'size', n: 1, size: 'l' });
  l.act({ action: 'mode', board: 'b', region: 'r', mode: 'list' });
  l.act({ action: 'move', n: 2, region: 'r' });
  assert.deepEqual(unsent(l.state()), []);
  assert.equal(carried(l.state(), 'b'), 0);
});

test('moves that count: into Later writes Later, out of it Reopen', () => {
  const l = v8();
  l.act({ action: 'move', n: 1, ver: 1, region: LATER_REGION });
  const later = l.act({ action: 'later', n: 1, ver: 1 });
  assert.deepEqual(unsent(l.state()).map((c) => c.seq), [later]);
  l.act({ action: 'send', board: 'b' });
  l.act({ action: 'move', n: 1, region: 'r' });
  const reopen = l.act({ action: 'reopen', n: 1, ver: 1 });
  assert.deepEqual(unsent(l.state()).map((c) => c.seq), [reopen]);
});

test('a note on a whole container counts; More context and a proposal turned down count', () => {
  const l = v8();
  l.v = 10;
  const note = l.act({ action: 'comment', board: 'b', region: 'q', text: 'On all of q.' });
  assert.deepEqual(unsent(l.state()).map((c) => c.seq), [note]);
  l.act({ action: 'send', board: 'b' });
  const ctx = l.act({ action: 'context', n: 2, ver: 1 });
  assert.deepEqual(unsent(l.state()).map((c) => c.seq), [ctx]);
  l.act({ action: 'send', board: 'b' });
  const p = l.agent(A, { type: 'propose', n: 1, ver: 1, action: 'drop', reason: 'The client declined.' });
  const reject = l.act({ action: 'reject', n: 1, proposal: p });
  assert.deepEqual(unsent(l.state()).map((c) => c.seq), [reject]);
});

test('a note written and removed before Send leaves nothing; an edited note still counts once', () => {
  const l = v8();
  const note = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why?' });
  l.act({ action: 'note-remove', n: 1, note });
  assert.deepEqual(unsent(l.state()), []);
  assert.equal(carried(l.state(), 'b'), 0, 'the Send message carries nothing either');
  const again = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why now?' });
  l.act({ action: 'note-edit', n: 1, note: again, text: 'Why this week?' });
  assert.deepEqual(unsent(l.state()).map((c) => c.seq), [again], 'the edit is folded into the note');
});

test('the agent\'s own lines never make something new to send', () => {
  const l = v8();
  const ask = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why?' });
  l.act({ action: 'send', board: 'b' });
  l.agent(A, { type: 'reply', n: 1, text: 'Because.', to: ask });
  l.node(A, 1, 2, { region: 'r', body: 'Changed.' });
  assert.deepEqual(unsent(l.state()), []);
});

for (const file of FIXTURES) {
  const name = file.split('/').at(-1)!;
  test(`on ${name}, every board: unsent exactly when the Send message would carry something`, () => {
    const read = readLedger(fs.readFileSync(file, 'utf8').trim().split('\n'));
    assert.deepEqual(read.problems, []);
    const s = foldLedger(read.events);
    for (const board of s.boards.keys()) assert.equal(unsent(s, { board }).length > 0, carried(s, board) > 0, board);
  });
}
