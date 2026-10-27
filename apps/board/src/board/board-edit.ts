// New board, Rename board, Archive board, Restore, Lock board and Unlock board from the picker and
// the "⋯" menu (navigation BE_01, api.md 90, D-034; N39, api.md 135-137; N40, api.md 138): New
// board and Rename board become one `put_board`, Archive board, Restore, Lock board and Unlock board
// one `archive`, `restore`, `lock` or `unlock` act, each through the one sender (sender.ts, so it is
// refused while a past version shows). A new board's id is made from its title: lowercase
// letters and digits joined by hyphens, unique among the boards, archived ones too, so it never
// lands on an archived board. A board the person made has no agent creator, so every agent asks the
// person for it before drawing on it. Archive asks first (ruling 5); the page then opens the next
// board (boards.ts, which does so whoever archived it). Restore opens the board it brings back. Lock
// board asks nothing (nothing is lost either way) and says what it did.
import type { BoardActionId, LedgerState } from '#actions';
import { boardLocked } from '#actions';
import type { BoardFields } from './io.ts';
import type { Sender } from './sender.ts';

/** Room left under the id limit (64, api.md 10) for a "-N" that makes it unique. */
const BASE_MAX = 56;

/** A board id for `title`, not one of `taken`: "Hiring plan 2027" -> "hiring-plan-2027", then
 * "hiring-plan-2027-2" when that is taken; "board" when the title has no letter or digit. */
export function boardIdFor(title: string, taken: { has(id: string): boolean }): string {
  const base = title.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .slice(0, BASE_MAX).replace(/^-+|-+$/g, '') || 'board';
  let id = base;
  for (let i = 2; taken.has(id); i += 1) id = `${base}-${i}`;
  return id;
}

/** A day as the archive confirm and the Archived list say it, in the viewer's own words: "11 Oct",
 *  with the year when it is not this year's. */
export function dayOf(at: string, now = new Date()): string {
  const d = new Date(at);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', ...(d.getFullYear() !== now.getFullYear() && { year: 'numeric' }) });
}

/** The archive confirm's words (ruling 5): heading, body, and the confirming button. */
export function archiveAsk(title: string, dates: { created: string; updated: string }, now = new Date()): [string, string, string] {
  return [
    `Archive '${title}'?`,
    `Created ${dayOf(dates.created, now)}, last updated ${dayOf(dates.updated, now)}. Agents won't see it; you can restore it from the board picker.`,
    'Archive',
  ];
}

export interface BoardEditDeps {
  sender: Pick<Sender, 'board' | 'actOn'>;
  state(): LedgerState | null;
  /** The open board: the one Rename board renames and Archive board archives. */
  id(): string;
  switchTo(id: string): void;
  /** Ask the person (the shell's confirm dialog); true when confirmed. */
  confirm(heading: string, body: string, confirm: string): Promise<boolean>;
  /** Say what was done (the info toast). */
  toast?(text: string): void;
}

export interface BoardEdit {
  /** Create a board (then open it), or rename the open one; null when recorded, else the problem. */
  save(action: BoardActionId, fields: BoardFields): Promise<string | null>;
  /** Ask, then archive the open board; null when archived or cancelled, else the problem. */
  archive(): Promise<string | null>;
  /** Restore board `id` and open it; null when restored, else the problem. */
  restore(id: string): Promise<string | null>;
  /** Lock the open board, or unlock it when it is locked; null when done, else the problem. */
  lock(): Promise<string | null>;
}

/** What the toast says once the board is locked or unlocked. */
export const LOCK_DONE = { lock: 'Board locked: nobody can change it until you unlock it', unlock: 'Board unlocked' } as const;

export function createBoardEdit(d: BoardEditDeps): BoardEdit {
  return {
    async save(action, fields) {
      const id = action === 'new-board' ? boardIdFor(fields.title, d.state()?.boards ?? new Set()) : d.id();
      if (!id) return 'No board is open to rename.';
      const problem = await d.sender.board(id, fields);
      if (problem === null && action === 'new-board') d.switchTo(id);
      return problem;
    },
    async archive() {
      const id = d.id();
      const s = d.state();
      const board = s?.boards.get(id);
      const dates = s?.dates.get(id);
      if (!board || !dates) return 'No board is open to archive.';
      if (!(await d.confirm(...archiveAsk(board.title, dates)))) return null;
      return d.sender.actOn(id, { action: 'archive' });
    },
    async restore(id) {
      const problem = await d.sender.actOn(id, { action: 'restore' });
      if (problem === null) d.switchTo(id);
      return problem;
    },
    async lock() {
      const id = d.id();
      const s = d.state();
      if (!s?.boards.has(id)) return 'No board is open to lock.';
      const action = boardLocked(s, id) ? 'unlock' : 'lock';
      const problem = await d.sender.actOn(id, { action });
      if (problem === null) d.toast?.(LOCK_DONE[action]);
      return problem;
    },
  };
}
