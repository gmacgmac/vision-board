// A per-viewer convenience kept in this browser (localStorage, guarded): the chat sidebar's width
// and open state, the board last looked at (boards/start-board.ts). Storage can be refused (a private
// window's policy, a blocked site) or absent; then nothing is kept and the page behaves as on a first
// visit. The standalone page's own: the board keeps its own through `pageStore`, its host's store, per folder and
// ledger, `main` too (M52, PLAN decisions 4 and 11): `ledgerScope` is the one rule for what is kept per folder and
// ledger (folder.ts `lastBoardKey` too).
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

/** The open folder and ledger's own place, for what the page keeps per ledger: the folder's path for its `main` and
 *  for its old layout (the same data, before and after the move into `main/`), the ledger's folder (`ledgerFolder`)
 *  for any other; '' while no folder is read. */
export const ledgerScope = (f: Pick<FolderInfo, 'path' | 'ledger'> | null | undefined): string =>
  (!f ? '' : f.ledger && f.ledger !== MAIN_LEDGER ? ledgerFolder(f.path, f.ledger) : f.path);

/** What the board keeps, in this browser, under the `vb.` family: a board's view for this tab only (sessionStorage,
 *  `vb.view.<board>`), the rest as above, each key ending `:<scope>` (`ledgerScope` of the folder open, read when the
 *  board asks), so two ledgers' or two folders' boards of the same id keep their own. A key from before (no scope) is
 *  read once, as the fallback for `main` of the folder open, and kept under that folder's key from then on, so nothing
 *  a person set is lost; any write there retires it. With no folder read, the keys from before. */
export function pageStore(folder: () => Pick<FolderInfo, 'path' | 'ledger'> | null | undefined): BoardStore {
  const at = (key: string) => {
    const f = folder();
    const scope = ledgerScope(f);
    const old = `vb.${key}`;
    /** `main` of the folder open (or its old layout): the one place a key from before belongs. */
    const main = !!scope && (!f?.ledger || f.ledger === MAIN_LEDGER);
    return { area: key.startsWith('view.') ? sessionStorage : localStorage, key: scope ? `${old}:${scope}` : old, old: main ? old : null };
  };
  return {
    get(name) {
      try {
        const { area, key, old } = at(name);
        const value = area.getItem(key);
        if (value !== null || old === null) return value;
        const before = area.getItem(old);
        if (before !== null) { area.setItem(key, before); area.removeItem(old); }
        return before;
      } catch { return null; }
    },
    set(name, value) {
      try {
        const { area, key, old } = at(name);
        area.setItem(key, value);
        if (old !== null) area.removeItem(old);
      } catch { /* storage refused: not kept */ }
    },
  };
}
