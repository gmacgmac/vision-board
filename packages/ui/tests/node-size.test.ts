// Node size (D-030): the tier the page passes in and whether the person picked it (the selection bar's Width, D-099 3).
// Only when the page passes a tier (the nodeSize flag); a node draws no size control of its own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '#format';
import type { BoardState } from '#actions';
import { nodeState, nodeTemplate } from '../src/index.ts';

const node = (f: Partial<ViewNode>): ViewNode =>
  ({ id: '1', region: 'r', kind: 'question', title: 'T', ...f });

const board = (f: Partial<BoardState> = {}): BoardState =>
  ({ items: new Map(), pins: new Map(), modes: new Map(), widths: new Map(), sizes: new Map(), moves: new Map(), regionPins: new Map(), regionNotes: new Map(), bookmarks: new Set(), ...f });

test('nodeState: no tier given, no size state (the flag is off)', () => {
  assert.equal(nodeState(node({ n: 1 }), board()).size, undefined);
});

test('nodeState: a tier with no pick is automatic; a person pick says so', () => {
  assert.deepEqual(nodeState(node({ n: 1 }), board(), 'm').size, { tier: 'm', picked: false });
  assert.deepEqual(nodeState(node({ n: 1 }), board({ sizes: new Map([['1', 'l']]) }), 'l').size, { tier: 'l', picked: true });
});

test('an app node takes no size', () => {
  assert.equal(nodeState(node({ n: 1, kind: 'app', app: { id: 'calc' } }), board(), 'm').size, undefined);
});

test('nodeTemplate: no size control on the node (Width is the selection bar\'s)', () => {
  assert.doesNotMatch(nodeTemplate(node({ n: 1 })), /vb-size/);
});
