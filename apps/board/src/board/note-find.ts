// The note a press edits rather than adds (split out of notes.ts): a card, a group of cards and a
// container each hold at most one note not yet history (sent or answered, popovers-larger-thread
// ruling 5), and a press on it opens that note. Pure lookups over the board state.
import type { BoardState, ItemNote } from '../../../../packages/actions/src/index.ts';

/** The card's own note not yet history (`locked`: sent or answered, ruling 5), if any. A note on a group of
 * cards is not the card's own (3_FE_02 ruling 3), so C on the card starts its own note. */
export const unsentNote = (s: BoardState, id: string): ItemNote | undefined =>
  s.items.get(id)?.notes.find((x) => !x.locked && !x.nodes);

/** The note not yet sent on exactly this group of cards, if there is one. */
export const unsentGroupNote = (s: BoardState, ids: readonly string[]): ItemNote | undefined => {
  const key = [...ids].map(Number).sort((a, b) => a - b).join(',');
  return s.items.get(ids[0]!)?.notes.find((x) => !x.locked && x.nodes && [...x.nodes].sort((a, b) => a - b).join(',') === key);
};

/** The container's note not yet sent, if it has one (3_FE_04 ruling 2: at most one). */
export const unsentRegionNote = (s: BoardState, region: string): ItemNote | undefined =>
  s.regionNotes.get(region)?.find((x) => !x.locked);
