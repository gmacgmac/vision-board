// The one dispatcher (api.md 53): every /api request is matched against the generated route
// table, its path and query parameters are read with the schemas openapi.json gives them, and the
// operation's handler from the handler table answers it. Unknown path: `not-found`; known path,
// wrong method: `method-not-allowed` with `Allow`.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { OperationId } from '../../../packages/format/src/index.ts';
import { OPERATIONS } from '../../../packages/format/src/index.ts';
import type { Agents } from './agents.ts';
import type { BuildWatch } from './build-watch.ts';
import { checkFolder, secretElsewhere } from './caller-folder.ts';
import { callerOf } from './callers.ts';
import type { Chats } from './chat-sessions.ts';
import type { Caller, Ledger } from './ledger.ts';
import { problem } from './problem.ts';
import type { Project } from './project.ts';
import type { ParamSpec } from './spec.ts';
import { SPECS, coerce, paramProblems } from './spec.ts';

/** What the server holds for every request: the person's token, the open folder (project.ts),
 * and the build in watch mode. */
export interface ServerEnv { person: string; project: Project; build?: BuildWatch | undefined }

/** What a handler gets: the request, its parsed parameters (defaults filled in), the open folder's
 * ledger, agents store and chat sessions, the signal that ends its streams when the folder closes,
 * the project (to switch folders, api.md 111), the caller the operation's `security` allowed
 * (api.md 20-22) and, in watch mode only, the build being served (api.md 79). */
export interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, unknown>;
  ledger: Ledger;
  agents: () => Agents;
  chats: () => Chats;
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

interface Route { id: OperationId; method: string; re: RegExp }

const ROUTES: Route[] = (Object.keys(OPERATIONS) as OperationId[]).map((id) => {
  const { method, path } = OPERATIONS[id];
  const source = path.split(/\{[^}]+\}/).map((s) => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&')).join('([^/]+)');
  return { id, method, re: new RegExp(`^${source}$`) };
});

/** The operation for `method` and `pathname`, with the raw path values in order; or the methods
 * the path answers when the method is wrong; or null when no operation has the path. */
export function matchRoute(method: string, pathname: string):
  { id: OperationId; raw: string[] } | { allow: string[] } | null {
  const allow: string[] = [];
  for (const r of ROUTES) {
    const m = r.re.exec(pathname);
    if (!m) continue;
    if (r.method === method) return { id: r.id, raw: m.slice(1) };
    allow.push(r.method);
  }
  return allow.length ? { allow } : null;
}

const NAMES: Record<string, string> = { board: 'board id', n: 'node number', region: 'region id', session: 'chat session id', approval: 'approval id', app: 'app id' };

function readParam(p: ParamSpec, raw: string): unknown {
  const value = coerce(p.type, raw);
  const problems = paramProblems(p, value);
  if (!problems.length) return value;
  const what = p.in === 'path' ? `The ${NAMES[p.name] ?? p.name} in the path` : `The query parameter \`${p.name}\``;
  throw problem('bad-request', `${what} ${problems[0]}. ${p.description}`.trim());
}

/** The operation's parameters: path values decoded and checked, query values checked, unknown or
 * repeated query names refused, and every default filled in. */
export function readParams(id: OperationId, raw: string[], query: URLSearchParams): Record<string, unknown> {
  const specs = SPECS[id].params;
  const out: Record<string, unknown> = {};
  OPERATIONS[id].pathParams.forEach((name, i) => {
    let text: string;
    try { text = decodeURIComponent(raw[i] ?? ''); } catch {
      throw problem('bad-request', `The ${NAMES[name] ?? name} in the path is not valid percent-encoding.`);
    }
    out[name] = readParam(specs.find((p) => p.in === 'path' && p.name === name)!, text);
  });
  const known = specs.filter((p) => p.in === 'query');
  for (const name of new Set(query.keys())) {
    const p = known.find((x) => x.name === name);
    if (!p) {
      const takes = known.length ? `It takes: ${known.map((x) => x.name).join(', ')}.` : 'It takes no query parameters.';
      throw problem('bad-request', `Unknown query parameter \`${name}\`. ${takes}`);
    }
    const values = query.getAll(name);
    if (values.length > 1) throw problem('bad-request', `The query parameter \`${name}\` is given more than once; give it once.`);
    out[name] = readParam(p, values[0]!);
  }
  for (const p of known) if (!(p.name in out) && p.default !== undefined) out[p.name] = p.default;
  return out;
}

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
    req, res, params, ledger: open.ledger, agents: open.agents, chats: open.chats, closed: open.closed,
    project: env.project, caller, build: env.build,
  });
}
