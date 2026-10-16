// Region pattern, the title's full-text tip (found-in-use FE_03 ruling 3, WCAG 1.4.13): the title
// takes one line, then ends in "…" (review polish ruling 9); when it is cut, its full text shows in
// a small tip below the label on hover of the title and on keyboard focus anywhere in the label
// group (the grip is focusable). The open rules are the shared hover tip (tip/hover-tip.ts);
// region.css draws it while `data-title-tip-open` is on the frame. Behind the `titleTip` flag: the
// page marks its world with `data-title-tip` when the flag is on. The <h2> keeps the full text for
// screen readers.
import type { HoverTip } from '../tip/hover-tip.ts';
import { bindHoverTip } from '../tip/hover-tip.ts';

export function bindTitleTip(host: HTMLElement): HoverTip {
  const cut = () => {
    const h = host.querySelector<HTMLElement>('.vb-region-head h2');
    return !!h && h.scrollWidth > h.clientWidth;
  };
  return bindHoverTip(host, {
    anchor: '.vb-region-head h2', group: '.vb-region-label', tip: '.vb-title-tip', attr: 'data-title-tip-open',
    needed: () => host.closest('[data-title-tip]') !== null && cut(),
  });
}
