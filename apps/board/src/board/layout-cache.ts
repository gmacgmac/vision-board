// Layout per container, kept between draws (N12_FE_01 ruling 3, performance.md approach 2). Each
// container's result from `layoutRegion` is kept with a key of everything it read: the region, its
// mode, its visible nodes (id, kind, lane, measured size, pin) in view order, the links inside
// it, and its head inset (the shown note block's height, 3_FE_04 step 4G ruling 3). A draw lays
// out again only the containers whose key changed, then packs every container and routes the
// links (cheap). The layout functions stay pure; only this cache lives in the page.
// Same input, same picture: a test drives random changes and holds the result equal to
// `layoutBoard` after each one.
import type { Link, Mode, View, ViewNode } from '../../../../packages/format/src/index.ts';
import type { BoardLayout, Point, RegionPiece, Size } from '../../../../packages/layout/src/index.ts';
import { layoutRegion, packRegions } from '../../../../packages/layout/src/index.ts';

export interface LayoutInputs {
  pins: Map<string, Point>;
  modes: Map<string, Mode>;
  hidden: Set<string>;
  /** Region id -> where the person put that container (3_FE_04). Packing reads it, no container's
   * own layout does, so it is in no container's key: a container pin repacks only (N12). */
  regionPins?: Map<string, Point>;
  /** Region id -> the shown note block's height (3_FE_04 step 4G): that container's own input, so
   * it is in that container's key alone; showing one note lays out that one container. */
  headInsets?: Map<string, number>;
}

export interface LayoutRun {
  layout: BoardLayout;
  /** The containers whose layout ran this time, in view order. */
  laidOut: string[];
}

export interface LayoutCache {
  run(view: View, sizes: Map<string, Size>, inputs: LayoutInputs): LayoutRun;
  /** Forget every kept container (another board, or a rebuild). */
  clear(): void;
}

/** What a layout mode reads of a node: its id, kind and lane (packages/layout/src/modes). A test
 * changes every other field and checks the mode's answer does not move. */
const nodeKey = (n: ViewNode, s: Size | undefined, pin: Point | undefined) =>
  [n.id, n.kind, n.lane ?? null, s?.w ?? null, s?.h ?? null, pin?.x ?? null, pin?.y ?? null];

export function createLayoutCache(): LayoutCache {
  let kept = new Map<string, { key: string; piece: RegionPiece }>();
  return {
    run(view, sizes, { pins, modes, hidden, regionPins, headInsets }) {
      const nodes = new Map<string, ViewNode[]>();
      const regionOf = new Map<string, string>();
      for (const n of view.nodes) {
        if (hidden.has(n.id)) continue;
        (nodes.get(n.region) ?? nodes.set(n.region, []).get(n.region)!).push(n);
        regionOf.set(n.id, n.region);
      }
      // The links between two visible nodes of one region, in view order (as layoutBoard).
      const links = new Map<string, Link[]>();
      for (const l of view.links) {
        const r = regionOf.get(l.from);
        if (r === undefined || regionOf.get(l.to) !== r) continue;
        (links.get(r) ?? links.set(r, []).get(r)!).push(l);
      }
      const next = new Map<string, { key: string; piece: RegionPiece }>();
      const laidOut: string[] = [];
      const pieces = view.regions.map((region) => {
        const own = nodes.get(region.id) ?? [];
        const inner = links.get(region.id) ?? [];
        const mode = modes.get(region.id);
        // 0, negative or absent are all no inset (LayoutOptions.headInsets): one key for them.
        const inset = Math.max(0, headInsets?.get(region.id) ?? 0);
        const key = JSON.stringify([
          region, mode ?? null, inset, own.map((n) => nodeKey(n, sizes.get(n.id), pins.get(n.id))), inner.map((l) => [l.from, l.to]),
        ]);
        const old = kept.get(region.id);
        let piece = old?.key === key ? old.piece : undefined;
        if (!piece) {
          piece = layoutRegion(region, own, inner, sizes, { mode, pins, headInset: inset });
          laidOut.push(region.id);
        }
        next.set(region.id, { key, piece });
        return piece;
      });
      kept = next;
      return { layout: packRegions(pieces, view.links, { pins: regionPins }), laidOut };
    },
    clear() { kept = new Map(); },
  };
}
