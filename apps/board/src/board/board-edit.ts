// New board and Rename board from the picker (navigation BE_01, api.md 90, D-034): the dialog's
// answer becomes one `put_board` through the one sender (sender.ts, so it is refused while a past
// version shows). A new board's id is made from its title: lowercase letters and digits joined by
// hyphens, unique among the boards. A board the person made has no agent creator, so every agent
// asks the person for it before drawing on it.
import type { BoardActionId, LedgerState } from '../../../../packages/actions/src/index.ts';
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

export interface BoardEditDeps {
  sender: Pick<Sender, 'board'>;
  state(): LedgerState | null;
  /** The open board: the one Rename board renames. */
  id(): string;
  switchTo(id: string): void;
}

export interface BoardEdit {
  /** Create a board (then open it), or rename the open one; null when recorded, else the problem. */
  save(action: BoardActionId, fields: BoardFields): Promise<string | null>;
}

export function createBoardEdit(d: BoardEditDeps): BoardEdit {
  return {
    async save(action, fields) {
      const id = action === 'new-board' ? boardIdFor(fields.title, d.state()?.boards ?? new Set()) : d.id();
      if (!id) return 'No board is open to rename.';
      const problem = await d.sender.board(id, fields);
      if (problem === null && action === 'new-board') d.switchTo(id);
      return problem;
    },
  };
}
