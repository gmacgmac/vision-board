// The engine's operations (api.md 53): an operation is found from its method and path in the
// generated route table, its path and query parameters are read with the schemas openapi.json gives
// them, and the caller its host passes in must fit the operation's `auth`. The standalone edge
// (dispatch.ts) uses the same matching to pick the caller check before anything is read. No HTTP
// here: a handler gets plain values and answers a reply (status and body).
import type { OperationId } from '#format';
import { OPERATIONS, PATH_WORDS } from '#format';
import type { Agents } from '../agents.ts';
import type { Caller, Ledger } from '../ledger.ts';
import { problem } from '../problem.ts';
import type { ParamSpec } from '../spec.ts';
import { SPECS, coerce, paramProblems } from '../spec.ts';

/** An answer: its status, its JSON body, and any headers a problem carries (`Allow`, `WWW-Authenticate`). */
export interface EngineReply { status: number; body: unknown; headers?: Record<string, string> }

/** What an operation's handler gets: its parameters (defaults filled in), the caller its host passed,
 * the body (read when the handler asks, at most `limit` bytes where the host reads bytes), the signal
 * that ends a held read, and the board folder's parts. */
export interface OpCtx {
  params: Record<string, unknown>;
  caller: Caller | undefined;
  body(limit?: number): Promise<unknown>;
  signal: AbortSignal | undefined;
  ledger: Ledger;
  agents(): Agents;
  /** The board's folder as the person reads it (`list_boards`, `join`). */
  name(): string;
  /** A Send the person made (`act`), told to the host after the answer. */
  onSend(board: string, seq: number): void;
}

export type Op = (ctx: OpCtx) => EngineReply | Promise<EngineReply>;

export const reply = (status: number, body: unknown): EngineReply => ({ status, body });

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

function readParam(p: ParamSpec, raw: string): unknown {
  const value = coerce(p.type, raw);
  const problems = paramProblems(p, value);
  if (!problems.length) return value;
  const what = p.in === 'path' ? `The ${PATH_WORDS[p.name] ?? p.name} in the path` : `The query parameter \`${p.name}\``;
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
      throw problem('bad-request', `The ${PATH_WORDS[name] ?? name} in the path is not valid percent-encoding.`);
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
  return withDefaults(id, out);
}

/** `params` with every query default the operation has filled in where it is missing. */
export function withDefaults(id: OperationId, params: Record<string, unknown>): Record<string, unknown> {
  for (const p of SPECS[id].params) if (p.in === 'query' && !(p.name in params) && p.default !== undefined) params[p.name] = p.default;
  return params;
}

export const ONLY_PERSON = 'Only the person can do this, on the board; send a propose or reply item instead.';
const ONLY_AGENT = 'Only an agent can do this. The person acts on the board itself.';
const NO_AGENT = 'This needs an agent: the host passes the agent that is calling.';

/** Refuse a caller the operation does not take (the host's caller check already ran in the
 * standalone server, so there this never refuses): the person's operations take the person, an
 * agent's writes never take the person, and an agent's need an agent. */
export function checkCaller(id: OperationId, caller: Caller | undefined): void {
  const { auth, method, xAgent } = OPERATIONS[id];
  if (auth === 'person' && caller?.by !== 'person') throw problem('forbidden', ONLY_PERSON);
  if (xAgent && method !== 'GET' && caller?.by === 'person') throw problem('forbidden', ONLY_AGENT);
  if (auth === 'agent' && caller?.by !== 'agent') throw problem('not-authenticated', NO_AGENT);
  if (auth === 'agent-or-person' && caller === undefined) throw problem('not-authenticated', NO_AGENT);
}
