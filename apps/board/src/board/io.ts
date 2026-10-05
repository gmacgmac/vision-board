// The page's side of packages/client (rule 7, D-029): the client is the only code that calls the
// server; this wraps it in the shapes the page draws from. A refused call comes back as an
// ApiError carrying the problem's pointer errors (api.md 38).
import type { ActEvent, ActionId, Mode, NodeSize, View } from '../../../../packages/format/src/index.ts';
import type { BoardState, ItemState } from '../../../../packages/actions/src/index.ts';
import { ApiProblem, createClient } from '../../../../packages/client/src/index.ts';

export interface BoardSummary { id: string; title: string; seq: number }

/** One board as the page draws it. `versions`: node id -> latest `ver`, sent back with an act;
 * `head`: the ledger's latest `seq`. */
export interface BoardData { head: number; view: View; state: BoardState; versions: Record<string, number> }

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
}

/** `get_board` as JSON: `state`'s maps arrive as plain objects; `sizes` only when set. */
interface BoardJson {
  head: number;
  view: View;
  state: {
    items: Record<string, ItemState>;
    pins: Record<string, { x: number; y: number }>;
    modes: Record<string, Mode>;
    sizes?: Record<string, NodeSize>;
  };
  versions: Record<string, number>;
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

export async function listBoards(): Promise<BoardSummary[]> {
  const r = await call(() => client.call<{ boards: { board: string; title: string; seq: number }[] }>('list_boards'));
  return r.boards.map((b) => ({ id: b.board, title: b.title, seq: b.seq }));
}

export async function loadBoard(id: string): Promise<BoardData> {
  const b = await call(() => client.call<BoardJson>('get_board', { board: id }));
  return {
    head: b.head,
    view: b.view,
    versions: b.versions,
    state: {
      items: new Map(Object.entries(b.state.items)),
      pins: new Map(Object.entries(b.state.pins)),
      modes: new Map(Object.entries(b.state.modes)),
      sizes: new Map(Object.entries(b.state.sizes ?? {})),
    },
  };
}

/** One person action. A `mode` act names its board, as the act schema asks (api.md 16). */
export const sendAct = (id: string, fields: ActFields) =>
  call(() => client.call<ActEvent>('act', {
    board: id, body: { type: 'act', ...fields, ...(fields.action === 'mode' && { board: id }) },
  }));

/** Calls back whenever the project ledger gains an event (the agent drew, or another tab acted). */
export function watchBoard(id: string, onChange: () => void): () => void {
  return client.watch('watch_board', { board: id }, 'change', onChange);
}
