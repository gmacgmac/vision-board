// The person's bookmark (field report batch 2 ruling 3, assumption A, api.md 128, 182; D-099 2): a private mark on any
// card, folded for the page only. No agent read shows it: not check_responses, the Send message,
// Send's "something new" test, a head, seen, NEW or any condition; and the act rules take it on
// any card from the person only. On board b2 card 4 is number 1, so the page's keys are checked
// in board numbers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent } from '#format';
import { boardView, readLedger, LEDGER_FORMAT } from '#format';
import type { LedgerState } from '../src/index.ts';
import {
  boardList, boardState, conditionsOf, bookmarksOn, nodeDetail, openItems, replyScope, replyText, responsesAfter, validateAct,
} from '../src/index.ts';
import { A, scene } from './ledger-v3.ts';

/** The scene at v20, the person having looked at both boards. */
function seen() {
  const l = scene();
  l.seenBoard('b', l.seq);
  l.seenBoard('b2', l.seq);
  return l;
}

/** Everything an agent or the Send reads about board `board`, to compare before and after a bookmark. */
const agentSide = (s: LedgerState, board: string) => ({
  acts: responsesAfter(s, board, 0), scope: [...replyScope(s, board, 0).cards], conditions: conditionsOf(s, { board }),
  agent: conditionsOf(s, { board, agent: A }), open: openItems(s, board), list: boardList(s), seen: [...s.seen],
  heads: [s.heads.get(board), s.drawnHeads.get(board), s.agentHeads.get(board)], node: nodeDetail(s, board === 'b' ? 1 : 4),
  // The first line names the ledger's position (`head`), which every line moves, any board's: not a board head.
  reply: replyText(boardView(s, board), boardState(s, board)).split('\n').slice(1),
});

test('bookmark and unbookmark: the page reads its bookmarks by board number; a retired card has left', () => {
  const l = seen();
  l.act({ action: 'bookmark', n: 4 });
  l.act({ action: 'bookmark', n: 2 });
  l.act({ action: 'bookmark', n: 1 });
  l.act({ action: 'unbookmark', n: 2 });
  const s = l.state();
  assert.deepEqual([...boardState(s, 'b').bookmarks], ['1']);
  assert.deepEqual([...boardState(s, 'b2').bookmarks], ['1'], 'card 4 is board b2\'s card 1');
  assert.deepEqual(bookmarksOn(s, 'b2'), [4]);
  l.agent(A, { type: 'retire', board: 'b', cards: [1] });
  assert.deepEqual([...boardState(l.state(), 'b').bookmarks], []);
});

test('no agent read changes when the person bookmarks a card or takes it off, and Send has nothing new', () => {
  for (const board of ['b', 'b2']) {
    const l = seen();
    l.act({ action: 'comment', n: board === 'b' ? 1 : 4, ver: 1, text: 'Why?' });
    const before = agentSide(l.state(), board);
    const unsent = conditionsOf(l.state(), { board }).filter((c) => c.kind === 'board.unsent');
    l.act({ action: 'bookmark', n: board === 'b' ? 1 : 4 });
    l.act({ action: 'bookmark', n: board === 'b' ? 2 : 4 });
    l.act({ action: 'unbookmark', n: board === 'b' ? 2 : 4 });
    const s = l.state();
    assert.deepEqual(agentSide(s, board), before, board);
    assert.deepEqual(conditionsOf(s, { board }).filter((c) => c.kind === 'board.unsent'), unsent, `${board}: a bookmark is no answer`);
    assert.equal(s.acts.some((e) => e.action === 'bookmark' || e.action === 'unbookmark'), false);
  }
  const quiet = seen();
  const before = conditionsOf(quiet.state(), { board: 'b' }).filter((c) => c.kind === 'board.unsent');
  quiet.act({ action: 'bookmark', n: 3 });
  assert.deepEqual([before, conditionsOf(quiet.state(), { board: 'b' }).filter((c) => c.kind === 'board.unsent')], [[], []],
    'a bookmark alone leaves Send to agent with nothing to send');
});

test('a bookmark is not seeing the card: NEW and updates stay', () => {
  const l = seen();
  l.agent(A, { type: 'node', board: 'b', n: 5, ver: 1, node: { region: 'r', kind: 'finding', title: 'Fresh' } });
  const fresh = (s: LedgerState) => conditionsOf(s, { board: 'b' }).filter((c) => c.kind === 'item.new').map((c) => c.id);
  assert.deepEqual(fresh(l.state()), [5]);
  l.act({ action: 'bookmark', n: 5 });
  assert.deepEqual([fresh(l.state()), l.state().seen.has(5)], [[5], false]);
});

const act = (f: Partial<ActEvent>): ActEvent =>
  ({ v: LEDGER_FORMAT, seq: 999, at: '2026-10-11T10:00:00Z', by: 'person', type: 'act', action: 'bookmark', id: 1, ...f });

test('validateAct: the person bookmarks any card of any kind; an agent never does; the ledger refuses a retired card', () => {
  const l = seen();
  l.agent(A, { type: 'node', board: 'b', n: 5, ver: 1, node: { region: 'r', kind: 'topic', title: 'A topic' } });
  const s = l.state();
  for (const f of [{}, { id: 5 }, { action: 'unbookmark' as const }]) assert.deepEqual(validateAct(act(f), s, 'b'), [], JSON.stringify(f));
  assert.match(validateAct(act({ by: 'agent', agent: A }), s, 'b')[0]!, /only the person/);
  assert.match(validateAct(act({ id: 4 }), s, 'b')[0]!, /is on board "b2", not "b"/);
  l.agent(A, { type: 'retire', board: 'b', cards: [5] });
  const read = readLedger([...l.lines, JSON.stringify({ v: LEDGER_FORMAT, seq: l.seq + 1, at: '2026-10-11T10:00:00Z', by: 'person', type: 'act', action: 'bookmark', n: 5 })]);
  assert.match(read.problems.join(), /card 5 is retired/);
});
