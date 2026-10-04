import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '../../format/src/index.ts';
import { itemLabel, offers } from '../src/index.ts';

const node = (f: Partial<ViewNode>): ViewNode =>
  ({ id: '1', region: 'r', kind: 'question', title: 'T', ...f });

test('a numbered finding offers everything but drop', () =>
  assert.deepEqual(offers(node({ kind: 'finding', n: 5 })), ['ack', 'comment', 'context', 'later']));

test('a numbered question offers all five review actions', () =>
  assert.deepEqual(offers(node({ kind: 'question', n: 2 })), ['ack', 'drop', 'comment', 'context', 'later']));

test('an unnumbered topic offers nothing', () =>
  assert.deepEqual(offers(node({ kind: 'topic' })), []));

test('itemLabel names the number, kind, title and status', () => {
  assert.equal(itemLabel(node({ kind: 'finding', n: 5, title: 'Use it' }), 'later'),
    'Item 5, Finding: Use it, Saved for later');
  assert.equal(itemLabel(node({ kind: 'topic', title: 'Stack' }), 'open'), 'Topic: Stack');
});
