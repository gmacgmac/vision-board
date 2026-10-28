// The panel's own height (apps.md § Panel size; the appFit flag): `ui/notifications/size-changed`
// sets the frame's height, rounded and held to 120 to APP_LIMITS.toldHeight (1080: never stored,
// so past the agent's 800); the same height twice does nothing; a width is ignored; a loop
// (content that grows with its frame) ends at the clamp; the message cap
// still counts it. Without `fitHeight` (the flag off) it is ignored, as before. Fake windows:
// app-frame-harness.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APP_LIMITS, APP_SIZE, flagOn } from '#format';
import { panelHeight } from '../src/index.ts';
import { harness, note, ready, req } from './app-frame-harness.ts';

const size = (params: unknown) => note('ui/notifications/size-changed', params);

/** A ready bridge whose frame heights are recorded. */
function fitting() {
  const heights: number[] = [];
  const h = harness({ fitHeight: (height) => { heights.push(height); } });
  ready(h);
  return { h, heights };
}

test('the appFit flag is on by default', () => {
  assert.equal(flagOn('appFit'), true);
  assert.equal(flagOn('appFit', { appFit: false }), false);
});

test(`a height inside ${APP_SIZE.h.min} to ${APP_LIMITS.toldHeight} sets the frame's height, rounded; nothing goes back to the panel`, () => {
  const { h, heights } = fitting();
  const before = h.sent.length;
  h.post(size({ height: 500 }));
  h.post(size({ height: 260.4 }));
  h.post(size({ height: 260.6 }));
  assert.deepEqual(heights, [500, 260, 261]);
  assert.equal(h.sent.length, before, 'no answer to a notification, no host-context-changed');
});

test(`a told height may pass the agent's ${APP_SIZE.h.max}: 1000 is 1000; above ${APP_LIMITS.toldHeight} is ${APP_LIMITS.toldHeight}; below ${APP_SIZE.h.min} is ${APP_SIZE.h.min}`, () => {
  assert.equal(APP_LIMITS.toldHeight, 1080);
  const { h, heights } = fitting();
  h.post(size({ height: 1000 }));
  assert.deepEqual(heights, [1000]);
  heights.length = 0;
  h.post(size({ height: 1200 }));
  h.post(size({ height: 5000 }));
  h.post(size({ height: 12 }));
  h.post(size({ height: -40 }));
  assert.deepEqual(heights, [APP_LIMITS.toldHeight, APP_SIZE.h.min]);
});

test('the same height twice does nothing; so does a height that rounds to the last', () => {
  const { h, heights } = fitting();
  h.post(size({ height: 400 }));
  h.post(size({ height: 400 }));
  h.post(size({ height: 400.2 }));
  h.post(size({ height: 1200 }));
  h.post(size({ height: 1500 }));
  assert.deepEqual(heights, [400, APP_LIMITS.toldHeight]);
});

test('a width is ignored: width alone does nothing, and with a height only the height counts', () => {
  const { h, heights } = fitting();
  h.post(size({ width: 900 }));
  h.post(size({ width: 900, height: 300 }));
  assert.deepEqual(heights, [300]);
});

test('params that carry no height in px are ignored', () => {
  const { h, heights } = fitting();
  for (const params of [undefined, null, 'tall', [300], {}, { height: '300' }, { height: null }, { height: Number.NaN }, { height: Number.POSITIVE_INFINITY }]) h.post(size(params));
  assert.deepEqual(heights, []);
  assert.deepEqual([panelHeight({ height: 333.5 }), panelHeight({ height: 'x' }), panelHeight(undefined)], [334, undefined, undefined]);
});

test('a resize loop (content that grows with its frame) ends at the clamp', () => {
  const { h, heights } = fitting();
  let frame: number = APP_SIZE.h.default;
  for (let i = 0; i < 200; i += 1) {
    h.tick(100);
    h.post(size({ height: frame + 37 }));
    frame = heights.at(-1) ?? frame;
  }
  assert.equal(frame, APP_LIMITS.toldHeight);
  assert.ok(heights.length < 30, `${heights.length} heights before it stopped`);
  assert.equal(heights.filter((x) => x === APP_LIMITS.toldHeight).length, 1, 'once at the clamp, nothing more');
});

test(`size-changed counts towards the ${APP_LIMITS.panelMessagesPerSecond} messages a second: past it, it is dropped`, () => {
  const { h, heights } = fitting();
  for (let i = 0; i < APP_LIMITS.panelMessagesPerSecond; i += 1) h.post(req(i, 'ping'));
  h.post(size({ height: 500 }));
  assert.deepEqual(heights, []);
  h.tick(1000);
  h.post(size({ height: 500 }));
  assert.deepEqual(heights, [500]);
});

test('a panel may tell its height before it says initialized; a closed bridge takes none', () => {
  const heights: number[] = [];
  const h = harness({ fitHeight: (height) => { heights.push(height); } });
  h.post(size({ height: 300 }));
  h.bridge.close();
  h.post(size({ height: 400 }));
  assert.deepEqual(heights, [300]);
});

test('flag off (no fitHeight): size-changed is ignored, as before', () => {
  const h = harness();
  ready(h);
  const before = h.sent.length;
  h.post(size({ height: 500 }));
  assert.equal(h.sent.length, before);
});
