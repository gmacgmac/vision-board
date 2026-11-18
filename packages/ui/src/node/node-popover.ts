// Node pattern, the events of a box beside a node (proposals FE_01, card-polish FE_03): the history box and the
// proposal box its marks open (the page's cards/mark-boxes.ts) say when they show, open and hide, so the page fills
// a box it builds only when it shows (the history, history-flow.ts) and brings an opened one into view. No DOM here:
// names and the one detail type.

/** Fired on the node, bubbling, when a click or Enter opened its box; `detail` is the box, so the page can bring it
 *  into view. */
export const POPOVER_OPEN = 'vb-popover-open';

/** Fired on the node, bubbling, as its box shows, before it draws: `detail` names the box and holds it, so the page can
 *  fill a box it builds only when it shows. */
export const POPOVER_SHOW = 'vb-popover-show';
export interface PopoverShowDetail { name: string; box: HTMLElement }

/** Fired on the node, bubbling, as its box hides, however it closed; `detail` is its name. */
export const POPOVER_HIDE = 'vb-popover-hide';

/** Dispatched on a node by the page, `detail` a box's name, to close that box now (a history row that took the person
 *  to a note on the node). */
export const POPOVER_CLOSE = 'vb-popover-close';
