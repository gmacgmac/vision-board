// Archiving a board (N39 rulings 1-9, api.md 135-137): the person hides a whole board from every
// agent with an `archive` act and brings it back with `restore`; the ledger keeps every line (D-017).
// The fold keeps the archived set (`LedgerState.archived`) and nothing else: like the flag, an
// archive or restore moves no head, sees no card, is no answer and reaches no agent (fold.ts).
// `boardVisibility` is the one check of whether agents see a board (ruling 7): every agent read and
// write asks it (the server's `requireBoard`, `write_board`, its retry keys, the ledger module's
// check through `archivedProblem`), and so do the board list and the conditions; nothing else looks
// at the set. Pure.
import type { ActEvent, LedgerEvent } from '../../format/src/index.ts';
import { BOARD_MARKS } from '../../format/src/index.ts';
import type { LedgerState } from './fold.ts';
import { eventBoard } from './references.ts';

/** How a board stands for agents: `visible`, `archived` (it exists, and no agent may know it), or
 * `unknown` (no such board; an agent may make one with that id). */
export type BoardVisibility = 'visible' | 'archived' | 'unknown';

/** How `board` stands for agents: the one check (ruling 7). */
export function boardVisibility(s: LedgerState, board: string): BoardVisibility {
  if (!s.boards.has(board)) return 'unknown';
  return s.archived.has(board) ? 'archived' : 'visible';
}

/** Whether agents see `board`: it exists and is not archived. */
export const visibleToAgents = (s: LedgerState, board: string): boolean => boardVisibility(s, board) === 'visible';

/** What an agent is told when it would make or write on an archived board (ruling 9): it says
 * nothing about the board, only that the id is taken. */
export const UNAVAILABLE = 'That board id isn\'t available; choose another id.';

/** Fold one `archive` or `restore` (the person's board marks). */
export function foldArchive(s: LedgerState, e: ActEvent): void {
  if (e.action === 'archive') s.archived.set(e.board!, e.seq);
  else s.archived.delete(e.board!);
}

/** Why line `e` may not be written because its board is archived (rulings 2, 3, 9), or undefined.
 * An agent's line is refused with `UNAVAILABLE`; the person's (a rename, an act) until the board is
 * restored, but a seen, which a page leaving the board still sends. Archive and restore are judged
 * by `archiveRules`. The ledger module asks this of every line it appends. */
export function archivedProblem(s: LedgerState, e: LedgerEvent): string | undefined {
  if (e.type === 'act' && BOARD_MARKS.has(e.action)) return undefined;
  const board = eventBoard(s, e);
  if (board === undefined || boardVisibility(s, board) !== 'archived') return undefined;
  if (e.by === 'agent') return UNAVAILABLE;
  if (e.type === 'seen') return undefined;
  return `board: "${board}" is archived; restore it from the board picker first`;
}

/** An `archive` names a board that is not archived; a `restore`, one that is. */
export function archiveRules(e: ActEvent, s: LedgerState, p: string[]): void {
  const id = String(e.board);
  const v = boardVisibility(s, id);
  if (v === 'unknown') p.push(`board: unknown "${id}"`);
  else if (e.action === 'archive' && v === 'archived') p.push(`board: "${id}" is already archived`);
  else if (e.action === 'restore' && v === 'visible') p.push(`board: "${id}" isn't archived`);
}

/** When a board's first line was written, and its own last line (fold.ts `heads`). */
export interface BoardDates { created: string; updated: string }

/** One archived board as the page's Archived list shows it (ruling 6). `archived`: the `seq` of
 * the act that archived it. */
export interface ArchivedBoard extends BoardDates { board: string; title: string; archived: number }

/** Every archived board, the latest archived first. */
export const archivedBoards = (s: LedgerState): ArchivedBoard[] => [...s.archived]
  .sort((a, b) => b[1] - a[1])
  .map(([board, archived]) => ({ board, title: s.boards.get(board)!.title, ...s.dates.get(board)!, archived }));
