// Shell commands for the access rules (PLAN agent-access § The rules): the words a command names, as the
// shell would hand them to the program, and whether it only reads. Read-only is an allow-list (`ls`,
// `cat`, `head`, `tail`, `wc`, `pwd`, `tree`, `stat`, `file`, `grep`, `rg`, `find` without what runs,
// deletes or writes, and `git`'s reading subcommands), joined only by `|`, with plain words: no
// redirection, `$`, backticks, `;`, `&`, globs, `~` or braces. Anything else is not read-only (asked).
// Pure: no I/O. `policy.ts` decides each word against the rules. Also what a remembered yes for a
// command covers (`commandHead`, `rememberedHead`) and the one table of commands never remembered
// (`NEVER_REMEMBERED`: they run any code, act on whatever they target, or reach the network).

export interface ShellWord {
  /** The word after quote removal. */
  text: string;
  /** Whether it holds an unquoted `*`, `?` or `[` (the shell would expand it). */
  glob: boolean;
}

export interface ShellWords {
  /** The words of each `|`-joined part, best effort even when the command is not plain. */
  segments: ShellWord[][];
  /** No expansion, redirection or operator but `|`, and every quote closed. */
  plain: boolean;
}

/** What a read-only command reads: words that may name a file, and folders whose files it reads. */
export interface ReadOnly {
  reads: string[];
  searches: string[];
}

const BREAK = new Set([';', '&', '<', '>', '(', ')', '`', '\n']);
const GLOB = new Set(['*', '?', '[']);
const ESCAPES: Record<string, string> = { n: '\n', t: '\t', r: '\r', a: '\x07', b: '\b', e: '\x1b', E: '\x1b', f: '\f', v: '\v', '\\': '\\', '\'': '\'', '"': '"', '?': '?' };

/** Bash's and zsh's `$'...'` from `from` (after the quote): its text and where it closes. */
function ansiC(s: string, from: number): [string, number] {
  let out = '';
  for (let i = from; i < s.length; i++) {
    if (s[i] === '\'') return [out, i];
    if (s[i] !== '\\') { out += s[i]; continue; }
    const e = /^(?:x[0-9a-fA-F]{1,2}|u[0-9a-fA-F]{1,4}|U[0-9a-fA-F]{1,8}|[0-7]{1,3}|c[\s\S]|[\s\S])/.exec(s.slice(i + 1))?.[0] ?? '';
    i += e.length;
    const code = /^[xuU]./.test(e) ? parseInt(e.slice(1), 16) : /^[0-7]/.test(e) ? parseInt(e, 8) : e[0] === 'c' ? e.charCodeAt(1) & 31 : -1;
    out += code >= 0 ? String.fromCodePoint(Math.min(code, 0x10ffff)) : ESCAPES[e] ?? `\\${e}`;
  }
  return [out, s.length];
}

/** A command's words, as a POSIX shell (bash, zsh) splits and unquotes them. */
export function shellWords(command: string): ShellWords {
  const segments: ShellWord[][] = [[]];
  let plain = true;
  let text = '';
  let glob = false;
  let started = false;
  let quote = '';
  const end = () => {
    if (started) segments[segments.length - 1]!.push({ text, glob });
    text = ''; glob = false; started = false;
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i]!;
    const next = command[i + 1] ?? '';
    if (quote === '\'') { if (c === '\'') quote = ''; else text += c; continue; }
    if (quote === '"') {
      if (c === '"') quote = '';
      else if (c === '\\' && '$`"\\\n'.includes(next) && next !== '') { text += next; i++; }
      else { if (c === '$' || c === '`') plain = false; text += c; }
      continue;
    }
    if (c === '\\') { if (next !== '\n') { text += next; started = true; } i++; continue; }
    if (c === '\'' || c === '"') { quote = c; started = true; continue; }
    if (c === ' ' || c === '\t') { end(); continue; }
    if (c === '|') {
      end();
      if (next === '|' || next === '&') { plain = false; i++; }
      segments.push([]);
      continue;
    }
    if (BREAK.has(c)) { plain = false; end(); continue; }
    if (c === '$' && next === '\'') { const [t, at] = ansiC(command, i + 2); text += t; i = at; plain = false; started = true; continue; }
    if (!started && (c === '#' || c === '=')) plain = false;       // a comment; zsh's `=cmd`
    if (c === '~' && (!started || text.endsWith('=') || text.endsWith(':'))) plain = false;
    if (c === '$' || c === '{' || c === '}') plain = false;
    if (GLOB.has(c)) { plain = false; glob = true; }
    text += c;
    started = true;
  }
  if (quote !== '') plain = false;
  end();
  return { segments, plain };
}

