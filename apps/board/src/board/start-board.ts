// Which board the page opens (page-polish ruling B): the board named in the URL's hash always
// wins; with none (or one that is not there), the board this viewer last looked at, kept in this
// browser under LAST_BOARD_KEY (shell/kept.ts, a per-viewer convenience) if it still exists; else
// the first board in the list, as before. Pure, so it is unit-tested under plain Node.

/** Where the board the viewer last looked at is kept (localStorage, the `vb.` family). */
export const LAST_BOARD_KEY = 'vb.lastBoard';

/** The board to open among `boards` (ids, in list order; not empty): the hash's, else the last
 *  looked at, else the first. */
export function startBoard(boards: readonly string[], hash: string, last: string | null): string {
  if (boards.includes(hash)) return hash;
  if (last !== null && boards.includes(last)) return last;
  return boards[0]!;
}
