// The zoom the toolbar shows and the level below which the cards' controls hide (tracker N13): one
// rule, so the number on screen and the hiding always agree. No browser: the stage and world are
// stand-ins with the few members the viewport touches.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAR_K, Viewport, zoomPercent } from '../src/board/viewport.ts';
import { commandTitle, zoomTitle } from '../src/board/commands.ts';

function viewport(hideFar: boolean) {
  const stage = { dataset: {} as Record<string, string>, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) };
  const world = { style: { transform: '' } };
  return { vp: new Viewport(stage as unknown as HTMLElement, world as unknown as HTMLElement, hideFar), stage };
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

test('with the flag off the stage is never far, at any zoom', () => {
  const { vp, stage } = viewport(false);
  for (const k of [0.2, 0.5, 0.74, 1]) {
    vp.k = k;
    vp.apply();
    assert.equal(stage.dataset.zoom, undefined, `k ${k}`);
  }
});

test('a zoom tooltip says what the button does, its key and the level', () => {
  assert.equal(zoomTitle('zoom-in', 75), 'Zoom in · + · 75% now');
  assert.equal(zoomTitle('zoom-out', 120), 'Zoom out · - · 120% now');
  assert.equal(zoomTitle('fit', 47), 'Fit · F · 47% now');
  assert.equal(commandTitle('zoom-in'), 'Zoom in · +');
});
