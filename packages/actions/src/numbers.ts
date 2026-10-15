// Board numbers out (D-041 proposed, api.md 125): the folded ledger keys every card by its identity
// (`id`); every answer an agent or the person reads names a card by its number on its board (`n`).
// The reads here turn one into the other, once each: a card, a note's group, a proposal, a link and
// a whole ledger event. Numbers coming in are the server's edge (apps/board/server/edge.ts). Pure.
import type { LedgerEvent, LedgerIndex } from '../../format/src/index.ts';
import { boardNumber, toLine } from '../../format/src/index.ts';
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

/** Ledger event `e` (with any extra fields, such as `means`, kept in place) as an answer shows it:
 * the line the file holds (`toLine`), with every card it names by board number: `n`, `nodes`,
 * `from`, `to`, a region's `center`, a retire's `cards`. */
export function eventOut<E extends LedgerEvent>(s: { index: LedgerIndex }, e: E): Rec {
  const line: Rec = toLine(e);
  const num = (v: unknown) => (typeof v === 'number' ? numberOf(s, v) : v);
  const nums = (v: unknown) => (Array.isArray(v) ? v.map(num) : v);
  // A link's ends are cards; a reply's `to` is the `seq` of the act it answers.
  const cards = e.type === 'link' || e.type === 'unlink' ? ['from', 'to'] as const : ['n'] as const;
  for (const f of cards) if (line[f] !== undefined) line[f] = num(line[f]);
  for (const f of ['nodes', 'cards'] as const) if (line[f] !== undefined) line[f] = nums(line[f]);
  const region = line.region as Rec | undefined;
  if (e.type === 'region' && region?.center !== undefined) line.region = { ...region, center: num(region.center) };
  return line;
}
