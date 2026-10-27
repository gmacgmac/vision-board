// The read operations (api.md Operations, 31, 41, 43, 44, 133): every answer carries `head`, the
// ledger's latest `seq`. The shapes are built by packages/actions (`get_board`'s with the page's own
// `boardData`) and packages/layout (`show_layout`'s); nothing is folded here. A read with an agent
// caller is scoped to that agent (`list_open`, `check_responses`, api.md 41). Every read naming a
// board an agent may call names it through `requireBoard` (visibility.ts), so an archived board is
// not found (api.md 136); `read_ledger` is the person's and names any board. The change streams are
// the host's (the standalone server's streams.ts, from `watch`).
import type { LedgerEvent } from '#format';
import { boardView, containerKey, toLine, widthsOf } from '#format';
import type { LedgerState } from '#actions';
import {
  boardData, boardJson, boardList, boardState, containerDetail, eventBoard, linkedDetails, nodeDetail, openContainers, openItems,
  placedView, responsesAfter, responsesPage,
} from '#actions';
import { structureOf } from '#layout';
import { cardOn } from '../edge.ts';
import { problem } from '../problem.ts';
import { isLocked, personBoard, requireBoard } from '../visibility.ts';
import type { OpCtx, Op } from './operations.ts';
import { reply } from './operations.ts';
import * as writesWords from '../words/writes.ts';

/** At most `limit` of `list`, and `more: true` when it was cut (api.md 31). */
function page<T>(list: readonly T[], limit: unknown): { list: T[]; more?: true } {
  const max = Number(limit);
  return { list: list.slice(0, max), ...(list.length > max && { more: true as const }) };
}

const listBoards: Op = ({ ledger, name }) => {
  const s = ledger.state();
  return reply(200, { project: name(), boards: boardList(s), head: s.seq });
};

const getBoard: Op = ({ params, ledger }) => {
  const s = ledger.state();
  const id = requireBoard(s, params.board);
  // The page draws the same `boardData`; `locked` is the server's (api.md 139): read-only for everyone until the person unlocks it.
  return reply(200, { ...boardJson(boardData(s, id)), ...(isLocked(s, id) && { locked: true }) });
};

const showNode: Op = ({ params, ledger }) => {
  const s = ledger.state();
  const board = requireBoard(s, params.board);
  const n = Number(params.n);
  const id = cardOn(s, board, n);
  const detail = id === undefined ? undefined : nodeDetail(s, id);
  if (id === undefined || !detail) {
    throw problem('not-found', writesWords.thereIsNoNodeOn(n, board));
  }
  return reply(200, { head: s.seq, ...detail, ...(params.linked === true && { linked: linkedDetails(s, id) }) });
};

const showContainer: Op = ({ params, ledger }) => {
  const s = ledger.state();
  const board = requireBoard(s, params.board);
  const region = String(params.region);
  const detail = containerDetail(s, board, region);
  if (!detail) throw problem('not-found', writesWords.thereIsNoRegionOn(region, board));
  return reply(200, { head: s.seq, ...detail });
};

/** How the board arranges one container (api.md 133), structure only: the cards in it now (the
 * person's moves count, retired cards are out) in card order, the links between them, the mode the
 * board shows and the card widths in effect, worked out by the layout package as the page lays them
 * out. Board numbers out: a View node's id is its number. A retired container, like an unknown one
 * or the built-in Later, is `not-found`: nothing is arranged in it. */
const showLayout: Op = ({ params, ledger }) => {
  const s = ledger.state();
  const board = requireBoard(s, params.board);
  const region = String(params.region);
  const drawn = boardView(s, board);
  const r = drawn.regions.find((x) => x.id === region);
  if (!r) {
    throw problem('not-found', s.retiredRegions.has(containerKey(board, region))
      ? writesWords.containerOnBoardWasRetired(region, board)
      : writesWords.thereIsNoRegionOn(region, board));
  }
  const st = boardState(s, board);
  const view = placedView(drawn, st);
  const mode = st.modes.get(region) ?? r.mode;
  const widths = widthsOf(mode, r.widths, st.widths.get(region));
  const out = structureOf(r, view.nodes.filter((n) => n.region === region), view.links, mode, widths);
  return reply(200, {
    head: s.seq, board, region, mode, widths, ...(out.lanes && { lanes: out.lanes }), columns: out.columns,
    cards: out.cards.map(({ id, ...cell }) => ({ n: Number(id), ...cell })), links: out.links, crossing: out.crossing, empty: out.empty,
  });
};

