// The fixture behind the gallery: a real project ledger in the real schema (rule 11), read
// through the same checks and folds the live board uses. Nothing here is hand-written markup.
import type { View } from '../../../../packages/format/src/index.ts';
import { boardView, readLedger } from '../../../../packages/format/src/index.ts';
import type { AccessHolder, BoardAccess, BoardRun, BoardState } from '../../../../packages/actions/src/index.ts';
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import { boardAccess, boardState, boardVersions, foldLedger } from '../../../../packages/actions/src/index.ts';
import { pageConditions } from '../board/board-data.ts';
import type { ProposalRow } from '../board/proposals.ts';
import { proposalRows } from '../board/proposals.ts';
import { versionTime } from '../board/versions.ts';
import type { CardConditions, CardReply, CardUpdates } from '../../../../packages/ui/src/index.ts';
import { createParking } from '../board/parking.ts';
import { unseenCount, unseenSteps } from '../board/updates.ts';
import type { RetiredCount } from '../board/retired.ts';
import { retiredCounts } from '../board/retired.ts';
import ledgerText from './gallery.ledger.jsonl?raw';

/** The main board in the fixture ledger. */
export const BOARD = 'gallery';
/** The board the note samples use (2e_FE_01): its own, because a Send is per board, and its
 * Sends make some notes history while leaving the main board's notes not yet sent. */
export const NOTES_BOARD = 'notes';
/** The board the container samples use (3_FE_04): its own, so its Send leaves the other boards' notes as they are. */
export const CONTAINERS_BOARD = 'containers';
/** The container note states the containers board cannot hold beside its own (step 4G): an
 *  answered note (its own Send and the agent's reply), a long note and a narrow frame. */
export const CONTAINER_NOTES_BOARD = 'container-notes';
/** The regions whose nodes the node section shows. The `frame-*` regions are the region section's. */
export const REGION_KINDS = 'kinds';
export const REGION_OTHER = 'other';
/** The region whose nodes the Markdown section shows: one card per construct, one with everything. */
export const REGION_MARKDOWN = 'markdown';
/** The region whose nodes the Node size section shows (nodeSize flag only). */
export const REGION_SIZES = 'sizes';
export const FRAME_PREFIX = 'frame-';
/** The agent access section's frames (agentAccess flag): created by one agent, granted to another. */
export const REGIONS_HELD = ['held', 'held-hover'] as const;
/** The board the proposals samples use (proposals flag, FE_01): an open proposal, one out of date,
 *  two on one card and one at rest. */
export const PROPOSALS_BOARD = 'proposals';
/** The board the changed cards samples use (cardUpdates flag, FE_02): two cards seen at version 1
 *  and changed three times since, one with a proposal now out of date, one never seen and
 *  changed once, and one the agent added after the person first opened the board (NEW, FE_01 of the Stage 5 follow-ups). */
export const UPDATES_BOARD = 'updates';
/** The board the parking and replies samples use (handover and cardReplies flags, FE_03): a card
 *  awaiting its handover, one with it written, one with a reply under its note, one with a reply that
 *  names no note. */
export const PARKING_BOARD = 'parking';
/** The board the flag and retired samples use (field report batch 2, cardFlag and retiredMarker flags):
 *  a container of three cards, two flagged by the person (one redrawn since), and a container two
 *  cards were retired from, one at a time, after the person had answered on the board. */
export const MARKS_BOARD = 'marks';
/** The board the layout samples use (field report batch 3, FE_01): a flow whose links' labels fit
 *  or do not, a row of cards of three heights, and two columns of S, M and L cards, one under the
 *  column's default (match) and one the person set to own widths. */
export const LAYOUT_BOARD = 'layout';

export interface Fixture {
  view: View;
  state: BoardState;
  /** Open grant requests and each region's holders, as `get_board` gives them. */
  access: BoardAccess;
  /** The notes board's holders (D-034): its creator and an agent the person granted the board. */
  boardAgents: AccessHolder[];
  /** The notes board, for the note pin, the "Your note" block and the note bubble. */
  notes: { view: View; state: BoardState };
  /** The containers board (3_FE_04): container notes before and after a Send, and a moved container. */
  containers: Containers;
  containerNotes: Containers;
  /** The main board's latest past version (`boardVersions`), for the past-version banner. */
  pastVersion: BoardRun;
  /** The proposals board, with its open proposals as the page reads them (proposal-flow.ts). */
  proposals: { view: View; state: BoardState; rows: ProposalRow[] };
  /** The changed cards board, with each card's updates and every step, as the page reads them (update-flow.ts). */
  updates: { view: View; state: BoardState; cards: Map<number, Required<Pick<CardUpdates, 'count' | 'steps'>>>; rows: ProposalRow[]; fresh: ReadonlySet<number> };
  /** The parking board, with each card's awaiting, handover and replies as the page reads them (parking.ts), and the
   *  replies that answer container notes (the container notes board's "Answered" one). */
  parking: { view: View; state: BoardState; cards: Map<number, CardConditions>; containerReplies: readonly CardReply[] };
  /** The marks board, with each container's "N cards retired" marker as the page works it out (retired.ts). */
  marks: { view: View; state: BoardState; retired: ReadonlyMap<string, RetiredCount> };
  /** The whole ledger folded, as the board holds it: the Remove samples' confirm words (remove-words.ts). */
  ledger: LedgerState;
  /** The layout board, drawn through the board's own drawing (mini-board.ts). */
  layout: { view: View; state: BoardState };
  /** The main board's cards the agent's answer to a note cleared (D-045, answer-model ruling 7), by
   *  board number: their "1 update" tab and the reply under the note, as the page reads them. */
  cleared: Map<number, CardConditions>;
}

