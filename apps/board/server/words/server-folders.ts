// Words: server-folders. Opening a folder, the ledger lock and the files on disk.
// Keys: board.server-folders.<name>. Plain code: no imports but other words files and types.

// ---- folders.ts
export const onlyFoldersUnderYourHome = 'Only folders under your home folder can be opened, and not hidden ones or node_modules. Choose a folder under ~.';
export const isNotAFolderChoose = (displayName: string): string => `${displayName} is not a folder. Choose one from list_folders.`;
export const theBoardServerIsNot = 'The board server is not allowed to read this folder (macOS may need Files and Folders access for the app that started the board). Choose another one.';

// ---- ledger.ts
export const onlyThePersonCanDo = 'only the person can do this, on the board; send a propose or reply item instead';
export const onlyAnAgentWritesA = (String: string): string => `only an agent writes a ${String} event`;
export const theEventMustBeAn = 'the event must be an object';
export const nUnknownNodeLeaveN = (String: string): string => `n: unknown node ${String}; leave n out to create a node`;
export const theEventDoesNotFit = 'The event does not fit the ledger. Fix the fields listed in errors and send it again.';

// ---- lock.ts
export const anotherBoardServerHoldsThis = (host: string, pid: number, port: number): string => `Another board server holds this ledger: computer "${host}", process ${pid}, port ${port}, `;
/** What to do, when the board that holds it is on this computer (the terminal's message at start). */
export const itIsAlreadyRunning = (port: number, pid: number): string => `It is at http://localhost:${port}, so open that. To start this one instead, stop the run that started it, or: kill ${pid}`;
export const runningSinceStopThatServer = (started: string): string => `running since ${started}. Stop that server first.`;

// ---- open-folder.ts
export const chooseAProjectFolderUnder = 'Choose a project folder under ~, not the home folder itself.';

// ---- project.ts
export const makeOr = 'make or ';

// ---- folders.ts
export const thereIsNoFolderChoose = (displayName: string): string => `There is no folder ${displayName}. Choose one from list_folders.`;

// ---- project.ts
export const noVisionBoardHere = (displayName: string, ledgerFile: string): string => `No Vision Board here: ${displayName} has no ${ledgerFile}. Send create: true to make one, or choose another folder.`;
export const theBoardServerCouldNot = (create: string, displayName: string): string => `The board server could not ${create}read the ledger in ${displayName}. Check the folder's permissions, then try again.`;

// ---- project.ts (ledger folders, D-084)
export const noSuchLedger = (displayName: string, ledger: string): string => `${displayName} has no ledger "${ledger}". Send create: true to make it, or choose one from ledgers.`;

// ---- ledger-move.ts (the old layout into main/, D-084 6)
export const nothingToMove = (displayName: string, oldLedger: string): string => `${displayName} has no ${oldLedger}, so there is nothing to move into a ledger folder.`;
export const movedBefore = (displayName: string, oldLedger: string, mainLedger: string): string =>
  `${displayName} has both ${oldLedger} and ${mainLedger}: its ledger was moved before, and something wrote the old place since (a server running older code?). Nothing was moved. Keep the one you want (git has both), then open the folder again.`;
export const inBothPlaces = (displayName: string, names: string, rootDir: string, mainDir: string): string =>
  `${displayName} has ${names} both in ${rootDir}/ and in ${mainDir}/. Nothing was moved. Keep one of each, then open the folder again.`;
export const movePartWay = (displayName: string, reason: string, moved: string, there: string, left: string, here: string): string =>
  `Moving the ledger of ${displayName} stopped part-way (${reason}). In ${there}/: ${moved}. Still in ${here}/: ${left}. Nothing was lost: open the folder again to finish, or run npm run ledgers:undo -- <folder> to put them back.`;
export const nothingYet = 'nothing yet';
export const otherLedgers = (displayName: string, others: string): string =>
  `${displayName} has other ledgers beside main (${others}), so it can't go back to one ledger. Move them out of .visionboard/ first.`;
export const noMainToUndo = (displayName: string, mainLedger: string): string => `${displayName} has no ${mainLedger} to move back.`;
export const oldLayoutAlready = (displayName: string, oldLedger: string, mainLedger: string): string =>
  `${displayName} has both ${oldLedger} and ${mainLedger}. Nothing was moved back. Keep the one you want (git has both), then try again.`;
export const mainNotEmpty = (mainDir: string, names: string): string => `${mainDir}/ still holds ${names}, which are not the board's, so it was left in place.`;
