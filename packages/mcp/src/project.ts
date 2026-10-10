// The folder this MCP server works in (folder-mismatch task, ruling 2; api.md 116), worked out
// once at start and sent on every call as `VB-Project`: `VB_PROJECT` when set (resolved against the
// working folder), else the nearest folder at or above the working folder with a Vision Board
// (`.visionboard/ledger.jsonl`, so a home folder that only keeps `recent.json` does not count), else
// none, and then nothing is sent and the server checks nothing.
import fs from 'node:fs';
import path from 'node:path';

const hasBoard = (dir: string): boolean => {
  try { return fs.statSync(path.join(dir, '.visionboard', 'ledger.jsonl'), { throwIfNoEntry: false })?.isFile() ?? false; } catch { return false; }
};

export function projectOf(env: { readonly VB_PROJECT?: string | undefined }, cwd: string): string | undefined {
  if (env.VB_PROJECT) return path.resolve(cwd, env.VB_PROJECT);
  for (let dir = path.resolve(cwd); ; dir = path.dirname(dir)) {
    if (hasBoard(dir)) return dir;
    if (path.dirname(dir) === dir) return undefined;
  }
}
