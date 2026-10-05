// The cards on the stage, kept in step with the held state one card at a time (N12_FE_01 rulings 1
// and 4, performance.md approaches 1 and 3). A card is created once; it is rendered again only when
// the agent drew a new version of it, updated only when what it shows changed (`nodeState`), and
// measured only then. Reads of sizes come after every write of the batch, and places are written
// after both. DOM order stays reading order, which is also tab order. A change of the selection
// (3_FE_01 ruling 10) goes through `restate`: it updates only the cards named, measures nothing and
// places nothing, since the selected look changes no card's size.
import type { BoardState } from '../../../../packages/actions/src/index.ts';
import type { NodeSize, View, ViewNode } from '../../../../packages/format/src/index.ts';
import type { BoardLayout, Size } from '../../../../packages/layout/src/index.ts';
import type { NodeTemplateOptions, VbNodeElement } from '../../../../packages/ui/src/index.ts';
import { nodeState } from '../../../../packages/ui/src/index.ts';
import { readingOrder } from './render.ts';
import { work } from './work.ts';

export interface CardSync {
  /** Cards to measure: created, rendered again or updated. */
  dirty: string[];
  /** Whether any card element was created (the page then skips transitions for one draw). */
  created: boolean;
}

export interface CardSet {
  readonly els: Map<string, VbNodeElement>;
  /** Bring every card in line with `view`; `versions` (node id -> `ver`) says which the agent redrew,
   *  `selected` which the person has selected. */
  sync(view: View, state: BoardState, versions: Readonly<Record<string, number>>, selected: (id: string) => boolean,
    tier?: (n: ViewNode) => NodeSize): CardSync;
  /** Update the cards `ids` for a state the last sync did not see (the selection), and nothing else. */
  restate(ids: readonly string[]): void;
  /** Read the sizes of `ids` into `sizes`. */
  measure(ids: readonly string[], sizes: Map<string, Size>): void;
  /** Write each card's place; true when any card moved or was shown or hidden. */
  place(layout: BoardLayout): boolean;
  /** Remove every card (another board, or a rebuild). */
  clear(): void;
}

interface Kept { ver: number | undefined; state: string }
interface Last { view: View; state: BoardState; selected: (id: string) => boolean; tier?: (n: ViewNode) => NodeSize }
/** The place last written to a card, and how the browser read the transform back: a drag writes
 * the transform itself, so a card is placed again when its transform no longer reads back. */
interface Placed { want: string; read: string; hidden: boolean }

export function createCardSet(host: HTMLElement, opts: NodeTemplateOptions): CardSet {
  const els = new Map<string, VbNodeElement>();
  const kept = new Map<string, Kept>();
  const placed = new Map<string, Placed>();
  let last: Last | null = null;
  let byId: Map<string, ViewNode> | null = null;

  /** Update card `n` when what it shows changed (always after a render); true when it did. */
  function apply(n: ViewNode, el: VbNodeElement, l: Last, rendered: boolean): boolean {
    const st = nodeState(n, l.state, l.tier?.(n), l.selected(n.id));
    const key = JSON.stringify(st);
    const was = kept.get(n.id);
    if (!rendered && was?.state === key) return false;
    el.update(st);
    kept.set(n.id, { ver: was?.ver, state: key });
    work.cardsUpdated += 1;
    return true;
  }

  /** Move only the cards that are out of reading order. */
  function order(ids: string[]) {
    let prev: Element | null = null;
    for (const id of ids) {
      const el = els.get(id)!;
      const want: Element | null = prev ? prev.nextElementSibling : host.firstElementChild;
      if (want !== el) host.insertBefore(el, want);
      prev = el;
    }
  }

  return {
    els,
    sync(view, state, versions, selected, tier) {
      const l: Last = { view, state, selected, ...(tier && { tier }) };
      last = l;
      byId = null;
      const dirty: string[] = [];
      let created = false;
      const ids = readingOrder(view).map((n) => n.id);
      const live = new Set(ids);
      for (const [id, el] of els) {
        if (live.has(id)) continue;
        el.remove();
        els.delete(id);
        kept.delete(id);
        placed.delete(id);
      }
      for (const n of view.nodes) {
        let el = els.get(n.id);
        const ver = versions[n.id];
        const redraw = !el || kept.get(n.id)?.ver !== ver;
        if (!el) {
          el = document.createElement('vb-node') as VbNodeElement;
          els.set(n.id, el);
          created = true;
        }
        if (redraw) {
          el.render(n, opts);
          kept.set(n.id, { ver, state: '' });
        }
        if (apply(n, el, l, redraw)) dirty.push(n.id);
      }
      order(ids);
      return { dirty, created };
    },
    restate(ids) {
      if (!last) return;
      byId ??= new Map(last.view.nodes.map((n) => [n.id, n]));
      for (const id of ids) {
        const n = byId.get(id);
        const el = els.get(id);
        if (n && el) apply(n, el, last, false);
      }
    },
    measure(ids, sizes) {
      // Writes first: a hidden or off-screen card has no real size until it is drawn.
      for (const id of ids) {
        const el = els.get(id);
        if (!el) continue;
        el.hidden = false;
        el.removeAttribute('data-offscreen');
      }
      for (const id of ids) {
        const el = els.get(id);
        if (!el) continue;
        sizes.set(id, { w: el.offsetWidth, h: el.offsetHeight });
        work.cardsMeasured += 1;
      }
    },
    place(layout) {
      let moved = false;
      for (const [id, el] of els) {
        const b = layout.nodes.get(id);
        const was = placed.get(id);
        const want = b ? `translate(${b.x}px, ${b.y}px)` : was?.want ?? '';
        if (was && was.want === want && was.read === el.style.transform && was.hidden === el.hidden && el.hidden === !b) continue;
        el.hidden = !b;
        if (want) el.style.transform = want;
        placed.set(id, { want, read: el.style.transform, hidden: el.hidden });
        work.cardsPlaced += 1;
        moved = true;
      }
      return moved;
    },
    clear() {
      host.replaceChildren();
      els.clear();
      kept.clear();
      placed.clear();
    },
  };
}
