import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Mode, Region, View, ViewNode } from '../../format/src/index.ts';
import { MODES } from '../../format/src/index.ts';
import type { BoardState, ItemStatus } from '../../actions/src/index.ts';
import { MODE_LABEL, regionState } from '../src/index.ts';

const region: Region = { id: 'r', title: 'R', mode: 'grid' };
const node = (f: Partial<ViewNode>): ViewNode => ({ id: '1', region: 'r', kind: 'question', title: 'T', ...f });
const view = (nodes: ViewNode[]): View =>
  ({ format: 1, session: 's', title: 'B', version: 1, regions: [region], nodes, links: [] });
const board = (f: Partial<BoardState> = {}): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), ...f });
const deciding = (...entries: [string, ItemStatus][]): BoardState =>
  board({ items: new Map(entries.map(([id, status]) => [id, { status, notes: [] }])) });
const drawn = (...ids: string[]): ReadonlySet<string> => new Set(ids);

test('MODE_LABEL names every mode', () => {
  for (const m of MODES) assert.ok(MODE_LABEL[m].length > 0, m);
  assert.deepEqual(Object.keys(MODE_LABEL), [...MODES]);
});

test('regionState carries the mode it is given', () => {
  for (const mode of MODES as readonly Mode[])
    assert.equal(regionState({ id: 'r', mode }, view([node({})]), board(), drawn('1')).mode, mode);
});

test('the count reads decided over items, counting acknowledged and dropped only', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: '2', n: 2 }), node({ id: '3', n: 3 }), node({ id: '4', n: 4 })]);
  const s = deciding(['1', 'acknowledged'], ['2', 'dropped'], ['3', 'later']);
  assert.equal(regionState(region, v, s, drawn('1', '2', '3', '4')).countText, '2/4 decided');
});

test('the count ignores nodes that are not items, and is empty when there are no items', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: 't', kind: 'topic' })]);
  assert.equal(regionState(region, v, board(), drawn('1', 't')).countText, '0/1 decided');
  assert.equal(regionState(region, view([node({ id: 't', kind: 'topic' })]), board(), drawn('t')).countText, '');
});

test('the count only looks at the nodes of this region', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: '2', n: 2, region: 'other' })]);
  const s = deciding(['1', 'acknowledged'], ['2', 'acknowledged']);
  assert.equal(regionState(region, v, s, drawn('1', '2')).countText, '1/1 decided');
});

test('Reset places shows when any node of the region is pinned, and not for another region', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: '2', n: 2 }), node({ id: '3', n: 3, region: 'other' })]);
  const pin = { x: 1, y: 1 };
  assert.equal(regionState(region, v, board(), drawn('1', '2')).showReset, false);
  assert.equal(regionState(region, v, board({ pins: new Map([['2', pin]]) }), drawn('1', '2')).showReset, true);
  assert.equal(regionState(region, v, board({ pins: new Map([['3', pin]]) }), drawn('1', '2')).showReset, false);
});

test('the empty message shows only when the layout drew none of the region\'s nodes', () => {
  const v = view([node({ id: '1', n: 1 }), node({ id: '2', n: 2 }), node({ id: '3', n: 3, region: 'other' })]);
  assert.equal(regionState(region, v, board(), drawn('1', '2', '3')).showEmpty, false);
  assert.equal(regionState(region, v, board(), drawn('2', '3')).showEmpty, false, 'one drawn is enough');
  assert.equal(regionState(region, v, board(), drawn('3')).showEmpty, true, 'only another region is drawn');
  assert.equal(regionState(region, v, board(), drawn()).showEmpty, true);
});

test('a region with no nodes shows the empty message and no count', () => {
  const st = regionState(region, view([]), board(), drawn());
  assert.deepEqual(st, { mode: 'grid', countText: '', showReset: false, showEmpty: true });
});
