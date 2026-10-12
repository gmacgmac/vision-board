// Which boards a route may name (N39 rulings 3, 7, 9, api.md 136). Every agent operation, and
// every read that takes no credentials, names its board through `requireBoard`, which asks the
// action layer's one check (`boardVisibility`): an archived board answers exactly as a board that
// never existed. `write_board` asks `writeTarget`, which refuses a batch that would make a board
// with an archived board's id in words that say nothing of it. A retry key stored on a line agents
// don't see is free again (`agentSees`). The person's routes name any board (`personBoard`); the two
// that set an agent to work on one, a chat's start and its messages, refuse an archived board
// (`refuseArchived`). No other server module asks whether a board is archived.
import type { LedgerEvent } from '../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../packages/actions/src/index.ts';
import { boardVisibility, eventBoard, UNAVAILABLE } from '../../../packages/actions/src/index.ts';
import type { ProblemCode } from './problem.ts';
import { problem } from './problem.ts';

/** What an agent is told about a board it may not name: the words of a board that never was. */
const noBoard = (id: string) => `There is no board "${id}". Call list_boards to see the boards.`;

/** The board an agent operation (or a read with no credentials) names, refused with `not-found`
 * when there is none or agents don't see it, in the same words. */
export function requireBoard(s: LedgerState, board: unknown): string {
  const id = String(board);
  if (boardVisibility(s, id) !== 'visible') throw problem('not-found', noBoard(id));
  return id;
}

/** The board a person route names, archived or not; `not-found` when there is none. */
export function personBoard(s: LedgerState, board: unknown): string {
  const id = String(board);
  if (!s.boards.has(id)) throw problem('not-found', noBoard(id));
  return id;
}

/** A `write_board` batch on `board`: a board agents see takes it; with no `board` item (`made`, the
 * index of the first one, -1 for none) a board they don't see is `not-found`, in the words for one
 * that never was; one making a board with an archived board's id is `invalid`, `UNAVAILABLE`. */
export function writeTarget(s: LedgerState, board: string, made: number): void {
  const v = boardVisibility(s, board);
  if (v === 'visible') return;
  if (made < 0) {
    throw problem('not-found', `There is no board "${board}". Call list_boards to see the boards, or start the batch with a board item to make it.`);
  }
  if (v === 'archived') throw problem('invalid', UNAVAILABLE, { errors: [{ pointer: `/items/${made}`, detail: UNAVAILABLE }] });
}

/** Whether agents see the line `e`: it is on no board, or on one they see. A retry key stored on a
 * line they don't see is free again, since the agent can't know it was used (ruling 3). */
export function agentSees(s: LedgerState, e: LedgerEvent): boolean {
  const board = eventBoard(s, e);
  return board === undefined || boardVisibility(s, board) === 'visible';
}

/** A person route that would set an agent to work on `board` (a chat's start, its messages): refused
 * with `code` while the board is archived, saying how to bring it back. */
export function refuseArchived(s: LedgerState, board: string, code: ProblemCode, what: string): void {
  if (boardVisibility(s, board) === 'archived') {
    throw problem(code, `Board "${board}" is archived, so ${what}. Restore it from the board picker first.`);
  }
}
