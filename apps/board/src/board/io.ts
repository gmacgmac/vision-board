// The board's side of packages/client (rule 7, D-029): the client is the only code that calls the
// server, and the board's calls go through the transport its host gives (`host.api`, host.ts), so
// the board holds no origin and no client of its own: `createIo(api)` makes one per mounted board.
// It reads the ledger itself (`read_ledger`, live.ts) and works each board out from it (packages/actions
// board-data.ts), so it never fetches a whole board to show one change (N12_FE_01). A refused call
// comes back as an ApiError carrying the problem's pointer errors (api.md 38). The standalone page's
// own calls (its change stream, the chat, the folder) are its own (shell/page-io.ts).
import type { ActionId, AppStateValue, LedgerEvent, OperationInput } from '#format';
import { BOARD_MARKS, fromLine, IMAGE_ROUTE, IMAGE_WORDS } from '#format';
import type { Transport } from '#client';
import { ApiProblem, createClient } from '#client';
import * as boardWords from './words/board.ts';

/** One board as the page draws it: the one board-data builder's (`#actions` `boardData`). */
export type { BoardData } from '#actions';

/** What the page sends for one person action (`act`'s body, act.schema.json `sent`, less its
 * `type`); the server stamps the rest. */
export type ActFields = Omit<OperationInput<'act'>['body'], 'type'>;

/** What the person gives a board: `put_board`'s body (api.md 90). */
export type BoardFields = OperationInput<'put_board'>['body'];

/** What the person removes from a board: `retire_cards`' body (N24, api.md 141), cards by number
 * or a whole container. */
export type RetireFields = OperationInput<'retire_cards'>['body'];

/** How a call for a panel refuses: the API problem's code and its words (the frame's `AppCallError`). */
export interface AppCallRefusal { problem: string; detail?: string }

export class ApiError extends Error {
  /** HTTP status, or 0 when the server could not be reached. */
  status: number;
  problems: string[];
  constructor(message: string, status = 0, problems: string[] = []) {
    super(message);
    this.status = status;
    this.problems = problems;
  }
}

/** What a failure the server never answered says. */
export const UNREACHABLE = boardWords.theBoardServerIsNot;

/** One call, with every failure as an ApiError the page can show. */
export async function asApiError<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ApiProblem) throw new ApiError(err.detail, err.status, err.errors.map((e) => e.detail));
    throw new ApiError(UNREACHABLE);
  }
}

/** Runs a person's call: the standalone page's reloads once for a fresh cookie when one is
 * refused as `forbidden` (shell/page-io.ts `asPerson`); a host's runs it as it is. */
export type PersonCall = <T>(run: () => Promise<T>) => Promise<T>;

/** The most lines one `read_ledger` call returns (api.md 31). */
const PAGE = 500;

/** Acts the schema asks to name their board (api.md 16, 135, 138): it is always the board they are sent
 * to. Every board mark does (archive, restore, lock, unlock). */
const NAMES_BOARD: ReadonlySet<ActionId> = new Set(['mode', 'widths', 'send', 'revoke', ...BOARD_MARKS]);
/** A note or a place on a whole container names `board` + `region` in place of `n` (api.md 71). */
const CONTAINER_ACTS: ReadonlySet<ActionId> = new Set(['comment', 'note-edit', 'note-remove', 'pin', 'unpin']);
const namesBoard = (f: ActFields) =>
  NAMES_BOARD.has(f.action) || (CONTAINER_ACTS.has(f.action) && f.region !== undefined && f.n === undefined);

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
    async readLedger(after: number): Promise<{ events: LedgerEvent[]; head: number; more?: true }> {
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

// ---- images in cards (D-048, images.md § Updates) ---------------------------------------------------
// The image route is the page's own (`IMAGE_ROUTE`, not under the API prefix), so this is no call
// through the host's transport: a host serves the pictures at the same path (ARCH_03 REQUESTS).

/** What the image route says of `path` now: `same` when `etag` is still its version (304), else its
 * version's ETag, or why it is not shown (the problem's words, `IMAGE_WORDS`). A HEAD, so no picture
 * comes back. The route is not an API operation, so this is the page's one request for it by code; the
 * browser loads the picture itself (`<img src>`). Throws when the board can't be reached. */
export async function imageVersion(path: string, etag?: string): Promise<{ same?: true; etag?: string; problem?: string }> {
  const url = IMAGE_ROUTE + path;
  const head = await fetch(url, { method: 'HEAD', cache: 'no-store', ...(etag && { headers: { 'If-None-Match': etag } }) });
  await head.arrayBuffer(); // empty; read so the request ends as finished, not aborted
  if (head.status === 304) return { same: true };
  if (head.ok) return { etag: head.headers.get('ETag') ?? '' };
  const got = await fetch(url, { cache: 'no-store' }).then((r) => r.json() as Promise<{ detail?: unknown }>).catch(() => ({ detail: undefined }));
  return { problem: typeof got.detail === 'string' ? got.detail : IMAGE_WORDS.missing };
}
