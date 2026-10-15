// The note bubble's core and template (2e_FE_01 ruling 6; README picks 5, 11-12; Architect
// `positionPop`): it opens on the card's right, flips left when the right would leave the board,
// opens below when neither fits, and says what it is on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BUBBLE_EDGE, BUBBLE_GAP, bubbleView, cancelIntent, isDirty, NOTE_DISCARD_EVENT, noteBubbleTemplate, partAnchor, placeBubble, readOnlyMode,
  replyEntry, saveIntent, titleAnchor,
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

// Field report batch 3 (BE_02's hand-off): beside a card, the bubble covers its neighbour, and in a
// row lined up by its tops the neighbour's footer buttons sat under the bubble's edge. `avoid` lists
// such strips; the bubble moves up or down its side, the arrow still on the card, or to the other side.
test('placeBubble: clear of the strips to avoid, moved up its side with the arrow still on the card', () => {
  const card = { x: 100, y: 200, w: 280, h: 160 };
  const footer = { x: 400, y: 340, w: 280, h: 36 };
  const p = placeBubble(card, bubble, stage, [footer]);
  assert.equal(p.side, 'right');
  assert.equal(p.y + bubble.h, footer.y - BUBBLE_EDGE, 'ends just above the strip');
  assert.equal(p.y + p.arrow, card.y + 14 + 22, 'the arrow still points at the card\'s top part');
  assert.deepEqual(placeBubble(card, bubble, stage, [{ ...footer, x: 900 }]), placeBubble(card, bubble, stage), 'a strip elsewhere changes nothing');
});

test('placeBubble: the other side when its own side has no clear place, then below, and as before when none has', () => {
  const card = { x: 400, y: 200, w: 280, h: 160 };
  // A strip on the right the bubble can move neither above nor below while pointing at the card.
  const right = { x: 700, y: 150, w: 280, h: 300 };
  const p = placeBubble(card, bubble, stage, [right]);
  assert.equal(p.side, 'left');
  assert.equal(p.y, 214);
  const left = { x: 0, y: 150, w: 380, h: 300 };
  const below = placeBubble(card, bubble, stage, [right, left]);
  assert.deepEqual([below.side, below.x, below.y], ['below', 400, 200 + 160 + BUBBLE_GAP], 'neither side clear: below the card, when that is');
  const under = { x: 400, y: 400, w: 280, h: 40 };
  assert.deepEqual(placeBubble(card, bubble, stage, [right, left, under]), placeBubble(card, bubble, stage), 'covered every way: the first choice');
});

test('bubbleView: the head, buttons and hint for a new note, an edit and a sent note', () => {
  const add = bubbleView({ mode: 'new', kind: 'comment', number: 42 });
  assert.deepEqual([add.heading, add.primary, add.cancel, add.remove, add.hint],
    ['Note on 42', 'Add note', 'Cancel', false, 'Enter add · Esc cancel']);
  const edit = bubbleView({ mode: 'edit', kind: 'context', number: 42, index: 1, text: 'Why?' });
  assert.deepEqual([edit.heading, edit.primary, edit.remove, edit.text], ['Edit note on 42', 'Save', true, 'Why?']);
  assert.equal(edit.placeholder, 'Your note for the agent', 'an old More context reads as a note (D-045)');
  const sent = bubbleView({ mode: 'sent', kind: 'comment', number: 42, index: 2, text: 'Done' });
  assert.deepEqual([sent.heading, sent.primary, sent.cancel, sent.remove, sent.hint],
    ['Note 2 on 42, sent', undefined, 'Close', false, '']);
});

