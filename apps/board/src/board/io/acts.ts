// What the board sends for the person's acts (ARCH_06, split out of io.ts): the bodies' shapes, and
// which acts name their board. The server stamps the rest of the line (act.schema.json).
import type { ActionId, OperationInput } from '#format';
import { BOARD_MARKS } from '#format';

/** What the page sends for one person action (`act`'s body, act.schema.json `sent`, less its
 * `type`); the server stamps the rest. */
export type ActFields = Omit<OperationInput<'act'>['body'], 'type'>;

/** What the person gives a board: `put_board`'s body (api.md 90). */
export type BoardFields = OperationInput<'put_board'>['body'];

/** What the person removes from a board: `retire_cards`' body (N24, api.md 141), cards by number
 * or a whole container. */
export type RetireFields = OperationInput<'retire_cards'>['body'];

/** Acts the schema asks to name their board (api.md 16, 135, 138): it is always the board they are sent
 * to. Every board mark does (archive, restore, lock, unlock). */
const NAMES_BOARD: ReadonlySet<ActionId> = new Set(['mode', 'widths', 'send', 'revoke', ...BOARD_MARKS]);
/** A note or a place on a whole container names `board` + `region` in place of `n` (api.md 71). */
const CONTAINER_ACTS: ReadonlySet<ActionId> = new Set(['comment', 'note-edit', 'note-remove', 'pin', 'unpin']);
export const namesBoard = (f: ActFields) =>
  NAMES_BOARD.has(f.action) || (CONTAINER_ACTS.has(f.action) && f.region !== undefined && f.n === undefined);
