// The agent's access policy (PLAN agent-access; maintainer points 329, 331, 334): for one tool call, allow,
// ask (with the answers the person may give) or refuse (with what the agent is told). A path is first
// resolved to the file it reaches, as the kernel would: absolute, `..` taken on the real folders,
// symlinks followed, the name as the disk spells it; a file not made yet by its nearest existing folder.
// Then the rules table (`access-rules.ts`) decides. A refusal holds whatever the person answers; the
// host asks only what this returns as `ask`, and applies anything it remembers after this, never before.
// Pure but for the disk, which it sees only through an injected reader (`NODE_READER` by default).
import { lstatSync, readdirSync, readlinkSync, realpathSync } from 'node:fs';
import path from 'node:path';
import type { AccessOp, AccessVerdict } from './access-rules.ts';
import { OUTSIDE_RULE, accessFor, refusedTail, stricter } from './access-rules.ts';
import type { Facts } from './approvals.ts';
import { readOnlyCommand, shellWords } from './readonly-command.ts';
import * as words from './words/agent-access.ts';

/** A read the agent asks for (a file, or with `recursive` every file under a folder, as a search reads). */
export interface ReadFacts {
  kind: 'read';
  path: string;
  recursive?: boolean;
}

export type PolicyFacts = Facts | ReadFacts;
/** `folder`: remembered for the board's folder; never offered for a path outside it. */
export type AskScope = 'once' | 'session' | 'folder';
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

function place(root: string, input: string, reader: PathReader): ResolvedPath {
  const abs = follow(path.isAbsolute(input) ? '/' : root, input.split('/'), reader, { n: 0 });
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
  /** A second name for a file (a hard link): what it is can't be told, so a yes is never kept. */
  once: boolean;
  at: ResolvedPath;
}

function judge(root: string, input: string, op: AccessOp, reader: PathReader): Judged {
  const at = place(root, input, reader);
  if (at.rel === null) return { verdict: OUTSIDE_RULE[op], why: OUTSIDE_RULE.why, inside: false, once: false, at };
  const { verdict, rule } = accessFor(at.rel, op);
  const once = verdict !== 'refuse' && !!at.stat?.isFile() && at.stat.nlink > 1;
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

/** The words a command's word may name a file by: itself, after `=` or `:`, a flag's joined value. */
function candidates(word: string): string[] {
  if (word.startsWith('--')) return word.includes('=') ? [word.slice(word.indexOf('=') + 1)] : [];
  if (word.startsWith('-') && word.length > 2) return Array.from({ length: Math.min(word.length, 256) - 2 }, (_, k) => word.slice(k + 2));
  if (word.startsWith('-')) return [];
  const out = [word];
  if (word.includes('=')) out.push(word.slice(word.indexOf('=') + 1));
  out.push(...word.split(':').slice(1));
  return out.filter((c) => c !== '');
}

function commandPolicy(command: string, root: string, reader: PathReader, strict: boolean): Decision {
  const readOnly = readOnlyCommand(command);
  const op: AccessOp = readOnly ? 'read' : 'write';
  const { segments } = shellWords(command);
  for (const word of segments.flat()) {
    for (const c of candidates(word.text)) {
      const rule = refusedTail(c, op, word.glob);
      if (rule) return { refuse: words.commandNames(c, rule.why) };
    }
  }
  const judged: Judged[] = [];
  let verdict: AccessVerdict = readOnly ? 'allow' : 'ask';
  for (const word of segments.flatMap((s) => s.slice(1))) {
    for (const c of candidates(word.text)) {
      const j = judge(root, c, op, reader);
      if (j.verdict === 'refuse') return { refuse: words.commandNames(c, j.why) };
      verdict = stricter(verdict, j.verdict);
      judged.push(j);
    }
  }
  let once = false;
  for (const where of readOnly?.searches ?? []) {
    const j = judge(root, where, 'read', reader);
    if (!j.inside || !j.at.stat?.isDirectory()) continue;
    const found = search(root, j.at, reader);
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
    if (facts.kind === 'command') return commandPolicy(facts.command, root, reader, strict);
    if (facts.path === '') return { refuse: words.noPath };
    const j = judge(root, facts.path, facts.kind === 'read' ? 'read' : 'write', reader);
    if (j.verdict === 'refuse') return { refuse: j.why };
    if (facts.kind === 'read' && facts.recursive && j.inside && j.at.stat?.isDirectory()) {
      const found = search(root, j.at, reader);
      if (found !== null && found !== 'unsure') return { refuse: words.searchReaches(facts.path, found.refused) };
      return settle(j.verdict, [j], strict, found === 'unsure');
    }
    return settle(j.verdict, [j], strict);
  } catch {
    return { refuse: words.cannotFollow };
  }
}
