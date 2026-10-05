// Opening boards (split out of controller.ts in 3_FE_03): boot reads the board list and the whole
// ledger once, opens the board the address names (or the first), and follows its live stream; a
// switch opens another board from the held state, with no fetch, since the state holds them all.
import type { BoardLayout } from '../../../../packages/layout/src/index.ts';
import { listBoards } from './io.ts';
import type { Live } from './live.ts';
import type { Selection } from './selection.ts';
import type { Viewport } from './viewport.ts';
import { work } from './work.ts';
import { shell } from '../shell/shell.svelte.ts';

export interface BoardsDeps {
  live: Live;
  vp: Viewport;
  selection: Selection;
  /** The open board's id, and setting it. */
  id(): string;
  setId(id: string): void;
  /** Draw the open board from scratch. */
  redraw(fresh: boolean): void;
  layout(): BoardLayout | null;
  fail(err: unknown): void;
}

export interface Boards {
  boot(): Promise<void>;
  switchTo(id: string): void;
  /** Stop following the open board's live stream. */
  stop(): void;
}

export function createBoards(d: BoardsDeps): Boards {
  let unwatch: (() => void) | null = null;

  /** Draw board `id` from the held state; no fetch, the state holds every board. */
  function open(id: string) {
    if (!d.live.state?.boards.has(id)) {
      shell.message = `There is no board "${id}".`;
      return;
    }
    if (d.id() !== id) d.selection.clear();
    d.setId(id);
    d.redraw(true);
    shell.message = null;
    const layout = d.layout();
    if (layout) d.vp.fit(layout.bounds, false);
    history.replaceState(null, '', `#${encodeURIComponent(id)}`);
  }

  function switchTo(id: string) {
    shell.boardId = id;
    open(id);
    unwatch?.();
    unwatch = d.live.watch(id);
  }

  return {
    async boot() {
      try {
        const [boards] = await Promise.all([listBoards(), d.live.load()]);
        shell.boards = boards;
        if (!boards.length) {
          shell.message = 'No boards yet. Run npm run dev to open the example boards.';
          return;
        }
        const wanted = decodeURIComponent(location.hash.slice(1));
        switchTo(boards.some((b) => b.id === wanted) ? wanted : boards[0]!.id);
        // The first draw ends once the frame it was drawn for has been shown.
        requestAnimationFrame(() => requestAnimationFrame(() => { work.firstDrawMs = performance.now(); }));
      } catch (err) {
        d.fail(err);
        shell.message = 'Could not reach the board server. Start it with: npm run board';
      }
    },
    switchTo,
    stop() { unwatch?.(); },
  };
}
