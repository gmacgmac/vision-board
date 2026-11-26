// Words: commands. Tooltips of the board's commands (name and what they do).
// Keys: vision-board.commands.<name>. Plain code: no imports but other words files and types.

// ---- commands.ts
export const zoomOut = 'Zoom out';
export const zoomIn = 'Zoom in';
export const comment = 'Comment';
export const moveTo = 'Move to';
export const resetPlaces = 'Reset places';
export const remove = 'Remove';
export const removeTheSelectedCards = 'Remove the selected cards';
export const removeCards = 'Remove cards';
export const zoomToTheSelection = 'Zoom to the selection';
export const zoomToThisArea = 'Zoom to this area';
export const commentOnContainer = 'Comment on container';
export const goToACardBy = 'Go to a card by its number';
export const shift = 'Shift';
export const now = (commandTitle: string, percent: number): string => `${commandTitle} · ${percent}% now`;

// ---- the bar's commands with the node's edges (commands.ts, bar-acts.ts; FE_06)
export const bookmarkAll = 'Bookmark all';
export const removeBookmarks = 'Remove bookmarks';
export const bookmarkTheSelectedNodes = 'Bookmark the selected nodes';
export const removeTheBookmarks = 'Remove the bookmarks of the selected nodes';
export const saveForLater = 'Save for later';
export const saveTheSelectedNodesForLater = 'Save the selected nodes for later';
export const width = 'Width';
export const setTheWidthOfTheSelectedNodes = 'Set the width of the selected nodes';
export const widthOf = (count: number): string => `Width of ${count} node${count === 1 ? '' : 's'}`;
/** A width row's visible letters, and its accessible name. */
export const widthRow = (size: string): string => (size === 'auto' ? 'Auto' : size.toUpperCase());
export const widthName = (size: string): string => ({ s: 'Small', m: 'Medium', l: 'Large', xl: 'Extra large', auto: 'Automatic' })[size] ?? size;
export const nodesBookmarked = (count: number): string => `${count} bookmarked`;
export const bookmarksRemoved = (count: number): string => `${count} bookmark${count === 1 ? '' : 's'} removed`;
export const nodesSavedForLater = (count: number): string => `${count} saved for later`;
export const noneCanBeSavedForLater = 'None of the selected nodes can be saved for later.';
export const widthSet = (count: number, size: string): string => `${count} node${count === 1 ? '' : 's'} set to ${size}`;
// ---- selection-flow.ts: why the selection grid's acting cells are off, after its count ("1 selected · locked"); the
// toolbar's "Locked" and "Past version" and the read-only chip, as the end of a label.
export const selectionLocked = 'locked';
export const selectionReadOnly = 'read-only';
export const selectionPastVersion = 'past version';

