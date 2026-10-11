// A failed write item (api.md 34, 38): its problem document without `status`, with pointers into
// the request body. `write_board`'s steps (write-board.ts, write-refs.ts) fail an item through here.
import type { PointerError, ProblemBody, ProblemCode, ProblemExtras } from './problem.ts';
import { problem } from './problem.ts';

/** A failed item's problem: the problem document without `status` (api.md 38). */
export type ItemProblem = Omit<ProblemBody, 'status'>;

/** An item that cannot be written, with its problem. */
export class ItemFailed extends Error {
  readonly problem: ItemProblem;
  constructor(p: ItemProblem) {
    super(p.detail);
    this.problem = p;
  }
}

export function fail(code: ProblemCode, detail: string, extras: ProblemExtras = {}): never {
  const { status: _status, ...body } = problem(code, detail, extras).body;
  throw new ItemFailed(body);
}

/** Pointers into one item become pointers into the request body (`/items/2/node/title`). */
export const under = (i: number, errors: readonly PointerError[]): PointerError[] =>
  errors.map((e) => ({ pointer: `/items/${i}${e.pointer}`, detail: e.detail }));
