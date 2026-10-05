// The board server as a request listener: the guard, then /api through the dispatcher and the
// built page from dist/ for everything else. Every error is a problem (api.md 38); anything
// unexpected logs its stack to stderr and answers `server-error`. server.ts only starts it.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { dispatch } from './dispatch.ts';
import { guard } from './guard.ts';
import { HANDLERS } from './handlers.ts';
import type { Ledger } from './ledger.ts';
import { ProblemError, problem, sendProblem, serverError } from './problem.ts';
import { resolveStatic, sendStatic } from './static.ts';

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'",
};

export interface BoardServerOptions {
  ledger: Ledger;
  /** The built page (apps/board/dist). */
  dist: string;
}

/** An http.Server for the board. The Host check uses the port it is actually listening on, so a
 * test can listen on port 0. */
export function createBoardServer({ ledger, dist }: BoardServerOptions): http.Server {
  const server = http.createServer(async (req, res) => {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    try {
      const port = (server.address() as AddressInfo).port;
      guard(req, port);
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return await dispatch(req, res, url, ledger, HANDLERS);
      if (req.method !== 'GET') throw problem('method-not-allowed', 'The page answers GET only.', { headers: { Allow: 'GET' } });
      const file = resolveStatic(url.pathname, dist);
      if (!file) throw problem('not-found', 'There is no such page. Open / for the board.');
      sendStatic(res, file);
    } catch (err) {
      const p = err instanceof ProblemError ? err : serverError(err);
      if (!res.headersSent) sendProblem(res, p);
      else res.end();
    }
  });
  return server;
}
