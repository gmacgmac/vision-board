// Links across a timeline (the timeline set, PLAN § Out of Scope: links route around cards "as today"; FE_02 run 3): a
// link from a card on one side of the line to a card on the other side, or below it, never runs under a third card,
// across and run down, at both skins' row gaps, over seeded sizes. The line's staggered cards leave no gutter between
// the facing sides the link would take, so the router tries the other pair of sides (route.ts `lineFor`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Direction, View, ViewNode } from '#format';
import { EDGE_ROW_GAP, layoutBoard, ROW_GAP, routeLines } from '../src/index.ts';
import type { Size } from '../src/index.ts';
import { under } from './route-checks.ts';

const DATES = ['2026-11-03', '2026-09-15', '2026-10', '2026-11-03', '2026-11-12T09:30', '2027', undefined, undefined];

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The spec's launch plan: six dated cards, two not, in a row; sizes from `seed` (seed 0: the page's own). */
function plan(seed: number): { nodes: ViewNode[]; sizes: Map<string, Size> } {
  const r = rng(seed);
  const nodes: ViewNode[] = DATES.map((t, i) => ({ id: String(i + 1), n: i + 1, region: 'plan', kind: 'topic', title: `c${i + 1}`, ...(t && { timeline: t }) }));
  const own = [150, 130, 190, 160, 130, 140, 120, 140];
  const sizes = new Map(nodes.map((n, i) => [n.id, seed === 0
    ? { w: i === 2 ? 360 : 280, h: own[i]! }
    : { w: [280, 360, 464][Math.floor(r() * 3)]!, h: 72 + Math.floor(r() * 200) }]));
  return { nodes, sizes };
}

test('a link from a dated card to any other card of its container never runs under a third card', () => {
  const missed: string[] = [];
  let links = 0;
  for (let seed = 0; seed <= 40; seed++) {
    const { nodes, sizes } = plan(seed);
    for (const direction of ['across', 'down'] as Direction[]) {
      for (const rowGap of [ROW_GAP, EDGE_ROW_GAP]) {
        for (const from of nodes.filter((n) => n.timeline)) {
          for (const to of nodes) {
            if (to.id === from.id) continue;
            const view: View = { format: 1, session: 's', version: 1, title: 't', regions: [{ id: 'plan', title: 'P', mode: 'row' }], nodes, links: [{ from: from.id, to: to.id }] };
            const out = layoutBoard(view, sizes, { directions: new Map([['plan', direction]]), rowGap });
            const { pts } = routeLines(view.links, out.nodes, out.groups, out.downward)[0]!;
            links += 1;
            const hit = [...out.nodes].filter(([id, b]) => id !== from.id && id !== to.id && under(pts, b)).map(([id]) => id);
            if (hit.length) missed.push(`seed ${seed} ${direction} gap ${rowGap}: ${from.id}>${to.id} under ${hit.join(',')}`);
          }
        }
      }
    }
  }
  assert.deepEqual(missed, [], `${missed.length} of ${links}`);
});
