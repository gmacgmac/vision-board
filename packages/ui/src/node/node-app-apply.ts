// Node pattern, app cards in the element (D-047): what `VbNode.update` applies in place on an app
// card, apart from the element so it stays one job (card-polish FE_04). Browser only. The panel's
// size on the card, the slot's state and its state view, the footer's app status (card-polish
// FE_01) and the footer's name with its hover tip (card-polish FE_04, the appTitle flag).
import type { AppSize } from '../../../format/src/index.ts';
import type { AppCardView } from './node-app.ts';
import type { HoverTip } from '../tip/hover-tip.ts';
import type { VbAppFrameElement } from '../app-frame/vb-app-frame.ts';
import { appStateMarkup } from './node-template.ts';
import { bindHoverTip } from '../tip/hover-tip.ts';

/** The panel's size as --app-w and --app-h on the card (CSSOM: the CSP refuses style attributes);
 * none on other kinds. */
export function applyPanelSize(card: HTMLElement, size: AppSize | undefined): void {
  if (size) {
    card.style.setProperty('--app-w', `${size.w}px`);
    card.style.setProperty('--app-h', `${size.h}px`);
  } else {
    card.style.removeProperty('--app-w');
    card.style.removeProperty('--app-h');
  }
}

/** An app card: the panel's size on the card (its width) and the frame, the state view (rebuilt only
 * when `v` differs from `last`, the view last drawn), the footer's app status and the footer's name.
 * A state with no panel unloads the frame. A change that takes the focused control away (or
 * rebuilds the view) leaves focus on the card. Gives the view drawn, for the next call's `last`. */
export function applyApp(card: HTMLElement, v: AppCardView, last: string | undefined): string {
  const slot = card.querySelector<HTMLElement>('.vb-app')!;
  const had = document.activeElement;
  const status = card.querySelector<HTMLElement>('.vb-app-status');
  const inApp = slot.contains(had) || (status?.contains(had) ?? false);
  applyPanelSize(card, v.size);
  slot.dataset.appState = v.state;
  if (v.state === 'checking') slot.setAttribute('aria-busy', 'true');
  else slot.removeAttribute('aria-busy');
  const frame = slot.querySelector<VbAppFrameElement>('vb-app-frame');
  if (frame) {
    Object.assign(frame.dataset, { label: v.name, w: String(v.size.w), h: String(v.size.h) });
    if (!v.frame) frame.unload?.();
  }
  const src = JSON.stringify(v);
  // Markup from appStateMarkup, which escapes every text run.
  if (last !== src) slot.querySelector<HTMLElement>('.vb-app-state')!.innerHTML = appStateMarkup(v);
  if (status) applyAppStatus(status, v);
  for (const el of card.querySelectorAll('.vb-app-name-text, .vb-app-name-tip')) el.textContent = v.name;
  if (inApp && !had!.checkVisibility({ visibilityProperty: true })) card.focus({ preventScroll: true });
  return src;
}

/** The footer's app status: one control shows (or none), each named with the app; Allow's reason is
 * its tip. "Allowed ▾" hidden closes its menu. */
function applyAppStatus(status: HTMLElement, v: AppCardView): void {
  const allow = status.querySelector<HTMLButtonElement>('[data-app-act="app-allow"]')!;
  const allowed = status.querySelector<HTMLButtonElement>('[data-app-menu]')!;
  const menu = status.querySelector<HTMLElement>('[role="menu"]')!;
  allow.hidden = v.control !== 'allow';
  allow.title = v.reason ?? '';
  allow.setAttribute('aria-label', v.names.allow);
  allowed.hidden = v.control !== 'allowed';
  allowed.setAttribute('aria-label', v.names.allowed);
  menu.setAttribute('aria-label', v.name);
  menu.querySelector('[role="menuitem"]')!.setAttribute('aria-label', v.names.stop);
  if (allowed.hidden) {
    menu.hidden = true;
    allowed.setAttribute('aria-expanded', 'false');
  }
}

/** The footer name's tip (card-polish FE_04; the shared hover tip, WCAG 1.4.13): the whole name over
 * the footer while the name is cut, on hover of the name or while keyboard focus is in the footer
 * (a press on a footer button opens nothing), and not while the app's menu is open over the panel;
 * Esc closes it. Bound once per card. */
export function bindAppNameTip(card: HTMLElement): HoverTip {
  const text = () => card.querySelector<HTMLElement>('.vb-app-name-text');
  const cut = () => { const t = text(); return t !== null && t.scrollWidth > t.clientWidth; };
  return bindHoverTip(card, {
    anchor: '.vb-app-name', tip: '.vb-app-name-tip', group: '.vb-node-foot', attr: 'data-name-tip-open',
    needed: () => cut() && card.querySelector('.vb-app-menu:not([hidden])') === null
      && card.querySelector('.vb-app-name:hover, .vb-node-foot :focus-visible') !== null,
  });
}
