// Each board's zoom and position, kept across a reload (FE_02 ruling 5, keepView flag): saved per
// board in the host's store (`view.<board>`, BoardHost.store) a moment after the view stops moving, and at
// once when the page goes or another board opens, and restored when that board opens again. A store that
// lost it, or holds something else: the board fits, as before.
import type { BoardStore } from '../host.ts';
import type { Viewport, ViewSnapshot } from '../canvas/index.ts';

const KEY = 'view.';
/** How long the view must stay still before it is saved. */
const QUIET_MS = 250;

export interface KeptView {
  /** The view moved: save it for the open board once it has been still a moment. */
  moved(): void;
  /** Save now what is waiting to be saved. */
  flush(): void;
  /** Go back to board `id`'s saved view; false when there is none (the caller fits instead). */
  restore(id: string): boolean;
  destroy(): void;
}

const isView = (v: unknown): v is ViewSnapshot =>
  !!v && typeof v === 'object' && ['x', 'y', 'k'].every((k) => Number.isFinite((v as Record<string, unknown>)[k]));

export function createKeptView(vp: Viewport, board: () => string, on: boolean, store: BoardStore): KeptView {
  let timer = 0;
  let pending = false;

  function flush() {
    clearTimeout(timer);
    if (!pending) return;
    pending = false;
    const id = board();
    // A view taken while the stage had no room (a hidden pane or tab) is not the person's.
    if (id && vp.sized) store.set(KEY + id, JSON.stringify(vp.snapshot()));
  }

  if (on) addEventListener('pagehide', flush);
  return {
    moved() {
      if (!on) return;
      pending = true;
      clearTimeout(timer);
      timer = window.setTimeout(flush, QUIET_MS);
    },
    flush,
    restore(id) {
      if (!on) return false;
      let saved: unknown = null;
      try {
        saved = JSON.parse(store.get(KEY + id) ?? 'null');
      } catch {
        // Not JSON: fit instead.
      }
      if (!isView(saved)) return false;
      vp.restore(saved);
      return true;
    },
    destroy() {
      clearTimeout(timer);
      removeEventListener('pagehide', flush);
    },
  };
}
