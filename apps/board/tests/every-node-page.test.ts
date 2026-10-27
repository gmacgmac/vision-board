// Every node is part of the conversation, the page's side (every-node FE_01): "Hide answered" keeps an
// answered card while the agent still owes it an answer (orchestrator ruling), and the everyNode flag
// off keeps numbers, and so buttons, on cards that need an answer only. Pure: a small folded ledger.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LedgerEvent } from '#format';
import { answeredIds, applyEvent, boardData, foldLedger, pageConditions } from '#actions';
import { numberedView } from '../src/board/board-data.ts';

const at = '2026-10-10T09:00:00Z';
const agent = { by: 'agent', agent: 'a-pricing1' } as const;
let seq = 0;
const line = (f: object): LedgerEvent => ({ v: 11, seq: (seq += 1), at, ...f }) as LedgerEvent;
const card = (n: number, kind: string) => line({ ...agent, type: 'node', board: 'b', id: n, ver: 1, node: { region: 'r', kind, title: `Card ${n}` } });
const act = (n: number, action: string, text?: string) => line({ by: 'person', type: 'act', action, id: n, ver: 1, ...(text && { text }) });

/** Question 1 commented, question 2 checked, finding 3 commented, topic 4 untouched, question 5
 * checked and then questioned (card 20's sequence on the board that led to D-045). */
function ledger() {
  seq = 0;
  const lines = [
    line({ ...agent, type: 'board', board: 'b', title: 'Pricing' }),
    line({ ...agent, type: 'region', board: 'b', region: { id: 'r', title: 'Thread', mode: 'grid' } }),
    card(1, 'question'), card(2, 'question'), card(3, 'finding'), card(4, 'topic'), card(5, 'question'),
    act(1, 'comment', 'Only for annual plans.'), act(2, 'ack'), act(3, 'comment', 'Which renewals?'),
    act(5, 'ack'), act(5, 'comment', 'Does this cover renewals?'),
  ];
  return { s: foldLedger(lines), comment: lines[7]!.seq, asked: lines[11]!.seq };
}

// D-045: a note never answers a card, and the agent's answer to it clears the card's earlier ✓.
test('Hide answered: only ✓ or ✗ answers; a card stays while its note is owed; the agent\'s answer clears it', () => {
  const { s, comment, asked } = ledger();
  const owed = pageConditions(s, 'b').owedCards;
  assert.deepEqual([...owed].sort(), [1, 3, 5], 'a note on any card is owed an answer, after a ✓ too');
  assert.deepEqual([...answeredIds(boardData(s, 'b'), owed)], ['2'], 'a note never answers; the questioned ✓ waits for its reply');
  applyEvent(s, line({ ...agent, type: 'reply', id: 1, text: 'Annual only, then.', to: comment }));
  applyEvent(s, line({ ...agent, type: 'reply', id: 5, text: 'Yes, renewals too. ✓ again if that still holds.', to: asked }));
  const after = pageConditions(s, 'b').owedCards;
  assert.deepEqual([...after], [3]);
  assert.deepEqual([...answeredIds(boardData(s, 'b'), after)], ['2'], 'answered by the agent, 1 is still open and 5 is open again');
  assert.deepEqual([...pageConditions(s, 'b').unseen].filter((n) => n === 1 || n === 5), [1, 5], 'both show as updated until looked at');
});

test('everyNode on: every card keeps its number; off: only cards that need an answer do', () => {
  const { view } = boardData(ledger().s, 'b');
  assert.deepEqual(numberedView(view, true), view);
  assert.deepEqual(numberedView(view, false).nodes.map((n) => [n.kind, n.n]),
    [['question', 1], ['question', 2], ['finding', undefined], ['topic', undefined], ['question', 5]]);
  assert.deepEqual(numberedView(view, false).nodes.map((n) => n.id), ['1', '2', '3', '4', '5'], 'ids stay');
});
