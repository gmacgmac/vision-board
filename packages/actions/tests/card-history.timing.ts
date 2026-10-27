// The card history budget (card-polish BE_02): a card with 1,000 lines of its own builds its
// history under 50 ms (performance.md "One change shown", the nearest budget: the box opens on one
// press), from its own lines and from the whole performance ledger (`#format/testing` perfLedger,
// 1,000 cards) with them in it. A timing test: it runs alone (`npm run test:timing`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger } from '#format';
import { cardHistory } from '../src/index.ts';
import { perfLedger } from '#format/testing';

const BUDGET_MS = 50;
const CARD = 500;
const AGENT = 'a-tttt0000';
const LINES = 1000;

/** The performance ledger and then `LINES` lines on card `CARD`: notes, edits, replies, marks,
 * redraws, private marks and seen lines in turn. */
function ledger(): string[] {
  const lines = perfLedger();
  let seq = lines.length;
  const add = (e: object) => lines.push(JSON.stringify({ v: 18, seq: ++seq, at: new Date(Date.UTC(2026, 9, 19, 9, 0, seq)).toISOString(), ...e }));
  add({ type: 'join', by: 'agent', agent: AGENT, label: 'Timing chat' });
  let ver = 1;
  let note = 0;
  for (let i = 0; i < LINES; i++) {
    const person = (e: object) => add({ type: 'act', by: 'person', ...e });
    switch (i % 8) {
      case 0: person({ action: 'comment', n: CARD, ver, text: `Invented note ${i}` }); note = seq; break;
      case 1: person({ action: 'note-edit', n: CARD, note, text: `Invented note ${i}, edited` }); break;
      case 2: add({ type: 'reply', by: 'agent', agent: AGENT, n: CARD, to: note, text: `Invented reply ${i}` }); break;
      case 3: add({ type: 'node', by: 'agent', agent: AGENT, board: 'big', n: CARD, ver: ++ver, node: { region: 'r10', kind: 'question', title: `Card ${i}` } }); break;
      case 4: person({ action: i % 16 === 4 ? 'ack' : 'drop', n: CARD, ver }); break;
      case 5: person({ action: i % 16 === 5 ? 'flag' : 'unflag', n: CARD }); break;
      case 6: add({ type: 'seen', by: 'person', n: CARD, ver }); break;
      default: person({ action: 'reopen', n: CARD, ver });
    }
  }
  return lines;
}

const read = readLedger(ledger());
const own = read.events.filter((e) => 'id' in e && e.id === CARD);

/** The best of a few runs, so one slow tick of the machine is not read as the model's cost. */
function time(run: () => void): number {
  run();
  let best = Infinity;
  for (let i = 0; i < 5; i++) {
    const t = performance.now();
    run();
    best = Math.min(best, performance.now() - t);
  }
  return best;
}

test('the fixture reads clean and the card has over 1,000 lines', () => {
  assert.deepEqual(read.problems, []);
  assert.ok(own.length > LINES, `${own.length} lines`);
});

for (const [name, lines] of [['its own lines', own], ['the whole ledger', read.events]] as const) {
  test(`cardHistory from ${name} (${lines.length} lines) stays under ${BUDGET_MS} ms`, () => {
    const ms = time(() => cardHistory(lines, CARD));
    console.log(`[BE_02] cardHistory, ${name}: ${ms.toFixed(2)} ms`);
    assert.ok(ms < BUDGET_MS, `${ms.toFixed(2)} ms`);
  });
}
