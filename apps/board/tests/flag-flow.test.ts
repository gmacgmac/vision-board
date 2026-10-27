// The person's flag on the page (cardFlag flag, field report batch 2 ruling 3, assumption A): the act
// a press sends (by board number, no version), the flagged cards in number order, the chip's next
// card, and that a flag never reaches what is sent to an agent: the Send message and the chat chips
// read the same with and without flags. On board b every card's number differs from its identity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger } from '#format';
import { boardData, foldLedger, replyText } from '#actions';
import { boardCards } from '../src/shell/chat-bridge.ts';
import type { ActFields } from '../src/board/io.ts';
import { createFlagFlow, flagAct, flaggedIds, flaggedWords, nextFlagged } from '../src/board/flag-flow.ts';

const A = 'a-aaaa1111';
let seq = 0;
const line = (e: object) => JSON.stringify({ v: 12, seq: ++seq, at: `2026-10-11T10:${String(seq).padStart(2, '0')}:00Z`, ...e });
const agent = (e: object) => line({ by: 'agent', agent: A, ...e });
const person = (e: object) => line({ by: 'person', ...e });
const card = (board: string, n: number, kind = 'question') => agent({ type: 'node', board, n, ver: 1, node: { region: 'r', kind, title: `Card ${n}` } });

/** Board a: the ledger's 1 and 2. Board b: the ledger's 3 to 6, its 1 to 4. The person flags b's 2
 *  and 4 (the ledger's 4 and 6), comments on b's 1 and flags a's 1. */
function state(flags = true) {
  seq = 0;
  const lines = [
    agent({ type: 'join', label: 'Pricing chat' }),
    agent({ type: 'board', board: 'a', title: 'A' }), agent({ type: 'region', board: 'a', region: { id: 'r', title: 'R', mode: 'grid' } }),
    card('a', 1), card('a', 2),
    agent({ type: 'board', board: 'b', title: 'B' }), agent({ type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'grid' } }),
    card('b', 3), card('b', 4, 'finding'), card('b', 5), card('b', 6),
    person({ type: 'act', action: 'comment', n: 3, ver: 1, text: 'Why?' }),
    ...(flags ? [person({ type: 'act', action: 'flag', n: 6 }), person({ type: 'act', action: 'flag', n: 4 }), person({ type: 'act', action: 'flag', n: 1 })] : []),
  ];
  const { events, problems } = readLedger(lines);
  assert.deepEqual(problems, []);
  return foldLedger(events);
}

test('the flagged cards on the open board, by board number, in number order', () => {
  const b = boardData(state(), 'b');
  assert.deepEqual([...b.state.flags].sort(), ['2', '4'], 'the ledger\'s 4 and 6 are board b\'s 2 and 4');
  assert.deepEqual(flaggedIds(b.view, b.state.flags), ['2', '4']);
  assert.deepEqual([...boardData(state(), 'a').state.flags], ['1'], 'board a has its own');
});

test('a press sends flag or unflag naming the card by its number, with no version', () => {
  assert.deepEqual(flagAct('2', false), { action: 'flag', n: 2 });
  assert.deepEqual(flagAct('2', true), { action: 'unflag', n: 2 });
});

test('the chip steps through the flagged cards from the focused one, wrapping', () => {
  const ids = ['2', '4', '9'];
  assert.equal(nextFlagged(ids, null), '2');
  assert.equal(nextFlagged(ids, '2'), '4');
  assert.equal(nextFlagged(ids, '9'), '2', 'wraps');
  assert.equal(nextFlagged(ids, '5'), '9', 'from a card not flagged: the next flagged one after it');
  assert.equal(nextFlagged(ids, '10'), '2');
  assert.equal(nextFlagged([], '2'), undefined);
  assert.deepEqual(flaggedWords(2), { count: '2', word: 'flagged', title: '2 flagged · go to the next one' });
});

test('the flow: a press records the act; the chip focuses the next drawn flagged card; off, nothing', async () => {
  const d = boardData(state(), 'b');
  const sent: ActFields[] = [];
  const log: string[] = [];
  let focused: string | null = '2';
  const make = (on: boolean, drawn = (_id: string) => true) => createFlagFlow({
    on, view: () => d.view, state: () => d.state, record: async (f) => { sent.push(f); return true; }, focused: () => focused,
    drawn, focusCard: (id) => log.push(`focus ${id}`), toast: (t) => log.push(`toast ${t}`),
  });
  const flow = make(true);
  await flow.toggle('2');
  await flow.toggle('3');
  await flow.toggle('99');
  assert.deepEqual(sent, [{ action: 'unflag', n: 2 }, { action: 'flag', n: 3 }], 'a card the board does not have sends nothing');
  flow.next();
  focused = null; // a press on the chip took focus off the card
  flow.next();
  focused = '2';
  make(true, (id) => id !== '4').next();
  make(true, () => false).next();
  // From the focused card (2), then from the card it went to last (4, wrapping to 2); a hidden 4 is skipped.
  assert.deepEqual(log, ['toast 2 flag removed', 'toast 3 flagged', 'focus 4', 'focus 2', 'focus 2',
    'toast The flagged cards are hidden: turn off Hide answered to see them.']);
  const off = make(false);
  await off.toggle('2');
  off.next();
  assert.deepEqual([sent.length, off.ids()], [2, []]);
});

// Ruling 3: a flag is never sent to an agent. What the page sends is the Send message (replyText) and
// the chat composer's chips; both read the same with the flags as without. Only the ledger's position
// differs (the View's version: every line on any board moves it, BE_02 deviation 4).
test('a flag never reaches the Send message or the chat chips', () => {
  const [flagged, plain] = [boardData(state(), 'b'), boardData(state(false), 'b')];
  const message = (d: typeof plain) => replyText(d.view, d.state).replace(/\(v\d+\)/, '(v)');
  assert.equal(message(flagged), message(plain));
  assert.match(message(flagged), /Why\?/, 'the message carries the comment');
  assert.doesNotMatch(message(flagged), /flag/i);
  assert.deepEqual(boardCards(flagged, ['2', '4'], new Set()), boardCards(plain, ['2', '4'], new Set()));
});
