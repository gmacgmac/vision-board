// Locking a board (N40 rulings 1-7, api.md 138-140): the person makes a whole board read-only for
// everyone with a `lock` act and ends it with `unlock`. The fold keeps the locked set
// (`LedgerState.locked`) and nothing else: like archive, a lock or unlock moves no head, sees no card,
// is no answer, and no agent reads its line (fold.ts); agents learn of it only as a board's `locked`.
// Archiving implies a lock (ruling 5): `boardLocked` counts an archived board as locked, and since
// nothing acts on an archived board but `restore`, restoring returns it to the lock it had.
// `writeProblem` is the one "may this line be written" check (ruling 7), beside the visibility check
// (archive.ts): the ledger module asks it of every line it appends, whoever writes it, and the page
// asks `passesLock` before it sends an act; the server's routes refuse a write on a locked board up
// front through the same `boardLocked`. Pure.
import type { ActEvent, LedgerEvent } from '../../format/src/index.ts';
import { APP_ACTIONS, PRIVATE_ACTIONS } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';
import { archivedProblem, boardVisibility } from './archive.ts';
import { eventBoard } from './references.ts';

/** What an agent is told when it writes on a locked board (ruling 3). */
export const LOCKED = 'This board is locked; ask the person to unlock it.';
/** What the person is told when a change to a locked board is paused (ruling 4). */
export const LOCKED_PERSON = 'Locked: unlock to change it';

/** Fold one `lock` or `unlock` (the person's board marks). */
export function foldLock(s: LedgerState, e: ActEvent): void {
  if (e.action === 'lock') s.locked.set(e.board!, e.seq);
  else s.locked.delete(e.board!);
}

/** Whether nobody may change `board` now: the person locked it, or archived it (ruling 5). */
export const boardLocked = (s: LedgerState, board: string): boolean => s.locked.has(board) || boardVisibility(s, board) === 'archived';

/** Whether a line still goes on a locked board: the person's own marks (the flag, archive, lock and
 * their undoing), which change nothing an agent reads, a seen, which only says what the person
 * looked at, and an app's allow or stop, which is on the app, not the board (api.md 150). Everything
 * else changes the board and waits for an unlock. */
export const passesLock = (e: { type: string; action?: string }): boolean => e.type === 'seen' ||
  (e.type === 'act' && (PRIVATE_ACTIONS.has(e.action as ActEvent['action']) || APP_ACTIONS.has(e.action as ActEvent['action'])));

/** Why line `e` may not be written because its board is locked, or undefined: `LOCKED` for an
 * agent's line, `LOCKED_PERSON` for the person's. */
export function lockedProblem(s: LedgerState, e: LedgerEvent): string | undefined {
  if (passesLock(e)) return undefined;
  const board = eventBoard(s, e);
  if (board === undefined || !boardLocked(s, board)) return undefined;
  return e.by === 'agent' ? LOCKED : LOCKED_PERSON;
}

/** Why a line may not be written now, and which refusal it is: `archived` (archive.ts: an agent's
 * words say nothing of the board) or `locked`. Archived is asked first, so an archived board is
 * never named to an agent, locked or not. */
export interface WriteRefusal { code: 'archived' | 'locked'; detail: string }

/** The one "may this line be written" check (ruling 7): every line, person's or agent's. */
export function writeProblem(s: LedgerState, e: LedgerEvent): WriteRefusal | undefined {
  const archived = archivedProblem(s, e);
  if (archived) return { code: 'archived', detail: archived };
  const locked = lockedProblem(s, e);
  return locked ? { code: 'locked', detail: locked } : undefined;
}

/** A `lock` names a board that is not locked; an `unlock`, one that is (an archived board is judged
 * by `archivedProblem` first: only `restore` goes there). */
export function lockRules(e: ActEvent, s: LedgerState, p: string[]): void {
  const id = String(e.board);
  if (!s.boards.has(id)) p.push(`board: unknown "${id}"`);
  else if (e.action === 'lock' && s.locked.has(id)) p.push(`board: "${id}" is already locked`);
  else if (e.action === 'unlock' && !s.locked.has(id)) p.push(`board: "${id}" isn't locked`);
}
