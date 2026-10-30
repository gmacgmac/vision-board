// A shell command's words, as a POSIX shell (bash, zsh) would hand them to the program: split, unquoted, with what is
// redirected and what a double-quoted string substitutes. One parser: `readonly-command.ts`, `command-changes.ts` and
// `policy.ts` all read a command through this. Pure: no I/O.

export interface ShellWord {
  /** The word after quote removal. */
  text: string;
  /** Whether it holds an unquoted `*`, `?` or `[` (the shell would expand it). */
  glob: boolean;
}

export interface ShellWords {
  /** The words of each `|`-joined part, best effort even when the command is not plain. */
  segments: ShellWord[][];
  /** The words of each simple command: split at `|`, `;`, `&`, a line break, `(`, `)` and a backtick. */
  commands: ShellWord[][];
  /** The word after each redirection that writes (`>`, `>>`, `>|`, `2>`, `&>`, `<>`). */
  redirected: string[];
  /** The script of each `$(...)` and backtick inside double quotes, which the word's text only shows. Never overlapping;
   * single quotes and a `\\$` hold none. Unquoted ones need no list: their words are among the others. */
  substitutions: string[];
  /** No expansion, redirection or operator but `|`, and every quote closed. */
  plain: boolean;
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

/** Where the `)` closing a `$(` is, reading from `from`: quotes and nesting followed; the end when there is none. */
function closingParen(s: string, from: number): number {
  let depth = 1;
  let quote = '';
  for (let i = from; i < s.length; i++) {
    const c = s[i]!;
    if (c === '\\' && quote !== '\'') i++;
    else if (quote === '"' && c === '$' && s[i + 1] === '(') i = closingParen(s, i + 2);
    else if (quote) { if (c === quote) quote = ''; }
    else if (c === '\'' || c === '"') quote = c;
    else if (c === '(') depth++;
    else if (c === ')' && --depth === 0) return i;
  }
  return s.length;
}

/** The substitution starting at `at` in a double-quoted string: its script and its last character. */
function substitution(s: string, at: number): { script: string; end: number } {
  if (s[at] !== '`') {
    const end = closingParen(s, at + 2);
    return { script: s.slice(at + 2, end), end };
  }
  let end = at + 1;
  while (end < s.length && s[end] !== '`') end += s[end] === '\\' ? 2 : 1;
  return { script: s.slice(at + 1, end).replace(/\\([`$\\"])/g, '$1'), end };
}

/** A command's words, as a POSIX shell (bash, zsh) splits and unquotes them. */
export function shellWords(command: string): ShellWords {
  const segments: ShellWord[][] = [[]];
  const commands: ShellWord[][] = [[]];
  const redirected: string[] = [];
  const substitutions: string[] = [];
  let writing = false;
  let plain = true;
  let text = '';
  let glob = false;
  let started = false;
  let quote = '';
  const end = () => {
    if (started) {
      segments[segments.length - 1]!.push({ text, glob });
      commands[commands.length - 1]!.push({ text, glob });
      if (writing) redirected.push(text);
      writing = false;
    }
    text = ''; glob = false; started = false;
  };
  /** One character inside double quotes; the place to go on from. */
  const inDoubleQuotes = (c: string, next: string, i: number): number => {
    if (c === '"') quote = '';
    else if (c === '\\' && '$`"\\\n'.includes(next) && next !== '') { text += next; return i + 1; }
    else if (c === '`' || (c === '$' && next === '(')) {
      const { script, end: last } = substitution(command, i);
      substitutions.push(script);
      plain = false;
      text += command.slice(i, last + 1);
      return last;
    } else { if (c === '$') plain = false; text += c; }
    return i;
  };
  for (let i = 0; i < command.length; i++) {
    const c = command[i]!;
    const next = command[i + 1] ?? '';
    if (quote === '\'') { if (c === '\'') quote = ''; else text += c; continue; }
    if (quote === '"') { i = inDoubleQuotes(c, next, i); continue; }
    if (c === '\\') { if (next !== '\n') { text += next; started = true; } i++; continue; }
    if (c === '\'' || c === '"') { quote = c; started = true; continue; }
    if (c === ' ' || c === '\t') { end(); continue; }
    if (c === '|') {
      end();
      if (next === '|' || next === '&') { plain = false; i++; }
      segments.push([]);
      commands.push([]);
      continue;
    }
    if (BREAK.has(c)) {
      plain = false;
      end();
      if (c === '>') { writing = true; if (next === '|') i++; }
      else if (c !== '<') commands.push([]);
      continue;
    }
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
  return { segments, commands, redirected, substitutions, plain };
}
