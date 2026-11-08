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
