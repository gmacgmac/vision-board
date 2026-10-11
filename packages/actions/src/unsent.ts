// What the person's next Send carries on each board (conditions `board.unsent`, tracker N33), folded
// from their acts (fold.ts `applyEvent`): the lines since the board's last Send that the Send
// message is built from (pending.ts `replyScope` from that Send). A Send empties it; an answer
// (registry.ts `isAnswer`) adds its line; a note removed before it was sent takes the note's line
// out, and a change to a note is folded into the note, so neither counts on its own. Pure.
import type { ActEvent } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';
import { isAnswer } from './registry.ts';

/** Fold one person act on `board`. */
export function foldUnsent(s: LedgerState, board: string, e: ActEvent): void {
  const lines = s.unsent.get(board) ?? new Set<number>();
  s.unsent.set(board, lines);
  if (e.action === 'send') lines.clear();
  else if (e.action === 'note-remove') lines.delete(e.note!);
  else if (e.action !== 'note-edit' && isAnswer(e.action)) lines.add(e.seq);
}

/** The latest line the next Send on `board` carries; undefined when there is nothing new to send. */
export function unsentOn(s: LedgerState, board: string): number | undefined {
  const lines = s.unsent.get(board);
  return lines?.size ? Math.max(...lines) : undefined;
}
