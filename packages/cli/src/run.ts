// `run`: one `vb` invocation, start to exit code (api.md 51). 0 = done, 1 = the call failed (a
// problem answer or no answer), 2 = the arguments were wrong. Everything the outside world
// supplies (output, stdin, files, environment, fetch) comes in as `Io`, so tests run it whole.
import { DEFAULT_SERVER, ENV } from '#format';
import type { OperationId } from '#format';
import { createClient } from '#client';
import { assemble, parseArgs } from './args.ts';
import type { Parsed } from './args.ts';
import { readJsonBody } from './body-source.ts';
import { COMMANDS } from './commands.generated.ts';
import type { CommandInfo } from './commands.generated.ts';
import { failureLines } from './failure.ts';
import { formatText } from './format-text.ts';
import { commandHelp, overview } from './help.ts';
import * as failureWords from './words/failure.ts';

export interface Io {
  stdout(text: string): void;
  stderr(text: string): void;
  readStdin(): Promise<string>;
  readFile(path: string): string;
  env: Readonly<Record<string, string | undefined>>;
  /** Replaces the global `fetch`, for tests. */
  fetch?: typeof fetch;
  /** The project folder this run works in, sent as `VB-Project` (D-039); none, nothing is sent. */
  project?: string;
}

const HELP_WORDS = ['help', '--help', '-h'];

/** Print a usage mistake and give the exit code for it. */
function usage(io: Io, message: string, command?: CommandInfo): number {
  io.stderr(failureWords.runVbForUsage(message, command?.name));
  return 2;
}

/** The server to call, from the flag, then the environment, then the default; it must be a URL. */
function serverOf(parsed: Parsed, io: Io): string | undefined {
  const base = (parsed.server ?? io.env[ENV.server] ?? DEFAULT_SERVER).replace(/\/+$/, '');
  try { return /^https?:$/.test(new URL(base).protocol) ? base : undefined; } catch { return undefined; }
}

function helpFor(words: readonly string[], io: Io): number {
  const command = words[0] ? COMMANDS.find((c) => c.name === words[0]) : undefined;
  if (words[0] && !command) return usage(io, failureWords.thereIsNoCommand(words[0]));
  io.stdout(`${command ? commandHelp(command) : overview()}\n`);
  return 0;
}

/** Run the command the words name; resolves to the process exit code. */
export async function run(argv: readonly string[], io: Io): Promise<number> {
  const [word, ...rest] = argv;
  if (word === undefined) { io.stderr(`${overview()}\n`); return 2; }
  if (HELP_WORDS.includes(word)) return helpFor(rest, io);
  const command = COMMANDS.find((c) => c.name === word);
  if (!command) return usage(io, failureWords.thereIsNoCommand(word));
  const parsed = parseArgs(command, rest);
  if (!parsed.ok) return usage(io, parsed.message, command);
  if (parsed.value.help) return helpFor([command.name], io);
  return call(command, parsed.value, io);
}

async function call(command: CommandInfo, parsed: Parsed, io: Io): Promise<number> {
  const base = serverOf(parsed, io);
  if (!base) return usage(io, failureWords.theServerMustBeAn(DEFAULT_SERVER), command);
  let jsonBody: Record<string, unknown> | undefined;
  if (parsed.jsonBody !== undefined) {
    if (!command.takesBody) return usage(io, `${command.name} takes no body, so --json-body does not apply.`, command);
    const read = await readJsonBody(parsed.jsonBody, io);
    if (!read.ok) return usage(io, read.message, command);
    jsonBody = read.value;
  }
  const built = assemble(command, parsed, jsonBody);
  if (!built.ok) return usage(io, built.message, command);
  const secret = parsed.secret ?? io.env[ENV.agentSecret];
  const client = createClient({ base, ...(secret && { secret }), ...(io.project && { project: io.project }), ...(io.fetch && { fetch: io.fetch }) });
  try {
    const answer = await client.call(command.operationId as OperationId, built.input);
    io.stdout(`${parsed.text ? formatText(answer) : JSON.stringify(answer, null, 2)}\n`);
    return 0;
  } catch (err) {
    io.stderr(`${failureLines(err, base).join('\n')}\n`);
    return 1;
  }
}
