// Shell commands for the access rules (PLAN agent-access § The rules): the words a command names, as the
// shell would hand them to the program, and whether it only reads. Read-only is an allow-list (`ls`,
// `cat`, `head`, `tail`, `wc`, `pwd`, `tree`, `stat`, `file`, `grep`, `rg`, `find` without what runs,
// deletes or writes), joined only by `|`, with plain words: no redirection, `$`, backticks, `;`, `&`,
// globs, `~` or braces. Anything else is not read-only (asked). git is the person's (point 346): never
// read-only, and `runsProgram` finds it in any command, however spelled, so the policy refuses it.
// Pure: no I/O. `policy.ts` decides each word against the rules. Also what a remembered yes for a
// command covers (`commandHead`, `rememberedHead`) and the one table of commands never remembered
// (`NEVER_REMEMBERED`: they run any code, act on whatever they target, or reach the network).

import { shellWords } from './shell-words.ts';
export type { ShellWord, ShellWords } from './shell-words.ts';
export { shellWords };

/** What a read-only command reads: words that may name a file, and folders whose files it reads. */
export interface ReadOnly {
  reads: string[];
  searches: string[];
}

type Check = (args: string[]) => boolean;
const none = (bad: string[]): Check => (args) => !args.some((a) => bad.some((b) => a === b || a.startsWith(`${b}=`)));

/** The allow-list: each command and what its arguments may not hold. */
const READERS: Record<string, Check> = {
  ls: () => true, cat: () => true, head: () => true, tail: () => true, pwd: () => true, stat: () => true,
  wc: none(['--files0-from']),
  tree: (args) => !args.some((a) => /^-[^-]*[oR]/.test(a) || a.startsWith('--output')),
  file: (args) => !args.some((a) => /^-[^-]*C/.test(a) || a === '--compile'),
  grep: () => true,
  rg: none(['--pre', '--pre-glob', '--hostname-bin']),
  find: none(['-exec', '-execdir', '-ok', '-okdir', '-delete', '-fprint', '-fprint0', '-fprintf', '-fls']),
};

/** grep's and rg's flags that take no value, in the simple form whose words we can tell apart. */
const SIMPLE = { grep: /^-[rRnilwHhcvsFEoLqxIZ]+$/, rg: /^-[nilwHcvsFoLUxuNqSI.]+$/ };
const SIMPLE_LONG = new Set(['--recursive', '--dereference-recursive', '--line-number', '--ignore-case', '--files-with-matches',
  '--count', '--fixed-strings', '--word-regexp', '--invert-match', '--no-messages', '--with-filename', '--no-filename',
  '--only-matching', '--hidden', '--no-ignore', '--follow', '--no-heading', '--smart-case']);
export const isFlag = (w: string): boolean => w.startsWith('-') && w !== '-';

/**
 * The folders a grep or rg reads every file under. Recursive: rg always; grep with `-r`, `-R` or
 * `--recursive`/`--directories` (any doubt counts as recursive). In the simple form (known flags
 * only, no `-e`/`-f`) the first word is the pattern and the rest are paths; otherwise the folder
 * itself is counted too, as it is when no path is named.
 */
function searched(cmd: 'grep' | 'rg', args: string[]): string[] {
  if (cmd === 'rg' && args.includes('--files')) return [];
  const recursive = cmd === 'rg' || args.some((a) => /^-[^-]*[rRd]/.test(a) || /^--(?:recursive|dereference-recursive|directories)/.test(a));
  if (!recursive) return [];
  const simple = args.filter(isFlag).every((a) => SIMPLE[cmd].test(a) || SIMPLE_LONG.has(a));
  const paths = args.filter((a) => !isFlag(a)).slice(1);
  return simple && paths.length > 0 ? paths : [...paths, '.'];
}

