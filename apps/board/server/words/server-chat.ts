// Words: server-chat. The chat session: what the agent is told, and the refusals a chat call gets.
// Keys: board.server-chat.<name>. Plain code: no imports but other words files and types.

// ---- chat-access.ts
export const claudeCode = 'Claude Code';
export const kiro = 'Kiro';
export const thePersonStartedAChat = 'The person started a chat on this board.';

// ---- chat-approvals.ts
export const thisApprovalIsAlreadySettled = (status: string): string => `This approval is already settled (${status}); the first answer stands.`;
export const thereIsNoApprovalIn = (approvalId: string): string => `There is no approval "${approvalId}" in this session.`;
export const thisApprovalDoesNotOffer = (scope: string, offered: string): string =>
  `This approval does not offer "${scope}": its yes may hold ${offered}.`;

// ---- chat-permissions.ts
export const thePermissionsFileIsDamaged = (file: string): string =>
  `chat: ${file} is not a valid permissions file, so nothing is allowed for this folder until the person allows something again.`;
export const noPermissionIsKeptFor = (id: string): string =>
  `No permission "${id}" is kept for this folder. Call list_permissions to see them.`;

// ---- chat-index.ts
export const anEntryIsNotAn = 'an entry is not an object';

// ---- chat-prompt.ts
export const attachedFromTheBoard = 'Attached from the board:';
export const attachedFromTheBoard2 = 'Attached from the board.';
export const attachedFiles = 'Attached files.';
export const thePersonAttachedTheseFiles = 'The person attached these files:';
export const noBoardIsOpenIn = 'No board is open in this folder yet. When there is something to draw, suggest its structure first; once the person agrees, create a board with write_board and the person\'s page opens it.';
export const theMessageNamesNotesOr = 'The message names notes or cards that are not on this board.';
export const board = (board: string): string => `Board: ${board}`;
export const noBoardIsOpenSo = (seq: number): string => `no board is open, so there is no note ${seq}`;
export const noBoardIsOpenSoThere = (n: number): string => `no board is open, so there is no card ${n}`;
export const theMessageNamesNotesOrCards = 'The message names notes or cards, but no board is open.';

// ---- chat-files.ts
export const thisFileIsOverThe = 'This file is over the 10 MB limit, so it was not saved.';
export const theFileIsNotValid = 'The file\'s data is not valid base64, so it was not saved.';
export const theFileCouldNotBe = 'The file could not be saved: .visionboard/attachments/ or the day\'s folder inside it is not a plain folder. Check it, then attach the file again.';
export const thisIsNotAFile = 'this is not a file attached through the board, or it has since been deleted';
export const theMessageNamesFilesThat = 'The message names files that were not attached through the board.';

// ---- chat-session.ts
export const earlierMessagesArenTShown = 'Earlier messages aren\'t shown after a restart; the agent still remembers them.';
export const yourAnswersGoToThe = 'Your answers go to the agent when it finishes this turn.';
export const yourMessageGoesToThe = 'Your message goes to the agent when it finishes this turn.';
export const theAgentCouldNotRun = (reason: string): string => `The agent could not run: ${reason}`;
export const theBoardSAnswersCould = (reason: string): string => `The board's answers could not be sent: ${reason}`;

// ---- chat-sessions.ts
export const thereIsNoChatSession = (id: string): string => `There is no chat session "${id}" on this server. Call list_chats to see the board's sessions.`;
export const isNotAvailableOnThis = (agentName: string): string => `${agentName} is not available on this server, so this session cannot run.`;
export const couldNotBeStarted = (agentName: string, why: string): string => `${agentName} could not be started: ${why}`;
export const isNotAvailableOnThisServer = (agentName: string): string => `${agentName} is not available on this server.`;
export const cannotBeStartedHereUse = (agent: string, keys: string): string => `${agent} cannot be started here; use one of: ${keys}`;
export const couldNotBeStarted2 = (agentName: string): string => `${agentName} could not be started.`;

// ---- chat.ts
export const theServerKnowsNoRunning = 'The server knows no running chat turn with this run token. Only a running session\'s gate asks.';
export const thereIsNothingToSend = 'There is nothing to send: write a message, attach cards or notes, or answer on the board first.';
export const aNewerSessionReplacedThis = 'A newer session replaced this one on the board; send your message there.';
export const aNewSessionIsStarting = 'A new session is starting on this board; send your message there once it has.';
export const noChatCanStartOn = 'no chat can start on it';
export const attachingFilesIsOff = 'Attaching files to a chat message is off on this server.';
export const filesCanTBeAttached = 'files can\'t be attached on this server';
export const noWordsNothingAttachedAnd = 'no words, nothing attached and no new answers on the board';
export const itsChatCanTTake = 'its chat can\'t take messages';

// ---- chat-access.ts
export const theKiroAgentFileCould = (kiroAgentFile: string, err: string): string => `The Kiro agent file ${kiroAgentFile} could not be written: ${err}. Check that folder's permissions, then restart the board.`;
