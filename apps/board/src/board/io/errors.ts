// How a board call fails (ARCH_06, split out of io.ts): every failure the page can show is an
// `ApiError`, whether the server refused it (the problem's pointer errors, api.md 38) or never answered.
import { ApiProblem } from '#client';
import type { PointerError } from '#format';
import * as boardWords from '../words/board.ts';

/** How a call for a panel refuses: the API problem's code and its words (the frame's `AppCallError`). */
export interface AppCallRefusal { problem: string; detail?: string }

export class ApiError extends Error {
  /** HTTP status, or 0 when the server could not be reached. */
  status: number;
  problems: string[];
  /** The same problems with where each is in the request (`/files/2`): the one to mark on the page. */
  pointers: PointerError[];
  constructor(message: string, status = 0, problems: string[] = [], pointers: PointerError[] = []) {
    super(message);
    this.status = status;
    this.problems = problems;
    this.pointers = pointers;
  }
}

/** What a failure the server never answered says. */
export const UNREACHABLE = boardWords.theBoardServerIsNot;

/** One call, with every failure as an ApiError the page can show. */
export async function asApiError<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (err instanceof ApiProblem) throw new ApiError(err.detail, err.status, err.errors.map((e) => e.detail), err.errors);
    throw new ApiError(UNREACHABLE);
  }
}

/** Runs a person's call: the standalone page's reloads once for a fresh cookie when one is
 * refused as `forbidden` (shell/page-io.ts `asPerson`); a host's runs it as it is. */
export type PersonCall = <T>(run: () => Promise<T>) => Promise<T>;
