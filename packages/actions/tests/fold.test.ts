import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { ActEvent, LedgerEvent } from '../../format/src/index.ts';
import { boardView, readLedger, validateView } from '../../format/src/index.ts';
import { boardState, foldLedger, replyText, validateAct } from '../src/index.ts';

const lines = fs.readFileSync(
  new URL('../../format/fixtures/login-review.ledger.jsonl', import.meta.url), 'utf8').trim().split('\n');
const read = readLedger(lines);
const state = foldLedger(read.events);
const BOARD = 'login-review';
const titles = (events: LedgerEvent[]) =>
  Object.fromEntries(boardView(foldLedger(events), BOARD).nodes.map((x) => [x.id, x.title]));

test('readLedger returns every valid event and no problems', () => {
  assert.deepEqual(read.problems, []);
  assert.equal(read.events.length, lines.length);
  assert.equal(read.index.maxId, 4);
});

test('fold: statuses and notes follow the item rules', () => {
  assert.equal(state.items.get(1)!.status, 'commented');
  assert.deepEqual(state.items.get(1)!.notes.map((x) => [x.kind, x.text]), [['comment', 'Who asked for it?']]);
  assert.equal(state.items.get(3)!.status, 'dropped');
  assert.equal(state.items.get(4)!.status, 'later');
  assert.equal(state.items.has(2), false);
});

test('fold: every agent update is a version; the latest is the last', () => {
  const n1 = state.nodes.get(1)!;
  assert.deepEqual(n1.versions.map((x) => x.ver), [1, 2]);
  assert.equal(n1.versions[1]!.body, 'Support asked for it in the March survey.');
  assert.equal(state.seen.get(1), 2);
  assert.equal(state.seq, 15);
});

test('fold: the parked bundle, the reply and the accepted proposal', () => {
  assert.equal(state.parks.get(4)!.recommendation, 'Add a per-account limit next sprint.');
  assert.deepEqual(state.replies.get(1)!.map((r) => r.to), [8]);
  const prop = state.proposals.get(13)!;
  assert.deepEqual([prop.id, prop.action, prop.decidedBy, prop.agent], [3, 'drop', 15, 'kiro']);
});

test('boardView is a valid view keyed by String(n); every node carries n (api.md 118)', () => {
  const view = boardView(state, BOARD);
  assert.deepEqual(validateView(view), []);
  assert.equal(view.version, 15);
  assert.deepEqual(view.nodes.map((x) => [x.id, x.n]), [['1', 1], ['2', 2], ['3', 3], ['4', 4]]);
  assert.deepEqual(view.links, [{ from: '2', to: '1' }]);
  assert.throws(() => boardView(state, 'ghost'), /unknown board/);
});

test('boardState is keyed like boardView', () => {
  const s = boardState(state, BOARD);
  assert.deepEqual([...s.items.keys()].sort(), ['1', '3', '4']);
  assert.equal(s.items.get('3')!.status, 'dropped');
});

// A board number is a card's place in its board's drawing order, which an append-only ledger never
// changes (api.md 125): a redraw keeps it, and a retired card keeps its number, so no other moves
// and none is given twice (api.md 126, assumption C).
test('ids do not change when a card is redrawn or one is retired (rule 10)', () => {
  const all = titles(read.events);
  const at = '2026-10-02T10:00:00Z';
  const redraw: LedgerEvent = { v: 12, seq: 16, at, by: 'agent', agent: 'kiro', type: 'node', board: BOARD, id: 3, ver: 2, node: { region: 'findings', kind: 'decision', title: 'Redrawn' } };
  assert.deepEqual(titles([...read.events, redraw]), { ...all, 3: 'Redrawn' });
  const retire: LedgerEvent = { v: 12, seq: 16, at, by: 'agent', agent: 'kiro', type: 'retire', board: BOARD, cards: [2] };
  const { '2': _gone, ...others } = all;
  assert.deepEqual(titles([...read.events, retire]), others);
});

test('replyText reads boardView + boardState', () => {
  assert.equal(replyText(boardView(state, BOARD), boardState(state, BOARD)), [
    'Board "Login page review" (v15)', '1 (question): comment: Who asked for it?', '3 (decision): drop', '4 (risk): saved for later',
    'Nothing left open.',
  ].join('\n'));
});

const act = (f: Partial<ActEvent>): ActEvent =>
  ({ v: 2, seq: 16, at: '2026-10-02T10:00:00Z', by: 'person', type: 'act', action: 'ack', id: 1, ver: 2, ...f });

test('validateAct follows the registry', () => {
  assert.deepEqual(validateAct(act({}), state), []);
  assert.ok(validateAct(act({ by: 'agent' }), state).some((p) => p.includes('only the person')));
  assert.ok(validateAct(act({ by: 'agent', action: 'comment', text: 'hi' }), state).some((p) => p.includes('only the person')));
  assert.ok(validateAct(act({ id: 2 }), state).some((p) => p.includes("a topic doesn't offer this")));
  assert.ok(validateAct(act({ id: 99 }), state).some((p) => p.includes('unknown node')));
  assert.ok(validateAct(act({ action: 'comment', text: ' ' }), state).includes('text: required'));
  assert.deepEqual(validateAct(act({ action: 'mode', board: BOARD, region: 'findings', mode: 'column' }), state), []);
  assert.ok(validateAct(act({ action: 'mode', board: BOARD, region: 'nope', mode: 'column' }), state)
    .some((p) => p.includes('region: unknown')));
});
