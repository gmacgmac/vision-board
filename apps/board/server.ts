// Vision Board local server. Run: npm run board (builds the page, then starts this; Node 22.18+).
// Startup only: the routes, problems and handlers live in server/ (app.ts, dispatch.ts, from the
// route table generated from openapi.json, api.md 53). Binds to 127.0.0.1 only. Boards come from
// the project ledger (`<folder>/.visionboard/ledger.jsonl`, D-017). The folder: VB_PROJECT when set,
// else the folder last opened from the board (`~/.visionboard/recent.json`) if it is still there,
// else this repo (server/recent.ts `startFolder`, api.md 112); the board can open another one
// (`open_project`, server/project.ts, which then holds the lock).
// Env: VB_PORT (4466), VB_PROJECT (see above), VB_SEED (a fixture ledger copied in when the
// project has no ledger yet; the fixture itself is never written), VB_WATCH (`1`: watch mode, dev
// only; dist/ is watched and `watch_project` sends `build` so an open page reloads, api.md 79),
// VB_KIRO_AGENT (`0`: don't write Kiro's agent file, `~/.kiro/agents/vision-board.json`, which the
// server otherwise keeps current at start, N34 ruling 1; the page tests' servers set it).
// One server per ledger: `.visionboard/lock` (server/lock.ts) refuses a second one, here or on
// another computer sharing the folder. Every mode releases it on exit.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBoardServer } from './server/app.ts';
import { watchBuild } from './server/build-watch.ts';
import { DATA_DIR, ledgerPath, openLedger } from './server/ledger.ts';
import { holderMessage, takeLock } from './server/lock.ts';
import { startFolder } from './server/recent.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PORT = Number(process.env.VB_PORT ?? 4466);
const HOME = os.homedir();
const PROJECT = startFolder({ project: process.env.VB_PROJECT, home: HOME, fallback: ROOT });
const DIST = path.join(HERE, 'dist');

/** Copy the seed ledger into the project once, before it has a ledger of its own. */
function seed(file: string, seedFile: string | undefined): boolean {
  if (!seedFile || fs.existsSync(file)) return false;
  const from = path.resolve(seedFile);
  if (!fs.statSync(from, { throwIfNoEntry: false })?.isFile()) {
    console.error(`VB_SEED is not a file: ${from}`);
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
const taken = takeLock(path.join(PROJECT, DATA_DIR), PORT);
if (!taken.ok) {
  console.error(holderMessage(taken.holder));
  process.exit(1);
}
const { lock } = taken;
if (taken.replaced) {
  const { host, pid, beat } = taken.replaced;
  console.log(`Replaced a stale lock (computer "${host}", process ${pid}, last beat ${beat}).`);
}
process.on('exit', () => lock.release());

const seeded = seed(FILE, process.env.VB_SEED);
const build = process.env.VB_WATCH === '1' ? watchBuild(DIST) : undefined;
const chat = { kiroAgent: process.env.VB_KIRO_AGENT !== '0' };
const server = createBoardServer({ ledger: openLedger(FILE), lock, home: HOME, dist: DIST, build, chat });

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
    ? `Port ${PORT} is already in use. Stop what is using it, or set VB_PORT to another port.`
    : `The server could not start: ${err.message}`);
  process.exit(1); // the exit handler releases the lock
});

server.listen(PORT, '127.0.0.1', () => {
  if (seeded) console.log(`Seeded the project ledger from ${process.env.VB_SEED}`);
  console.log(`Vision Board on http://localhost:${PORT}  (ledger: ${FILE})${build ? '  [watch mode]' : ''}`);
});
