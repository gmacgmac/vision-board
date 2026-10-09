// The board server as a request listener: the guard, then /api through the dispatcher and the
// built page from dist/ for everything else. Every error is a problem (api.md 38); anything
// unexpected logs its stack to stderr and answers `server-error`. The person cookie is minted
// here, once per start, and set with the page (api.md 20). The chat sessions are opened on first
// use, and every CLI they started is stopped when the server closes or the process exits.
// server.ts only starts it.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import type { Agents } from './agents.ts';
import { openAgents } from './agents.ts';
import type { BuildWatch } from './build-watch.ts';
import { newPersonToken, personCookie } from './callers.ts';
import type { ChatAdapters, Chats } from './chat-sessions.ts';
import { openChats } from './chat-sessions.ts';
import type { ServerEnv } from './dispatch.ts';
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
  /** Watch mode only (`VB_WATCH=1`): the build being served, for `watch_project`'s `build` event. */
  build?: BuildWatch | undefined;
  /** The CLIs a chat can run (default: Claude Code) and the approval time limit; tests set both. */
  chat?: { adapters?: ChatAdapters; approvalTtlMs?: number } | undefined;
}

/** An http.Server for the board. The Host check uses the port it is actually listening on, so a
 * test can listen on port 0. The agents store sits beside the ledger and is opened on first use. */
export function createBoardServer({ ledger, dist, build, chat }: BoardServerOptions): http.Server {
  let agents: Agents | undefined;
  let chats: Chats | undefined;
  const stopChats = () => chats?.close();
  const getAgents = () => (agents ??= openAgents(path.dirname(ledger.file)));
  const base = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const env: ServerEnv = {
    ledger, person: newPersonToken(), agents: getAgents, build,
    chats: () => {
      if (chats) return chats;
      process.on('exit', stopChats);
      return (chats = openChats({ ledger, agents: getAgents, base, adapters: chat?.adapters, approvalTtlMs: chat?.approvalTtlMs }));
    },
  };
  const server = http.createServer(async (req, res) => {
    for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
    try {
      const port = (server.address() as AddressInfo).port;
      guard(req, port);
      const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return await dispatch(req, res, url, env, HANDLERS);
      if (req.method !== 'GET') throw problem('method-not-allowed', 'The page answers GET only.', { headers: { Allow: 'GET' } });
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
  server.on('close', () => {
    process.off('exit', stopChats);
    stopChats();
  });
  return server;
}
