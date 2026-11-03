// The agent's access policy (PLAN agent-access; maintainer points 329, 331, 334): for one tool call, allow,
// ask (with the answers the person may give) or refuse (with what the agent is told). A path is first
// resolved to the file it reaches, as the kernel would: absolute, `..` taken on the real folders,
// symlinks followed, the name as the disk spells it; a file not made yet by its nearest existing folder.
// Then the rules table (`access-rules.ts`) decides. A refusal holds whatever the person answers; the
// host asks only what this returns as `ask`, and applies anything it remembers after this, never before.
// Pure but for the disk, which it sees only through an injected reader (`NODE_READER` by default).
import { lstatSync, readdirSync, readlinkSync, realpathSync } from 'node:fs';
import path from 'node:path';
import type { CommandOp, AccessVerdict, OpenLedger } from './access-rules.ts';
import { OUTSIDE_RULE, accessFor, refusedTail, stricter, verdictOf } from './access-rules.ts';
import type { AskScope, Facts } from './approvals.ts';
import { knownChanges } from './command-changes.ts';
import { SCRIPT_DEPTH, readOnlyCommand, runsProgram, shellScripts, shellWords } from './readonly-command.ts';
import * as words from './words/agent-access.ts';

export type { AskScope };
/** What the policy decides on: a write, a command, or a read (`ReadFacts`, in approvals.ts beside the others). */
export type PolicyFacts = Facts;
export type Decision = { allow: true } | { ask: true; scopes: AskScope[] } | { refuse: string };

export interface PathStat {
  isSymbolicLink(): boolean;
  isDirectory(): boolean;
  isFile(): boolean;
  nlink: number;
}

/** The disk as the policy sees it. `realpath` throws for a missing path; `lstat` gives undefined. */
export interface PathReader {
  realpath(p: string): string;
  lstat(p: string): PathStat | undefined;
  readlink(p: string): string;
  readdir(p: string): string[];
}

export interface ResolvedPath {
  /** The real path the call reaches. */
  abs: string;
  /** Relative to the board's folder, `/`-joined ('' for the folder itself); null when outside it. */
  rel: string | null;
  /** The file there, or undefined when it does not exist yet. */
  stat: PathStat | undefined;
}

export interface PolicyOptions {
  reader?: PathReader;
  /** The `agentAccessRules` flag off: nothing goes ahead unasked and nothing is kept for the folder. */
  strict?: boolean;
  /** For a command: the shell's working folder (Claude's hook `cwd`), which its relative words are
   * resolved from; the rules stay relative to the board's folder. Left out, the board's folder. */
  cwd?: string;
  /** The ledger the chat works on (`OpenLedger`): only its pictures and apps are written, only while it may be.
   * Left out, every ledger's are, as the rows say. */
  ledger?: OpenLedger | undefined;
}

const gone = (e: unknown) => ['ENOENT', 'ENOTDIR'].includes((e as { code?: string }).code ?? '');
export const NODE_READER: PathReader = {
  realpath: (p) => realpathSync.native(p),
  lstat: (p) => { try { return lstatSync(p, { throwIfNoEntry: false }); } catch (e) { if (gone(e)) return undefined; throw e; } },
  readlink: (p) => readlinkSync(p),
  readdir: (p) => readdirSync(p),
};

const MAX_LINKS = 40;
class Unfollowable extends Error {}

/** Walks `parts` from the real folder `from`, as the kernel would; what doesn't exist is added as written. */
function follow(from: string, parts: string[], reader: PathReader, links: { n: number }): string {
  let at = from;
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') { at = path.dirname(at); continue; }
    const next = path.join(at, part);
    const st = reader.lstat(next);
    if (!st) at = next;
    else if (st.isSymbolicLink()) {
      if (++links.n > MAX_LINKS) throw new Unfollowable();
      const target = reader.readlink(next);
      at = follow(path.isAbsolute(target) ? '/' : at, target.split('/'), reader, links);
    } else at = reader.realpath(next);
  }
  return at;
}

function place(root: string, input: string, reader: PathReader, base = root): ResolvedPath {
  const abs = follow(path.isAbsolute(input) ? '/' : base, input.split('/'), reader, { n: 0 });
  const rel = path.relative(root, abs);
  const outside = rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel);
  return { abs, rel: outside ? null : rel.split(path.sep).join('/'), stat: reader.lstat(abs) };
}

