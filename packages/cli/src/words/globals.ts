// Words: globals. The flags every command takes.
// Keys: vision-board.globals.<name>. Plain code: no imports but other words files and types.

// ---- globals.ts
export const theWholeRequestBodyAs = 'The whole request body as JSON, from a file or from stdin (-). Flags for body inputs override its fields.';
export const printKeyValueLinesInstead = 'Print `key: value` lines instead of JSON.';
export const printHelpForTheCommand = 'Print help for the command.';
export const theBoardServerDefaultElse = (server: string, DEFAULT_SERVER: string): string => `The board server. Default: $${server}, else ${DEFAULT_SERVER}.`;
export const yourAgentSecretFromVb = (agentSecret: string): string => `Your agent secret, from \`vb join\`. Default: $${agentSecret}.`;
