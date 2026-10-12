// What the person's next Send carries on each board (conditions `board.unsent`, tracker N33), folded
// from their acts (fold.ts `applyEvent`): the lines since the board's last Send that the Send
// message is built from (pending.ts `replyScope` from that Send). A Send empties it; an answer
// (registry.ts `isAnswer`) adds its line; a note removed before it was sent takes the note's line
// out, and a change to a note is folded into the note, so neither counts on its own; an answer on
// cards that have all left the board (a retire, the agent's or the person's) is no longer there to
// send. Pure.
import type { ActEvent, RetireEvent } from '../../format/src/index.ts';
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

/** The person act at `seq`, from `acts` (in `seq` order). */
function actAt(acts: readonly ActEvent[], seq: number): ActEvent | undefined {
  let lo = 0;
  let hi = acts.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const at = acts[mid]!.seq;
    if (at === seq) return acts[mid];
    if (at < seq) lo = mid + 1;
    else hi = mid - 1;
  }
  return undefined;
}

/** After retire `e` (its cards already retired in the index): the answers on `e.board` waiting for a
 * Send whose cards have all left the board, or whose container did, are no longer something to send
 * (N24: nothing on a removed card is owed, and the Send message reads the board as it is now). */
export function dropRetired(s: LedgerState, e: RetireEvent): void {
  const lines = s.unsent.get(e.board);
  if (!lines?.size) return;
  for (const seq of lines) {
    const a = actAt(s.acts, seq);
    const cards = a?.nodes ?? (a?.id === undefined ? [] : [a.id]);
    const gone = cards.length > 0 ? cards.every((id) => s.index.retired.has(id)) : a?.region !== undefined && a.region === e.region;
    if (gone) lines.delete(seq);
  }
}
