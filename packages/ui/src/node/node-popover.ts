// Node pattern, the card popover (proposals FE_01 ruling 1): a box beside the card, in the note
// preview's shape and place (node.css `.vb-note-tip`), opened from a tab on the card's bottom edge
// (node-template.ts `bottomTabs`). Hover or keyboard focus on the tab previews it; a click or Enter
// opens it and moves focus into it, so its buttons can be reached; Esc or a press outside closes it,
// and focus that was in it goes back to the tab. WCAG 1.4.13: hoverable, persistent, dismissible.
// The open rules are the shared hover tip's (`bindHoverTip` with `opens`). It knows no one use's
// words: a proposal (FE_01) and the handover (FE_03) each open one from a bottom tab, and the history
// (card-polish FE_03) from the footer's ⓘ, a box the page fills as it shows (`POPOVER_SHOW`). Browser only.
import type { HoverTip } from '../tip/hover-tip.ts';
import { bindHoverTip } from '../tip/hover-tip.ts';

/** Fired on the card, bubbling, when a click or Enter opened its popover; `detail` is the box, so
 *  the page can bring it into view. */
export const POPOVER_OPEN = 'vb-popover-open';

/** Fired on the card, bubbling, as its popover shows, by hover, focus or a click, before it draws:
 *  `detail` names the box and holds it, so the page can fill a box it builds only when it shows. */
export const POPOVER_SHOW = 'vb-popover-show';
export interface PopoverShowDetail { name: string; box: HTMLElement }

/** Dispatched on a card by the page, `detail` a popover's name, to close that box now (a history row
 *  that took the person to a note on the card). */
export const POPOVER_CLOSE = 'vb-popover-close';

/** Bind card `card`'s popover `name`: its tab (`tabSel`, a bottom tab `[data-tab=name]` unless given)
 *  and box `[data-pop=name]`. While it shows, the box carries `data-open` and the tab `aria-expanded="true"`. */
export function bindCardPopover(card: HTMLElement, name: string, tabSel = `.vb-node-btab[data-tab="${name}"]`): HoverTip {
  const boxSel = `.vb-card-pop[data-pop="${name}"]`;
  // Found afresh each time: the card's markup is built again for each new version.
  const tab = () => card.querySelector<HTMLButtonElement>(tabSel);
  const box = () => card.querySelector<HTMLElement>(boxSel);
  const tip = bindHoverTip(card, {
    anchor: tabSel, tip: boxSel, attr: `data-pop-${name}`, opens: true,
    needed: () => tab()?.hidden === false,
    onToggle(on) {
      const b = box();
      if (on && b) card.dispatchEvent(new CustomEvent<PopoverShowDetail>(POPOVER_SHOW, { bubbles: true, detail: { name, box: b } }));
      tab()?.setAttribute('aria-expanded', String(on));
      box()?.toggleAttribute('data-open', on);
      if (!on && box()?.contains(document.activeElement)) tab()?.focus({ preventScroll: true });
    },
  });
  card.addEventListener(POPOVER_CLOSE, (e) => { if ((e as CustomEvent<string>).detail === name) tip.close(); });
  // After the hover tip's own click: once it opened, focus moves in, to the first button that acts,
  // or to the box itself when it is a tab stop (one that scrolls: the handover, the history).
  card.addEventListener('click', (e) => {
    const b = box();
    if (!(e.target instanceof Node) || !tab()?.contains(e.target) || !b?.hasAttribute('data-open')) return;
    (b.tabIndex >= 0 ? b : b.querySelector<HTMLElement>('button:not([aria-disabled="true"])') ?? b).focus({ preventScroll: true });
    card.dispatchEvent(new CustomEvent<HTMLElement>(POPOVER_OPEN, { bubbles: true, detail: b }));
  });
  return tip;
}
