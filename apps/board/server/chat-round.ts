// The message the board's Send hands a chat session's agent (panel-send ruling 1, api.md 121): "The
// person updated the board:", then the numbered reply of what was answered after `since`
// (packages/actions `replyScope` + `replyText`, so there is one writer of that text), then the
// `head` it covers, so the agent does not read the same answers again. Pure: from the folded ledger.
import type { LedgerState } from '../../../packages/actions/src/index.ts';
import { boardState, replyScope, replyText } from '../../../packages/actions/src/index.ts';
import { boardView } from '../../../packages/format/src/index.ts';

export const ROUND_HEAD = 'The person updated the board:';

/** The `seq` of the last Send on `board` before `before`, 0 when there is none. */
export function previousSend(s: LedgerState, board: string, before: number): number {
  const e = s.acts.findLast((x) => x.action === 'send' && x.seq < before && x.board === board);
  return e?.seq ?? 0;
}

/** The round on `board` after `since`, as `agent` reads it, up to the ledger's latest line. */
export function roundText(s: LedgerState, board: string, since: number, agent?: string): string {
  const reply = replyText(boardView(s, board), boardState(s, board), replyScope(s, board, since, agent));
  const head = `These are the person's answers up to head ${s.seq}. To read anything newer, call check_responses on board "${board}" with after ${s.seq}.`;
  return [ROUND_HEAD, reply, head].join('\n');
}
