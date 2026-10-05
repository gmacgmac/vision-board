// The read operations (api.md Operations, 31, 41, 43, 44): every answer carries `head`, the
// ledger's latest `seq`. The shapes are built by packages/actions; nothing is folded here. A read
// that sends a Bearer secret is scoped to that agent (`list_open`, `check_responses`, api.md 41).
import type { LedgerEvent } from '../../../packages/format/src/index.ts';
import { boardView, latest, nodesOf } from '../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../packages/actions/src/index.ts';
import {
  boardHeads, boardState, containerDetail, eventBoard, linkedDetails, nodeDetail, openItems, responsesAfter,
} from '../../../packages/actions/src/index.ts';
import type { Ctx, Handler } from './dispatch.ts';
import { problem } from './problem.ts';
import { sendJson, sendJsonLines, wantsJsonLines } from './respond.ts';

/** The board named in the path, refused with `not-found` when the ledger has none. */
export function requireBoard(s: LedgerState, board: unknown): string {
  const id = String(board);
  if (!s.boards.has(id)) throw problem('not-found', `There is no board "${id}". Call list_boards to see the boards.`);
  return id;
}

/** At most `limit` of `list`, and `more: true` when it was cut (api.md 31). */
function page<T>(list: readonly T[], limit: unknown): { list: T[]; more?: true } {
  const max = Number(limit);
  return { list: list.slice(0, max), ...(list.length > max && { more: true as const }) };
}

const listBoards: Handler = ({ res, ledger }) => {
  const s = ledger.state();
  const heads = boardHeads(s, ledger.events());
  const boards = [...s.boards.values()].map((b) => ({ board: b.id, title: b.title, seq: heads.get(b.id) ?? s.seq }));
  sendJson(res, 200, { boards, head: s.seq });
};

const getBoard: Handler = ({ res, params, ledger }) => {
  const s = ledger.state();
  const id = requireBoard(s, params.board);
  const st = boardState(s, id);
  sendJson(res, 200, {
    head: s.seq,
    view: boardView(s, id),
    state: {
      items: Object.fromEntries(st.items), pins: Object.fromEntries(st.pins), modes: Object.fromEntries(st.modes),
      ...(st.sizes.size > 0 && { sizes: Object.fromEntries(st.sizes) }),
    },
    versions: Object.fromEntries(nodesOf(s, id).map((x) => [String(x.n), latest(x).ver])),
  });
};

const showNode: Handler = ({ res, params, ledger }) => {
  const s = ledger.state();
  const board = requireBoard(s, params.board);
  const n = Number(params.n);
  const detail = nodeDetail(s, n);
  if (!detail || detail.board !== board) {
    throw problem('not-found', `There is no node ${n} on board "${board}". Call get_board to see its nodes.`);
  }
  sendJson(res, 200, { head: s.seq, ...detail, ...(params.linked === true && { linked: linkedDetails(s, n) }) });
};

const showContainer: Handler = ({ res, params, ledger }) => {
  const s = ledger.state();
  const board = requireBoard(s, params.board);
  const region = String(params.region);
  const detail = containerDetail(s, board, region);
  if (!detail) throw problem('not-found', `There is no region "${region}" on board "${board}". Call get_board to see its regions.`);
  sendJson(res, 200, { head: s.seq, ...detail });
};

/** The agent a scoped read is for: the Bearer caller, if any (api.md 41). */
const scopeOf = (caller: Ctx['caller']): string | undefined => (caller?.by === 'agent' ? caller.agent : undefined);

const listOpen: Handler = ({ res, params, ledger, caller }) => {
  const s = ledger.state();
  const board = requireBoard(s, params.board);
  sendJson(res, 200, { head: s.seq, items: openItems(s, board, scopeOf(caller)) });
};

/** A person act that ends a `check_responses` wait on `board`: Send, or an answer to a grant
 * request on it (api.md Operations); for a scoped caller, only one that concerns it. */
const wakes = (s: LedgerState, board: string, e: LedgerEvent, agent: string | undefined): boolean =>
  e.type === 'act' && (e.action === 'send' || e.action === 'grant' || e.action === 'deny') && eventBoard(s, e) === board &&
  (agent === undefined || responsesAfter(s, board, e.seq - 1, agent).some((x) => x.seq === e.seq));

/** Hold until `stop` says so, `seconds` pass, or the caller goes away. True if the caller is still there. */
function hold({ res, ledger }: Ctx, seconds: number, stop: (e: LedgerEvent) => boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      off();
      res.off('close', done);
      resolve(!res.destroyed && !res.writableEnded);
    };
    const timer = setTimeout(done, seconds * 1000);
    const off = ledger.onAppend((e) => { if (stop(e)) done(); });
    res.on('close', done);
  });
}

/** The person's acts after `after`. With `wait`, the call is held until a Send or a grant answer
 * on this board, unless one is already there; when the wait runs out the answer is whatever came
 * after `after` (often `{ responses: [], head }`), so a comment is never skipped by the cursor. */
const checkResponses: Handler = async (ctx) => {
  const { res, params, ledger } = ctx;
  const board = requireBoard(ledger.state(), params.board);
  const after = Number(params.after);
  const wait = Number(params.wait);
  const agent = scopeOf(ctx.caller);
  const since = () => responsesAfter(ledger.state(), board, after, agent);
  const wake = (e: LedgerEvent) => wakes(ledger.state(), board, e, agent);
  if (wait > 0 && !since().some(wake)) {
    if (!(await hold(ctx, wait, wake))) return;
  }
  const { list, more } = page(since(), params.limit);
  sendJson(res, 200, { responses: list, head: ledger.state().seq, ...(more && { more }) });
};

/** Ledger lines after `after`, oldest first, optionally one board's; JSON, or JSON Lines when
 * the caller asks for `application/jsonl` (api.md 44). */
const readLedger: Handler = ({ req, res, params, ledger }) => {
  const s = ledger.state();
  const board = params.board === undefined ? undefined : requireBoard(s, params.board);
  const after = Number(params.after);
  const lines = ledger.events().filter((e) => e.seq > after && (board === undefined || eventBoard(s, e) === board));
  const { list, more } = page(lines, params.limit);
  if (wantsJsonLines(req)) return sendJsonLines(res, list);
  sendJson(res, 200, { events: list, head: s.seq, ...(more && { more }) });
};

/** Server-sent `change` events with `{ seq }` on every append, and a comment every 20 s. */
const watchBoard: Handler = ({ res, params, ledger }) => {
  requireBoard(ledger.state(), params.board);
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  res.write('retry: 2000\n\n');
  const off = ledger.onAppend((e) => res.write(`event: change\ndata: ${JSON.stringify({ seq: e.seq })}\n\n`));
  const beat = setInterval(() => res.write(': beat\n\n'), 20000);
  res.on('close', () => { off(); clearInterval(beat); });
};

export const READS = {
  list_boards: listBoards, get_board: getBoard, show_node: showNode, show_container: showContainer,
  list_open: listOpen, check_responses: checkResponses, read_ledger: readLedger, watch_board: watchBoard,
} satisfies Record<string, Handler>;
