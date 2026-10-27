// The key commands bubble's list (navigation FE_04 ruling 1): generated from the command table and
// the action registry, so every command and action with a key is listed exactly once, and one
// that has none is not.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACTIONS } from '#actions';
import { COMMAND_IDS, COMMANDS } from '../src/board/commands.ts';
import { KEY_GROUPS, keyGroups } from '../src/board/key-help.ts';

const rows = () => keyGroups().flatMap((g) => g.rows);

test('every command with a key is listed once, with its label and every one of its keys', () => {
  for (const id of COMMAND_IDS) {
    const found = rows().filter((r) => r.id === `command:${id}`);
    if (!COMMANDS[id].keys.length) assert.equal(found.length, 0, `${id} has no key`);
    else {
      assert.equal(found.length, 1, `${id} is listed once`);
      assert.equal(found[0]!.label, COMMANDS[id].listed ?? COMMANDS[id].means ?? COMMANDS[id].label);
      assert.equal(found[0]!.keys.length, (COMMANDS[id].shown ?? COMMANDS[id].keys).length);
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

// D-045, answer-model rulings 1 and 5: A and X are Check and Cross, tools with no meaning of their
// own; More context and its M are gone.
test('Items: Check and Cross by name, no meaning; no More context and no M', () => {
  const items = keyGroups().find((g) => g.group === 'Items')!.rows;
  const label = (id: string) => items.find((r) => r.id === `action:${id}`)!.label;
  assert.equal(label('ack'), 'Check');
  assert.equal(label('drop'), 'Cross');
  assert.equal(label('comment'), 'Comment');
  assert.equal(items.some((r) => r.id === 'action:context' || r.keys.includes('M')), false);
});

// Field report batch 2, assumption A: Shift+F flags the focused card (F alone stays Fit).
test('with the cardFlag flag, Items lists Shift+F for the flag; without it, nothing; F stays Fit', () => {
  const flag = (on: boolean) => keyGroups({ flag: on }).find((g) => g.group === 'Items')!.rows.filter((r) => r.id === 'other:flag');
  assert.deepEqual(flag(true).map((r) => r.keys), [['Shift+F']]);
  assert.deepEqual(flag(false), []);
  assert.deepEqual(rows().find((r) => r.id === 'command:fit')!.keys, ['F']);
});

// App cards (D-047 ruling 15): Esc inside an app's panel puts focus back on its card.
test('with the appCards flag, Items lists Esc to leave an app; without it, nothing', () => {
  const app = (on: boolean) => keyGroups({ app: on }).find((g) => g.group === 'Items')!.rows.filter((r) => r.id === 'other:app');
  assert.deepEqual(app(true).map((r) => [r.label, r.keys]), [['Leave an app', ['Esc']]]);
  assert.deepEqual(app(false), []);
});

// Selection-bar-shorter ruling 5: the bar says "Remove" and "Zoom", the key list still says it in full.
test('the key list names Delete and Z in full, and the bar has no Clear command', () => {
  const label = (id: string) => rows().find((r) => r.id === `command:${id}`)!;
  assert.deepEqual([label('remove').label, label('remove').keys], ['Remove cards', ['Delete', 'Backspace']]);
  assert.deepEqual([label('zoom-selection').label, label('zoom-selection').keys], ['Zoom to the selection', ['Z']]);
  assert.ok(!(COMMAND_IDS as readonly string[]).includes('clear'));
});

// Review polish ruling 13 (FE_05's Cmd or Ctrl + drag): Board lists the pan from anywhere beside the
// drag on the background.
test('Board lists Cmd or Ctrl + drag to pan from anywhere, after the drag on the background', () => {
  const board = keyGroups().find((g) => g.group === 'Board')!.rows;
  const at = (label: string) => board.findIndex((r) => r.label === label);
  assert.deepEqual(board[at('Pan from anywhere')]?.keys, ['Cmd+drag', 'Ctrl+drag']);
  assert.equal(at('Pan from anywhere'), at('Pan') + 1);
});

// Go to a card by its number (2026-10-15_board-app_go-to-card-number ruling 5): Board lists it once,
// its ten keys shown as one "0–9"; with the goToCard flag off, not at all.
test('Board lists Go to a card by its number as 0–9; without the goToCard flag, nothing', () => {
  const go = (on: boolean) => keyGroups({ go: on }).flatMap((g) => g.rows.map((r) => [g.group, r] as const)).filter(([, r]) => r.id === 'command:go-to-card');
  assert.deepEqual(go(true).map(([g, r]) => [g, r.label, r.keys]), [['Board', 'Go to a card by its number', ['0–9']]]);
  assert.deepEqual(go(false), []);
});
