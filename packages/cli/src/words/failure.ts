// Words: failure. The failure lines.
// Keys: board.failure.<name>. Plain code: no imports but other words files and types.

// ---- failure.ts
export const example = (stringify: string): string => `Example: ${stringify}`;
export const couldNotGetAnAnswer = (base: string, why: string): string => `Could not get an answer from ${base}: ${why}`;

// ---- run.ts
export const runVbForUsage = (message: string, command?: string): string => `${message}\nRun \`vb ${command ? `${command} --help` : 'help'}\` for usage.\n`;
export const thereIsNoCommand = (words: string): string => `There is no command "${words}".`;
export const theServerMustBeAn = (DEFAULT_SERVER: string): string => `The server must be an http or https address, such as ${DEFAULT_SERVER}.`;
