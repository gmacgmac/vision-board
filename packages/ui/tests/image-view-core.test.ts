// The zoomed view's rules, DOM-free (D-048 ruling 22, app-cards FE_03): an image's longer side takes
// 70% of the screen in that direction (small images scaled up too) and the other side never passes the
// screen; the open and close animation draws the zoomed box at the card's box and runs about 220 ms,
// from the board's motion token, so reduced motion (the token at 0ms) means no motion at all.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MOTION_SHARE, ZOOM_SHARE, centred, fitImage, flipFrom, motionMs, msOf } from '../src/index.ts';

const near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) < 1e-6, `${what}: ${a} is not ${b}`);

test('a wide image takes 70% of the screen\'s width, at 1600×1000 and at 1470×956', () => {
  for (const screen of [{ w: 1600, h: 1000 }, { w: 1470, h: 956 }]) {
    const s = fitImage({ w: 1600, h: 800 }, screen);
    near(s.w, ZOOM_SHARE * screen.w, 'width');
    near(s.h, s.w / 2, 'height keeps the ratio');
  }
  assert.equal(ZOOM_SHARE, 0.7);
});

test('a tall image takes 70% of the screen\'s height, at 1600×1000 and at 1470×956', () => {
  for (const screen of [{ w: 1600, h: 1000 }, { w: 1470, h: 956 }]) {
    const s = fitImage({ w: 600, h: 1200 }, screen);
    near(s.h, ZOOM_SHARE * screen.h, 'height');
    near(s.w, s.h / 2, 'width keeps the ratio');
  }
});

test('small images are scaled up to the same 70%', () => {
  near(fitImage({ w: 1, h: 1 }, { w: 1600, h: 1000 }).h, 700, 'a 1×1 square');
  near(fitImage({ w: 20, h: 10 }, { w: 1600, h: 1000 }).w, 1120, 'a small wide one');
  near(fitImage({ w: 10, h: 40 }, { w: 1600, h: 1000 }).h, 700, 'a small tall one');
});

test('the other side never passes the screen', () => {
  // Wide, but nearly square on a wide screen: 70% of the width would be 1008 high.
  const s = fitImage({ w: 1000, h: 900 }, { w: 1600, h: 1000 });
  near(s.h, 1000, 'height held to the screen');
  near(s.w, 1000 * 1000 / 900, 'width keeps the ratio');
  // Tall, on a narrow screen: 70% of the height would be wider than the screen.
  const t = fitImage({ w: 900, h: 1000 }, { w: 500, h: 1000 });
  near(t.w, 500, 'width held to the screen');
  near(t.h, 500 * 1000 / 900, 'height keeps the ratio');
});

test('a square takes 70% of the screen\'s shorter side', () => {
  const s = fitImage({ w: 400, h: 400 }, { w: 1600, h: 1000 });
  near(s.w, 700, 'width');
  near(s.h, 700, 'height');
  near(fitImage({ w: 400, h: 400 }, { w: 800, h: 1200 }).w, 560, 'on a tall screen');
});

test('nothing to fit, or no screen, is no size', () => {
  for (const [natural, screen] of [[{ w: 0, h: 10 }, { w: 100, h: 100 }], [{ w: 10, h: 10 }, { w: 0, h: 100 }], [{ w: Number.NaN, h: 1 }, { w: 1, h: 1 }]]) {
    assert.deepEqual(fitImage(natural!, screen!), { w: 0, h: 0 });
  }
});

test('the zoomed box is centred on the screen', () => {
  assert.deepEqual(centred({ w: 1120, h: 560 }, { w: 1600, h: 1000 }), { x: 240, y: 220, w: 1120, h: 560 });
});

test('the animation\'s first frame draws the zoomed box exactly over the card\'s box', () => {
  const to = { x: 240, y: 220, w: 1120, h: 560 };
  const from = { x: 100, y: 50, w: 280, h: 140 };
  const m = /^translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+), ([\d.]+)\)$/.exec(flipFrom(from, to));
  assert.ok(m, flipFrom(from, to));
  const [tx, ty, sx, sy] = m.slice(1).map(Number) as [number, number, number, number];
  // The transform's origin is the box's top left corner (image-view.css).
  near(to.x + tx, from.x, 'left');
  near(to.y + ty, from.y, 'top');
  near(to.w * sx, from.w, 'width');
  near(to.h * sy, from.h, 'height');
  assert.equal(flipFrom(to, to), 'translate(0px, 0px) scale(1, 1)');
});

test('the motion is the board\'s token times MOTION_SHARE: about 220 ms, and none under reduced motion', () => {
  assert.equal(msOf('360ms'), 360);
  assert.equal(msOf(' 0.36s '), 360);
  assert.equal(msOf('0ms'), 0);
  assert.equal(msOf(''), 0);
  assert.equal(msOf('fast'), 0);
  near(motionMs('360ms'), 216, 'the token today');
  assert.ok(Math.abs(motionMs('360ms') - 220) <= 10, 'about 220 ms (ruling 22)');
  assert.equal(motionMs('0ms'), 0, 'reduced motion: tokens.css sets --vb-motion to 0ms');
  assert.equal(MOTION_SHARE, 0.6);
});
