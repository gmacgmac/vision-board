// The "N cards retired" marker's past view (review polish ruling 10, N42), as the page draws it:
// that version's cards with the person's answers as they stood just before the retire, and the
// container's count. The marker's counts and the lines of the view are packages/actions' own test
// (retired-markers.test.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger } from '#format';
import { boardData, foldLedger, pastLines, retiredCounts } from '#actions';
import { regionState } from '#ui';
import { lineMaker } from '#format/testing';

const A = 'a-aaaa1111';
const maker = lineMaker({ v: 12, at: '2026-10-11T11' });
const { line } = maker;
const agent = (e: object) => line({ by: 'agent', agent: A, ...e });
const person = (e: object) => line({ by: 'person', ...e });
const region = (board: string, id: string) => agent({ type: 'region', board, region: { id, title: id.toUpperCase(), mode: 'grid' } });
const card = (board: string, n: number, r: string) => agent({ type: 'node', board, n, ver: 1, node: { region: r, kind: 'finding', title: `Card ${n}` } });
const retire = (board: string, cards: number[], r?: string) => agent({ type: 'retire', board, cards, ...(r && { region: r }) });

// ---- the marker's past view (N42) ------------------------------------------------------------

const ask = (board: string, n: number, title = `Question ${n}?`, ver = 1) =>
  agent({ type: 'node', board, n, ver, node: { region: 'p', kind: 'question', title } });
const check = (n: number, ver = 1) => person({ type: 'act', action: 'ack', n, ver });
const cross = (n: number, ver = 1) => person({ type: 'act', action: 'drop', n, ver });

/** Board c: container p drawn at v1 (seq 7) with four cards that ask; then `after` lines. */
function asked(after: () => string[]) {
  maker.reset();
  const lines = [
    agent({ type: 'join', label: 'Pricing chat' }), agent({ type: 'board', board: 'c', title: 'C' }), region('c', 'p'),
    ask('c', 1), ask('c', 2), ask('c', 3), ask('c', 4), // 7: v1
    ...after(),
  ];
  const { events, problems } = readLedger(lines);
  assert.deepEqual(problems, []);
  return events;
}

/** Board c folded from `lines`: container p's cards as the page draws them, and its count. */
function viewOf(lines: ReturnType<typeof asked>) {
  const d = boardData(foldLedger(lines), 'c');
  const r = d.view.regions.find((g) => g.id === 'p')!;
  return {
    cards: d.view.nodes.map((n) => [n.title, d.state.items.get(n.id)?.status ?? 'open']),
    count: regionState(r, d.view, d.state, new Set(d.view.nodes.map((n) => n.id))).countLabel,
  };
}
/** The marker's past view: version `version`'s drawing, the answers up to line `until`. */
const pastView = (events: ReturnType<typeof asked>, version: number, until: number) => viewOf(pastLines(events, 'c', version, until));

const ALL = [['Question 1?', 'acknowledged'], ['Question 2?', 'dropped'], ['Question 3?', 'acknowledged'], ['Question 4?', 'dropped']];

test('the marker\'s past view: that version\'s cards with every answer given before the retire, not the summary drawn with it', () => {
  const events = asked(() => [
    check(1), cross(2), check(3), cross(4), // 11
    agent({ type: 'board', board: 'd', title: 'D' }), region('d', 'p'), card('d', 9, 'p'), check(9), // 15: another board meanwhile
    agent({ type: 'node', board: 'c', n: 10, ver: 1, node: { region: 'p', kind: 'finding', title: 'Summary' } }), // 16: one batch
    retire('c', [1]), retire('c', [2]), // 18
  ]);
  const s = foldLedger(events);
  assert.deepEqual(pastView(events, 7, 17), { cards: ALL, count: '4 of 4 answered' });
  assert.equal(viewOf(events.filter((e) => e.seq <= 7)).count, '0 of 4 answered', 'v1 from the dropdown: as at v1, unchanged');
  assert.equal(foldLedger(pastLines(events, 'c', 7, 17)).nodes.get(9)?.versions.length, 1, 'another board keeps its drawing');
  assert.deepEqual([...retiredCounts(s, 'c')], [['p', { count: 2, version: 7, until: 17 }]], 'the batch is one run: v1 opens, its answers run to the first retire');
});

test('the agent\'s reply before the retire cleared a ✓ (D-045): that card shows open', () => {
  const events = asked(() => [
    check(1), cross(2), check(3), cross(4), // 11
    person({ type: 'act', action: 'comment', n: 3, ver: 1, text: 'Why?' }), // 12
    agent({ type: 'reply', n: 3, to: 12, text: 'Because.' }), // 13
    retire('c', [1]), retire('c', [2]), // 15
  ]);
  const past = pastView(events, 7, 14);
  assert.deepEqual(past.cards[2], ['Question 3?', 'open']);
  assert.equal(past.count, '3 of 4 answered');
  assert.deepEqual([...retiredCounts(foldLedger(events), 'c')], [['p', { count: 2, version: 7, until: 14 }]]);
});

test('a ✓ on a version the past view does not draw: the card as drawn then, with the answer', () => {
  const events = asked(() => [
    check(1), cross(2), check(3), cross(4), // 11
    ask('c', 1, 'Question 1, reworded?', 2), // 12: v12
    check(1, 2), // 13
    retire('c', [2]), // 14
  ]);
  assert.deepEqual(pastView(events, 7, 14), { cards: ALL, count: '4 of 4 answered' }, 'v1 read with the later lines: drawn as at v1');
  assert.deepEqual([...retiredCounts(foldLedger(events), 'c')], [['p', { count: 1, version: 12, until: 14 }]], 'the marker opens the redraw');
});

test('cards retired over two rounds: the version before the latest, the answers to the retire after it', () => {
  const events = asked(() => [
    check(1), cross(2), check(3), cross(4), // 11
    retire('c', [1]), // 12: v12
    cross(3), // 13: changed
    retire('c', [2]), // 14
  ]);
  assert.deepEqual(pastView(events, 12, 14), { cards: [['Question 2?', 'dropped'], ['Question 3?', 'dropped'], ['Question 4?', 'dropped']], count: '3 of 3 answered' });
  assert.deepEqual([...retiredCounts(foldLedger(events), 'c')], [['p', { count: 2, version: 12, until: 14 }]]);
});

test('the person\'s own retire (D-044) is the cut like an agent\'s', () => {
  const events = asked(() => [
    check(1), cross(2), check(3), cross(4), // 11
    line({ v: 16, by: 'person', type: 'retire', board: 'c', cards: [1, 2] }), // 12
  ]);
  assert.deepEqual(pastView(events, 7, 12), { cards: ALL, count: '4 of 4 answered' });
  assert.deepEqual([...retiredCounts(foldLedger(events), 'c')], [['p', { count: 2, version: 7, until: 12 }]]);
});
