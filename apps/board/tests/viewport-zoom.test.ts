// The zoom the toolbar shows and the level below which the cards' controls hide (tracker N13): one
// rule, so the number on screen and the hiding always agree. Also where a key's focus pans and Z's fit. No browser: the stage and world are
// stand-ins with the few members the viewport touches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_FIT, FAR_K, revealPan, SELECTION_FIT, Viewport, zoomPercent } from '../src/board/canvas/viewport.ts';
import { commandTitle, zoomTitle } from '../src/board/input/commands.ts';

/** The world: its transform, and every custom property written on it, in order. */
function worldStub() {
  const props: [string, string][] = [];
  return { props, style: { transform: '', setProperty: (name: string, value: string) => { props.push([name, value]); } }, classList: { add() {}, remove() {} } };
}

function viewport(hideFar: boolean) {
  const stage = { dataset: {} as Record<string, string>, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) };
  const world = worldStub();
  return { vp: new Viewport(stage as unknown as HTMLElement, world as unknown as HTMLElement, hideFar), stage, world };
}

test('zoomPercent is the whole percentage, rounded down, so "75%" is never above the zoom', () => {
  assert.equal(zoomPercent(1), 100);
  assert.equal(zoomPercent(0.75), 75);
  assert.equal(zoomPercent(0.7499), 74);
  assert.equal(zoomPercent(0.2), 20);
  assert.equal(zoomPercent(0.29), 29);
  assert.equal(zoomPercent(2.5), 250);
  assert.equal(zoomPercent(0.4763), 47);
});

test('the stage is far exactly when the shown percentage is below the level of FAR_K, flag on', () => {
  const { vp, stage } = viewport(true);
  for (const k of [0.2, 0.47, 0.7499, 0.75, 0.76, 1, 2.5]) {
    vp.k = k;
    vp.apply();
    const far = zoomPercent(k) < zoomPercent(FAR_K);
    assert.equal(stage.dataset.zoom, far ? 'far' : undefined, `k ${k}`);
  }
});

// Review polish round 2 ruling 2 (closes tracker N13): the cards' buttons and the containers' controls
// show from 55%, so the board is far only below it.
test('the controls show from 55%: far at 54%, not at 55%, 60% or 74%', () => {
  const { vp, stage } = viewport(true);
  assert.equal(FAR_K, 0.55);
  for (const [k, far] of [[0.54, true], [0.5499, true], [0.55, false], [0.6, false], [0.74, false]] as const) {
    vp.k = k;
    vp.apply();
    assert.equal(stage.dataset.zoom, far ? 'far' : undefined, `k ${k}`);
  }
});

test('with the flag off the stage is never far, at any zoom', () => {
  const { vp, stage } = viewport(false);
  for (const k of [0.2, 0.5, 0.74, 1]) {
    vp.k = k;
    vp.apply();
    assert.equal(stage.dataset.zoom, undefined, `k ${k}`);
  }
});

// Review-polish ruling 2 (FE_02, decision 6): a container's top line keeps one on-screen size at
// every zoom. CSS counter-scales it from the zoom, which the viewport writes once on the world as
// --vb-zoom, beside the stage's data-zoom; never per container, and not again on a pan.
test('apply writes the zoom once on the world as --vb-zoom, and only when the zoom changed', () => {
  const { vp, world } = viewport(true);
  vp.k = 0.2;
  vp.apply();
  assert.deepEqual(world.props, [['--vb-zoom', '0.2']]);
  vp.panBy(40, -10);
  vp.apply();
  assert.deepEqual(world.props, [['--vb-zoom', '0.2']], 'a pan leaves it');
  vp.zoomAt(100, 100, 100);
  assert.deepEqual(world.props.at(-1), ['--vb-zoom', '2.5']);
  assert.equal(world.props.length, 2);
  vp.fit({ x: 0, y: 0, w: 736, h: 536 }, false);
  assert.deepEqual(world.props.at(-1), ['--vb-zoom', '1']);
});

test('a zoom tooltip says what the button does, its key and the level', () => {
  assert.equal(zoomTitle('zoom-in', 75), 'Zoom in · + · 75% now');
  assert.equal(zoomTitle('zoom-out', 120), 'Zoom out · - · 120% now');
  assert.equal(zoomTitle('fit', 47), 'Fit · F · 47% now');
  assert.equal(commandTitle('zoom-in'), 'Zoom in · +');
});

// Ruling 11 (review-polish FE_05, PLAN decision 1): the keyboard reaching a card pans it into view,
// a card that fits as today; a card bigger than the stage pans only when none of it shows, and then
// to its top-left corner, never to fit it. The stage is 800 by 600; the margin is 48.
const stageBox = { width: 800, height: 600 };
const at1 = { x: 0, y: 0, k: 1 };

test('revealPan: a card that fits and shows whole does not pan', () => {
  assert.deepEqual(revealPan({ x: 100, y: 100, w: 200, h: 150 }, at1, stageBox), { dx: 0, dy: 0 });
});

test('revealPan: a card that fits pans just enough when any part of it is outside, as before', () => {
  assert.deepEqual(revealPan({ x: 700, y: 100, w: 200, h: 150 }, at1, stageBox), { dx: -148, dy: 0 });
  assert.deepEqual(revealPan({ x: 100, y: -20, w: 200, h: 150 }, at1, stageBox), { dx: 0, dy: 68 });
  // At another pan and zoom: the card's screen box decides.
  assert.deepEqual(revealPan({ x: 0, y: 0, w: 100, h: 100 }, { x: -50, y: 0, k: 2 }, stageBox), { dx: 98, dy: 48 });
});

