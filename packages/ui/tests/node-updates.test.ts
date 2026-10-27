// A changed card (proposals-seen-parking FE_02): the "N updates" tab, the stepper's step with its
// change chips and what the text gained, "You're up to date", the card's name, and the markup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '#format';
import type { BoardState } from '#actions';
import type { CardStep, CardUpdates } from '../src/index.ts';
import { nodeState, nodeTemplate, stepMarkup } from '../src/index.ts';

const r: ViewNode = { id: '44', n: 44, region: 'r', kind: 'risk', title: 'The floor undercuts self-serve' };
const board = (): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), flags: new Set() });
const steps: CardStep[] = [
  { ver: 2, when: '30 Sep, 15:40', agent: 'Pricing chat', changes: [{ field: 'body', change: 'added', text: 'The credit   amount\nis in.' }] },
  { ver: 3, when: '30 Sep, 15:41', changes: [{ field: 'title', change: 'changed', text: 'The floor undercuts self-serve at 35+ seats' }, { field: 'tags', change: 'removed' }] },
  { ver: 4, when: '30 Sep, 15:42', changes: [{ field: 'body', change: 'changed' }] },
];
const withUpdates = (u: CardUpdates, selected = false) => nodeState(r, board(), undefined, selected, { updates: u });

test('no updates: no tab, the name as before', () => {
  assert.equal(nodeState(r, board()).updates, undefined);
  assert.equal(withUpdates({ count: 0 }).updates, undefined);
});

test('collapsed: the tab counts the unseen versions and the name says so', () => {
  const st = withUpdates({ count: 3 });
  assert.deepEqual(st.updates, { tab: '3 updates', label: '3 updates since you last looked. Show them', open: false, done: false });
  assert.equal(st.label, 'Item 44, Risk: The floor undercuts self-serve, 3 unseen updates');
  assert.equal(withUpdates({ count: 1 }, true).label.endsWith(', 1 unseen update, selected'), true);
});

test('open: the step shown, its line, chips and what the text gained', () => {
  const v = withUpdates({ count: 3, steps, at: 0 });
  assert.deepEqual(v.updates, {
    tab: '3 updates', label: '3 updates since you last looked. Hide them', open: true, done: false,
    step: {
      label: 'Update 1 of 3, v2', head: 'v2 · 30 Sep, 15:40 · Pricing chat', count: 'Update 1 of 3', first: true,
      chips: [{ change: 'added', text: '+ body' }], lines: ['The credit amount is in.'],
    },
  });
  assert.equal(v.label.endsWith('self-serve, showing update 1 of 3'), true);
  const second = withUpdates({ count: 1, steps, at: 1 }).updates!;
  assert.equal(second.tab, '3 updates', 'the count stays what it was when the stepper opened');
  assert.deepEqual(second.step, {
    label: 'Update 2 of 3, v3', head: 'v3 · 30 Sep, 15:41 · the agent', count: 'Update 2 of 3', first: false,
    chips: [{ change: 'changed', text: '~ title' }, { change: 'removed', text: '- tags' }],
    lines: ['Title: The floor undercuts self-serve at 35+ seats'],
  });
  assert.deepEqual(withUpdates({ count: 3, steps, at: 2 }).updates!.step!.lines, ['Body rewritten']);
});

test('after the last step: up to date, the tab goes', () => {
  const v = withUpdates({ count: 0, steps, at: 3 });
  assert.deepEqual(v.updates, { tab: '', label: 'Up to date', open: true, done: true });
  assert.equal(v.label, 'Item 44, Risk: The floor undercuts self-serve');
});

test('a long added text is cut short; a version with no change says so', () => {
  const long = withUpdates({ count: 1, steps: [{ ver: 2, when: 'now', changes: [{ field: 'body', change: 'added', text: 'x'.repeat(400) }] }], at: 0 });
  assert.equal(long.updates!.step!.lines[0]!.length, 160);
  assert.equal(long.updates!.step!.lines[0]!.endsWith('…'), true);
  assert.deepEqual(withUpdates({ count: 1, steps: [{ ver: 2, when: 'now', changes: [] }], at: 0 }).updates!.step!.lines, ['Drawn again with no change']);
});

// D-045, answer-model ruling 7: the agent's reply that cleared the card is an update of its own.
test('the agent\'s reply as a step: "Reply", when and who, its words; no chips', () => {
  const v = withUpdates({ count: 1, steps: [{ ver: 1, when: 'now', agent: 'Pricing chat', changes: [], reply: 'Yes, renewals too.' }], at: 0 }).updates!;
  assert.deepEqual([v.tab, v.step!.label, v.step!.head, v.step!.chips, v.step!.lines],
    ['1 update', 'Update 1 of 1, the agent\'s reply', 'Reply · now · Pricing chat', [], ['Yes, renewals too.']]);
});

test('a non-item has no updates', () => {
  const topic: ViewNode = { id: 't', region: 'r', kind: 'topic', title: 'Stack' };
  assert.equal(nodeState(topic, board(), undefined, false, { updates: { count: 2 } }).updates, undefined);
});

test('template: the hidden tab, the step section it controls and the stepper in the footer', () => {
  const html = nodeTemplate(r);
  assert.match(html, /<button type="button" class="vb-node-btab" data-tab="updates" aria-expanded="false" aria-controls="vb-steps-44" hidden><\/button>/);
  assert.match(html, /<div class="vb-node-steps" id="vb-steps-44" role="region" aria-live="polite" hidden><\/div>/);
  assert.match(html, /<div class="vb-node-stepnav" hidden><span class="vb-node-stepcount"><\/span><button type="button" class="vb-pop-btn" data-step="back">Back<\/button><button type="button" class="vb-pop-btn vb-pop-primary" data-step="next">Next<\/button><\/div>/);
});

test('markup: the step escapes every text run', () => {
  const html = stepMarkup(withUpdates({ count: 1, steps: [{ ver: 2, when: 'now', agent: '<b>x</b>', changes: [{ field: 'body', change: 'added', text: '<i>y</i>' }] }], at: 0 }).updates!);
  assert.equal(html.includes('<b>') || html.includes('<i>'), false);
  assert.match(html, /<ul class="vb-step-chips" aria-label="Changes"><li data-change="added">\+ body<\/li><\/ul>/);
  assert.equal(stepMarkup(withUpdates({ count: 0, steps, at: 3 }).updates!), '<p class="vb-step-done">You\'re up to date</p>');
});

test('markup: what the text gained reads as Markdown, like the body it joins (VERIFY_01)', () => {
  const html = stepMarkup(withUpdates({ count: 1, steps: [{ ver: 2, when: 'now', changes: [{ field: 'body', change: 'added', text: 'They **declined**.' }] }], at: 0 }).updates!);
  assert.match(html, /<strong>declined<\/strong>/);
  assert.equal(html.includes('**'), false);
});

test('markup: a source link, escaped, only when the page gives one (the board\'s chat, chat-panel FE_02)', () => {
  const one: CardStep[] = [{ ver: 2, when: 'now', changes: [] }];
  const html = stepMarkup(withUpdates({ count: 1, steps: one, at: 0, source: 'Show <in> the chat' }).updates!);
  assert.match(html, /<button type="button" class="vb-step-src" data-source>Show &#60;in&#62; the chat<\/button>$/);
  assert.doesNotMatch(stepMarkup(withUpdates({ count: 1, steps: one, at: 0 }).updates!), /data-source/);
});
