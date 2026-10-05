// `vb help` and `vb <command> --help`, written from the generated table and the global flags, so
// help can never describe a flag the command does not take (api.md 51).
import type { CommandInfo, CommandInput } from './commands.generated.ts';
import { COMMANDS } from './commands.generated.ts';
import { flagOf } from './args.ts';
import { GLOBAL_FLAGS } from './globals.ts';

const WIDTH = 92;

/** `text` broken into lines of at most `WIDTH` characters, each indented. */
function wrap(text: string, indent: string): string[] {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && indent.length + line.length + 1 + word.length > WIDTH) { out.push(indent + line); line = word; } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(indent + line);
  return out;
}

const flagText = (i: CommandInput) => (i.type === 'boolean' ? `--${flagOf(i.name)}` : `--${flagOf(i.name)} <${i.type}>`);
const usageOf = (i: CommandInput) => (i.required ? flagText(i) : `[${flagText(i)}]`);
const pad = (rows: string[][]) => {
  const w = Math.max(...rows.map((r) => r[0]!.length));
  return rows.map(([a, b]) => `  ${a!.padEnd(w)}  ${b}`.trimEnd());
};

const globalRows = () => GLOBAL_FLAGS.map((f) => [`--${f.name}${f.value ? ` <${f.value}>` : ''}`, f.description]);

/** The command list. */
export function overview(commands: readonly CommandInfo[] = COMMANDS): string {
  return [
    'vb: talk to the Vision Board from a terminal.',
    '',
    'Usage: vb <command> [--flag value ...]',
    '',
    'Commands:',
    ...pad(commands.map((c) => [c.name, c.summary])),
    '',
    'Flags for every command:',
    ...pad(globalRows()),
    '',
    'Run `vb <command> --help` for a command\'s inputs.',
  ].join('\n');
}

/** One command: what it does, how to call it, each input. */
export function commandHelp(c: CommandInfo): string {
  const body = c.takesBody ? ' [--json-body <file|->]' : '';
  const inputRows = c.inputs.map((i) => [flagText(i), `${i.required ? 'required' : 'optional'}, ${i.in === 'body' ? 'body field (or in --json-body)' : i.in}${i.description ? `. ${i.description}` : ''}`]);
  return [
    `vb ${c.name}: ${c.summary}`,
    '',
    ...wrap(c.description, ''),
    '',
    `Usage: vb ${c.name}${c.inputs.map((i) => ` ${usageOf(i)}`).join('')}${body} [--text]`,
    ...(inputRows.length ? ['', 'Inputs:', ...pad(inputRows)] : []),
    '',
    'Flags for every command:',
    ...pad(globalRows()),
  ].join('\n');
}