test('revealPan: a card taller than the stage that partly shows does not pan', () => {
  assert.deepEqual(revealPan({ x: 100, y: -300, w: 200, h: 1200 }, at1, stageBox), { dx: 0, dy: 0 });
  assert.deepEqual(revealPan({ x: 700, y: 400, w: 200, h: 1200 }, at1, stageBox), { dx: 0, dy: 0 });
});

test('revealPan: a card bigger than the stage with none of it showing pans to its top-left corner', () => {
  // Below the stage, taller than it: its top comes in at the margin; across, it fits, so as before.
  assert.deepEqual(revealPan({ x: 700, y: 900, w: 200, h: 1200 }, at1, stageBox), { dx: -148, dy: -852 });
  // Above it: the top again, never the bottom (never fitted).
  assert.deepEqual(revealPan({ x: 100, y: -2000, w: 200, h: 1200 }, at1, stageBox), { dx: 0, dy: 2048 });
  // Bigger both ways, off to the left: the top-left corner at the margin.
  assert.deepEqual(revealPan({ x: -3000, y: 100, w: 1000, h: 1000 }, at1, stageBox), { dx: 3048, dy: 0 });
  assert.deepEqual(revealPan({ x: -3000, y: -3000, w: 1000, h: 1000 }, at1, stageBox), { dx: 3048, dy: 3048 });
});

test('Viewport.reveal pans by revealPan and leaves the zoom', () => {
  const { vp } = viewport(false);
  vp.reveal({ x: 100, y: 900, w: 200, h: 1200 });
  assert.deepEqual(vp.snapshot(), { x: 0, y: -852, k: 1 });
  vp.reveal({ x: 100, y: 900, w: 200, h: 1200 });
  assert.deepEqual(vp.snapshot(), { x: 0, y: -852, k: 1 });
});

// Ruling 12 (PLAN decision 4): Z fits the selection to 75% of the stage's width or height, whichever
// binds, centred, up to the board's top zoom; Fit (the default) keeps its 32px margin and 110% cap.
test('fit with no options: 32px a side, never above 110%', () => {
  const { vp } = viewport(false);
  vp.fit({ x: 0, y: 0, w: 100, h: 100 }, false);
  assert.equal(vp.k, 1.1);
  vp.fit({ x: 0, y: 0, w: 1472, h: 200 }, false);
  assert.equal(vp.k, 0.5);
});

test('fit with SELECTION_FIT: one card fills 75% of the binding side, centred, up to the top zoom', () => {
  const { vp } = viewport(false);
  vp.fit({ x: 10, y: 20, w: 400, h: 200 }, false, SELECTION_FIT);
  assert.equal(vp.k, 1.5); // 600 / 400: the width binds
  assert.deepEqual({ x: vp.x, y: vp.y }, { x: (800 - 600) / 2 - 15, y: (600 - 300) / 2 - 30 });
  vp.fit({ x: 0, y: 0, w: 1600, h: 300 }, false, SELECTION_FIT);
  assert.equal(vp.k, 0.375); // 600 / 1600
  vp.fit({ x: 0, y: 0, w: 100, h: 900 }, false, SELECTION_FIT);
  assert.equal(vp.k, 0.5); // 450 / 900: the height binds
  // A small card: above 110%, but never past the top zoom.
  vp.fit({ x: 0, y: 0, w: 240, h: 120 }, false, SELECTION_FIT);
  assert.equal(vp.k, 2.5);
});

test('fit with APP_FIT: one app card\'s binding side fills 95% of the stage, centred, up to the top zoom (card-polish FE_01)', () => {
  const { vp } = viewport(false);
  vp.fit({ x: 10, y: 20, w: 362, h: 512 }, false, APP_FIT);
  assert.equal(vp.k, 600 * 0.95 / 512); // the height binds
  assert.ok(Math.abs(512 * vp.k - 0.95 * 600) < 1e-9);
  assert.deepEqual({ x: vp.x, y: vp.y }, { x: (800 - 362 * vp.k) / 2 - 10 * vp.k, y: (600 - 512 * vp.k) / 2 - 20 * vp.k });
  vp.fit({ x: 0, y: 0, w: 900, h: 300 }, false, APP_FIT);
  assert.equal(vp.k, 800 * 0.95 / 900); // the width binds, below 100%
  vp.fit({ x: 0, y: 0, w: 120, h: 80 }, false, APP_FIT);
  assert.equal(vp.k, 2.5); // never past the top zoom
});

test('a fit waiting for room keeps its options', () => {
  let width = 0;
  const stage = { dataset: {}, getBoundingClientRect: () => ({ left: 0, top: 0, width, height: 600 }) };
  const world = worldStub();
  const vp = new Viewport(stage as unknown as HTMLElement, world as unknown as HTMLElement);
  vp.fit({ x: 0, y: 0, w: 400, h: 200 }, false, SELECTION_FIT);
  assert.equal(vp.k, 1);
  width = 800;
  vp.resized();
  assert.equal(vp.k, 1.5);
});
