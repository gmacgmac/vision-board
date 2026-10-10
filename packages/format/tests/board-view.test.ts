import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { boardView, foldDrawn, readLedger, validateView } from '../src/index.ts';

const lines = fs.readFileSync(
  new URL('../fixtures/login-review.ledger.jsonl', import.meta.url), 'utf8').trim().split('\n');
const { events } = readLedger(lines);
const BOARD = 'login-review';

test('format alone folds a ledger into a valid View', () => {
  const view = boardView(foldDrawn(events), BOARD);
  assert.deepEqual(validateView(view), []);
  assert.equal(view.version, events.length);
  assert.ok(view.nodes.length > 0);
});

test('the person\'s events do not change what was drawn', () => {
  const drawnOnly = events.filter((e) => ['board', 'region', 'node', 'link', 'unlink'].includes(e.type));
  const a = boardView(foldDrawn(events), BOARD);
  const b = boardView(foldDrawn(drawnOnly), BOARD);
  assert.deepEqual({ ...a, version: 0 }, { ...b, version: 0 });
});

test('an unknown board is refused', () => {
  assert.throws(() => boardView(foldDrawn(events), 'ghost'), /unknown board/);
});

// Every card shows its number (every-node PLAN ruling 1); an old `item` mark is ignored (ruling 8).
test('every node carries its number, an item or not', () => {
  const view = boardView(foldDrawn(events), BOARD);
  for (const node of view.nodes) assert.equal(node.n, Number(node.id), node.id);
  assert.ok(events.some((e) => e.type === 'node' && !e.node.item), 'the fixture has a node with no item mark');
});

test('an old item mark never reaches the view', () => {
  const view = boardView(foldDrawn(events), BOARD);
  for (const node of view.nodes) assert.equal('item' in node, false, node.id);
  const unmarked = events.map((e) => (e.type === 'node' ? { ...e, node: { ...e.node, item: undefined } } : e));
  assert.deepEqual(boardView(foldDrawn(unmarked), BOARD), view);
});
