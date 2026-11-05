// Words: actions-refusals. Why an act or a write is refused, in the words an agent or the page shows.
// Keys: board.actions-refusals.<name>. Plain code: no imports but other words files and types.

// ---- act.ts
export const boardUnknown = (String: string): string => `board: unknown "${String}"`;
export const unknownNode = (field: string, id: number): string => `${field}: unknown node ${id}`;
export const and = ' and ';
export const theCardsAreOnBoard = (field: string, on: string, board: string): string => `${field}: the cards are on board "${on}", not "${board}"`;
export const regionUnknownPickAContainer = (String: string, on: string, LATER_REGION: string): string => `region: unknown "${String}"; pick a container on board "${on}", or ${LATER_REGION}`;
export const regionLaterTakesOnlyCards = (cardName: string, kind: string): string => `region: Later takes only cards that can be saved for later; node ${cardName} is a ${kind}, which can't`;
export const regionUnknownPickARegion = (String: string, String2: string): string => `region: unknown "${String}"; pick a region on board "${String2}"`;
export const boardThisActNamesBoard = (named: string, board: string): string => `board: this act names board "${named}" but was sent to board "${board}"`;
export const requestIsNotAGrant = (request: number | undefined): string => `request: ${request} is not a grant request; answer one from the board's open requests`;
export const requestGrantRequestWasAlready = (request: number | undefined, action: string): string => `request: grant request ${request} was already answered (${action})`;
export const requestGrantRequestIsFor = (request: number | undefined, board: string, here: string): string => `request: grant request ${request} is for board "${board}", not "${here}"`;
export const actionUnknown = (String: string): string => `action: unknown "${String}"`;
export const onlyThePersonCanDo = (action: string): string => `${action}: only the person can do this, on the board; send a propose or reply item instead`;
export const nUnknownNode = (String: string): string => `n: unknown node ${String}`;
export const nNodeIsOnBoard = (cardName: string, board: string, board2: string): string => `n: node ${cardName} is on board "${board}", not "${board2}"`;
export const doesnTOfferThis = (action: string, value: string, kind: string): string => `${action}: ${value} ${kind} doesn't offer this`;
export const sizeAnAppCardIs = 'size: an app card is as big as its panel, which the agent sets';
export const proposalIsNotAProposal = (proposal: number, n: string): string => `proposal: ${proposal} is not a proposal on item ${n}`;
export const proposalProposalWasAlreadyDecided = (proposal: number): string => `proposal: proposal ${proposal} was already decided`;
export const proposalProposalIsToAccept = (proposal: number, ACTIONS: string, action: string): string => `proposal: proposal ${proposal} is to ${ACTIONS}; accept it with ${action}, or reject it`;
export const proposalChangedAfterThisWas = (n: string): string => `proposal: ${n} changed after this was proposed; ask the agent to look again`;
export const nodesUnknownNode = (id: number): string => `nodes: unknown node ${id}`;
export const nodesNodeIsAWhich = (cardName: string, kind: string, action: string): string => `nodes: node ${cardName} is a ${kind}, which doesn't offer ${action}`;
export const nodesTheItemsAreOn = (only: string, board: string): string => `nodes: the items are on board "${only}", not "${board}"`;
export const nItemAlreadyHasA = (name: string, seq: number): string => `n: item ${name} already has a note not yet sent (note ${seq}); change it with note-edit or take it back with note-remove`;
export const noteIsNotANote = (note: number | undefined): string => `note: ${note} is not a note; name the seq of the comment or context act that made it`;
export const noteNoteIsOnContainer = (note: number | undefined, region: string, name: string): string => `note: note ${note} is on container "${region}", not node ${name}`;
export const noteNoteIsOnItems = (note: number | undefined, map: string, name: string): string => `note: note ${note} is on items ${map}, not node ${name}`;
export const noteNoteIsOnNode = (note: number | undefined, name: string, name2: string): string => `note: note ${note} is on node ${name}, not node ${name2}`;
export const noteNoteWasRemoved = (note: number | undefined): string => `note: note ${note} was removed`;
export const noteNoteWasSentTo = (note: number | undefined): string => `note: note ${note} was sent to the agent, and a sent note is history; write a new note instead`;
export const noteNoteWasAnsweredBy = (note: number | undefined): string => `note: note ${note} was answered by the agent, and an answered note is history; write a new note instead`;
export const noteNoteIsNotYours = (note: number | undefined): string => `note: note ${note} is not yours`;
export const regionLaterTakesNoNote = 'region: Later takes no note: it holds the cards saved for later and is not a thread an agent drew; write the note on one of the board\'s containers';
export const regionUnknownPickAContainerOn = (String: string, board: string | undefined, note: string): string => `region: unknown "${String}"; pick a container on board "${board}"${note}`;
export const regionContainerAlreadyHasA = (region: string, seq: number): string => `region: container "${region}" already has a note not yet sent (note ${seq}); change it with note-edit or take it back with note-remove`;
export const items = (map: string): string => `items ${map}`;
export const node = (cardName: string): string => `node ${cardName}`;
export const ofAnotherBoard = ' of another board';