type Check = (args: string[]) => boolean;
const none = (bad: string[]): Check => (args) => !args.some((a) => bad.some((b) => a === b || a.startsWith(`${b}=`)));
const GIT_BRANCH_LIST = new Set(['-a', '--all', '-r', '--remotes', '-v', '-vv', '--verbose', '-l', '--list', '--show-current',
  '--no-color', '--color', '--column', '--no-column', '--merged', '--no-merged', '--contains', '--no-contains', '--points-at',
  '--sort', '--format', '--abbrev', '--no-abbrev', '-i', '--ignore-case', '--omit-empty']);
const GIT_READS = new Set(['log', 'status', 'diff', 'show', 'blame', 'ls-files', 'rev-parse', 'branch']);

/** The allow-list: each command and what its arguments may not hold. */
const READERS: Record<string, Check> = {
  ls: () => true, cat: () => true, head: () => true, tail: () => true, pwd: () => true, stat: () => true,
  wc: none(['--files0-from']),
  tree: (args) => !args.some((a) => /^-[^-]*[oR]/.test(a) || a.startsWith('--output')),
  file: (args) => !args.some((a) => /^-[^-]*C/.test(a) || a === '--compile'),
  grep: () => true,
  rg: none(['--pre', '--pre-glob', '--hostname-bin']),
  find: none(['-exec', '-execdir', '-ok', '-okdir', '-delete', '-fprint', '-fprint0', '-fprintf', '-fls']),
  git: (args) => GIT_READS.has(args[0] ?? '') && none(['--output'])(args)
    && (args[0] !== 'branch' || args.slice(1).every((a) => GIT_BRANCH_LIST.has(a.split('=')[0]!))),
};

/** grep's and rg's flags that take no value, in the simple form whose words we can tell apart. */
const SIMPLE = { grep: /^-[rRnilwHhcvsFEoLqxIZ]+$/, rg: /^-[nilwHcvsFoLUxuNqSI.]+$/ };
const SIMPLE_LONG = new Set(['--recursive', '--dereference-recursive', '--line-number', '--ignore-case', '--files-with-matches',
  '--count', '--fixed-strings', '--word-regexp', '--invert-match', '--no-messages', '--with-filename', '--no-filename',
  '--only-matching', '--hidden', '--no-ignore', '--follow', '--no-heading', '--smart-case']);
const isFlag = (w: string) => w.startsWith('-') && w !== '-';

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
    reads.push(...(cmd === 'git' ? args.slice(1) : args).filter((a) => !isFlag(a)));
    if (cmd === 'grep' || cmd === 'rg') searches.push(...searched(cmd, args));
  }
  return { reads, searches };
}

/** A plain command's words, git's `-C <dir>` and `-c k=v` left out (they don't change what it does); null when not plain. */
function plainWords(command: string): string[] | null {
  const { segments, plain } = shellWords(command);
  const [only, ...more] = segments;
  if (!plain || more.length > 0 || !only || only.length === 0) return null;
  const words = only.map((w) => w.text);
  if (words[0] !== 'git') return words;
  let i = 1;
  while (words[i] === '-C' || words[i] === '-c') i += 2;
  return ['git', ...words.slice(i)];
}

/**
 * The first words a remembered yes for this command may cover (`npm test`, `git commit`, `ls`):
 * the program, and its subcommand when the second word is one (`git -C x commit` is `git commit`).
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
/** git's force: `--force`, `--force-with-lease`, `-f` alone or among short flags. */
const forced = (rest: string[]) => rest.some((w) => w === '--force' || w.startsWith('--force-') || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(w));

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
    'git reset', 'git clean', 'git restore', 'git push', 'git rebase', 'npm publish',
  ]),
  { head: 'git checkout', kind: 'targets', when: (rest) => rest.includes('--') },
  { head: 'git branch', kind: 'targets', when: (rest) => rest.some((w) => /^-[a-zA-Z]*D/.test(w)) },
  { head: 'git', kind: 'targets', when: forced },
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
