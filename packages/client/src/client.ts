// The one module that calls the board server (rule 7, D-029, api.md 4): the board page, `vb` and
// the MCP server all go through it. It builds each request from the generated route table (never
// openapi.json, so the page bundle stays small, rule 15), sends it through a transport, and turns
// every problem answer (api.md 38) into an `ApiProblem`. `call` is typed by the operation: its input
// and its answer are the types generated from the schemas, so a caller writes no response type.
// The client holds no origin: the transport takes a path relative to the board's route prefix, so
// the standalone page sends it with `fetch` on its own origin and a host with its own `api`.
// Runs in the browser and in Node 22.
import type { OperationId, OperationInput, OperationOutput } from '#format';
import { OPERATIONS, PROJECT_HEADER, ROUTE_PREFIX } from '#format';
import { clientProblem, problemFrom } from './problem.ts';

export { ApiProblem, problemFrom } from './problem.ts';

/** Sends one request: `path` is relative to the board's route prefix (`boards/roadmap/act`), with
 * its query string. The standalone transport is `fetch` on `<origin>/api/`; a host passes its `api`. */
export type Transport = (path: string, init: RequestInit) => Promise<Response>;

/** The standalone transport: `send` (the global `fetch` by default) on `origin` + the route prefix.
 * `origin` `''` is the page's own. */
export const httpTransport = (origin = '', send: typeof fetch = (url, init) => globalThis.fetch(url, init)): Transport =>
  (path, init) => send(`${origin.replace(/\/+$/, '')}${ROUTE_PREFIX}${path}`, init);

/** Named values for any operation: what a relay sends when it holds an operation id it read at run
 * time (`vb`, MCP). Path parameters fill the path; `body` is the JSON body; the rest is the query. */
export type CallInput = { body?: unknown } & Record<string, unknown>;

/** An operation's input: its own type when the id is known, else any named values. */
export type InputOf<Id extends OperationId> = OperationId extends Id ? CallInput : OperationInput<Id>;
/** An operation's answer: its own type when the id is known, else unknown. */
export type OutputOf<Id extends OperationId> = OperationId extends Id ? unknown : OperationOutput<Id>;
/** The input is optional when the operation needs none. */
type CallArgs<Id extends OperationId> = Record<never, never> extends InputOf<Id>
  ? [input?: InputOf<Id>, opts?: CallOptions] : [input: InputOf<Id>, opts?: CallOptions];

export interface ClientOptions {
  /** How requests are sent; the default is `httpTransport(base, fetch)`. */
  transport?: Transport;
  /** For the default transport and for `url()`: the server's origin, such as `http://127.0.0.1:4466`;
   * `''` (the default) is the page's own. */
  base?: string;
  /** For the default transport: the `fetch` it sends with. */
  fetch?: typeof fetch;
  /** An agent's secret from `join`, sent as `Authorization: Bearer <secret>`. */
  secret?: string;
  /** The folder the agent works in, an absolute path, sent as `VB-Project` so the server refuses a
   * call when it has another folder open (`wrong-folder`, api.md 114). */
  project?: string;
}

export interface CallOptions {
  /** `application/jsonl` asks `read_ledger` for JSON Lines; the answer is then a list. */
  accept?: 'application/json' | 'application/jsonl';
  signal?: AbortSignal;
}

/** A request as `call` sends it, `path` relative to the route prefix. Pure, so it can be checked without a server. */
export interface BuiltRequest { method: string; path: string; headers: Record<string, string>; body?: string }

const refuse = (detail: string) => clientProblem('bad-request', detail);

/** The path for `id` with `input`'s path and query parameters, relative to the route prefix. A
 * missing path parameter is refused here, before any request. */
export function pathFor(id: OperationId, input: CallInput = {}): string {
  const op = OPERATIONS[id];
  if (!op) throw refuse(`There is no operation "${String(id)}".`);
  const { body: _body, ...named } = input;
  let path: string = op.path.slice(ROUTE_PREFIX.length);
  for (const name of op.pathParams) {
    const value = named[name];
    if (value === undefined || value === null || value === '') throw refuse(`${id} needs \`${name}\`: it is part of the path.`);
    path = path.replace(`{${name}}`, encodeURIComponent(String(value)));
    delete named[name];
  }
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(named)) if (v !== undefined) query.append(k, String(v));
  const qs = query.toString();
  return `${path}${qs ? `?${qs}` : ''}`;
}

