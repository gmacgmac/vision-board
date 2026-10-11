// The read operations (api.md Operations, 31, 41, 43, 44, 78-80, 133): every answer carries `head`,
// the ledger's latest `seq`. The shapes are built by packages/actions (and `show_layout`'s by
// packages/layout); nothing is folded here. A read
// that sends a Bearer secret is scoped to that agent (`list_open`, `check_responses`, api.md 41).
import type { LedgerEvent } from '../../../packages/format/src/index.ts';
import { boardView, containerKey, latest, nodesOf, toLine, widthsOf } from '../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../packages/actions/src/index.ts';
import {
  boardAccess, boardList, boardState, containerDetail, containerJson, eventBoard, linkedDetails, nodeDetail, numberOf, openContainers, openItems,
  placedView, responsesAfter, responsesPage,
} from '../../../packages/actions/src/index.ts';
import { structureOf } from '../../../packages/layout/src/index.ts';
import { cardOn } from './edge.ts';
import { openName } from './caller-folder.ts';
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

const listBoards: Handler = ({ res, ledger, project }) => {
  const s = ledger.state();
  sendJson(res, 200, { project: openName(project), boards: boardList(s), head: s.seq });
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
      ...(st.widths.size > 0 && { widths: Object.fromEntries(st.widths) }),
      ...(st.sizes.size > 0 && { sizes: Object.fromEntries(st.sizes) }),
      ...(st.moves.size > 0 && { moves: Object.fromEntries(st.moves) }),
      ...containerJson(st),
    },
    versions: Object.fromEntries(nodesOf(s, id).map((x) => [String(numberOf(s, x.id)), latest(x).ver])),
    ...boardAccess(s, id),
  });
};

const showNode: Handler = ({ res, params, ledger }) => {
  const s = ledger.state();
  const board = requireBoard(s, params.board);
  const n = Number(params.n);
  const id = cardOn(s, board, n);
  const detail = id === undefined ? undefined : nodeDetail(s, id);
  if (id === undefined || !detail) {
    throw problem('not-found', `There is no node ${n} on board "${board}". Call get_board to see its nodes.`);
  }
  sendJson(res, 200, { head: s.seq, ...detail, ...(params.linked === true && { linked: linkedDetails(s, id) }) });
};

const showContainer: Handler = ({ res, params, ledger }) => {
  const s = ledger.state();
  const board = requireBoard(s, params.board);
  const region = String(params.region);
  const detail = containerDetail(s, board, region);
  if (!detail) throw problem('not-found', `There is no region "${region}" on board "${board}". Call get_board to see its regions.`);
  sendJson(res, 200, { head: s.seq, ...detail });
};

/** How the board arranges one container (api.md 133), structure only: the cards in it now (the
 * person's moves count, retired cards are out) in card order, the links between them, the mode the
 * board shows and the card widths in effect, worked out by the layout package as the page lays them
 * out. Board numbers out: a View node's id is its number. A retired container, like an unknown one
 * or the built-in Later, is `not-found`: nothing is arranged in it. */
const showLayout: Handler = ({ res, params, ledger }) => {
  const s = ledger.state();
  const board = requireBoard(s, params.board);
  const region = String(params.region);
  const drawn = boardView(s, board);
  const r = drawn.regions.find((x) => x.id === region);
  if (!r) {
    throw problem('not-found', s.retiredRegions.has(containerKey(board, region))
      ? `Container "${region}" on board "${board}" was retired, so nothing is arranged in it. Call get_board to see its regions.`
      : `There is no region "${region}" on board "${board}". Call get_board to see its regions.`);
  }
  const st = boardState(s, board);
  const view = placedView(drawn, st);
  const mode = st.modes.get(region) ?? r.mode;
  const widths = widthsOf(mode, r.widths, st.widths.get(region));
  const out = structureOf(r, view.nodes.filter((n) => n.region === region), view.links, mode, widths);
  sendJson(res, 200, {
    head: s.seq, board, region, mode, widths, ...(out.lanes && { lanes: out.lanes }), columns: out.columns,
    cards: out.cards.map(({ id, ...cell }) => ({ n: Number(id), ...cell })), links: out.links, crossing: out.crossing, empty: out.empty,
  });
};

/** The agent a scoped read is for: the Bearer caller, if any (api.md 41). */
const scopeOf = (caller: Ctx['caller']): string | undefined => (caller?.by === 'agent' ? caller.agent : undefined);

