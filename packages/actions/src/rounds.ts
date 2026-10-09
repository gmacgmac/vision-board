// A board's runs and rounds, folded from the agent's drawing lines and the person's board seen
// (fold.ts `applyEvent`). A run is one agent's drawing lines with no other line on the board
// between them: one version of the board (reads.ts `boardVersions`). What the agent first draws
// after the person has opened the board is new to them (conditions `item.new`): after their first
// board seen on it, or, when the board had no card then, after the agent's first drawing with a
// card (FIX_01 ruling 7); and once a Send was answered, from the first drawing line after that
// Send (a round). Pure.
import type { LedgerEvent } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';

/** Fold one agent drawing line on `board`; `before` is the board's last line before it. */
export function addDrawing(s: LedgerState, board: string, e: LedgerEvent, before: number | undefined): void {
  addRun(s, board, e, before);
  if (e.type === 'node' && !s.firstCards.has(board)) s.firstCards.set(board, { seq: e.seq, run: s.runs.get(board)!.length - 1 });
  // Until the board has a card, everything drawn is its first drawing: no Send starts a round.
  const start = roundStart(s, board);
  if (start !== undefined && s.firstCards.has(board) && (s.lastSend.get(board) ?? 0) > start) s.rounds.set(board, e.seq);
  if (e.type === 'node' && !s.firstDrawn.has(e.n)) s.firstDrawn.set(e.n, e.seq);
}

/** A drawing line extends the board's last run when it follows that run's end on the board and
 * comes from the same agent; else it starts a new run. */
function addRun(s: LedgerState, board: string, e: LedgerEvent, before: number | undefined): void {
  const runs = s.runs.get(board) ?? [];
  s.runs.set(board, runs);
  const last = runs.at(-1);
  if (last && last.seq === before && last.agent === e.agent) runs.pop();
  runs.push({ seq: e.seq, at: e.at, ...(e.agent !== undefined && { agent: e.agent }) });
}

/** The person's board seen on `board` up to `head` (api.md 87): the highest is kept
 * (`seenBoards`), and the first (`firstSeenBoards`), from which cards are new before any Send. */
export function seeBoard(s: LedgerState, board: string, head: number): void {
  s.seenBoards.set(board, Math.max(s.seenBoards.get(board) ?? 0, head));
  if (!s.firstSeenBoards.has(board)) s.firstSeenBoards.set(board, head);
}

/** Where `board`'s latest round starts: the `seq` of the first agent drawing line after a Send
 * that came after the previous round's start; before any such line, the later of the `head` of the
 * person's first board seen on it and the end of the agent's first drawing with a card (the run
 * its first card came in), which counts only when that card came after the board seen: a board
 * opened while empty shows none of its first drawing as new. None before the person first opens it. */
export function roundStart(s: LedgerState, board: string): number | undefined {
  const round = s.rounds.get(board);
  const seen = s.firstSeenBoards.get(board);
  if (round !== undefined || seen === undefined) return round ?? seen;
  const first = s.firstCards.get(board);
  return first === undefined || first.seq <= seen ? seen : s.runs.get(board)![first.run]!.seq;
}

/** Whether line `seq` on `board` is in its latest round: after its start, or at it when a Send
 * began the round (that line is the round's own); never at or before the first board seen. */
export function inLatestRound(s: LedgerState, board: string, seq: number): boolean {
  const start = roundStart(s, board);
  return start !== undefined && (seq > start || seq === s.rounds.get(board));
}
