import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '../../format/src/index.ts';
import type { BoardState, ItemNote, ItemStatus } from '../../actions/src/index.ts';
import { nodeLabel, nodeState, offers, STATUS_LABEL } from '../src/index.ts';

const node = (f: Partial<ViewNode>): ViewNode =>
  ({ id: '1', region: 'r', kind: 'question', title: 'T', ...f });

const board = (f: Partial<BoardState> = {}): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), sizes: new Map(), ...f });

let seq = 10;
const note = (text: string, kind: ItemNote['kind'] = 'comment', sent = false): ItemNote =>
  ({ seq: ++seq, kind, text, at: '2026-10-04T00:00:00Z', ...(sent && { sent: true as const }) });

const withItem = (status: ItemStatus, notes: ItemNote[] = []): BoardState =>
  board({ items: new Map([['1', { status, notes }]]) });

test('a numbered finding offers everything but drop', () =>
  assert.deepEqual(offers(node({ kind: 'finding', n: 5 })), ['ack', 'comment', 'context', 'later']));

test('a numbered question offers all five review actions', () =>
  assert.deepEqual(offers(node({ kind: 'question', n: 2 })), ['ack', 'drop', 'comment', 'context', 'later']));

test('an unnumbered topic offers nothing', () =>
  assert.deepEqual(offers(node({ kind: 'topic' })), []));

test('nodeLabel names the number, kind, title and status', () => {
  assert.equal(nodeLabel(node({ kind: 'finding', n: 5, title: 'Use it' }), 'later'),
    'Item 5, Finding: Use it, Saved for later');
  assert.equal(nodeLabel(node({ kind: 'topic', title: 'Stack' }), 'open'), 'Topic: Stack');
});

// ---- nodeState: the rules update() applies ---------------------------------------------------

const STATUSES = Object.keys(STATUS_LABEL) as ItemStatus[];
const PRESSED_BY: Partial<Record<ItemStatus, string[]>> = {
  acknowledged: ['ack'], dropped: ['drop'], context: ['context'], later: ['later'],
};

test('nodeState: every status sets status, label, status word and pressed', () => {
  const q = node({ n: 7, title: 'Ship it?' });
  for (const status of STATUSES) {
    const st = nodeState(q, withItem(status));
    assert.equal(st.status, status);
    assert.equal(st.label, `Item 7, Question: Ship it?, ${STATUS_LABEL[status]}`);
    assert.equal(st.statusWord, STATUS_LABEL[status]);
    const pressedNow = Object.entries(st.pressed).filter(([, v]) => v).map(([a]) => a);
    assert.deepEqual(pressedNow, PRESSED_BY[status] ?? [], status);
  }
});

test('nodeState: an item with no response is open, unpressed and has no note', () => {
  const st = nodeState(node({ n: 1 }), board());
  assert.equal(st.status, 'open');
  assert.equal(st.statusWord, 'Open');
  assert.equal(st.notes, undefined);
  assert.equal(st.pinned, false);
  assert.deepEqual(Object.keys(st.pressed), ['ack', 'drop', 'comment', 'context', 'later']);
  assert.ok(Object.values(st.pressed).every((v) => v === false));
});

test('nodeState: pressed covers only the actions the type offers', () =>
  assert.deepEqual(Object.keys(nodeState(node({ kind: 'finding', n: 2 }), board()).pressed),
    ['ack', 'comment', 'context', 'later']));

test('nodeState: a non-item has no status word, no pressed buttons and a plain label', () => {
  const st = nodeState(node({ kind: 'topic', title: 'Stack' }), board());
  assert.equal(st.statusWord, '');
  assert.deepEqual(st.pressed, {});
  assert.equal(st.label, 'Topic: Stack');
});

test('nodeState: pinned follows the pins map', () => {
  const pins = new Map([['1', { x: 4, y: 8 }]]);
  assert.equal(nodeState(node({ n: 1 }), board({ pins })).pinned, true);
  assert.equal(nodeState(node({ id: '2', n: 2 }), board({ pins })).pinned, false);
});

// 3_FE_01 rulings 2 and 9: selection is view state the page passes in, perceivable without colour
// through the accessible name (mockup 05: "Item 42, finding, acknowledged, selected").
test('nodeState: not selected unless the page says so; selected adds ", selected" to the name', () => {
  const q = node({ n: 7, title: 'Ship it?' });
  assert.equal(nodeState(q, board()).selected, false);
  const st = nodeState(q, board(), undefined, true);
  assert.equal(st.selected, true);
  assert.equal(st.label, 'Item 7, Question: Ship it?, Open, selected');
  assert.equal(nodeState(node({ kind: 'topic', title: 'Stack' }), board(), undefined, true).label, 'Topic: Stack, selected');
  // Nothing else a card shows depends on selection.
  const { selected: _a, label: _b, ...rest } = st;
  const { selected: _c, label: _d, ...plain } = nodeState(q, board());
  assert.deepEqual(rest, plain);
});

test('nodeLabel: selected comes last, after the status', () =>
  assert.equal(nodeLabel(node({ kind: 'finding', n: 5, title: 'Use it' }), 'later', true),
    'Item 5, Finding: Use it, Saved for later, selected'));

// 2e_FE_01 ruling 7: a numbered pin for the latest note, and the "Your note" block, latest first.
test('nodeState: one note not yet sent: "Your note 1", no count, a pin that edits it', () => {
  const one = note('Looks right');
  assert.deepEqual(nodeState(node({ n: 1 }), withItem('commented', [one])).notes, {
    entries: [{ seq: one.seq, index: 1, who: 'Your note 1', text: 'Looks right', sent: false }],
    pin: { seq: one.seq, index: 1, sent: false, label: 'Note 1 on item 1. Edit it' },
  });
});

test('nodeState: three notes, two sent: the count, the latest first, sent ones marked Sent', () => {
  const v = nodeState(node({ n: 4 }), withItem('commented',
    [note('one', 'comment', true), note('two', 'context', true), note('three')])).notes!;
  assert.equal(v.count, '3 notes');
  assert.deepEqual(v.entries.map((x) => [x.index, x.who, x.text, x.sent]), [
    [3, 'Your note 3', 'three', false], [2, 'More context 2 · Sent', 'two', true], [1, 'Your note 1 · Sent', 'one', true]]);
  assert.deepEqual([v.pin.index, v.pin.sent], [3, false]);
});

test('nodeState: when every note is sent, the pin shows the latest and only reads it', () => {
  const v = nodeState(node({ n: 7 }), withItem('context', [note('plain terms', 'context', true)])).notes!;
  assert.deepEqual(v.pin, { seq: v.entries[0]!.seq, index: 1, sent: true, label: 'Note 1 on item 7, sent. Show it' });
  assert.equal(v.entries[0]!.who, 'More context 1 · Sent');
});
