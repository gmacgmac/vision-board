// A board's skin (D-100 2, api.md 183): how its nodes look, never what they do. Set on the board's `board` line by
// whoever makes it, and by the person's `skin` act; the latest line naming a skin wins. Kept in its own map that only
// such a line sets, so the person's rename (a `board` line with no `skin`) keeps it. Not a private mark: agents read it
// (`get_board`, `list_boards`); not an answer: it lights no Send. Pure.
import type { LedgerEvent, Skin } from '#format';
import { DEFAULT_SKIN } from '#format';
import type { LedgerState } from './fold.ts';

/** Fold a `board` line or a `skin` act that names a skin. */
export function foldSkin(s: LedgerState, e: LedgerEvent): void {
  if (e.type === 'board' && e.skin !== undefined) s.skins.set(e.board, e.skin);
  if (e.type === 'act' && e.action === 'skin') s.skins.set(e.board!, e.skin!);
}

/** `board`'s skin: the latest a line set, else `default`. */
export const skinOf = (s: LedgerState, board: string): Skin => s.skins.get(board) ?? DEFAULT_SKIN;
