// Words: apps-host. The refusals for an app that cannot be called, and the app panel's.
// Keys: board.apps-host.<name>. Plain code: no imports but other words files and types.

// ---- host.ts
export const appCardsAreOffOn = 'App cards are off on this board server (the appCards flag).';
export const theCodeOfTheApp = (id: string): string => `The code of the app "${id}" changed since the person allowed it. Press Allow on its card again.`;
export const thePersonHasNotAllowed = (id: string): string => `The person has not allowed the app "${id}" yet. Press Allow on its card first.`;
export const theAppHasAPanel = (id: string): string => `The app "${id}" has a panel only: it has no tools to call.`;
export const thisAppHasNoTools = 'this app has no tools';
export const thereIsNoApp = (id: string, appsFolder: string): string => `There is no app "${id}" in this folder's ${appsFolder}.`;

// ---- panel-state.ts
export const thereIsNoCardOn = (n: number, board: string): string => `There is no card ${n} on board "${board}".`;
export const cardOnBoardIsRemoved = (n: number, board: string): string => `Card ${n} on board "${board}" is removed, so it has no panel state.`;
export const cardOnBoardIsNot = (n: number, board: string): string => `Card ${n} on board "${board}" is not an app card, so it has no panel state.`;
export const isNotAFileOf = 'is not a file of at most the limit';
export const isNotJSON = 'is not JSON';
export const doesNotFitTheSchema = 'does not fit the schema';

// ---- panel.ts
export const thereIsNoAppPanel = 'There is no app panel here to show. list_apps lists the apps, and what to fix in each.';
