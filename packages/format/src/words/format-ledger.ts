// Words: format-ledger. Why a ledger line or an act is refused: the field, what it must be, and what it names.
// Keys: board.format-ledger.<name>. Plain code: no imports but other words files and types.

// ---- access-rules.ts
export const board = (board: string): string => `board ${board}`;
export const holderCreatedAndAS = (holder: string, what: string, region: string): string => `holder: "${holder}" created ${what}, and a ${region}'s creator cannot be removed`;
export const holderDoesNotHold = (holder: string, what: string): string => `holder: "${holder}" does not hold ${what}`;

// ---- app-shape.ts
export const unknownField = (f: string, k: string): string => `${f}.${k}: unknown field`;
export const wholeNumberFromTo = (f: string, d: string, min: number, max: number): string => `${f}.${d}: whole number from ${min} to ${max}`;
export const appRequiredOnAnApp = (f: string): string => `${f}.app: required on an app card: the app's id, and the panel size if not the default`;
export const sizeAnAppCardIs = (f: string): string => `${f}.size: an app card is as big as its panel; set app.w and app.h instead`;
export const appOnlyAnAppCard = (f: string): string => `${f}.app: only an app card names an app; draw kind app`;
export const theAppSHash64 = (f: string): string => `${f}: the app's hash, 64 lowercase hex characters, as list_apps gives it`;
export const appRequiredTheIdOf = (a: string): string => `app: required, the id of the app to ${a}`;
export const hashRequiredTheVersionOf = 'hash: required, the version of the app\'s code to allow';
export const hashAStopNamesThe = 'hash: a stop names the app only; it stops every version';
export const anNamesItsAppAnd = (k: string, a: string): string => `${k}: an ${a} names its app, and nothing else`;

// ---- apps.ts
export const theStateMustBeA = 'The state must be a JSON value: no functions, loops or undefined.';
export const theStateIsBytesOf = (bytes: number, most: number, most2: number): string => `The state is ${bytes} bytes of JSON and the most a panel may save is ${most} (${most2} KB). Save less: what the panel needs to start where it was.`;

// ---- ledger-index.ts
export const seqExpected = (seq: number): string => `seq: expected ${seq}`;
export const unknownNode = (f: string, id: number): string => `${f}: unknown node ${id}`;
export const cardIsRetired = (f: string, name: string): string => `${f}: card ${name} is retired`;
export const verNodeIsAtVersion = (name: string, ver: number): string => `ver: node ${name} is at version ${ver}`;
export const boardAlreadyExists = (board: string): string => `board: "${board}" already exists`;
export const boardUnknown = (board: string | undefined): string => `board: unknown "${board}"`;
export const regionIdContainerWasRetired = (id: string): string => `region.id: container "${id}" was retired; pick another id`;
export const regionIdIsTheBoard = (LATER_REGION: string): string => `region.id: "${LATER_REGION}" is the board's built-in Later container; pick another id`;
export const nodeRegionContainerWasRetired = (region: string): string => `node.region: container "${region}" was retired`;
export const nodeRegionUnknown = (region: string): string => `node.region: unknown "${region}"`;
export const nWasAlreadyUsedNew = (id: number, maxId: number): string => `n: ${id} was already used; new nodes get ${maxId} or above`;
export const nNodeBelongsToBoard = (name: string, board: string): string => `n: node ${name} belongs to board "${board}"`;
export const nCardIsRetiredDraw = (name: string): string => `n: card ${name} is retired; draw a new card instead`;
export const verExpected = (want: number): string => `ver: expected ${want}`;
export const proposalNoProposalForNode = (proposal: number, name: string): string => `proposal: no proposal ${proposal} for node ${name}`;
export const proposalOutOfDateNode = (name: string): string => `proposal: out of date, node ${name} changed since it was made`;
export const headTheLedgerIsAt = (seq: number): string => `head: the ledger is at line ${seq}`;
export const agentHasAlreadyJoined = (agent: string): string => `agent: "${agent}" has already joined`;
export const regionUnknown = (region: string | undefined): string => `region: unknown "${region}"`;
export const boardThisAgentAlreadyHas = (open: number, accessName: string): string => `board: this agent already has open grant request ${open} for ${accessName}`;
export const regionUnknownAsAContainer = (LATER_REGION: string): string => `region: unknown "${LATER_REGION}" as a container to write on: Later takes no note, since no agent drew it; write the note on one of the board's containers`;
export const regionUnknownOnBoard = (region: string | undefined, board: string | undefined): string => `region: unknown "${region}" on board "${board}"`;
export const regionContainerWasRetired = (region: string | undefined): string => `region: container "${region}" was retired`;
export const requestNoGrantRequest = (request: number | undefined): string => `request: no grant request ${request}`;
export const requestGrantRequestWasAlready = (request: number | undefined): string => `request: grant request ${request} was already answered`;
export const lineNotJSON = (i: number): string => `line ${i}: not JSON`;
export const line = (i: number, x: string): string => `line ${i}: ${x}`;

