// Draws a laid-out board's frames. Elements
// are created once and then updated in place (attributes, transforms), so focus and CSS transitions
// survive every draw; a frame is rendered again only when its region changed, and updated only when
// what it shows changed (N12_FE_01). Cards live in cards.ts, connectors in wires.ts.
import type { View, ViewNode } from '#format';
import type { BoardLayout } from '#layout';
import type { AccessHolder, BoardState, FreshCount, RetiredCount } from '#actions';
import type { CardReply, MarkdownOptions, VbRegionElement } from '#ui';
import { regionFresh, regionState, retiredMarker } from '#ui';
import { LATER_REGION } from '#format';
import { work } from '../work.ts';
import * as boardWords from '../words/board.ts';

/** The built-in Later's frame (3_FE_03 ruling 5): its layout is the grid, set by the board, and
 * while it is empty it shows only while a card is dragged, as a drop target. */
export const LATER_FRAME = { fixed: true, empty: boardWords.dropACardHereTo } as const;

export interface RegionSet {
  readonly els: Map<string, VbRegionElement>;
  /** One `<vb-region>` per region of `view`, in view order; a changed region is rendered again. */
  sync(view: View): void;
  /** Place and update each frame; true when any frame moved or changed size. `holders` (the
   * agentAccess flag): region id -> the agents that hold it. `owed`: the containers the agent
   * still owes an answer on (`regionState`'s, 3_FE_04 step 4G). `replies`: the agent's replies to show
   * under container notes (the cardReplies flag, FE_03). `retired`: each container's "N cards retired"
   * marker (the retiredMarker flag, packages/actions retired.ts). `fresh`: each fresh container's pill counts (the
   * freshCards flag, `container.fresh`): its teal border and "3 new · 1 updated". */
  place(
    layout: BoardLayout, view: View, s: BoardState, holders?: Readonly<Record<string, AccessHolder[]>>, owed?: ReadonlySet<string>,
    replies?: readonly CardReply[], retired?: ReadonlyMap<string, RetiredCount>, fresh?: ReadonlyMap<string, FreshCount>,
  ): boolean;
  clear(): void;
}

/** `widths`: every ordinary frame has the Match card widths switch (widthsControl flag); `remove`:
 * Remove container in its settings (personRemove flag, N24); `rail`: every frame, Later too, has its
 * tools in a rail on its left edge (toolRail flag); `idPrefix`: the mount's, before every id a frame sets. */
export function createRegionSet(host: HTMLElement, opts: { widths?: boolean; remove?: boolean; rail?: boolean; railHover?: boolean; layoutTooltip?: boolean; idPrefix?: string; markdown?: MarkdownOptions } = {}): RegionSet {
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
          const rail = opts.rail === true;
          const railHover = opts.railHover === true;
          const layoutTooltip = opts.layoutTooltip;
          const { idPrefix, markdown } = opts;
          el.render(r, r.id === LATER_REGION ? { ...LATER_FRAME, rail, railHover, layoutTooltip, idPrefix, markdown } : { widths: opts.widths === true, remove: opts.remove === true, rail, railHover, layoutTooltip, idPrefix, markdown });
          drawn.set(r.id, key);
          shown.delete(r.id);
        }
        const want: Element | null = prev ? prev.nextElementSibling : host.firstElementChild;
        if (want !== el) host.insertBefore(el, want);
        prev = el;
      }
    },
    place(layout, view, s, holders, owed, replies, retired, fresh) {
      const placed = new Set(layout.nodes.keys());
      let moved = false;
      for (const r of layout.regions) {
        const el = els.get(r.id);
        if (!el) continue;
        const box = JSON.stringify(r.box);
        const gone = retired?.get(r.id);
        const count = fresh?.get(r.id);
        const pill = count && regionFresh(count.added, count.updated);
        const st = {
          ...regionState(r, view, s, placed, holders?.[r.id], owed, replies), ...(gone && { retired: retiredMarker(gone.count, gone.version, gone.until) }), ...(pill && { fresh: pill }),
        };
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
