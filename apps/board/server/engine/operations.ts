// The engine's operations (api.md 53): an operation is found from its method and path in the
// generated route table, its path and query parameters are read with the schemas openapi.json gives
// them, and the caller its host passes in must fit the operation's `auth`. The standalone edge
// (dispatch.ts) uses the same matching to pick the caller check before anything is read. No HTTP
// here: a handler gets plain values and answers a reply (status and body).
import type { FlagOverrides, LedgerEvent, OperationId } from '#format';
import { OPERATIONS, PATH_WORDS } from '#format';
import type { Agents } from '../agents.ts';
import type { Caller, Ledger } from '../ledger.ts';
import { problem } from '../problem.ts';
import type { ParamSpec } from '../spec.ts';
import { SPECS, coerce, paramProblems } from '../spec.ts';
import * as httpWords from '../words/http.ts';

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
  /** The ledger's name, when the host keeps several (`EngineOptions.ledgerName`): answered beside `project`. */
  ledgerName: string | undefined;
  /** A Send the person made (`act`), handed to the host to record (`SendHook`). */
  onSend: SendHook;
  /** The engine's flags (`botToolRules`: the reads' `owed` and `held`, a key conflict's words). */
  flags: FlagOverrides;
  /** The ledger is open read-only now (`EngineOptions.readOnly`): the reads say so. */
  readOnly: boolean;
}

/** The person's Send on `board`, given to the host with `record`, which appends its `send` line (with `head`: what its
 * answers were read through) and answers that line. The host records when it may: at once, or after its chat has the
 * answers (point 383); it answers the line recorded. */
export type SendHook = (board: string, record: (head?: number) => LedgerEvent) => LedgerEvent | Promise<LedgerEvent>;

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
  const what = p.in === 'path' ? httpWords.theInThePath(PATH_WORDS[p.name] ?? p.name) : httpWords.theQueryParameter(p.name);
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
      throw problem('bad-request', httpWords.theInThePathIs(PATH_WORDS[name] ?? name));
    }
    out[name] = readParam(specs.find((p) => p.in === 'path' && p.name === name)!, text);
  });
  const known = specs.filter((p) => p.in === 'query');
  for (const name of new Set(query.keys())) {
    const p = known.find((x) => x.name === name);
    if (!p) {
      const takes = known.length ? httpWords.itTakes(known.map((x) => x.name).join(', ')) : httpWords.itTakesNoQueryParameters;
      throw problem('bad-request', httpWords.unknownQueryParameter(name, takes));
    }
    const values = query.getAll(name);
    if (values.length > 1) throw problem('bad-request', httpWords.theQueryParameterIsGiven(name));
    out[name] = readParam(p, values[0]!);
  }
  return withDefaults(id, out);
}

/** `params` with every query default the operation has filled in where it is missing. */
export function withDefaults(id: OperationId, params: Record<string, unknown>): Record<string, unknown> {
  for (const p of SPECS[id].params) if (p.in === 'query' && !(p.name in params) && p.default !== undefined) params[p.name] = p.default;
  return params;
}

export const ONLY_PERSON = httpWords.onlyThePersonCanDo;
const ONLY_AGENT = httpWords.onlyAnAgentCanDoThis;
const NO_AGENT = httpWords.thisNeedsAnAgentThe;

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

/** `readOnly: true` for a read's answer while the ledger is open read-only (D-085 4); nothing otherwise. */
export const readOnlyMark = ({ readOnly }: Pick<OpCtx, 'readOnly'>): { readOnly?: true } => (readOnly ? { readOnly: true } : {});

/** `project`, and `ledger` when the host names one: where the caller is (`list_boards`, `join`; D-084 3). */
export const whereAnswer = ({ name, ledgerName }: Pick<OpCtx, 'name' | 'ledgerName'>): { project: string; ledger?: string } =>
  ({ project: name(), ...(ledgerName !== undefined && { ledger: ledgerName }) });
