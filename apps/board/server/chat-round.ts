// Where the board's answers a chat session's agent is handed start (panel-send ruling 1, api.md 121,
// 131): after the board's previous Send, when the agent was not told since. The round itself (the
// "The person updated the board:" message and the notes its lines carry) is the answers chip as the
// engine's `resolve` says it (`resolveChip`, over `roundOf`, board-message.ts), the one writer the page's composer preview reads too
// (composer-one-chip ruling 2). Pure: from the folded ledger.
import type { LedgerState } from '#actions';

/** The `seq` of the last Send on `board` before `before`, 0 when there is none. */
export function previousSend(s: LedgerState, board: string, before: number): number {
  const e = s.acts.findLast((x) => x.action === 'send' && x.seq < before && x.board === board);
  return e?.seq ?? 0;
}
