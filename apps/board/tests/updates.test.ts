// The page's changed cards (proposals-seen-parking FE_02): which items are unseen comes from the
// conditions table (`pageConditions`); the count the tab shows (past version 1 only), the steps and
// their changes, and the card seen lines a selection sends.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger } from '../../../packages/format/src/index.ts';
import { foldLedger } from '../../../packages/actions/src/index.ts';
import { pageConditions } from '../src/board/board-data.ts';
import { seenMarks, seenOnSelect, unseenCount, unseenSteps } from '../src/board/updates.ts';

const A = 'a-aaaa1111';
let seq = 0;
const line = (e: object) => JSON.stringify({ v: 10, seq: ++seq, at: `2026-10-08T13:${String(seq).padStart(2, '0')}:00Z`, ...e });
const agent = (e: object) => line({ by: 'agent', agent: A, ...e });
const node = (n: number, ver: number, body: string, title = `Card ${n}`) =>
  agent({ type: 'node', board: 'b', n, ver, node: { region: 'r', kind: 'question', title, body, item: true } });

/** Card 1 at version 1. Card 2: seen at 2, then appended and retitled. Card 3: rewritten, never seen. */
function ledger() {
  seq = 0;
  const lines = [
    agent({ type: 'join', label: 'Pricing chat' }), agent({ type: 'board', board: 'b', title: 'B' }),
    agent({ type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'grid' } }),
    node(1, 1, 'One.'), node(2, 1, 'Two.'), node(3, 1, 'Three.'), node(2, 2, 'Two, again.'),
    line({ by: 'person', type: 'seen', n: 2, ver: 2 }),
    node(2, 3, 'Two, again.\n\nThe credit amount is in.'), node(2, 4, 'Two, again.\n\nThe credit amount is in.', 'Card two'),
    node(3, 2, 'Three, rewritten.'),
  ];
  const { events, problems } = readLedger(lines);
  assert.deepEqual(problems, []);
  return foldLedger(events);
}

test('the tab counts only versions past max(seen, 1): a version-1 card has none', () => {
  const s = ledger();
  assert.deepEqual([...pageConditions(s, 'b').unseen].sort(), [1, 2, 3], 'the conditions table: every item not seen at its latest');
  assert.deepEqual([1, 2, 3].map((n) => unseenCount(s, 'b', n)), [0, 2, 1]);
});

test('the steps: each unseen version, when, who and what changed', () => {
  const s = ledger();
  assert.deepEqual(unseenSteps(s, 'b', 2, (at) => at.slice(11, 16)), [
    { ver: 3, when: '13:09', agent: 'Pricing chat', changes: [{ field: 'body', change: 'added', text: 'The credit amount is in.' }] },
    { ver: 4, when: '13:10', agent: 'Pricing chat', changes: [{ field: 'title', change: 'changed', text: 'Card two' }] },
  ]);
  assert.deepEqual(unseenSteps(s, 'b', 3, () => 'now')[0]!.changes, [{ field: 'body', change: 'changed' }]);
  assert.deepEqual(unseenSteps(s, 'b', 1, () => 'now'), []);
});

test('a selection marks each unseen item at its latest version, in order; a seen one sends nothing', () => {
  const s = ledger();
  const unseen = pageConditions(s, 'b').unseen;
  assert.deepEqual(seenMarks(s, 'b', unseen, ['3', '1', '2']), [{ n: 3, ver: 2 }, { n: 1, ver: 1 }, { n: 2, ver: 4 }]);
  assert.deepEqual(seenMarks(s, 'b', new Set([2]), ['1', 'not-an-item']), []);
});

test('a NEW card shows NEW only: the page leaves it out of the updates (`item.new` before `item.unseen`)', () => {
  seq = 0;
  const lines = [
    agent({ type: 'join', label: 'Pricing chat' }), agent({ type: 'board', board: 'b', title: 'B' }),
    agent({ type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'grid' } }),
    node(1, 1, 'One.'), line({ by: 'person', type: 'seen', board: 'b', head: 4 }),
    node(4, 1, 'Four.'), node(4, 2, 'Four, again.'), node(1, 2, 'One, again.'),
  ];
  const { events, problems } = readLedger(lines);
  assert.deepEqual(problems, []);
  const c = pageConditions(foldLedger(events), 'b');
  assert.deepEqual([[...c.fresh], [...c.unseen]], [[2], [1]], 'by board number: the ledger\'s 4 is board b\'s 2');
});

test('a selection sends seen for the cards whose conditions end on select (`clearedBy`): NEW and updates both', () => {
  seq = 0;
  const lines = [
    agent({ type: 'join', label: 'Pricing chat' }), agent({ type: 'board', board: 'b', title: 'B' }),
    agent({ type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'grid' } }),
    node(1, 1, 'One.'), line({ by: 'person', type: 'seen', board: 'b', head: 4 }),
    node(4, 1, 'Four.'), node(1, 2, 'One, again.'),
  ];
  const { events } = readLedger(lines);
  const s = foldLedger(events);
  const c = pageConditions(s, 'b');
  assert.deepEqual([[...c.fresh], [...c.unseen]], [[2], [1]]);
  const held = seenOnSelect(c);
  assert.deepEqual([...held].sort(), [1, 2]);
  assert.deepEqual(seenMarks(s, 'b', held, ['2', '1']), [{ n: 2, ver: 1 }, { n: 1, ver: 2 }]);
});

// D-041 proposed (api.md 125): the page folds by identity and draws by board number. On a second
// board every card's identity differs from its number, so a slip between the two shows here.
test('two boards: counts, steps and seen marks name a card by its number on the open board', () => {
  seq = 0;
  const on = (board: string, n: number, ver: number, body: string) =>
    agent({ type: 'node', board, n, ver, node: { region: 'r', kind: 'question', title: `Card ${n}`, body, item: true } });
  const lines = [
    agent({ type: 'join', label: 'Pricing chat' }),
    agent({ type: 'board', board: 'a', title: 'A' }), agent({ type: 'region', board: 'a', region: { id: 'r', title: 'R', mode: 'grid' } }),
    on('a', 1, 1, 'A one.'), on('a', 2, 1, 'A two.'),
    agent({ type: 'board', board: 'b', title: 'B' }), agent({ type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'grid' } }),
    on('b', 3, 1, 'B one.'), on('b', 4, 1, 'B two.'), on('b', 4, 2, 'B two, again.'), on('a', 1, 2, 'A one, again.'),
  ];
  const { events, problems } = readLedger(lines);
  assert.deepEqual(problems, []);
  const s = foldLedger(events);
  const b = pageConditions(s, 'b');
  assert.deepEqual([...b.unseen].sort(), [1, 2], 'board b\'s cards are 1 and 2 (the ledger\'s 3 and 4)');
  assert.deepEqual([1, 2].map((n) => unseenCount(s, 'b', n)), [0, 1]);
  assert.deepEqual(unseenSteps(s, 'b', 2, () => 'now').map((x) => x.ver), [2]);
  assert.deepEqual(seenMarks(s, 'b', b.unseen, ['2', '1']), [{ n: 2, ver: 2 }, { n: 1, ver: 1 }]);
  assert.deepEqual([1, 2].map((n) => unseenCount(s, 'a', n)), [1, 0], 'board a\'s card 1 is its own, not board b\'s');
});
