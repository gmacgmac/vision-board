// The container finder (navigation FE_02, containerFinder flag): the toolbar dropdown's rows, and
// the zoom a choice makes. Rows are the board's containers in board order with each one's card
// count, Later always last; Later with no card is listed but cannot be chosen (it has no frame
// then, `placedView`). Zooming is no act, so it works in a past version too (versions.ts).
import type { View } from '../../../../packages/format/src/index.ts';
import { LATER_REGION } from '../../../../packages/format/src/index.ts';
import type { BoardLayout } from '../../../../packages/layout/src/index.ts';
import type { VbRegionElement } from '../../../../packages/ui/src/index.ts';
import type { Viewport } from './viewport.ts';

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
