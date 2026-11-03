// Dev only: `npm run worktree -- <name> [--base <branch>]`. Makes the worktree a task works in
// (steering "Worktrees"): `<main checkout>/.claude/worktrees/<name>` on branch `feat/<name>`, cut from
// the current branch (or --base), with `node_modules` linked to the main checkout's. Prints, one per
// line, the absolute path, the branch and a free VB_TEST_PORT, so a brief can name one path and an
// agent never starts in the wrong checkout. Refuses a name that is not kebab-case and an existing
// folder or branch. The git, file and port probes are passed in, so worktree.test.mjs needs no real ones.
import { execFileSync } from 'node:child_process';
import { existsSync, symlinkSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PORT_FIRST = 6010;
export const PORT_LAST = 7910;
export const PORT_STEP = 100;
export const PORTS_PER_RUN = 10;

/** One plain line when the name is not kebab-case, else undefined. */
export const nameProblem = (name) =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name ?? '') ? undefined : `"${name ?? ''}" is not a kebab-case name (lowercase words joined by "-").`;

/** `{ name, base }` from the command line; `error` is one plain line. */
export function parseArgs(argv) {
  const [name, ...rest] = argv;
  let base;
  if (rest.length === 2 && rest[0] === '--base' && rest[1]) base = rest[1];
  else if (rest.length > 0) return { error: 'Usage: npm run worktree -- <name> [--base <branch>]' };
  if (!name) return { error: 'Usage: npm run worktree -- <name> [--base <branch>]' };
  return { name, base };
}

/** The first of 6010, 6110, … 7910 where it and the next 9 ports all have nothing listening. */
export async function pickPort(isBusy) {
  for (let first = PORT_FIRST; first <= PORT_LAST; first += PORT_STEP) {
    const busy = await Promise.all(Array.from({ length: PORTS_PER_RUN }, (_, i) => isBusy(first + i)));
    if (!busy.some(Boolean)) return first;
  }
  return undefined;
}

/** Whether something listens on the port (any interface): binding it fails. */
export const portIsBusy = (port) =>
  new Promise((resolve) => {
    const probe = createServer();
    probe.once('error', () => resolve(true));
    probe.once('listening', () => probe.close(() => resolve(false)));
    probe.listen(port);
  });

/**
 * Make the worktree. `env`: `git(...args)` returns stdout (throws on failure), `exists(path)`,
 * `link(target, path)`, `isBusy(port)`, `cwd`. Returns `{ lines }` to print, or `{ error }` (one line).
 */
export async function makeWorktree({ name, base }, env) {
  const problem = nameProblem(name);
  if (problem) return { error: problem };
  const common = path.resolve(env.cwd, env.git('rev-parse', '--git-common-dir').trim());
  const main = path.dirname(common);
  const target = path.join(main, '.claude', 'worktrees', name);
  const branch = `feat/${name}`;
  if (env.exists(target)) return { error: `The folder ${target} already exists.` };
  let exists = true;
  try { env.git('rev-parse', '--verify', '--quiet', `refs/heads/${branch}`); } catch { exists = false; }
  if (exists) return { error: `The branch ${branch} already exists.` };
  const modules = path.join(main, 'node_modules');
  if (!env.exists(modules)) return { error: `The main checkout has no node_modules (${modules}); run npm install there.` };
  const from = base ?? env.git('branch', '--show-current').trim();
  if (!from) return { error: 'HEAD is detached; give the branch to start from with --base <branch>.' };
  const port = await pickPort(env.isBusy);
  if (port === undefined) return { error: `No free VB_TEST_PORT between ${PORT_FIRST} and ${PORT_LAST}.` };
  env.git('worktree', 'add', target, '-b', branch, from);
  env.link(modules, path.join(target, 'node_modules'));
  return { lines: [target, branch, `VB_TEST_PORT=${port}`] };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const fail = (line) => { console.error(line); process.exit(1); };
  if (args.error) fail(args.error);
  const env = {
    cwd: process.cwd(),
    git: (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }),
    exists: existsSync,
    link: (target, file) => symlinkSync(target, file, 'dir'),
    isBusy: portIsBusy,
  };
  try {
    const result = await makeWorktree(args, env);
    if (result.error) fail(result.error);
    console.log(result.lines.join('\n'));
  } catch (err) {
    fail(String(err.stderr || err.message).trim().split('\n')[0]);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
