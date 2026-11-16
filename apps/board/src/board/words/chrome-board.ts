// Words: chrome-board. The board page's own text: its heading, status, empty states and errors.
// Keys: vision-board.chrome-board.<name>. Plain code: no imports but other words files and types.

// ---- App.svelte
export const skipToTheBoard = 'Skip to the board';
export const theBoardIsNotReady = 'The board is not ready yet.';

// ---- lazy.ts (chrome/Lazy.svelte): a dialog whose code did not load, most often because the board was updated
export const partDidNotLoad = 'That part of the page did not load. Reload the page to get it.';
