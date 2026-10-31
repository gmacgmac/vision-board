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
export const theBoardServerCouldNot = (create: string, displayName: string): string => `The board server could not ${create}read the ledger in ${displayName}. Check the folder's permissions, then try again.`;
