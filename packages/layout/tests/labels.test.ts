// Link labels (field-report batch 3 ruling 3; point 646): on a straight piece of the line near the source, else beside a
// level piece in the gap between the two cards, else centred on an upright piece, else just right or left of it; when
// none fits, a short tag of its first words on the line. `fits` says whether the whole label was placed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Link } from '#format';
import { labelSize, overlaps, routeLines, routeLinks } from '../src/index.ts';
import { linesIn, placeLabel, tagSize, tagWords } from '../src/route/labels.ts';
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

test('a label too long for any place between two close cards is a short tag on the line: its first words, clear of both', () => {
  const boxes = new Map<string, Box>([['a', { x: 0, y: 0, w: 200, h: 100 }], ['b', { x: 272, y: 0, w: 200, h: 100 }]]);
  const label = 'a label far too long for a 72 px gap';
  const [route] = routeLinks([{ from: 'a', to: 'b', label }], boxes, g(boxes));
  const at = route!.labelAt!;
  assert.equal(at.fits, false);
  // The longest first words whose 24 px tall target fits the 72 px gap.
  assert.equal(at.short, 'a label…');
  assert.equal(at.y, 50);
  const target = { x: at.x - tagSize(at.short).w / 2, y: at.y - 12, ...tagSize(at.short) };
  for (const c of boxes.values()) assert.ok(!overlaps(target, c), JSON.stringify(target));
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

// FE_01 (accessibility): a short tag is a target at least 24 px square on the page (WCAG 2.5.8), so two tags never
// overlap; one whose place near the source is taken moves on along its own line.
test('short tags keep a target\'s room from each other and from cards, each on its own line', () => {
  const boxes = new Map<string, Box>([
    ['a', { x: 0, y: 100, w: 200, h: 100 }], ['b', { x: 272, y: 0, w: 200, h: 100 }], ['c', { x: 272, y: 200, w: 200, h: 100 }],
  ]);
  // Labels wider than the gap's whole width (472 px), so no place on or beside a line can take them.
  const links: Link[] = [
    { from: 'a', to: 'b', label: 'a label far too long for its line and for any gap beside it, by far' },
    { from: 'a', to: 'c', label: 'another label far too long for its line and for any gap beside it' },
  ];
  const routes = routeLinks(links, boxes, g(boxes));
  const lines = routeLines(links, boxes, g(boxes));
  const [p, q] = routes.map((r) => r.labelAt!);
  assert.deepEqual([p!.fits, q!.fits], [false, false]);
  const targetOf = (at: { x: number; y: number; short?: string }) => ({ x: at.x - tagSize(at.short!).w / 2, y: at.y - 12, ...tagSize(at.short!) });
  assert.ok(!overlaps(targetOf(p!), targetOf(q!)), JSON.stringify([p, q]));
  routes.forEach((r, i) => {
    const at = r.labelAt!;
    const target = targetOf(at);
    assert.ok(![...boxes.values()].some((c) => overlaps(target, c)), `marker ${i} clear of the cards`);
    const pts = lines[i]!.pts;
    const on = pts.slice(1).some((b, j) => {
      const a = pts[j]!;
      return Math.min(a.x, b.x) - 0.1 <= at.x && at.x <= Math.max(a.x, b.x) + 0.1 && Math.min(a.y, b.y) - 0.1 <= at.y && at.y <= Math.max(a.y, b.y) + 0.1;
    });
    assert.ok(on, `marker ${i} on its line`);
  });
});

// Point 646 (PLAN folders-labels-print § Decisions 3): each place in turn, on a hand-made line, so each test names the
// place it reaches. Two cards 72 px apart (COL_GAP), the line between them.
const A: Box = { x: 0, y: 0, w: 200, h: 100 };
const B: Box = { x: 272, y: 0, w: 200, h: 100 };
const straight = [{ x: 200, y: 50 }, { x: 272, y: 50 }];
const roomOf = (lines: { x: number; y: number }[][], taken: Box[] = []) => ({ cards: [A, B], taken, lines });
const coversLine = (box: Box, pts: { x: number; y: number }[]) => pts.slice(1).some((b, i) => {
  const a = pts[i]!;
  return overlaps(box, { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) });
});

test('2: a word too long for its stretch of line sits just above it, inside the gap, clear of the cards and the arrowhead', () => {
  const room = roomOf([straight]);
  const at = placeLabel(straight, 'blocks', room, [A, B]);
  assert.equal(at.fits, true);
  const box = boxOf(at, 'blocks');
  assert.ok(box.y + box.h <= 50, `above the line: ${JSON.stringify(box)}`);
  assert.ok(box.x >= 204 && box.x + box.w <= 272 - 12, `in the gap, clear of the arrowhead: ${JSON.stringify(box)}`);
  assert.ok(!coversLine(box, straight));
  assert.deepEqual(room.taken, [box]);
});

test('2: with the room above it taken, the word sits just below its line', () => {
  const above: Box = { x: 200, y: 0, w: 72, h: 48 };
  const at = placeLabel(straight, 'blocks', roomOf([straight], [above]), [A, B]);
  assert.equal(at.fits, true);
  const box = boxOf(at, 'blocks');
  assert.ok(box.y >= 50, `below the line: ${JSON.stringify(box)}`);
  assert.ok(!overlaps(box, above));
});

test('2: a word beside its line keeps clear of another link\'s line', () => {
  // Another link runs level 8 px above this one, and 8 px below it: no room beside, so a short tag.
  const others = [[{ x: 200, y: 42 }, { x: 272, y: 42 }], [{ x: 200, y: 58 }, { x: 272, y: 58 }]];
  const at = placeLabel(straight, 'blocks', roomOf([straight, ...others]), [A, B]);
  assert.equal(at.fits, false);
  assert.equal(at.short, 'blocks');
});

test('3: a word with no room on or beside its line sits centred on the elbow\'s upright piece', () => {
  // Staggered cards: the line leaves a at y 90, rises 40 px in the gutter (too short for the word on it near the
  // source), and enters b at y 50. The room below the first piece is taken; above it is a's corner and the upright.
  const a: Box = { x: 0, y: 40, w: 200, h: 100 };
  const pts = [{ x: 200, y: 90 }, { x: 236, y: 90 }, { x: 236, y: 50 }, { x: 272, y: 50 }];
  const below: Box = { x: 200, y: 92, w: 72, h: 30 };
  const room = { cards: [a, B], taken: [below], lines: [pts] };
  const at = placeLabel(pts, 'informs', room, [a, B]);
  assert.deepEqual(at, { x: 236, y: 70, fits: true });
});

test('4: between stacked cards the word sits just right of the upright line, clear of both cards and the arrowhead', () => {
  // A flow run down: b 30 px (ROW_GAP) under a, the line straight down between them. Too short for the word on it
  // (1), no level piece (2), and centred on it the word would cover the arrowhead (3).
  const top: Box = { x: 0, y: 0, w: 200, h: 100 };
  const under: Box = { x: 0, y: 130, w: 200, h: 100 };
  const pts = [{ x: 100, y: 100 }, { x: 100, y: 130 }];
  const room = { cards: [top, under], taken: [] as Box[], lines: [pts] };
  const at = placeLabel(pts, 'blocks', room, [top, under]);
  assert.equal(at.fits, true);
  const box = boxOf(at, 'blocks');
  assert.ok(box.x >= 100 + 6, `right of the line and its arrowhead: ${JSON.stringify(box)}`);
  assert.ok(box.y >= 104 && box.y + box.h <= 126, `in the gap, 4 px from each card: ${JSON.stringify(box)}`);
  assert.ok(!coversLine(box, pts));
  // With the right taken, the left; deterministic.
  const left = placeLabel(pts, 'blocks', { cards: [top, under], taken: [box], lines: [pts] }, [top, under]);
  assert.equal(left.fits, true);
  assert.ok(boxOf(left, 'blocks').x + boxOf(left, 'blocks').w <= 100 - 6, JSON.stringify(left));
  assert.deepEqual(placeLabel(pts, 'blocks', { cards: [top, under], taken: [], lines: [pts] }, [top, under]), at);
});

test('a short tag is the first words and an ellipsis, never fewer than one word; one long word is cut', () => {
  assert.deepEqual(tagWords('when a note fits no theme'), ['when a note fits no…', 'when a note fits…', 'when a note…', 'when a…', 'when…']);
  assert.deepEqual(tagWords('feeds'), ['feeds']);
  assert.deepEqual(tagWords('authentication'), ['authentic…']);
  assert.deepEqual(tagWords('authentication first'), ['authentic…']);
  assert.ok(tagSize('a…').w >= 24 && tagSize('a…').h === 24, 'a 24 px target at the least (WCAG 2.5.8)');
});

test('with no clear room anywhere, the tag is its shortest words at the first point: still words, never a dot', () => {
  // The gap is 10 px: nothing fits.
  const b: Box = { x: 210, y: 0, w: 200, h: 100 };
  const pts = [{ x: 200, y: 50 }, { x: 210, y: 50 }];
  const at = placeLabel(pts, 'when a note fits no theme', { cards: [A, b], taken: [], lines: [pts] }, [A, b]);
  assert.equal(at.fits, false);
  assert.equal(at.short, 'when…');
  assert.deepEqual([at.x, at.y], [205, 50]);
});

// VERIFY_01 fix: on paper a short tag shows its whole label, wrapped in the room the layout gives it, which stays inside
// the gap between the two cards and off the arrowhead (it printed 110 px wide in a 72 px gap, over both cards).
test('on paper a short tag\'s whole label wraps to the gap: inside it, CLEAR from both cards, off the arrowhead', () => {
  const label = 'once every note has been read';
  const at = placeLabel(straight, label, roomOf([straight]), [A, B]);
  assert.equal(at.fits, false);
  const room = at.room!;
  const box = { x: room.x - room.w / 2, w: room.w };
  assert.ok(box.x >= 200 + 4, `CLEAR from a: ${JSON.stringify(room)}`);
  assert.ok(box.x + box.w <= 272 - 12, `off the arrowhead (its last 12 px): ${JSON.stringify(room)}`);
  assert.ok(room.w >= tagSize(at.short!).w, 'never narrower than the tag');
  // The widest such room: 4 px more would not fit the gap.
  assert.ok(room.w + 4 > 272 - 12 - 204, JSON.stringify(room));
  assert.ok(linesIn(label, room.w - 12) > 1, 'wrapped');
});

test('on paper a label in a wide gap stays on one line, no wider than it is, as near its tag as the card allows', () => {
  // A short tag only because an earlier label took the line's place; the gap itself is wide.
  const b: Box = { x: 600, y: 0, w: 200, h: 100 };
  const pts = [{ x: 200, y: 50 }, { x: 600, y: 50 }];
  const taken: Box[] = [{ x: 200, y: 0, w: 400, h: 48 }, { x: 200, y: 52, w: 400, h: 48 }, { x: 214, y: 41, w: 372, h: 18 }];
  const at = placeLabel(pts, 'needs the budget', { cards: [A, b], taken, lines: [pts] }, [A, b]);
  assert.equal(at.fits, false);
  // The tag sits 18 px from a; the whole label moves right just enough to keep CLEAR (4 px) from it.
  assert.equal(at.x, 218);
  // One line at the paper's estimate: 16 characters at 6.5 × 1.1 px, plus 6 px each side.
  assert.deepEqual(at.room, { x: 204 + 127 / 2, w: 127 });
  assert.equal(linesIn('needs the budget', 127 - 12), 1);
});

test('linesIn wraps whole words, and breaks a word wider than the room', () => {
  assert.equal(linesIn('once every note', 1000), 1);
  assert.equal(linesIn('once every note', 40), 3);
  assert.equal(linesIn('authentication', 40), 3);
});
