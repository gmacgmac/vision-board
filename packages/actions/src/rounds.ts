// A board's runs, and from where its cards are new, folded from the agent's drawing lines and the
// person's board seen (fold.ts `applyEvent`). A run is one agent's drawing lines with no other line
// on the board between them: one version of the board (reads.ts `boardVersions`). What the agent
// first draws after the person has opened the board is new to them (conditions `item.new`): after
// their first board seen on it, or, when the board had no card then, after the agent's first drawing
// with a card (FIX_01 ruling 7). A Send starts nothing: a card stays new until the person engages
// with it (new-and-updated Design 2). Pure.
import type { LedgerEvent } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';

/** Fold one agent drawing line on `board`; `before` is the board's last line before it. */
export function addDrawing(s: LedgerState, board: string, e: LedgerEvent, before: number | undefined): void {
  addRun(s, board, e, before);
  if (e.type === 'node' && !s.firstCards.has(board)) s.firstCards.set(board, { seq: e.seq, run: s.runs.get(board)!.length - 1 });
  if (e.type === 'node' && !s.firstDrawn.has(e.id)) s.firstDrawn.set(e.id, e.seq);
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
 * (`seenBoards`), and the first (`firstSeenBoards`), after which cards are new. */
export function seeBoard(s: LedgerState, board: string, head: number): void {
  s.seenBoards.set(board, Math.max(s.seenBoards.get(board) ?? 0, head));
  if (!s.firstSeenBoards.has(board)) s.firstSeenBoards.set(board, head);
}

/** The line after which a card first drawn on `board` is new: the later of the `head` of the
 * person's first board seen on it and the end of the agent's first drawing with a card (the run its
 * first card came in), which counts only when that card came after the board seen: a board opened
 * while empty shows none of its first drawing as new. None before the person first opens it. */
export function newFrom(s: LedgerState, board: string): number | undefined {
  const seen = s.firstSeenBoards.get(board);
  if (seen === undefined) return undefined;
  const first = s.firstCards.get(board);
  return first === undefined || first.seq <= seen ? seen : s.runs.get(board)![first.run]!.seq;
}

/** Whether line `seq` on `board` came after `newFrom`: never at or before the first board seen. */
export function drawnAfterOpening(s: LedgerState, board: string, seq: number): boolean {
  const from = newFrom(s, board);
  return from !== undefined && seq > from;
}
