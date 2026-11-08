// The board's side of packages/client (rule 7, D-029): the client is the only code that calls the
// server, and the board's calls go through the transport its host gives (`host.api`, host.ts), so
// the board holds no origin and no client of its own: `createIo(api)` makes one per mounted board.
// It reads the ledger itself (`read_ledger`, live.ts) and works each board out from it (packages/actions
// board-data.ts), so it never fetches a whole board to show one change (N12_FE_01). A refused call
// comes back as an ApiError carrying the problem's pointer errors (api.md 38). The standalone page's
// own calls (its change stream, the chat, the folder) are its own (shell/page-io.ts). Its failures,
// the acts' shapes and the picture request live in io/ (this file stays the one way in).
import type { AppStateValue, LedgerEvent } from '#format';
import { fromLine } from '#format';
import type { Transport } from '#client';
import { ApiProblem, createClient } from '#client';
import type { ActFields, BoardFields, RetireFields } from './io/acts.ts';
import { namesBoard } from './io/acts.ts';
import type { AppCallRefusal, PersonCall } from './io/errors.ts';
import { ApiError, asApiError, UNREACHABLE } from './io/errors.ts';

/** One board as the page draws it: the one board-data builder's (`#actions` `boardData`). */
export type { BoardData } from '#actions';
// The parts of this module (io/): its failures, the acts' shapes and the one picture request.
export type { ActFields, BoardFields, RetireFields } from './io/acts.ts';
export type { AppCallRefusal, PersonCall } from './io/errors.ts';
export { ApiError, asApiError, UNREACHABLE } from './io/errors.ts';
export { imageVersion } from './io/image.ts';

/** The most lines one `read_ledger` call returns (api.md 31). */
const PAGE = 500;

/** Every call the board makes, through one transport. */
export function createIo(api: Transport, asPerson: PersonCall = (run) => run()) {
  const client = createClient({ transport: api });
  /** The client for a call made as the page goes away: its request outlives the page (keepalive). */
  const leavingClient = createClient({ transport: (path, init) => api(path, { ...init, keepalive: true }) });
  const person = <T>(run: () => Promise<T>) => asApiError(() => asPerson(run));
  /** A call for a card's panel, as the person; a refusal rejects with an `AppCallRefusal`, which the
   * frame turns into the panel's JSON-RPC error. */
  const forPanel = <T>(run: () => Promise<T>): Promise<T> => asPerson(run).catch((err: unknown) => {
    throw (err instanceof ApiProblem ? { problem: err.code, detail: err.detail }
      : { problem: 'app-failed', detail: UNREACHABLE }) satisfies AppCallRefusal;
  });

  return {
    /** One page of ledger lines after `after`, oldest first, as code reads them (`fromLine`: a card is
     * its identity, `id`, and an old `list` mode reads `column`; api.md 125, 129); `more` when there
     * are more. The one place the board turns a line into an event (live.ts, versions.ts read here). */
    /** `readOnly`: the ledger is open read-only now (D-085 4): the board pauses every write (live.ts, controller.ts). */
    async readLedger(after: number): Promise<{ events: LedgerEvent[]; head: number; more?: true; readOnly?: true; oneAgent?: true }> {
      const page = await asApiError(() => client.call('read_ledger', { after, limit: PAGE }));
      return { ...page, events: page.events.map(fromLine) };
    },
    /** One person action; the stored line, its cards by board number (live.ts `own` reads it back). */
    sendAct: (id: string, fields: ActFields) => person(() => client.call('act', {
      board: id, body: { type: 'act', ...fields, ...(namesBoard(fields) && { board: id }) },
    })),
    /** Create board `id`, or rename it when it exists (api.md 90); the stored `board` line. */
    putBoard: (id: string, fields: BoardFields) => person(() => client.call('put_board', { board: id, body: fields })),
    /** Remove cards, or a container with its cards, from board `id`; the stored `retire` line, its cards
     * by board number (live.ts `own` reads it back). */
    retireCards: (id: string, fields: RetireFields) => person(() => client.call('retire_cards', { board: id, body: fields })),
    /** The person has looked at `board` up to its line `head` (a board seen, api.md 87). `leaving`: the
     * page is going away, so the request outlives it and nothing waits for the answer. */
    markBoardSeen(board: string, head: number, leaving = false): Promise<unknown> {
      const input = { board, body: { board, head } };
      if (leaving) return leavingClient.call('mark_seen', input).catch(() => undefined);
      return person(() => client.call('mark_seen', input));
    },
    /** The person has seen version `ver` of card `n` (its board number, D-018): a card seen; the stored line. */
    markCardSeen: (board: string, n: number, ver: number) => person(() => client.call('mark_seen', { board, body: { n, ver } })),
    /** Every app in the open folder and every app a card names, each in its state now (`list_apps`). */
    listApps: () => person(() => client.call('list_apps')),
    /** Run tool `tool` of app `app` for its panel (`call_app_tool`). */
    callAppTool: (app: string, tool: string, args: Record<string, unknown>) =>
      forPanel(() => client.call('call_app_tool', { app, body: { tool, arguments: args } })),
    /** The value app card `n`'s panel last saved on `board`, or undefined (`get_panel_state`, apps.md
     * § Saving the panel's state). */
    panelState: async (board: string, n: number): Promise<AppStateValue | undefined> =>
      (await person(() => client.call('get_panel_state', { board, n }))).state,
    /** Keep `state` as app card `n`'s panel state on `board` (`put_panel_state`); over the limit `too-large`. */
    savePanelState: (board: string, n: number, state: AppStateValue) =>
      forPanel(() => client.call('put_panel_state', { board, n, body: { state } })),
  };
}

/** The board's calls (`createIo`). */
export type Io = ReturnType<typeof createIo>;

