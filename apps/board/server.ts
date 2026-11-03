// Vision Board local server. Run: npm run board (builds the page, then starts this; Node 22.18+).
// Startup only: the routes, problems and handlers live in server/ (app.ts, dispatch.ts, from the
// route table generated from openapi.json, api.md 53). Binds to 127.0.0.1 only. Boards come from
// the project ledger (its ledger folder's `ledger.jsonl`, packages/format/src/data-folder.ts, D-017). The folder: VB_PROJECT when set,
// else the folder last opened from the board (`~/.visionboard/recent.json`) if it is still there,
// else this repo (server/recent.ts `startFolder`, api.md 112); the board can open another one
// (`open_project`, server/project.ts, which then holds the lock).
// Env: VB_PORT (4466), VB_PROJECT (see above), VB_SEED (a fixture ledger copied in when the
// project has no ledger yet; the fixture itself is never written), VB_WATCH (`1`: watch mode, dev
// only; dist/ is watched and `watch_project` sends `build` so an open page reloads, api.md 79),
// VB_KIRO_AGENT (`0`: don't write Kiro's agent file, `~/.kiro/agents/vision-board.json`, which the
// server otherwise keeps current at start, N34 ruling 1; the page tests' servers set it), VB_FLAGS
// (the server's own flags, written as `?flags=` is: `-appCards` turns app cards off, so the panel
// route and call_app_tool answer not-found; an unknown name stops the start).
// One server per ledger: the ledger folder's lock (server/lock.ts) refuses a second one, here or on
// another computer sharing the folder. Every mode releases it on exit.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_PORT, ENV, ledgerFolder, parseFlags } from '#format';
import { createBoardServer } from './server/app.ts';
import { watchBuild } from './server/build-watch.ts';
import { ledgerPath, openLedger } from './server/ledger.ts';
import { holderMessage, takeLock } from './server/lock.ts';
import * as serverFoldersWords from './server/words/server-folders.ts';
import { startFolder } from './server/recent.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PORT = Number(process.env[ENV.port] ?? DEFAULT_PORT);
const HOME = os.homedir();
const PROJECT = startFolder({ project: process.env[ENV.project], home: HOME, fallback: ROOT });
const DIST = path.join(HERE, 'dist');

/** Copy the seed ledger into the project once, before it has a ledger of its own. */
function seed(file: string, seedFile: string | undefined): boolean {
  if (!seedFile || fs.existsSync(file)) return false;
  const from = path.resolve(seedFile);
  if (!fs.statSync(from, { throwIfNoEntry: false })?.isFile()) {
    console.error(`${ENV.seed} is not a file: ${from}`);
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.copyFileSync(from, file, fs.constants.COPYFILE_EXCL);
  return true;
}

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('The page is not built yet. Run: npm run board (or npm run build first).');
  process.exit(1);
}

const FILE = ledgerPath(PROJECT);
const taken = takeLock(ledgerFolder(PROJECT), PORT);
if (!taken.ok) {
  console.error(holderMessage(taken.holder));
  if (taken.holder.host === os.hostname()) console.error(serverFoldersWords.itIsAlreadyRunning(taken.holder.port, taken.holder.pid));
  process.exit(1);
}
const { lock } = taken;
if (taken.replaced) {
  const { host, pid, beat } = taken.replaced;
  console.log(`Replaced a stale lock (computer "${host}", process ${pid}, last beat ${beat}).`);
}
process.on('exit', () => lock.release());

const seeded = seed(FILE, process.env[ENV.seed]);
const build = process.env[ENV.watch] === '1' ? watchBuild(DIST) : undefined;
const chat = { kiroAgent: process.env[ENV.kiroAgent] !== '0' };
const flags = parseFlags(process.env[ENV.flags]);
if (flags.refused.length) {
  console.error(`${ENV.flags} names no such flag: ${flags.refused.join(', ')}. The flags are in packages/format/src/flags.ts.`);
  process.exit(1);
}
const server = createBoardServer({ ledger: openLedger(FILE), lock, home: HOME, dist: DIST, build, chat, flags: flags.overrides });

// Closing the server stops the chats and lets go of the open folder's lock (server/project.ts).
const stop = () => {
  build?.close();
  server.closeAllConnections();
  server.close(() => process.exit(0));
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

server.on('error', (err: NodeJS.ErrnoException) => {
  console.error(err.code === 'EADDRINUSE'
    ? `Port ${PORT} is already in use. Stop what is using it, or set ${ENV.port} to another port.`
    : `The server could not start: ${err.message}`);
  process.exit(1); // the exit handler releases the lock
});

server.listen(PORT, '127.0.0.1', () => {
  if (seeded) console.log(`Seeded the project ledger from ${process.env[ENV.seed]}`);
  console.log(`Vision Board on http://localhost:${PORT}  (ledger: ${FILE})${build ? '  [watch mode]' : ''}`);
});
