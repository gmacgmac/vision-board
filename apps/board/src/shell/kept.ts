// A per-viewer convenience kept in this browser (localStorage, guarded): the chat sidebar's width
// and open state, the board last looked at (boards/start-board.ts). Storage can be refused (a private
// window's policy, a blocked site) or absent; then nothing is kept and the page behaves as on a first
// visit. The standalone page's own: the board keeps its own through `pageStore`, its host's store.
import type { BoardStore } from '../board/host.ts';

/** The value kept under `key`, or null when there is none or storage can't be read. */
export function kept(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

/** Keep `value` under `key`; does nothing when storage refuses it. */
export function keep(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage refused: not kept */ }
}

/** What the board keeps, in this browser, under the `vb.` family: a board's view for this tab only (sessionStorage, `vb.view.<board>`), the rest as above. */
export const pageStore: BoardStore = {
  get(key) {
    try { return (key.startsWith('view.') ? sessionStorage : localStorage).getItem(`vb.${key}`); } catch { return null; }
  },
  set(key, value) {
    try { (key.startsWith('view.') ? sessionStorage : localStorage).setItem(`vb.${key}`, value); } catch { /* storage refused: not kept */ }
  },
};
