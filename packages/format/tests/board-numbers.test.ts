// Ledger v12 (api.md 125-130, D-041 proposed): each board numbers its cards from 1 in the order
// drawn; the project-wide ledger number is the card's identity (`id` in code, `n` in the file);
// `retire` takes cards and whole containers off a board for good; `list` reads as `column`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  boardNumber, boardView, cardId, everyNodeOf, foldDrawn, fromLine, nodesOf, readLedger, toLine, validateView,
} from '../src/index.ts';

const A = 'a-abcd1234';
const at = '2026-10-11T09:00:00Z';
let seq = 0;
const agent = (e: object, v = 12) => ({ v, seq: ++seq, at, by: 'agent', agent: A, ...e });
const person = (e: object, v = 12) => ({ v, seq: ++seq, at, by: 'person', type: 'act', ...e });
const node = (board: string, n: number, region: string, title: string, ver = 1) =>
  agent({ type: 'node', board, n, ver, node: { region, kind: 'question', title } });
const read = (lines: object[]) => readLedger(lines.map((e) => JSON.stringify(e)));

/** Two boards drawn in turns: ledger numbers 1, 3 on "a" and 2, 4, 5 on "b". */
function twoBoards() {
  seq = 0;
  return [
    agent({ type: 'join', label: 'Chat' }),
    agent({ type: 'board', board: 'a', title: 'A' }),
    agent({ type: 'board', board: 'b', title: 'B' }),
    agent({ type: 'region', board: 'a', region: { id: 'r', title: 'R', mode: 'grid' } }),
    agent({ type: 'region', board: 'b', region: { id: 's', title: 'S', mode: 'radial', center: 4 } }),
    agent({ type: 'region', board: 'b', region: { id: 't', title: 'T', mode: 'column' } }),
    node('a', 1, 'r', 'A one'), node('b', 2, 's', 'B one'), node('a', 3, 'r', 'A two'),
    node('b', 4, 's', 'B two'), node('b', 5, 't', 'B three'),
    agent({ type: 'link', from: 4, to: 5, label: 'leads to' }),
  ];
}

test('the file names a card n; in code it is id, and toLine gives the line back', () => {
  const lines = twoBoards();
  const { events, problems } = read(lines);
  assert.deepEqual(problems, []);
  const first = events.find((e) => e.type === 'node')!;
  assert.equal('n' in first, false);
  assert.equal(first.type === 'node' && first.id, 1);
  for (const [i, e] of events.entries()) assert.deepEqual(toLine(e), lines[i], `line ${i + 1}`);
  const act = fromLine({ ...person({ action: 'ack', n: 4, ver: 1 }) });
  assert.equal(act.type === 'act' && act.id, 4);
});

test('older lines read the same way: n is the card, list reads as column', () => {
  seq = 0;
  const old = [
    agent({ type: 'board', board: 'a', title: 'A' }, 11),
    agent({ type: 'region', board: 'a', region: { id: 'r', title: 'R', mode: 'list' } }, 11),
    person({ action: 'mode', board: 'a', region: 'r', mode: 'list' }, 11),
  ];
  const { events, problems } = read(old);
  assert.deepEqual(problems, []);
  assert.equal(events[1]!.type === 'region' && events[1]!.region.mode, 'column');
  assert.equal(events[2]!.type === 'act' && events[2]!.mode, 'column');
});

test('each board numbers its cards from 1 in the order drawn', () => {
  const { index } = read(twoBoards());
  assert.deepEqual([1, 3].map((id) => boardNumber(index, id)), [1, 2]);
  assert.deepEqual([2, 4, 5].map((id) => boardNumber(index, id)), [1, 2, 3]);
  assert.equal(cardId(index, 'b', 3), 5);
  assert.equal(cardId(index, 'a', 3), undefined);
  assert.equal(cardId(index, 'zz', 1), undefined);
});

test('the View speaks board numbers: node ids, n, links and the centre', () => {
  const { events } = read(twoBoards());
  const view = boardView(foldDrawn(events), 'b');
  assert.deepEqual(validateView(view), []);
  assert.deepEqual(view.nodes.map((x) => [x.id, x.n, x.title]), [['1', 1, 'B one'], ['2', 2, 'B two'], ['3', 3, 'B three']]);
  assert.deepEqual(view.links, [{ from: '2', to: '3', label: 'leads to' }]);
  assert.equal(view.regions[0]!.center, '2');
  assert.deepEqual(boardView(foldDrawn(events), 'a').nodes.map((x) => x.id), ['1', '2']);
});