// ---- ledger-shape.ts
export const required = (f: string): string => `${f}: required`;
export const upToCharacters = (f: string, max: number): string => `${f}: up to ${max} characters`;
export const invalidId = (f: string): string => `${f}: invalid id`;
export const anAgentIdAAnd = (f: string): string => `${f}: an agent id, "a-" and 8 lowercase letters or digits`;
export const oneOf = (f: string, join: string): string => `${f}: one of ${join}`;
export const trueOrFalse = (f: string): string => `${f}: true or false`;
export const number = (f: string): string => `${f}: number`;
export const list = (f: string): string => `${f}: list`;
export const upToEntries = (f: string, max: number): string => `${f}: up to ${max} entries`;
export const nodeNoCoordinatesTheEngine = (k: string): string => `node.${k}: no coordinates; the engine places nodes`;
export const unknownField2 = (prefix: string, k: string): string => `${prefix}${k}: unknown field`;
export const nodeNumber = 'node number';
export const eachCardOnce = (f: string): string => `${f}: each card once`;
export const atLeast2NodeNumbers = (f: string): string => `${f}: at least 2 node numbers; one card is named with n`;
export const eachNodeOnce = (f: string): string => `${f}: each node once`;
export const wholeNumberFrom1To = (columns: number): string => `whole number from 1 to ${columns}`;
export const theVersionActedOn = 'the version acted on';
export const seqOfAProposeEvent = 'seq of a propose event';
export const seqOfAGrantRequest = 'seq of a grant-request event';
export const seqOfTheCommentOr = 'seq of the comment or context act that made the note';
export const seqOfALine = 'seq of a line';
export const seqOfTheActIt = 'seq of the act it answers';
export const boardANoteOnOr = 'board: a note on or a place for a container names its board and region';
export const aContainerIsNamedBy = (f: string, f2: string): string => `${f}: a container is named by board and region, not ${f2}`;
export const textRequiredOnANote = 'text: required on a note on a container';
export const nodesOnlyACommentA = 'nodes: only a comment, a context or a move names a group of cards';
export const nAGroupNamesIts = 'n: a group names its cards in nodes, not n';
export const verAGroupNamesNo = 'ver: a group names no version';
export const textRequiredOnANoteOn = 'text: required on a note on a group';
export const nNodeNumber = 'n: node number';
export const verTheVersionActedOn = 'ver: the version acted on';
export const modeBoardAndRegionRequired = 'mode: board and region required';
export const modeOneOf = (join: string): string => `mode: one of ${join}`;
export const widthsBoardAndRegionRequired = 'widths: board and region required';
export const widthsOneOf = (join: string): string => `widths: one of ${join}`;
export const regionTheContainerToMove = 'region: the container to move the cards to';
export const requestTheSeqOfA = (a: string): string => `${a}: request, the seq of a grant-request event`;
export const revokeRequired = (f: string): string => `revoke: ${f} required`;
export const sizeOneOf = (join: string): string => `size: one of ${join}`;
export const sendBoardRequired = 'send: board required';
export const noteTheSeqOfThe = 'note: the seq of the comment or context act that made the note';
export const proposalTheSeqOfThe = 'proposal: the seq of the propose event being turned down';
export const nNamesNoNode = (a: string): string => `n: ${a} names no node`;
export const aNamesOneCardWith = (f: string, a: string): string => `${f}: a ${a} names one card with n, and nothing else`;
export const boardRequired = (a: string): string => `${a}: board required`;
export const namesItsBoardAndNothing = (f: string, value: string, a: string): string => `${f}: ${value} ${a} names its board, and nothing else`;
export const cardsAtLeast1Card = 'cards: at least 1 card, or a region';
export const regionMode = (LIST_RENAMED: string): string => `region.mode: ${LIST_RENAMED}`;
export const mode = (LIST_RENAMED: string): string => `mode: ${LIST_RENAMED}`;
export const seenANodeNAnd = 'seen: a node (n and ver) or a board (board and head), not both';
export const headRequiredTheBoardS = 'head: required, the board\'s last line the person has seen';
export const uTCTimestampLike202610 = (f: string): string => `${f}: UTC timestamp, like 2026-10-05T09:00:00Z`;
export const typeOneOf = (join: string): string => `type: one of ${join}`;
export const writtenByAnAgent = (t: string): string => `${t}: written by an agent`;
export const writtenByAPerson = (t: string): string => `${t}: written by a person`;
export const agentRequiredAJoinIs = 'agent: required; a join is stamped with the new agent id';
export const nodeItem = (ITEM_REMOVED: string): string => `node.item: ${ITEM_REMOVED}`;

// ---- ledger.ts
export const itemIsGoneTheKind = '`item` is gone: the kind decides. ';
export const aQuestionDecisionOrAction = 'A `question`, `decision` or `action` card asks the person; any other kind takes a note or Later.';
export const listIsNowColumnTop = '`list` is now `column` (top to bottom in card order); ';
export const rowRunsLeftToRight = '`row` runs left to right, `flow` follows the links.';

// ---- retire-rules.ts
export const regionIsTheBoardS = (LATER_REGION: string): string => `region: "${LATER_REGION}" is the board's built-in Later, not a container to retire`;
export const cardsUnknownNode = (id: number): string => `cards: unknown node ${id}`;
export const cardsCardIsOnBoard = (name: string, board: string, board2: string): string => `cards: card ${name} is on board "${board}", not "${board2}"`;
export const cardsCardIsAlreadyRetired = (name: string): string => `cards: card ${name} is already retired`;
