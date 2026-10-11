// Link labels (field-report batch 3 ruling 3): near the source end, on the line, with a `fits` flag
// that says whether the label fits its stretch of line without covering a card or another label.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Link } from '../../format/src/index.ts';
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
