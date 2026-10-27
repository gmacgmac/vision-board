// Board heads in the fold (BE_01): `state.heads` is each board's own last line, kept by
// `applyEvent`, so the server's `list_boards` and the page's incremental apply read one value. It
// must equal what `list_boards` gave before the swap: a walk over the event list with `eventBoard`
// against the final state (kept here as the oracle), on every fixture ledger, folded at once and
// line by line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { LedgerEvent } from '#format';
import { isPrivateAct, readLedger } from '#format';
import type { LedgerState } from '../src/index.ts';
import { applyEvent, boardList, emptyState, eventBoard, foldLedger } from '../src/index.ts';
import { scene } from './ledger-v3.ts';

const FIXTURES = [
  '../../format/fixtures/roadmap.ledger.jsonl',
  '../../format/fixtures/login-review.ledger.jsonl',
  '../../format/fixtures/login-layout.ledger.jsonl',
  '../../../apps/board/src/gallery/gallery.ledger.jsonl',
];

const eventsOf = (file: string): LedgerEvent[] => {
  const read = readLedger(fs.readFileSync(new URL(file, import.meta.url), 'utf8').trim().split('\n'));
  assert.deepEqual(read.problems, [], file);
  return read.events;
};

/** The pre-fold definition (`boardHeads`), kept as the oracle. */
function walkedHeads(s: LedgerState, events: readonly LedgerEvent[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of events) {
    const board = eventBoard(s, e);
    // The person's board seen is not a line of the board's own (api.md 87): it never moves the head.
    // Nor does the person's flag, which no agent may see (api.md 128; the gallery ledger has flags from v12).
    if (board !== undefined && !(e.type === 'seen' && 'board' in e) && !isPrivateAct(e)) out.set(board, e.seq);
  }
  return out;
}

for (const file of FIXTURES) {
  const name = file.split('/').at(-1)!;
  test(`heads: the fold equals the event walk on ${name}, at once and line by line`, () => {
    const events = eventsOf(file);
    const whole = foldLedger(events);
    assert.deepEqual(whole.heads, walkedHeads(whole, events));
    assert.ok(whole.heads.size > 0);
    const s = emptyState();
    events.forEach((e, i) => {
      applyEvent(s, e);
      const prefix = events.slice(0, i + 1);
      assert.deepEqual(s.heads, walkedHeads(foldLedger(prefix), prefix), `after seq ${e.seq}`);
    });
  });
}

test('boardList: every board with its title and its own last line, in the order drawn', () => {
  const events = eventsOf(FIXTURES[3]!);
  const s = foldLedger(events);
  const list = boardList(s);
  assert.deepEqual(list.map((b) => b.board), [...s.boards.keys()]);
  for (const b of list) assert.deepEqual(b, { board: b.board, title: s.boards.get(b.board)!.title, seq: s.heads.get(b.board) });
  assert.deepEqual(boardList(emptyState()), []);
});

// The person's board seen in the fold (api.md 87): its own map, never a board head.
test('a board seen keeps the highest head and moves no board head; the node form is unchanged', () => {
  const l = scene();
  l.v = 8;
  const head = l.state().heads.get('b')!;
  l.seenBoard('b', head);
  l.seenBoard('b', 2);
  l.seen(1, 1);
  const s = l.state();
  assert.equal(s.seenBoards.get('b'), head);
  assert.equal(s.heads.get('b'), l.seq, 'the node seen is on board b, as before');
  l.seenBoard('b', l.seq);
  assert.equal(l.state().heads.get('b'), s.heads.get('b'), 'the board seen is not');
  assert.equal(l.state().seen.get(1), 1);
});