/** The whole URL for `id` on the server at `base` (`''`: the page's own). */
export const urlFor = (base: string, id: OperationId, input: CallInput = {}): string =>
  `${base.replace(/\/+$/, '')}${ROUTE_PREFIX}${pathFor(id, input)}`;

/** The whole request for `id`: method, path, headers and JSON body. */
export function buildRequest(
  id: OperationId, input: CallInput = {}, opts: { secret?: string; project?: string; accept?: string } = {},
): BuiltRequest {
  const path = pathFor(id, input);
  const op = OPERATIONS[id];
  const takesBody = op.method !== 'GET';
  if (!takesBody && input.body !== undefined) throw refuse(`${id} takes no body.`);
  const headers: Record<string, string> = {
    Accept: opts.accept === 'application/jsonl' ? 'application/jsonl' : 'application/json, application/problem+json',
    ...(takesBody && { 'Content-Type': 'application/json' }),
    ...(opts.secret && { Authorization: `Bearer ${opts.secret}` }),
    ...(opts.project && { [PROJECT_HEADER]: encodeURI(opts.project) }),
  };
  return { method: op.method, path, headers, ...(takesBody && { body: JSON.stringify(input.body ?? {}) }) };
}

const mediaOf = (res: Response) => (res.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase();

/** The answer's body: JSON parsed, JSON Lines as a list, a problem thrown as `ApiProblem`. */
export async function parseResponse(res: Response): Promise<unknown> {
  const media = mediaOf(res);
  if (!res.ok || media === 'application/problem+json') throw await problemFrom(res);
  if (media === 'application/jsonl') {
    return (await res.text()).split('\n').filter((line) => line.trim()).map((line) => JSON.parse(line) as unknown);
  }
  if (media === 'application/json') return res.json();
  return res.text();
}

export interface Client {
  /** Call one operation; resolves to its answer, typed by the operation, or throws an `ApiProblem`. */
  call<Id extends OperationId>(id: Id, ...args: CallArgs<Id>): Promise<OutputOf<Id>>;
  /** The URL an operation lives at, for what `fetch` cannot hold open (EventSource). */
  url<Id extends OperationId>(id: Id, input?: InputOf<Id>): string;
  /** Listen to a server-sent-events operation (`watch_board`, `watch_project`) in the browser.
   * `on` gets each named event's parsed data and its name. Returns a stop. `onOpen` runs each time
   * the stream (re)connects, so a reader can catch up on what it missed. */
  watch<Id extends OperationId>(id: Id, input: InputOf<Id>, event: string | readonly string[], on: (data: unknown, event: string) => void, onOpen?: () => void): () => void;
}

export function createClient(opts: ClientOptions = {}): Client {
  const base = (opts.base ?? '').replace(/\/+$/, '');
  const send = opts.transport ?? httpTransport(base, opts.fetch);
  const ids = { ...(opts.secret && { secret: opts.secret }), ...(opts.project && { project: opts.project }) };
  return {
    async call<Id extends OperationId>(id: Id, ...[input, callOpts = {}]: CallArgs<Id>): Promise<OutputOf<Id>> {
      const r = buildRequest(id, (input ?? {}) as CallInput, { ...ids, ...(callOpts.accept && { accept: callOpts.accept }) });
      const res = await send(r.path, {
        method: r.method, headers: r.headers, credentials: 'same-origin',
        ...(r.body !== undefined && { body: r.body }), ...(callOpts.signal && { signal: callOpts.signal }),
      });
      return (await parseResponse(res)) as OutputOf<Id>;
    },
    url: (id, input) => urlFor(base, id, input as CallInput | undefined),
    watch(id, input, event, on, onOpen) {
      const Source = globalThis.EventSource;
      if (!Source) throw new Error('watch needs EventSource (a browser)');
      const es = new Source(urlFor(base, id, input as CallInput));
      if (onOpen) es.addEventListener('open', () => onOpen());
      for (const name of typeof event === 'string' ? [event] : event) {
        es.addEventListener(name, (e) => {
          let data: unknown;
          try { data = JSON.parse((e as MessageEvent<string>).data); } catch { return; /* not JSON: ignored */ }
          on(data, name);
        });
      }
      return () => es.close();
    },
  };
}
