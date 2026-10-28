// The person's selection on the board (3_FE_01 ruling 8). It is view state, not a ledger event:
// nothing is decided by selecting. One small API, so the lasso and the selection bar (3_FE_02)
// call the same thing a click and Space call: `selected()`, `select(ids, mode)`, `clear()`, and a
// change event that names only the ids whose state changed (ruling 10: the page updates only those
// cards) and the words the live region announces (ruling 9). `keep` drops ids that left the board,
// so the selection survives a redraw. No DOM: it is unit-tested under plain Node.

import type { SelectedBy } from '#actions';
import * as cardsWords from '../words/cards.ts';

/** `only`: these alone. `add`, `remove`: one way. `toggle`: each id flips. */
export type SelectMode = 'only' | 'add' | 'remove' | 'toggle';

/** How the selection came about: `select`, the person's own (a click, Space, a lasso), or `find`, going
 *  to a card to look for it (find/go-to-card.ts). Finding is no engagement, so it marks nothing seen
 *  (ruling 322; its one home is `SelectedBy` in packages/actions' conditions.ts). */
export type SelectBy = SelectedBy;

export interface SelectionChange {
  /** The ids whose selected state changed. */
  changed: string[];
  /** How this change came about. */
  by: SelectBy;
  /** How many are selected now. */
  count: number;
  /** What the live region says: "3 cards selected", "Selection cleared". */
  text: string;
}

export interface Selection {
  /** The selected ids, in the order they were selected. */
  selected(): string[];
  has(id: string): boolean;
  select(ids: readonly string[], mode: SelectMode, by?: SelectBy): void;
  clear(): void;
  /** Keep only ids still on the board (`live`), after a redraw. */
  keep(live: Iterable<string>): void;
  /** Listen for changes; returns the function that stops listening. */
  onChange(listener: (c: SelectionChange) => void): () => void;
}

export const selectionText = (count: number): string =>
  count === 0 ? cardsWords.selectionCleared : cardsWords.cardSelected(count);

export function createSelection(): Selection {
  const ids = new Set<string>();
  const listeners = new Set<(c: SelectionChange) => void>();

  /** Make `next` the selection and tell the listeners what changed, if anything did. */
  function become(next: Set<string>, by: SelectBy = 'select') {
    const changed = [...ids].filter((id) => !next.has(id));
    for (const id of next) if (!ids.has(id)) changed.push(id);
    if (!changed.length) return;
    ids.clear();
    for (const id of next) ids.add(id);
    const c: SelectionChange = { changed, by, count: ids.size, text: selectionText(ids.size) };
    for (const l of listeners) l(c);
  }

  return {
    selected: () => [...ids],
    has: (id) => ids.has(id),
    select(list, mode, by) {
      if (mode === 'only') return become(new Set(list), by);
      const next = new Set(ids);
      for (const id of list) {
        if (mode === 'add' || (mode === 'toggle' && !next.has(id))) next.add(id);
        else next.delete(id);
      }
      become(next, by);
    },
    clear: () => become(new Set()),
    keep(live) {
      const on = new Set(live);
      become(new Set([...ids].filter((id) => on.has(id))));
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
