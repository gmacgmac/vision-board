// Words: actions-message. The lines the Send message adds from the board.
// Keys: vision-board.actions-message.<name>. Plain code: no imports but other words files and types.

// ---- board-message.ts
export const thePersonUpdatedTheBoard = 'The person updated the board:';
export const thePersonSelectedTheseCards = 'The person selected these cards:';
export const theseAreThePersonS = (seq: number, board: string, seq2: number): string => `These are the person's answers up to head ${seq}. To read anything newer, call check_responses on board "${board}" with after ${seq2}.`;
export const card = (n: number, title: string): string => `- Card ${n}: ${title}`;
