// The bridge between the chat panel and the board (chat-panel FE_02 ruling 3), and the panel's pure
// parts: the composer's one chip (composer-one-chip ruling 1), "3 answers · 2 selected", opening to
// exactly what the next message carries from the board (packages/actions `boardBlocks`, the server's
// writer; ruling 2), for the session's agent; no unsent note is a chip (the answers carry it); the
// cards a message took are spent until the selection changes; a change chip selects and zooms to its
// cards, opening their board first; the stepper's link finds the write that last changed a card; the
// stream starts over when the server did; a message's body.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger } from '#format';
import { boardBlocks, boardData, foldLedger, roundOf, ROUND_HEAD, SELECTED_HEAD } from '#actions';
import type { ChatComposerElement, ChatEvent, ChatState, Chip, ComposerContext } from '#chat';
import { applyEvents, CHAT_CHANGE_EVENT, EMPTY_CHAT } from '#chat';
import type { BoardData } from '#actions';
import {
  boardCards, boardContext, cardChip, cardIds, createChatBridge, lastChange, selectedCards, SOURCE_LABEL,
} from '../src/shell/chat-bridge.ts';
import { ARCHIVED, blockedReason, follow, LOADING, messageBody, PAST, sendsInChat } from '../src/shell/chat-rules.ts';
import { createSelection } from '../src/board/selection/selection.ts';
import { lineMaker } from '#format/testing';

const A = 'a-aaaa1111';
const maker = lineMaker({ v: 10, at: '2026-10-09T09' });
const { line } = maker;
const agent = (e: object) => line({ by: 'agent', agent: A, ...e });
const person = (e: object) => line({ by: 'person', ...e });
const item = (board: string, n: number, title = `Card ${n}`) =>
  agent({ type: 'node', board, n, ver: 1, node: { region: 'r', kind: 'question', title, item: true } });

/** Board b: cards 1-3. Notes: 8 on card 1 (sent by the Send at 9), 10 on card 2, 11 on cards 2 and 3,
 *  12 More context with no words on 3, 13 on the container. Board c: its card 1 (the ledger's 4: a
 *  change chip names it by its board number, D-041). */