// ---- proposal-rows.ts
export const changedAfterThisWasProposed = (n: number): string => `${n} changed after this was proposed`;
export const aNewerProposalOnIs = (n: number): string => `a newer proposal on ${n} is applied`;

// ---- apps.ts
export const hashThisVersionOfIs = (app: string | undefined): string => `hash: this version of "${app}" is already allowed`;
export const appIsnTAllowedSo = (app: string | undefined): string => `app: "${app}" isn't allowed, so there is nothing to stop`;

// ---- archive.ts
export const thatBoardIdIsnT = 'That board id isn\'t available; choose another id.';
export const boardIsArchivedRestoreIt = (board: string): string => `board: "${board}" is archived; restore it from the board picker first`;
export const boardIsAlreadyArchived = (id: string): string => `board: "${id}" is already archived`;
export const boardIsnTArchived = (id: string): string => `board: "${id}" isn't archived`;

// ---- lock.ts
export const thisBoardIsLockedAsk = 'This board is locked; ask the person to unlock it.';
export const lockedUnlockToChangeIt = 'Locked: unlock to change it';
export const boardIsAlreadyLocked = (id: string): string => `board: "${id}" is already locked`;
export const boardIsnTLocked = (id: string): string => `board: "${id}" isn't locked`;

// ---- read-only.ts
export const thisLedgerIsOpenRead = 'This ledger is open read-only, so nothing was written. Read it as usual; to write, tell the person in one line that it is read-only until they make it editable, and wait for them.';
export const readOnlySwitchToEditing = 'Read-only: switch to Editing to change it';

// ---- moves.ts
export const later = 'Later';

// ---- proposals.ts
export const nodeIsAWhichAsks = (numberOf: number, kind: string): string => `node ${numberOf} is a ${kind}, which asks for no answer`;

// ---- reply.ts
export const onContainer = (title: string, ACTIONS: string | undefined, map: string): string => `On container "${title}" ${ACTIONS}: ${map}`;
export const stillOpen = (join: string): string => `Still open: ${join}`;
export const waitingForYourReply = (join: string): string => `Waiting for your reply: ${join}`;
export const nothingLeftOpen = 'Nothing left open.';
export const boardV = (title: string, version: number): string => `Board "${title}" (v${version})`;

// ---- retire.ts
export const card = (numberOf: number): string => `card ${numberOf}`;
export const hasACommentYouHaven = (card: string): string => `${card} has a comment you haven't answered: answer it with a reply or an append first`;
export const isSavedForLaterAnd = (card: string): string => `${card} is saved for later and its handover isn't written: write it with a park first`;
export const containerHasANoteYou = (region: string): string => `container "${region}" has a note you haven't answered: answer it with a reply naming it first`;
export const stillHasAnUnansweredComment = 'still has an unanswered comment';
export const isSavedForLaterAndIts = 'is saved for later and its handover isn\'t written yet';
export const cardsAndMoreAreStill = (slice: string, count: number): string => `Cards ${slice} and ${count} more are still owed an answer.`;
export const card2 = (n: number, NOTICE: string): string => `Card ${n} ${NOTICE}.`;
export const container = (title: string, comment: string): string => `Container '${title}' ${comment}.`;

// ---- act.ts
export const nodesAMoveNamesCards = (value: string | number): string => `nodes: a move names cards on one board; these are on ${value}`;
export const nodesANoteOnA = (value: string | number): string => `nodes: a note on a group names items on one board; these are on ${value}`;
export const noteNoteIsOnNot = (note: string | number | undefined, nodes: string | number, region: string | number): string => `note: note ${note} is on ${nodes}, not container "${region}"`;
export const noteNoteIsOnContainerNot = (note: string | number | undefined, region: string | number, region2: string | number, region3: string | number): string => `note: note ${note} is on container "${region}"${region2}, not "${region3}"`;
