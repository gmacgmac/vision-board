// A container's timeline on its own (BE_01, D-105, PLAN.md decisions 8-12, § Design review 587-595): `layoutTimeline`
// puts the dated nodes on one line in `sortByTimeline` order, alternating sides, across with one step and run down
// packed by the board's gaps; years where they turn, bands behind equal dates. Pure: the same answer twice, the
// input never changed. The container around it is `timeline-region.test.ts`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Direction, ViewNode } from '#format';
import { sortByTimeline } from '#format';
import {
  layoutTimeline, overlaps, ROW_GAP, TIMELINE_END_ROOM, TIMELINE_MIN_DOT, TIMELINE_STEM, TIMELINE_YEAR_ROOM,
  timelineStep, timelineWidthsOf,
} from '../src/index.ts';
import type { Size } from '../src/index.ts';

/** mulberry32, so every run draws the same lines. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dated = (dates: string[]): ViewNode[] =>
  dates.map((timeline, i) => ({ id: `d${i + 1}`, region: 'r', kind: 'topic', title: `t${i + 1}`, n: i + 1, timeline }));
const sized = (nodes: ViewNode[], size: (i: number) => Size) => new Map(nodes.map((n, i) => [n.id, size(i)]));
const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12'];

/** Random lines: 1 to 12 nodes, widths 200 to 480, heights 72 to 320. */
function* lines(count: number): Generator<{ nodes: ViewNode[]; sizes: Map<string, Size> }> {
  for (let seed = 1; seed <= count; seed++) {
    const r = rng(seed);
    const nodes = dated(MONTHS.slice(0, 1 + Math.floor(r() * 12)));
    yield { nodes, sizes: sized(nodes, () => ({ w: 200 + Math.floor(r() * 281), h: 72 + Math.floor(r() * 249) })) };
  }
}

function apart(pos: Map<string, { x: number; y: number; w: number; h: number }>, gap = 0, why = '') {
  const boxes = [...pos];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      assert.ok(!overlaps(boxes[i]![1], boxes[j]![1], gap - 1e-6), `${why}: ${boxes[i]![0]} and ${boxes[j]![0]} overlap`);
    }
  }
}

test('order follows sortByTimeline: by start, the coarser first at one start, equal dates by card number', () => {
  const nodes: ViewNode[] = [
    { id: 'a', region: 'r', kind: 'topic', title: 'a', n: 9, timeline: '2026-11-03' },
    { id: 'b', region: 'r', kind: 'topic', title: 'b', n: 4, timeline: '2026-10-01T00:00' },
    { id: 'c', region: 'r', kind: 'topic', title: 'c', n: 3, timeline: '2026-10-01' },
    { id: 'd', region: 'r', kind: 'topic', title: 'd', n: 2, timeline: '2026-10' },
    { id: 'e', region: 'r', kind: 'topic', title: 'e', n: 5, timeline: '2026-11-03' },
    { id: 'f', region: 'r', kind: 'topic', title: 'f', n: 1, timeline: '2026' },
  ];
  const t = layoutTimeline(nodes, sized(nodes, () => ({ w: 280, h: 120 })), 'across');
  assert.deepEqual(t.drawing.dots.map((d) => d.id), ['f', 'd', 'c', 'b', 'e', 'a']);
  assert.deepEqual(t.drawing.dots.map((d) => d.id), sortByTimeline(nodes).map((n) => n.id));
  assert.deepEqual([...t.pos.keys()], ['f', 'd', 'c', 'b', 'e', 'a']);
});

