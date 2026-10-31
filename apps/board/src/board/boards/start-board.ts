// Which board the page opens (page-polish ruling B): the board named in the URL's hash always
// wins; with none (or one that is not there), the board this viewer last looked at, kept in this
// browser under LAST_BOARD_KEY (the standalone page's shell/kept.ts, a per-viewer convenience) if it still exists; else
// the first board in the list, as before. An archived board is never opened by default (N39 ruling
// 4): one the hash or the memory names gives way to the next board after it (`nextBoard`), as
// archiving the open board does. Pure, so it is unit-tested under plain Node.

/** Where the board the viewer last looked at is kept (localStorage, the `vb.` family). */
export const LAST_BOARD_KEY = 'vb.lastBoard';

/** The board to open in place of `gone` (archived): the first after it in `order` (every board, in
 *  the order drawn) that is among `boards` (the boards the picker shows), else the nearest before
 *  it; undefined when none is left. */
export function nextBoard(order: readonly string[], gone: string, boards: readonly string[]): string | undefined {
  const at = order.indexOf(gone);
  const after = order.slice(at + 1).find((id) => boards.includes(id));
  return after ?? order.slice(0, Math.max(at, 0)).reverse().find((id) => boards.includes(id));
}

/** The board to open among `boards` (ids, in list order; not empty): the hash's, else the last
 *  looked at, else the first. `order` is every board, archived ones too: a hash or a last board
 *  that is archived opens the next board after it. */
export function startBoard(boards: readonly string[], hash: string, last: string | null, order: readonly string[] = boards): string {
  for (const want of [hash, last]) {
    if (!want) continue;
    if (boards.includes(want)) return want;
    if (order.includes(want)) return nextBoard(order, want, boards) ?? boards[0]!;
  }
  return boards[0]!;
}
