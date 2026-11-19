// Words: server-folders. Opening a folder, the ledger lock and the files on disk.
// Keys: vision-board.server-folders.<name>. Plain code: no imports but other words files and types.

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
/** The ledger file held lines when it was read and is gone now (moved into main/ by another server, or deleted). */
export const ledgerFileGone = 'The ledger file this board read has gone (another server moved it into a ledger folder, or it was deleted), so nothing was written. Open the folder again to read the ledger where it is now.';

// ---- lock.ts
export const anotherBoardServerHoldsThis = (host: string, pid: number, port: number): string => `Another board server holds this ledger: computer "${host}", process ${pid}, port ${port}, `;
/** What to do, when the board that holds it is on this computer (the terminal's message at start). */
export const itIsAlreadyRunning = (port: number, pid: number): string => `It is at http://localhost:${port}, so open that. To start this one instead, stop the run that started it, or: kill ${pid}`;
export const runningSinceStopThatServer = (started: string): string => `running since ${started}. Stop that server first.`;

// ---- open-folder.ts
export const chooseAProjectFolderUnder = 'Choose a project folder under ~, not the home folder itself.';

// ---- chooser.ts and folders.ts (the system's folder chooser, D-110)
/** The chooser's own prompt, above its list. */
export const chooserPrompt = 'Choose a project folder for Vision Board';
export const chooserNotOffered = "This board server does not offer the system's folder chooser (it is on macOS only). Choose a folder from the list.";
export const chooserAlreadyOpen = "The system's folder chooser is already open. Choose a folder there, or cancel it, then try again.";
export const chooserFailed = (why: string): string => `The system's folder chooser could not open (${why}). Choose a folder from the list.`;
/** A pick, or a recent folder, with a hidden part in its real path. */
export const hiddenFolder = (displayName: string): string =>
  `${displayName} is hidden (a part of its path starts with a dot), so it can't be a project folder. Choose a folder that is not hidden.`;
/** A pick whose path holds a control character (a line break): no answer, recent list or request can carry it. */
export const controlCharacter = (displayName: string): string =>
  `${JSON.stringify(displayName)} has a line break or another control character in its path, so the board can't keep it. Rename the folder, or choose another.`;
/** A pick that is the home folder, or a folder holding it. */
export const holdsHome = (displayName: string): string =>
  `${displayName} is your home folder or holds it, so it can't be a project folder. Choose a folder inside it.`;

// ---- project.ts
export const makeOr = 'make or ';

// ---- folders.ts
export const thereIsNoFolderChoose = (displayName: string): string => `There is no folder ${displayName}. Choose one from list_folders.`;

// ---- project.ts
export const noVisionBoardHere = (displayName: string, ledgerFile: string): string => `No Vision Board here: ${displayName} has no ${ledgerFile}. Send create: true to make one, or choose another folder.`;
export const theBoardServerCouldNot = (create: string, displayName: string): string => `The board server could not ${create}read the ledger in ${displayName}. Check the folder's permissions, then try again.`;

// ---- project.ts (ledger folders, D-084)
export const noSuchLedger = (displayName: string, ledger: string): string => `${displayName} has no ledger "${ledger}". Send create: true to make it, or choose one from ledgers.`;

// ---- project.ts (reading another ledger, D-084 8)
export const noLedgerToRead = (displayName: string, ledger: string, ledgers: readonly string[]): string =>
  `${displayName} has no ledger "${ledger}" to read. ${ledgers.length ? `Its ledgers: ${ledgers.join(', ')}.` : 'It has no other ledger.'}`;

// ---- ledger-move.ts (the old layout into main/, D-084 6)
export const nothingToMove = (displayName: string, oldLedger: string): string => `${displayName} has no ${oldLedger}, so there is nothing to move into a ledger folder.`;
export const movedBefore = (displayName: string, oldLedger: string, mainLedger: string): string =>
  `${displayName} has both ${oldLedger} and ${mainLedger}: its ledger was moved before, and something wrote the old place since (a server running older code?). Nothing was moved. Keep the one you want (git has both), then open the folder again.`;
export const inBothPlaces = (displayName: string, names: string, rootDir: string, mainDir: string): string =>
  `${displayName} has ${names} both in ${rootDir}/ and in ${mainDir}/. Nothing was moved. Keep one of each, then open the folder again.`;
export const movePartWay = (displayName: string, reason: string, moved: string, there: string, left: string, here: string): string =>
  `Moving the ledger of ${displayName} stopped part-way (${reason}). In ${there}/: ${moved}. Still in ${here}/: ${left}. Nothing was lost: once the cause is fixed, open the folder again (or switch to Editing) to finish the move. Once it has finished, npm run ledgers:undo -- <folder> puts it all back if you want the one ledger again.`;
