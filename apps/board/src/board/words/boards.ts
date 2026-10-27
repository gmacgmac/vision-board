// Words: boards. The board picker, rename, archive, lock and the archived list.
// Keys: board.boards.<name>. Plain code: no imports but other words files and types.

// ---- board-edit.ts
export const archive = (title: string): string => `Archive '${title}'?`;
export const archive2 = 'Archive';
export const boardLockedNobodyCanChange = 'Board locked: nobody can change it until you unlock it';
export const boardUnlocked = 'Board unlocked';
export const noBoardIsOpenTo = 'No board is open to rename.';
export const noBoardIsOpenToArchive = 'No board is open to archive.';
export const noBoardIsOpenToLock = 'No board is open to lock.';

// ---- boards.ts
export const noBoardsYetWaitingFor = 'No boards yet. Waiting for an agent to draw.\n';
export const npmRunBoardServesYour = '(npm run board serves your project; npm run dev the example boards.)';
export const thereIsNoBoard = (id: string): string => `There is no board "${id}".`;
export const archivedRestoreOneFromThe = (WAITING: string, archived: number): string => `${WAITING}\n${archived} archived: restore one from the board picker.`;
export const couldNotReachTheBoard = 'Could not reach the board server. Start it with: npm run board';

// ---- board-edit.ts
export const createdLastUpdatedAgentsWon = (dayOf: string, dayOf2: string): string => `Created ${dayOf}, last updated ${dayOf2}. Agents won't see it; you can restore it from the board picker.`;
