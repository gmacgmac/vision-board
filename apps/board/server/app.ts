// The board server as a request listener: the guard, then /api through the dispatcher, the project's
// images at /board-images/<path> (images.ts, D-048), an app's panel at /app-panels/<id> with its own
// CSP (apps.ts, D-047), and the built page from dist/ for everything else. Every error is a problem
// (api.md 38); anything unexpected logs its stack to stderr and answers `server-error`. The person cookie is minted
// here, once per start, and set with the page (api.md 20); it stays valid when the open folder
// changes. The open folder, with its ledger, lock, agents and chats, is project.ts's (api.md 111):
// its chats are opened on first use, and its CLIs stopped and its lock let go when the server
// closes or the process exits. Kiro's agent file is kept current here, at start, when asked
// (chat-access.ts `keepKiroAgent`). server.ts only starts it.
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import type { FlagOverrides } from '#format';
import { IMAGE_ROUTE } from '#format';
import type { AppLimits } from './apps.ts';
import { PANEL_PATH, servePanel } from './apps.ts';
import type { BuildWatch } from './build-watch.ts';
import { newPersonToken, personCookie } from './callers.ts';
import { keepKiroAgent } from './chat-access.ts';
import type { ChatAdapters } from './chat-sessions.ts';
import type { ServerEnv } from './dispatch.ts';
import { dispatch } from './dispatch.ts';
import { guard } from './guard.ts';
import { HANDLERS } from './handlers.ts';
import { serveImage } from './images.ts';
import type { Ledger } from './ledger.ts';
import type { Lock } from './lock.ts';
import { ProblemError, problem, sendProblem, serverError } from './problem.ts';
import { openProject } from './project.ts';
import { resolveStatic, sendStatic } from './static.ts';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'self'; frame-ancestors 'none'; base-uri 'none'",
};

export interface BoardServerOptions {
  /** The first open folder's ledger. */
  ledger: Ledger;
  /** Its lock, when the caller took one (server.ts): beaten while held, let go on a switch or close. */
  lock?: Lock | undefined;
  /** The person's home folder: the folder routes stay under it (default: the real one). Tests pass a
   * temp folder, so no test reads or writes the real home. */
  home?: string | undefined;
  /** The built page (apps/board/dist). */
  dist: string;
  /** Watch mode only (`VB_WATCH=1`): the build being served, for `watch_project`'s `build` event. */
  build?: BuildWatch | undefined;
  /** The CLIs a chat can run (default: Claude Code and Kiro) and the approval time limit; tests set
   * both. `kiroAgent`: keep Kiro's agent file under `home` current at start (server.ts does; a test
   * that does passes a temp home), N34 ruling 1. */
  chat?: { adapters?: ChatAdapters; approvalTtlMs?: number; kiroAgent?: boolean } | undefined;
  /** The server's own flags (`VB_FLAGS`, server.ts): `appCards` off, the panel route and call_app_tool
   * answer not-found. The page's flags are its own. */
  flags?: FlagOverrides | undefined;
  /** Shorter app limits than APP_LIMITS, for tests. */
  appLimits?: Partial<AppLimits> | undefined;
}

/** An http.Server for the board. The Host check uses the port it is actually listening on, so a
 * test can listen on port 0. The agents store sits beside the ledger and is opened on first use. */
export function createBoardServer({ ledger, lock, home = os.homedir(), dist, build, chat, flags, appLimits }: BoardServerOptions): http.Server {
  const port = () => (server.address() as AddressInfo).port;
  const realHome = fs.realpathSync(home);
  const kiro = chat?.kiroAgent ? keepKiroAgent(realHome) : undefined;
  const project = openProject({
    ledger, lock, home: realHome, port, base: () => `http://127.0.0.1:${port()}`, chat: { ...chat, ...(kiro && { blocked: { kiro } }) },
    apps: { flags, limits: appLimits },
  });
  const env: ServerEnv = { person: newPersonToken(), project, build };
  const server = http.createServer(async (req, res) => {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    try {
      guard(req, port());
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${port()}`);
      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return await dispatch(req, res, url, env, HANDLERS);
      if (url.pathname.startsWith(IMAGE_ROUTE)) return serveImage(req, res, url.pathname.slice(IMAGE_ROUTE.length), project.current().dir);
      if (req.method !== 'GET') throw problem('method-not-allowed', 'The page answers GET only.', { headers: { Allow: 'GET' } });
      const panel = PANEL_PATH.exec(url.pathname);
      if (panel) return servePanel(res, panel[1]!, project.current().apps());
      const file = resolveStatic(url.pathname, dist);
      if (!file) throw problem('not-found', 'There is no such page. Open / for the board.');
      if (file.endsWith('.html')) res.setHeader('Set-Cookie', personCookie(env.person));
      sendStatic(res, file);
    } catch (err) {
      const p = err instanceof ProblemError ? err : serverError(err);
      if (!res.headersSent) sendProblem(res, p);
      else res.end();
    }
  });
  server.on('close', () => project.close());
  return server;
}