test('across: the first above, then alternating; one step; nodes on their stems; no overlap over random widths', () => {
  for (const { nodes, sizes } of lines(300)) {
    const t = layoutTimeline(nodes, sizes, 'across');
    const { dots, line } = t.drawing;
    const step = timelineStep(nodes.map((n) => sizes.get(n.id)!.w));
    assert.deepEqual(line.from, { x: 0, y: line.to.y });
    dots.forEach((d, i) => {
      const b = t.pos.get(d.id)!;
      assert.equal(d.side, i % 2 ? 'below' : 'above');
      assert.equal(d.at.y, line.from.y);
      if (i) assert.ok(Math.abs(d.at.x - dots[i - 1]!.at.x - step) < 1e-9, 'one step for the whole line');
      // Above sits on its bottom edge, below hangs from its top edge, a stem from the line; the stem meets the middle.
      assert.equal(i % 2 ? b.y : b.y + b.h, line.from.y + (i % 2 ? TIMELINE_STEM : -TIMELINE_STEM));
      assert.deepEqual(d.stem, { from: d.at, to: { x: b.x + b.w / 2, y: i % 2 ? b.y : b.y + b.h } });
      assert.ok(b.x >= 0 && b.y >= 0, 'region-local from (0, 0)');
    });
    assert.ok(dots[0]!.at.x >= TIMELINE_YEAR_ROOM, 'room for the year before the first dot');
    assert.equal(line.to.x, Math.max(dots.at(-1)!.at.x + TIMELINE_END_ROOM, ...[...t.pos.values()].map((b) => b.x + b.w)));
    apart(t.pos, 0, 'across');
    // Same side: SIDE_GAP apart at least (call 6).
    const same = new Map([...t.pos].filter((_, i) => i % 2 === 0));
    apart(same, 28, 'above');
    apart(new Map([...t.pos].filter((_, i) => i % 2 === 1)), 28, 'below');
  }
});

test('the step: call 6\'s formula, at least MIN_STEP; run 2\'s 154 for size s and 174 with one size m', () => {
  assert.equal(timelineStep([280, 280, 280, 280]), 154);
  assert.equal(timelineStep([280, 280, 360, 280, 280]), 174);
  assert.equal(timelineStep([200, 200]), 120);
  assert.equal(timelineStep([464, 464]), 246, 'neighbours count, so two nodes never crowd');
});

test('down: alternating left and right, the first left; packed by the gaps; the stem meets the middle of the facing side', () => {
  for (const gap of [ROW_GAP, 40]) {
    for (const { nodes, sizes } of lines(300)) {
      const t = layoutTimeline(nodes, sizes, 'down', { widths: 'own', rowGap: gap });
      const { dots, line } = t.drawing;
      assert.equal(line.from.y, 0);
      // One stem from the widest node on each side.
      const left = Math.max(...nodes.filter((_, i) => i % 2 === 0).map((n) => sizes.get(n.id)!.w));
      assert.equal(line.from.x, left + TIMELINE_STEM);
      assert.equal(line.to.y, dots.at(-1)!.at.y + TIMELINE_END_ROOM);
      dots.forEach((d, i) => {
        const b = t.pos.get(d.id)!;
        assert.equal(d.side, i % 2 ? 'right' : 'left');
        assert.equal(d.at.x, line.from.x);
        assert.equal(i % 2 ? b.x : b.x + b.w, d.at.x + (i % 2 ? TIMELINE_STEM : -TIMELINE_STEM));
        assert.deepEqual(d.stem, { from: d.at, to: { x: i % 2 ? b.x : b.x + b.w, y: b.y + b.h / 2 } });
        assert.ok(b.y >= 0 && b.x >= 0);
        // As high as both rules allow: one of them is tight.
        const floor = i ? dots[i - 1]!.at.y + TIMELINE_MIN_DOT : 0;
        if (!i) assert.equal(b.y, 0, 'the first node starts at the top of the content');
        const prev = i >= 2 ? t.pos.get(dots[i - 2]!.id)! : undefined;
        const sideFloor = prev ? prev.y + prev.h + gap + b.h / 2 : b.h / 2;
        assert.ok(Math.abs(d.at.y - Math.max(floor, sideFloor)) < 1e-9, `packed at ${i}`);
      });
      apart(t.pos, 0, 'down');
      apart(new Map([...t.pos].filter((_, i) => i % 2 === 0)), gap, 'left side');
      apart(new Map([...t.pos].filter((_, i) => i % 2 === 1)), gap, 'right side');
    }
  }
});

