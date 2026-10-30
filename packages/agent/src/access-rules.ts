// The agent's access rules (PLAN agent-access § The rules; maintainer points 329, 331, 334): one table
// of paths relative to the board's folder, each with what a read and a write get. `policy.ts` resolves a
// path to the file it reaches before it asks this table, so a rule matches the file, never the text typed.
// Pure: no I/O. The bots' secrets are refused in any board folder, a nested one too (point 339);
// `.env.example` holds no secret and is read freely (point 338).
import * as words from './words/agent-access.ts';

export type AccessVerdict = 'allow' | 'ask' | 'refuse';
export type AccessOp = 'read' | 'write';
/** What a shell command does to a word it names, as far as the rules can tell: `unknown` when they can't judge it. */
export type CommandOp = AccessOp | 'unknown';

export interface AccessRule {
  /** A glob relative to the board's folder: `*` within one name, `**` any number of names; `x/**` is `x` too. */
  path: string;
  read: AccessVerdict;
  write: AccessVerdict;
  /** What a command the rules can't judge gets on this row's files, when it differs from a write. Left out, such a
   * command counts as a write, so only a row that says so gives way (D-069 ruling 1). A yes for it is never kept. */
  unknownCommand?: AccessVerdict;
  /** What the agent is told when the rule refuses it (and what the row means). */
  why: string;
}

/**
 * The table. The most specific matching row wins: a row that names a file (its last part is not `**`)
 * beats one that names a folder's contents; between folders' contents, one that refuses both reading and
 * writing wins; then more named parts win, then the order written. So `**` + `/.env` holds inside
 * `.visionboard/images/`, `images/**` beats `.visionboard/**`, and `**` + `/.git/**` holds inside
 * `.visionboard/apps/` (points 345, 346, D-067 proposed).
 */
export const ACCESS_RULES: readonly AccessRule[] = [
  { path: '**', read: 'allow', write: 'ask', why: words.filesInTheFolder },
  { path: '**/.env', read: 'refuse', write: 'refuse', why: words.secretsFiles },
  { path: '**/.env.*', read: 'refuse', write: 'refuse', why: words.secretsFiles },
  { path: '**/.env.example', read: 'allow', write: 'ask', why: words.secretsExample },
  { path: '**/.envrc', read: 'refuse', write: 'refuse', why: words.secretsFiles },
  { path: '**/.npmrc', read: 'refuse', write: 'refuse', why: words.secretsFiles },
  { path: '**/.visionboard/agents.json', read: 'refuse', write: 'refuse', why: words.boardSecrets },
  { path: '**/.visionboard/chat-sessions.json', read: 'refuse', write: 'refuse', why: words.boardSecrets },
  { path: '**/.visionboard/ledger.jsonl', read: 'allow', write: 'refuse', why: words.theLedger },
  { path: '.visionboard/lock', read: 'allow', write: 'refuse', why: words.boardFiles },
  { path: '**/.visionboard/app-state/**', read: 'refuse', write: 'refuse', why: words.appState },
  { path: '.visionboard/permissions.json', read: 'allow', write: 'refuse', why: words.permissionsFile },
  { path: '.visionboard/**', read: 'allow', write: 'refuse', why: words.boardFiles },
  { path: '.visionboard/images/**', read: 'allow', write: 'allow', why: words.boardPicturesAndApps },
  { path: '.visionboard/apps/**', read: 'allow', write: 'allow', why: words.boardPicturesAndApps },
  { path: '.visionboard/attachments/**', read: 'allow', write: 'refuse', unknownCommand: 'ask', why: words.theirAttachments },
  { path: '**/.git/**', read: 'refuse', write: 'refuse', why: words.gitFolder },
];

/** The table's last line: a path that resolves outside the board's folder. */
export const OUTSIDE_RULE: AccessRule = { path: '', read: 'ask', write: 'ask', why: words.filesOutsideTheFolder };

/** What `rule` gives `op`. */
export const verdictOf = (rule: AccessRule, op: CommandOp): AccessVerdict => (op === 'unknown' ? rule.unknownCommand ?? rule.write : rule[op]);

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

const rank = (r: AccessRule): [number, number, number] => {
  const parts = r.path.split('/');
  const file = parts[parts.length - 1] === '**' ? 0 : 1;
  return [file, file === 0 && r.read === 'refuse' && r.write === 'refuse' ? 1 : 0, parts.filter((p) => !p.includes('*')).length];
};
const COMPILED = ACCESS_RULES.map((rule, order) => ({ rule, order, rank: rank(rule), exact: globRegExp(rule.path), folded: globRegExp(rule.path, 'i') }));
const SEVERITY: Record<AccessVerdict, number> = { allow: 0, ask: 1, refuse: 2 };

function pick(rel: string, folded: boolean): AccessRule {
  let best: (typeof COMPILED)[number] | undefined;
  for (const c of COMPILED) {
    if (!(folded ? c.folded : c.exact).test(rel)) continue;
    const diff = best ? c.rank.findIndex((v, i) => v !== best!.rank[i]) : -1;
    if (!best || (diff >= 0 && c.rank[diff]! > best.rank[diff]!)) best = c;
  }
  return best!.rule; // `**` matches every path
}

/**
 * The rule for `rel` (relative to the folder, `/`-joined, '' for the folder itself) and what `op`
 * gets. Matched as written and again ignoring case, and the stricter answer kept: on a disk that
 * ignores case `.ENV` is `.env`, and on one that doesn't, refusing it costs nothing.
 */
export function accessFor(rel: string, op: CommandOp): { verdict: AccessVerdict; rule: AccessRule } {
  const exact = pick(rel, false);
  const folded = pick(rel, true);
  const rule = SEVERITY[verdictOf(folded, op)] > SEVERITY[verdictOf(exact, op)] ? folded : exact;
  return { verdict: verdictOf(rule, op), rule };
}

/** The rows that let through part of what `row` refuses for `op`: a row naming a path under it (`**` read as
 * one name) that does not refuse (`.env.example` under `.env.*`; `images/**` under `.visionboard/**`). A
 * second line that has no exception (a deny list) leaves such a row out, or lists these as exceptions. */
export function exceptionsTo(row: AccessRule, op: AccessOp): AccessRule[] {
  const sample = (glob: string) => glob.replace(/^\*\*\//, '').replace(/\*+/g, 'x');
  return ACCESS_RULES.filter((other) => other !== row && other[op] !== 'refuse' && globRegExp(row.path).test(sample(other.path)));
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
export function refusedTail(word: string, op: CommandOp, glob = false): AccessRule | null {
  const parts = word.split('/').filter((p) => p !== '' && p !== '.' && p !== '..');
  for (let k = 1; k <= parts.length; k++) {
    const tail = parts.slice(-k);
    if (glob && tail.some((p) => /[*?[]/.test(p))) {
      const hit = SAMPLES.find(({ rule, sample }) => verdictOf(rule, op) === 'refuse' && sample.split('/').length === k
        && sample.split('/').every((s, i) => nameGlob(tail[i]!).test(s)));
      if (hit) return hit.rule;
      continue;
    }
    const { verdict, rule } = accessFor(tail.join('/'), op);
    if (verdict === 'refuse') return rule;
  }
  return null;
}

