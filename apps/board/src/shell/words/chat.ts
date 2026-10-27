// Words: chat. The chat panel's sentences that the page owns.
// Keys: board.chat.<name>. Plain code: no imports but other words files and types.

// ---- ChatSidebar.svelte
export const chatWithTheAgent = 'Chat with the agent';
export const chatWidth = 'Chat width';
export const dragToResize = 'Drag to resize · ← →';
export const loadingTheChat = 'Loading the chat…';
export const theChatDidNotLoad = 'The chat did not load.';
export const tryAgain = 'Try again';

// ---- chat-bridge.ts
export const showInTheChat = 'Show in the chat';
export const card = (n: number): string => `Card ${n}`;
export const selected = (count: number): string => `${count} selected`;
export const thoseCardsAreNoLonger = 'Those cards are no longer on the board.';

// ---- chat-panel.ts
export const noMessagesYetAskThe = 'No messages yet. Ask the agent about this board.';
export const noBoardsHereYetAsk = 'No boards here yet. Ask the agent to draw one.';
export const startANewSession = 'Start a new session?';
export const theAgentStartsAgainWith = 'The agent starts again with no memory of this conversation, and a turn still running stops.';
export const newSession = 'New session';
export const aMessageIsAlreadyOn = 'A message is already on its way.';
export const theAgentDidNotStart = 'The agent did not start.';

// ---- chat-rules.ts
export const claude = 'Claude';
export const kiro = 'Kiro';
export const defaultText = 'Default';
export const opus55 = 'Opus 5.5';
export const sonnet55 = 'Sonnet 5.5';
export const loading = 'Loading…';
export const aPastVersionOfThe = 'A past version of the board is showing. Go back to now to send a message.';
export const thisBoardIsArchivedSo = 'This board is archived, so its agent can\'t see it. Restore it from the board picker to chat about it.';
