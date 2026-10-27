// A problem answer (RFC 9457, api.md 38-40) as the client throws it. The document's shape, the codes
// and their status and title are generated from problem.schema.json (`#format`), so nothing here
// copies them.
import type { PointerError, ProblemCode, ProblemDocument } from '#format';
import { PROBLEM_BASE, PROBLEMS } from '#format';

/** A problem answer, thrown by `call`. `code` is the last part of `type` (`not-found`). */
export class ApiProblem extends Error {
  readonly type: string;
  readonly code: string;
  readonly title: string;
  readonly status: number;
  readonly detail: string;
  readonly errors: PointerError[];
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

/** A problem the client makes itself (a request it refuses to send, an answer that is no problem
 * document), with the code's own status and title. */
export const clientProblem = (code: ProblemCode, detail: string, status: number = PROBLEMS[code].status): ApiProblem =>
  new ApiProblem({ type: `${PROBLEM_BASE}${code}` as ProblemDocument['type'], title: PROBLEMS[code].title, status, detail });

const isProblem = (v: unknown): v is ProblemDocument =>
  typeof v === 'object' && v !== null && typeof (v as ProblemDocument).type === 'string' &&
  typeof (v as ProblemDocument).detail === 'string' && typeof (v as ProblemDocument).status === 'number';

/** The problem in an error answer. An answer that is not a problem document (a proxy, a crash)
 * becomes a `server-error` carrying its status. */
export async function problemFrom(res: Response): Promise<ApiProblem> {
  let doc: unknown;
  try { doc = await res.json(); } catch { doc = undefined; }
  if (isProblem(doc)) return new ApiProblem({ ...doc, title: doc.title ?? '' });
  return clientProblem('server-error', `The server answered ${res.status} without a problem document. Try again; if it keeps failing, tell the person.`, res.status);
}
