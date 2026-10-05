// The note bubble's core and template (2e_FE_01 ruling 6; README picks 5, 11-12; Architect
// `positionPop`): it opens on the card's right, flips left when the right would leave the board,
// opens below when neither fits, and says what it is on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUBBLE_EDGE, BUBBLE_GAP, bubbleView, noteBubbleTemplate, placeBubble, saveIntent,
} from '../src/index.ts';

const stage = { w: 1600, h: 1000 };
const bubble = { w: 300, h: 180 };

test('placeBubble: on the card\'s right when it fits, 18px off the card, its top 14px below the card\'s', () => {
  const p = placeBubble({ x: 100, y: 200, w: 280, h: 160 }, bubble, stage);
  assert.deepEqual(p, { side: 'right', x: 100 + 280 + BUBBLE_GAP, y: 214, arrow: 22 });
});

test('placeBubble: flips to the left when the right would leave the board', () => {
  const p = placeBubble({ x: 1200, y: 200, w: 280, h: 160 }, bubble, stage);
  assert.equal(p.side, 'left');
  assert.equal(p.x, 1200 - BUBBLE_GAP - 300);
});

test('placeBubble: below when neither side fits, the arrow under the card\'s middle', () => {
  const narrow = { w: 700, h: 1000 };
  const p = placeBubble({ x: 200, y: 100, w: 280, h: 160 }, bubble, narrow);
  assert.equal(p.side, 'below');
  assert.equal(p.y, 100 + 160 + BUBBLE_GAP);
  assert.equal(p.x, 200);
  assert.equal(p.arrow, 140);
});

test('placeBubble: kept inside the board top and bottom, the arrow still at the card', () => {
  const low = placeBubble({ x: 100, y: 900, w: 280, h: 80 }, bubble, stage);
  assert.equal(low.y, stage.h - BUBBLE_EDGE - bubble.h);
  assert.equal(low.arrow, 900 + 14 + 22 - low.y);
  const high = placeBubble({ x: 100, y: -300, w: 280, h: 80 }, bubble, stage);
  assert.equal(high.y, BUBBLE_EDGE);
  assert.equal(high.arrow, 16, 'never past the bubble\'s corner');
});

test('placeBubble: follows the card, so a zoomed or panned card box moves it', () => {
  const a = placeBubble({ x: 100, y: 200, w: 280, h: 160 }, bubble, stage);
  const b = placeBubble({ x: 140, y: 230, w: 140, h: 80 }, bubble, stage);
  assert.deepEqual([b.x - a.x, b.y - a.y], [40 - 140, 30]);
});

test('bubbleView: the head, buttons and hint for a new note, an edit and a sent note', () => {
  const add = bubbleView({ mode: 'new', kind: 'comment', number: 42 });
  assert.deepEqual([add.heading, add.primary, add.cancel, add.remove, add.hint],
    ['Note on 42', 'Add note', 'Cancel', false, 'Enter add · Esc cancel']);
  const edit = bubbleView({ mode: 'edit', kind: 'context', number: 42, index: 1, text: 'Why?' });
  assert.deepEqual([edit.heading, edit.primary, edit.remove, edit.text], ['Edit note on 42', 'Save', true, 'Why?']);
  assert.match(edit.placeholder, /unclear/);
  const sent = bubbleView({ mode: 'sent', kind: 'comment', number: 42, index: 2, text: 'Done' });
  assert.deepEqual([sent.heading, sent.primary, sent.cancel, sent.remove, sent.hint],
    ['Note 2 on 42, sent', undefined, 'Close', false, '']);
});

test('saveIntent: empty text never removes; a new comment needs words; a new "more context" may go without', () => {
  assert.equal(saveIntent('edit', 'comment', '  '), 'skip');
  assert.equal(saveIntent('edit', 'context', ''), 'skip');
  assert.equal(saveIntent('new', 'comment', ''), 'skip');
  assert.equal(saveIntent('new', 'context', ''), 'save');
  assert.equal(saveIntent('new', 'comment', 'Why?'), 'save');
  assert.equal(saveIntent('sent', 'comment', 'Why?'), 'skip');
});

test('noteBubbleTemplate: the number chip, a labelled textarea, Remove only when editing, no inline style', () => {
  const add = noteBubbleTemplate(bubbleView({ mode: 'new', kind: 'comment', number: 42 }), 42);
  assert.match(add, /^<div class="vb-nb-head"><span class="vb-nb-num" aria-hidden="true">42<\/span><span class="vb-nb-title">Note on 42<\/span>/);
  assert.match(add, /<textarea class="vb-nb-text" aria-label="Note text" rows="3" maxlength="4000" placeholder="Your note for the agent"><\/textarea>/);
  assert.match(add, /<kbd>Enter<\/kbd> add · <kbd>Esc<\/kbd> cancel/);
  assert.doesNotMatch(add, /data-note-do="remove"|style=/);
  const edit = noteBubbleTemplate(bubbleView({ mode: 'edit', kind: 'comment', number: 42, text: '<b>x</b>' }), 42);
  assert.match(edit, /data-note-do="remove">Remove<\/button>/);
  assert.match(edit, />&#60;b&#62;x&#60;\/b&#62;<\/textarea>/, 'the text is escaped');
});

test('noteBubbleTemplate: a sent note is shown as Markdown with Close, never in a textarea', () => {
  const html = noteBubbleTemplate(bubbleView({ mode: 'sent', kind: 'comment', number: 7, index: 1, text: 'Check **this**' }), 7);
  assert.doesNotMatch(html, /<textarea|data-note-do="save"|data-note-do="remove"/);
  assert.match(html, /<div class="vb-nb-read"><p class="vb-md-p">Check <strong>this<\/strong><\/p><\/div>/);
  assert.match(html, /data-note-do="cancel">Close<\/button>/);
});
