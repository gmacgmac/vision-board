import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '../../format/src/index.ts';
import type { BoardState, ItemNote, ItemStatus } from '../../actions/src/index.ts';
import { nodeLabel, nodeState, offers, STATUS_LABEL } from '../src/index.ts';

const node = (f: Partial<ViewNode>): ViewNode =>
  ({ id: '1', region: 'r', kind: 'question', title: 'T', ...f });

const board = (f: Partial<BoardState> = {}): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), ...f });

const note = (text: string, kind: ItemNote['kind'] = 'comment'): ItemNote =>
  ({ kind, text, at: '2026-10-04T00:00:00Z' });

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
  assert.equal(st.note, undefined);
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

test('nodeState: one note is shown under "Your note", with no count', () =>
  assert.deepEqual(nodeState(node({ n: 1 }), withItem('commented', [note('Looks right')])).note,
    { who: 'Your note', text: 'Looks right' }));

test('nodeState: three notes show the count and the last note', () =>
  assert.deepEqual(nodeState(node({ n: 1 }), withItem('commented',
    [note('one'), note('two'), note('three')])).note, { who: '3 notes · Your note', text: 'three' }));

test('nodeState: a context note is shown under "You asked for more context"', () =>
  assert.deepEqual(nodeState(node({ n: 1 }), withItem('context', [note('plain terms', 'context')])).note,
    { who: 'You asked for more context', text: 'plain terms' }));
