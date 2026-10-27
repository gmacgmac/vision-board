// A container's extra top inset (3_FE_04 ruling 3, step 4G2): the shown note block under the title
// line. The frame grows by it, the cards start that much lower, containers below make room by the
// usual packing, and pinned containers stay at their pins. The inset is that one container's input:
// with every other container's kept result, one container laid out again gives `layoutBoard`'s
// answer (N12, performance.md approach 2). An inset of 0, or none, is today's layout exactly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { Region, View, ViewNode } from '#format';
import { boardView, foldDrawn, readLedger } from '#format';
import { FIXTURES_DIR } from '#format/files';
import { layoutBoard, layoutRegion, overlaps, packRegions, REGION_HEAD } from '../src/index.ts';
import type { BoardLayout, Size } from '../src/index.ts';

const regions: Region[] = ['a', 'b', 'c', 'd'].map((id) => ({ id, title: id.toUpperCase(), mode: 'grid' }));
const nodes: ViewNode[] = regions.flatMap((r, i) => [1, 2].map((k) => ({ id: `${r.id}${k}`, region: r.id, kind: 'question' as const, title: `${i}${k}` })));
const view: View = { format: 1, session: 's', title: 'B', version: 1, regions, nodes, links: [{ from: 'a1', to: 'c2' }] };
const sizes = new Map<string, Size>(nodes.map((n) => [n.id, { w: 280, h: 120 }]));
const ROW = 1400;
const INSET = 64;
const own = (r: Region) => nodes.filter((n) => n.region === r.id);
const frame = (l: BoardLayout, id: string) => l.regions.find((r) => r.id === id)!.box;

function apart(l: BoardLayout) {
  for (const a of l.regions) {
    for (const b of l.regions) {
      if (a.id < b.id) assert.ok(!overlaps(a.box, b.box), `${a.id} and ${b.id} overlap`);
    }
  }
}

function load(name: string): View {
  const lines = fs.readFileSync(`${FIXTURES_DIR}${name}.ledger.jsonl`, 'utf8');
  return boardView(foldDrawn(readLedger(lines.trim().split('\n')).events), name);
}

test('one container\'s inset lays out exactly that container; the rest keep their result', () => {
  const kept = regions.map((r) => layoutRegion(r, own(r), [], sizes));
  const headInsets = new Map([['a', INSET]]);
  // As the page's per-container cache does: a container whose inputs (now including its inset)
  // did not change keeps its piece; the others are laid out again, and counted.
  const laidOut: string[] = [];
  const pieces = regions.map((r, i) => {
    const inset = headInsets.get(r.id) ?? 0;
    if (!inset) return kept[i]!;
    laidOut.push(r.id);
    return layoutRegion(r, own(r), [], sizes, { headInset: inset });
  });
  assert.deepEqual(laidOut, ['a']);
  assert.deepEqual(packRegions(pieces, view.links, { maxRowWidth: ROW }), layoutBoard(view, sizes, { maxRowWidth: ROW, headInsets }));
  // The mode's answer is unchanged; only the frame grew.
  assert.deepEqual(pieces[0]!.out, kept[0]!.out);
  assert.equal(pieces[0]!.h, kept[0]!.h + INSET);
});

test('the frame grows by the inset, its cards start that much lower, frames below move down by it', () => {
  const free = layoutBoard(view, sizes, { maxRowWidth: ROW });
  const l = layoutBoard(view, sizes, { maxRowWidth: ROW, headInsets: new Map([['a', INSET]]) });
  const a0 = frame(free, 'a');
  const a = frame(l, 'a');
  assert.deepEqual(a, { ...a0, h: a0.h + INSET });
  for (const id of ['a1', 'a2']) {
    assert.deepEqual(l.nodes.get(id), { ...free.nodes.get(id)!, y: free.nodes.get(id)!.y + INSET });
  }
  assert.ok(l.nodes.get('a1')!.y >= a.y + REGION_HEAD + INSET);
  const sameRow = regions.filter((r) => r.id !== 'a' && frame(free, r.id).y === a0.y).map((r) => r.id);
  const below = regions.filter((r) => frame(free, r.id).y >= a0.y + a0.h).map((r) => r.id);
  assert.ok(sameRow.length && below.length, `rows: same ${sameRow}, below ${below}`);
  for (const id of sameRow) assert.deepEqual(frame(l, id), frame(free, id), `${id} moved`);
  for (const id of below) {
    assert.deepEqual(frame(l, id), { ...frame(free, id), y: frame(free, id).y + INSET }, `${id} not moved by the inset`);
    for (const n of own(regions.find((r) => r.id === id)!)) assert.equal(l.nodes.get(n.id)!.y, free.nodes.get(n.id)!.y + INSET);
  }
  apart(l);
  // Links are routed to where the cards are now.
  assert.notDeepEqual(l.routes, free.routes);
});

test('container pins still win: a pinned frame stays at its pin, inset or not; the others make room', () => {
  const free = layoutBoard(view, sizes, { maxRowWidth: ROW });
  const d = frame(free, 'd');
  // `d` pinned where packing puts it; `a`'s inset would push it down, but it is pinned.
  const pinD = new Map([['d', { x: d.x, y: d.y }]]);
  const l = layoutBoard(view, sizes, { maxRowWidth: ROW, regionPins: pinD, headInsets: new Map([['a', INSET]]) });
  assert.deepEqual({ x: frame(l, 'd').x, y: frame(l, 'd').y }, { x: d.x, y: d.y });
  apart(l);
  // The pinned container itself has the inset: it stays at its pin and grows downward.
  const pinA = { x: 2000, y: 40 };
  const p = layoutBoard(view, sizes, { maxRowWidth: ROW, regionPins: new Map([['a', pinA]]), headInsets: new Map([['a', INSET]]) });
  const a = frame(p, 'a');
  assert.deepEqual({ x: a.x, y: a.y, h: a.h }, { ...pinA, h: frame(free, 'a').h + INSET });
  assert.ok(p.nodes.get('a1')!.y >= pinA.y + REGION_HEAD + INSET);
  apart(p);
});

test('an inset of 0, none, or one for a container not on the board is today\'s layout exactly', () => {
  for (const v of [view, load('login-layout'), load('roadmap')]) {
    const sz = v === view ? sizes : new Map<string, Size>(v.nodes.map((n, i) => [n.id, { w: 240 + (i % 3) * 40, h: 96 + (i % 4) * 18 }]));
    const ser = (l: BoardLayout) => JSON.stringify(l, (_k, x) => (x instanceof Map ? [...x] : x));
    const pins = new Map([[v.nodes[0]!.id, { x: 30, y: 40 }]]);
    const regionPins = new Map([[v.regions[v.regions.length - 1]!.id, { x: 100, y: 50 }]]);
    for (const base of [{ maxRowWidth: ROW }, { maxRowWidth: 900, pins, regionPins }]) {
      const today = ser(layoutBoard(v, sz, base));
      const zero = new Map(v.regions.map((r) => [r.id, 0]));
      for (const headInsets of [undefined, new Map<string, number>(), zero, new Map([['gone', 50]])]) {
        assert.equal(ser(layoutBoard(v, sz, { ...base, headInsets })), today);
      }
    }
  }
});

test('same input, same picture with insets', () => {
  const headInsets = new Map([['b', 30], ['c', 12.5]]);
  const a = layoutBoard(view, sizes, { maxRowWidth: ROW, headInsets });
  assert.deepEqual(layoutBoard(view, sizes, { maxRowWidth: ROW, headInsets: new Map(headInsets) }), a);
  apart(a);
});
