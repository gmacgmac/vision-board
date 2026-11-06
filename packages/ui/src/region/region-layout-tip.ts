// Region pattern, the layout icons' tooltips (layoutTooltip flag, host-styling FE_02): hovering or
// focusing a layout icon shows its name over what it does in a small tip beside it, instead of the
// layout popover. Each icon is its own hover tip (tip/hover-tip.ts: hoverable, persistent, Esc
// dismisses); the tip sits inside the icon, so the pointer crossing onto it is still on the icon.
// The hint is the icon's accessible description (`aria-describedby`, set by the template and never
// taken off), so a screen reader hears it whether or not the tip shows. region.css draws the tip
// while `data-tip-open` is on the icon. Browser only.
import type { Mode } from '#format';
import { bindHoverTip } from '../tip/hover-tip.ts';
import type { HoverTip } from '../tip/hover-tip.ts';

export interface LayoutTips {
  /** Close every open tip now (the frame was rebuilt). */
  close(): void;
  /** Show one layout's tip as if its icon were hovered; the gallery's open sample. */
  show(mode: Mode): void;
}

export function bindLayoutTips(host: HTMLElement): LayoutTips {
  const icons = [...host.querySelectorAll<HTMLElement>('.vb-mseg[role="radio"]')];
  const tips: HoverTip[] = icons.map((b) => bindHoverTip(b, { anchor: ':host', tip: '.vb-mode-tip', attr: 'data-tip-open' }));
  return {
    close: () => tips.forEach((t) => t.close()),
    show: (mode) => icons.find((b) => b.dataset.mode === mode)?.setAttribute('data-tip-open', ''),
  };
}
