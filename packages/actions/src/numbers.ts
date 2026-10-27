// Board numbers out (D-041 proposed, api.md 125): the folded ledger keys every card by its identity
// (`id`); every answer an agent or the person reads names a card by its number on its board (`n`).
// The reads here turn one into the other, once each: a card, a note's group, a proposal, a link and
// a whole ledger event. Numbers coming in are the server's edge (apps/board/server/edge.ts). Pure.
import type { LedgerEvent, LedgerIndex } from '#format';
import { boardNumber, cardFields, toLine } from '#format';
import type { LedgerState, Proposal } from './fold.ts';
import type { ItemNote } from './notes.ts';
import type { ReportedAction } from './registry.ts';
import { actionOut } from './registry.ts';

/** Card `id`'s number on its board. Every card the ledger holds has one; an unknown id is a slip
 * that comes out undefined (a JSON answer then leaves the field out, and its schema check fails). */
export const numberOf = (s: { index: LedgerIndex }, id: number): number => boardNumber(s.index, id)!;

/** How words name card `id` (format's `CardName`): its board number, or for an unknown card the
 * number as given. */
export const cardName = (s: { index: LedgerIndex }) => (id: number): string => String(boardNumber(s.index, id) ?? id);

/** A note with its group's cards by board number. */
export const noteOut = (s: LedgerState, note: ItemNote): ItemNote =>
  note.nodes ? { ...note, nodes: note.nodes.map((id) => numberOf(s, id)) } : note;

/** A proposal as the reads give it: its card by board number (`n`), its action as agents read it,
 * `check` or `cross` (D-045). */
export type ProposalView = Omit<Proposal, 'id' | 'action'> & { n: number; action: ReportedAction };

export function proposalOut(s: LedgerState, p: Proposal): ProposalView {
  const { seq, at, id, ...rest } = p;
  return { seq, at, n: numberOf(s, id), ...rest, action: actionOut(p.action) };
}

/** A link between two cards, by board number. */
export const linkOut = (s: LedgerState, l: { from: number; to: number; label?: string }) =>
  ({ from: numberOf(s, l.from), to: numberOf(s, l.to), ...(l.label !== undefined && { label: l.label }) });

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Ledger event `e` (with any extra fields, such as `means`, kept in place) as an answer shows it:
 * the line the file holds (`toLine`), with every card it names by board number, as the card-reference
 * table (`CARD_FIELDS`) lists them: `n`, `nodes`, `from`, `to`, a region's `center`, a retire's `cards`. */
export function eventOut<E extends LedgerEvent>(s: { index: LedgerIndex }, e: E): Rec {
  const line: Rec = toLine(e);
  const num = (v: unknown) => (typeof v === 'number' ? numberOf(s, v) : v);
  // The card-reference table: a link's ends are cards; a reply's `to` is the `seq` of the act it answers.
  for (const f of cardFields(e.type)) {
    const holder = f.in === undefined ? line : line[f.in];
    if (!isRec(holder) || holder[f.field] === undefined) continue;
    const value = holder[f.field];
    const out = f.list ? (Array.isArray(value) ? value.map(num) : value) : num(value);
    if (f.in === undefined) line[f.field] = out;
    else line[f.in] = { ...holder, [f.field]: out };
  }
  return line;
}
