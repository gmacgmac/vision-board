// The agent's access rules (PLAN agent-access § The rules; maintainer points 329, 331, 334): one table
// of paths relative to the board's folder, each with what a read and a write get. `policy.ts` resolves a
// path to the file it reaches before it asks this table, so a rule matches the file, never the text typed.
// Pure: no I/O. The bots' secrets are refused in any board folder, a nested one too (point 339);
// `.env.example` holds no secret and is read freely (point 338).
import * as words from './words/agent-access.ts';

export type AccessVerdict = 'allow' | 'ask' | 'refuse';
export type AccessOp = 'read' | 'write';

export interface AccessRule {
  /** A glob relative to the board's folder: `*` within one name, `**` any number of names; `x/**` is `x` too. */
  path: string;
  read: AccessVerdict;
  write: AccessVerdict;
  /** What the agent is told when the rule refuses it (and what the row means). */
  why: string;
}

/**
 * The table. The most specific matching row wins: a row that names a file (its last part is not `**`)
 * beats one that names a folder's contents, then more named parts win, then the order written. So
 * `**` + `/.env` holds inside `.visionboard/images/`, and `images/**` beats `.visionboard/**`.
 */
export const ACCESS_RULES: readonly AccessRule[] = [
  { path: '**', read: 'allow', write: 'ask', why: words.filesInTheFolder },
  { path: '**/.env', read: 'refuse', write: 'refuse', why: words.secretsFiles },
  { path: '**/.env.*', read: 'refuse', write: 'refuse', why: words.secretsFiles },
  { path: '**/.env.example', read: 'allow', write: 'ask', why: words.secretsExample },
  { path: '**/.visionboard/agents.json', read: 'refuse', write: 'refuse', why: words.boardSecrets },
  { path: '**/.visionboard/chat-sessions.json', read: 'refuse', write: 'refuse', why: words.boardSecrets },
  { path: '.visionboard/ledger.jsonl', read: 'allow', write: 'refuse', why: words.theLedger },
  { path: '.visionboard/lock', read: 'allow', write: 'refuse', why: words.boardFiles },
  { path: '.visionboard/app-state/**', read: 'allow', write: 'refuse', why: words.boardFiles },
  { path: '.visionboard/permissions.json', read: 'allow', write: 'refuse', why: words.permissionsFile },
  { path: '.visionboard/**', read: 'allow', write: 'refuse', why: words.boardFiles },
  { path: '.visionboard/images/**', read: 'allow', write: 'allow', why: words.boardPicturesAndApps },
  { path: '.visionboard/apps/**', read: 'allow', write: 'allow', why: words.boardPicturesAndApps },
  { path: '.git/**', read: 'allow', write: 'refuse', why: words.gitFolder },
];

/** The table's last line: a path that resolves outside the board's folder. */
export const OUTSIDE_RULE: AccessRule = { path: '', read: 'ask', write: 'ask', why: words.filesOutsideTheFolder };

const escape = (s: string) => s.replace(/[.+^${}()|[\]\\?]/g, '\\$&');

/** A glob as a regular expression over a `/`-joined relative path ('' is the folder itself). */
export function globRegExp(glob: string, flags = ''): RegExp {
  const parts = glob.split('/');
  let re = '';
  parts.forEach((part, i) => {
    const last = i === parts.length - 1;
    if (part === '**') re += last ? (i === 0 ? '.*' : '(?:/.*)?') : '(?:[^/]+/)*';
    else re += (i > 0 && parts[i - 1] !== '**' ? '/' : '') + part.split('*').map(escape).join('[^/]*');
  });
  return new RegExp(`^${re}$`, flags);
}

const rank = (r: AccessRule): [number, number] => {
  const parts = r.path.split('/');
  return [parts[parts.length - 1] === '**' ? 0 : 1, parts.filter((p) => !p.includes('*')).length];
};
const COMPILED = ACCESS_RULES.map((rule, order) => ({ rule, order, rank: rank(rule), exact: globRegExp(rule.path), folded: globRegExp(rule.path, 'i') }));
const SEVERITY: Record<AccessVerdict, number> = { allow: 0, ask: 1, refuse: 2 };

function pick(rel: string, folded: boolean): AccessRule {
  let best: (typeof COMPILED)[number] | undefined;
  for (const c of COMPILED) {
    if (!(folded ? c.folded : c.exact).test(rel)) continue;
    if (!best || c.rank[0] > best.rank[0] || (c.rank[0] === best.rank[0] && c.rank[1] > best.rank[1])) best = c;
  }
  return best!.rule; // `**` matches every path
}

/**
 * The rule for `rel` (relative to the folder, `/`-joined, '' for the folder itself) and what `op`
 * gets. Matched as written and again ignoring case, and the stricter answer kept: on a disk that
 * ignores case `.ENV` is `.env`, and on one that doesn't, refusing it costs nothing.
 */
export function accessFor(rel: string, op: AccessOp): { verdict: AccessVerdict; rule: AccessRule } {
  const exact = pick(rel, false);
  const folded = pick(rel, true);
  const rule = SEVERITY[folded[op]] > SEVERITY[exact[op]] ? folded : exact;
  return { verdict: rule[op], rule };
}

/** The more restrictive of two verdicts. */
export const stricter = (a: AccessVerdict, b: AccessVerdict): AccessVerdict => (SEVERITY[a] >= SEVERITY[b] ? a : b);

/** A glob word's pattern for one name: `*`, `?` and `[...]` as the shell reads them (a leading `.` is
 * matched only by a `.`). A pattern too odd to read matches everything, so it is refused, not passed. */
function nameGlob(name: string): RegExp {
  const re = name.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.').replace(/\[!/g, '[^');
  try { return new RegExp(`^${/^[*?[]/.test(name) ? '(?!\\.)' : ''}${re}$`, 'i'); } catch { return /^/; }
}

/** For each refused row, a path it refuses (`**` read as a name), to test a glob word against. */
const SAMPLES = ACCESS_RULES.map((rule) => ({ rule, sample: rule.path.replace(/^\*\*\//, '').replace(/\*\*/g, 'x').replace(/\*/g, 'x') }));

/**
 * A row that refuses `op` for some trailing part of `word`, as a command names it: `$HOME/p/.env`,
 * `../.env`, `HEAD:.env` (split by the caller) or `.e*` all end in a refused name. A command's words
 * can't be resolved for sure (a `cd`, a variable), so any trailing part counts, wherever it points.
 */
export function refusedTail(word: string, op: AccessOp, glob = false): AccessRule | null {
  const parts = word.split('/').filter((p) => p !== '' && p !== '.' && p !== '..');
  for (let k = 1; k <= parts.length; k++) {
    const tail = parts.slice(-k);
    if (glob && tail.some((p) => /[*?[]/.test(p))) {
      const hit = SAMPLES.find(({ rule, sample }) => rule[op] === 'refuse' && sample.split('/').length === k
        && sample.split('/').every((s, i) => nameGlob(tail[i]!).test(s)));
      if (hit) return hit.rule;
      continue;
    }
    const { verdict, rule } = accessFor(tail.join('/'), op);
    if (verdict === 'refuse') return rule;
  }
  return null;
}

