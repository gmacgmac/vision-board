// Words: board. The board page's own text: its heading, status, empty states and errors.
// Keys: board.board.<name>. Plain code: no imports but other words files and types.

// ---- chat-side.ts
export const showInTheChat = 'Show in the chat';

// ---- controller.ts
export const theAgentDrewV = (version: number | null): string => `The agent drew v${version}`;
export const thoseCardsAreNoLonger = 'Those cards are no longer on the board.';
export const thatNoteIsNoLonger = 'That note is no longer on the board.';
export const theChatCouldNotSend = 'The chat could not send this.';

// ---- io.ts
export const theBoardServerIsNot = 'The board server is not reachable. Is it running?';

// ---- mount.ts
export const itemsInNumberOrder = 'Items, in number order';
export const linkLabels = 'Link labels';

// ---- render.ts
export const dropACardHereTo = 'Drop a card here to save it for later.';

// ---- status.ts
export const visionBoard = 'Vision Board';
