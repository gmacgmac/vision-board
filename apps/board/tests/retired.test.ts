// The "N cards retired" markers (retiredMarker flag, field report batch 2 ruling 1, api.md 126): the
// cards retired one at a time, counted on the container each was in when it went; the board version
// a press opens (the last one before the latest such retire) and the line its answers run to (the
// first retire after it, N42); none for a container retired whole, or retired after; retired cards
// and containers gone from the board the page draws. Then the marker's past view (review polish
// ruling 10): that version's cards with the person's answers as they stood just before the retire.
// Board b's numbers differ from the ledger's identities throughout.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger } from '#format';
import { foldLedger } from '#actions';
import { regionState } from '#ui';
import { boardData } from '../src/board/board-data.ts';
import { pastLines, retiredCounts } from '../src/board/retired.ts';

const A = 'a-aaaa1111';
let seq = 0;
const line = (e: object) => JSON.stringify({ v: 12, seq: ++seq, at: `2026-10-11T11:${String(seq).padStart(2, '0')}:00Z`, ...e });
const agent = (e: object) => line({ by: 'agent', agent: A, ...e });
const person = (e: object) => line({ by: 'person', ...e });
const region = (board: string, id: string) => agent({ type: 'region', board, region: { id, title: id.toUpperCase(), mode: 'grid' } });
const card = (board: string, n: number, r: string) => agent({ type: 'node', board, n, ver: 1, node: { region: r, kind: 'finding', title: `Card ${n}` } });
const retire = (board: string, cards: number[], r?: string) => agent({ type: 'retire', board, cards, ...(r && { region: r }) });

/** Board a: the ledger's 1. Board b: containers p, q and z; cards 2-4 in p, 5 in q (the person moves
 *  it to p), 6-7 in z. Run 1 ends at seq 12; the person's ack (13) starts run 2: 3 retired (14), then
 *  the moved 5 (15). Then the person acks again (16) and z goes whole (17). */
function ledger(extra: () => string[] = () => []) {
  seq = 0;
  const lines = [
    agent({ type: 'join', label: 'Pricing chat' }),
    agent({ type: 'board', board: 'a', title: 'A' }), region('a', 'p'), card('a', 1, 'p'), // 4
    agent({ type: 'board', board: 'b', title: 'B' }), region('b', 'p'), region('b', 'q'), region('b', 'z'), // 8
    card('b', 2, 'p'), card('b', 3, 'p'), card('b', 5, 'q'), card('b', 6, 'z'), // 12
    person({ type: 'act', action: 'move', n: 5, board: 'b', region: 'p' }), // 13
    retire('b', [3]), retire('b', [5]), // 15
    person({ type: 'act', action: 'comment', n: 2, ver: 1, text: 'Why?' }), // 16
    retire('b', [6], 'z'), // 17
    ...extra(),
  ];
  const { events, problems } = readLedger(lines);
  assert.deepEqual(problems, []);
  return foldLedger(events);
}

test('cards retired one at a time count on the container they were in, moves included; the marker opens the version before', () => {
  const s = ledger();
  assert.deepEqual([...retiredCounts(s, 'b')], [['p', { count: 2, version: 12, until: 14 }]], '3 drawn in p, 5 moved into p; z went whole');
  assert.deepEqual([...retiredCounts(s, 'a')], [], 'another board has its own');
});

test('retired cards and a retired container are gone from the board the page draws', () => {
  const d = boardData(ledger(), 'b');
  assert.deepEqual(d.view.nodes.map((n) => [n.id, n.title]), [['1', 'Card 2']], 'board b\'s 2, 3 and 4 left; its 1 stays');
  assert.deepEqual(d.view.regions.map((r) => r.id), ['p', 'q']);
  assert.deepEqual(Object.keys(d.versions), ['1']);
});

test('no version before the retire: the marker only counts; a container retired later takes its marker', () => {
  seq = 0;
  const lines = [
    agent({ type: 'join', label: 'Pricing chat' }), agent({ type: 'board', board: 'b', title: 'B' }), region('b', 'p'), region('b', 'q'),
    card('b', 1, 'p'), card('b', 2, 'p'), card('b', 3, 'q'), retire('b', [1]), retire('b', [3]),
  ];
  const s = foldLedger(readLedger(lines).events);
  assert.deepEqual([...retiredCounts(s, 'b')], [['p', { count: 1 }], ['q', { count: 1 }]], 'drawn and retired in one run: no earlier version');
  const later = ledger(() => [person({ type: 'act', action: 'ack', n: 2, ver: 1 }), retire('b', [2], 'p')]);
  assert.deepEqual([...retiredCounts(later, 'b')], [], 'p went whole after its cards: no frame, no marker');
});

test('without past versions (the versionView flag off), a marker opens none', () => {
  assert.deepEqual([...retiredCounts(ledger(), 'b', false)], [['p', { count: 2 }]]);
});

test('the person\'s removal of several cards in one line (N24, a v16 line) counts like an agent\'s, each on its container', () => {
  const s = ledger(() => [
    card('b', 7, 'p'), card('b', 8, 'q'), // 18, 19: run 3
    line({ v: 16, by: 'person', type: 'retire', board: 'b', cards: [2, 7, 8] }), // 20
  ]);
  assert.deepEqual([...retiredCounts(s, 'b')], [['p', { count: 4, version: 19, until: 20 }], ['q', { count: 1, version: 19, until: 20 }]],
    'p: 3, 5, then 2 and 7; q: 8; each opens the last version before the removal');
  assert.deepEqual(s.runs.get('b')!.at(-1)!.seq, 19, 'the person\'s line is no version of its own');
});

// ---- the marker's past view (N42) ------------------------------------------------------------

const ask = (board: string, n: number, title = `Question ${n}?`, ver = 1) =>
  agent({ type: 'node', board, n, ver, node: { region: 'p', kind: 'question', title } });
const check = (n: number, ver = 1) => person({ type: 'act', action: 'ack', n, ver });
const cross = (n: number, ver = 1) => person({ type: 'act', action: 'drop', n, ver });

/** Board c: container p drawn at v1 (seq 7) with four cards that ask; then `after` lines. */
function asked(after: () => string[]) {
  seq = 0;
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
