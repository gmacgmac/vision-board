// The fixture behind the gallery: a real project ledger in the real schema (rule 11), read
// through the same checks and folds the live board uses. Nothing here is hand-written markup.
import type { View } from '../../../../packages/format/src/index.ts';
import { boardView, readLedger } from '../../../../packages/format/src/index.ts';
import type { BoardAccess, BoardState } from '../../../../packages/actions/src/index.ts';
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import { boardAccess, boardState, foldLedger, pendingItems } from '../../../../packages/actions/src/index.ts';
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

export interface Fixture {
  view: View;
  state: BoardState;
  /** Open grant requests and each region's holders, as `get_board` gives them. */
  access: BoardAccess;
  /** The notes board, for the note pin, the "Your note" block and the note bubble. */
  notes: { view: View; state: BoardState };
  /** The containers board (3_FE_04): container notes before and after a Send, and a moved container. */
  containers: Containers;
  containerNotes: Containers;
}

/** A board of container samples; `owed` as the board page reads it (region-notes.ts owedRegions). */
export interface Containers { view: View; state: BoardState; owed: ReadonlySet<string> }

function containers(ledger: LedgerState, board: string): Containers {
  const owed = new Set(pendingItems(ledger, board).flatMap((p) => (p.region === undefined ? [] : [p.region])));
  return { view: boardView(ledger, board), state: boardState(ledger, board), owed };
}

/** Fails loudly on a bad fixture: a gallery drawn from invalid data would prove nothing. */
export function loadFixture(): Fixture {
  const { events, problems } = readLedger(ledgerText.split('\n'));
  if (problems.length) throw new Error(`gallery.ledger.jsonl: ${problems.join('; ')}`);
  const ledger = foldLedger(events);
  return {
    view: boardView(ledger, BOARD), state: boardState(ledger, BOARD), access: boardAccess(ledger, BOARD),
    notes: { view: boardView(ledger, NOTES_BOARD), state: boardState(ledger, NOTES_BOARD) },
    containers: containers(ledger, CONTAINERS_BOARD), containerNotes: containers(ledger, CONTAINER_NOTES_BOARD),
  };
}
