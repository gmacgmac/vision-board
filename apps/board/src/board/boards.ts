// Opening boards (split out of controller.ts in 3_FE_03; FE_02 of found-in-use): boot reads the
// whole ledger once and follows the project's live stream from then on, boards or none. A switch
// opens another board from the held state, with no fetch, since the state holds them all. The
// picker's list is worked out from the held state after every batch (`boardList`, the same read as
// `list_boards`); a board that appears after the page opened is "new" until it is opened, and the
// open board never changes by itself, except that an empty project opens the first board drawn.
// Each board's zoom and position are kept (kept-view.ts, keepView flag) and restored on open.
import type { BoardLayout } from '../../../../packages/layout/src/index.ts';
import { boardList } from '../../../../packages/actions/src/index.ts';
import { createKeptView } from './kept-view.ts';
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
  /** The keepView flag: a board opens where the person left it, else it fits. */
  keepView: boolean;
}

export interface Boards {
  boot(): Promise<void>;
  switchTo(id: string): void;
  /** The held state changed: rebuild the picker's list and its "new" badges; on an empty project,
   * open the first board drawn. */
  listed(): void;
  /** The view moved (pan or zoom): keep it for the open board. */
  moved(): void;
  /** Stop following the project's live stream. */
  stop(): void;
}

const WAITING = 'No boards yet. Waiting for an agent to draw.\n'
  + '(npm run board serves your project; npm run dev the example boards.)';

export function createBoards(d: BoardsDeps): Boards {
  let unwatch: (() => void) | null = null;
  /** Every board the page has seen; null until boot has read the ledger. */
  let known: Set<string> | null = null;
  let drawn = false;
  const kept = createKeptView(d.vp, d.id, d.keepView);

  /** Draw board `id` from the held state; no fetch, the state holds every board. */
  function open(id: string) {
    if (!d.live.state?.boards.has(id)) {
      shell.message = `There is no board "${id}".`;
      return;
    }
    kept.flush(); // the board being left keeps its place
    if (d.id() !== id) d.selection.clear();
    d.setId(id);
    d.redraw(true);
    shell.message = null;
    const layout = d.layout();
    if (!kept.restore(id) && layout) d.vp.fit(layout.bounds, false);
    history.replaceState(null, '', `#${encodeURIComponent(id)}`);
    if (drawn) return;
    drawn = true;
    // The first draw ends once the frame it was drawn for has been shown.
    requestAnimationFrame(() => requestAnimationFrame(() => { work.firstDrawMs = performance.now(); }));
  }

  function switchTo(id: string) {
    shell.boardId = id;
    if (shell.newBoards.has(id)) shell.newBoards = new Set([...shell.newBoards].filter((b) => b !== id));
    open(id);
  }

  function listed() {
    const s = d.live.state;
    if (!s || !known) return;
    const list = boardList(s);
    const here = new Set(list.map((b) => b.board));
    const fresh = list.filter((b) => !known!.has(b.board)).map((b) => b.board);
    for (const id of fresh) known.add(id);
    const gone = [...shell.newBoards].some((id) => !here.has(id));
    if (fresh.length || gone) shell.newBoards = new Set([...shell.newBoards, ...fresh].filter((id) => here.has(id)));
    shell.boards = list;
    if (!d.id() && list.length) switchTo(list[0]!.board);
  }

  return {
    async boot() {
      try {
        await d.live.load();
        const list = boardList(d.live.state!);
        known = new Set(list.map((b) => b.board));
        shell.boards = list;
        unwatch = d.live.watch();
        if (!list.length) {
          shell.message = WAITING;
          return;
        }
        const wanted = decodeURIComponent(location.hash.slice(1));
        switchTo(known.has(wanted) ? wanted : list[0]!.board);
      } catch (err) {
        d.fail(err);
        shell.message = 'Could not reach the board server. Start it with: npm run board';
      }
    },
    switchTo,
    listed,
    moved: kept.moved,
    stop() {
      unwatch?.();
      kept.destroy();
    },
  };
}
