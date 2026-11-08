// Words: change. The line a host's chat draws for a board write (docs/specification/plugin.md § Tools, the change line):
// the write's `_meta['plugin/change']` names one of these by key, and the host fills `{count}` (the cards changed) and
// `{subject}` (the board's id) itself, so each is fixed text with its two slots, not a function. The manifest lists the
// keys as `changeWords`. Word for word the lines a host already stores for the board, so an old line and a new one read
// the same (plugin-contract PLAN decision 6). Keys: vision-board.change.<name>. Plain code: no imports.

/** A write that changed the board but no card. */
export const board = 'Changed board “{subject}”';
/** A write that changed one card. */
export const card = 'Changed a card on board “{subject}”';
/** A write that changed more than one card. */
export const cards = 'Changed {count} cards on board “{subject}”';
