// The one module that calls the board server (rule 7, D-029, api.md 4): the board page, `vb` and
// the MCP server all go through it. It builds each request from the generated route table
// (never openapi.json, so the page bundle stays small, rule 15) and turns every problem answer
// (api.md 38) into an `ApiProblem`. Runs in the browser and in Node 22 with the global `fetch`.
import type { OperationId } from '#format';
import { OPERATIONS } from '#format';

export const PROBLEM_BASE = 'https://vision-board.invalid/problems/';

/** One pointer error of a problem: where in the request body, and what is wrong there. */
export interface ProblemError { pointer: string; detail: string }

/** A problem document (RFC 9457) as the server sends it. */
export interface ProblemDocument {
  type: string;
  title: string;
  status: number;
  detail: string;
  errors?: ProblemError[];
  /** `conflict`: the node's current version. */
  ver?: number;
  /** `needs-grant`: the board needed, and the container when it names `region`. */
  board?: string;
  region?: string;
  /** `invalid`: a worked request that fits, in the shape the refused body should have. */
  example?: unknown;
}

/** A problem answer, thrown by `call`. `code` is the last part of `type` (`not-found`). */
export class ApiProblem extends Error {
  readonly type: string;
  readonly code: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly errors: ProblemError[];
  readonly ver?: number;
  readonly board?: string;
  readonly region?: string;
  readonly example?: unknown;
  constructor(p: ProblemDocument) {
    super(p.detail);
    this.name = 'ApiProblem';
    this.type = p.type;
    this.code = p.type.startsWith(PROBLEM_BASE) ? p.type.slice(PROBLEM_BASE.length) : p.type;
    this.title = p.title;
    this.status = p.status;
    this.detail = p.detail;
    this.errors = p.errors ?? [];
    if (p.ver !== undefined) this.ver = p.ver;
    if (p.board !== undefined) this.board = p.board;
    if (p.region !== undefined) this.region = p.region;
    if (p.example !== undefined) this.example = p.example;
  }
}

/** A call's inputs: path and query parameters by name, and `body` for an operation that takes
 * one. Path parameters fill the path; every other named value goes in the query string. */
export type CallInput = { body?: unknown } & Record<string, unknown>;

export interface ClientOptions {
  /** The server's origin, such as `http://127.0.0.1:4466`; `''` (the default) is the page's own. */
  base?: string;
  /** An agent's secret from `join`, sent as `Authorization: Bearer <secret>`. */
  secret?: string;
  /** The folder the agent works in, an absolute path, sent as `VB-Project` so the server refuses a
   * call when it has another folder open (`wrong-folder`, api.md 114). */
  project?: string;
  fetch?: typeof fetch;
}

export interface CallOptions {
  /** `application/jsonl` asks `read_ledger` for JSON Lines; the answer is then a list. */
  accept?: 'application/json' | 'application/jsonl';
  signal?: AbortSignal;
}

/** A request as `call` sends it. Pure, so it can be checked without a server. */
export interface BuiltRequest { method: string; url: string; headers: Record<string, string>; body?: string }

const refuse = (detail: string) =>
  new ApiProblem({ type: `${PROBLEM_BASE}bad-request`, title: 'Bad request', status: 400, detail });

/** The URL for `id` with `input`'s path and query parameters. A missing path parameter, or a
 * body for an operation that takes none, is refused here, before any request. */
export function urlFor(base: string, id: OperationId, input: CallInput = {}): string {
  const op = OPERATIONS[id];
  if (!op) throw refuse(`There is no operation "${String(id)}".`);
  const { body: _body, ...named } = input;
  let path: string = op.path;
  for (const name of op.pathParams) {
    const value = named[name];
    if (value === undefined || value === null || value === '') throw refuse(`${id} needs \`${name}\`: it is part of the path.`);
    path = path.replace(`{${name}}`, encodeURIComponent(String(value)));
    delete named[name];
  }
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(named)) if (v !== undefined) query.append(k, String(v));
  const qs = query.toString();
  return `${base}${path}${qs ? `?${qs}` : ''}`;
}