function state() {
  maker.reset();
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

test('the composer\'s one chip: "3 answers · 2 selected", either part alone, opening to exactly what goes, for the session\'s agent only', () => {
  const round = roundOf(s, 'b', 9, A)!;
  const two = [{ n: 3, title: 'Card 3' }, { n: 1, title: 'Ship   on\nFriday?' }];
  assert.deepEqual(boardContext(s, 'b', two, A), { label: '3 answers · 2 selected', text: boardBlocks(two, round) });
  const text = boardContext(s, 'b', two, A)!.text.split('\n');
  assert.deepEqual(text.slice(0, 4), [SELECTED_HEAD, '- Card 3: Card 3', '- Card 1: Ship   on', 'Friday?'], 'the selection first, titles as the server writes them');
  assert.deepEqual(text.slice(4, 6), ['', ROUND_HEAD], 'then, after a blank line, the answers');
  assert.ok(text.includes('2 (question): comment: Why this one?') && text.includes('2, 3 (question, question): comment: Merge these')
    && text.includes('On container "R" comment: Order them'), 'More context on 3 with no words reads on the group\'s line');
  assert.deepEqual(boardContext(s, 'b', [], A), { label: '3 answers', text: round.text });
  assert.deepEqual(boardContext(s, 'b', two, A), boardContext(s, 'b', two), 'the board\'s creator may answer every card');
  assert.deepEqual(boardContext(s, 'b', two.slice(0, 1), 'a-bbbb2222'), { label: '1 selected', text: `${SELECTED_HEAD}\n- Card 3: Card 3` },
    'an agent that may answer none of them is told none');
  assert.equal(boardContext(s, 'c', []), null, 'nothing answered on board c, nothing selected');
});

test('on a locked board the chip carries no answers, as the server sends none; the selection still goes (N40, api.md 140)', () => {
  const locked = { ...s, locked: new Map([['b', 99]]) };
  const two = [{ n: 3, title: 'Card 3' }];
  assert.deepEqual(boardContext(locked, 'b', two, A), { label: '1 selected', text: `${SELECTED_HEAD}\n- Card 3: Card 3` });
  assert.equal(boardContext(locked, 'b', [], A), null);
});

test('the selected cards in the order selected; those a message took are left out; a chip\'s label on one line', () => {
  assert.deepEqual(selectedCards(b, ['3', '1', 'nope']), [{ n: 3, title: 'Card 3' }, { n: 1, title: 'Ship   on\nFriday?' }]);
  assert.deepEqual(boardCards(b, ['2', '3'], new Set([3])), [{ n: 2, title: 'Card 2' }]);
  assert.deepEqual(boardCards(b, [], new Set()), [], 'three unsent notes, no card');
  assert.deepEqual(cardChip({ n: 1, title: 'Ship   on\nFriday?' }), card(1, 'Ship on Friday?'));
});

test('Send is the chat\'s message with no words only with the board\'s session and something attached', () => {
  const on = { session: 's1', board: 'b', agent: 'claude' as const, created: '2026-10-09T09:00:00Z', agentId: A };
  assert.equal(sendsInChat(on, 'b', true), true);
  assert.equal(sendsInChat(on, 'b', false), false, 'nothing attached: the Send act, as with no session');
  assert.equal(sendsInChat(on, 'c', true), false, 'the session is another board\'s');
  assert.equal(sendsInChat({ ...on, board: undefined }, 'b', true), false, 'a folder session moving to the board');
  assert.equal(sendsInChat(null, 'b', true), false, 'no session: Send as today');
});

const at = (n: number) => `2026-10-09T10:00:${String(n).padStart(2, '0')}Z`;
const ev = (n: number, e: object) => ({ at: at(n), session: 's1', seq: n, ...e }) as ChatEvent;
const change = (n: number, board: string, cards: number[]) => ev(n, { kind: 'tool_activity', call: `c${n}`, tool: 'write_board', state: 'done', board, cards, head: 40 + n });
const chat: ChatState = applyEvents(EMPTY_CHAT, [
  ev(1, { kind: 'message_in', text: 'Draw it' }), change(2, 'b', [1, 2]), change(3, 'c', [1]), change(4, 'b', [2]),
  ev(5, { kind: 'system', text: 'Done.', turn: 'done' }),
]);

test('the stepper\'s link: the write in the chat that last changed the card, on this board', () => {
  assert.equal(lastChange(chat, 'b', 2)?.key, 'e4');
  assert.equal(lastChange(chat, 'b', 1)?.key, 'e2');
  assert.equal(lastChange(chat, 'b', 4), undefined);
  assert.equal(lastChange(chat, 'c', 1)?.key, 'e3');
  assert.deepEqual(cardIds(b, [2, 9, 1]), ['2', '1']);
});

/** The bridge with a board and a chat side made of plain objects. */
function bridged() {
  const selection = createSelection();
  const log: string[] = [];
  let open = 'b';
  const data: Record<string, BoardData> = { b, c: boardData(s, 'c') };
  let context: ComposerContext | null = null;
  const composer = {
    setChips() { log.push('chips'); },
    setContext(c: ComposerContext | null) { context = c; log.push(`context ${c?.label ?? 'none'}`); },
  };
  let agent: string | undefined = A;
  const panel = new EventTarget();
  const bridge = createChatBridge();
  /** The stepper's link the bridge gave the board (chat-side.ts `source`). */
  let linked: ((n: number) => string | undefined) | null = null;
  const offBoard = bridge.board({
    stage: new EventTarget() as HTMLElement, data: () => data[open]!, ledger: () => s, id: () => open, selection, readOnly: () => false,
    zoom: () => log.push(`zoom ${selection.selected().join(' ')}`), switchTo: (id) => { open = id; log.push(`open ${id}`); },
    jump: (id) => log.push(`jump ${id}`), toast: (t) => log.push(`toast ${t}`), source: (link) => { linked = link; },
  });
  bridge.chat({
    panel: panel as HTMLElement, composer: composer as unknown as ChatComposerElement, setFiles() {}, upload: () => Promise.reject(new Error('no upload here')), state: () => chat, agent: () => agent,
    changed: () => log.push('changed'), reveal: (key) => { log.push(`reveal ${key}`); },
  });
  const raise = (type: string, detail: unknown) => panel.dispatchEvent(new CustomEvent(type, { detail }));
  return {
    bridge, selection, log, raise, offBoard, chips: () => bridge.chips().map((x) => `${x.kind}-${x.ref}`), context: () => context,
    agentIs: (id: string | undefined) => { agent = id; }, linked: () => linked,
  };
}

test('board to chat: one chip for the selection and the answers, no chip per card or note; the cards a message took are spent until the selection changes', () => {
  const t = bridged();
  assert.deepEqual(t.chips(), [], 'unsent notes are among the answers, not chips');
  assert.equal(t.context()?.label, '3 answers');
  t.selection.select(['2'], 'only');
  assert.deepEqual([t.chips(), t.context()?.label], [['card-2'], '3 answers · 1 selected']);
  assert.ok(t.context()!.text.startsWith(`${SELECTED_HEAD}\n- Card 2: Card 2\n\n${ROUND_HEAD}\n`));
  t.selection.select(['2', '3'], 'only');
  assert.deepEqual(t.chips(), ['card-2', 'card-3']);
  t.bridge.sent([card(2), card(3)]);
  assert.deepEqual([t.chips(), t.context()?.label], [[], '3 answers'], 'spent: deselect and select again to send them again');
  t.selection.select(['3'], 'only');
  assert.deepEqual(t.chips(), ['card-3']);
  assert.ok(!t.log.includes('chips'), 'the board sets no chips of its own');
  const drawn = t.log.filter((l) => l !== 'changed').length;
  t.bridge.refresh();
  assert.equal(t.log.filter((l) => l !== 'changed').length, drawn, 'the same context is not set again');
});

test('board to chat: the answers are for the session\'s agent; another board has its own', () => {
  const t = bridged();
  assert.equal(t.context()?.label, '3 answers');
  assert.equal(t.context()?.text, roundOf(s, 'b', 9, A)!.text);
  t.agentIs('a-bbbb2222');
  t.bridge.refresh();
  assert.equal(t.context(), null, 'a session whose agent is told none of them');
  t.agentIs(undefined);
  t.bridge.refresh();
  assert.equal(t.context()?.label, '3 answers', 'no session yet: every answer');
  t.raise(CHAT_CHANGE_EVENT, { board: 'c', cards: [1] });
  t.bridge.refresh();
  assert.deepEqual(t.context(), { label: '1 selected', text: `${SELECTED_HEAD}\n- Card 1: Card 4` }, 'board c has no answers; the change chip selected its card 1');
  assert.equal(t.log.at(-1), 'changed', 'the panel hears of it');
});

test('chat to board: a change chip selects its cards and zooms; on another board, that board opens first', () => {
  const t = bridged();
  t.raise(CHAT_CHANGE_EVENT, { board: 'b', cards: [1, 2], head: 42 });
  assert.deepEqual(t.selection.selected(), ['1', '2']);
  t.raise(CHAT_CHANGE_EVENT, { board: 'c', cards: [1], head: 43 });
  t.raise(CHAT_CHANGE_EVENT, { board: 'c', cards: [4] });
  assert.deepEqual(t.log.filter((l) => !/^(chips|context|changed)/.test(l)), ['zoom 1 2', 'open c', 'zoom 1', 'toast Those cards are no longer on the board.'],
    'board c has one card, its 1: the ledger\'s 4 is no number there');
  assert.equal(t.bridge.source(1), SOURCE_LABEL);
  assert.equal(t.bridge.source(2), undefined, 'card 2 changed on board b; board c is open');
  assert.equal(t.linked()?.(1), SOURCE_LABEL, 'the board asks the same link through its side (chat-side.ts `source`)');
  t.bridge.open('launch');
  assert.equal(t.log.at(-1), 'jump launch', 'a folder chat\'s first board opens once it is held (panel-send ruling 2)');
  t.offBoard();
  t.bridge.open('launch');
  assert.equal(t.log.at(-1), 'jump launch', 'no board side, nothing opens');
  assert.equal(t.bridge.source(1), undefined, 'no board side, no link');
  assert.equal(t.linked(), null, 'detached, the board holds no link');
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
  assert.deepEqual(messageBody('  ', [card(2)]), { cards: [2] }, 'no words: none sent (chat-board-context ruling 3)');
  assert.equal(blockedReason(null, true, 'refused'), LOADING, 'the page does not know the board or the folder yet');
  assert.equal(blockedReason('', false), undefined, 'a folder with no board takes a message (panel-send ruling 2)');
  assert.equal(blockedReason('b', true, 'refused'), PAST);
  assert.equal(blockedReason('b', false, 'Kiro is not available.'), 'Kiro is not available.');
  assert.equal(blockedReason('b', false), undefined);
  // N39 ruling 3: a chat on an archived board takes no message, and says why in the composer.
  assert.equal(blockedReason('b', false, 'Kiro is not available.', true), ARCHIVED);
  assert.equal(blockedReason('b', true, undefined, true), PAST);
  assert.match(ARCHIVED, /archived.*Restore it from the board picker/);
});