/** Card conditions for `board`'s cards the agent's reply cleared, as update-flow.ts and parking.ts give them. */
function clearedCards(ledger: LedgerState, board: string): Map<number, CardConditions> {
  const parking = createParking({ handover: false, replies: true, state: () => ledger, board: () => board, awaiting: () => new Set(), readOnly: () => false });
  parking.refresh();
  const state = boardState(ledger, board);
  return new Map(boardView(ledger, board).nodes.flatMap((n) => (n.n === undefined || !state.items.get(n.id)?.unseenAnswer ? []
    : [[n.n, { updates: { count: unseenCount(ledger, board, n.n) }, replies: parking.card(n).replies ?? [] }] as const])));
}

/** A board of container samples; `owed` as the board page reads it (board-data.ts `pageConditions`). */
export interface Containers { view: View; state: BoardState; owed: ReadonlySet<string> }

function containers(ledger: LedgerState, board: string): Containers {
  return { view: boardView(ledger, board), state: boardState(ledger, board), owed: pageConditions(ledger, board).owed };
}

/** Fails loudly on a bad fixture: a gallery drawn from invalid data would prove nothing. */
export function loadFixture(): Fixture {
  const { events, problems } = readLedger(ledgerText.split('\n'));
  if (problems.length) throw new Error(`gallery.ledger.jsonl: ${problems.join('; ')}`);
  const ledger = foldLedger(events);
  const parking = createParking({
    handover: true, replies: true, state: () => ledger, board: () => PARKING_BOARD, awaiting: () => pageConditions(ledger, PARKING_BOARD).awaiting, readOnly: () => false,
  });
  parking.refresh();
  const parkingView = boardView(ledger, PARKING_BOARD);
  return {
    view: boardView(ledger, BOARD), state: boardState(ledger, BOARD), access: boardAccess(ledger, BOARD),
    boardAgents: boardAccess(ledger, NOTES_BOARD).boardHolders ?? [],
    notes: { view: boardView(ledger, NOTES_BOARD), state: boardState(ledger, NOTES_BOARD) },
    containers: containers(ledger, CONTAINERS_BOARD), containerNotes: containers(ledger, CONTAINER_NOTES_BOARD),
    pastVersion: boardVersions(ledger, BOARD)!.past[0]!,
    proposals: {
      view: boardView(ledger, PROPOSALS_BOARD), state: boardState(ledger, PROPOSALS_BOARD),
      rows: proposalRows(ledger, pageConditions(ledger, PROPOSALS_BOARD).proposals, versionTime),
    },
    updates: {
      view: boardView(ledger, UPDATES_BOARD), state: boardState(ledger, UPDATES_BOARD),
      cards: new Map([...pageConditions(ledger, UPDATES_BOARD).unseen].map((n) =>
        [n, { count: unseenCount(ledger, UPDATES_BOARD, n), steps: unseenSteps(ledger, UPDATES_BOARD, n, versionTime) }])),
      rows: proposalRows(ledger, pageConditions(ledger, UPDATES_BOARD).proposals, versionTime),
      fresh: pageConditions(ledger, UPDATES_BOARD).fresh,
    },
    marks: { view: boardView(ledger, MARKS_BOARD), state: boardState(ledger, MARKS_BOARD), retired: retiredCounts(ledger, MARKS_BOARD) },
    ledger,
    layout: { view: boardView(ledger, LAYOUT_BOARD), state: boardState(ledger, LAYOUT_BOARD) },
    cleared: clearedCards(ledger, BOARD),
    parking: {
      view: parkingView, state: boardState(ledger, PARKING_BOARD), containerReplies: parking.containers(),
      cards: new Map(parkingView.nodes.flatMap((n) => (n.n === undefined ? [] : [[n.n, parking.card(n)] as const]))),
    },
  };
}
