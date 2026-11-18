// Ask now in the conversation box (FE_03; notes/note-box.ts, controller/ask-now.ts, kept-view.ts
// `askContextOf`): the words typed join the node's note not yet sent, or become it, then one `ask` names that note;
// while no message can go the box says why and writes nothing; with no agent listening the words wait as a note for
// Send and the board says so; a failed write keeps the words; Add note never asks. A fake bubble and fake writes stand in.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BoardState, ItemNote } from '#actions';
import type { VbNoteBubbleElement } from '#ui';
import { addNote, askNow, choose } from '../src/board/notes/note-box.ts';
import { createAskNow } from '../src/board/controller/ask-now.ts';
import { memoryStore } from '../src/board/host.ts';
import type { BoxChoiceDeps } from '../src/board/notes/note-box.ts';
import type { Open } from '../src/board/notes/note-views.ts';
import { askContextOf } from '../src/board/boards/kept-view.ts';
import * as notesWords from '../src/board/words/notes.ts';

const O: Open = { id: '4', anchor: ['4'], mode: 'conversation', kind: 'comment' };

/** The board's notes on card 4, a log of the writes, and a box that says what it was told. */
function setup({ queued = false, blocked = null as string | null, listening = true, fail = null as string | null } = {}) {
  const notes: ItemNote[] = queued ? [{ seq: 7, kind: 'comment', text: 'Is a truck free?', at: '' } as ItemNote] : [];
  const writes: Record<string, unknown>[] = [];
  const asks: number[] = [];
  const said: string[] = [];
  const box = { phase: 'idle', message: '', shown: 0, focused: 0 };
  const mode = { now: 'save' as 'save' | 'ask' };
  const state = { items: new Map([['4', { notes }]]) } as unknown as BoardState;
  const c: BoxChoiceDeps = {
    node: () => ({ id: '4', n: 4, kind: 'question', title: 'Truck' }) as never, state: () => state, region: () => undefined,
    replies: () => [], regionReplies: () => [], ver: () => 1, toast: (t) => said.push(t),
    async attempt(f) {
      writes.push(f);
      if (fail) return fail;
      if (f.action === 'comment') notes.push({ seq: 9, kind: 'comment', text: String(f.text), at: '' } as ItemNote);
      return null;
    },
    box: { blocked: () => blocked, listening: () => listening, ask: async (seq) => { asks.push(seq); return null; }, looked() {}, asked: () => new Set(),
      mode: () => mode.now, setMode: (a) => { mode.now = a; } },
    bubble: { setPhase(p: string, m = '') { box.phase = p; box.message = m; }, focusText() { box.focused += 1; } } as unknown as VbNoteBubbleElement,
    still: () => true, again: () => { box.shown += 1; },
  };
  return { c, writes, asks, said, box, mode };
}

test('Ask now with words and no note waiting: the words become the note, then one ask names it', async () => {
  const t = setup();
  await askNow(t.c, O, '  Before noon  ');
  assert.deepEqual(t.writes, [{ action: 'comment', n: 4, ver: 1, text: 'Before noon' }]);
  assert.deepEqual(t.asks, [9]);
  assert.equal(t.box.shown, 1);
});

test('Ask now with a note waiting: the words join it as an edit first; with no words it sends it as it is', async () => {
  const t = setup({ queued: true });
  await askNow(t.c, O, 'Before noon');
  assert.deepEqual(t.writes, [{ action: 'note-edit', n: 4, note: 7, text: 'Is a truck free?\n\nBefore noon' }]);
  assert.deepEqual(t.asks, [7]);
  const u = setup({ queued: true });
  await askNow(u.c, O, '');
  assert.deepEqual(u.writes, []);
  assert.deepEqual(u.asks, [7]);
});

test('Ask now while no message can go: the box says why, nothing is written, the words stay', async () => {
  const t = setup({ blocked: 'Board is locked' });
  await askNow(t.c, O, 'Before noon');
  assert.deepEqual([t.writes, t.asks], [[], []]);
  assert.deepEqual([t.box.phase, t.box.message], ['error', 'Board is locked']);
});

test('Ask now with no agent listening: the words wait as a note for Send, no ask, and the board says so', async () => {
  const t = setup({ listening: false });
  await askNow(t.c, O, 'Before noon');
  assert.equal(t.writes.length, 1);
  assert.deepEqual(t.asks, []);
  assert.deepEqual(t.said, [notesWords.noAgentIsListening]);
});

test('a failed write keeps the words in the field and asks nothing; Add note never asks', async () => {
  const t = setup({ fail: 'The board is away' });
  await askNow(t.c, O, 'Before noon');
  assert.deepEqual(t.asks, []);
  assert.equal(t.box.phase, 'error');
  assert.equal(t.box.shown, 0); // not drawn afresh, so the field keeps its words
  const u = setup();
  await addNote(u.c, O, 'Book it');
  assert.deepEqual(u.writes, [{ action: 'comment', n: 4, ver: 1, text: 'Book it' }]);
  assert.deepEqual(u.asks, []);
  assert.equal(u.box.shown, 1);
});

const memoryStoreFor = (kept: Record<string, string>) => ({ get: (k: string) => kept[k] ?? null, set() {} });

test('askContextOf: the kept setting when it is one of ASK_CONTEXTS, else board', () => {
  assert.equal(askContextOf(memoryStoreFor({})), 'board');
  assert.equal(askContextOf(memoryStoreFor({ 'ask-context': 'node' })), 'node');
  assert.equal(askContextOf(memoryStoreFor({ 'ask-context': 'everything' })), 'board');
});

// FIX_03 ruling 3: Add note and Ask now are two modes. A press of either button does it and makes it the mode; Enter
// sends the mode's choice (the element), which leaves the mode as it was; the mode is kept per board, Add note first.
test('a press of Ask now asks and makes Ask now the mode; Enter (no `active`) keeps it; Add note turns it back', async () => {
  const t = setup();
  await choose(t.c, O, { choice: 'ask', text: 'Before noon', active: 'ask' });
  assert.equal(t.mode.now, 'ask');
  assert.deepEqual(t.asks, [9]);
  await choose(t.c, O, { choice: 'ask', text: '' }); // Enter in Ask now mode: the element sends `ask`, no `active`
  assert.equal(t.mode.now, 'ask');
  await choose(t.c, O, { choice: 'save', text: 'And the crew', active: 'save' });
  assert.equal(t.mode.now, 'save');
});

test('Ask now as the mode with no agent listening still keeps the words as a note, and says so', async () => {
  const t = setup({ listening: false });
  await choose(t.c, O, { choice: 'ask', text: 'Before noon', active: 'ask' });
  assert.equal(t.mode.now, 'ask');
  assert.deepEqual(t.writes, [{ action: 'comment', n: 4, ver: 1, text: 'Before noon' }]);
  assert.deepEqual(t.asks, []);
  assert.deepEqual(t.said, [notesWords.noAgentIsListening]);
});

test('the mode is kept per board in the host\'s store, for this tab (a `view.` key), Add note by default', () => {
  const store = memoryStore();
  let board = 'a';
  const box = createAskNow({ state: () => null, board: () => board, node: () => undefined, paused: () => null, working: () => false,
    oneAgent: () => false, context: () => 'board', attempt: async () => null, seen: async () => true, store });
  assert.equal(box.mode(), 'save');
  box.setMode('ask');
  assert.equal(box.mode(), 'ask');
  assert.equal(store.get('view.box-mode:a'), 'ask');
  board = 'b';
  assert.equal(box.mode(), 'save', 'another board keeps its own');
});