/** The whole request for `id`: method, URL, headers and JSON body. */
export function buildRequest(
  base: string, id: OperationId, input: CallInput = {}, opts: { secret?: string; project?: string; accept?: string } = {},
): BuiltRequest {
  const op = OPERATIONS[id];
  const url = urlFor(base, id, input);
  const takesBody = op.method !== 'GET';
  if (!takesBody && input.body !== undefined) throw refuse(`${id} takes no body.`);
  const headers: Record<string, string> = {
    Accept: opts.accept === 'application/jsonl' ? 'application/jsonl' : 'application/json, application/problem+json',
    ...(takesBody && { 'Content-Type': 'application/json' }),
    ...(opts.secret && { Authorization: `Bearer ${opts.secret}` }),
    ...(opts.project && { 'VB-Project': encodeURI(opts.project) }),
  };
  return { method: op.method, url, headers, ...(takesBody && { body: JSON.stringify(input.body ?? {}) }) };
}

const mediaOf = (res: Response) => (res.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase();

const isProblem = (v: unknown): v is ProblemDocument =>
  typeof v === 'object' && v !== null && typeof (v as ProblemDocument).type === 'string' &&
  typeof (v as ProblemDocument).detail === 'string' && typeof (v as ProblemDocument).status === 'number';

/** The problem in an error answer. An answer that is not a problem document (a proxy, a crash)
 * becomes a `server-error` carrying its status. */
export async function problemFrom(res: Response): Promise<ApiProblem> {
  let doc: unknown;
  try { doc = await res.json(); } catch { doc = undefined; }
  if (isProblem(doc)) return new ApiProblem({ ...doc, title: doc.title ?? '' });
  return new ApiProblem({
    type: `${PROBLEM_BASE}server-error`, title: 'Server error', status: res.status,
    detail: `The server answered ${res.status} without a problem document. Try again; if it keeps failing, tell the person.`,
  });
}

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
  /** Call one operation; resolves to the parsed answer, or throws an `ApiProblem`. */
  call<T = unknown>(id: OperationId, input?: CallInput, opts?: CallOptions): Promise<T>;
  /** The URL an operation lives at, for what `fetch` cannot hold open (EventSource). */
  url(id: OperationId, input?: CallInput): string;
  /** Listen to a server-sent-events operation (`watch_board`, `watch_project`) in the browser.
   * `on` gets each named event's parsed data and its name. Returns a stop. `onOpen` runs each time
   * the stream (re)connects, so a reader can catch up on what it missed. */
  watch(id: OperationId, input: CallInput, event: string | readonly string[], on: (data: unknown, event: string) => void, onOpen?: () => void): () => void;
}

export function createClient(opts: ClientOptions = {}): Client {
  const base = (opts.base ?? '').replace(/\/+$/, '');
  const send: typeof fetch = opts.fetch ?? ((url, init) => globalThis.fetch(url, init));
  return {
    async call<T>(id: OperationId, input: CallInput = {}, callOpts: CallOptions = {}): Promise<T> {
      const r = buildRequest(base, id, input, {
        ...(opts.secret && { secret: opts.secret }), ...(opts.project && { project: opts.project }),
        ...(callOpts.accept && { accept: callOpts.accept }),
      });
      const res = await send(r.url, {
        method: r.method, headers: r.headers, credentials: 'same-origin',
        ...(r.body !== undefined && { body: r.body }), ...(callOpts.signal && { signal: callOpts.signal }),
      });
      return (await parseResponse(res)) as T;
    },
    url: (id, input) => urlFor(base, id, input),
    watch(id, input, event, on, onOpen) {
      const Source = globalThis.EventSource;
      if (!Source) throw new Error('watch needs EventSource (a browser)');
      const es = new Source(urlFor(base, id, input));
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
