import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { View, Mode } from '../../format/src/index.ts';
import { boardView, foldDrawn, readLedger } from '../../format/src/index.ts';
import { layoutBoard, overlaps } from '../src/index.ts';
import type { Size } from '../src/index.ts';

/** A fixture ledger's board (board id = file name) as the View the engine reads. */
function load(name: string): View {
  const lines = fs.readFileSync(new URL(`../../format/fixtures/${name}.ledger.jsonl`, import.meta.url), 'utf8');
  return boardView(foldDrawn(readLedger(lines.trim().split('\n')).events), name);
}
const sizesFor = (v: View, w = 240, h = 96) => new Map<string, Size>(v.nodes.map((n) => [n.id, { w, h }]));
const MODES: Mode[] = ['grid', 'list', 'flow', 'radial'];

function assertNoOverlap(v: View, nodes: Map<string, { x: number; y: number; w: number; h: number }>) {
  const ids = [...nodes.keys()];
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++)
      assert.ok(!overlaps(nodes.get(ids[i]!)!, nodes.get(ids[j]!)!), `${ids[i]} overlaps ${ids[j]} (${v.session})`);
}

for (const name of ['login-layout', 'roadmap']) {
  test(`${name}: every node placed, finite, no overlaps`, () => {
    const v = load(name);
    const out = layoutBoard(v, sizesFor(v));
    assert.equal(out.nodes.size, v.nodes.length);
    for (const b of out.nodes.values()) assert.ok([b.x, b.y, b.w, b.h].every(Number.isFinite));
    assertNoOverlap(v, out.nodes);
  });

  test(`${name}: deterministic (same input, same picture)`, () => {
    const v = load(name);
    const a = layoutBoard(v, sizesFor(v));
    const b = layoutBoard(v, sizesFor(v));
    assert.deepEqual([...a.nodes], [...b.nodes]);
    assert.deepEqual(a.routes, b.routes);
  });

  test(`${name}: no overlaps in any mode override`, () => {
    const v = load(name);
    for (const mode of MODES) {
      const modes = new Map(v.regions.filter((r) => r.mode !== 'lanes').map((r) => [r.id, mode]));
      assertNoOverlap(v, layoutBoard(v, sizesFor(v, 300, 140), { modes }).nodes);
    }
  });

  test(`${name}: regions do not overlap each other`, () => {
    const v = load(name);
    const { regions } = layoutBoard(v, sizesFor(v));
    for (let i = 0; i < regions.length; i++)
      for (let j = i + 1; j < regions.length; j++)
        assert.ok(!overlaps(regions[i]!.box, regions[j]!.box), `${regions[i]!.id} / ${regions[j]!.id}`);
  });
}

test('radial: large ring with wide cards does not overlap (regression)', () => {
  const v = load('roadmap');
  const r = v.regions.find((g) => g.mode === 'radial')!;
  const hub = r.center ?? v.nodes.find((n) => n.region === r.id)!.id;
  for (let i = 0; i < 12; i++) {
    v.nodes.push({ id: `extra-${i}`, region: r.id, kind: v.nodes[0]!.kind, title: `Extra ${i}` } as View['nodes'][number]);
    v.links.push({ from: hub, to: `extra-${i}` });
  }
  assertNoOverlap(v, layoutBoard(v, sizesFor(v, 320, 160)).nodes);
});

test('pins move a node to region-local coordinates', () => {
  const v = load('roadmap');
  const id = v.nodes[0]!.id;
  const out = layoutBoard(v, sizesFor(v), { pins: new Map([[id, { x: 5, y: 7 }]]) });
  const region = out.regions.find((g) => g.id === v.nodes[0]!.region)!;
  const at = out.nodes.get(id)!;
  assert.deepEqual({ x: at.x - region.origin.x, y: at.y - region.origin.y }, { x: 5, y: 7 });
});

test('hidden nodes are not placed', () => {
  const v = load('roadmap');
  const id = v.nodes[0]!.id;
  assert.ok(!layoutBoard(v, sizesFor(v), { hidden: new Set([id]) }).nodes.has(id));
});