const listOpen: Handler = ({ res, params, ledger, caller }) => {
  const s = ledger.state();
  const board = requireBoard(s, params.board);
  const containers = openContainers(s, board, scopeOf(caller));
  sendJson(res, 200, { head: s.seq, items: openItems(s, board, scopeOf(caller)), ...(containers.length > 0 && { containers }) });
};

/** A person act that ends a `check_responses` wait on `board`: Send, or an answer to a grant
 * request on it (api.md Operations); for a scoped caller, only one that concerns it. */
const wakes = (s: LedgerState, board: string, e: LedgerEvent, agent: string | undefined): boolean =>
  e.type === 'act' && (e.action === 'send' || e.action === 'grant' || e.action === 'deny') && eventBoard(s, e) === board &&
  (agent === undefined || responsesAfter(s, board, e.seq - 1, agent).some((x) => x.seq === e.seq));

/** Hold until `stop` says so, `seconds` pass, the caller goes away or the folder closes (a switch,
 * api.md 111). True if the caller is still there. */
function hold({ res, ledger, closed }: Ctx, seconds: number, stop: (e: LedgerEvent) => boolean): Promise<boolean> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      off();
      res.off('close', done);
      closed.removeEventListener('abort', done);
      resolve(!res.destroyed && !res.writableEnded);
    };
    const timer = setTimeout(done, seconds * 1000);
    const off = ledger.onAppend((e) => { if (stop(e)) done(); });
    res.on('close', done);
    closed.addEventListener('abort', done);
  });
}

/** The person's acts after `after`, each batch in card order (api.md 120: `responsesPage`). With
 * `wait`, the call is held until a Send or a grant answer on this board, unless one is already
 * there; when the wait runs out the answer is whatever came after `after` (often
 * `{ responses: [], head }`), so a comment is never skipped by the cursor. */
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
  const s = ledger.state();
  sendJson(res, 200, { ...responsesPage(s, board, after, Number(params.limit), agent), head: s.seq });
};

/** Ledger lines after `after`, oldest first, optionally one board's, as the file holds them (cards
 * by identity, flags included): the page's only (api.md 130). JSON, or JSON Lines when the caller
 * asks for `application/jsonl` (api.md 44). */
const readLedger: Handler = ({ req, res, params, ledger }) => {
  const s = ledger.state();
  const board = params.board === undefined ? undefined : requireBoard(s, params.board);
  const after = Number(params.after);
  const lines = ledger.events().filter((e) => e.seq > after && (board === undefined || eventBoard(s, e) === board)).map(toLine);
  const { list, more } = page(lines, params.limit);
  if (wantsJsonLines(req)) return sendJsonLines(res, list);
  sendJson(res, 200, { events: list, head: s.seq, ...(more && { more }) });
};

type Send = (event: string, data: object) => void;

/** A server-sent event stream (api.md 44): `retry` first, `change { seq }` on every append, a
 * comment every 20 s. `more` adds other events and returns their off switches. It ends when the
 * folder closes (a switch, api.md 111), so the page reconnects to the new folder. */
function stream({ res, ledger, closed }: Ctx, more: (send: Send) => (() => void)[] = () => []): void {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  res.write('retry: 2000\n\n');
  const send: Send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const offs = [ledger.onAppend((e) => send('change', { seq: e.seq })), ...more(send)];
  const beat = setInterval(() => res.write(': beat\n\n'), 20000);
  endWhenClosed(res, closed);
  res.on('close', () => { for (const off of offs) off(); clearInterval(beat); });
}

/** End a stream when its folder closes. */
export function endWhenClosed(res: Ctx['res'], closed: AbortSignal): void {
  const end = () => res.end();
  closed.addEventListener('abort', end, { once: true });
  res.on('close', () => closed.removeEventListener('abort', end));
}

/** One board's stream; refused with `not-found` for an unknown board. */
const watchBoard: Handler = (ctx) => {
  requireBoard(ctx.ledger.state(), ctx.params.board);
  stream(ctx);
};

/** The whole project's stream, which answers on an empty project too. In watch mode it also sends
 * `build { build }` on connect and whenever the page is rebuilt (api.md 78-80). */
const watchProject: Handler = (ctx) => stream(ctx, (send) => {
  const { build } = ctx;
  if (!build) return [];
  send('build', { build: build.id() });
  return [build.onChange((id) => send('build', { build: id }))];
});

export const READS = {
  list_boards: listBoards, get_board: getBoard, show_node: showNode, show_container: showContainer, show_layout: showLayout,
  list_open: listOpen, check_responses: checkResponses, read_ledger: readLedger, watch_board: watchBoard,
  watch_project: watchProject,
} satisfies Record<string, Handler>;