/** What a command reads when it only reads; null when it may do anything else (so it is asked). */
export function readOnlyCommand(command: string): ReadOnly | null {
  const { segments, plain } = shellWords(command);
  if (!plain || segments.some((s) => s.length === 0)) return null;
  const reads: string[] = [];
  const searches: string[] = [];
  for (const words of segments) {
    const [cmd = '', ...args] = words.map((w) => w.text);
    const check = Object.hasOwn(READERS, cmd) ? READERS[cmd] : undefined;
    if (!check || !check(args)) return null;
    reads.push(...args.filter((a) => !isFlag(a)));
    if (cmd === 'grep' || cmd === 'rg') searches.push(...searched(cmd, args));
  }
  return { reads, searches };
}

/** A plain command's words; null when not plain. */
function plainWords(command: string): string[] | null {
  const { segments, plain } = shellWords(command);
  const [only, ...more] = segments;
  if (!plain || more.length > 0 || !only || only.length === 0) return null;
  return only.map((w) => w.text);
}

/** Programs the agent never runs, whatever the person answers (point 346: git is the person's). */
export const REFUSED_PROGRAMS: readonly string[] = ['git'];
/** Words that run the command after them: skipped, with their flags and values, to find the program. */
const WRAPPERS = new Set(['env', 'sudo', 'doas', 'command', 'builtin', 'exec', 'nohup', 'time', 'nice', 'timeout', 'xargs', 'stdbuf', 'eval', 'if', 'elif', 'while', 'until', 'then', 'do', 'else', '!']);
/** Shells whose `-c` takes a script (`shellScripts`). */
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'fish', 'csh', 'tcsh']);
/** How deep scripts inside scripts are followed: past it, `policy` refuses, as it can't be told. */
export const SCRIPT_DEPTH = 8;

/**
 * The scripts `command` hands a shell, each to be judged as a plain command: what follows `-c` in `sh -c`, `bash -lc`,
 * `env sh -c`; all of `eval`'s words; each substitution inside double quotes. One per simple command: what comes after it is the script's. A script on stdin, in a
 * file or in a variable is not here: it can't be read from the words (chat.md § Not covered).
 */
export function shellScripts(command: string): string[] {
  const { commands, substitutions } = shellWords(command);
  return [...substitutions, ...commands.flatMap((simple) => {
    const words = simple.map((w) => w.text);
    const at = words.findIndex((w) => { const name = w.split('/').pop()!; return name === 'eval' || SHELLS.has(name); });
    if (at < 0) return [];
    if (words[at]!.split('/').pop() === 'eval') return [words.slice(at + 1).join(' ')].filter(Boolean);
    const flag = words.findIndex((w, k) => k > at && /^-[a-zA-Z]*c[a-zA-Z]*$/.test(w));
    const script = flag < 0 ? undefined : words.slice(flag + 1).find((w) => !isFlag(w));
    return script ? [script] : [];
  })];
}

/**
 * The refused program `command` runs, if any, however it is spelled: every piece between the shell's
 * separators and quotes (`;`, `&&`, `|`, `$(…)`, backticks, `sh -c "…"`), its quotes and backslashes
 * gone, its assignments, wrappers (`env`, `sudo`, `xargs`) and their flags skipped, and the program by its
 * last path part (`/usr/bin/git`). A piece that only mentions it (`grep "git" README`) is refused too:
 * a quoted word starts a piece. Each simple command is read again as the shell hands it over, so quotes
 * inside a word are gone too (`g"i"t`, `'g'it`, `$'\x67it'`), and so is each script it hands a shell. Null when none.
 */
