// Layout per container (N12_FE_01 ruling 3, performance.md approach 2): `layoutRegion` lays out
// one container, `packRegions` places the containers and routes the links. Composing them is
// `layoutBoard`, so a page that keeps a container's result until its inputs change draws the same
// picture as a full layout (rule 9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { View } from '../../format/src/index.ts';
import { boardView, foldDrawn, readLedger } from '../../format/src/index.ts';
import { layoutBoard, layoutRegion, packRegions } from '../src/index.ts';
import type { Size } from '../src/index.ts';

function load(name: string): View {
  const lines = fs.readFileSync(new URL(`../../format/fixtures/${name}.ledger.jsonl`, import.meta.url), 'utf8');
  return boardView(foldDrawn(readLedger(lines.trim().split('\n')).events), name);
}
const sizesFor = (v: View) => new Map<string, Size>(v.nodes.map((n, i) => [n.id, { w: 240 + (i % 3) * 40, h: 96 + (i % 4) * 18 }]));

for (const name of ['login-layout', 'roadmap']) {
  test(`${name}: layoutRegion per container, then packRegions, equals layoutBoard`, () => {
    const v = load(name);
    const sizes = sizesFor(v);
    const first = v.nodes[0]!;
    const pins = new Map([[first.id, { x: 30, y: 40 }]]);
    const hidden = new Set([v.nodes[1]!.id]);
    const opts = { pins, hidden, modes: new Map([[v.regions[0]!.id, 'list' as const]]) };
    const pieces = v.regions.map((r) => {
      const nodes = v.nodes.filter((n) => n.region === r.id && !hidden.has(n.id));
      const ids = new Set(nodes.map((n) => n.id));
      const links = v.links.filter((l) => ids.has(l.from) && ids.has(l.to));
      return layoutRegion(r, nodes, links, sizes, { mode: opts.modes.get(r.id), pins });
    });
    assert.deepEqual(packRegions(pieces, v.links), layoutBoard(v, sizes, opts));
  });
}

test('packRegions never changes the pieces it is given, so a kept piece can be packed again', () => {
  const v = load('roadmap');
  const sizes = sizesFor(v);
  const pieces = v.regions.map((r) => layoutRegion(r, v.nodes.filter((n) => n.region === r.id), [], sizes));
  const before = JSON.stringify(pieces, (_k, x) => (x instanceof Map ? [...x] : x));
  packRegions(pieces, v.links, { maxRowWidth: 900 });
  assert.equal(JSON.stringify(pieces, (_k, x) => (x instanceof Map ? [...x] : x)), before);
});