/** The agent a scoped read is for: the agent caller, if any (api.md 41). */
const scopeOf = (caller: OpCtx['caller']): string | undefined => (caller?.by === 'agent' ? caller.agent : undefined);

const listOpen: Op = ({ params, ledger, caller }) => {
  const s = ledger.state();
  const board = requireBoard(s, params.board);
  const containers = openContainers(s, board, scopeOf(caller));
  return reply(200, { head: s.seq, items: openItems(s, board, scopeOf(caller)), ...(containers.length > 0 && { containers }) });
};

/** A person act that ends a `check_responses` wait on `board`: Send, or an answer to a grant
 * request on it (api.md Operations); for a scoped caller, only one that concerns it. */
const wakes = (s: LedgerState, board: string, e: LedgerEvent, agent: string | undefined): boolean =>
  e.type === 'act' && (e.action === 'send' || e.action === 'grant' || e.action === 'deny') && eventBoard(s, e) === board &&
  (agent === undefined || responsesAfter(s, board, e.seq - 1, agent).some((x) => x.seq === e.seq));

/** Hold until `stop` says so, `seconds` pass, or the host's signal ends it (the caller went away, the
 * folder closed: a switch, api.md 111). The ledger is followed meanwhile, so another writer's Send wakes it too. */
function hold({ ledger, signal }: OpCtx, seconds: number, stop: (e: LedgerEvent) => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const done = () => {
      clearTimeout(timer);
      off();
      unfollow();
      signal?.removeEventListener('abort', done);
      resolve();
    };
    const timer = setTimeout(done, seconds * 1000);
    const off = ledger.onAppend((e) => { if (stop(e)) done(); });
    const unfollow = ledger.follow();
    signal?.addEventListener('abort', done);
  });
}

/** The person's acts after `after`, each batch in card order (api.md 120: `responsesPage`). With
 * `wait`, the call is held until a Send or a grant answer on this board, unless one is already
 * there; when the wait runs out the answer is whatever came after `after` (often
 * `{ responses: [], head }`), so a comment is never skipped by the cursor. */
const checkResponses: Op = async (ctx) => {
  const { params, ledger } = ctx;
  const board = requireBoard(ledger.state(), params.board);
  const after = Number(params.after);
  const wait = Number(params.wait);
  const agent = scopeOf(ctx.caller);
  const since = () => responsesAfter(ledger.state(), board, after, agent);
  const wake = (e: LedgerEvent) => wakes(ledger.state(), board, e, agent);
  if (wait > 0 && !since().some(wake)) await hold(ctx, wait, wake);
  const s = ledger.state();
  requireBoard(s, board); // archived while the call waited: as if it never was
  return reply(200, { ...responsesPage(s, board, after, Number(params.limit), agent), head: s.seq });
};

/** Ledger lines after `after`, oldest first, optionally one board's, as the file holds them (cards
 * by identity, flags included): the page's only (api.md 130). The standalone host sends `events`
 * as JSON Lines when the caller asks for `application/jsonl` (api.md 44). */
const readLedger: Op = ({ params, ledger }) => {
  const s = ledger.state();
  const board = params.board === undefined ? undefined : personBoard(s, params.board);
  const after = Number(params.after);
  const lines = ledger.events().filter((e) => e.seq > after && (board === undefined || eventBoard(s, e) === board)).map(toLine);
  const { list, more } = page(lines, params.limit);
  return reply(200, { events: list, head: s.seq, ...(more && { more }) });
};

export const READS = {
  list_boards: listBoards, get_board: getBoard, show_node: showNode, show_container: showContainer, show_layout: showLayout,
  list_open: listOpen, check_responses: checkResponses, read_ledger: readLedger,
} satisfies Record<string, Op>;
