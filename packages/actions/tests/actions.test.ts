import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { ActEvent } from '../../format/src/index.ts';
import { boardView, eventProblems, readLedger } from '../../format/src/index.ts';
import { boardState, counts, foldLedger, statusOf, validateAct, MAX_TEXT } from '../src/index.ts';

const BOARD = 'roadmap';
const lines = fs.readFileSync(
  new URL(`../../format/fixtures/${BOARD}.ledger.jsonl`, import.meta.url), 'utf8').trim().split('\n');

/** The fixture ledger plus `extra` person acts (seq and at stamped in order), checked, then folded. */
function load(extra: Partial<ActEvent>[] = []) {
  const more = extra.map((f, i) => JSON.stringify(
    { v: 2, seq: lines.length + i + 1, at: `2026-10-02T10:00:0${i}Z`, by: 'person', type: 'act', ...f }));
  const read = readLedger([...lines, ...more]);
  assert.deepEqual(read.problems, []);
  return foldLedger(read.events);
}

const state = load();
const view = boardView(state, BOARD);
const item = view.nodes.find((x) => x.n !== undefined)!.n!;
const plain = Number(view.nodes.find((x) => x.n === undefined)!.id);
const act = (f: Partial<ActEvent>): ActEvent =>
  ({ v: 2, seq: lines.length + 1, at: '2026-10-02T10:00:00Z', by: 'person', type: 'act', action: 'ack', n: item, ver: 1, ...f });

test('a valid person ack passes', () => assert.deepEqual(validateAct(act({}), state), []));

test('agents cannot take decisions', () => {
  for (const action of ['ack', 'drop', 'later', 'reopen', 'pin', 'mode'] as const)
    assert.ok(validateAct(act({ by: 'agent', action }), state).some((p) => p.includes('only the person')), action);
});

test('agents may comment', () =>
  assert.deepEqual(validateAct(act({ by: 'agent', action: 'comment', text: 'hi' }), state), []));

test('item actions reject non-item nodes and unknown nodes', () => {
  assert.ok(validateAct(act({ n: plain }), state).some((p) => p.includes('not a numbered item')));
  assert.ok(validateAct(act({ n: 999 }), state).some((p) => p.includes('unknown')));
});

test('comment needs text; text is capped', () => {
  assert.ok(validateAct(act({ action: 'comment', text: '  ' }), state).includes('text: required'));
  assert.ok(eventProblems(act({ action: 'comment', text: 'x'.repeat(MAX_TEXT + 1) })).length);
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

test('counts split decided, later and open', () => {
  const items = view.nodes.filter((x) => x.n !== undefined).map((x) => x.n!);
  const s = load([{ action: 'ack', n: items[0], ver: 1 }, { action: 'later', n: items[1], ver: 1 }]);
  const c = counts(boardView(s, BOARD), boardState(s, BOARD));
  assert.deepEqual(c, { total: items.length, decided: 1, later: 1, open: items.length - 2 });
});
