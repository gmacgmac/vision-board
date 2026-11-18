// Node pattern, app cards in the element (D-047): what `VbNode.update` applies in place on an app
// card, apart from the element so it stays one job (card-polish FE_04). Browser only. The panel's
// size on the card, the slot's state and its state view, the window bar's app status (card-polish
// FE_01), its name with its hover tip (card-polish FE_04) and its drawer (FE_08); and from
// `VbNode.render`, a new version's markup that keeps a loaded panel where it is (app-state-kept FE_01).
import type { AppSize } from '#format';
import type { AppCardView } from './node-app.ts';
import type { NodeMarks } from './node-marks.ts';
import type { HoverTip } from '../tip/hover-tip.ts';
import type { VbAppFrameElement } from '../app-frame/vb-app-frame.ts';
import { appStateMarkup } from './node-template.ts';
import { bindHoverTip } from '../tip/hover-tip.ts';
import * as nodeAppWords from '../words/node-app.ts';

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
 * when `v` differs from `last`, the view last drawn), the bar's app status and the app's name.
 * A state with no panel unloads the frame. A change that takes the focused control away (or
 * rebuilds the view) leaves focus on the card. Gives the view drawn, for the next call's `last`. */
export function applyApp(card: HTMLElement, v: AppCardView, last: string | undefined): string {
  const slot = card.querySelector<HTMLElement>('.vb-app')!;
  const had = document.activeElement;
  const status = card.querySelector<HTMLElement>('.vb-app-status')!;
  const inApp = slot.contains(had) || status.contains(had);
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
  applyAppStatus(status, v);
  for (const el of card.querySelectorAll('.vb-app-name-text, .vb-app-name-tip')) el.textContent = v.name;
  if (inApp && !had!.checkVisibility({ visibilityProperty: true })) card.focus({ preventScroll: true });
  return src;
}

/** The bar's app status: one control shows (or none), each named with the app; Allow's reason is
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

/** The app name's tip (card-polish FE_04; the shared hover tip, WCAG 1.4.13): the whole name under
 * the window's bar while the name is cut, on hover of the name or while keyboard focus is in the bar
 * (a press on a bar button opens nothing), and not while the app's menu is open over the panel;
 * Esc closes it. Bound once per card. */
export function bindAppNameTip(card: HTMLElement): HoverTip {
  const text = () => card.querySelector<HTMLElement>('.vb-app-name-text');
  const cut = () => { const t = text(); return t !== null && t.scrollWidth > t.clientWidth; };
  return bindHoverTip(card, {
    anchor: '.vb-app-name', tip: '.vb-app-name-tip', group: '.vb-win-bar', attr: 'data-name-tip-open',
    needed: () => cut() && card.querySelector('.vb-app-menu:not([hidden])') === null
      && card.querySelector('.vb-app-name:hover, .vb-win-bar :focus-visible') !== null,
  });
}

/** An app window's bar and drawer (node-window.ts): why Allow shows, the drawer arrow (open or not, the
 *  notes count, filled while an agent's reply is unread, from the marks) and its pane, and Open while the panel shows.
 *  `data-drawer-open` widens the node by the drawer (node-app.css), so the page measures it open. */
export function applyWindow(card: HTMLElement, v: AppCardView, m: NodeMarks): void {
  const reason = card.querySelector<HTMLElement>('.vb-win-reason')!;
  reason.hidden = v.control !== 'allow';
  // Its words, and the same in its tip: on a narrow window it is a lock alone and the name keeps the room (FIX_01).
  const why = v.control === 'allow' ? v.reason ?? '' : '';
  reason.querySelector('.vb-win-reason-text')!.textContent = why;
  reason.dataset.tip = why;
  card.toggleAttribute('data-drawer-open', v.drawer);
  const arrow = card.querySelector<HTMLElement>('[data-drawer]')!;
  arrow.setAttribute('aria-expanded', String(v.drawer));
  arrow.setAttribute('aria-label', (v.drawer ? nodeAppWords.hideConversation : nodeAppWords.showConversation)(m.notesLabel));
  arrow.dataset.notesMark = m.notes;
  const count = arrow.querySelector('.vb-mark-text')!;
  if (count.textContent !== m.notesText) count.textContent = m.notesText;
  card.querySelector<HTMLElement>('.vb-win-drawer-pane')!.hidden = !v.drawer;
  const open = card.querySelector<HTMLElement>('.vb-win-open')!;
  open.hidden = !v.frame;
  open.setAttribute('aria-label', v.names.open);
}

/** Draw the card again (`render`) keeping what its open drawer holds (the conversation box the page docked there, the
 *  words typed in it and focus in it): taken out first and put back in the new drawer, never drawn afresh. */
export function keepingDrawer(card: HTMLElement, render: () => void): void {
  const box = card.querySelector<HTMLElement>('.vb-win-drawer-pane > *');
  const at = box?.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
  box?.remove();
  render();
  if (!box) return;
  card.querySelector('.vb-win-drawer-pane')?.append(box);
  at?.focus({ preventScroll: true });
}
