// Words: apps-supervisor. The app supervisor's refusals: an app that crashed, timed out or was stopped, and the tool checks.
// Keys: board.apps-supervisor.<name>. Plain code: no imports but other words files and types.

// ---- child.ts
export const didNotFinishLoadingWithin = (callMs: number): string => `did not finish loading within ${callMs} s. Make its top-level code quicker.`;

// ---- supervisor.ts
export const theAppHasProblemsIn = (id: string, slice: string): string => `The app "${id}" has problems in its files: ${slice} Fix them and try again.`;
export const itRan = (tool: string): string => `it ran "${tool}"`;
export const itsToolsLoaded = 'its tools loaded';
export const theAppWasStoppedBecause = (id: string): string => `The app "${id}" was stopped because another call ran too long. Try again.`;
export const theAppWasStoppedWhile = (id: string, doing: string): string => `The app "${id}" was stopped while ${doing}, because its code changed or was taken back. Try again once it is allowed.`;
export const theAppWasStoppedBecauseIts = (id: string): string => `The app "${id}" was stopped because its tools don't fit their shape (list_apps says why).`;
export const theCodeOfTheApp = (id: string): string => `The code of the app "${id}" changed while this call waited. Try again once it is allowed.`;
export const theAppIsBusyWith = (id: string): string => `The app "${id}" is busy with other calls. Try again in a moment.`;
export const theLastTimeItSaid = (slice: string): string => ` The last time, it said: ${slice}`;
export const itsToolsStoppedTimesWithin = (count: number, crashWindowMs: number, last: string): string => `Its tools stopped ${count} times within ${crashWindowMs} s, so the board stopped running them.${last} Change the code to try again.`;
export const theToolOfTheApp = (tool: string, id: string): string => `The tool "${tool}" of the app "${id}" took too long and was stopped. The next call starts the app again.`;
export const theCallWasGivenUp = 'The call was given up before it ran.';
export const itHasNone = 'It has none.';
export const theAppHasNoTool = (id: string, tool: string, has: string): string => `The app "${id}" has no tool "${tool}". ${has}`;
export const noTool = (tool: string, has: string): string => `no tool "${tool}". ${has}`;
export const theAppStoppedWhileIt = (id: string, tool: string): string => `The app "${id}" stopped while it ran "${tool}", and has now crashed too often: the board stopped running its tools. It runs again once its code changes.`;
export const theCodeOfTheAppChanged = (id: string): string => `The code of the app "${id}" changed, or was taken back, while this call waited. Try again once it is allowed.`;

// ---- tool-checks.ts
export const number = (i: number): string => `number ${i}`;
export const theToolOfTheApp2 = (name: string, app: string): string => `The tool "${name}" of the app "${app}"`;
export const answeredSomethingThatIsNot = (name: string): string => `${name} answered something that is not JSON. Answer an object or text.`;

// ---- supervisor.ts
export const theAppStoppedWhileItStarts = (id: string, doing: string): string => `The app "${id}" stopped while ${doing}. It starts again on the next call.`;
export const theAppWasStoppedWhileTry = (id: string, doing: string): string => `The app "${id}" was stopped while ${doing}. Try again.`;
export const theBoardClosedTheApp = (id: string, doing: string): string => `The board closed the app "${id}" while ${doing}. Try again.`;
export const itsTools = (value: string): string => `Its tools: ${value}.`;

// ---- tool-checks.ts
export const tool = (label: string, map: string): string => `Tool ${label}: ${map}.`;
export const toolASchemaOfIt = (label: string, err: string): string => `Tool ${label}: a schema of it can't be used: ${err}.`;
export const theArgumentsDonTFit = (name: string, app: string, said: string): string => `The arguments don't fit the tool "${name}" of the app "${app}": ${said}.`;
export const answeredMoreThanAnswerLess = (name: string, sizeWords: string): string => `${name} answered more than ${sizeWords}. Answer less.`;
export const answeredSomethingItsOutputSchemaRefuses = (name: string, said: string): string => `${name} answered something its outputSchema refuses: ${said}. Fix the tool.`;
export const answeredAnswerAnObjectOr = (name: string, nothing: boolean): string =>
  `${name} answered ${nothing ? 'nothing' : 'something that is neither an object nor text'}. Answer an object or text.`;
