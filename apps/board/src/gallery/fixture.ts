// The fixture behind the gallery: a real project ledger in the real schema (rule 11), read
// through the same checks and folds the live board uses. Nothing here is hand-written markup.
import type { View } from '../../../../packages/format/src/index.ts';
import { boardView, readLedger } from '../../../../packages/format/src/index.ts';
import type { BoardState } from '../../../../packages/actions/src/index.ts';
import { boardState, foldLedger } from '../../../../packages/actions/src/index.ts';
import ledgerText from './gallery.ledger.jsonl?raw';

/** The one board in the fixture ledger. */
export const BOARD = 'gallery';
/** The regions whose nodes the node section shows. The `frame-*` regions are the region section's. */
export const REGION_KINDS = 'kinds';
export const REGION_OTHER = 'other';
export const FRAME_PREFIX = 'frame-';

export interface Fixture {
  view: View;
  state: BoardState;
}

/** Fails loudly on a bad fixture: a gallery drawn from invalid data would prove nothing. */
export function loadFixture(): Fixture {
  const { events, problems } = readLedger(ledgerText.split('\n'));
  if (problems.length) throw new Error(`gallery.ledger.jsonl: ${problems.join('; ')}`);
  const ledger = foldLedger(events);
  return { view: boardView(ledger, BOARD), state: boardState(ledger, BOARD) };
}
