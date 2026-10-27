// Opening boards (split out of controller.ts in 3_FE_03; FE_02 of found-in-use): boot reads the
// whole ledger once and follows the project's live stream from then on, boards or none. A switch
// opens another board from the held state, with no fetch, since the state holds them all. The
// picker's list is worked out from the held state after every batch (`boardList`, the same read as
// `list_boards`; its marks are attention.ts's), and the open board never changes by itself, except
// that an empty project opens the first board drawn, and a board a chat in the folder drew opens
// (`jump`, panel-send ruling 2): now, or once its line arrives.
// Each board's zoom and position are kept (kept-view.ts, keepView flag) and restored on open.
// Which board opens first is the host's page to say (`BoardPage.wanted`, host.ts: the standalone
// page's address, then the board last looked at; start-board.ts picks among them); each board opened
// is told to it (`opened`). With no page, the first board opens.
// An archived board (N39 rulings 4-6) is in neither the picker nor what opens by default; when the
// open board is archived, here or anywhere, the next board opens, or with none left the board starts
// again (`BoardPage.restart`) into its empty state, as it boots in a folder with no board. The
// Archived list (archiveBoard flag) is worked out with the picker's.
import type { BoardLayout } from '#layout';
import type { LedgerState } from '#actions';
import { archivedBoards, boardList, boardVisibility } from '#actions';
import { createKeptView } from './kept-view.ts';
import { nextBoard, startBoard } from './start-board.ts';
import type { BoardPage } from '../host.ts';
import type { Live } from '../live.ts';
import type { Selection } from '../selection/index.ts';
import type { Viewport } from '../canvas/index.ts';
import type { Status } from '../status.ts';
import { work } from '../work.ts';
import * as boardsWords from '../words/boards.ts';

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
  status: Status;
  /** The board's message over the stage ("No boards yet", "There is no board"); null hides it. */
  say(text: string | null): void;
  /** The host's page: which board opens first, and starting again. */
  page: BoardPage;
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
  /** Stop following the changes. */
  stop(): void;
}

const WAITING = boardsWords.noBoardsYetWaitingFor
  + boardsWords.npmRunBoardServesYour;

export function createBoards(d: BoardsDeps): Boards {
  let unwatch: (() => void) | null = null;
  /** Boot has read the ledger: from then on the first board drawn into an empty project opens. */
  let booted = false;
  let drawn = false;
  /** A board to open as soon as it is held (`jump`). */
  let pending: string | null = null;
  const kept = createKeptView(d.vp, d.id, d.keepView);
  const { status } = d;

  /** Whether the picker shows board `id`: it exists and is not archived. */
  const shown = (s: LedgerState | null, id: string) => !!s && boardVisibility(s, id) === 'visible';

  /** Draw board `id` from the held state; no fetch, the state holds every board. */
  function open(id: string) {
    if (!shown(d.live.state, id)) {
      d.say(boardsWords.thereIsNoBoard(id));
      return;
    }
    kept.flush(); // the board being left keeps its place
    if (d.id() !== id) d.selection.clear();
    d.setId(id);
    d.redraw(true);
    d.say(null);
    const layout = d.layout();
    if (!kept.restore(id) && layout) d.vp.fit(layout.bounds, false);
    d.page.opened(id);
    if (drawn) return;
    drawn = true;
    // The first draw ends once the frame it was drawn for has been shown.
    requestAnimationFrame(() => requestAnimationFrame(() => { work.firstDrawMs = performance.now(); }));
  }

  function switchTo(id: string) {
    status.set({ boardId: id, noBoards: false });
    open(id);
  }

  function listed() {
    const s = d.live.state;
    if (!s || !booted) return;
    const before = status.now.boards.map((b) => b.board);
    const list = boardList(s);
    status.set({ boards: list, ...(d.archiving && { archived: archivedBoards(s) }) });
    if (pending && shown(s, pending)) return jump(pending);
    const open = d.id();
    if (open && !shown(s, open)) return leave(open, before, list.map((b) => b.board));
    if (!open && list.length) switchTo(list[0]!.board);
  }

  /** The open board `gone` was archived: open the board after it in the picker as it was, else the one
   *  before it; with none left, start again into the empty state, no board named. */
  function leave(gone: string, before: readonly string[], boards: readonly string[]) {
    const next = nextBoard(before.includes(gone) ? before : [...d.live.state!.boards.keys()], gone, boards);
    if (next) return switchTo(next);
    kept.flush();
    d.page.restart();
  }

  function jump(id: string) {
    pending = shown(d.live.state, id) ? null : id;
    if (!pending && d.id() !== id) switchTo(id);
  }

  return {
    async boot() {
      try {
        const [, wanted] = await Promise.all([d.live.load(), d.page.wanted()]);
        const s = d.live.state!;
        const list = boardList(s);
        booted = true;
        status.set({ boards: list, ...(d.archiving && { archived: archivedBoards(s) }) });
        unwatch = d.live.watch();
        if (!list.length) {
          status.set({ noBoards: true });
          const archived = archivedBoards(s).length;
          d.say(archived ? boardsWords.archivedRestoreOneFromThe(WAITING, archived) : WAITING);
          return;
        }
        const [named = '', ...lasts] = wanted;
        const ids = list.map((b) => b.board);
        const order = [...s.boards.keys()];
        const last = lasts.find((x) => order.includes(x)) ?? null;
        switchTo(startBoard(ids, named, last, order));
      } catch (err) {
        d.fail(err);
        d.say(boardsWords.couldNotReachTheBoard);
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