test('widths: match draws every dated node as wide as the widest; own keeps each; the default is match down, own across', () => {
  const nodes = dated(['2026-01', '2026-02', '2026-03']);
  const sizes = sized(nodes, (i) => ({ w: [280, 464, 360][i]!, h: 100 }));
  const ws = (t: ReturnType<typeof layoutTimeline>) => [...t.pos.values()].map((b) => b.w);
  assert.deepEqual(ws(layoutTimeline(nodes, sizes, 'down', { widths: 'match' })), [464, 464, 464]);
  assert.deepEqual(ws(layoutTimeline(nodes, sizes, 'across', { widths: 'match' })), [464, 464, 464]);
  assert.deepEqual(ws(layoutTimeline(nodes, sizes, 'down', { widths: 'own' })), [280, 464, 360]);
  assert.deepEqual(ws(layoutTimeline(nodes, sizes, 'across')), [280, 464, 360]);
  assert.deepEqual((['down', 'across'] as Direction[]).map((d) => timelineWidthsOf(d)), ['match', 'own']);
  assert.equal(timelineWidthsOf('down', 'own'), 'own', 'the container\'s choice');
  assert.equal(timelineWidthsOf('across', 'own', 'match'), 'match', 'the person\'s choice wins');
  // Run down, `match`: one column each side, the line in the middle of the timeline's column.
  const m = layoutTimeline(nodes, sizes, 'down', { widths: 'match' });
  assert.equal(m.drawing.line.from.x, 464 + TIMELINE_STEM);
  assert.equal(m.box.w, 2 * (464 + TIMELINE_STEM));
});

test('years: one at the line\'s start, one at each turn halfway between the two dots, none between dots of one year', () => {
  for (const direction of ['across', 'down'] as const) {
    const nodes = dated(['2025-11', '2025-12', '2026-01-05', '2026-02', '2026', '2027-03-01T09:00']);
    const t = layoutTimeline(nodes, sized(nodes, () => ({ w: 280, h: 120 })), direction);
    const at = (i: number) => t.drawing.dots[i]!.at;
    const mid = (i: number) => ({ x: (at(i - 1).x + at(i).x) / 2, y: (at(i - 1).y + at(i).y) / 2 });
    // `2026` (a year) starts before `2026-01-05`, so it comes first in 2026.
    assert.deepEqual(t.drawing.dots.map((d) => d.id), ['d1', 'd2', 'd5', 'd3', 'd4', 'd6']);
    assert.deepEqual(t.drawing.years, [
      { year: '2025', at: t.drawing.line.from }, { year: '2026', at: mid(2) }, { year: '2027', at: mid(5) },
    ]);
  }
});

test('bands: one per run of two or more exactly equal dates, from its first dot to its last', () => {
  const nodes = dated(['2026-11-03', '2026-11-03', '2026-11-03T09:00', '2026-12', '2026-12', '2026-12', '2027']);
  const t = layoutTimeline(nodes, sized(nodes, () => ({ w: 280, h: 120 })), 'across');
  const at = (i: number) => t.drawing.dots[i]!.at;
  assert.deepEqual(t.drawing.bands, [{ from: at(0), to: at(1) }, { from: at(3), to: at(5) }]);
  const pair = nodes.slice(2, 4);
  assert.deepEqual(layoutTimeline(pair, sized(pair, () => ({ w: 280, h: 120 })), 'across').drawing.bands, [], 'not equal: no band');
});

test('one dated node: one dot, its stem, the line with its arrow and the year at its start', () => {
  for (const direction of ['across', 'down'] as const) {
    const nodes = dated(['2026-10-13']);
    const t = layoutTimeline(nodes, sized(nodes, () => ({ w: 280, h: 120 })), direction);
    const [d] = t.drawing.dots;
    assert.equal(t.drawing.dots.length, 1);
    assert.equal(d!.side, direction === 'down' ? 'left' : 'above');
    assert.deepEqual(t.drawing.years, [{ year: '2026', at: t.drawing.line.from }]);
    assert.deepEqual(t.drawing.bands, []);
    const { from, to } = t.drawing.line;
    assert.ok(direction === 'down' ? to.y === d!.at.y + TIMELINE_END_ROOM : to.x === 280, 'the line ends past the dot');
    assert.ok(direction === 'down' ? from.y === 0 : from.x === 0);
  }
});

test('the same input gives the same answer, and the input is never changed', () => {
  for (const { nodes, sizes } of lines(40)) {
    for (const direction of ['across', 'down'] as const) {
      const before = structuredClone({ nodes, sizes: [...sizes] });
      const a = layoutTimeline(nodes, sizes, direction);
      assert.deepEqual(layoutTimeline(nodes, sizes, direction), a);
      assert.deepEqual({ nodes, sizes: [...sizes] }, before);
    }
  }
});
