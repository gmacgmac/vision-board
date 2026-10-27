// Alignment and widths as layout inputs (field-report batch 3 rulings 4 and 5): horizontal layouts
// line cards up by their tops by default (a flow row used to be centred), vertical ones by their
// left edges; `center` centres them. Under `match` every card in a column takes the column's widest
// width; the defaults come from `widthsOf` (match for grid and column, own for the rest).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Mode, Region, View, ViewNode, Widths } from '#format';
import { layoutBoard, layoutRegion, MODE_FNS } from '../src/index.ts';
import type { Align, Size } from '../src/index.ts';

const nodes: ViewNode[] = ['a', 'b', 'c', 'd'].map((id, i) => ({ id, region: 'r', kind: 'finding', title: id, n: i + 1 }));
const sizes = new Map<string, Size>([['a', { w: 280, h: 100 }], ['b', { w: 464, h: 200 }], ['c', { w: 360, h: 140 }], ['d', { w: 280, h: 60 }]]);
const chain = [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'c', to: 'd' }];
const run = (mode: Mode, opts: { align?: Align; widths?: Widths; columns?: number } = {}) => MODE_FNS[mode]({
  region: { id: 'r', title: 'R', mode, columns: opts.columns }, nodes, sizes, links: mode === 'flow' ? chain : [], align: opts.align, widths: opts.widths,
}).pos;
const tops = (pos: Map<string, { y: number }>) => nodes.map((n) => pos.get(n.id)!.y);
const mids = (pos: Map<string, { y: number; h: number }>) => nodes.map((n) => pos.get(n.id)!.y + pos.get(n.id)!.h / 2);

test('flow: a row of cards lines up by the tops by default, by the centres with center', () => {
  assert.equal(new Set(tops(run('flow'))).size, 1);
  assert.equal(new Set(mids(run('flow', { align: 'center' }))).size, 1);
});

test('row: tops line up by default, centres with center', () => {
  assert.equal(new Set(tops(run('row'))).size, 1);
  assert.equal(new Set(mids(run('row', { align: 'center' }))).size, 1);
});

test('column: left edges line up by default, centres with center (own widths)', () => {
  const lefts = (pos: Map<string, { x: number; w: number }>, f: number) => nodes.map((n) => pos.get(n.id)!.x + pos.get(n.id)!.w * f);
  assert.equal(new Set(lefts(run('column', { widths: 'own' }), 0)).size, 1);
  assert.equal(new Set(lefts(run('column', { widths: 'own', align: 'center' }), 0.5)).size, 1);
});

test('grid: start puts each card at its cell\'s top left; center centres it in the cell', () => {
  const start = run('grid', { columns: 2, widths: 'own' });
  const centre = run('grid', { columns: 2, widths: 'own', align: 'center' });
  // a and c share column 1 (widest 360): a is centred in it under center.
  assert.equal(start.get('a')!.x, start.get('c')!.x);
  assert.equal(centre.get('a')!.x - centre.get('c')!.x, (360 - 280) / 2);
  // a and b share row 1 (tallest 200).
  assert.equal(centre.get('a')!.y - start.get('a')!.y, (200 - 100) / 2);
});

test('match: every card in a column takes the column\'s widest width; own keeps each width', () => {
  const g = run('grid', { columns: 2, widths: 'match' });
  assert.deepEqual(['a', 'b', 'c', 'd'].map((id) => g.get(id)!.w), [360, 464, 360, 464]);
  const c = run('column', { widths: 'match' });
  assert.deepEqual(nodes.map((n) => c.get(n.id)!.w), [464, 464, 464, 464]);
  const own = run('grid', { columns: 2, widths: 'own' });
  assert.deepEqual(nodes.map((n) => own.get(n.id)!.w), nodes.map((n) => sizes.get(n.id)!.w));
  // In a row each card is its own column: nothing changes.
  const r = run('row', { widths: 'match' });
  assert.deepEqual(nodes.map((n) => r.get(n.id)!.w), nodes.map((n) => sizes.get(n.id)!.w));
});

test('defaults: match for grid and column, own for flow, row, lanes and radial; the region and the caller override', () => {
  const region = (mode: Mode, widths?: Widths): Region => ({ id: 'r', title: 'R', mode, columns: 2, ...(widths && { widths }) });
  const widthsSeen = (mode: Mode, widths?: Widths, chosen?: Widths) => {
    const piece = layoutRegion(region(mode, widths), nodes, mode === 'flow' ? chain : [], sizes, { widths: chosen });
    // Own: every card keeps its width. (In flow's one-card columns match looks the same.)
    return nodes.every((n) => piece.out.pos.get(n.id)!.w === sizes.get(n.id)!.w) ? 'own' : 'match';
  };
  assert.equal(widthsSeen('grid'), 'match');
  assert.equal(widthsSeen('column'), 'match');
  assert.equal(widthsSeen('row'), 'own');
  assert.equal(widthsSeen('flow'), 'own');
  assert.equal(widthsSeen('grid', 'own'), 'own');
  assert.equal(widthsSeen('grid', 'own', 'match'), 'match');
});

test('layoutBoard passes widths per region and the alignment to every region', () => {
  const view: View = {
    format: 1, session: 'w', version: 1, title: 'w', links: chain,
    regions: [{ id: 'r', title: 'R', mode: 'flow' }], nodes,
  };
  const matched = layoutBoard(view, sizes, { widths: new Map([['r', 'match']]) });
  const centred = layoutBoard(view, sizes, { align: 'center' });
  // Flow's columns hold one card each here, so match changes nothing; centring changes the tops.
  assert.deepEqual(nodes.map((n) => matched.nodes.get(n.id)!.w), nodes.map((n) => sizes.get(n.id)!.w));
  assert.equal(new Set(nodes.map((n) => centred.nodes.get(n.id)!.y + centred.nodes.get(n.id)!.h / 2)).size, 1);
});
