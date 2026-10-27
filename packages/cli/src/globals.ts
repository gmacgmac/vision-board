// The flags every command takes, besides the operation's own inputs (api.md 51). One list: the
// parser reads the names and the help prints the descriptions. The commands test checks that no
// generated input is named like one of these.
import { DEFAULT_SERVER, ENV } from '#format';
import * as globalsWords from './words/globals.ts';

export interface GlobalFlag {
  readonly name: string;
  /** What the flag takes, as help shows it; absent for a switch. */
  readonly value?: string;
  readonly description: string;
}

export const GLOBAL_FLAGS: readonly GlobalFlag[] = [
  { name: 'server', value: 'url', description: globalsWords.theBoardServerDefaultElse(ENV.server, DEFAULT_SERVER) },
  { name: 'secret', value: 'secret', description: globalsWords.yourAgentSecretFromVb(ENV.agentSecret) },
  { name: 'json-body', value: 'file|-', description: globalsWords.theWholeRequestBodyAs },
  { name: 'text', description: globalsWords.printKeyValueLinesInstead },
  { name: 'help', description: globalsWords.printHelpForTheCommand },
];

export const GLOBAL_NAMES: readonly string[] = GLOBAL_FLAGS.map((f) => f.name);
