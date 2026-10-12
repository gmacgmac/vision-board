// Archiving a board in the action layer (N39 rulings 1-9, api.md 135-137): the fold keeps the
// archived set and each board's dates; `boardVisibility` is the one check; the board list, the
// conditions and the linked cards leave an archived board out; archive and restore are the
// person's, moving no head and reaching no agent; every other line on an archived board is refused
// (an agent's in words that say nothing of it); restore brings everything back as it was.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent, LedgerEvent } from '../../format/src/index.ts';
import { readLedger } from '../../format/src/index.ts';
import type { LedgerState } from '../src/index.ts';
import {
  applyEvent, archivedBoards, archivedProblem, boardList, boardVisibility, conditionsOf, emptyState, foldLedger, linkedDetails,
  responsesAfter, UNAVAILABLE, validateAct, visibleToAgents,
} from '../src/index.ts';
import { A, Ledger, scene } from './ledger-v3.ts';

const AT = '2026-10-12T09:00:00Z';
/** A person act as the server would stamp it next, for `validateAct`. */
const asAct = (s: LedgerState, e: object): ActEvent => ({ v: 14, seq: s.seq + 1, at: AT, by: 'person', type: 'act', ...e }) as ActEvent;

/** The scene (boards `b` and `b2`), then the person archives `b2`. */
function archived(): { l: Ledger; at: number } {
  const l = scene();
  l.v = 14;
  const at = l.act({ action: 'archive', board: 'b2' });
  return { l, at };
}

test('the fold keeps the archived set: archive adds the board, restore takes it out', () => {
  const { l, at } = archived();
  assert.deepEqual([...l.state().archived], [['b2', at]]);
  l.act({ action: 'restore', board: 'b2' });
  assert.deepEqual([...l.state().archived], []);
});

test('boardVisibility: visible, archived or unknown; the one check behind visibleToAgents', () => {
  const s = archived().l.state();
  assert.deepEqual(['b', 'b2', 'nope'].map((b) => boardVisibility(s, b)), ['visible', 'archived', 'unknown']);
  assert.deepEqual(['b', 'b2', 'nope'].map((b) => visibleToAgents(s, b)), [true, false, false]);
});

test('archive and restore move no head and no date, see no card, and no agent reads them', () => {
  const l = scene();
  const before = l.state();
  l.v = 14;
  l.act({ action: 'archive', board: 'b2' });
  l.act({ action: 'restore', board: 'b2' });
  const s = l.state();
  assert.deepEqual(s.heads, before.heads);
  assert.deepEqual(s.dates, before.dates);
  assert.deepEqual(s.seen, before.seen);
  assert.equal(s.acts.length, before.acts.length, 'not among the acts check_responses reads');
  assert.deepEqual(responsesAfter(s, 'b2', 0), []);
  assert.deepEqual(s.unsent.get('b2'), before.unsent.get('b2'));
});

test('dates: each board\'s first line and its own last line', () => {
  const s = scene().state();
  const at = (seq: number) => JSON.parse(scene().lines[seq - 1]!).at as string;
  assert.deepEqual(s.dates.get('b2'), { created: at(12), updated: at(14) });
  assert.deepEqual(s.dates.get('b'), { created: at(4), updated: at(11) });
});

test('boardList leaves an archived board out; archivedBoards lists it, the latest archived first', () => {
  const { l, at } = archived();
  l.agent(A, { type: 'board', board: 'b3', title: 'Board three' });
  const third = l.act({ action: 'archive', board: 'b3' });
  const s = l.state();
  assert.deepEqual(boardList(s).map((b) => b.board), ['b']);
  assert.deepEqual(archivedBoards(s).map(({ board, title, archived: seq }) => [board, title, seq]), [['b3', 'Board three', third], ['b2', 'Board two', at]]);
  assert.deepEqual(archivedBoards(s)[1]!.updated, s.dates.get('b2')!.updated);
});

test('restore brings it all back: the list, the heads, the conditions, as before the archive', () => {
  const l = scene();
  const before = l.state();
  l.v = 14;
  l.act({ action: 'archive', board: 'b2' });
  l.act({ action: 'restore', board: 'b2' });
  const s = l.state();
  assert.deepEqual(boardList(s), boardList(before));
  assert.deepEqual(conditionsOf(s, {}), conditionsOf(before, {}));
  assert.deepEqual(archivedBoards(s), []);
});

test('conditions: an archived board carries no row and no picker mark; asked about by name, it still answers', () => {
  const s = archived().l.state();
  assert.deepEqual(conditionsOf(s, {}).filter((c) => c.board === 'b2'), []);
  assert.deepEqual(conditionsOf(s, { board: 'b' }).filter((c) => c.board === 'b2'), [], 'no board.new mark beside the open board');
  assert.ok(conditionsOf(scene().state(), { board: 'b' }).some((c) => c.board === 'b2' && c.kind === 'board.new'), 'before, b2 was marked new');
});

