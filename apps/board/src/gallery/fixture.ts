// The fixture behind the gallery: a real project ledger in the real schema (rule 11), read
// through the same checks and folds the live board uses. Nothing here is hand-written markup.
import type { View } from '../../../../packages/format/src/index.ts';
import { boardView, readLedger } from '../../../../packages/format/src/index.ts';
import type { BoardAccess, BoardState } from '../../../../packages/actions/src/index.ts';
import { boardAccess, boardState, foldLedger } from '../../../../packages/actions/src/index.ts';
import ledgerText from './gallery.ledger.jsonl?raw';

/** The one board in the fixture ledger. */
export const BOARD = 'gallery';
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
}

/** Fails loudly on a bad fixture: a gallery drawn from invalid data would prove nothing. */
export function loadFixture(): Fixture {
  const { events, problems } = readLedger(ledgerText.split('\n'));
  if (problems.length) throw new Error(`gallery.ledger.jsonl: ${problems.join('; ')}`);
  const ledger = foldLedger(events);
  return { view: boardView(ledger, BOARD), state: boardState(ledger, BOARD), access: boardAccess(ledger, BOARD) };
}