export function runsProgram(command: string, programs: readonly string[] = REFUSED_PROGRAMS, depth = 0): string | null {
  const pieces = command.replace(/\\(.)/g, '$1').split(/[;&|()`$'"\n{}]+/).map((piece) => piece.trim().split(/\s+/).filter(Boolean));
  const handed = shellWords(command).commands.map((simple) => simple.map((w) => w.text));
  for (const tokens of [...pieces, ...handed]) {
    let i = 0;
    while (i < tokens.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i]!) || WRAPPERS.has(tokens[i]!) || tokens[i]!.startsWith('-') || /^\d+[smhd]?$/.test(tokens[i]!))) i++;
    const program = tokens[i]?.split('/').pop();
    if (program !== undefined && programs.includes(program)) return program;
  }
  if (depth >= SCRIPT_DEPTH) return null;
  for (const script of shellScripts(command)) {
    const found = runsProgram(script, programs, depth + 1);
    if (found !== null) return found;
  }
  return null;
}

/**
 * The first words a remembered yes for this command may cover (`npm test`, `npm run`, `ls`):
 * the program, and its subcommand when the second word is one.
 * Null when the command is not one plain program (a yes for `npm test` must never cover `npm test && curl …`).
 */
export function commandHead(command: string): string | null {
  const words = plainWords(command);
  if (words === null) return null;
  const [first, second] = words;
  return second !== undefined && /^[a-z][a-z0-9-]*$/.test(second) ? `${first} ${second}` : first!;
}

/** Why a yes for a command is never remembered: it runs whatever code it is given; what it does
 * depends on the files it targets; it reaches the network. */
export type NeverKind = 'code' | 'targets' | 'network';
export interface NeverRow {
  /** The first word, or the first two (a subcommand). A first word's version suffix is ignored (`python3.12`). */
  head: string;
  kind: NeverKind;
  /** Only when the words after the head say so; always when left out. */
  when?: (rest: string[]) => boolean;
}

const rows = (kind: NeverKind, heads: string[]): NeverRow[] => heads.map((head) => ({ head, kind }));

/**
 * The commands a yes is never remembered for: asked every time (D-066 6; WIRE_01 Run 2). One table.
 */
export const NEVER_REMEMBERED: readonly NeverRow[] = [
  ...rows('code', [
    'sh', 'bash', 'zsh', 'dash', 'ksh', 'fish', 'csh', 'tcsh', 'python', 'node', 'nodejs', 'deno', 'bun', 'ruby', 'perl', 'php',
    'lua', 'osascript', 'pwsh', 'powershell', 'env', 'xargs', 'sudo', 'doas', 'su', 'nohup', 'nice', 'time', 'timeout',
    'watch', 'exec', 'eval', 'command', 'builtin', 'source', '.', 'npx', 'bunx', 'pnpx', 'uvx', 'pipx',
    'npm exec', 'npm x', 'pnpm exec', 'pnpm dlx', 'yarn dlx', 'yarn exec', 'bun x', 'uv run', 'poetry run',
  ]),
  ...rows('targets', [
    'rm', 'rmdir', 'mv', 'cp', 'chmod', 'chown', 'ln', 'dd', 'truncate',
    'npm publish',
    // git is the person's (point 346): refused before anything is remembered; never kept either
    'git',
  ]),
  ...rows('network', ['curl', 'wget']),
];

/** Heads whose next word is the script they run: the yes covers that script only (`npm run build`). */
const SCRIPT_HEADS = new Set(['npm run', 'npm run-script', 'pnpm run', 'yarn run', 'bun run']);

/**
 * What a remembered yes for `command` covers: its first words (`commandHead`), or null when it must
 * never be remembered: a command that is not plain, a script by its path (its content can change after
 * the yes), or a row of `NEVER_REMEMBERED`.
 */
export function rememberedHead(command: string): string | null {
  const words = plainWords(command);
  const head = commandHead(command);
  if (words === null || head === null) return null;
  const first = words[0]!;
  if (first.includes('/')) return null;
  const firstName = first.replace(/[0-9.]+$/, '') || first;
  for (const row of NEVER_REMEMBERED) {
    const n = row.head.split(' ').length;
    const named = n === 1 ? row.head === firstName || row.head === first : row.head === words.slice(0, 2).join(' ');
    if (named && (!row.when || row.when(words.slice(n)))) return null;
  }
  if (!SCRIPT_HEADS.has(head)) return head;
  const script = words[2];
  return script !== undefined && /^[a-z0-9][a-z0-9:._-]*$/i.test(script) ? `${head} ${script}` : null;
}
