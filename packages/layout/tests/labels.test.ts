// Link labels (field-report batch 3 ruling 3): near the source end, on the line, with a `fits` flag
// that says whether the label fits its stretch of line without covering a card or another label.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Link } from '#format';
import { labelSize, overlaps, routeLines, routeLinks } from '../src/index.ts';
import type { Box } from '../src/index.ts';

const g = (boxes: Map<string, Box>) => new Map([...boxes.keys()].map((id) => [id, 'g']));
const boxOf = (at: { x: number; y: number }, text: string): Box => {
  const s = labelSize(text);
  return { x: at.x - s.w / 2, y: at.y - s.h / 2, ...s };
};

test('a label that fits sits on the line near the source end', () => {
  const boxes = new Map<string, Box>([['a', { x: 0, y: 0, w: 200, h: 100 }], ['b', { x: 600, y: 0, w: 200, h: 100 }]]);
  const [route] = routeLinks([{ from: 'a', to: 'b', label: 'yes' }], boxes, g(boxes));
  const at = route!.labelAt!;
  assert.equal(at.fits, true);
  // On the straight line between the two cards, closer to a than to b.
  assert.equal(at.y, 50);
  assert.ok(at.x > 200 && at.x < 400, `${at.x}`);
  assert.ok(!overlaps(boxOf(at, 'yes'), boxes.get('a')!));
});

test('a label longer than its stretch of line does not fit: a marker point on the line, near the source', () => {
  const boxes = new Map<string, Box>([['a', { x: 0, y: 0, w: 200, h: 100 }], ['b', { x: 272, y: 0, w: 200, h: 100 }]]);
  const label = 'a label far too long for a 72 px gap';
  const [route] = routeLinks([{ from: 'a', to: 'b', label }], boxes, g(boxes));
  const [line] = routeLines([{ from: 'a', to: 'b', label }], boxes, g(boxes));
  const at = route!.labelAt!;
  assert.equal(at.fits, false);
  // The marker is on the line, a little way from the source's port.
  const p0 = line!.pts[0]!;
  assert.equal(at.y, p0.y);
  assert.ok(at.x > p0.x && at.x - p0.x <= 20, `${at.x}`);
});

test('labels never cover a card or each other; only links with a label get a place', () => {
  // Three links from a fan out to three cards; their labels compete for room near a.
  const boxes = new Map<string, Box>([
    ['a', { x: 0, y: 150, w: 200, h: 100 }],
    ['b', { x: 500, y: 0, w: 200, h: 100 }], ['c', { x: 500, y: 150, w: 200, h: 100 }], ['d', { x: 500, y: 300, w: 200, h: 100 }],
  ]);
  const links: Link[] = [{ from: 'a', to: 'b', label: 'first' }, { from: 'a', to: 'c', label: 'second' }, { from: 'a', to: 'd' }];
  const routes = routeLinks(links, boxes, g(boxes));
  assert.equal(routes[2]!.labelAt, undefined);
  const placed = routes.filter((r) => r.labelAt?.fits).map((r) => boxOf(r.labelAt!, r.label!));
  for (const p of placed) for (const b of boxes.values()) assert.ok(!overlaps(p, b));
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) assert.ok(!overlaps(placed[i]!, placed[j]!));
});

test('labelSize grows with the text', () => {
  assert.ok(labelSize('a much longer label').w > labelSize('yes').w);
  assert.equal(labelSize('yes').h, labelSize('no').h);
});

// FE_01 (accessibility): a marker is a 24 px target on the page (WCAG 2.5.8), so two markers never
// sit closer than that; one whose place near the source is taken moves on along its own line.
test('markers keep a target\'s room from each other and from cards, each on its own line', () => {
  const boxes = new Map<string, Box>([
    ['a', { x: 0, y: 100, w: 200, h: 100 }], ['b', { x: 272, y: 0, w: 200, h: 100 }], ['c', { x: 272, y: 200, w: 200, h: 100 }],
  ]);
  const links: Link[] = [{ from: 'a', to: 'b', label: 'a label far too long for its line' }, { from: 'a', to: 'c', label: 'another label far too long' }];
  const routes = routeLinks(links, boxes, g(boxes));
  const lines = routeLines(links, boxes, g(boxes));
  const [p, q] = routes.map((r) => r.labelAt!);
  assert.deepEqual([p!.fits, q!.fits], [false, false]);
  assert.ok(Math.max(Math.abs(p!.x - q!.x), Math.abs(p!.y - q!.y)) >= 24, JSON.stringify([p, q]));
  routes.forEach((r, i) => {
    const at = r.labelAt!;
    const target = { x: at.x - 12, y: at.y - 12, w: 24, h: 24 };
    assert.ok(![...boxes.values()].some((c) => overlaps(target, c)), `marker ${i} clear of the cards`);
    const pts = lines[i]!.pts;
    const on = pts.slice(1).some((b, j) => {
      const a = pts[j]!;
      return Math.min(a.x, b.x) - 0.1 <= at.x && at.x <= Math.max(a.x, b.x) + 0.1 && Math.min(a.y, b.y) - 0.1 <= at.y && at.y <= Math.max(a.y, b.y) + 0.1;
    });
    assert.ok(on, `marker ${i} on its line`);
  });
});
