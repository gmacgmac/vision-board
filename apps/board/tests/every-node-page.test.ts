// Every node is part of the conversation, the page's side (every-node FE_01): "Hide decided" keeps a
// decided card while the agent still owes it an answer (orchestrator ruling), and the everyNode flag
// off keeps numbers, and so buttons, on cards that need an answer only. Pure: a small folded ledger.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LedgerEvent } from '../../../packages/format/src/index.ts';
import { applyEvent, foldLedger } from '../../../packages/actions/src/index.ts';
import { boardData, decidedIds, numberedView, pageConditions } from '../src/board/board-data.ts';

const at = '2026-10-10T09:00:00Z';
const agent = { by: 'agent', agent: 'a-pricing1' } as const;
let seq = 0;
const line = (f: object): LedgerEvent => ({ v: 11, seq: (seq += 1), at, ...f }) as LedgerEvent;
const card = (n: number, kind: string) => line({ ...agent, type: 'node', board: 'b', id: n, ver: 1, node: { region: 'r', kind, title: `Card ${n}` } });
const act = (n: number, action: string, text?: string) => line({ by: 'person', type: 'act', action, id: n, ver: 1, ...(text && { text }) });

/** Question 1 commented, question 2 acknowledged, finding 3 commented, topic 4 untouched. */
function ledger() {
  seq = 0;
  const lines = [
    line({ ...agent, type: 'board', board: 'b', title: 'Pricing' }),
    line({ ...agent, type: 'region', board: 'b', region: { id: 'r', title: 'Thread', mode: 'grid' } }),
    card(1, 'question'), card(2, 'question'), card(3, 'finding'), card(4, 'topic'),
    act(1, 'comment', 'Only for annual plans.'), act(2, 'ack'), act(3, 'comment', 'Which renewals?'),
  ];
  return { s: foldLedger(lines), comment: lines[6]!.seq };
}

test('Hide decided: a decided card stays while its answer is owed, and hides once nothing is owed', () => {
  const { s, comment } = ledger();
  const owed = pageConditions(s, 'b').owedCards;
  assert.deepEqual([...owed].sort(), [1, 3], 'a comment on any card is owed an answer');
  assert.deepEqual([...decidedIds(boardData(s, 'b'), owed)], ['2'], 'the commented question waits for its reply; a plain card is never decided');
  applyEvent(s, line({ ...agent, type: 'reply', id: 1, text: 'Annual only, then.', to: comment }));
  const after = pageConditions(s, 'b').owedCards;
  assert.deepEqual([...after], [3]);
  assert.deepEqual([...decidedIds(boardData(s, 'b'), after)].sort(), ['1', '2'], 'answered, it hides');
});

test('everyNode on: every card keeps its number; off: only cards that need an answer do', () => {
  const { view } = boardData(ledger().s, 'b');
  assert.deepEqual(numberedView(view, true), view);
  assert.deepEqual(numberedView(view, false).nodes.map((n) => [n.kind, n.n]),
    [['question', 1], ['question', 2], ['finding', undefined], ['topic', undefined]]);
  assert.deepEqual(numberedView(view, false).nodes.map((n) => n.id), ['1', '2', '3', '4'], 'ids stay');
});
