// The standalone server's HTTP edge for /api (api.md 53): every request is matched against the
// generated route table and its path and query parameters read (the engine's `matchRoute` and
// `readParams`), then, for an agent operation, the caller's folder is checked and the caller worked
// out from the cookie or the Bearer secret, and the handler table answers: the engine's operations
// through the open folder's engine (`route`), the server's own (streams, chats, folders, apps)
// here. Unknown path: `not-found`; known path, wrong method: `method-not-allowed` with `Allow`.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { OperationId } from '#format';
import type { Agents } from './agents.ts';
import type { AppHost } from './apps.ts';
import type { BuildWatch } from './build-watch.ts';
import { checkFolder, secretElsewhere } from './caller-folder.ts';
import { callerOf } from './callers.ts';
import type { Chats } from './chat-sessions.ts';
import type { Caller, Engine } from './engine/index.ts';
import { matchRoute, readParams } from './engine/index.ts';
import type { Ledger } from './ledger.ts';
import { problem } from './problem.ts';
import type { Project } from './project.ts';
import { SPECS } from './spec.ts';

/** What the server holds for every request: the person's token, the open folder (project.ts),
 * and the build in watch mode. */
export interface ServerEnv { person: string; project: Project; build?: BuildWatch | undefined }

/** What a handler gets: the request and its URL, its parsed parameters (defaults filled in), the open
 * folder's engine, ledger, agents store, chat sessions and app host, the signal that ends its streams
 * when the folder closes, the project (to switch folders, api.md 111), the caller the operation's
 * `security` allowed (api.md 20-22) and, in watch mode only, the build being served (api.md 79). */
export interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  params: Record<string, unknown>;
  engine: Engine;
  ledger: Ledger;
  agents: () => Agents;
  chats: () => Chats;
  apps: () => AppHost;
  /** Aborted when this folder closes (a switch, the server closing): a stream or held read ends. */
  closed: AbortSignal;
  project: Project;
  /** The person, an agent, or undefined for a read without credentials. */
  caller: Caller | undefined;
  build?: BuildWatch | undefined;
}

export type Handler = (ctx: Ctx) => void | Promise<void>;

/** One handler per operation; a test checks the keys equal the route table's (api.md 53). */
export type HandlerTable = Record<OperationId, Handler>;

/** Answer one /api request through the route table and the handler table: route, parameters,
 * then, for an agent operation, the caller's folder (api.md 114), then the caller, then the
 * handler (so nothing is read from an unauthorised body). */
export async function dispatch(
  req: IncomingMessage, res: ServerResponse, url: URL, env: ServerEnv, handlers: HandlerTable,
): Promise<void> {
  const method = req.method ?? 'GET';
  const match = matchRoute(method, url.pathname);
  if (!match) throw problem('not-found', 'No operation has this path. The operations are in openapi.json; start with list_boards (GET /api/boards).');
  if ('allow' in match) {
    const allow = match.allow.join(', ');
    throw problem('method-not-allowed', `This path answers ${allow} only.`, { headers: { Allow: allow } });
  }
  const params = readParams(match.id, match.raw, url.searchParams);
  const open = env.project.current();
  const folder = { home: env.project.home, dir: open.dir };
  const here = SPECS[match.id].agent && checkFolder(req, folder);
  const caller = callerOf(req, match.id, {
    person: env.person, ledger: open.ledger, agents: open.agents, elsewhere: (secret) => secretElsewhere(folder, secret, here),
  });
  await handlers[match.id]({
    req, res, url, params, engine: open.engine, ledger: open.ledger, agents: open.agents, chats: open.chats, apps: open.apps,
    closed: open.closed, project: env.project, caller, build: env.build,
  });
}
