// Draws a laid-out board's frames, and the reading order every list on the stage follows. Elements
// are created once and then updated in place (attributes, transforms), so focus and CSS transitions
// survive every draw; a frame is rendered again only when its region changed, and updated only when
// what it shows changed (N12_FE_01). Cards live in cards.ts, connectors in wires.ts.
import type { View, ViewNode } from '../../../../packages/format/src/index.ts';
import type { BoardLayout } from '../../../../packages/layout/src/index.ts';
import type { AccessHolder, BoardState } from '../../../../packages/actions/src/index.ts';
import type { CardReply, VbRegionElement } from '../../../../packages/ui/src/index.ts';
import { regionState, retiredMarker } from '../../../../packages/ui/src/index.ts';
import type { RetiredCount } from './retired.ts';
import { LATER_REGION } from '../../../../packages/format/src/index.ts';
import { work } from './work.ts';

/** The built-in Later's frame (3_FE_03 ruling 5): its layout is the grid, set by the board, and
 * while it is empty it shows only while a card is dragged, as a drop target. */
export const LATER_FRAME = { fixed: true, empty: 'Drop a card here to save it for later.' } as const;

/** Items first in number order, then the rest: DOM order is tab order is reading order. */
export function readingOrder(view: View): ViewNode[] {
  return view.nodes
    .map((n, i) => ({ n, i }))
    .sort((a, b) => (a.n.n ?? Infinity) - (b.n.n ?? Infinity) || a.i - b.i)
    .map((x) => x.n);
}

export interface RegionSet {
  readonly els: Map<string, VbRegionElement>;
  /** One `<vb-region>` per region of `view`, in view order; a changed region is rendered again. */
  sync(view: View): void;
  /** Place and update each frame; true when any frame moved or changed size. `holders` (the
   * agentAccess flag): region id -> the agents that hold it. `owed`: the containers the agent
   * still owes an answer on (`regionState`'s, 3_FE_04 step 4G). `replies`: the agent's replies to show
   * under container notes (the cardReplies flag, FE_03). `retired`: each container's "N cards retired"
   * marker (the retiredMarker flag, retired.ts). */
  place(
    layout: BoardLayout, view: View, s: BoardState, holders?: Readonly<Record<string, AccessHolder[]>>, owed?: ReadonlySet<string>,
    replies?: readonly CardReply[], retired?: ReadonlyMap<string, RetiredCount>,
  ): boolean;
  clear(): void;
}

/** `widths`: every ordinary frame has the Match card widths switch (widthsControl flag); `remove`:
 * Remove container in its settings (personRemove flag, N24). */
export function createRegionSet(host: HTMLElement, opts: { widths?: boolean; remove?: boolean } = {}): RegionSet {
  const els = new Map<string, VbRegionElement>();
  const drawn = new Map<string, string>();
  const shown = new Map<string, { box: string; state: string }>();
  return {
    els,
    sync(view) {
      const live = new Set(view.regions.map((r) => r.id));
      for (const [id, el] of els) {
        if (live.has(id)) continue;
        el.remove();
        els.delete(id);
        drawn.delete(id);
        shown.delete(id);
      }
      let prev: Element | null = null;
      for (const r of view.regions) {
        let el = els.get(r.id);
        const key = JSON.stringify(r);
        if (!el) {
          el = document.createElement('vb-region') as VbRegionElement;
          els.set(r.id, el);
        }
        if (drawn.get(r.id) !== key) {
          el.render(r, r.id === LATER_REGION ? LATER_FRAME : { widths: opts.widths === true, remove: opts.remove === true });
          drawn.set(r.id, key);
          shown.delete(r.id);
        }
        const want: Element | null = prev ? prev.nextElementSibling : host.firstElementChild;
        if (want !== el) host.insertBefore(el, want);
        prev = el;
      }
    },
    place(layout, view, s, holders, owed, replies, retired) {
      const placed = new Set(layout.nodes.keys());
      let moved = false;
      for (const r of layout.regions) {
        const el = els.get(r.id);
        if (!el) continue;
        const box = JSON.stringify(r.box);
        const gone = retired?.get(r.id);
        const st = { ...regionState(r, view, s, placed, holders?.[r.id], owed, replies), ...(gone && { retired: retiredMarker(gone.count, gone.version) }) };
        const state = JSON.stringify(st);
        const was = shown.get(r.id);
        if (was?.box !== box) {
          el.style.transform = `translate(${r.box.x}px, ${r.box.y}px)`;
          el.style.width = `${r.box.w}px`;
          el.style.height = `${r.box.h}px`;
          moved = true;
        }
        if (was?.state !== state) {
          el.update(st);
          work.framesUpdated += 1;
        }
        shown.set(r.id, { box, state });
      }
      return moved;
    },
    clear() {
      host.replaceChildren();
      els.clear();
      drawn.clear();
      shown.clear();
    },
  };
}
