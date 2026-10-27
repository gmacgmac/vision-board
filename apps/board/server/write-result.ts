// One `write_board` item's result (api.md 24-25, 125): the card in it by board number. Split out of
// write-board.ts so the replay of a retry key (write-replay.ts) builds the same result.
import type { LedgerEvent } from '#format';
import type { LedgerState } from '#actions';
import { numberOf } from '#actions';
import type { ItemProblem } from './write-problem.ts';

/** One item's result; every card in it by board number (api.md 125). */
export type WriteResult =
  | { index: number; key?: string; ok: true; seq: number; n?: number; ver?: number; title?: string; retired?: number[]; replayed?: true }
  | { index: number; key?: string; ok: false; problem: ItemProblem };

/** The result of an item that wrote `e` (or, `replayed`, was written before under its key). */
export function written(s: LedgerState, i: number, key: string | undefined, e: LedgerEvent, replayed = false): WriteResult {
  return {
    index: i, ...(key !== undefined && { key }), ok: true, seq: e.seq,
    ...(e.type === 'node' && { n: numberOf(s, e.id), ver: e.ver, title: e.node.title }),
    ...(e.type === 'retire' && { retired: e.cards.map((id) => numberOf(s, id)) }),
    ...(replayed && { replayed: true as const }),
  };
}