test('saveIntent: empty text never removes; a new note needs words, whatever its kind (D-045)', () => {
  assert.equal(saveIntent('edit', 'comment', '  '), 'skip');
  assert.equal(saveIntent('edit', 'context', ''), 'skip');
  assert.equal(saveIntent('new', 'comment', ''), 'skip');
  assert.equal(saveIntent('new', 'context', ''), 'skip');
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

test('bubbleView and template for a note on a group of cards (3_FE_02 ruling 3): its head names them, no number chip', () => {
  const numbers = [12, 14, 15];
  assert.equal(bubbleView({ mode: 'new', kind: 'comment', number: 12, numbers }).heading, 'Note on 3 cards: 12, 14, 15');
  assert.equal(bubbleView({ mode: 'edit', kind: 'comment', number: 12, numbers, text: 'x' }).heading, 'Edit note on 3 cards: 12, 14, 15');
  assert.equal(bubbleView({ mode: 'sent', kind: 'comment', number: 12, numbers, text: 'x' }).heading, 'Note on 3 cards: 12, 14, 15, sent');
  const html = noteBubbleTemplate(bubbleView({ mode: 'new', kind: 'comment', number: 12, numbers }));
  assert.match(html, /^<div class="vb-nb-head"><span class="vb-nb-title">Note on 3 cards: 12, 14, 15<\/span>/);
});

test('bubbleView for a note on a whole container (3_FE_04 ruling 3): its head names the container, no number chip', () => {
  const container = 'Review';
  assert.equal(bubbleView({ mode: 'new', kind: 'comment', container }).heading, 'Note on container Review');
  assert.equal(bubbleView({ mode: 'edit', kind: 'comment', container, text: 'x' }).heading, 'Edit note on container Review');
  assert.equal(bubbleView({ mode: 'sent', kind: 'comment', container, index: 2, text: 'x' }).heading, 'Note 2 on container Review, sent');
  const html = noteBubbleTemplate(bubbleView({ mode: 'new', kind: 'comment', container }));
  assert.match(html, /^<div class="vb-nb-head"><span class="vb-nb-title">Note on container Review<\/span>/);
});

test('titleAnchor: placed from it, the bubble opens beside the title line with its arrow on the line', () => {
  const line = { x: 200, y: 300, w: 600, h: 24 };
  const p = placeBubble(titleAnchor(line), bubble, stage);
  assert.equal(p.side, 'right');
  assert.equal(p.x, line.x + line.w + BUBBLE_GAP);
  // The arrow points at the middle of the title line.
  assert.equal(p.y + p.arrow, line.y + line.h / 2);
  // Below, when neither side fits: under the title line, not over the cards.
  const wide = placeBubble(titleAnchor({ x: 10, y: 300, w: 1500, h: 24 }), bubble, stage);
  assert.equal(wide.side, 'below');
  assert.equal(wide.y, 300 + 24 + BUBBLE_GAP);
});

test('isDirty: changed words are dirty; the words it opened with, line endings and surrounding spaces are not (step 4G ruling 4)', () => {
  assert.equal(isDirty('', ''), false);
  assert.equal(isDirty('Split it?', 'Split it?'), false);
  assert.equal(isDirty('Split it?', '  Split it?\n'), false);
  assert.equal(isDirty('a\r\nb', 'a\nb'), false);
  assert.equal(isDirty('', 'x'), true, 'a new note with words');
  assert.equal(isDirty('Split it?', 'Split it'), true);
  assert.equal(isDirty('Split it?', ''), true, 'cleared');
  assert.equal(isDirty('', '   '), false, 'only spaces typed into a new note');
});

test('cancelIntent: Esc or Cancel asks only with changed words, and never for a sent note', () => {
  assert.equal(cancelIntent('new', false), 'close');
  assert.equal(cancelIntent('edit', false), 'close');
  assert.equal(cancelIntent('new', true), 'ask');
  assert.equal(cancelIntent('edit', true), 'ask');
  assert.equal(cancelIntent('sent', true), 'close');
  assert.equal(NOTE_DISCARD_EVENT, 'vb-note-discard');
});

// ---- The exchange (popovers-larger-thread ruling 2): the note, then every reply to it, read-only ----

const replies = [
  replyEntry({ seq: 60, to: 20, agent: 'Pricing chat', text: 'Yes: **three** accounts.' }),
  replyEntry({ seq: 64, to: 20, text: 'Also: the sheet is updated.' }),
];

test('bubbleView: a sent note carries its replies in order and names its read-only part', () => {
  const v = bubbleView({ mode: 'sent', kind: 'comment', number: 7, index: 1, text: 'Why?', replies });
  assert.deepEqual(v.replies.map((r) => [r.seq, r.who]), [[60, 'Agent reply · Pricing chat'], [64, 'Agent reply']]);
  assert.deepEqual([v.heading, v.cancel, v.primary, v.thread], ['Note 1 on 7, sent', 'Close', undefined, 'Note and replies']);
  assert.equal(bubbleView({ mode: 'sent', kind: 'comment', number: 7, text: 'Why?' }).thread, 'Note');
  assert.deepEqual(bubbleView({ mode: 'sent', kind: 'comment', number: 7, text: 'Why?' }).replies, []);
});

test('bubbleView: a reply that names no note opens on its own, read-only, Close only', () => {
  const v = bubbleView({ mode: 'reply', kind: 'comment', number: 7, replies: [replies[1]!] });
  assert.deepEqual([v.heading, v.cancel, v.primary, v.remove, v.hint, v.text, v.thread], ['Reply on 7', 'Close', undefined, false, '', '', 'Reply']);
  assert.equal(readOnlyMode('reply'), true);
  assert.equal(readOnlyMode('sent'), true);
  assert.equal(readOnlyMode('edit'), false);
  assert.equal(saveIntent('reply', 'comment', 'x'), 'skip');
  assert.equal(cancelIntent('reply', true), 'close');
});

test('noteBubbleTemplate: the exchange shows the note, then each reply in order, as Markdown in one scrolling tab stop', () => {
  const html = noteBubbleTemplate(bubbleView({ mode: 'sent', kind: 'comment', number: 7, index: 1, text: 'Why?', replies }), 7);
  assert.match(html, /<div class="vb-nb-thread" role="group" aria-label="Note and replies" tabindex="0"><div class="vb-nb-read"><p class="vb-md-p">Why\?<\/p><\/div><ol class="vb-nb-replies">/);
  assert.match(html, /<li class="vb-nb-reply"><span class="vb-nb-who">Agent reply · Pricing chat<\/span><div class="vb-nb-reply-text"><p class="vb-md-p">Yes: <strong>three<\/strong> accounts.<\/p><\/div><\/li>/);
  assert.ok(html.indexOf('three') < html.indexOf('sheet is updated'), 'oldest first');
  assert.doesNotMatch(html, /<textarea|data-note-do="save"|style=/);
  const alone = noteBubbleTemplate(bubbleView({ mode: 'reply', kind: 'comment', number: 7, replies: [replies[1]!] }), 7);
  assert.match(alone, /<span class="vb-nb-title">Reply on 7<\/span>/);
  assert.match(alone, /aria-label="Reply" tabindex="0"><ol class="vb-nb-replies"><li class="vb-nb-reply">/);
  assert.doesNotMatch(alone, /vb-nb-read|<textarea/);
  assert.match(alone, /data-note-do="cancel">Close<\/button>/);
  // A note still being edited keeps its text box; any replies follow it, read-only.
  const edit = noteBubbleTemplate(bubbleView({ mode: 'edit', kind: 'comment', number: 7, text: 'x', replies: [replies[0]!] }), 7);
  assert.match(edit, /<\/textarea><div class="vb-nb-thread" role="group" aria-label="Replies" tabindex="0"><ol class="vb-nb-replies">/);
  assert.doesNotMatch(noteBubbleTemplate(bubbleView({ mode: 'edit', kind: 'comment', number: 7, text: 'x' }), 7), /vb-nb-thread/);
});

test('partAnchor: placed from it, the bubble opens beside the card with its arrow on the part pressed, and below under the card', () => {
  const card = { x: 100, y: 200, w: 280, h: 400 };
  const part = { x: 100, y: 480, w: 280, h: 60 };
  const p = placeBubble(partAnchor(card, part), bubble, stage);
  assert.equal(p.side, 'right');
  assert.equal(p.x, card.x + card.w + BUBBLE_GAP);
  assert.equal(p.y + p.arrow, part.y + part.h / 2);
  const narrow = placeBubble(partAnchor(card, part), bubble, { w: 600, h: 1000 });
  assert.deepEqual([narrow.side, narrow.y], ['below', card.y + card.h + BUBBLE_GAP]);
});

test('bubbleView: a note the agent answered before a Send reads "answered", not "sent" (ruling 5)', () => {
  assert.equal(bubbleView({ mode: 'sent', kind: 'comment', number: 7, index: 1, text: 'x', answered: true }).heading, 'Note 1 on 7, answered');
  assert.equal(bubbleView({ mode: 'sent', kind: 'comment', container: 'Review', index: 2, text: 'x', answered: true }).heading, 'Note 2 on container Review, answered');
});
