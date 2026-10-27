// The flags every command takes, besides the operation's own inputs (api.md 51). One list: the
// parser reads the names and the help prints the descriptions. The commands test checks that no
// generated input is named like one of these.
import { DEFAULT_SERVER, ENV } from '#format';

export interface GlobalFlag {
  readonly name: string;
  /** What the flag takes, as help shows it; absent for a switch. */
  readonly value?: string;
  readonly description: string;
}

export const GLOBAL_FLAGS: readonly GlobalFlag[] = [
  { name: 'server', value: 'url', description: `The board server. Default: $${ENV.server}, else ${DEFAULT_SERVER}.` },
  { name: 'secret', value: 'secret', description: `Your agent secret, from \`vb join\`. Default: $${ENV.agentSecret}.` },
  { name: 'json-body', value: 'file|-', description: 'The whole request body as JSON, from a file or from stdin (-). Flags for body inputs override its fields.' },
  { name: 'text', description: 'Print `key: value` lines instead of JSON.' },
  { name: 'help', description: 'Print help for the command.' },
];

export const GLOBAL_NAMES: readonly string[] = GLOBAL_FLAGS.map((f) => f.name);