test('validateAct: archive a board that exists and is not archived; restore one that is', () => {
  const { l } = archived();
  const s = l.state();
  assert.deepEqual(validateAct(asAct(s, { action: 'archive', board: 'b' }), s, 'b'), []);
  assert.deepEqual(validateAct(asAct(s, { action: 'restore', board: 'b2' }), s, 'b2'), []);
  assert.deepEqual(validateAct(asAct(s, { action: 'archive', board: 'b2' }), s, 'b2'), ['board: "b2" is already archived']);
  assert.deepEqual(validateAct(asAct(s, { action: 'restore', board: 'b' }), s, 'b'), ['board: "b" isn\'t archived']);
  assert.deepEqual(validateAct(asAct(s, { action: 'archive', board: 'nope' }), s), ['board: unknown "nope"']);
  assert.deepEqual(validateAct(asAct(s, { action: 'archive', board: 'b' }), s, 'b2'), ['board: this act names board "b" but was sent to board "b2"']);
});

test('validateAct: only the person archives or restores (rule 8)', () => {
  const s = scene().state();
  for (const action of ['archive', 'restore']) {
    const e = { ...asAct(s, { action, board: 'b' }), by: 'agent', agent: A } as ActEvent;
    assert.match(validateAct(e, s, 'b')[0]!, /only the person can do this/);
  }
});

test('on an archived board every other act is refused until it is restored', () => {
  const { l } = archived();
  const s = l.state();
  const acts = [
    { action: 'ack', id: 4, ver: 1 }, { action: 'comment', id: 4, ver: 1, text: 'Why?' }, { action: 'send', board: 'b2' },
    { action: 'mode', board: 'b2', region: 'x', mode: 'flow' }, { action: 'flag', id: 4 },
  ];
  for (const a of acts) assert.deepEqual(validateAct(asAct(s, a), s, 'b2'), ['board: "b2" is archived; restore it from the board picker first'], a.action);
  l.act({ action: 'restore', board: 'b2' });
  const back = l.state();
  for (const a of acts) assert.deepEqual(validateAct(asAct(back, a), back, 'b2'), [], a.action);
});

test('archivedProblem: an agent line on an archived board is refused in words that say nothing of it', () => {
  const s = archived().l.state();
  const line = (e: object) => ({ v: 14, seq: s.seq + 1, at: AT, ...e }) as LedgerEvent;
  const agent = { by: 'agent', agent: A };
  const lines = [
    line({ ...agent, type: 'board', board: 'b2', title: 'Mine now' }),
    line({ ...agent, type: 'region', board: 'b2', region: { id: 'y', title: 'Y', mode: 'grid' } }),
    line({ ...agent, type: 'node', board: 'b2', id: 99, ver: 1, node: { region: 'x', kind: 'note', title: 'T' } }),
    line({ ...agent, type: 'reply', id: 4, text: 'Done.' }),
    line({ ...agent, type: 'grant-request', board: 'b2', reason: 'Let me in.' }),
  ];
  for (const e of lines) {
    assert.equal(archivedProblem(s, e), UNAVAILABLE, e.type);
    assert.doesNotMatch(UNAVAILABLE, /b2|Board two|archiv/i);
  }
  assert.equal(archivedProblem(s, line({ ...agent, type: 'node', board: 'b', id: 99, ver: 1, node: { region: 'r', kind: 'note', title: 'T' } })), undefined);
  assert.equal(archivedProblem(s, line({ ...agent, type: 'join', label: 'New chat' })), undefined);
});

test('archivedProblem: the person may not rename it, but a seen still goes (a page leaving the board sends one)', () => {
  const s = archived().l.state();
  const person = (e: object) => ({ v: 14, seq: s.seq + 1, at: AT, by: 'person', ...e }) as LedgerEvent;
  assert.equal(archivedProblem(s, person({ type: 'board', board: 'b2', title: 'Renamed' })), 'board: "b2" is archived; restore it from the board picker first');
  assert.equal(archivedProblem(s, person({ type: 'seen', board: 'b2', head: s.seq })), undefined);
  assert.equal(archivedProblem(s, person({ type: 'seen', id: 4, ver: 1 })), undefined);
  assert.equal(archivedProblem(s, person({ type: 'act', action: 'restore', board: 'b2' })), undefined);
});

test('linkedDetails leaves out a card on an archived board (an old line linking two boards)', () => {
  const l = scene();
  l.agent(A, { type: 'link', from: 1, to: 4 });
  assert.deepEqual(linkedDetails(l.state(), 1).map((d) => d.board), ['b2']);
  l.v = 14;
  l.act({ action: 'archive', board: 'b2' });
  assert.deepEqual(linkedDetails(l.state(), 1), []);
});

test('folded line by line or at once, the archived set and the dates agree', () => {
  const { l } = archived();
  l.act({ action: 'restore', board: 'b2' });
  l.act({ action: 'archive', board: 'b' });
  const events = readLedger(l.lines).events;
  const s = emptyState();
  for (const e of events) applyEvent(s, e);
  const all = foldLedger(events);
  assert.deepEqual([[...s.archived], [...s.dates]], [[...all.archived], [...all.dates]]);
  assert.deepEqual([...all.archived.keys()], ['b']);
});
