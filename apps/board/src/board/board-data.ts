// What the page draws, worked out from the ledger state it holds (N12_FE_01 ruling 2): the page
// reads `read_ledger` once when it opens, folds it with the shared action layer (packages/actions),
// and applies each later line to the same state, so it never re-fetches a board to show one event.
// `boardData` is `get_board`'s answer from that state, built from the same reads the server uses
// (apps/board/server/reads.ts `getBoard`); a test holds the two equal. Pure: no DOM, no network.
import type { LedgerEvent } from '../../../../packages/format/src/index.ts';
import { boardView, LEDGER_FORMAT, latest, nodesOf } from '../../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import { boardAccess, boardState, DECIDED, eventBoard, statusOf } from '../../../../packages/actions/src/index.ts';
import type { BoardData } from './io.ts';

/** One board as the page draws it, from the held state. */
export function boardData(s: LedgerState, board: string): BoardData {
  return {
    head: s.seq,
    view: boardView(s, board),
    state: boardState(s, board),
    versions: Object.fromEntries(nodesOf(s, board).map((x) => [String(x.n), latest(x).ver])),
    access: boardAccess(s, board),
  };
}

/** The board's decided items: what "Hide decided" leaves out. */
export const decidedIds = (d: BoardData): Set<string> =>
  new Set(d.view.nodes.filter((n) => DECIDED.has(statusOf(d.state, n.id))).map((n) => n.id));

/** The agent's drawing lines: what "the agent drew" means on the page. */
const DRAWING: ReadonlySet<LedgerEvent['type']> = new Set(['board', 'region', 'node', 'link', 'unlink']);

/** Whether a batch of lines, already applied to `s`, changed what the agent drew on `board`. */
export const drewOn = (s: LedgerState, events: readonly LedgerEvent[], board: string): boolean =>
  events.some((e) => DRAWING.has(e.type) && eventBoard(s, e) === board);

/** Whether the page can apply a line in place: a format it knows. A newer one makes the page read
 * the whole ledger again (a full fetch, counted). */
export const canApply = (e: LedgerEvent): boolean => e.v <= LEDGER_FORMAT;
