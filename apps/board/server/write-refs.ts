// The cards a write item names, as the ledger line holds them (api.md 35, 125, 126): a board number
// on the path's board, or the `{ key }` of a node item this agent wrote, becomes the card's
// identity; a `retire` item becomes its stored line, with `cards` filled in. A number the board has
// not given, or a key no node item carried, fails the item at its pointer.
import type { LedgerEvent } from '../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../packages/actions/src/index.ts';
import { retireCards } from '../../../packages/actions/src/index.ts';
import { cardOn, noCard } from './edge.ts';
import type { Ledger } from './ledger.ts';
import { fail } from './write-problem.ts';

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/** One batch: the ledger, the writing agent, the path's board, and the keys of items that failed. */
export interface Batch { ledger: Ledger; agent: string; board: string; failed: Set<string> }

/** The fields of an item of `type` that hold a card's board number or `{ key }` (api.md 35): a
 * link's two ends, else `n`. A reply's `to` is the `seq` of the act it answers, never a card. */
export const refsOf = (type: unknown): readonly ('n' | 'from' | 'to')[] =>
  (type === 'link' || type === 'unlink' ? ['from', 'to'] : ['n']);

/** The line this agent's retry key is stored on, across the project (api.md 29), as code reads it. */
export function storedFor(b: Batch, key: string): LedgerEvent | undefined {
  const seq = b.ledger.state().keys.get(b.agent)?.get(key);
  return seq === undefined ? undefined : b.ledger.events().find((e) => e.seq === seq);
}

/** The identity `{ key }` names: a node made earlier in this batch or by an earlier call from this
 * agent; a key whose item failed fails this item too (api.md 34). */
function keyed(b: Batch, ref: Rec, pointer: string): number {
  const key = String(ref.key);
  if (b.failed.has(key)) {
    fail('depends-on-failed', `This item names the key "${key}", and the item with that key failed. Fix that item, then send both again with the same keys.`,
      { errors: [{ pointer, detail: `the item with key "${key}" failed` }] });
  }
  const e = storedFor(b, key);
  if (e?.type !== 'node') {
    fail('invalid', `No node you made has the key "${key}". Name the node by its number, or by the key of the node item that made it.`,
      { errors: [{ pointer, detail: `no node you made has the key "${key}"` }] });
  }
  return e.id;
}

/** Card `n` on the path's board as its identity. */
function numbered(b: Batch, s: LedgerState, n: unknown, pointer: string): number {
  const id = cardOn(s, b.board, n);
  if (id === undefined) {
    fail('invalid', `Board "${b.board}" has no card ${String(n)}. Name a card by its number on this board (get_board lists them), or by the key of the node item that made it.`,
      { errors: [{ pointer, detail: noCard(b.board, n) }] });
  }
  return id;
}

/** The item with every card it names by identity: `n`, `from`, `to` and a region's `center`. */
export function resolve(b: Batch, i: number, item: Rec): Rec {
  const s = b.ledger.state();
  const out: Rec = { ...item };
  for (const f of refsOf(item.type)) {
    const ref = item[f];
    if (ref === undefined) continue;
    const pointer = `/items/${i}/${f}`;
    out[f] = isRec(ref) ? keyed(b, ref, pointer) : numbered(b, s, ref, pointer);
  }
  const region = item.region;
  if (item.type === 'region' && isRec(region) && region.center !== undefined)
    out.region = { ...region, center: numbered(b, s, region.center, `/items/${i}/region/center`) };
  return out;
}

/** A resolved `retire` item as its stored line (api.md 126): the card it names, or every card in
 * the container now, in `cards`. */
export function retireLine(s: LedgerState, e: Rec): Rec {
  const { n, ...rest } = e;
  const board = String(e.board);
  const cards = typeof n === 'number' ? retireCards(s, { board, id: n }) : retireCards(s, { board, region: String(e.region) });
  return { ...rest, cards };
}
