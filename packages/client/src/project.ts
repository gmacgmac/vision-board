// The folder an agent's tool works in (the board MCP and the `vb` CLI; D-039, api.md 116), worked out
// once at start and sent on every call as `VB-Project`: `VB_PROJECT` when set (resolved against the
// working folder), else the nearest folder at or above the working folder with a Vision Board in either
// layout (`ledgersIn`), else none, and then nothing is sent and the server checks nothing. The page
// loads this package too, so the caller hands in Node's `fs` and `path` rather than this file importing them.
import { ENV, ledgerFiles, ledgerFolder, ledgerNameProblem, projectFiles } from '#format';

/** The parts of Node's `fs` and `path` this needs (the page's types have no Node). */
export interface ProjectFs {
  fs: {
    statSync(file: string, opts: { throwIfNoEntry: false }): { isFile(): boolean } | undefined;
    readdirSync(dir: string, opts: { withFileTypes: true }): readonly { name: string; isDirectory(): boolean }[];
  };
  path: { resolve(...parts: string[]): string; dirname(file: string): string };
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

export function projectOf(env: Readonly<Record<string, string | undefined>>, cwd: string, node: ProjectFs): string | undefined {
  const { path } = node;
  const set = env[ENV.project];
  if (set) return path.resolve(cwd, set);
  const hasBoard = (dir: string): boolean => {
    const found = ledgersIn(dir, node);
    return found.old || found.ledgers.length > 0;
  };
  for (let dir = path.resolve(cwd); ; dir = path.dirname(dir)) {
    if (hasBoard(dir)) return dir;
    if (path.dirname(dir) === dir) return undefined;
  }
}
