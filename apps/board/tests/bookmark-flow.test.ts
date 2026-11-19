// The person's bookmark on the page (cardBookmark flag, D-099 2; the flag before ledger format 20): a format-19 ledger's
// flags, migrated on open, are its bookmarks; the act a press sends (by board number, no version), the bookmarked cards
// in number order, the chip's next card, and that a bookmark never reaches what is sent to an agent: the Send message
// and the chat chips read the same with and without bookmarks. On board b every card's number differs from its identity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEDGER_FORMAT, readLedger, upgradeLines } from '#format';
import { boardData, foldLedger, replyText } from '#actions';
import { selectedCards } from '../src/board/chat-side.ts';
import type { ActFields } from '../src/board/io.ts';
import { createBookmarkFlow, bookmarkAct, bookmarkedIds, bookmarkedWords, nextBookmarked } from '../src/board/cards/bookmark-flow.ts';
import { lineMaker } from '#format/testing';

const A = 'a-aaaa1111';
const maker = lineMaker({ at: '2026-10-11T10' });
const { line } = maker;
const agent = (e: object) => line({ by: 'agent', agent: A, ...e });
const person = (e: object) => line({ by: 'person', ...e });
const card = (board: string, n: number, kind = 'question') => agent({ type: 'node', board, n, ver: 1, node: { region: 'r', kind, title: `Card ${n}` } });

/** Board a: the ledger's 1 and 2. Board b: the ledger's 3 to 6, its 1 to 4. The person bookmarks b's 2
 *  and 4 (the ledger's 4 and 6), comments on b's 1 and bookmarks a's 1. */
function lines(marks = true): string[] {
  maker.reset();
  return [
    agent({ type: 'join', label: 'Pricing chat' }),
    agent({ type: 'board', board: 'a', title: 'A' }), agent({ type: 'region', board: 'a', region: { id: 'r', title: 'R', mode: 'grid' } }),
    card('a', 1), card('a', 2),
    agent({ type: 'board', board: 'b', title: 'B' }), agent({ type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'grid' } }),
    card('b', 3), card('b', 4, 'finding'), card('b', 5), card('b', 6),
    person({ type: 'act', action: 'comment', n: 3, ver: 1, text: 'Why?' }),
    ...(marks ? [person({ type: 'act', action: 'bookmark', n: 6 }), person({ type: 'act', action: 'bookmark', n: 4 }), person({ type: 'act', action: 'bookmark', n: 1 })] : []),
  ];
}

function state(marks = true) {
  const { events, problems } = readLedger(lines(marks));
  assert.deepEqual(problems, []);
  return foldLedger(events);
}

test('a format-19 ledger\'s flags, migrated on open (the 19-to-20 step), are its bookmarks', () => {
  // The same ledger as written before format 20: every line at 19, the private mark the `flag` act.
  const old = lines().map((l) => l.replace(`{"v":${LEDGER_FORMAT},`, '{"v":19,').replace('"action":"bookmark"', '"action":"flag"'));
  assert.equal(old.filter((l) => l.includes('"action":"flag"')).length, 3);
  const up = upgradeLines(old);
  assert.deepEqual([up.stops, up.newer, up.lines.length], [[], [], old.length], 'line for line, nothing refused');
  const { events, problems } = readLedger(up.lines);
  assert.deepEqual(problems, []);
  const b = boardData(foldLedger(events), 'b');
  assert.deepEqual(bookmarkedIds(b.view, b.state.bookmarks), ['2', '4']);
  assert.deepEqual(up.lines.filter((l) => l.includes('"action":"flag"')), [], 'nothing reads the old act');
});

test('the bookmarked cards on the open board, by board number, in number order', () => {
  const b = boardData(state(), 'b');
  assert.deepEqual([...b.state.bookmarks].sort(), ['2', '4'], 'the ledger\'s 4 and 6 are board b\'s 2 and 4');
  assert.deepEqual(bookmarkedIds(b.view, b.state.bookmarks), ['2', '4']);
  assert.deepEqual([...boardData(state(), 'a').state.bookmarks], ['1'], 'board a has its own');
});

test('a press sends bookmark or unbookmark naming the card by its number, with no version', () => {
  assert.deepEqual(bookmarkAct('2', false), { action: 'bookmark', n: 2 });
  assert.deepEqual(bookmarkAct('2', true), { action: 'unbookmark', n: 2 });
});

test('the chip steps through the bookmarked cards from the focused one, wrapping', () => {
  const ids = ['2', '4', '9'];
  assert.equal(nextBookmarked(ids, null), '2');
  assert.equal(nextBookmarked(ids, '2'), '4');
  assert.equal(nextBookmarked(ids, '9'), '2', 'wraps');
  assert.equal(nextBookmarked(ids, '5'), '9', 'from a card not bookmarked: the next bookmarked one after it');
  assert.equal(nextBookmarked(ids, '10'), '2');
  assert.equal(nextBookmarked([], '2'), undefined);
  assert.deepEqual(bookmarkedWords(2), { count: '2', word: 'bookmarked', title: '2 bookmarked · go to the next one' });
});

test('the flow: a press records the act; the chip focuses the next drawn bookmarked card; off, nothing', async () => {
  const d = boardData(state(), 'b');
  const sent: ActFields[] = [];
  const log: string[] = [];
  let focused: string | null = '2';
  const make = (on: boolean, drawn = (_id: string) => true) => createBookmarkFlow({
    on, view: () => d.view, state: () => d.state, record: async (f) => { sent.push(f); return true; }, focused: () => focused,
    drawn, focusCard: (id) => log.push(`focus ${id}`), toast: (t) => log.push(`toast ${t}`),
  });
  const flow = make(true);
  await flow.toggle('2');
  await flow.toggle('3');
  await flow.toggle('99');
  assert.deepEqual(sent, [{ action: 'unbookmark', n: 2 }, { action: 'bookmark', n: 3 }], 'a card the board does not have sends nothing');
  flow.next();
  focused = null; // a press on the chip took focus off the card
  flow.next();
  focused = '2';
  make(true, (id) => id !== '4').next();
  make(true, () => false).next();
  // From the focused card (2), then from the card it went to last (4, wrapping to 2); a hidden 4 is skipped.
  assert.deepEqual(log, ['toast 2 bookmark removed', 'toast 3 bookmarked', 'focus 4', 'focus 2', 'focus 2',
    'toast The bookmarked cards are hidden: turn off Hide answered to see them.']);
  const off = make(false);
  await off.toggle('2');
  off.next();
  assert.deepEqual([sent.length, off.ids()], [2, []]);
});

// Ruling 3: a bookmark is never sent to an agent. What the page sends is the Send message (replyText) and
// the chat composer's chips; both read the same with the bookmarks as without. Only the ledger's position
// differs (the View's version: every line on any board moves it, BE_02 deviation 4).
test('a bookmark never reaches the Send message or the chat chips', () => {
  const [marked, plain] = [boardData(state(), 'b'), boardData(state(false), 'b')];
  const message = (d: typeof plain) => replyText(d.view, d.state).replace(/\(v\d+\)/, '(v)');
  assert.equal(message(marked), message(plain));
  assert.match(message(marked), /Why\?/, 'the message carries the comment');
  assert.doesNotMatch(message(marked), /flag|bookmark/i);
  assert.deepEqual(selectedCards(marked, ['2', '4']), selectedCards(plain, ['2', '4']));
});
