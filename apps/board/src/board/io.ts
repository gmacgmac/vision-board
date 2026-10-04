// The browser's one I/O module (project rule 7): the only code that calls the server. Boards come
// from the project ledger over the /api/boards routes (apps/board/server.ts); the server is the
// only validator, so a refused action comes back as an ApiError carrying its problems.
import type { ActEvent, ActionId, Mode, View } from '../../../../packages/format/src/index.ts';
import type { BoardState, ItemState } from '../../../../packages/actions/src/index.ts';

export interface BoardSummary { id: string; title: string; seq: number }

/** One board as the page draws it. `versions`: node id -> latest `ver`, sent back with an act. */
export interface BoardData { seq: number; view: View; state: BoardState; versions: Record<string, number> }

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

/** The load response as JSON: `state`'s maps arrive as plain objects. */
interface BoardJson {
  seq: number;
  view: View;
  state: {
    items: Record<string, ItemState>;
    pins: Record<string, { x: number; y: number }>;
    modes: Record<string, Mode>;
  };
  versions: Record<string, number>;
}

export class ApiError extends Error {
  problems: string[];
  constructor(message: string, problems: string[] = []) {
    super(message);
    this.problems = problems;
  }
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError('The board server is not reachable. Is it running?');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? `Request failed (${res.status})`, body.problems ?? []);
  return body as T;
}

const boardUrl = (id: string, sub = '') => `/api/boards/${encodeURIComponent(id)}${sub}`;

export const listBoards = () => call<BoardSummary[]>('/api/boards');

export async function loadBoard(id: string): Promise<BoardData> {
  const b = await call<BoardJson>(boardUrl(id));
  return {
    seq: b.seq,
    view: b.view,
    versions: b.versions,
    state: {
      items: new Map(Object.entries(b.state.items)),
      pins: new Map(Object.entries(b.state.pins)),
      modes: new Map(Object.entries(b.state.modes)),
    },
  };
}

export const sendAct = (id: string, fields: ActFields) =>
  call<ActEvent>(boardUrl(id, '/act'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  });

/** Calls back whenever the project ledger gains an event (the agent drew, or another tab acted). */
export function watchBoard(id: string, onChange: () => void): () => void {
  const es = new EventSource(boardUrl(id, '/events'));
  es.addEventListener('change', onChange);
  return () => es.close();
}
