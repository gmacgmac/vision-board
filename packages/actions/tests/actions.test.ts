import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { ActEvent } from '../../format/src/index.ts';
import { boardView, eventProblems, KINDS, NODE_TYPES, readLedger, toLine } from '../../format/src/index.ts';
import { boardState, counts, foldLedger, ITEM_ACTIONS, statusOf, validateAct, MAX_TEXT } from '../src/index.ts';

const BOARD = 'roadmap';
const lines = fs.readFileSync(
  new URL(`../../format/fixtures/${BOARD}.ledger.jsonl`, import.meta.url), 'utf8').trim().split('\n');

/** An act line as the file holds it: the card's identity in `n`. */
type ActLine = Partial<Omit<ActEvent, 'id'>> & { n?: number };

/** The fixture ledger plus `extra` person acts (seq and at stamped in order), checked, then folded. */
function load(extra: ActLine[] = []) {
  const more = extra.map((f, i) => JSON.stringify(
    { v: 2, seq: lines.length + i + 1, at: `2026-10-02T10:00:0${i}Z`, by: 'person', type: 'act', ...f }));
  const read = readLedger([...lines, ...more]);
  assert.deepEqual(read.problems, []);
  return foldLedger(read.events);
}

const state = load();
const view = boardView(state, BOARD);
/** The first card that needs an answer, and the first that doesn't (the kind decides, api.md 118). */
const item = view.nodes.find((x) => NODE_TYPES[x.kind].answer)!.n!;
const plain = view.nodes.find((x) => !NODE_TYPES[x.kind].answer && x.kind !== 'finding')!.n!;
const act = (f: Partial<ActEvent>): ActEvent =>
  ({ v: 2, seq: lines.length + 1, at: '2026-10-02T10:00:00Z', by: 'person', type: 'act', action: 'ack', id: item, ver: 1, ...f });

test('a valid person ack passes', () => assert.deepEqual(validateAct(act({}), state), []));

test('agents cannot take decisions', () => {
  for (const action of ['ack', 'drop', 'later', 'reopen', 'pin', 'mode'] as const)
    assert.ok(validateAct(act({ by: 'agent', action }), state).some((p) => p.includes('only the person')), action);
});

// comment and context are person-only since ledger v3 (api.md 19): an agent replies instead.
test('agents may not comment or ask for context either', () => {
  for (const action of ['comment', 'context'] as const)
    assert.ok(validateAct(act({ by: 'agent', action, text: 'hi' }), state).some((p) => p.includes('only the person')), action);
});

test('a card refuses a review action its kind does not offer; an unknown node is refused', () => {
  assert.ok(validateAct(act({ id: plain }), state).some((p) => p.includes("doesn't offer this")));
  assert.ok(validateAct(act({ id: 999 }), state).some((p) => p.includes('unknown')));
});

test('comment needs text; text is capped', () => {
  assert.ok(validateAct(act({ action: 'comment', text: '  ' }), state).includes('text: required'));
  assert.ok(eventProblems(toLine(act({ action: 'comment', text: 'x'.repeat(MAX_TEXT + 1) }))).length);
});

test('unknown action is rejected', () =>
  assert.equal(validateAct({ ...act({}), action: 'delete' } as unknown as ActEvent, state).length, 1));

test('fold: last action wins, notes accumulate, reopen reopens', () => {
  const s = load([
    { action: 'comment', n: item, ver: 1, text: 'why?' },
    { action: 'ack', n: item, ver: 1 },
    { action: 'reopen', n: item, ver: 1 },
    { action: 'context', n: item, ver: 1, text: 'more' },
  ]);
  assert.equal(statusOf(boardState(s, BOARD), String(item)), 'context');
  assert.deepEqual(s.items.get(item)!.notes.map((x) => x.kind), ['comment', 'context']);
});

test('fold: pins, unpins and modes', () => {
  const region = view.regions[0]!.id;
  const s = load([
    { action: 'pin', n: plain, x: 1, y: 2 },
    { action: 'pin', n: item, x: 3, y: 4 },
    { action: 'unpin', n: plain },
    { action: 'mode', board: BOARD, region, mode: 'grid' },
  ]);
  assert.deepEqual([...s.pins], [[item, { x: 3, y: 4 }]]);
  assert.equal(s.modes.get(BOARD)!.get(region), 'grid');
});

test('counts split decided, later and open, over the cards that need an answer', () => {
  const items = view.nodes.filter((x) => NODE_TYPES[x.kind].answer).map((x) => x.n!);
  const s = load([{ action: 'ack', n: items[0], ver: 1 }, { action: 'later', n: items[1], ver: 1 }]);
  const c = counts(boardView(s, BOARD), boardState(s, BOARD));
  assert.deepEqual(c, { total: items.length, decided: 1, later: 1, open: items.length - 2 });
});

// Node types decide which review actions a card offers (D-015, components.md); the kind decides
// (api.md 118): five on a question, decision or action, three on any other kind.
/** The fixture plus a topic and a note that an old line marked `item`, which every reader ignores. */
function withNumberedPlain() {
  const nodes = (['topic', 'note'] as const).map((kind, i) => JSON.stringify({
    v: 2, seq: lines.length + 1 + i, at: `2026-10-02T09:30:0${i}Z`, by: 'agent', agent: 'kiro', type: 'node',
    board: BOARD, n: 100 + i, ver: 1, node: { region: 'review', kind, title: `Numbered ${kind}`, item: true },
  }));
  const read = readLedger([...lines, ...nodes]);
  assert.deepEqual(read.problems, []);
  return foldLedger(read.events);
}
const finding = view.nodes.find((x) => x.kind === 'finding')!.n!;

test('a finding offers no decision: ack and drop are refused, naming the kind', () => {
  for (const action of ['ack', 'drop'] as const)
    assert.deepEqual(validateAct(act({ id: finding, action }), state), [`${action}: a finding doesn't offer this`]);
});

test('a finding offers comment, context and later', () => {
  for (const action of ['comment', 'context', 'later'] as const)
    assert.deepEqual(validateAct(act({ id: finding, action, text: 'why' }), state), [], action);
});

test('a topic or note offers comment, context and later and never a decision, an old item mark or not', () => {
  const s = withNumberedPlain();
  for (const [n, kind] of [[100, 'topic'], [101, 'note']] as const) {
    for (const action of ['ack', 'drop'] as const)
      assert.deepEqual(validateAct(act({ id: n, action }), s), [`${action}: a ${kind} doesn't offer this`], `${kind} ${action}`);
    for (const action of ['comment', 'context', 'later'] as const)
      assert.deepEqual(validateAct(act({ id: n, action, text: 'why' }), s), [], `${kind} ${action}`);
  }
});

test('reopen, pin and unpin are not restricted by type', () => {
  const s = withNumberedPlain();
  for (const n of [100, 101])
    for (const action of ['reopen', 'pin', 'unpin'] as const)
      assert.deepEqual(validateAct(act({ id: n, action }), s), [], `${n} ${action}`);
});

// Lives here, not in packages/format: format may not import actions (D-016).
test('every action a node type lists is a review action', () => {
  for (const kind of KINDS)
    for (const a of NODE_TYPES[kind].actions) assert.ok(ITEM_ACTIONS.includes(a), `${kind}: ${a}`);
});