test('a retired card leaves the board, keeps its history, and its number is never reused', () => {
  const lines = [...twoBoards(), agent({ type: 'retire', board: 'b', cards: [5] }), node('b', 6, 't', 'B four')];
  const { events, problems, index } = read(lines);
  assert.deepEqual(problems, []);
  const s = foldDrawn(events);
  const view = boardView(s, 'b');
  assert.deepEqual(view.nodes.map((x) => [x.id, x.title]), [['1', 'B one'], ['2', 'B two'], ['4', 'B four']]);
  assert.deepEqual(view.links, []);
  assert.deepEqual(nodesOf(s, 'b').map((x) => x.id), [2, 4, 6]);
  assert.deepEqual(everyNodeOf(s, 'b').map((x) => [x.id, x.retired]), [[2, undefined], [4, undefined], [5, 13], [6, undefined]]);
  assert.equal('n' in everyNodeOf(s, 'b')[0]!, false, 'a folded card carries its identity only');
  assert.equal(boardNumber(index, 6), 4);
  // The board as it was before the retire still shows it (board version history).
  assert.equal(boardView(foldDrawn(events.slice(0, 12)), 'b').nodes.length, 3);
});

test('a retired container leaves the board with every card in it', () => {
  const lines = [...twoBoards(), agent({ type: 'retire', board: 'b', region: 's', cards: [2, 4] })];
  const { events, problems } = read(lines);
  assert.deepEqual(problems, []);
  const view = boardView(foldDrawn(events), 'b');
  assert.deepEqual(view.regions.map((r) => r.id), ['t']);
  assert.deepEqual(view.nodes.map((x) => x.id), ['3']);
});

test('nothing more is written on a retired card or container', () => {
  const base = [...twoBoards(), agent({ type: 'retire', board: 'b', cards: [5] }), agent({ type: 'retire', board: 'b', region: 's', cards: [2, 4] })];
  const after = [
    node('b', 5, 't', 'Again', 2),
    agent({ type: 'link', from: 3, to: 5 }),
    agent({ type: 'reply', n: 5, text: 'Ok.' }),
    person({ action: 'flag', n: 5 }),
    agent({ type: 'retire', board: 'b', cards: [5] }),
    agent({ type: 'region', board: 'b', region: { id: 's', title: 'S again', mode: 'grid' } }),
    node('b', 6, 's', 'Into a retired container'),
    agent({ type: 'retire', board: 'b', cards: [1] }),
  ];
  assert.deepEqual(read([...base, ...after]).problems, [
    'line 15: n: card 5 is retired; draw a new card instead',
    'line 16: to: card 5 is retired',
    'line 17: n: card 5 is retired',
    'line 18: n: card 5 is retired',
    'line 19: cards: card 5 is already retired',
    'line 20: region.id: container "s" was retired; pick another id',
    'line 21: node.region: container "s" was retired',
    'line 22: cards: card 1 is on board "a", not "b"',
  ]);
});

test('a retire names its board\'s cards and containers; the built-in Later is no container to retire', () => {
  const lines = [...twoBoards(),
    agent({ type: 'retire', board: 'b', region: 'later', cards: [] }),
    agent({ type: 'retire', board: 'b', region: 'nope', cards: [] }),
    agent({ type: 'retire', board: 'b', cards: [99] }),
    agent({ type: 'retire', board: 'zz', cards: [2] }),
    agent({ type: 'retire', board: 'b', region: 't', cards: [] })];
  assert.deepEqual(read(lines).problems, [
    'line 13: region: "later" is the board\'s built-in Later, not a container to retire',
    'line 14: region: unknown "nope" on board "b"',
    'line 15: cards: unknown node 99',
    'line 16: board: unknown "zz"',
  ]);
});

test('the flag is the person\'s mark on one card, kept by identity', () => {
  const lines = [...twoBoards(), person({ action: 'flag', n: 4 }), person({ action: 'unflag', n: 4 })];
  assert.deepEqual(read(lines).problems, []);
});
