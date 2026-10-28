// The toolbar's finders, menu dropdowns (shell/MenuSelect.svelte) whose rows are `MenuRow`s. The
// container finder (navigation FE_02, containerFinder flag): the board's containers in board order
// with each one's card count, Later always last; Later with no card is listed but cannot be chosen
// (it has no frame then, `placedView`); a choice zooms to it. The open list (open-list FE_01,
// openList flag): the open cards (`openCards`, the "N open" chip's own count) as "12 · title"; a
// choice goes to the card (go-to-card.ts `to`). The "N new" list (freshCards flag) is the same row,
// an updated card's ending "· updated" (`freshCards`). Neither is an act, so both work in a past version (versions.ts).
// The proposals notice's Review list (reviewList flag) is the same row with what is proposed (`proposalRow`).
import type { View } from '#format';
import type { ProposalRow } from '#actions';
import { clip, LATER_REGION } from '#format';
import type { BoardLayout } from '#layout';
import type { VbRegionElement } from '#ui';
import type { Viewport } from '../canvas/index.ts';
import * as cardsWords from '../words/cards.ts';

/** One row of a menu dropdown: what a choice names, its words, and its tooltip when the words are cut. */
export interface MenuRow { value: string; text: string; disabled?: boolean; title?: string }

export interface ContainerRow {
  id: string;
  title: string;
  count: number;
  /** False when there is nothing to zoom to: no frame on the board (Later while empty). */
  usable: boolean;
}

/** The finder's rows for the board as drawn (`view` is the placed view; `layout` the one drawn). */
export function containerRows(view: View, layout: BoardLayout | null): ContainerRow[] {
  const count = (id: string) => view.nodes.filter((n) => n.region === id).length;
  const row = (id: string, title: string): ContainerRow =>
    ({ id, title, count: count(id), usable: layout?.regions.some((r) => r.id === id) === true && (id !== LATER_REGION || count(id) > 0) });
  const rows = view.regions.filter((r) => r.id !== LATER_REGION).map((r) => row(r.id, r.title));
  return [...rows, row(LATER_REGION, cardsWords.later)];
}

/** The row's text: "Ideas · 3 items". */
export const rowText = (r: ContainerRow): string => cardsWords.item(r.title, r.count);

/** The most characters an open list row shows; past it the title ends in "…" (`openRow`). */
export const OPEN_ROW_MAX = 60;

/** What a card's row is made from: an open card (`openCards`) or a new or updated one (`freshCards`). */
export interface RowCard { n: number; title: string; updated?: boolean }

/** A card's row: "12 · Pick a plan", an updated card's ending " · updated", cut at OPEN_ROW_MAX
 * (the title giving way, never the ending) with the whole text its tooltip. */
export function openRow(c: RowCard): MenuRow {
  const end = c.updated ? ' · updated' : '';
  const whole = `${c.n} · ${c.title}${end}`;
  const text = clip(`${c.n} · ${c.title}`, OPEN_ROW_MAX - end.length) + end;
  return { value: String(c.n), text, ...(text !== whole && { title: whole }) };
}

/** The most characters each of a Review list row's title and proposal shows; past it each ends in "…". */
export const PROPOSAL_ROW_MAX = 36;

/** A card with a proposal, for the notice's Review list (reviewList flag, REVIEW_01): its number and
 * title, and `what` it proposes ("Cross: the client declined"). */
export interface ProposalCard { n: number; title: string; what: string }

/** A Review list row: "12 · Pick a plan · Cross: the client declined", the title and the proposal each
 * cut at PROPOSAL_ROW_MAX with the whole text its tooltip. The same row as the open list's, with what is proposed. */
export function proposalRow(c: ProposalCard): MenuRow {
  const whole = `${c.n} · ${c.title} · ${c.what}`;
  const text = `${c.n} · ${clip(c.title, PROPOSAL_ROW_MAX)} · ${clip(c.what, PROPOSAL_ROW_MAX)}`;
  return { value: String(c.n), text, ...(text !== whole && { title: whole }) };
}

/** The Review list for the proposals found (newest first): a row per card with a proposal, in card
 * order, from its newest proposal (`what` words it). Empty when a row lacks its card's title (the
 * reviewList flag is off, proposal-flow.ts) or there is only one card: Review then goes straight to it. */
export function reviewRows(rows: readonly ProposalRow[], what: (r: ProposalRow) => string): MenuRow[] {
  const cards = [...new Map([...rows].reverse().map((r) => [r.n, r])).values()].sort((a, b) => a.n - b.n);
  return cards.length > 1 && cards.every((r) => r.title !== undefined)
    ? cards.map((r) => proposalRow({ n: r.n, title: r.title!, what: what(r) })) : [];
}

export interface FinderDeps {
  vp: Viewport;
  layout(): BoardLayout | null;
  frames(): ReadonlyMap<string, VbRegionElement>;
}

/** Zoom to container `id` as Zoom to selection does for a selection, then focus its title line
 *  (the heading, which takes focus from code only); false when there is no such frame. */
export function zoomToContainer(d: FinderDeps, id: string): boolean {
  const box = d.layout()?.regions.find((r) => r.id === id)?.box;
  if (!box) return false;
  d.vp.fit(box);
  focusContainer(d, id);
  return true;
}

/** Focus container `id`'s title line (its heading, which takes focus from code only), so the keys a
 *  container takes (C or N for its note, Z to zoom to it) are its own. */
export function focusContainer(d: Pick<FinderDeps, 'frames'>, id: string): void {
  const h2 = d.frames().get(id)?.titleLine().querySelector('h2');
  if (!h2) return;
  h2.tabIndex = -1;
  h2.focus({ preventScroll: true });
}
