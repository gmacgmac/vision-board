// Dev only: `npm run board:watch`. Keeps the open board current while code changes (steering
// rule 1, api.md 79). Two children: the page build (`npm run watch`, Vite's --watch) and the
// server under `node --watch-path`, which restarts only on server or shared-package changes and
// runs with VB_WATCH=1 so it tells the open page when the build changes. VB_PORT, VB_PROJECT and
// VB_SEED pass through. The server is a child process, never imported (D-016).
import { spawn } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const WATCH_PATHS = ['apps/board/server', 'apps/board/server.ts', 'packages/format/src', 'packages/actions/src'];
export const INDEX = 'apps/board/dist/index.html';

/** The node arguments that start the server and restart it on a change in `WATCH_PATHS`. */
export const serverArgs = () => [...WATCH_PATHS.map((p) => `--watch-path=${p}`), 'apps/board/server.ts'];

/** Prefix every complete line of a stream with `[name] `; a partial line waits for its newline. */
export function linePrefixer(name, write) {
  let rest = '';
  const emit = (line) => write(`[${name}] ${line}\n`);
  return {
    push(chunk) {
      const lines = (rest + chunk).split('\n');
      rest = lines.pop();
      lines.forEach(emit);
    },
    end() {
      if (rest) emit(rest);
      rest = '';
    },
  };
}

/** Whether the first build of this run has written the page (not a stale one from an earlier run). */
export const built = (index, startedMs) => {
  const stat = existsSync(index) ? statSync(index) : undefined;
  return stat !== undefined && stat.mtimeMs >= startedMs;
};

function main() {
  const started = Date.now();
  const children = new Map();
  let code;
  const stopAll = (exit) => {
    code ??= exit;
    for (const child of children.values()) {
      try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already gone */ }
    }
    if (children.size === 0) process.exit(code);
  };
  const run = (name, command, args, env = {}) => {
    // Own process group, so stopping it also stops the processes it started (npm, vite, node --watch).
    const child = spawn(command, args, { env: { ...process.env, ...env }, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    children.set(name, child);
    for (const [stream, out] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
      const prefixer = linePrefixer(name, (text) => out.write(text));
      stream.setEncoding('utf8');
      stream.on('data', (chunk) => prefixer.push(chunk));
      stream.on('end', () => prefixer.end());
    }
    child.on('exit', (exit, signal) => {
      children.delete(name);
      stopAll(exit ?? (signal ? 1 : 0));
    });
    return child;
  };
  process.on('SIGINT', () => stopAll(0));
  process.on('SIGTERM', () => stopAll(0));
  run('page', 'npm', ['run', 'watch']);
  const wait = setInterval(() => {
    if (code !== undefined) return clearInterval(wait);
    if (!built(INDEX, started)) return;
    clearInterval(wait);
    run('server', process.execPath, serverArgs(), { VB_WATCH: '1' });
  }, 200);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
