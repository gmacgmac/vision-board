// A per-viewer convenience kept in this browser (localStorage, guarded): the chat sidebar's width
// and open state, the board last looked at (boards/start-board.ts). Storage can be refused (a private
// window's policy, a blocked site) or absent; then nothing is kept and the page behaves as on a first
// visit. The standalone page's own: the board keeps its own through `pageStore`, its host's store, per folder and
// ledger (M52, PLAN decision 4): `ledgerScope` is the one rule for what is kept per ledger (folder.ts `lastBoardKey` too).
import { ledgerFolder, MAIN_LEDGER } from '#format';
import type { BoardStore } from '../board/host.ts';
import type { FolderInfo } from './page-io.ts';

/** The value kept under `key`, or null when there is none or storage can't be read. */
export function kept(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

/** Keep `value` under `key`; does nothing when storage refuses it. */
export function keep(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage refused: not kept */ }
}

/** The open ledger's own place, for what the page keeps per ledger: a ledger other than `main` keys on its folder
 *  (`ledgerFolder`: the folder's path and the ledger's name); `main`, a folder in the old layout and no folder at all
 *  give '', so they keep the keys they had before ledgers and nothing a person set is lost. */
export const ledgerScope = (f: Pick<FolderInfo, 'path' | 'ledger'> | null | undefined): string =>
  (f?.ledger && f.ledger !== MAIN_LEDGER ? ledgerFolder(f.path, f.ledger) : '');

/** What the board keeps, in this browser, under the `vb.` family: a board's view for this tab only (sessionStorage,
 *  `vb.view.<board>`), the rest as above; under another ledger, each key ends `:<scope>` (`ledgerScope`), read when
 *  the board asks, so two ledgers' boards of the same id keep their own. */
export function pageStore(scope: () => string): BoardStore {
  const at = (key: string) => {
    const s = scope();
    return [key.startsWith('view.') ? sessionStorage : localStorage, `vb.${key}${s && `:${s}`}`] as const;
  };
  return {
    get(key) {
      try { const [area, k] = at(key); return area.getItem(k); } catch { return null; }
    },
    set(key, value) {
      try { const [area, k] = at(key); area.setItem(k, value); } catch { /* storage refused: not kept */ }
    },
  };
}
