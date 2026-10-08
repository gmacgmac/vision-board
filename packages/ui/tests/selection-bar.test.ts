// The selection bar pattern's core and template (3_FE_02 rulings 1-2): centred above the selection,
// below it when there is no room, kept inside the stage; the count and the buttons it is given.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BAR_EDGE, BAR_GAP, barView, boxAround, boxBetween, placeBar, selectionBarTemplate, touches,
} from '../src/index.ts';

const STAGE = { w: 1000, h: 600 };
const BAR = { w: 300, h: 38 };

test('placeBar: centred above the selection', () => {
  const p = placeBar({ x: 400, y: 200, w: 200, h: 100 }, BAR, STAGE);
  assert.deepEqual(p, { side: 'above', x: 350, y: 200 - BAR_GAP - BAR.h });
});

test('placeBar: below when there is no room above; kept inside the stage on both sides', () => {
  assert.deepEqual(placeBar({ x: 400, y: 20, w: 200, h: 100 }, BAR, STAGE), { side: 'below', x: 350, y: 120 + BAR_GAP });
  assert.equal(placeBar({ x: -100, y: 300, w: 100, h: 50 }, BAR, STAGE).x, BAR_EDGE);
  assert.equal(placeBar({ x: 950, y: 300, w: 200, h: 50 }, BAR, STAGE).x, STAGE.w - BAR_EDGE - BAR.w);
  // A selection taller than the stage: the bar stays on screen.
  assert.equal(placeBar({ x: 400, y: -50, w: 200, h: 2000 }, BAR, STAGE).y, STAGE.h - BAR_EDGE - BAR.h);
});

test('barView: the count and its name for a selection; no count for an area', () => {
  const buttons = [{ id: 'comment', label: 'Comment', primary: true }];
  assert.deepEqual(barView(3, buttons), { name: 'Selection: 3 selected', count: '3 selected', buttons });
  assert.deepEqual(barView(0, buttons), { name: 'Area', count: '', buttons });
});

test('template: the count then one button per command, escaped; the primary marked', () => {
  const html = selectionBarTemplate(barView(2, [
    { id: 'comment', label: 'Comment', primary: true }, { id: 'clear', label: 'Clear <x>' },
  ]));
  assert.equal(html, '<span class="vb-sb-count">2 selected</span>'
    + '<button type="button" class="vb-sb-btn vb-sb-primary" data-command="comment">Comment</button>'
    + '<button type="button" class="vb-sb-btn" data-command="clear">Clear &#60;x&#62;</button>');
  assert.match(selectionBarTemplate(barView(1, [{ id: 'reset-places', label: 'Reset places', disabled: true }])), /data-command="reset-places" disabled>/);
  assert.doesNotMatch(selectionBarTemplate(barView(0, [{ id: 'zoom-area', label: 'Zoom to this area' }])), /vb-sb-count/);
});

test('boxes: between two corners, touching, and around several', () => {
  assert.deepEqual(boxBetween({ x: 50, y: 10 }, { x: 10, y: 40 }), { x: 10, y: 10, w: 40, h: 30 });
  const a = { x: 0, y: 0, w: 10, h: 10 };
  assert.ok(touches(a, { x: 10, y: 10, w: 5, h: 5 }), 'a shared corner touches');
  assert.ok(!touches(a, { x: 11, y: 0, w: 5, h: 5 }));
  assert.deepEqual(boxAround([a, { x: 20, y: -5, w: 5, h: 5 }]), { x: 0, y: -5, w: 25, h: 15 });
  assert.equal(boxAround([]), undefined);
});

// stage5-follow-ups FE_02 (flag selectionPill): over a selection the bar starts as a pill.
test('barView with the pill: the label and whether it is open; the area bar is compact with no pill state', () => {
  const buttons = [{ id: 'comment', label: 'Comment', primary: true }];
  assert.deepEqual(barView(3, buttons, { open: false }), { name: 'Selection: 3 selected', count: '3 selected', buttons, pill: true, open: false });
  assert.equal(barView(1, buttons, { open: true }).open, true);
  assert.deepEqual(barView(0, buttons, { open: true }), { name: 'Area', count: '', buttons, pill: true });
  assert.equal(barView(3, buttons).pill, undefined, 'no pill without the flag');
});

test('template with the pill: a button with the count and a chevron first, then every command button', () => {
  const html = selectionBarTemplate(barView(3, [{ id: 'clear', label: 'Clear' }], { open: false }));
  assert.equal(html, '<button type="button" class="vb-sb-pill" aria-expanded="false">3 selected<span class="vb-sb-chevron" aria-hidden="true"></span></button>'
    + '<button type="button" class="vb-sb-btn" data-command="clear">Clear</button>');
  // Open or closed draws the same markup: the element sets aria-expanded and data-open, so the
  // pill keeps its focus when it opens.
  assert.equal(selectionBarTemplate(barView(3, [{ id: 'clear', label: 'Clear' }], { open: true })), html);
  assert.doesNotMatch(selectionBarTemplate(barView(0, [{ id: 'zoom-area', label: 'Zoom to this area' }], { open: false })), /vb-sb-pill/);
});
