// What the page draws, worked out from the ledger state it holds (N12_FE_01 ruling 2): the page
// reads `read_ledger` once when it opens, folds it with the shared action layer (packages/actions),
// and applies each later line to the same state, so it never re-fetches a board to show one event.
// `boardData` is `get_board`'s answer from that state, built from the same reads the server uses
// (apps/board/server/reads.ts `getBoard`); a test holds the two equal. `pageConditions` is what needs
// the person's attention, from the conditions table (attention.ts shows it). Pure: no DOM, no network.
import type { LedgerEvent } from '../../../../packages/format/src/index.ts';
import { boardView, LEDGER_FORMAT, latest, nodesOf } from '../../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import { boardAccess, boardState, conditionsOf, DECIDED, statusOf } from '../../../../packages/actions/src/index.ts';
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

/** A board's mark in the picker: `board.new` or `board.changed`. */
export type BoardMark = 'new' | 'changed';

/** An open proposal on the open board: its card, its line, and whether the card changed since. */
export interface ProposalFound { n: number; seq: number; stale: boolean }

/** What needs the person's attention with `board` open, by the conditions table's rows: `marks`,
 * each other board's picker mark (`board.new`, `board.changed`); `owed`, the containers badged
 * (`container.owed`); `requests`, the open grant requests' lines (`grant.requested`); `drawn`, the
 * agent's last drawing line not yet seen (`board.drawn`); `proposals`, the agent's proposals not yet
 * answered (`proposal.open`, `proposal.stale`); `fresh`, the items the agent added in the board's
 * latest round and the person has not seen (`item.new`); `unseen`, the items whose latest version
 * the person has not seen (`item.unseen`), but a `fresh` one (NEW only); `awaiting`, the items in Later whose handover the agent still owes
 * (`item.awaiting`). Lines, so a batch's news can be told. */
export interface PageConditions {
  marks: Record<string, BoardMark>;
  owed: Set<string>;
  requests: number[];
  drawn?: number;
  proposals: ProposalFound[];
  fresh: Set<number>;
  unseen: Set<number>;
  awaiting: Set<number>;
}

export function pageConditions(s: LedgerState, board: string): PageConditions {
  const out: PageConditions = { marks: {}, owed: new Set(), requests: [], proposals: [], fresh: new Set(), unseen: new Set(), awaiting: new Set() };
  for (const c of conditionsOf(s, { board })) {
    if (c.kind === 'board.new' || c.kind === 'board.changed') out.marks[c.board] = c.kind === 'board.new' ? 'new' : 'changed';
    else if (c.kind === 'container.owed') out.owed.add(c.container!);
    else if (c.kind === 'grant.requested') out.requests.push(c.seq!);
    else if (c.kind === 'board.drawn') out.drawn = c.seq!;
    else if (c.kind === 'item.new') out.fresh.add(c.n!);
    else if (c.kind === 'item.unseen') out.unseen.add(c.n!);
    else if (c.kind === 'item.awaiting') out.awaiting.add(c.n!);
    else if (c.kind === 'proposal.open' || c.kind === 'proposal.stale') out.proposals.push({ n: c.n!, seq: c.seq!, stale: c.kind === 'proposal.stale' });
  }
  for (const n of out.fresh) out.unseen.delete(n);
  return out;
}

/** Whether the page can apply a line in place: a format it knows. A newer one makes the page read
 * the whole ledger again (a full fetch, counted). */
export const canApply = (e: LedgerEvent): boolean => e.v <= LEDGER_FORMAT;
