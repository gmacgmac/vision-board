// The person's hidden notes (api.md 156): a private mark on any card, the flag's twin, folded for the
// page only. The latest of a card's `notes-hide` and `notes-show` decides; no agent read shows it:
// not check_responses, the Send message, Send's "something new" test, a head, seen, NEW or any
// condition; and the act rules take it on any card from the person only. On board b2 card 4 is
// number 1, so the page's keys are checked in board numbers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent } from '../../format/src/index.ts';
import { PRIVATE_ACTIONS, boardView, eventProblems, isPrivateAct, readLedger } from '../../format/src/index.ts';
import type { LedgerState } from '../src/index.ts';
import {
  ACTIONS, boardList, boardState, conditionsOf, nodeDetail, notesHiddenOn, openItems, replyScope, replyText, responsesAfter, validateAct,
} from '../src/index.ts';
import { A, scene } from './ledger-v3.ts';

/** The scene at v18, the person having looked at both boards. */
function seen() {
  const l = scene();
  l.v = 18;
  l.seenBoard('b', l.seq);
  l.seenBoard('b2', l.seq);
  return l;
}

/** Everything an agent or the Send reads about board `board`, to compare before and after a mark. */
const agentSide = (s: LedgerState, board: string) => ({
  acts: responsesAfter(s, board, 0), scope: [...replyScope(s, board, 0).cards], conditions: conditionsOf(s, { board }),
  agent: conditionsOf(s, { board, agent: A }), open: openItems(s, board), list: boardList(s), seen: [...s.seen],
  heads: [s.heads.get(board), s.drawnHeads.get(board), s.agentHeads.get(board)], node: nodeDetail(s, board === 'b' ? 1 : 4),
  // The first line names the ledger's position (`head`), which every line moves, any board's: not a board head.
  reply: replyText(boardView(s, board), boardState(s, board)).split('\n').slice(1),
});

test('notes-hide and notes-show are the registry\'s person-only marks, private like the flag', () => {
  for (const id of ['notes-hide', 'notes-show'] as const) {
    assert.deepEqual([ACTIONS[id].by, ACTIONS[id].onItem, PRIVATE_ACTIONS.has(id)], ['person', false, true], id);
    assert.equal(isPrivateAct({ type: 'act', action: id }), true, id);
  }
  assert.deepEqual([ACTIONS['notes-hide'].label, ACTIONS['notes-show'].label], ['Hide notes', 'Show notes']);
});

test('the latest of notes-hide and notes-show decides; the page reads it by board number; a retired card has left', () => {
  const l = seen();
  assert.equal(boardState(l.state(), 'b').notesHidden, undefined, 'left out while no card has its notes hidden');
  l.act({ action: 'notes-hide', n: 4 });
  l.act({ action: 'notes-hide', n: 2 });
  l.act({ action: 'notes-hide', n: 1 });
  l.act({ action: 'notes-show', n: 2 });
  l.act({ action: 'notes-hide', n: 1 });
  const s = l.state();
  assert.deepEqual([...boardState(s, 'b').notesHidden!], [['1', s.notesHidden.get(1)]], 'with the seq of its latest notes-hide (card-polish FE_02)');
  assert.ok(s.notesHidden.get(1)! > s.notesHidden.get(4)!, 'the second notes-hide on card 1 is the one kept');
  assert.deepEqual([...boardState(s, 'b2').notesHidden!.keys()], ['1'], 'card 4 is board b2\'s card 1');
  assert.deepEqual(notesHiddenOn(s, 'b2'), [4]);
  l.act({ action: 'notes-show', n: 1 });
  assert.equal(boardState(l.state(), 'b').notesHidden, undefined);
  l.act({ action: 'notes-hide', n: 1 });
  l.agent(A, { type: 'retire', board: 'b', cards: [1] });
  assert.equal(boardState(l.state(), 'b').notesHidden, undefined);
});

test('a redraw keeps the mark, and it is no flag', () => {
  const l = seen();
  l.act({ action: 'notes-hide', n: 1 });
  l.agent(A, { type: 'node', board: 'b', n: 1, ver: 2, node: { region: 'r', kind: 'finding', title: 'Redrawn' } });
  const s = l.state();
  assert.deepEqual([...boardState(s, 'b').notesHidden!.keys()], ['1']);
  assert.deepEqual([...boardState(s, 'b').flags], []);
});

test('no agent read changes when the person hides or shows a card\'s notes, and Send has nothing new', () => {
  for (const board of ['b', 'b2']) {
    const l = seen();
    l.act({ action: 'comment', n: board === 'b' ? 1 : 4, ver: 1, text: 'Why?' });
    const before = agentSide(l.state(), board);
    const unsent = conditionsOf(l.state(), { board }).filter((c) => c.kind === 'board.unsent');
    l.act({ action: 'notes-hide', n: board === 'b' ? 1 : 4 });
    l.act({ action: 'notes-hide', n: board === 'b' ? 2 : 4 });
    l.act({ action: 'notes-show', n: board === 'b' ? 2 : 4 });
    const s = l.state();
    assert.deepEqual(agentSide(s, board), before, board);
    assert.deepEqual(conditionsOf(s, { board }).filter((c) => c.kind === 'board.unsent'), unsent, `${board}: hidden notes are no answer`);
    assert.equal(s.acts.some((e) => e.action === 'notes-hide' || e.action === 'notes-show'), false);
  }
});

const act = (f: Partial<ActEvent>): ActEvent =>
  ({ v: 18, seq: 999, at: '2026-10-19T10:00:00Z', by: 'person', type: 'act', action: 'notes-hide', id: 1, ...f });

test('validateAct: the person hides any card\'s notes; an agent never does; the ledger refuses a retired card', () => {
  const l = seen();
  l.agent(A, { type: 'node', board: 'b', n: 5, ver: 1, node: { region: 'r', kind: 'topic', title: 'A topic' } });
  const s = l.state();
  for (const f of [{}, { id: 5 }, { action: 'notes-show' as const }]) assert.deepEqual(validateAct(act(f), s, 'b'), [], JSON.stringify(f));
  assert.match(validateAct(act({ by: 'agent', agent: A }), s, 'b')[0]!, /only the person/);
  assert.match(validateAct(act({ id: 4 }), s, 'b')[0]!, /is on board "b2", not "b"/);
  l.agent(A, { type: 'retire', board: 'b', cards: [5] });
  const line = (f: object) => JSON.stringify({ v: 18, seq: l.seq + 1, at: '2026-10-19T10:00:00Z', by: 'person', type: 'act', action: 'notes-hide', n: 5, ...f });
  assert.match(readLedger([...l.lines, line({})]).problems.join(), /card 5 is retired/);
  assert.deepEqual(eventProblems(JSON.parse(line({ n: 1 }))), []);
  assert.match(eventProblems(JSON.parse(line({ n: 1, ver: 1 }))).join(), /names one card with n, and nothing else/);
  assert.match(eventProblems(JSON.parse(line({ n: 1, region: 'r' }))).join(), /names one card with n, and nothing else/);
});
