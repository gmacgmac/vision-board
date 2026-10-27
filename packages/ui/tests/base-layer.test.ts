// The dismissable layer (base/layer-core.ts, base/layer.ts): a press outside or Esc closes it, only
// Esc gives focus back, a click-only layer stays open through a pan, and the stop removes every
// listener. Driven on a plain EventTarget standing in for the document.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { focusBackOn, isClick } from '../src/base/layer-core.ts';
import { dismissable } from '../src/base/layer.ts';
import type { DismissReason } from '../src/base/layer-core.ts';

const ev = (type: string, fields: Record<string, unknown> = {}) => Object.assign(new Event(type), fields);

function harness(o: { escape?: boolean; clickWithin?: number } = {}) {
  const doc = new EventTarget();
  const got: DismissReason[] = [];
  let inside = false;
  const stop = dismissable({ ...o, doc, within: () => inside, dismiss: (r) => got.push(r) });
  return { doc, got, stop, setInside: (v: boolean) => { inside = v; } };
}

test('only Esc gives focus back', () => {
  assert.equal(focusBackOn('escape'), true);
  assert.equal(focusBackOn('outside'), false);
});

test('a press that travels less than the threshold is a click', () => {
  assert.equal(isClick({ x: 0, y: 0 }, { x: 3, y: 4 }, 6), true);
  assert.equal(isClick({ x: 0, y: 0 }, { x: 3, y: 4 }, 5), false);
});

test('a press outside dismisses; a press inside does not', () => {
  const h = harness();
  h.setInside(true);
  h.doc.dispatchEvent(ev('pointerdown'));
  assert.deepEqual(h.got, []);
  h.setInside(false);
  h.doc.dispatchEvent(ev('pointerdown'));
  assert.deepEqual(h.got, ['outside']);
});

test('Esc dismisses only when asked, and is stopped there', () => {
  const quiet = harness();
  quiet.doc.dispatchEvent(ev('keydown', { key: 'Escape' }));
  assert.deepEqual(quiet.got, []);
  const h = harness({ escape: true });
  const esc = ev('keydown', { key: 'Escape' });
  let stopped = false;
  esc.stopPropagation = () => { stopped = true; };
  h.doc.dispatchEvent(ev('keydown', { key: 'Enter' }));
  h.doc.dispatchEvent(esc);
  assert.deepEqual(h.got, ['escape']);
  assert.equal(stopped, true);
});

test('a click-only layer closes on a click outside, not on a pan or a press that started inside', () => {
  const h = harness({ clickWithin: 6 });
  h.doc.dispatchEvent(ev('pointerdown', { clientX: 10, clientY: 10 }));
  h.doc.dispatchEvent(ev('pointerup', { clientX: 40, clientY: 10 }));
  assert.deepEqual(h.got, [], 'a pan');
  h.setInside(true);
  h.doc.dispatchEvent(ev('pointerdown', { clientX: 10, clientY: 10 }));
  h.setInside(false);
  h.doc.dispatchEvent(ev('pointerup', { clientX: 10, clientY: 10 }));
  assert.deepEqual(h.got, [], 'started inside');
  h.doc.dispatchEvent(ev('pointerdown', { clientX: 10, clientY: 10 }));
  h.doc.dispatchEvent(ev('pointerup', { clientX: 12, clientY: 11 }));
  assert.deepEqual(h.got, ['outside']);
});

test('the stop removes every listener', () => {
  const h = harness({ escape: true, clickWithin: 6 });
  h.stop();
  h.doc.dispatchEvent(ev('pointerdown', { clientX: 0, clientY: 0 }));
  h.doc.dispatchEvent(ev('pointerup', { clientX: 0, clientY: 0 }));
  h.doc.dispatchEvent(ev('keydown', { key: 'Escape' }));
  assert.deepEqual(h.got, []);
});
