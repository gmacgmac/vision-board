// Ask now (D-099 3, api.md 188): the person sent one node's note to the agent at once, apart from the board's Send.
// The `ask` act names the notes it carried (`lines`) and what the agent was given with them (`context`). It is not a
// Send: `lastSend` and `sentHead` do not move, and the board's other answers still wait. Each board keeps its asked
// lines, which the rest consult: an asked note is not unsent and the next Send does not carry it (unsent.ts,
// pending.ts `replyScope`), it locks as a sent one (note-lock.ts), and the one-unsent-note rule counts it as sent
// (act.ts, through `lockOf`). Pure.
import type { ActEvent, AskContext } from '#format';
import type { LedgerState } from './fold.ts';

/** An asked note: the `seq` of the `ask` that carried it, and what the agent was given with it. */
export interface Asked { seq: number; context: AskContext }

/** Fold one `ask`: each line it carried is asked. */
export function foldAsk(s: LedgerState, e: ActEvent): void {
  const lines = s.asked.get(e.board!) ?? new Map<number, Asked>();
  s.asked.set(e.board!, lines);
  for (const seq of e.lines!) lines.set(seq, { seq: e.seq, context: e.context! });
}

/** The ask that carried note `seq` on `board`, or undefined when none did. */
export const askedBy = (s: LedgerState, board: string, seq: number): Asked | undefined => s.asked.get(board)?.get(seq);