/** Where `input` (absolute, or relative to `folder`) really leads. Throws when the folder is missing or a link loops. */
export function resolveIn(folder: string, input: string, reader: PathReader = NODE_READER): ResolvedPath {
  return place(reader.realpath(folder), input, reader);
}

interface Judged {
  verdict: AccessVerdict;
  why: string;
  inside: boolean;
  /** A second name for a file (a hard link), or a command judged only by the person on a row that gives way
   * (`unknownCommand`): a kept yes for its first words would cover what they later do to the file. So never kept. */
  once: boolean;
  at: ResolvedPath;
}

function judge(root: string, input: string, op: CommandOp, reader: PathReader, base = root, open?: OpenLedger): Judged {
  const at = place(root, input, reader, base);
  if (at.rel === null) return { verdict: verdictOf(OUTSIDE_RULE, op), why: OUTSIDE_RULE.why, inside: false, once: false, at };
  const { verdict, rule } = accessFor(at.rel, op, open);
  const once = verdict !== 'refuse' && ((!!at.stat?.isFile() && at.stat.nlink > 1) || (op === 'unknown' && rule.unknownCommand !== undefined));
  return { verdict: once ? stricter(verdict, 'ask') : verdict, why: rule.why, inside: true, once, at };
}

/** The decision for what is left once nothing was refused. */
function settle(verdict: AccessVerdict, judged: Judged[], strict: boolean, once = false): Decision {
  if (verdict === 'allow' && !strict && !once) return { allow: true };
  if (once || judged.some((j) => j.once)) return { ask: true, scopes: ['once'] };
  return strict || judged.some((j) => !j.inside) ? { ask: true, scopes: ['once', 'session'] } : { ask: true, scopes: ['once', 'session', 'folder'] };
}

const SEARCH_LIMIT = 5000;

/**
 * What a search of `at` would read: the first file under it the rules refuse (a link counts as
 * the file it points to); `unsure` when it can't be told (a link to a folder or outside, a second
 * name, too many files); null when every file under it may be read.
 */
function search(root: string, at: ResolvedPath, reader: PathReader): { refused: string } | 'unsure' | null {
  let unsure = false;
  let seen = 0;
  const stack = [at.abs];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let names: string[];
    try { names = reader.readdir(dir); } catch { unsure = true; continue; }
    for (const name of names) {
      if (++seen > SEARCH_LIMIT) return 'unsure';
      const abs = path.join(dir, name);
      const rel = path.relative(root, abs).split(path.sep).join('/');
      const st = reader.lstat(abs);
      const j = st?.isSymbolicLink() ? judge(root, rel, 'read', reader) : undefined;
      const verdict = j ? j.verdict : accessFor(rel, 'read').verdict;
      if (verdict === 'refuse') return { refused: rel };
      if (j && (!j.inside || j.once || j.at.stat?.isDirectory())) unsure = true;
      else if (st?.isDirectory()) stack.push(abs);
      else if (st?.isFile() && st.nlink > 1) unsure = true;
    }
  }
  return unsure ? 'unsure' : null;
}

/** The words a word holds beside itself: after `=` or `:`, a flag's joined value. */
function parts(word: string): string[] {
  if (word.startsWith('--')) return word.includes('=') ? [word.slice(word.indexOf('=') + 1)] : [];
  if (word.startsWith('-') && word.length > 2) return Array.from({ length: Math.min(word.length, 256) - 2 }, (_, k) => word.slice(k + 2));
  if (word.startsWith('-')) return [];
  return [word, ...(word.includes('=') ? [word.slice(word.indexOf('=') + 1)] : []), ...word.split(':').slice(1)];
}

/** The words a command's word may name a file by: its `parts`, and in each what curl and its likes read a file from:
 * `@file`, `name@file`, `name=<file`, `name=@a,b;type=x` (F2). */
function candidates(word: string): string[] {
  const found = parts(word);
  const inFile = found.filter((c) => /[@<]/.test(c)).flatMap((c) => c.split(/[@<;,]/).slice(1));
  return [...found, ...inFile].filter((c) => c !== '');
}

