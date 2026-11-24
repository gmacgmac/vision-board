// The folder an agent's tool works in (the board MCP and the `vb` CLI; D-039, api.md 116), worked out
// once at start and sent on every call as `VB-Project`: `VB_PROJECT` when set (resolved against the
// working folder), else the working folder itself, except a filesystem root (a client that starts its servers
// there, as Claude Desktop does, has no folder to name): then none, and the board checks nothing. Nothing searches upward for a board (D-111): the board
// accepts its open folder or a folder inside it and answers `wrong-folder` otherwise. `ledgersIn` is the one
// rule for the ledgers a project folder holds (the server's ledgers.ts asks it). The page loads this package
// too, so the caller hands in Node's `fs` and `path` rather than this file importing them.
import { ENV, ledgerFiles, ledgerFolder, ledgerNameProblem, projectFiles } from '#format';

/** The parts of Node's `fs` and `path` this needs (the page's types have no Node). */
export interface ProjectFs {
  fs: {
    statSync(file: string, opts: { throwIfNoEntry: false }): { isFile(): boolean } | undefined;
    readdirSync(dir: string, opts: { withFileTypes: true }): readonly { name: string; isDirectory(): boolean }[];
  };
  path: { resolve(...parts: string[]): string; parse(file: string): { root: string } };
}

/** The ledgers a project folder holds (D-084 1): `old` when its ledger file sits in `.visionboard/` itself
 * (the old layout), `ledgers` the folders in `.visionboard/` whose name is a ledger name and that hold a
 * ledger file, sorted. The one home of the rule: the server's `ledgers.ts` (`isOldLayout`, `listLedgers`) asks this
 * same function (LEDGERS_02-R1). A home folder keeping only `recent.json` has none. */
export function ledgersIn(dir: string, { fs }: Pick<ProjectFs, 'fs'>): { old: boolean; ledgers: string[] } {
  const isFile = (file: string): boolean => {
    try { return fs.statSync(file, { throwIfNoEntry: false })?.isFile() ?? false; } catch { return false; }
  };
  let entries: readonly { name: string; isDirectory(): boolean }[];
  try { entries = fs.readdirSync(projectFiles(dir).root, { withFileTypes: true }); } catch { entries = []; }
  const ledgers = entries
    .filter((e) => e.isDirectory() && ledgerNameProblem(e.name) === undefined && isFile(ledgerFiles(ledgerFolder(dir, e.name)).ledger))
    .map((e) => e.name).sort();
  return { old: isFile(ledgerFiles(ledgerFolder(dir)).ledger), ledgers };
}

/** The folder an agent's tool works in: `VB_PROJECT` resolved against `cwd` when set (it always wins), else `cwd`
 * (D-111), or `undefined` when `cwd` is a filesystem root (`/`, a drive root): that is where a client with no folder
 * of its own starts a server, so it names none and the board checks none (api.md 116). Only `path` is read; callers
 * hand in Node's `fs` and `path` together. */
export function projectOf(env: Readonly<Record<string, string | undefined>>, cwd: string, { path }: ProjectFs): string | undefined {
  const set = env[ENV.project];
  const folder = path.resolve(cwd, set || '.');
  return !set && path.parse(folder).root === folder ? undefined : folder;
}
