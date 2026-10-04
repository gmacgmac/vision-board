import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTION_IDS, KINDS, NODE_TYPES } from '../src/index.ts';

test('every kind has a node type with a label', () => {
  assert.deepEqual(Object.keys(NODE_TYPES).sort(), [...KINDS].sort());
  for (const kind of KINDS) assert.ok(NODE_TYPES[kind].label.trim().length > 0, kind);
});

test('every action a node type lists is a known action, once', () => {
  for (const kind of KINDS) {
    const { actions } = NODE_TYPES[kind];
    for (const a of actions) assert.ok((ACTION_IDS as readonly string[]).includes(a), `${kind}: ${a}`);
    assert.equal(new Set(actions).size, actions.length, `${kind} lists an action twice`);
  }
});
