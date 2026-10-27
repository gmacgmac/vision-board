// The page's changed cards (proposals-seen-parking FE_02): which items are unseen comes from the
// conditions table (`pageConditions`); the count the tab shows (past version 1 only), the steps and
// their changes, and the card seen lines a selection sends.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger } from '#format';
import { foldLedger, pageConditions, seenDue, seenMarks, seenOnSelect, unseenCount, unseenSteps } from '../src/index.ts';
import { lineMaker } from '#format/testing';

const A = 'a-aaaa1111';
const maker = lineMaker({ v: 10, at: '2026-10-08T13' });
const { line } = maker;
const agent = (e: object) => line({ by: 'agent', agent: A, ...e });
const node = (n: number, ver: number, body: string, title = `Card ${n}`) =>
  agent({ type: 'node', board: 'b', n, ver, node: { region: 'r', kind: 'question', title, body, item: true } });

/** Card 1 at version 1. Card 2: seen at 2, then appended and retitled. Card 3: rewritten, never seen. */
function ledger() {
  maker.reset();
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
  maker.reset();
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
  maker.reset();
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
  maker.reset();
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

// D-045, answer-model ruling 7 (card 20's sequence): ✓, a note, the agent's reply. The reply clears
// the ✓ and is one update of its own, though the card is still at version 1; the card seen line it
// needs is due although that version was seen, and once sent the update is gone.
test('the agent\'s reply that cleared a card: one update, its step, a seen line due at a seen version', () => {
  maker.reset();
  const lines = [
    agent({ type: 'join', label: 'Pricing chat' }), agent({ type: 'board', board: 'b', title: 'B' }),
    agent({ type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'grid' } }),
    node(1, 1, 'One.'), line({ by: 'person', type: 'seen', n: 1, ver: 1 }),
    line({ by: 'person', type: 'act', action: 'ack', n: 1, ver: 1 }),
    line({ by: 'person', type: 'act', action: 'comment', n: 1, ver: 1, text: 'Does it cover renewals?' }),
  ];
  const note = maker.seq;
  lines.push(agent({ type: 'reply', n: 1, text: 'Yes, renewals too.', to: note }));
  const { events, problems } = readLedger(lines);
  assert.deepEqual(problems, []);
  const s = foldLedger(events);
  assert.deepEqual([...pageConditions(s, 'b').unseen], [1]);
  assert.equal(unseenCount(s, 'b', 1), 1);
  assert.deepEqual(unseenSteps(s, 'b', 1, (at) => at.slice(11, 16)),
    [{ ver: 1, when: '13:08', agent: 'Pricing chat', changes: [], reply: 'Yes, renewals too.' }]);
  assert.equal(seenDue(s, 'b', 1, 1), true, 'version 1 was seen, the answer was not');
  assert.deepEqual(seenMarks(s, 'b', pageConditions(s, 'b').unseen, ['1']), [{ n: 1, ver: 1 }]);
  const { events: more } = readLedger([...lines, line({ by: 'person', type: 'seen', n: 1, ver: 1 })]);
  const after = foldLedger(more);
  assert.deepEqual([unseenCount(after, 'b', 1), seenDue(after, 'b', 1, 1), [...pageConditions(after, 'b').unseen]], [0, false, []]);
});

// Review polish round 2 ruling 4: any reply of the agent's on a card shows "1 update" until the person
// has seen it, whether or not it answers a note or clears anything; looking at the card ends it.
test('any reply of the agent\'s is one update until seen: with no note, or to an older note that clears nothing', () => {
  maker.reset();
  const lines = [
    agent({ type: 'join', label: 'Pricing chat' }), agent({ type: 'board', board: 'b', title: 'B' }),
    agent({ type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'grid' } }),
    node(1, 1, 'One.'), node(2, 1, 'Two.'),
    line({ by: 'person', type: 'seen', n: 1, ver: 1 }), line({ by: 'person', type: 'seen', n: 2, ver: 1 }),
    line({ by: 'person', type: 'act', action: 'comment', n: 2, ver: 1, text: 'Which plans?' }),
  ];
  const first = maker.seq;
  lines.push(
    line({ by: 'person', type: 'act', action: 'ack', n: 2, ver: 1 }),
    line({ by: 'person', type: 'act', action: 'comment', n: 2, ver: 1, text: 'And renewals?' }),
    agent({ type: 'reply', n: 1, text: 'The sheet moved to the shared drive.' }),
    agent({ type: 'reply', n: 2, text: 'The 2024 ones.', to: first }),
  );
  const { events, problems } = readLedger(lines);
  assert.deepEqual(problems, []);
  const s = foldLedger(events);
  assert.equal(s.items.get(2)?.status, 'acknowledged', 'a reply to an older note clears nothing');
  assert.deepEqual([...pageConditions(s, 'b').unseen].sort(), [1, 2]);
  assert.deepEqual([unseenCount(s, 'b', 1), unseenCount(s, 'b', 2)], [1, 1]);
  assert.deepEqual(unseenSteps(s, 'b', 1, (at) => at.slice(11, 16)),
    [{ ver: 1, when: '13:11', agent: 'Pricing chat', changes: [], reply: 'The sheet moved to the shared drive.' }]);
  assert.equal(unseenSteps(s, 'b', 2, () => 'now')[0]?.reply, 'The 2024 ones.');
  assert.deepEqual([seenDue(s, 'b', 1, 1), seenDue(s, 'b', 2, 1)], [true, true]);
  const { events: more } = readLedger([...lines, line({ by: 'person', type: 'seen', n: 1, ver: 1 }), line({ by: 'person', type: 'seen', n: 2, ver: 1 })]);
  const after = foldLedger(more);
  assert.deepEqual([unseenCount(after, 'b', 1), unseenCount(after, 'b', 2), seenDue(after, 'b', 1, 1), [...pageConditions(after, 'b').unseen]], [0, 0, false, []]);
});
