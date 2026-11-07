// Node pattern, app cards in the element (D-047): what `VbNode.update` applies in place on an app
// card, apart from the element so it stays one job (card-polish FE_04). Browser only. The panel's
// size on the card, the slot's state and its state view, the footer's app status (card-polish
// FE_01) and the footer's name with its hover tip (card-polish FE_04, the appTitle flag); and from
// `VbNode.render`, a new version's markup that keeps a loaded panel where it is (app-state-kept FE_01).
import type { AppSize } from '#format';
import type { AppCardView } from './node-app.ts';
import type { HoverTip } from '../tip/hover-tip.ts';
import type { VbAppFrameElement } from '../app-frame/vb-app-frame.ts';
import { appStateMarkup } from './node-template.ts';
import { bindHoverTip } from '../tip/hover-tip.ts';

/** The panel's size as --vb-app-w and --vb-app-h on the card (CSSOM: the CSP refuses style attributes);
 * none on other kinds. */
export function applyPanelSize(card: HTMLElement, size: AppSize | undefined): void {
  if (size) {
    card.style.setProperty('--vb-app-w', `${size.w}px`);
    card.style.setProperty('--vb-app-h', `${size.h}px`);
  } else {
    card.style.removeProperty('--vb-app-w');
    card.style.removeProperty('--vb-app-h');
  }
}

/** The elements from `root` (not included) down to `el`, outermost first. */
function pathTo(root: Node, el: Element): Element[] {
  const path: Element[] = [];
  for (let at: Element | null = el; at && at !== root; at = at.parentElement) path.unshift(at);
  return path;
}

/** The card's markup `html` in place of what `card` held (`vb-node.ts` `render`), keeping a loaded
 * panel loaded (D-050; app-state-kept FE_01): a frame taken out of the page reloads its
 * document, so the frame and each element it sits in stay where they are, each taking the new
 * markup's attributes, with the new markup's other children round it. The frame keeps its own
 * children and takes the new app, name and size (`data-app` another app starts it again). With no
 * loaded frame, or no frame at the same place in the new markup, it is a plain replace. */
export function renderKeepingPanel(card: HTMLElement, html: string): void {
  const old = card.querySelector<VbAppFrameElement>('vb-app-frame');
  if (!old?.loaded) {
    card.innerHTML = html;
    return;
  }
  const t = document.createElement('template');
  t.innerHTML = html;
  const fresh = t.content.querySelector('vb-app-frame');
  const keep = pathTo(card, old);
  const want = fresh ? pathTo(t.content, fresh) : [];
  if (keep.length !== want.length || keep.some((el, i) => el.tagName !== want[i]!.tagName)) {
    card.replaceChildren(t.content);
    return;
  }
  let host: Node = card;
  let from: Node = t.content;
  for (const [i, el] of keep.entries()) {
    const next = want[i]!;
    const kids = [...from.childNodes];
    const at = kids.indexOf(next);
    for (const c of [...host.childNodes]) if (c !== el) c.remove();
    el.before(...kids.slice(0, at));
    el.after(...kids.slice(at + 1));
    const names = el === old ? ['data-app', 'data-label', 'data-w', 'data-h'] : null;
    if (!names) for (const a of [...el.attributes]) if (!next.hasAttribute(a.name)) el.removeAttribute(a.name);
    for (const a of next.attributes) if (!names || names.includes(a.name)) el.setAttribute(a.name, a.value);
    host = el;
    from = next;
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
