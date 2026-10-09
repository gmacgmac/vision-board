// The bridge between the chat panel and the board (chat-panel FE_02 ruling 3), and the panel's pure
// parts: the chips come from the selected cards and the unsent notes (a group's note once, a
// container's too, a sent one or one with no words never); a chip taken off stays off; a change
// chip selects and zooms to its cards, opening their board first; the stepper's link finds the
// write that last changed a card; the stream starts over when the server did; a message's body.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger } from '../../../packages/format/src/index.ts';
import { foldLedger } from '../../../packages/actions/src/index.ts';
import type { ChatComposerElement, ChatEvent, ChatState, Chip } from '../../../packages/chat/src/index.ts';
import { applyEvents, CHAT_CHANGE_EVENT, CHAT_CHIP_REMOVE_EVENT, EMPTY_CHAT } from '../../../packages/chat/src/index.ts';
import { boardData } from '../src/board/board-data.ts';
import type { BoardData } from '../src/board/io.ts';
import { boardChips, cardIds, createChatBridge, lastChange, selectedCards, SOURCE_LABEL, unsentNotes } from '../src/board/chat-bridge.ts';
import { blockedReason, follow, messageBody, NO_BOARD, PAST } from '../src/board/chat-panel.ts';
import { createSelection } from '../src/board/selection.ts';

const A = 'a-aaaa1111';
let seq = 0;
const line = (e: object) => JSON.stringify({ v: 10, seq: ++seq, at: `2026-10-09T09:${String(seq).padStart(2, '0')}:00Z`, ...e });
const agent = (e: object) => line({ by: 'agent', agent: A, ...e });
const person = (e: object) => line({ by: 'person', ...e });
const item = (board: string, n: number, title = `Card ${n}`) =>
  agent({ type: 'node', board, n, ver: 1, node: { region: 'r', kind: 'question', title, item: true } });

/** Board b: cards 1-3. Notes: 8 on card 1 (sent by the Send at 9), 10 on card 2, 11 on cards 2 and 3,
 *  12 More context with no words on 3, 13 on the container. Board c: card 4. */
function state() {
  seq = 0;
  const lines = [
    agent({ type: 'join', label: 'Pricing chat' }), agent({ type: 'board', board: 'b', title: 'B' }),
    agent({ type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'grid' } }),
    item('b', 1, 'Ship   on\nFriday?'), item('b', 2), item('b', 3),
    agent({ type: 'board', board: 'c', title: 'C' }), // 7
    person({ type: 'act', action: 'comment', n: 1, ver: 1, text: 'Too soon' }), // 8
    person({ type: 'act', action: 'send', board: 'b' }), // 9
    person({ type: 'act', action: 'comment', n: 2, ver: 1, text: 'Why this one?' }), // 10
    person({ type: 'act', action: 'comment', nodes: [2, 3], text: 'Merge these' }), // 11
    person({ type: 'act', action: 'context', n: 3, ver: 1 }), // 12
    person({ type: 'act', action: 'comment', board: 'b', region: 'r', text: 'Order them' }), // 13
    agent({ type: 'region', board: 'c', region: { id: 'r', title: 'R', mode: 'grid' } }), item('c', 4),
  ];
  const { events, problems } = readLedger(lines);
  assert.deepEqual(problems, []);
  return foldLedger(events);
}
const s = state();
const b = boardData(s, 'b');
const card = (ref: number, label = `Card ${ref}`): Chip => ({ kind: 'card', ref, label });
const note = (ref: number, label: string): Chip => ({ kind: 'note', ref, label });

test('the unsent notes: oldest first, a group\'s once, the container\'s too; none sent, none without words', () => {
  assert.deepEqual(unsentNotes(b), [note(10, 'Why this one?'), note(11, 'Merge these'), note(13, 'Order them')]);
});

test('the selected cards in the order selected, their titles on one line; then the notes; a chip taken off stays off', () => {
  assert.deepEqual(selectedCards(b, ['3', '1', 'nope']), [card(3), card(1, 'Ship on Friday?')]);
  assert.deepEqual(boardChips(b, ['2'], new Set(['note-11'])), [card(2), note(10, 'Why this one?'), note(13, 'Order them')]);
});

const at = (n: number) => `2026-10-09T10:00:${String(n).padStart(2, '0')}Z`;
const ev = (n: number, e: object) => ({ at: at(n), session: 's1', seq: n, ...e }) as ChatEvent;
const change = (n: number, board: string, cards: number[]) => ev(n, { kind: 'tool_activity', call: `c${n}`, tool: 'write_board', state: 'done', board, cards, head: 40 + n });
const chat: ChatState = applyEvents(EMPTY_CHAT, [
  ev(1, { kind: 'message_in', text: 'Draw it' }), change(2, 'b', [1, 2]), change(3, 'c', [4]), change(4, 'b', [2]),
  ev(5, { kind: 'system', text: 'Done.', turn: 'done' }),
]);

