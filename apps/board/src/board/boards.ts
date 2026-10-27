// Opening boards (split out of controller.ts in 3_FE_03; FE_02 of found-in-use): boot reads the
// whole ledger once and follows the project's live stream from then on, boards or none. A switch
// opens another board from the held state, with no fetch, since the state holds them all. The
// picker's list is worked out from the held state after every batch (`boardList`, the same read as
// `list_boards`; its marks are attention.ts's), and the open board never changes by itself, except
// that an empty project opens the first board drawn, and a board a chat in the folder drew opens
// (`jump`, panel-send ruling 2): now, or once its line arrives.
// Each board's zoom and position are kept (kept-view.ts, keepView flag) and restored on open.
// The board opened is kept too, so a page opened with no board in its hash reopens it (start-board.ts);
// with the openFolder flag it is kept per folder (folder.ts), and the plain key is the fallback.
// An archived board (N39 rulings 4-6) is in neither the picker nor what opens by default; when the
// open board is archived, here or anywhere, the next board opens, or with none left the page reloads
// into its empty state, as it boots in a folder with no board. The Archived list (archiveBoard flag)
// is worked out with the picker's.
import type { BoardLayout } from '#layout';
import type { LedgerState } from '#actions';
import { archivedBoards, boardList, boardVisibility } from '#actions';
import { createKeptView } from './kept-view.ts';
import { LAST_BOARD_KEY, nextBoard, startBoard } from './start-board.ts';
import { folderMoved, lastBoardKey, loadFolder, openFolderOn } from './folder.ts';
import type { Live } from './live.ts';
import type { Selection } from './selection.ts';
import type { Viewport } from './viewport.ts';
import { work } from './work.ts';
import { keep, kept as keptValue } from '../shell/kept.ts';
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
  /** The archiveBoard flag: the picker's Archived list. */
  archiving: boolean;
}

export interface Boards {
  boot(): Promise<void>;
  switchTo(id: string): void;
  /** Open board `id` now when it is held, else as soon as its line arrives (a chat's first board). */
  jump(id: string): void;
  /** The held state changed: rebuild the picker's list; on an empty project, open the first board
   * drawn. */
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
  /** Boot has read the ledger: from then on the first board drawn into an empty project opens. */
  let booted = false;
  let drawn = false;
  /** A board to open as soon as it is held (`jump`). */
  let pending: string | null = null;
  const kept = createKeptView(d.vp, d.id, d.keepView);
  const openFolder = openFolderOn();
  /** Where the board last looked at is kept: per folder once the folder is known. */
  let lastKey = LAST_BOARD_KEY;

  /** Whether the picker shows board `id`: it exists and is not archived. */
  const shown = (s: LedgerState | null, id: string) => !!s && boardVisibility(s, id) === 'visible';

  /** Draw board `id` from the held state; no fetch, the state holds every board. */
  function open(id: string) {
    if (!shown(d.live.state, id)) {
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
    keep(lastKey, id);
    if (lastKey !== LAST_BOARD_KEY) keep(LAST_BOARD_KEY, id);
    if (drawn) return;
    drawn = true;
    // The first draw ends once the frame it was drawn for has been shown.
    requestAnimationFrame(() => requestAnimationFrame(() => { work.firstDrawMs = performance.now(); }));
  }

  function switchTo(id: string) {
    shell.boardId = id;
    shell.noBoards = false;
    open(id);
  }

  function listed() {
    const s = d.live.state;
    if (!s || !booted) return;
    const before = shell.boards.map((b) => b.board);
    const list = boardList(s);
    shell.boards = list;
    if (d.archiving) shell.archived = archivedBoards(s);
    if (pending && shown(s, pending)) return jump(pending);
    const open = d.id();
    if (open && !shown(s, open)) return leave(open, before, list.map((b) => b.board));
    if (!open && list.length) switchTo(list[0]!.board);
  }

  /** The open board `gone` was archived: open the board after it in the picker as it was, else the one
   *  before it; with none left, reload into the empty state, without the board in the hash. */
  function leave(gone: string, before: readonly string[], boards: readonly string[]) {
    const next = nextBoard(before.includes(gone) ? before : [...d.live.state!.boards.keys()], gone, boards);
    if (next) return switchTo(next);
    kept.flush();
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    location.reload();
  }

  function jump(id: string) {
    pending = shown(d.live.state, id) ? null : id;
    if (!pending && d.id() !== id) switchTo(id);
  }

  return {
    async boot() {
      try {
        const [, folder] = await Promise.all([d.live.load(), openFolder ? loadFolder() : null]);
        lastKey = lastBoardKey(folder);
        const s = d.live.state!;
        const list = boardList(s);
        booted = true;
        shell.boards = list;
        if (d.archiving) shell.archived = archivedBoards(s);
        unwatch = d.live.watch(openFolder ? folderMoved : undefined);
        if (!list.length) {
          shell.noBoards = true;
          const archived = archivedBoards(s).length;
          shell.message = archived ? `${WAITING}\n${archived} archived: restore one from the board picker.` : WAITING;
          return;
        }
        const hash = decodeURIComponent(location.hash.slice(1));
        const ids = list.map((b) => b.board);
        const order = [...s.boards.keys()];
        const last = [keptValue(lastKey), keptValue(LAST_BOARD_KEY)].find((x) => x !== null && order.includes(x)) ?? null;
        switchTo(startBoard(ids, hash, last, order));
      } catch (err) {
        d.fail(err);
        shell.message = 'Could not reach the board server. Start it with: npm run board';
      }
    },
    switchTo,
    jump,
    listed,
    moved: kept.moved,
    stop() {
      unwatch?.();
      kept.destroy();
    },
  };
}
