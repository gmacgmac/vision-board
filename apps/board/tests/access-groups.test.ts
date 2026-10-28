// Access requests grouped by bot (accessByBot flag, search-and-finding ACCESS_01, rulings 320/321):
// rows carry the asking agent's id; groups are by that id, in the order each bot first asked; two
// bots with one label are told apart by a number, never by an id; the group's words count what it asks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BoardData } from '../src/board/io.ts';
import type { AccessRequestRow } from '../src/board/access/index.ts';
import { allowAllWords, groupAskWords, groupByBot, requestRows } from '../src/board/access/index.ts';

const row = (seq: number, agent: string | undefined, label: string, container?: string): AccessRequestRow =>
  ({ seq, ...(agent !== undefined && { agent }), label, ...(container !== undefined && { container }), reason: `Reason ${seq}.` });

test('requestRows carries the agent id and the region\'s title', () => {
  const data = {
    view: { regions: [{ id: 'r1', title: 'Pricing thread' }] },
    access: { requests: [{ seq: 4, region: 'r1', reason: 'Why.', at: 'x', agent: 'a-1', label: 'build' }, { seq: 5, reason: 'All.', at: 'x', agent: 'a-1', label: 'build' }] },
  } as unknown as BoardData;
  assert.deepEqual(requestRows(data), [
    { seq: 4, agent: 'a-1', label: 'build', reason: 'Why.', container: 'Pricing thread' },
    { seq: 5, agent: 'a-1', label: 'build', reason: 'All.' },
  ]);
});

test('groupByBot: one group per agent id, in the order each bot first asked, its rows oldest first', () => {
  const groups = groupByBot([row(1, 'a', 'build', 'One'), row(2, 'b', 'docs'), row(3, 'a', 'build', 'Two'), row(4, 'a', 'build', 'Three')]);
  assert.deepEqual(groups.map((g) => [g.name, g.asks.map((r) => r.seq)]), [['build', [1, 3, 4]], ['docs', [2]]]);
});

test('groupByBot: two bots with one label are numbered in the order they asked; ids never show', () => {
  const groups = groupByBot([row(1, 'a', 'build', 'One'), row(2, 'b', 'build'), row(3, 'c', 'docs')]);
  assert.deepEqual(groups.map((g) => g.name), ['build (1)', 'build (2)', 'docs']);
  for (const g of groups) assert.doesNotMatch(g.name, /\ba\b|\bb\b|\bc\b/);
});

test('groupByBot: a request with no agent id stands alone; none is merged by label', () => {
  const groups = groupByBot([row(1, undefined, 'An agent', 'One'), row(2, undefined, 'An agent', 'Two')]);
  assert.deepEqual(groups.map((g) => g.asks.map((r) => r.seq)), [[1], [2]]);
});

test('groupAskWords counts containers and names the whole board', () => {
  const words = (rows: AccessRequestRow[]) => groupAskWords(groupByBot(rows)[0]!);
  assert.equal(words([row(1, 'a', 'x', 'One')]), 'asks for access to 1 container');
  assert.equal(words([row(1, 'a', 'x', 'One'), row(2, 'a', 'x', 'Two'), row(3, 'a', 'x', 'Three')]), 'asks for access to 3 containers');
  assert.equal(words([row(1, 'a', 'x')]), 'asks for access to draw on this board');
  assert.equal(words([row(1, 'a', 'x'), row(2, 'a', 'x', 'One'), row(3, 'a', 'x', 'Two')]), 'asks for access to this board and 2 containers');
});

test('allowAllWords: one sentence for the whole bot, in the board wording for the board', () => {
  const rows = (...r: AccessRequestRow[]) => allowAllWords(r);
  assert.equal(rows(row(1, 'a', 'build', 'One'), row(2, 'a', 'build', 'Two'), row(3, 'a', 'build', 'Three')), 'build can now write in 3 containers');
  assert.equal(rows(row(1, 'a', 'build', 'One')), 'build can now write in One');
  assert.equal(rows(row(1, 'a', 'build')), 'build can now draw on this board');
  assert.equal(rows(row(1, 'a', 'build'), row(2, 'a', 'build', 'One'), row(3, 'a', 'build', 'Two')), 'build can now draw on this board and write in 2 containers');
});
