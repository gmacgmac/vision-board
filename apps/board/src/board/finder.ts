// The toolbar's finders, menu dropdowns (shell/MenuSelect.svelte) whose rows are `MenuRow`s. The
// container finder (navigation FE_02, containerFinder flag): the board's containers in board order
// with each one's card count, Later always last; Later with no card is listed but cannot be chosen
// (it has no frame then, `placedView`); a choice zooms to it. The open list (open-list FE_01,
// openList flag): the open cards (`openCards`, the "N open" chip's own count) as "12 · title"; a
// choice goes to the card (go-to-card.ts `to`). The "N new" list (freshCards flag) is the same row,
// an updated card's ending "· updated" (`freshCards`). Neither is an act, so both work in a past version (versions.ts).
import type { View } from '../../../../packages/format/src/index.ts';
import { LATER_REGION } from '../../../../packages/format/src/index.ts';
import type { BoardLayout } from '../../../../packages/layout/src/index.ts';
import type { VbRegionElement } from '../../../../packages/ui/src/index.ts';
import type { Viewport } from './viewport.ts';
import { clip } from './clip.ts';

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
  return [...rows, row(LATER_REGION, 'Later')];
}

/** The row's text: "Ideas · 3 items". */
export const rowText = (r: ContainerRow): string => `${r.title} · ${r.count} item${r.count === 1 ? '' : 's'}`;

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
  const h2 = d.frames().get(id)?.titleLine().querySelector('h2');
  if (h2) {
    h2.tabIndex = -1;
    h2.focus({ preventScroll: true });
  }
  return true;
}
