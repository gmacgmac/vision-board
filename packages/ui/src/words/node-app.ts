// Words: node-app. An app card: its states, notices and buttons.
// Keys: board.node-app.<name>. Plain code: no imports but other words files and types.

// ---- node-app.ts
export const appNotFound = (id: string): string => `App ${id} not found`;
export const askTheAgentToAdd = 'Ask the agent to add it.';
export const checkAgain = 'Check again';
export const appNotFound2 = ', app not found';
export const thisAppHasProblems = 'This app has problems';
export const askTheAgentToFix = 'Ask the agent to fix them.';
export const appHasProblems = ', app has problems';
export const notAllowedYet = 'Not allowed yet';
export const notAllowedYet2 = ', not allowed yet';
export const codeChanged = 'Code changed';
export const codeChangedNotAllowedYet = ', code changed, not allowed yet';
export const thisAppStopped = 'This app stopped';
export const itKeptCrashingRestartOnce = 'It kept crashing. Restart once the agent fixes it.';
export const restart = 'Restart';
export const appStopped = ', app stopped';
export const appsDonTRunIn = 'Apps don\'t run in past versions.';
export const notRunningInAPast = ', not running in a past version';
export const appAllowed = (name: string): string => `App allowed: ${name}`;
export const loading = ', loading';
