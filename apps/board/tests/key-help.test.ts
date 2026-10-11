// The key commands bubble's list (navigation FE_04 ruling 1): generated from the command table and
// the action registry, so every command and action with a key is listed exactly once, and one
// that has none is not.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS } from '../../../packages/actions/src/index.ts';
import { COMMAND_IDS, COMMANDS } from '../src/board/commands.ts';
import { KEY_GROUPS, keyGroups } from '../src/board/key-help.ts';

const rows = () => keyGroups().flatMap((g) => g.rows);

test('every command with a key is listed once, with its label and every one of its keys', () => {
  for (const id of COMMAND_IDS) {
    const found = rows().filter((r) => r.id === `command:${id}`);
    if (!COMMANDS[id].keys.length) assert.equal(found.length, 0, `${id} has no key`);
    else {
      assert.equal(found.length, 1, `${id} is listed once`);
      assert.equal(found[0]!.label, COMMANDS[id].label);
      assert.equal(found[0]!.keys.length, COMMANDS[id].keys.length);
    }
  }
});

test('every registry action with a key is listed once, under Items', () => {
  const items = keyGroups().find((g) => g.group === 'Items')!.rows;
  for (const a of Object.values(ACTIONS)) {
    const found = items.filter((r) => r.id === `action:${a.id}`);
    assert.equal(found.length, a.key && a.onItem ? 1 : 0, a.id);
    assert.equal(rows().filter((r) => r.id === `action:${a.id}`).length, found.length, `${a.id} only under Items`);
    if (found.length) assert.deepEqual(found[0]!.keys, [a.key!.toUpperCase()]);
  }
});

test('the groups come in the ruled order, each with rows, and no row id repeats', () => {
  const groups = keyGroups().map((g) => g.group);
  assert.deepEqual(groups, [...KEY_GROUPS]);
  const ids = rows().map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('with the chatPanel flag, Board lists T for the chat sidebar; without it, nothing', () => {
  const chat = (on: boolean) => keyGroups({ chat: on }).find((g) => g.group === 'Board')!.rows.filter((r) => r.id === 'other:chat');
  assert.deepEqual(chat(true).map((r) => r.keys), [['T']]);
  assert.deepEqual(chat(false), []);
});

// every-node ruling 3, assumption B: A and X mean one thing everywhere; the list says how they read
// on a question (Yes, No) and on an action (Done).
test('Items: Acknowledge and Drop name the words they read on a question and an action', () => {
  const items = keyGroups().find((g) => g.group === 'Items')!.rows;
  const label = (id: string) => items.find((r) => r.id === `action:${id}`)!.label;
  assert.equal(label('ack'), 'Acknowledge (Yes, Done)');
  assert.equal(label('drop'), 'Drop (No)');
  assert.equal(label('comment'), 'Comment');
});

// Field report batch 2, assumption A: Shift+F flags the focused card (F alone stays Fit).
test('with the cardFlag flag, Items lists Shift+F for the flag; without it, nothing; F stays Fit', () => {
  const flag = (on: boolean) => keyGroups({ flag: on }).find((g) => g.group === 'Items')!.rows.filter((r) => r.id === 'other:flag');
  assert.deepEqual(flag(true).map((r) => r.keys), [['Shift+F']]);
  assert.deepEqual(flag(false), []);
  assert.deepEqual(rows().find((r) => r.id === 'command:fit')!.keys, ['F']);
});
