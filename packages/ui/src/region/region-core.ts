// Region pattern, layer 1 (core): what a region's frame shows for the person's current state.
// No DOM, so every rule here is unit-tested under plain Node; the element only applies the
// result. Geometry (position, size) is the page's job and is not here.
import type { Mode, Region, View } from '../../../format/src/index.ts';
import type { BoardState } from '../../../actions/src/index.ts';
import { DECIDED, statusOf } from '../../../actions/src/index.ts';
import { isItem } from '../node/node-core.ts';

/** Each layout's name: the mode row's icon labels and the popover's tile names. Typed on `Mode`,
 * so a new mode fails to compile here. */
export const MODE_LABEL: Record<Mode, string> = {
  grid: 'Grid', flow: 'Flow', lanes: 'Lanes', radial: 'Radial', list: 'List',
};

/**
 * What each layout is for, in one line (README pick 2, mockup 05 section 3): the popover's tiles
 * show it. The one place this text lives, so the agent skill can read the same words (tracker U4).
 */
export const MODE_HINT: Record<Mode, string> = {
  grid: 'A numbered set to work through in order',
  flow: 'Connected steps and where they branch',
  lanes: 'Several flows side by side, one per lane',
  radial: 'One subject, everything related around it',
  list: 'Dense reading, one row each',
};

/** The popover's foot: the layout the agent drew the container in (the view's mode, not the
 * person's pick). */
export const agentChoiceText = (mode: Mode): string => `The agent chose ${MODE_LABEL[mode]} for this container.`;

/** Under a disabled "Reset places" in the settings menu: why there is nothing to reset. */
export const RESET_NONE_HINT = 'No cards moved';

/**
 * The colour a region's frame is drawn in, as a CSS value: the element sets it as `--region` and
 * `region.css` mixes the frame line, the title and the count from it. Every region takes the
 * neutral default for now; a region colour later is this one function (and one property).
 */
export const REGION_COLOUR_DEFAULT = 'var(--vb-line-strong)';
export function regionColour(_r: Pick<Region, 'id'>): string {
  return REGION_COLOUR_DEFAULT;
}

/** One agent that holds the region (D-027), as its top line shows it. `removable` is false for
 * the agent that created the region, which the person cannot remove (api.md 23). */
export interface RegionHolder { agent: string; label: string; removable: boolean }

/** Everything a region's frame shows for the current state; `update()` applies it. */
export interface RegionState {
  /** The layout mode in force (the engine's choice, after the person's pick). */
  mode: Mode;
  /** "<decided> of <items> decided"; empty when the region has no items. */
  countText: string;
  /** Whether "Reset places" in the settings menu is enabled: at least one node of the region is
   * pinned. Otherwise it shows disabled, with `RESET_NONE_HINT`. */
  canReset: boolean;
  /** Whether the "Everything here is decided." message shows: the layout drew none of its nodes. */
  showEmpty: boolean;
  /** The agents that hold the region, after the count; left out when none is given (the
   * agentAccess flag off, or a region nobody holds). */
  holders?: RegionHolder[];
}

/** The holders as the frame shows them: every one by label, creator first, and only the others
 * with a Remove access control. `creator` is true for the agent that made the region. */
export function regionHolders(list: readonly { agent: string; label: string; creator?: boolean }[]): RegionHolder[] {
  return [...list]
    .sort((a, b) => Number(b.creator ?? false) - Number(a.creator ?? false))
    .map((h) => ({ agent: h.agent, label: h.label, removable: !h.creator }));
}

/**
 * `placed` is the set of node ids the layout drew (hidden nodes are absent), so the core never
 * imports `layout`. `r` is the region as the layout resolved it: its id and its mode. `holders`
 * (agentAccess flag) are the region's holders from `get_board`.
 */
export function regionState(
  r: Pick<Region, 'id' | 'mode'>, view: View, s: BoardState, placed: ReadonlySet<string>,
  holders?: readonly { agent: string; label: string; creator?: boolean }[],
): RegionState {
  const nodes = view.nodes.filter((n) => n.region === r.id);
  const items = nodes.filter(isItem);
  const decided = items.filter((n) => DECIDED.has(statusOf(s, n.id))).length;
  return {
    mode: r.mode,
    countText: items.length ? `${decided} of ${items.length} decided` : '',
    canReset: nodes.some((n) => s.pins.has(n.id)),
    showEmpty: !nodes.some((n) => placed.has(n.id)),
    ...(holders !== undefined && holders.length > 0 && { holders: regionHolders(holders) }),
  };
}
