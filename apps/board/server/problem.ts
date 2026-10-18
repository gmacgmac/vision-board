// RFC 9457 problems (api.md 38-40): the one shape every error takes. `problem(code, detail,
// extras?)` builds one; handlers throw it, the dispatcher sends it as application/problem+json.
// `detail` is plain English for an agent to act on and never shows internals (api.md 40).
import type { ServerResponse } from 'node:http';

/** The codes of api.md 40, with their status and title. */
export const PROBLEMS = {
  'bad-request': { status: 400, title: 'Bad request' },
  'not-authenticated': { status: 401, title: 'Not authenticated' },
  forbidden: { status: 403, title: 'Forbidden' },
  'needs-grant': { status: 403, title: 'Needs a grant' },
  'not-found': { status: 404, title: 'Not found' },
  'method-not-allowed': { status: 405, title: 'Method not allowed' },
  conflict: { status: 409, title: 'Conflict' },
  'too-large': { status: 413, title: 'Too large' },
  'unsupported-media-type': { status: 415, title: 'Unsupported media type' },
  'depends-on-failed': { status: 422, title: 'Depends on a failed item' },
  invalid: { status: 422, title: 'Invalid' },
  'server-error': { status: 500, title: 'Server error' },
  'wrong-folder': { status: 409, title: 'Wrong folder' },
  // 423 Locked (RFC 4918 11.3, in the IANA HTTP status registry): the board itself is locked, so
  // a client can tell it from every 409 (a stale `base`, a busy chat, another folder) by status alone.
  locked: { status: 423, title: 'Locked' },
  // App cards (D-047 rulings 6-8, api.md 153): what a call of an app's tool can meet.
  'needs-approval': { status: 403, title: 'Needs approval' },
  'app-not-found': { status: 404, title: 'App not found' },
  'app-invalid': { status: 422, title: 'App invalid' },
  'app-failed': { status: 502, title: 'App failed' },
  'app-busy': { status: 503, title: 'App busy' },
  'app-timeout': { status: 504, title: 'App timed out' },
} as const;

export type ProblemCode = keyof typeof PROBLEMS;
export const PROBLEM_BASE = 'https://vision-board.invalid/problems/';

/** One pointer error: where in the request body, and what is wrong there (api.md 38). */
export interface PointerError { pointer: string; detail: string }

/** Extension members (api.md 39), the pointer errors, and response headers (never in the body). */
export interface ProblemExtras {
  errors?: PointerError[];
  ver?: number;
  board?: string;
  region?: string;
  headers?: Record<string, string>;
}

/** The problem document, as sent. */
export interface ProblemBody {
  type: string;
  title: string;
  status: number;
  detail: string;
  errors?: PointerError[];
  ver?: number;
  board?: string;
  region?: string;
}

/** A problem a handler throws; the dispatcher sends `body` with `status` and `headers`. */
export class ProblemError extends Error {
  readonly code: ProblemCode;
  readonly status: number;
  readonly body: ProblemBody;
  readonly headers: Record<string, string>;
  constructor(code: ProblemCode, detail: string, extras: ProblemExtras = {}) {
    super(detail);
    const { headers = {}, errors, ...ext } = extras;
    const { status, title } = PROBLEMS[code];
    this.code = code;
    this.status = status;
    this.headers = headers;
    this.body = {
      type: `${PROBLEM_BASE}${code}`, title, status, detail,
      ...(errors && errors.length > 0 && { errors }), ...ext,
    };
  }
}

const KB = 1024;
/** A size limit in a problem's words: `64 KB`, `256 KB`, `1 MB` (1024 bytes to a KB, as the limits are set). */
export const sizeWords = (bytes: number): string => (bytes % (KB * KB) ? `${bytes / KB} KB` : `${bytes / KB / KB} MB`);

/** Build a problem to throw: `throw problem('not-found', 'There is no board "x". …')`. */
export const problem = (code: ProblemCode, detail: string, extras?: ProblemExtras): ProblemError =>
  new ProblemError(code, detail, extras);

/** The answer for anything unexpected: the stack goes to stderr, the caller gets a fixed text. */
export function serverError(err: unknown): ProblemError {
  console.error(err);
  return problem('server-error', 'Something went wrong on the server. Try again; if it keeps failing, tell the person.');
}

export function sendProblem(res: ServerResponse, p: ProblemError): void {
  res.writeHead(p.status, {
    ...p.headers, 'Content-Type': 'application/problem+json; charset=utf-8', 'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(p.body));
}

/** A hand-written problem string (`"node.title: required"`, from packages/format and
 * packages/actions) as a pointer error. The pointer is the named field when it is one of the
 * event's own fields, else the whole body. */
export function pointerError(text: string, event: Record<string, unknown>): PointerError {
  const m = /^([A-Za-z][\w-]*(?:\.[\w-]+)*): /.exec(text);
  const field = m?.[1];
  const top = field?.split('.')[0];
  const pointer = field && top !== undefined && top in event ? `/${field.split('.').join('/')}` : '';
  return { pointer, detail: text };
}
