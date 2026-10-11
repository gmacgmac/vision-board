// The person's flag on a card (cardFlag flag, field report batch 2 ruling 3, assumption A): the
// button beside Later is drawn only when the page asks for it, keeps its name, and aria-pressed (and
// the card's name) say whether the card is flagged. A card with no number has no button and no flag.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '../../format/src/index.ts';
import type { BoardState } from '../../actions/src/index.ts';
import { FLAG_KEY, flagLabel, nodeState, nodeTemplate } from '../src/index.ts';

const node = (f: Partial<ViewNode>): ViewNode => ({ id: '3', region: 'r', kind: 'question', title: 'T', n: 3, ...f });
const board = (flags: string[] = []): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), flags: new Set(flags) });

test('the flag button sits last in the card\'s toolbar, after Later, only with the option on', () => {
  const html = nodeTemplate(node({}), { flag: true });
  const buttons = [...html.matchAll(/<button type="button" class="vb-act[^"]*" (data-act="(\w+)"|data-flag)/g)].map((m) => m[2] ?? 'flag');
  assert.deepEqual(buttons, ['ack', 'drop', 'comment', 'context', 'later', 'flag']);
  assert.ok(html.includes(`aria-label="Flag item 3 (${FLAG_KEY})"`));
  assert.ok(html.includes('aria-pressed="false"'));
  assert.ok(html.includes(`title="Flag · ${FLAG_KEY}"`));
  assert.ok(!nodeTemplate(node({})).includes('data-flag'), 'off by default: the page passes it with the cardFlag flag');
  assert.ok(nodeTemplate(node({ kind: 'finding' }), { flag: true }).includes('data-flag'), 'every card with a number, any kind');
  assert.ok(!nodeTemplate(node({ n: undefined }), { flag: true }).includes('data-flag'), 'no number, no footer, no flag');
});

test('flagged: the state says so, the name ends ", flagged" and the button keeps its name', () => {
  const on = nodeState(node({}), board(['3']));
  assert.equal(on.flagged, true);
  assert.match(on.label, /, flagged$/);
  const off = nodeState(node({}), board(['4']));
  assert.equal(off.flagged, undefined);
  assert.doesNotMatch(off.label, /flagged/);
  assert.equal(flagLabel(node({})), 'Flag item 3 (Shift+F)');
  assert.equal(nodeState(node({ n: undefined }), board(['3'])).flagged, undefined, 'a card with no number has no flag');
});
