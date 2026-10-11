// The board's answers a chat session's agent is handed (panel-send ruling 1, api.md 121, 131): "The
// person updated the board:", then the numbered reply of what was answered after `since`
// (packages/actions `replyScope` + `replyText`, so there is one writer of that text), then the
// `head` it covers, so the agent does not read the same answers again. The person's message carries
// it after their words and chips (chat-prompt.ts `promptFor`), and the board's Send with no words is
// that message (chat-board-context ruling 4). Pure: from the folded ledger.
import type { LedgerState } from '../../../packages/actions/src/index.ts';
import { boardState, replyScope, replyText } from '../../../packages/actions/src/index.ts';
import { boardView } from '../../../packages/format/src/index.ts';

export const ROUND_HEAD = 'The person updated the board:';

/** The `seq` of the last Send on `board` before `before`, 0 when there is none. */
export function previousSend(s: LedgerState, board: string, before: number): number {
  const e = s.acts.findLast((x) => x.action === 'send' && x.seq < before && x.board === board);
  return e?.seq ?? 0;
}

/** The round on `board` after `since`, as `agent` reads it, up to the ledger's latest line;
 * undefined when the person answered nothing there since that `agent` may read. */
export function roundText(s: LedgerState, board: string, since: number, agent?: string): string | undefined {
  const scope = replyScope(s, board, since, agent);
  if (scope.cards.size === 0 && scope.regions.size === 0) return undefined;
  const reply = replyText(boardView(s, board), boardState(s, board), scope);
  const head = `These are the person's answers up to head ${s.seq}. To read anything newer, call check_responses on board "${board}" with after ${s.seq}.`;
  return [ROUND_HEAD, reply, head].join('\n');
}
