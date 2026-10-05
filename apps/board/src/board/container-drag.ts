// Moving a whole container (3_FE_04 rulings 5, 6 and 8). A drag on a frame's grip (pointer.ts)
// carries the frame and every card in it: while it runs only their screen transforms change, and
// the connectors are drawn from the moved boxes (the same path a card drag takes, wiring.ts), so
// nothing is laid out, measured or re-rendered (rule 15; N12). The drop writes ONE container `pin`
// with the frame's top left in board coordinates, through the action layer (`record`), and the
// normal redraw then lays the board out (`collide.ts` makes room). Alt+arrows on the grip
// (keys.ts) go through the same `pin`. A lost pointer puts everything back; a click writes nothing.
import type { View } from '../../../../packages/format/src/index.ts';
import type { BoardLayout, Box, Point } from '../../../../packages/layout/src/index.ts';
import { routeLinks } from '../../../../packages/layout/src/index.ts';
import type { VbNodeElement, VbRegionElement } from '../../../../packages/ui/src/index.ts';
import type { ActFields } from './io.ts';

export interface ContainerDragDeps {
  layout(): BoardLayout | null;
  view(): View;
  frame(region: string): VbRegionElement | undefined;
  card(id: string): VbNodeElement | undefined;
  /** Connectors for a layout that is not kept (the dragged boxes), as a card drag draws them. */
  drawDrag(layout: BoardLayout): void;
  /** Hide the connectors until the relayout a drop causes has drawn (draw.ts `settle`). */
  settle(): void;
  /** Send one act; true when it was recorded. */
  record(fields: ActFields): Promise<boolean>;
  redraw(): void;
}

export interface ContainerDrag {
  /** The grip's drag passed its threshold: the frame and its cards start moving. */
  start(region: string): void;
  /** The pointer moved by `d`, in board units, since the drag began. */
  move(d: Point): void;
  /** The drop (`d` since the start), or null when the pointer was lost (everything goes back). */
  end(d: Point | null): Promise<void>;
  /** Pin `region` with its frame's top left at `x`, `y` (a drop, or Alt+arrows on the grip). */
  pin(region: string, at: Point): Promise<void>;
}

/** What one drag carries: the frame and its box, each card in it and its box, at the start. */
interface Carry {
  region: string;
  el: VbRegionElement;
  box0: Box;
  cards: { id: string; el: VbNodeElement; box0: Box }[];
  layout: BoardLayout;
}

const translate = (b: Point, d: Point) => `translate(${b.x + d.x}px, ${b.y + d.y}px)`;

export function createContainerDrag(d: ContainerDragDeps): ContainerDrag {
  let carry: Carry | null = null;
  const none: Point = { x: 0, y: 0 };

  /** The carried elements back to plain placing (the next draw puts them where layout says). */
  function release(c: Carry) {
    c.el.removeAttribute('data-dragging');
    for (const x of c.cards) x.el.classList.remove('dragging');
  }

  /** Everything back where the drag found it. The draw would not do it: the frame's place did not
   *  change in the layout, so it is not placed again. */
  function restore(c: Carry) {
    c.el.style.transform = translate(c.box0, none);
    for (const x of c.cards) x.el.style.transform = translate(x.box0, none);
    d.drawDrag(c.layout);
  }

  /** One container pin; false when it was not recorded. */
  const record = (region: string, at: Point) =>
    d.record({ action: 'pin', region, x: Math.round(at.x), y: Math.round(at.y) });

  async function pin(region: string, at: Point) {
    d.settle();
    const ok = await record(region, at);
    d.settle();
    if (!ok) d.redraw();
  }

  return {
    pin,
    start(region) {
      const layout = d.layout();
      const r = layout?.regions.find((x) => x.id === region);
      const el = d.frame(region);
      if (!layout || !r || !el) return;
      const cards = d.view().nodes.filter((n) => n.region === region).flatMap((n) => {
        const box0 = layout.nodes.get(n.id);
        const c = d.card(n.id);
        return box0 && c ? [{ id: n.id, el: c, box0 }] : [];
      });
      carry = { region, el, box0: r.box, cards, layout };
      el.setAttribute('data-dragging', '');
      for (const c of cards) c.el.classList.add('dragging');
    },
    move(delta) {
      if (!carry) return;
      const last = { x: Math.round(delta.x), y: Math.round(delta.y) };
      carry.el.style.transform = translate(carry.box0, last);
      const nodes = new Map(carry.layout.nodes);
      for (const c of carry.cards) {
        c.el.style.transform = translate(c.box0, last);
        nodes.set(c.id, { ...c.box0, x: c.box0.x + last.x, y: c.box0.y + last.y });
      }
      d.drawDrag({ ...carry.layout, nodes, routes: routeLinks(d.view().links, nodes) });
    },
    async end(delta) {
      const c = carry;
      carry = null;
      if (!c) return;
      release(c);
      const at = delta && { x: Math.round(delta.x), y: Math.round(delta.y) };
      // A lost pointer, or no movement after rounding: nothing is written.
      if (!at || (!at.x && !at.y)) return restore(c);
      // The links drawn mid-drag are stale until the board is laid out again: they hide, as for
      // any relayout, from the drop until that draw has settled.
      d.settle();
      const ok = await record(c.region, { x: c.box0.x + at.x, y: c.box0.y + at.y });
      d.settle();
      if (!ok) restore(c);
    },
  };
}
