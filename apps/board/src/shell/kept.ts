// A per-viewer convenience kept in this browser (localStorage, guarded): the chat sidebar's width
// and open state, the proposals notice hidden or shown, the board last looked at
// (board/start-board.ts). Storage can be refused (a private window's policy, a blocked site) or
// absent; then nothing is kept and the page behaves as on a first visit.

/** The value kept under `key`, or null when there is none or storage can't be read. */
export function kept(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

/** Keep `value` under `key`; does nothing when storage refuses it. */
export function keep(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage refused: not kept */ }
}