export const nothingYet = 'nothing yet';
export const otherLedgers = (displayName: string, others: string): string =>
  `${displayName} has other ledgers beside main (${others}), so it can't go back to one ledger. Move them out of .visionboard/ first.`;
export const noMainToUndo = (displayName: string, mainLedger: string): string => `${displayName} has no ${mainLedger} to move back.`;
export const oldLayoutAlready = (displayName: string, oldLedger: string, mainLedger: string): string =>
  `${displayName} has both ${oldLedger} and ${mainLedger}. Nothing was moved back. Keep the one you want (git has both), then try again.`;
/** A folder in ledger folders, opened by a server with the `ledgerFolders` flag off (an older checkout, or `-ledgerFolders`). */
export const inLedgerFolders = (displayName: string): string =>
  `${displayName} keeps its ledgers in folders (.visionboard/main/ and others), and this board server runs with ledger folders off, so it would start a second ledger beside them. Nothing was opened. Start it with VB_FLAGS=ledgerFolders, or run npm run ledgers:undo -- <folder> to go back to one ledger.`;
export const mainNotEmpty = (mainDir: string, names: string): string => `${mainDir}/ still holds ${names}, which are not the board's, so it was left in place.`;

// ---- server.ts and editing.ts (read-only opening, D-085)
/** Edit refused: another computer's board server is editing the ledger (the person's words, not a second server's). */
export const editRefused = (host: string, pid: number, port: number, since: string): string =>
  `Computer "${host}" (process ${pid}, port ${port}) has been editing this ledger since ${since}, so it stays read-only here. Try again once it stops editing.`;
/** Edit on a folder this computer can't write (a read-only share, its permissions). */
export const cannotBeWritten = (displayName: string): string =>
  `${displayName} can't be written on this computer (a read-only share, or its permissions), so it stays read-only. Nothing was written.`;
/** The terminal's line at start when the ledger opens read-only. */
export const openedReadOnly = (holder: string): string =>
  `Opened read-only: nothing is written until you switch the board to Editing (or start with --edit, or VB_EDIT=1).${holder}`;
/** Beside it, when another server holds the ledger live: who. */
export const editingElsewhere = (host: string, since: string): string => ` Computer "${host}" has been editing it since ${since}.`;
/** A seed ledger is not copied into a ledger opened read-only. */
export const seedNotCopied = (seed: string): string => `${seed} was not copied in: the ledger is open read-only. Start with --edit to seed it.`;

// ---- ledger.ts (a ledger written by a newer build, D-103 4)
/** What the person is told: why the ledger is read-only, and Edit's refusal. */
export const newerLedgerPerson = 'This ledger was written by a newer Vision Board. It opens read-only; update the board to edit it.';
/** What an agent is told when it writes: nothing was written, and why. */
export const newerLedgerAgent = 'This ledger was written by a newer Vision Board, so this board can only read it: nothing was written. The person updates the board to edit it.';
export const newerLines = (count: number, first: number): string => `ledger: ${count} line(s) from line ${first} on were written by a newer Vision Board; the ledger is read-only here`;

// ---- ledger-migrate.ts (the migration, D-103)
export const migrated = (file: string, changed: number, backup: string): string => `ledger: migrated ${file} to the current format (${changed} line(s) upgraded); the ledger as it was is in ${backup}`;
export const stoppedLine = (line: number, stop: string): string => `line ${line}: ${stop}`;
export const migrationStopped = (file: string, stops: string): string => `ledger: ${file} was not migrated, and nothing was written: ${stops}. It is read as it lies.`;
export const migrationFailed = (file: string, why: string): string => `ledger: ${file} was not migrated, and the ledger is whole as it was: ${why}`;
export const migrationChangedWhileRead = 'the ledger changed while it was being migrated (another writer?), so nothing was replaced; the next open tries again';
export const migrationCheckFailed = (line: number, what: string): string => `line ${line} would change its ${what}, which a migration never does; nothing was written`;
export const migrationNewProblems = (problems: string): string => `the migrated ledger reads with problems the old one did not have (${problems}); nothing was written`;
export const noBackupToUndo = (dir: string): string => `There is no backup in ${dir} to put back: this ledger was never migrated here.`;
export const appendedSinceBackup = (backup: string, head: number, now: number): string => `The backup ${backup} was taken at line ${head}, and the ledger has gone on to line ${now} since. Putting it back would lose those lines, so nothing was changed.`;
