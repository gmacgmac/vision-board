// Words: app-frame. The app panel frame: the refusals it shows for a tool call and the protocol's messages.
// Keys: vision-board.app-frame.<name>. Plain code: no imports but other words files and types.

// ---- app-frame-core.ts
export const allowThisAppOnIts = 'Allow this app on its card first.';
export const theToolCanTTake = 'The tool can\'t take that input.';
export const thisAppHasProblemsTo = 'This app has problems to fix.';
export const theToolFailed = 'The tool failed.';
export const theAppIsBusyTry = 'The app is busy. Try again.';
export const theToolTookTooLong = 'The tool took too long.';
export const theToolSAnswerIs = 'The tool\'s answer is too big.';
export const thisAppWasnTFound = 'This app wasn\'t found.';
export const uiInitializeNeedsAProtocolVersion = 'ui/initialize needs a protocolVersion.';
export const toolsCallNeedsTheName = 'tools/call needs the name of a tool.';
export const toolsCallArgumentsMustBe = 'tools/call arguments must be an object.';
export const noSuchMethod = (slice: string): string => `No such method: ${slice}.`;
export const isANotificationSendIt = (method: string): string => `${method} is a notification: send it without an id.`;
export const paramsMustBeAnObject = 'params must be an object.';
export const noteNeedsText = (PANEL_NOTE: string, max: number): string => `${PANEL_NOTE} takes params { text }: words, at most ${max} characters.`;
export const theBoardDidnTKeepTheNote = 'The board didn\'t keep the note.';
export const backToCard = 'Back to card';

// ---- app-frame-state.ts
export const theBoardDidnTSave = 'The board didn\'t save the panel\'s state.';
export const takesParamsStateAndNothing = (PANEL_SAVE_STATE: string): string => `${PANEL_SAVE_STATE} takes params { state } and nothing else.`;
