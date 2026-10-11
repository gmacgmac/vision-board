// validateAct on ledger v3 (rule 8, api.md 16, 20): agents never write an act; grant, deny,
// revoke, size and send each checked on its own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent } from '../../format/src/index.ts';
import { ACTION_IDS } from '../../format/src/index.ts';
import { validateAct } from '../src/index.ts';
import { A, B, C, scene } from './ledger-v3.ts';

const act = (f: Partial<ActEvent>): ActEvent =>
  ({ v: 3, seq: 999, at: '2026-10-05T10:00:00Z', by: 'person', type: 'act', action: 'send', board: 'b', ...f });
const has = (problems: string[], words: string) => problems.some((p) => p.includes(words));

test('an agent may never write an act, of any kind', () => {
  const s = scene().state();
  for (const action of ACTION_IDS) {
    const p = validateAct(act({ by: 'agent', agent: A, action, id: 1, ver: 1, text: 'hi' }), s);
    assert.equal(p.length, 1, action);
    assert.ok(has(p, 'only the person can do this') && has(p, 'propose or reply'), action);
  }
});

test('grant and deny: an open grant request on this board', () => {
  const l = scene();
  const req = l.request(C, 'r');
  const s = l.state();
  assert.deepEqual(validateAct(act({ action: 'grant', request: req, board: undefined }), s, 'b'), []);
  assert.deepEqual(validateAct(act({ action: 'deny', request: req, text: 'No.', board: undefined }), s, 'b'), []);
  assert.ok(has(validateAct(act({ action: 'grant', request: req, board: undefined }), s, 'b2'), 'is for board "b", not "b2"'));
  assert.ok(has(validateAct(act({ action: 'grant', request: 6, board: undefined }), s, 'b'), 'is not a grant request'));
});

test('grant and deny: an answered request is refused', () => {
  const l = scene();
  const req = l.request(C, 'r');
  l.act({ action: 'deny', request: req });
  const s = l.state();
  assert.ok(has(validateAct(act({ action: 'grant', request: req, board: undefined }), s, 'b'), 'already answered (deny)'));
});

test('revoke: a granted holder can be removed', () => {
  const l = scene();
  l.act({ action: 'grant', request: l.request(C, 'r') });
  assert.deepEqual(validateAct(act({ action: 'revoke', holder: C, board: 'b', region: 'r' }), l.state(), 'b'), []);
});

test('revoke: a container\'s creator cannot be removed, and the problem says so', () => {
  const s = scene().state();
  assert.deepEqual(validateAct(act({ action: 'revoke', holder: A, board: 'b', region: 'r' }), s, 'b'),
    [`holder: "${A}" created b/r, and a container's creator cannot be removed`]);
});

test('revoke: someone who does not hold the container, or on another board', () => {
  const s = scene().state();
  assert.ok(has(validateAct(act({ action: 'revoke', holder: C, board: 'b', region: 'r' }), s), 'does not hold b/r'));
  assert.ok(has(validateAct(act({ action: 'revoke', holder: B, board: 'b', region: 'q' }), s, 'b2'), 'sent to board "b2"'));
});

test('size: a node on this board; auto clears and is valid too', () => {
  const s = scene().state();
  for (const size of ['s', 'm', 'l', 'auto'] as const)
    assert.deepEqual(validateAct(act({ action: 'size', id: 1, size, board: undefined }), s, 'b'), [], size);
  // Any node, numbered or not: the size control is on every card.
  assert.deepEqual(validateAct(act({ action: 'size', id: 3, size: 's', board: undefined }), s), []);
});

test('size: an unknown node, or a node on another board, is refused', () => {
  const s = scene().state();
  assert.ok(has(validateAct(act({ action: 'size', id: 77, size: 's', board: undefined }), s, 'b'), 'unknown node 77'));
  assert.ok(has(validateAct(act({ action: 'size', id: 4, size: 's', board: undefined }), s, 'b'), 'is on board "b2", not "b"'));
});

test('send: the board must exist and be the one sent to', () => {
  const s = scene().state();
  assert.deepEqual(validateAct(act({ action: 'send', board: 'b' }), s, 'b'), []);
  assert.deepEqual(validateAct(act({ action: 'send', board: 'b' }), s), []);
  assert.ok(has(validateAct(act({ action: 'send', board: 'zz' }), s), 'board: unknown "zz"'));
  assert.ok(has(validateAct(act({ action: 'send', board: 'b' }), s, 'b2'), 'sent to board "b2"'));
});

test('node acts sent to another board are refused', () => {
  const s = scene().state();
  assert.ok(has(validateAct(act({ action: 'ack', id: 4, ver: 1, board: undefined }), s, 'b'), 'is on board "b2"'));
  assert.deepEqual(validateAct(act({ action: 'ack', id: 4, ver: 1, board: undefined }), s, 'b2'), []);
});
