// The page's side of packages/client (rule 7, D-029): the client is the only code that calls the
// server; this wraps it in the shapes the page draws from. The page reads the ledger itself
// (`read_ledger`, live.ts) and works each board out from it (board-data.ts), so it never fetches
// a whole board to show one change (N12_FE_01). A refused call comes back as an ApiError carrying
// the problem's pointer errors (api.md 38).
import type { ActEvent, ActionId, ActSize, LedgerEvent, Mode, NoteKind, View } from '../../../../packages/format/src/index.ts';
import type { BoardAccess, BoardState } from '../../../../packages/actions/src/index.ts';
import { ApiProblem, createClient } from '../../../../packages/client/src/index.ts';

/** One board as the page draws it. `versions`: node id -> latest `ver`, sent back with an act;
 * `head`: the ledger's latest `seq`; `access`: open grant requests and each region's holders. */
export interface BoardData { head: number; view: View; state: BoardState; versions: Record<string, number>; access: BoardAccess }

/** What the page sends for one person action; the server stamps the rest. */
export interface ActFields {
  action: ActionId;
  n?: number;
  ver?: number;
  text?: string;
  x?: number;
  y?: number;
  region?: string;
  mode?: Mode;
  size?: ActSize;
  /** `grant` and `deny`: the `seq` of the grant request answered. */
  request?: number;
  /** `revoke`: the agent losing access to `region`. */
  holder?: string;
  /** `note-edit` and `note-remove`: the `seq` of the act that made the note; `kind`: what an
   * edited note now asks for. */
  note?: number;
  kind?: NoteKind;
  /** A note on a group of cards (`comment`, 3_FE_02): the items it is on, in place of `n`. */
  nodes?: number[];
}

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

const client = createClient();

/** One call through the client, with every failure as an ApiError the page can show. */
async function call<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ApiProblem) throw new ApiError(err.detail, err.status, err.errors.map((e) => e.detail));
    throw new ApiError('The board server is not reachable. Is it running?');
  }
}

/** The most lines one `read_ledger` call returns (api.md 31). */
const PAGE = 500;

/** One page of ledger lines after `after`, oldest first; `more` when there are more. */
export const readLedger = (after: number) =>
  call(() => client.call<{ events: LedgerEvent[]; head: number; more?: true }>('read_ledger', { after, limit: PAGE }));

/** sessionStorage flag: the page has already reloaded once for a fresh person cookie. */
const RELOADED = 'vb-person-reload';

/** A person route (`act`) answered `forbidden`: after a server restart the page's cookie is
 * stale, so reload once to get the new one (api.md 20). A second refusal is shown as usual. */
async function asPerson<T>(run: () => Promise<T>): Promise<T> {
  try {
    const out = await run();
    sessionStorage.removeItem(RELOADED);
    return out;
  } catch (err) {
    if (err instanceof ApiProblem && err.code === 'forbidden' && !sessionStorage.getItem(RELOADED)) {
      sessionStorage.setItem(RELOADED, '1');
      location.reload();
    }
    throw err;
  }
}

/** Acts the schema asks to name their board (api.md 16): it is always the board they are sent to. */
const NAMES_BOARD: ReadonlySet<ActionId> = new Set(['mode', 'send', 'revoke']);
/** A note or a place on a whole container names `board` + `region` in place of `n` (api.md 71). */
const CONTAINER_ACTS: ReadonlySet<ActionId> = new Set(['comment', 'context', 'note-edit', 'note-remove', 'pin', 'unpin']);
const namesBoard = (f: ActFields) =>
  NAMES_BOARD.has(f.action) || (CONTAINER_ACTS.has(f.action) && f.region !== undefined && f.n === undefined);

/** One person action. */
export const sendAct = (id: string, fields: ActFields) =>
  call(() => asPerson(() => client.call<ActEvent>('act', {
    board: id, body: { type: 'act', ...fields, ...(namesBoard(fields) && { board: id }) },
  })));

/** The client for a call made as the page goes away: its request outlives the page (keepalive). */
const leavingClient = createClient({ fetch: (url, init) => globalThis.fetch(url, { ...init, keepalive: true }) });

/** The person has looked at `board` up to its line `head` (a board seen, api.md 87). `leaving`: the
 * page is going away, so the request outlives it and nothing waits for the answer. */
export function markBoardSeen(board: string, head: number, leaving = false): Promise<unknown> {
  const input = { board, body: { board, head } };
  if (leaving) return leavingClient.call('mark_seen', input).catch(() => undefined);
  return call(() => asPerson(() => client.call('mark_seen', input)));
}

/** What the project's live stream reports (`watch_project`, api.md 78-80). */
export interface ProjectEvents {
  /** The project ledger gained line `seq` (the agent drew, or another tab acted). */
  change(seq: number): void;
  /** The built page's id; sent only by a server in watch mode, on connect and on every rebuild. */
  build(id: string): void;
  /** The stream (re)connected. */
  open(): void;
}

/** Follow the whole project, boards or none; a stop function. */
export function watchProject(on: ProjectEvents): () => void {
  return client.watch('watch_project', {}, ['change', 'build'], (d, event) => {
    const data = d as { seq?: unknown; build?: unknown };
    if (event === 'change') on.change(Number(data.seq));
    else if (typeof data.build === 'string') on.build(data.build);
  }, () => on.open());
}
