// Vision Board local server. Run: npm run board (builds the page, then starts this; Node 22.18+).
// No runtime dependencies. Serves the built page from dist/. Binds to 127.0.0.1 only. Routes:
//   GET  /api/sessions                      list sessions
//   GET  /api/sessions/:id                  latest view, versions, transcript
//   GET  /api/sessions/:id/views/:n         one view version
//   POST /api/sessions/:id/transcript       append one person action (validated)
//   GET  /api/sessions/:id/events           server-sent events on any file change
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { guard, HttpError, readJson } from './server/guard.ts';
import {
  appendRecord, latestView, listSessions, listVersions, readTranscript, readView, seedFixtures,
  sessionDir,
} from './server/sessions.ts';
import { resolveStatic, sendStatic } from './server/static.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PORT = Number(process.env.VB_PORT ?? 4466);
const SESSIONS = path.resolve(process.env.VB_SESSIONS ?? path.join(ROOT, 'sessions'));
const DIST = path.join(HERE, 'dist');
const PACKAGES = path.join(ROOT, 'packages');

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
};

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function events(req: http.IncomingMessage, res: http.ServerResponse, dir: string) {
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
  res.write('retry: 2000\n\n');
  let timer: NodeJS.Timeout | undefined;
  const watcher = fs.watch(dir, () => {
    clearTimeout(timer);
    timer = setTimeout(() => res.write(`event: change\ndata: ${JSON.stringify({ versions: listVersions(dir) })}\n\n`), 120);
  });
  const beat = setInterval(() => res.write(': beat\n\n'), 20000);
  req.on('close', () => { watcher.close(); clearInterval(beat); clearTimeout(timer); });
}

async function api(req: http.IncomingMessage, res: http.ServerResponse, url: URL) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // drop "api"
  if (parts[0] !== 'sessions') throw new HttpError(404, 'Not found');
  if (parts.length === 1 && req.method === 'GET') return sendJson(res, 200, listSessions(SESSIONS));
  const dir = sessionDir(SESSIONS, parts[1] ?? '');
  if (!fs.existsSync(dir)) throw new HttpError(404, 'No such session');
  const [, , sub, arg] = parts;
  if (!sub && req.method === 'GET')
    return sendJson(res, 200, { versions: listVersions(dir), view: latestView(dir), transcript: readTranscript(dir) });
  if (sub === 'views' && arg && req.method === 'GET') {
    if (!/^\d{1,6}$/.test(arg)) throw new HttpError(400, 'Invalid version');
    return sendJson(res, 200, readView(dir, Number(arg)));
  }
  if (sub === 'transcript' && req.method === 'POST')
    return sendJson(res, 201, appendRecord(dir, await readJson(req)));
  if (sub === 'events' && req.method === 'GET') return events(req, res, dir);
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

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('The page is not built yet. Run: npm run board (or npm run build first).');
  process.exit(1);
}

const seeded = seedFixtures(SESSIONS, path.join(PACKAGES, 'format', 'fixtures'));
server.listen(PORT, '127.0.0.1', () => {
  if (seeded.length) console.log(`Seeded sessions: ${seeded.join(', ')}`);
  console.log(`Vision Board on http://localhost:${PORT}  (sessions: ${SESSIONS})`);
});
