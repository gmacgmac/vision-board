// The "N cards retired" markers (retiredMarker flag, field report batch 2 ruling 1, api.md 126): the
// cards retired one at a time, counted on the container each was in when it went; the board version
// a press opens (the last one before the latest such retire); none for a container retired whole, or
// retired after; retired cards and containers gone from the board the page draws. Board b's numbers
// differ from the ledger's identities throughout.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger } from '../../../packages/format/src/index.ts';
import { foldLedger } from '../../../packages/actions/src/index.ts';
import { boardData } from '../src/board/board-data.ts';
import { retiredCounts } from '../src/board/retired.ts';

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
  assert.deepEqual([...retiredCounts(s, 'b')], [['p', { count: 2, version: 12 }]], '3 drawn in p, 5 moved into p; z went whole');
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
