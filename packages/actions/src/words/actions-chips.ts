// Words: actions-chips. What a chip says (a card, a note, a board) and why one is refused.
// Keys: vision-board.actions-chips.<name>. Plain code: no imports but other words files and types.

// ---- chips.ts
export const thereIsNoBoard = (board: string): string => `There is no board "${board}".`;
export const thereIsNoCardOn = (n: number, board: string): string => `There is no card ${n} on board "${board}".`;
export const thereIsNoNoteOn = (seq: number, board: string): string => `There is no note ${seq} on board "${board}".`;
export const cardOnBoardWasRemoved = (n: number, board: string): string => `Card ${n} on board "${board}" was removed.`;
export const card = (numberOf: number, get: string): string => `card ${numberOf} "${get}"`;
export const containerOnBoardWasRemoved = (region: string, board: string): string => `Container "${region}" on board "${board}" was removed.`;
export const theCardNoteIsOn = (seq: number): string => `The card note ${seq} is on was removed.`;
export const noteIsHidden = (seq: number): string => `Note ${seq} is hidden.`;
export const container = (region: string): string => `container "${region}"`;
export const card2 = (n: number): string => `Card ${n}`;
export const cardOnBoard = (n: number, board: string): string => `Card ${n} on board "${board}"`;
export const noteOn = (seq: number, on: string): string => `Note ${seq} on ${on}`;
export const boardIsArchived = (board: string): string => `Board "${board}" is archived.`;
export const board = (board: string): string => `Board "${board}"`;
export const selected = (count: number): string => `${count} selected`;
export const answers = (count: number): string => `${count} ${count === 1 ? 'answer' : 'answers'}`;
export const cardOnBoardChangedSince = (n: number, board: string): string => `Card ${n} on board "${board}" changed since you added it.`;
export const boardCard = (board: string, n: number): string => `Board "${board}", card ${n}`;
export const noteOnBoardChangedSince = (seq: number, board: string): string => `Note ${seq} on board "${board}" changed since you added it.`;
export const boardNoteOn = (board: string, seq: number, on: string): string => `Board "${board}", note ${seq} on ${on}`;
