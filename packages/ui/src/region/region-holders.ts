// Region pattern, the holders chip's list (PLAN decision 7, WCAG 1.4.13): hovering or focusing the chip shows who holds the
// container, with Remove on each removable holder; Enter, Space or a click keeps it open so those buttons can be reached,
// Esc closes it and focus goes back to the chip. The open rules are the shared hover tip with `opens` (tip/hover-tip.ts, as
// the card popover); region.css/region-holders.css draw it while `data-holders-open` is on the frame. Browser only.
import type { HoverTip } from '../tip/hover-tip.ts';
import { bindHoverTip } from '../tip/hover-tip.ts';
import { returnFocus } from '../base/focus-return.ts';

const CHIP = '.vb-holders-chip';
const POP = '.vb-holders-pop';

export function bindHoldersTip(host: HTMLElement): HoverTip {
  const q = (s: string) => host.querySelector<HTMLElement>(s);
  return bindHoverTip(host, {
    anchor: CHIP, tip: POP, group: '.vb-region-holders', attr: 'data-holders-open', opens: true,
    needed: () => q(CHIP) !== null,
    // Called before the list hides: focus inside it (a Remove button) goes back to the chip, which keeps it from the page's top.
    onToggle: (on) => {
      q(CHIP)?.setAttribute('aria-expanded', String(on));
      if (!on && q(POP)?.contains(document.activeElement)) returnFocus(q(CHIP));
    },
  });
}
