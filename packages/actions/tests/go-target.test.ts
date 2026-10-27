// What a card number names on a board (goTarget; go-to-card, goToCard flag): a card drawn with it,
// nothing the board never gave, a card on the board but not drawn, or a retired card with the version
// where it last appeared. Board b's numbers differ from the ledger's identities throughout. The box
// that uses it is the page's own test (apps/board/tests/go-to-card.test.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger } from '#format';
import { boardData, foldLedger, goTarget } from '../src/index.ts';

const A = 'a-aaaa1111';
let seq = 0;
const line = (e: object) => JSON.stringify({ v: 12, seq: ++seq, at: `2026-10-15T10:${String(seq).padStart(2, '0')}:00Z`, ...e });
const agent = (e: object) => line({ by: 'agent', agent: A, ...e });
const region = (board: string) => agent({ type: 'region', board, region: { id: 'p', title: 'P', mode: 'grid' } });
const card = (board: string, n: number) => agent({ type: 'node', board, n, ver: 1, node: { region: 'p', kind: 'question', title: `Card ${n}` } });

/** Board a holds identity 1; board b identities 2, 3, 4 as its cards 1, 2, 3. Run 1 on b ends at seq
 *  9; the person's ✓ (10) ends it; the agent retires b's card 2 (11). */
function ledger() {
  seq = 0;
  const lines = [
    agent({ type: 'join', label: 'Pricing chat' }),
    agent({ type: 'board', board: 'a', title: 'A' }), region('a'), card('a', 1), // 4
    agent({ type: 'board', board: 'b', title: 'B' }), region('b'), card('b', 2), card('b', 3), card('b', 4), // 9
    line({ by: 'person', type: 'act', action: 'ack', n: 2, ver: 1 }), // 10
    agent({ type: 'retire', board: 'b', cards: [3] }), // 11
  ];
  const { events, problems } = readLedger(lines);
  assert.deepEqual(problems, []);
  return foldLedger(events);
}

const drawnOn = (s: ReturnType<typeof ledger>, board: string) => {
  const ids = new Set(boardData(s, board).view.nodes.map((n) => n.id));
  return (id: string) => ids.has(id);
};

test('a number finds the card drawn with it, nothing the board never gave, a retired card with its last version', () => {
  const s = ledger();
  const drawn = drawnOn(s, 'b');
  assert.deepEqual(goTarget(s, 'b', 1, drawn), { to: 'card', id: '1' });
  assert.deepEqual(goTarget(s, 'b', 3, drawn), { to: 'card', id: '3' });
  assert.deepEqual(goTarget(s, 'b', 9, drawn), { to: 'none' });
  assert.deepEqual(goTarget(s, 'b', 0, drawn), { to: 'none' });
  // b's card 2 (identity 3): the version before its retire (run 1, ending at 9), the answers to just before 11.
  assert.deepEqual(goTarget(s, 'b', 2, drawn), { to: 'retired', version: 9, until: 11 });
  // Without past versions (the versionView flag off) it is removed with nothing to open.
  assert.deepEqual(goTarget(s, 'b', 2, drawn, false), { to: 'retired' });
  // On the board but not drawn: hidden with the answered cards (H).
  assert.deepEqual(goTarget(s, 'b', 1, (id) => id !== '1'), { to: 'hidden' });
  // Another board has its own numbers.
  assert.deepEqual(goTarget(s, 'a', 2, drawnOn(s, 'a')), { to: 'none' });
});