/** What a search of `j` reaches in the board's folder: under it when it is inside; the whole board's
 * folder when it holds it (a search of the parent or of `/` reads the folder too, F3); else nothing the
 * rules govern (a folder outside that holds no board folder: the call is asked). */
function searchOf(root: string, j: Judged, reader: PathReader): ReturnType<typeof search> | undefined {
  if (!j.at.stat?.isDirectory()) return undefined;
  if (j.inside) return search(root, j.at, reader);
  const holds = j.at.abs === path.parse(j.at.abs).root || root.startsWith(`${j.at.abs}${path.sep}`);
  return holds ? search(root, place(root, root, reader), reader) : undefined;
}

/** `fed`: what this command prints goes to a command known to change what it is given (`rm "$(ls x)"`), so its words count as changed. */
function commandPolicy(command: string, root: string, reader: PathReader, strict: boolean, base: string, depth = 0, fed = false, open?: OpenLedger): Decision {
  if (runsProgram(command) !== null) return { refuse: words.gitIsThePersons };
  const readOnly = fed ? null : readOnlyCommand(command);
  const changes = readOnly ? null : knownChanges(command);
  const opOf = (c: string): CommandOp => (readOnly ? 'read' : fed || changes!.every || changes!.targets.includes(c) ? 'write' : 'unknown');
  const feeds = fed || !!changes?.every || !!changes?.targets.some((t) => /\$\(|`/.test(t));
  // A script a shell is handed is judged as the plain command it is; the shell around it still asks.
  let scriptOnce = false;
  for (const script of shellScripts(command)) {
    if (depth >= SCRIPT_DEPTH) throw new Unfollowable();
    const d = commandPolicy(script, root, reader, strict, base, depth + 1, feeds, open);
    if ('refuse' in d) return d;
    if ('ask' in d && !d.scopes.includes('session')) scriptOnce = true;
  }
  const { segments } = shellWords(command);
  for (const word of segments.flat()) {
    for (const c of candidates(word.text)) {
      const rule = refusedTail(c, opOf(c), word.glob, open);
      if (rule) return { refuse: words.commandNames(c, rule.why) };
    }
  }
  const judged: Judged[] = [];
  let verdict: AccessVerdict = readOnly ? 'allow' : 'ask';
  for (const word of segments.flatMap((s) => s.slice(1))) {
    for (const c of candidates(word.text)) {
      const j = judge(root, c, opOf(c), reader, base, open);
      if (j.verdict === 'refuse') return { refuse: words.commandNames(c, j.why) };
      verdict = stricter(verdict, j.verdict);
      judged.push(j);
    }
  }
  // A word outside the folder: asked once, never kept, so no yes covers a path outside (F2).
  let once = scriptOnce || judged.some((j) => !j.inside);
  for (const where of readOnly?.searches ?? []) {
    const found = searchOf(root, judge(root, where, 'read', reader, base), reader);
    if (found === 'unsure') once = true;
    else if (found) return { refuse: words.searchReaches(where, found.refused) };
  }
  return settle(verdict, judged, strict, once);
}

/** Allow, ask or refuse one tool call of the agent's, in the board's `folder`. */
export function policy(facts: PolicyFacts, folder: string, options: PolicyOptions = {}): Decision {
  const reader = options.reader ?? NODE_READER;
  const strict = options.strict ?? false;
  let root: string;
  try { root = reader.realpath(folder); } catch { return { refuse: words.noFolder }; }
  try {
    if (facts.kind === 'command') {
      let base = root;
      if (options.cwd !== undefined) { try { base = reader.realpath(options.cwd); } catch { return { refuse: words.cannotFollow }; } }
      return commandPolicy(facts.command, root, reader, strict, base, 0, false, options.ledger);
    }
    if (facts.path === '') return { refuse: words.noPath };
    const j = judge(root, facts.path, facts.kind === 'read' ? 'read' : 'write', reader, root, options.ledger);
    if (j.verdict === 'refuse') return { refuse: j.why };
    const found = facts.kind === 'read' && facts.recursive ? searchOf(root, j, reader) : undefined;
    if (found !== undefined) {
      if (found !== null && found !== 'unsure') return { refuse: words.searchReaches(facts.path, found.refused) };
      return settle(j.verdict, [j], strict, found === 'unsure');
    }
    return settle(j.verdict, [j], strict);
  } catch {
    return { refuse: words.cannotFollow };
  }
}
