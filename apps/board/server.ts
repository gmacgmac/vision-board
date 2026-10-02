// Vision Board local server. Run: npm run board (builds the page, then starts this; Node 22.18+).
// No runtime dependencies. Serves the built page from dist/. Binds to 127.0.0.1 only. Boards come
// from the project ledger (`<VB_PROJECT>/.visionboard/ledger.jsonl`, D-017). Interim routes until
// U4 derives them from the OpenAPI spec (D-022); there is no agent write route here. Routes:
//   GET  /api/boards                 [{ id, title, seq }]
//   GET  /api/boards/:id             { seq, view, state, versions } (versions: node id -> latest ver)
//   POST /api/boards/:id/act         append one person `act` event (validated); 201 with the event
//   GET  /api/boards/:id/events      server-sent `change` events with { seq } on every append
// Env: VB_PORT (4466), VB_PROJECT (repo root), VB_SEED (a fixture ledger copied in when the
// project has no ledger yet; the fixture itself is never written).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ID_PATTERN, boardView, latest, nodesOf } from '../../packages/format/src/index.ts';
import { boardState } from '../../packages/actions/src/index.ts';
import { guard, HttpError, readJson } from './server/guard.ts';
import { ledgerPath, openLedger } from './server/ledger.ts';
import { resolveStatic, sendStatic } from './server/static.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PORT = Number(process.env.VB_PORT ?? 4466);
const PROJECT = path.resolve(process.env.VB_PROJECT ?? ROOT);
const DIST = path.join(HERE, 'dist');

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
};

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
const seeded = seed(FILE, process.env.VB_SEED);
const ledger = openLedger(FILE);

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function listBoards() {
  const s = ledger.state();
  return [...s.boards.values()].map((b) => ({ id: b.id, title: b.title, seq: s.seq }));
}

function loadBoard(id: string) {
  const s = ledger.state();
  const st = boardState(s, id);
  return {
    seq: s.seq,
    view: boardView(s, id),
    state: {
      items: Object.fromEntries(st.items), pins: Object.fromEntries(st.pins), modes: Object.fromEntries(st.modes),
    },
    versions: Object.fromEntries(nodesOf(s, id).map((x) => [String(x.n), latest(x).ver])),
  };
}

/** One person act on board `id`. The type is fixed and a mode act names this board; a node act
 * must be on this board. Everything else is checked by the ledger store. */
function act(id: string, body: unknown) {
  const e = { ...(typeof body === 'object' && body !== null && !Array.isArray(body) ? body : {}) } as
    Record<string, unknown>;
  e.type = 'act';
  if (e.action === 'mode') e.board = id;
  const node = typeof e.n === 'number' ? ledger.state().nodes.get(e.n) : undefined;
  if (node && node.board !== id) throw new HttpError(422, 'Invalid event', [`n: node ${e.n} is not on board "${id}"`]);
  return ledger.append(e, { by: 'person' });
}

function events(req: http.IncomingMessage, res: http.ServerResponse) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  res.write('retry: 2000\n\n');
  const off = ledger.onAppend((e) => res.write(`event: change\ndata: ${JSON.stringify({ seq: e.seq })}\n\n`));
  const beat = setInterval(() => res.write(': beat\n\n'), 20000);
  req.on('close', () => { off(); clearInterval(beat); });
}

async function api(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // drop "api"
  if (parts[0] !== 'boards') throw new HttpError(404, 'Not found');
  if (parts.length === 1 && req.method === 'GET') return sendJson(res, 200, listBoards());
  const id = parts[1] ?? '';
  if (!ID_PATTERN.test(id)) throw new HttpError(400, 'Invalid board id');
  if (!ledger.state().boards.has(id)) throw new HttpError(404, 'No such board');
  const [, , sub, extra] = parts;
  if (extra !== undefined) throw new HttpError(404, 'Not found');
  if (!sub && req.method === 'GET') return sendJson(res, 200, loadBoard(id));
  if (sub === 'act' && req.method === 'POST') return sendJson(res, 201, act(id, await readJson(req)));
  if (sub === 'events' && req.method === 'GET') return events(req, res);
  throw new HttpError(404, 'Not found');
}

const server = http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  try {
    guard(req, PORT);
    const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET') throw new HttpError(405, 'Method not allowed');
    const file = resolveStatic(url.pathname, DIST);
    if (!file) throw new HttpError(404, 'Not found');
    sendStatic(res, file);
  } catch (err) {
    const e = err instanceof HttpError ? err : new HttpError(500, 'Server error');
    if (!(err instanceof HttpError)) console.error(err);
    if (!res.headersSent) sendJson(res, e.status, { error: e.message, problems: e.problems });
    else res.end();
  }
});

server.listen(PORT, '127.0.0.1', () => {
  if (seeded) console.log(`Seeded the project ledger from ${process.env.VB_SEED}`);
  console.log(`Vision Board on http://localhost:${PORT}  (ledger: ${FILE})`);
});
