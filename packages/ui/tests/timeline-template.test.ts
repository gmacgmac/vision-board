// The timeline pattern's markup (D-105; PLAN decisions 8-12, § Design review 587-594), from hand-made geometry in the
// shape the layout returns (#format TimelineDrawing): the line and its arrow as paths (no marker ids), bands behind,
// stems, years where they fall, a dot per node in its colour's hooks; hidden from assistive technology.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { TimelineDrawing } from '#format';
import { PATTERNS, TIMELINE_ARROW, timelineMarkup } from '../src/index.ts';
import type { TimelineLook } from '../src/index.ts';

const LOOKS: Record<string, TimelineLook> = { a: { kind: 'decision' }, b: { kind: 'topic', tone: 'teal' }, c: { kind: 'action', tone: 200 } };
const look = (id: string): TimelineLook | undefined => LOOKS[id];

/** Across: three dots, the last two on the same date (a band), the year turning between the first two. */
const ACROSS: TimelineDrawing = {
  direction: 'across',
  line: { from: { x: 0, y: 100 }, to: { x: 500, y: 100 } },
  dots: [
    { id: 'a', at: { x: 140, y: 100 }, side: 'above', stem: { from: { x: 140, y: 100 }, to: { x: 140, y: 70 } } },
    { id: 'b', at: { x: 314, y: 100 }, side: 'below', stem: { from: { x: 314, y: 100 }, to: { x: 314, y: 130 } } },
    { id: 'c', at: { x: 488.5, y: 100 }, side: 'above', stem: { from: { x: 488.5, y: 100 }, to: { x: 488.5, y: 70 } } },
  ],
  years: [{ year: '2026', at: { x: 0, y: 100 } }, { year: '2027', at: { x: 227, y: 100 } }],
  bands: [{ from: { x: 314, y: 100 }, to: { x: 488.5, y: 100 } }],
};

/** Down: two dots, left then right; the stem meets the middle of the facing side. */
const DOWN: TimelineDrawing = {
  direction: 'down',
  line: { from: { x: 300, y: 0 }, to: { x: 300, y: 400 } },
  dots: [
    { id: 'a', at: { x: 300, y: 40 }, side: 'left', stem: { from: { x: 300, y: 40 }, to: { x: 270, y: 40 } } },
    { id: 'x', at: { x: 300, y: 120 }, side: 'right', stem: { from: { x: 300, y: 120 }, to: { x: 330, y: 120 } } },
  ],
  years: [{ year: '2026', at: { x: 300, y: 0 } }],
  bands: [],
};

test('across: one group, hidden, in drawing order: bands, line, arrow, stems, years, dots', () => {
  const svg = timelineMarkup(ACROSS, look);
  assert.match(svg, /^<g class="vb-timeline" data-direction="across" aria-hidden="true">/);
  const order = [...svg.matchAll(/class="vb-timeline-(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(order, ['band', 'line', 'arrow', 'stem', 'stem', 'stem', 'year', 'year', 'dot', 'dot', 'dot']);
  assert.ok(!/marker|url\(#|style=/.test(svg), 'no marker ids, no style attribute');
});

test('across: the line stops at the arrow\'s base and the arrow\'s tip is the line\'s end', () => {
  const svg = timelineMarkup(ACROSS, look);
  const base = 500 - TIMELINE_ARROW.length;
  assert.ok(svg.includes(`<path class="vb-timeline-line" d="M0 100L${base} 100"/>`));
  assert.ok(svg.includes(`<path class="vb-timeline-arrow" d="M500 100L${base} ${100 + TIMELINE_ARROW.half}L${base} ${100 - TIMELINE_ARROW.half}Z"/>`));
});

test('across: the band, the stems above and below, the year at the start and at a turn, a dot per kind and tone', () => {
  const svg = timelineMarkup(ACROSS, look);
  assert.ok(svg.includes('<path class="vb-timeline-band" d="M314 100L488.5 100"/>'));
  assert.ok(svg.includes('<path class="vb-timeline-stem" d="M140 100L140 70"/>'), 'above');
  assert.ok(svg.includes('<path class="vb-timeline-stem" d="M314 100L314 130"/>'), 'below');
  assert.ok(svg.includes('<text class="vb-timeline-year" x="0" y="100" text-anchor="start">2026</text>'), 'at the start');
  assert.ok(svg.includes('<text class="vb-timeline-year" x="227" y="100" text-anchor="middle">2027</text>'), 'at a turn');
  assert.ok(svg.includes('<circle class="vb-timeline-dot" cx="140" cy="100" data-node="a" data-side="above" data-kind="decision"/>'));
  assert.ok(svg.includes('data-node="b" data-side="below" data-kind="topic" data-tone="teal"/>'), 'a named tone');
  assert.ok(svg.includes('data-node="c" data-side="above" data-kind="action" data-tone="200"/>'), 'a hue');
});

test('down: the line runs down with its arrow pointing down; stems left and right; the year centred on the line', () => {
  const svg = timelineMarkup(DOWN, look);
  assert.match(svg, /^<g class="vb-timeline" data-direction="down" aria-hidden="true">/);
  const base = 400 - TIMELINE_ARROW.length;
  assert.ok(svg.includes(`<path class="vb-timeline-line" d="M300 0L300 ${base}"/>`));
  assert.ok(svg.includes(`<path class="vb-timeline-arrow" d="M300 400L${300 - TIMELINE_ARROW.half} ${base}L${300 + TIMELINE_ARROW.half} ${base}Z"/>`));
  assert.ok(svg.includes('<path class="vb-timeline-stem" d="M300 40L270 40"/>'), 'left');
  assert.ok(svg.includes('<path class="vb-timeline-stem" d="M300 120L330 120"/>'), 'right');
  assert.ok(svg.includes('<text class="vb-timeline-year" x="300" y="0" text-anchor="middle">2026</text>'));
  assert.ok(svg.includes('<circle class="vb-timeline-dot" cx="300" cy="120" data-node="x" data-side="right"/>'), 'a node the look does not know: the line\'s colour');
});

test('every value is escaped and every number rounded to two places', () => {
  const svg = timelineMarkup({ ...DOWN, dots: [{ ...DOWN.dots[0]!, id: 'a"><script>', at: { x: 1 / 3, y: 2 / 3 } }], years: [{ year: '<b>', at: { x: 0, y: 0 } }] }, () => ({ kind: 'risk', tone: '"x' as never }));
  assert.ok(!svg.includes('<script>') && !svg.includes('<b>') && !svg.includes('"x"'));
  assert.ok(svg.includes('cx="0.33" cy="0.67"'));
});

test('the pattern is registered (no flag), with every state the task names', () => {
  const p = PATTERNS.find((x) => x.name === 'timeline')!;
  assert.equal(p.flag, undefined, 'no flag: the timeline is the board\'s behaviour');
  assert.equal(p.selector, '.vb-timeline');
  for (const s of ['across', 'down', 'dot per kind', 'tone dot', 'stem above', 'stem below', 'stem left', 'stem right', 'year at the start', 'year at a turn', 'band', 'arrow']) assert.ok(p.states.includes(s), s);
});
