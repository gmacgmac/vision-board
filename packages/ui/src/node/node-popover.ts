// Node pattern, the card popover (proposals FE_01 ruling 1): a box beside the card, in the note
// preview's shape and place (node.css `.vb-note-tip`), opened from a tab on the card's bottom edge
// (node-template.ts `bottomTabs`). Hover or keyboard focus on the tab previews it; a click or Enter
// opens it and moves focus into it, so its buttons can be reached; Esc or a press outside closes it,
// and focus that was in it goes back to the tab. WCAG 1.4.13: hoverable, persistent, dismissible.
// The open rules are the shared hover tip's (`bindHoverTip` with `opens`). It knows no one use's
// words: a proposal (FE_01) and the handover (FE_03) each open one. Browser only.
import type { HoverTip } from '../tip/hover-tip.ts';
import { bindHoverTip } from '../tip/hover-tip.ts';

/** Fired on the card, bubbling, when a click or Enter opened its popover; `detail` is the box, so
 *  the page can bring it into view. */
export const POPOVER_OPEN = 'vb-popover-open';

/** Bind card `card`'s popover `name`: its tab `[data-tab=name]` and box `[data-pop=name]`. While it
 *  shows, the box carries `data-open` and the tab `aria-expanded="true"`. */
export function bindCardPopover(card: HTMLElement, name: string): HoverTip {
  const tabSel = `.vb-node-btab[data-tab="${name}"]`;
  const boxSel = `.vb-card-pop[data-pop="${name}"]`;
  // Found afresh each time: the card's markup is built again for each new version.
  const tab = () => card.querySelector<HTMLButtonElement>(tabSel);
  const box = () => card.querySelector<HTMLElement>(boxSel);
  const tip = bindHoverTip(card, {
    anchor: tabSel, tip: boxSel, attr: `data-pop-${name}`, opens: true,
    needed: () => tab()?.hidden === false,
    onToggle(on) {
      tab()?.setAttribute('aria-expanded', String(on));
      box()?.toggleAttribute('data-open', on);
      if (!on && box()?.contains(document.activeElement)) tab()?.focus({ preventScroll: true });
    },
  });
  // After the hover tip's own click: once it opened, focus moves in, to the first button that acts.
  card.addEventListener('click', (e) => {
    const b = box();
    if (!(e.target instanceof Node) || !tab()?.contains(e.target) || !b?.hasAttribute('data-open')) return;
    (b.querySelector<HTMLElement>('button:not([aria-disabled="true"])') ?? b).focus({ preventScroll: true });
    card.dispatchEvent(new CustomEvent<HTMLElement>(POPOVER_OPEN, { bubbles: true, detail: b }));
  });
  return tip;
}
