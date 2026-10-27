// Front door of packages/cli (D-016, D-029): `vb`, one command per agent operation (api.md 51).
export { run } from './run.ts';
export type { Io } from './run.ts';
export { nodeIo } from './node-io.ts';
export { COMMANDS } from './commands.generated.ts';
export type { CommandInfo, CommandInput, CommandInputType } from './commands.generated.ts';
export { parseArgs, assemble } from './args.ts';
export type { Parsed, ParseResult } from './args.ts';
export { formatText } from './format-text.ts';
export { overview, commandHelp } from './help.ts';
export { GLOBAL_FLAGS, GLOBAL_NAMES } from './globals.ts';
