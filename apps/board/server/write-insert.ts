// A node item's `insert` (PLAN Decision 5, point 424, api.md 174): the card goes between two linked cards of one
// `flow` or `lanes` container in one write. The item becomes its node line, then an unlink of `after`→`before` and
// links `after`→card and card→`before`, both with the old link's label (`insertLines`). Everything those lines need is
// checked before the node line is appended (`checkInsert`), so the three after it fit the ledger's own checks: a
// card on the board and not retired, the same board, lock and container grant as the node line. Nothing else is
// appended between them (one writing server per ledger, and an append is synchronous). A retry of the item reads
// what it did back from the three lines after its node line (`insertedBy`). Behind the `insertBetween` flag.
import type { LedgerEvent } from '#format';
import { isRecord } from '#format';
import type { LedgerState } from '#actions';
import { LATER, numberOf, placeOf } from '#actions';
import { fail } from './write-problem.ts';
import type { Batch } from './write-refs.ts';
import * as writesWords from './words/writes.ts';

type Rec = Record<string, unknown>;

/** The two cards of an `insert`, by identity once resolved: where the link starts and where it ends. */
export interface Between { after: number; before: number }

/** The modes that place cards by their links (SKILL.md § layouts); `row`, `column` and `grid` go by number. */
const BY_LINKS: ReadonlySet<string> = new Set(['flow', 'lanes']);

/** A resolved item's `insert`, or undefined when it has none. */
export const insertOf = (item: Rec): Between | undefined => (isRecord(item.insert) ? (item.insert as unknown as Between) : undefined);

/** How container `region` lays out now: the person's choice, else the agent's; the built-in Later is a grid. */
const modeOf = (s: LedgerState, board: string, region: string): string =>
  s.modes.get(board)?.get(region) ?? s.boards.get(board)?.regions.find((r) => r.id === region)?.mode ?? LATER.mode;

/** The two cards, each on the path's board and not retired. */
function checkCards(b: Batch, s: LedgerState, i: number, e: Rec, at: Between): void {
  const p = `/items/${i}/insert`;
  if (at.after === at.before) {
    fail('invalid', writesWords.insertSameCard(numberOf(s, at.after)), { errors: [{ pointer: `${p}/before`, detail: writesWords.notTheSameCard }] });
  }
  for (const f of ['after', 'before'] as const) {
    const id = at[f];
    const n = numberOf(s, id);
    if (e.n === id) fail('invalid', writesWords.insertTheCardItself(n), { errors: [{ pointer: `${p}/${f}`, detail: writesWords.theCardThisItemWrites }] });
    const board = s.nodes.get(id)!.board;
    if (board !== b.board) {
      fail('invalid', writesWords.thisCallWritesBoardAnd(b.board, n, board), { errors: [{ pointer: `${p}/${f}`, detail: writesWords.nodeIsOnBoardNot(n, board, b.board) }] });
    }
    if (s.index.retired.has(id)) fail('invalid', writesWords.insertRetired(n), { errors: [{ pointer: `${p}/${f}`, detail: writesWords.cardWasRetired(n) }] });
  }
}

/** Everything the three lines after the node line need, checked before anything is appended: the two cards, their
 * link, one container that lays out by links, the card's `region` naming it, and no move of the person's keeping an
 * existing card elsewhere. */
export function checkInsert(b: Batch, i: number, e: Rec, at: Between): void {
  const s = b.ledger.state();
  checkCards(b, s, i, e, at);
  const [after, before] = [numberOf(s, at.after), numberOf(s, at.before)];
  const p = `/items/${i}/insert`;
  if (!s.links.has(`${at.after}>${at.before}`)) {
    const why = s.links.has(`${at.before}>${at.after}`) ? writesWords.insertReversed(after, before) : writesWords.insertNoLink(after, before);
    fail('invalid', why, { errors: [{ pointer: p, detail: writesWords.noLinkFromTo(after, before) }] });
  }
  const [from, to] = [placeOf(s, at.after)!.region, placeOf(s, at.before)!.region];
  if (from !== to) {
    fail('invalid', writesWords.insertApart(after, from, before, to), { errors: [{ pointer: p, detail: writesWords.cardsInTwoContainers(from, to) }] });
  }
  const mode = modeOf(s, b.board, from);
  if (!BY_LINKS.has(mode)) fail('invalid', writesWords.insertNotFlow(from, mode), { errors: [{ pointer: p, detail: writesWords.containerLaysOutAs(from, mode) }] });
  const region = String((e.node as Rec).region);
  if (region !== from) {
    fail('invalid', writesWords.insertRegion(region, from), { errors: [{ pointer: `/items/${i}/node/region`, detail: writesWords.notTheContainer(from) }] });
  }
  const card = typeof e.n === 'number' ? placeOf(s, e.n) : undefined;
  if (card && card.region !== card.drawn && card.region !== from) {
    fail('invalid', writesWords.insertMoved(numberOf(s, e.n as number), card.region, from),
      { errors: [{ pointer: `/items/${i}/n`, detail: writesWords.thePersonMovedIt(card.region) }] });
  }
}

/** The old link's label, read before the node line is appended (the lines after it carry it to both new links). */
export const labelOf = (s: LedgerState, at: Between): { label?: string } => {
  const label = s.links.get(`${at.after}>${at.before}`)?.label;
  return label === undefined ? {} : { label };
};

/** The three lines after the node line of card `card`. */
export const insertLines = (at: Between, card: number, label: { label?: string }): Rec[] => [
  { type: 'unlink', from: at.after, to: at.before },
  { type: 'link', from: at.after, to: card, ...label },
  { type: 'link', from: card, to: at.before, ...label },
];

/** What an insert wrote after node line `stored`, read back from the ledger: the three lines `insertLines` makes, by
 * the same agent with no key of their own; undefined when they are not there. */
export function insertedBy(b: Batch, stored: LedgerEvent): Between | undefined {
  if (stored.type !== 'node') return undefined;
  const all = b.ledger.events();
  const k = all.findIndex((x) => x.seq === stored.seq);
  const [u, l1, l2] = all.slice(k + 1, k + 4);
  if (u?.type !== 'unlink' || l1?.type !== 'link' || l2?.type !== 'link') return undefined;
  if (![u, l1, l2].every((x) => x.agent === stored.agent && x.key === undefined)) return undefined;
  const ok = l1.from === u.from && l1.to === stored.id && l2.from === stored.id && l2.to === u.to;
  return ok ? { after: u.from, before: u.to } : undefined;
}