test('the stepper\'s link: the write in the chat that last changed the card, on this board', () => {
  assert.equal(lastChange(chat, 'b', 2)?.key, 'e4');
  assert.equal(lastChange(chat, 'b', 1)?.key, 'e2');
  assert.equal(lastChange(chat, 'b', 4), undefined);
  assert.equal(lastChange(chat, 'c', 4)?.key, 'e3');
  assert.deepEqual(cardIds(b, [2, 9, 1]), ['2', '1']);
});

/** The bridge with a board and a chat side made of plain objects. */
function bridged() {
  const selection = createSelection();
  const log: string[] = [];
  let open = 'b';
  const data: Record<string, BoardData> = { b, c: boardData(s, 'c') };
  let chips: readonly Chip[] = [];
  const composer = { get chips() { return chips; }, setChips(c: readonly Chip[]) { chips = c; log.push(`chips ${c.map((x) => `${x.kind}-${x.ref}`).join(' ')}`); } };
  const panel = new EventTarget();
  const bridge = createChatBridge();
  const offBoard = bridge.board({
    stage: new EventTarget() as HTMLElement, data: () => data[open]!, id: () => open, selection, readOnly: () => false,
    zoom: () => log.push(`zoom ${selection.selected().join(' ')}`), switchTo: (id) => { open = id; log.push(`open ${id}`); },
    toast: (t) => log.push(`toast ${t}`),
  });
  bridge.chat({ panel: panel as HTMLElement, composer: composer as ChatComposerElement, state: () => chat, reveal: (key) => { log.push(`reveal ${key}`); } });
  const raise = (type: string, detail: unknown) => panel.dispatchEvent(new CustomEvent(type, { detail }));
  return { bridge, selection, log, raise, offBoard, chips: () => chips.map((x) => `${x.kind}-${x.ref}`) };
}

test('board to chat: the selection and the notes become chips; one taken off stays off; the chips a message carried go', () => {
  const t = bridged();
  assert.deepEqual(t.chips(), ['note-10', 'note-11', 'note-13']);
  t.selection.select(['2'], 'only');
  assert.deepEqual(t.chips(), ['card-2', 'note-10', 'note-11', 'note-13']);
  t.raise(CHAT_CHIP_REMOVE_EVENT, { chip: card(2) });
  t.raise(CHAT_CHIP_REMOVE_EVENT, { chip: note(13, 'Order them') });
  t.bridge.drawn();
  assert.deepEqual(t.chips(), ['note-10', 'note-11']);
  // A card taken off comes back with the next change of selection; a note stays off.
  t.selection.select(['2', '3'], 'only');
  assert.deepEqual(t.chips(), ['card-2', 'card-3', 'note-10', 'note-11']);
  t.bridge.sent([card(2), card(3), note(10, 'Why this one?'), note(11, 'Merge these')]);
  assert.deepEqual(t.chips(), []);
  const drawn = t.log.length;
  t.bridge.drawn();
  assert.equal(t.log.length, drawn, 'the same chips are not set again');
});

test('chat to board: a change chip selects its cards and zooms; on another board, that board opens first', () => {
  const t = bridged();
  t.raise(CHAT_CHANGE_EVENT, { board: 'b', cards: [1, 2], head: 42 });
  assert.deepEqual(t.selection.selected(), ['1', '2']);
  t.raise(CHAT_CHANGE_EVENT, { board: 'c', cards: [4], head: 43 });
  t.raise(CHAT_CHANGE_EVENT, { board: 'c', cards: [9] });
  assert.deepEqual(t.log.filter((l) => !l.startsWith('chips')), ['zoom 1 2', 'open c', 'zoom 4', 'toast Those cards are no longer on the board.']);
  assert.equal(t.bridge.source(4), SOURCE_LABEL);
  assert.equal(t.bridge.source(1), undefined, 'card 1 is on board b; board c is open');
  t.offBoard();
  assert.equal(t.bridge.source(4), undefined, 'no board side, no link');
});

test('the stream: an event at or before the last held, first after a reopen, starts the feed over', () => {
  const held = applyEvents(EMPTY_CHAT, [ev(1, { kind: 'message_in', text: 'One' }), ev(2, { kind: 'message_out', text: 'Two' })]);
  assert.equal(follow(held, ev(2, { kind: 'message_out', text: 'Two' }), false), held, 'a repeat mid-stream changes nothing');
  assert.equal(follow(held, ev(3, { kind: 'message_out', text: 'Three' }), true).entries.length, 3, 'a reopen that goes on, goes on');
  const over = follow(held, ev(1, { kind: 'message_in', text: 'After the restart' }), true);
  assert.deepEqual(over.entries.map((e) => e.type === 'person' && e.text), ['After the restart']);
});

test('the message\'s body and why no message can go', () => {
  assert.deepEqual(messageBody('Hi', [card(2), note(10, 'x'), card(3)]), { text: 'Hi', notes: [10], cards: [2, 3] });
  assert.deepEqual(messageBody('Hi', []), { text: 'Hi' });
  assert.equal(blockedReason('', true, 'refused'), NO_BOARD);
  assert.equal(blockedReason('b', true, 'refused'), PAST);
  assert.equal(blockedReason('b', false, 'Kiro is not available.'), 'Kiro is not available.');
  assert.equal(blockedReason('b', false), undefined);
});
