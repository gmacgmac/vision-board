// Argument parsing with no dependency (api.md 51). `--name value`, `--name=value`, `--switch`,
// `--no-switch` for a boolean input. Values are typed from the generated table (numbers and
// booleans; a `json` input takes a JSON text). Nothing here runs a command or reads a file.
import type { CommandInfo, CommandInput } from './commands.generated.ts';
import { GLOBAL_NAMES } from './globals.ts';

/** What the command line said: inputs by name (typed), the global flags, nothing checked for presence yet. */
export interface Parsed {
  values: Record<string, unknown>;
  server?: string;
  secret?: string;
  jsonBody?: string;
  text: boolean;
  help: boolean;
}

export type Failure = { ok: false; message: string };
export type ParseResult = { ok: true; value: Parsed } | Failure;

const fail = (message: string): Failure => ({ ok: false, message });
export const flagOf = (name: string) => name.replaceAll('_', '-');

/** One raw string typed as the table says, or the reason it cannot be. */
export function typed(input: CommandInput, raw: string): { ok: true; value: unknown } | Failure {
  const flag = `--${flagOf(input.name)}`;
  switch (input.type) {
    case 'string':
      return raw === '' ? fail(`${flag} needs a value.`) : { ok: true, value: raw };
    case 'integer':
      return /^-?\d+$/.test(raw) ? { ok: true, value: Number(raw) } : fail(`${flag} must be a whole number, not "${raw}".`);
    case 'number':
      return raw.trim() !== '' && Number.isFinite(Number(raw)) ? { ok: true, value: Number(raw) } : fail(`${flag} must be a number, not "${raw}".`);
    case 'boolean':
      return raw === 'true' || raw === 'false' ? { ok: true, value: raw === 'true' } : fail(`${flag} must be true or false, not "${raw}".`);
    case 'json':
      try { return { ok: true, value: JSON.parse(raw) as unknown }; } catch { return fail(`${flag} must be JSON text (or give the whole body with --json-body).`); }
  }
}

interface Flag { name: string; input?: CommandInput; boolean: boolean; off: boolean }

/** Which flag a `--name` is: a global one, an input of the command, or `--no-<boolean input>`. */
function flagFor(command: CommandInfo, name: string): Flag | undefined {
  if (GLOBAL_NAMES.includes(name)) return { name, boolean: name === 'text' || name === 'help', off: false };
  const byFlag = (n: string) => command.inputs.find((i) => flagOf(i.name) === n);
  const direct = byFlag(name);
  if (direct) return { name, input: direct, boolean: direct.type === 'boolean', off: false };
  const negated = name.startsWith('no-') ? byFlag(name.slice(3)) : undefined;
  return negated?.type === 'boolean' ? { name, input: negated, boolean: true, off: true } : undefined;
}

/** Parse the arguments after the command word. */
export function parseArgs(command: CommandInfo, argv: readonly string[]): ParseResult {
  const out: Parsed = { values: {}, text: false, help: false };
  const seen = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (token === '-h') { out.help = true; continue; }
    if (!token.startsWith('--') || token === '--') return fail(`Unexpected argument "${token}". Inputs are flags, such as --board <id>.`);
    const eq = token.indexOf('=');
    const name = token.slice(2, eq === -1 ? undefined : eq);
    const flag = flagFor(command, name);
    if (!flag) return fail(`Unknown flag --${name}.`);
    if (seen.has(flag.name)) return fail(`--${name} is given twice.`);
    seen.add(flag.name);
    let raw: string | undefined = eq === -1 ? undefined : token.slice(eq + 1);
    if (raw === undefined) {
      const next = argv[i + 1];
      const takes = flag.boolean ? next === 'true' || next === 'false' : next !== undefined && !next.startsWith('--');
      if (takes) { raw = next; i++; }
    }
    if (raw === undefined && !flag.boolean) return fail(`--${name} needs a value.`);
    const applied = apply(out, flag, raw);
    if (!applied.ok) return applied;
  }
  return { ok: true, value: out };
}

function apply(out: Parsed, flag: Flag, raw: string | undefined): { ok: true } | Failure {
  if (flag.input) {
    const t = typed(flag.input, raw ?? 'true');
    if (!t.ok) return t;
    out.values[flag.input.name] = flag.off ? !t.value : t.value;
    return { ok: true };
  }
  if (flag.name === 'text' || flag.name === 'help') {
    if (raw !== undefined && raw !== 'true' && raw !== 'false') return fail(`--${flag.name} must be true or false, not "${raw}".`);
    out[flag.name] = raw !== 'false';
  } else if (flag.name === 'server') out.server = raw!;
  else if (flag.name === 'secret') out.secret = raw!;
  else out.jsonBody = raw!;
  return { ok: true };
}

/** The inputs to hand to the client: path and query as named values, the rest as `body`. A
 * `--json-body` object is the base; flags win. Every required input must be there. */
export function assemble(
  command: CommandInfo, parsed: Parsed, jsonBody?: Record<string, unknown>,
): { ok: true; input: Record<string, unknown> } | Failure {
  const body: Record<string, unknown> = { ...jsonBody };
  const input: Record<string, unknown> = {};
  for (const i of command.inputs) {
    const value = parsed.values[i.name];
    if (i.in === 'body' && value !== undefined) body[i.name] = value;
    else if (i.in !== 'body' && value !== undefined) input[i.name] = value;
    const given = i.in === 'body' ? body[i.name] !== undefined : value !== undefined;
    if (i.required && !given) {
      return fail(`${command.name} needs --${flagOf(i.name)}${i.in === 'body' ? ' (or a --json-body that has it)' : ''}.`);
    }
  }
  if (command.takesBody) input.body = body;
  return { ok: true, input };
}
