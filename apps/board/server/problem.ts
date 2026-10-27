// RFC 9457 problems (api.md 38-40): the one shape every error takes. `problem(code, detail,
// extras?)` builds one; handlers throw it, the dispatcher sends it as application/problem+json.
// `detail` is plain English for an agent to act on and never shows internals (api.md 40).
import type { ServerResponse } from 'node:http';
import type { PointerError, ProblemCode, ProblemDocument } from '#format';
import { PROBLEM_BASE, PROBLEMS } from '#format';

// The codes, their status and title, `PROBLEM_BASE` and the document's shape are generated from
// problem.schema.json (`#format`): this file adds only what the server does with them. Its importers
// get the shapes here too.
export type { PointerError, ProblemCode } from '#format';
export { PROBLEMS } from '#format';

/** The problem document, as sent. Kept for its importers; the name for it is `ProblemDocument`. */
export type ProblemBody = ProblemDocument;

/** Extension members (api.md 39) and the pointer errors, as the schema has them, and response
 * headers (never in the body). */
export type ProblemExtras = Partial<Pick<ProblemDocument, 'errors' | 'ver' | 'board' | 'region'>> & {
  /** `invalid`: a worked request that fits (api.md 40), read from a schema's examples, so JSON. */
  example?: unknown;
  headers?: Record<string, string>;
};

/** A problem a handler throws; the dispatcher sends `body` with `status` and `headers`. */
export class ProblemError extends Error {
  readonly code: ProblemCode;
  readonly status: number;
  readonly body: ProblemDocument;
  readonly headers: Record<string, string>;
  constructor(code: ProblemCode, detail: string, extras: ProblemExtras = {}) {
    super(detail);
    const { headers = {}, errors, example, ...ext } = extras;
    const { status, title } = PROBLEMS[code];
    this.code = code;
    this.status = status;
    this.headers = headers;
    this.body = {
      type: `${PROBLEM_BASE}${code}`, title, status, detail,
      ...(errors && errors.length > 0 && { errors }), ...ext,
      ...(example !== undefined && { example: example as ProblemDocument['example'] }),
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
