// Region pattern, layer 1 (core): what a region's frame shows for the person's current state.
// No DOM, so every rule here is unit-tested under plain Node; the element only applies the
// result. Geometry (position, size) is the page's job and is not here.
import type { Mode, Region, View } from '../../../format/src/index.ts';
import type { BoardState } from '../../../actions/src/index.ts';
import { DECIDED, statusOf } from '../../../actions/src/index.ts';
import { isItem } from '../node/node-core.ts';

/** The text on each layout-mode button. Typed on `Mode`, so a new mode fails to compile here. */
export const MODE_LABEL: Record<Mode, string> = {
  grid: 'Grid', flow: 'Flow', lanes: 'Lanes', radial: 'Radial', list: 'List',
};

/**
 * The colour a region's frame is drawn in, as a CSS value: the element sets it as `--region` and
 * `region.css` mixes the frame line, the title and the count from it. Every region takes the
 * neutral default for now; a region colour later is this one function (and one property).
 */
export const REGION_COLOUR_DEFAULT = 'var(--vb-line-strong)';
export function regionColour(_r: Pick<Region, 'id'>): string {
  return REGION_COLOUR_DEFAULT;
}

/** Everything a region's frame shows for the current state; `update()` applies it. */
export interface RegionState {
  /** The layout mode in force (the engine's choice, after the person's pick). */
  mode: Mode;
  /** "<decided>/<items> decided"; empty when the region has no items. */
  countText: string;
  /** Whether "Reset places" shows: at least one node of the region is pinned. */
  showReset: boolean;
  /** Whether the "Everything here is decided." message shows: the layout drew none of its nodes. */
  showEmpty: boolean;
}

/**
 * `placed` is the set of node ids the layout drew (hidden nodes are absent), so the core never
 * imports `layout`. `r` is the region as the layout resolved it: its id and its mode.
 */
export function regionState(
  r: Pick<Region, 'id' | 'mode'>, view: View, s: BoardState, placed: ReadonlySet<string>,
): RegionState {
  const nodes = view.nodes.filter((n) => n.region === r.id);
  const items = nodes.filter(isItem);
  const decided = items.filter((n) => DECIDED.has(statusOf(s, n.id))).length;
  return {
    mode: r.mode,
    countText: items.length ? `${decided}/${items.length} decided` : '',
    showReset: nodes.some((n) => s.pins.has(n.id)),
    showEmpty: !nodes.some((n) => placed.has(n.id)),
  };
}
