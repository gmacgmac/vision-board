// Words: access. Access requests and the revoke confirm: what an agent asks for and what the person is told.
// Keys: vision-board.access.<name>. Plain code: no imports but other words files and types.

// ---- access.ts
export const anAgent = 'An agent';
export const wantsToDrawOnThis = 'wants to draw on this board';
export const asksToWriteIn = (container: string): string => `asks to write in ${container}`;
export const drawOnThisBoard = 'draw on this board';
export const writeIn = (titleOf: string): string => `write in ${titleOf}`;
export const removeSAccess = (label: string): string => `Remove ${label}'s access?`;
export const canNoLonger = (label: string, where: string): string => `${label} can no longer ${where}`;
export const refused = (who: string): string => `Refused ${who}`;
export const canNowDrawOnThis = (who: string): string => `${who} can now draw on this board`;
export const theContainer = 'the container';
export const canNowWriteIn = (who: string | number, container: string | number): string => `${who} can now write in ${container}`;
export const willNoLongerBeAble = (label: string, where: string): string => `${label} will no longer be able to ${where}. Its items stay on the board, and it can ask again.`;
export const canNowWriteInMany = (who: string, containers: number): string => `${who} can now write in ${containerCount(containers)}`;
export const canNowDrawAndWrite = (who: string, containers: number): string => `${who} can now draw on this board and write in ${containerCount(containers)}`;
export const sameLabel = (label: string, n: number): string => `${label} (${n})`;
export const containerCount = (n: number): string => (n === 1 ? '1 container' : `${n} containers`);
/** What a bot asks for: `containers` of them, and whether the whole board is one of the asks. */
export const asksForAccessTo = (containers: number, board: boolean): string =>
  `asks for access to ${board ? (containers > 0 ? `this board and ${containerCount(containers)}` : 'draw on this board') : containerCount(containers)}`;
