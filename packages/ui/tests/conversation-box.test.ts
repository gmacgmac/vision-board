// The conversation box's core and template (nodeEdges, FE_03, D-099 3): Enter adds a note and never sends to the agent;
// only Cmd or Ctrl Enter (Ask now) does; Shift Enter is a new line. The box says the node, its tabs only when the node
// is in a note on several nodes, a note waiting for Send, "Waiting for the agent", and why Ask now is disabled. Its
// field is never read-only, so changed words ask before they are discarded.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bubbleView, cancelIntent, fieldKey, readOnlyMode, saveIntent } from '../src/index.ts';
import type { NotesEntry } from '../src/index.ts';
import { conversationTemplate } from '../src/note-bubble/conversation-template.ts';

const key = (k: Partial<KeyboardEvent>) => ({ key: 'Enter', shiftKey: false, metaKey: false, ctrlKey: false, isComposing: false, ...k });
const NOTES: NotesEntry[] = [
  { seq: 10, index: 1, who: 'Your note 1 · Sent', text: 'Is 96 GB enough?', sent: true, at: '', replies: [{ seq: 11, who: 'Agent reply', text: 'Yes.', at: '' }] },
  { seq: 12, index: 2, who: 'Your note 2', text: 'Book it then.', sent: false, at: '' },
];

test('fieldKey: Enter adds the note; Cmd or Ctrl Enter asks now, in the box only; Shift Enter and an IME are left alone', () => {
  assert.equal(fieldKey(key({}), 'conversation'), 'save');
  assert.equal(fieldKey(key({ metaKey: true }), 'conversation'), 'ask');
  assert.equal(fieldKey(key({ ctrlKey: true }), 'conversation'), 'ask');
  assert.equal(fieldKey(key({ shiftKey: true }), 'conversation'), null);
  assert.equal(fieldKey(key({ isComposing: true }), 'conversation'), null);
  assert.equal(fieldKey(key({ key: 'a' }), 'conversation'), null);
  // Enter alone never asks; outside the box, Cmd Enter saves as it always did.
  for (const mode of ['new', 'edit', 'conversation'] as const) assert.notEqual(fieldKey(key({}), mode), 'ask');
  assert.equal(fieldKey(key({ metaKey: true }), 'edit'), 'save');
});

test('the box has a field: changed words ask before they go, and Add note writes only words', () => {
  assert.equal(readOnlyMode('conversation'), false);
  assert.equal(cancelIntent('conversation', true), 'ask');
  assert.equal(cancelIntent('conversation', false), 'close');
  assert.equal(saveIntent('conversation', 'comment', '  '), 'skip');
  assert.equal(saveIntent('conversation', 'comment', 'Book it'), 'save');
});

test('bubbleView: the box says its node, its field, Add note and Ask now with their keys, and keeps a draft', () => {
  const v = bubbleView({ mode: 'conversation', kind: 'comment', number: 34, title: 'Hardware', text: 'draft', entries: NOTES });
  assert.equal(v.heading, 'Conversation on 34');
  assert.equal(v.placeholder, 'Reply or ask about 34');
  assert.equal(v.primary, 'Add note');
  assert.equal(v.text, 'draft');
  assert.equal(v.box?.title, 'Hardware');
  assert.match(v.box!.askTip, /Cmd or Ctrl Enter/);
  assert.match(v.box!.addTip, /Enter/);
  assert.equal(v.box?.blocked, undefined);
  assert.equal(v.box?.waiting, undefined);
  const group = bubbleView({ mode: 'conversation', kind: 'comment', number: 35, numbers: [35, 28], entries: [] });
  assert.equal(group.placeholder, 'Reply or ask about 35 and 28');
});

test('Ask now disabled: its tooltip is the reason, and the button stays focusable', () => {
  const v = bubbleView({ mode: 'conversation', kind: 'comment', number: 34, title: 'Hardware', blocked: 'Board is locked' });
  assert.equal(v.box?.askTip, 'Board is locked');
  const html = conversationTemplate(v, 34);
  assert.match(html, /data-note-do="ask" title="Board is locked" aria-disabled="true"/);
  assert.doesNotMatch(html, /data-note-do="ask"[^>]*disabled>/);
});

test('conversationTemplate: head, thread oldest first with the queued note marked, waiting, the field and two buttons', () => {
  const v = bubbleView({ mode: 'conversation', kind: 'comment', number: 34, title: 'Hardware', entries: NOTES, waiting: true });
  const html = conversationTemplate(v, 34);
  assert.match(html, /vb-nb-num[^>]*>34<\/span><span class="vb-node-box-title">Hardware/);
  assert.ok(html.indexOf('Is 96 GB enough?') < html.indexOf('Yes.') && html.indexOf('Yes.') < html.indexOf('Book it then.'));
  assert.match(html, /class="vb-nb-note vb-nb-queued" data-seq="12"/);
  assert.match(html, /not sent yet · goes with Send/);
  assert.equal((html.match(/vb-nb-queued/g) ?? []).length, 1);
  assert.match(html, /<p class="vb-nb-wait" role="status">Waiting for the agent<\/p>/);
  assert.match(html, /<textarea class="vb-nb-text" aria-label="Reply or ask about 34" rows="1"/);
  assert.match(html, /data-note-do="ask"[^>]*>Ask now<\/button><button title="Add note \(Enter\)[^"]*" type="button" class="vb-nb-btn vb-nb-primary" data-note-do="save">Add note/);
  assert.doesNotMatch(html, /role="tablist"/);
});

test('conversationTemplate: empty, only the field; tabs only with a note on several nodes, the shown one selected', () => {
  const empty = conversationTemplate(bubbleView({ mode: 'conversation', kind: 'comment', number: 9, title: 'T' }), 9);
  assert.doesNotMatch(empty, /vb-nb-thread/);
  const tabs = [{ key: '', label: 'This node' }, { key: '28,35', label: 'With 28', on: true }];
  const html = conversationTemplate(bubbleView({ mode: 'conversation', kind: 'comment', number: 35, title: 'T', tabs }), 35);
  assert.match(html, /role="tablist" aria-label="Conversations"/);
  assert.match(html, /data-tab="" aria-selected="false">This node/);
  assert.match(html, /data-tab="28,35" aria-selected="true">With 28/);
});
