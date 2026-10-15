import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTION_IDS, ANSWER_ACTIONS, ITEM_REMOVED, KINDS, NODE_TYPES, NOTE_ACTIONS } from '../src/index.ts';

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

// Every node is part of the conversation (every-node PLAN ruling 2): the kind decides. Question,
// decision and action cards need an answer and offer all five; every other kind offers a note and
// Later and never blocks.
test('question, decision and action need an answer; every other kind does not', () => {
  const answer = KINDS.filter((k) => NODE_TYPES[k].answer);
  assert.deepEqual(answer, ['question', 'decision', 'action']);
});

test('the two action lists: four on an answer card, two on any other; no More context (D-045)', () => {
  assert.deepEqual(ANSWER_ACTIONS, ['ack', 'drop', 'comment', 'later']);
  assert.deepEqual(NOTE_ACTIONS, ['comment', 'later']);
  for (const kind of KINDS)
    assert.equal(NODE_TYPES[kind].actions, NODE_TYPES[kind].answer ? ANSWER_ACTIONS : NOTE_ACTIONS, kind);
});

test('the ledger v11 message for a node naming item says the kind decides', () => {
  assert.match(ITEM_REMOVED, /v11/);
  assert.match(ITEM_REMOVED, /question, decision or action/);
});
