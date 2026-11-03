// The folder an agent's tool works in (the board MCP and the `vb` CLI; D-039, api.md 116), worked out
// once at start and sent on every call as `VB-Project`: `VB_PROJECT` when set (resolved against the
// working folder), else the nearest folder at or above the working folder with a Vision Board
// (its ledger file, `ledgerFiles(ledgerFolder(dir)).ledger`, so a home folder that only keeps `recent.json` does not count), else
// none, and then nothing is sent and the server checks nothing. The page loads this package too, so
// the caller hands in Node's `fs` and `path` rather than this file importing them.
import { ENV, ledgerFiles, ledgerFolder } from '#format';

/** The parts of Node's `fs` and `path` this needs (the page's types have no Node). */
export interface ProjectFs {
  fs: { statSync(file: string, opts: { throwIfNoEntry: false }): { isFile(): boolean } | undefined };
  path: { resolve(...parts: string[]): string; dirname(file: string): string };
}

export function projectOf(env: Readonly<Record<string, string | undefined>>, cwd: string, node: ProjectFs): string | undefined {
  const { fs, path } = node;
  const set = env[ENV.project];
  if (set) return path.resolve(cwd, set);
  const hasBoard = (dir: string): boolean => {
    try { return fs.statSync(ledgerFiles(ledgerFolder(dir)).ledger, { throwIfNoEntry: false })?.isFile() ?? false; } catch { return false; }
  };
  for (let dir = path.resolve(cwd); ; dir = path.dirname(dir)) {
    if (hasBoard(dir)) return dir;
    if (path.dirname(dir) === dir) return undefined;
  }
}
