// App cards on the board (D-047 rulings 7, 10, 13-15; app-cards FE_02). The node pattern draws an
// app card's states and the app-frame pattern its panel (packages/ui); this wires them to the page:
// - what each app card shows, from the one copy of list_apps' answer (app-state.ts), or the past
//   version's placeholder at the size the app gives (`card`, the card's conditions);
// - that copy read again when an app card is selected or its frame loads (its panel, or the route's
//   refusal once the folder went), so a card follows its folder without a timer (app-cards FIX_02);
// - each card's frame, wired once to `call_app_tool` through the page's one I/O layer (io.ts) and
//   to Esc (back to its card), loaded only while its card is on the visible stage and the zoom is
//   at or above FAR_K, and removed once the card is more than a screen away or the board zooms out
//   past it (ruling 14; the bounds are offscreen.ts');
// - the board's theme, told to every loaded panel when it changes (the toolbar's theme or the
//   system's);
// - the buttons with `data-app-act`: Allow and Stop app are the person's acts, asked first as the
//   action registry says and sent through the one sender, the footer's control marked loading while
//   one is in flight and error when it was refused; Check again and Restart read list_apps again.
//   Each says what happened (the toast, a live region) and keeps focus on the card;
// - "Allowed ▾" in the footer (card-polish FE_01): its menu, one item, Stop app, with the board's
//   menu keys (menu-keys.ts); Esc or a press outside closes it.
import type { ActionId, LedgerEvent, ViewNode } from '../../../../packages/format/src/index.ts';
import type { LedgerState } from '../../../../packages/actions/src/index.ts';
import { ACTIONS } from '../../../../packages/actions/src/index.ts';
import type { BoardLayout } from '../../../../packages/layout/src/index.ts';
import type { AppCardInput, CardConditions, VbAppFrameElement, VbNodeElement } from '../../../../packages/ui/src/index.ts';
import { appView } from '../../../../packages/ui/src/index.ts';
import { createAppStates } from './app-state.ts';
import { appAsk, appDone, retryDone } from './app-words.ts';
import { menuKeydown } from './menu-keys.ts';
import type { ActFields, AppCallRefusal } from './io.ts';
import { callAppTool } from './io.ts';
import { outside, viewBounds } from './offscreen.ts';
import { focusCame } from './pointer-focus.ts';
import type { Selection } from './selection.ts';
import type { Viewport } from './viewport.ts';
import { isFar } from './viewport.ts';

export interface AppCardsDeps {
  /** The appCards flag: off, app cards are plain cards and nothing here runs (ruling 13). */
  on: boolean;
  stage: HTMLElement;
  vp: Viewport;
  /** The person's selection: an app card selected reads list_apps again. */
  selection: Pick<Selection, 'has' | 'onChange'>;
  cards(): ReadonlyMap<string, VbNodeElement>;
  layout(): BoardLayout | null;
  /** A past version of the board shows: its app cards are placeholders (ruling 10). */
  past(): boolean;
  /** Send one of the person's acts through the one sender (sender.ts); null when recorded. */
  act(fields: ActFields): Promise<string | null>;
  /** Ask the person first (the shell's confirm dialog); true when confirmed. */
  confirm(heading: string, body: string, confirm: string): Promise<boolean>;
  toast(text: string): void;
  fail(err: unknown): void;
  /** list_apps said something new: draw the board again (only the app cards change). */
  redraw(): void;
}

export interface AppCards {
  /** What the conditions table adds for card `n`: its app's state, for an app card. */
  card(n: ViewNode): CardConditions;
  /** Lines were applied to the held state (live.ts): read list_apps again when they touch apps. */
  lines(lines: readonly LedgerEvent[], full: boolean, state: LedgerState | null): void;
  /** Load the frames of the app cards on screen and near enough, remove those well away; after
   * every draw and every pan or zoom. */
  place(): void;
  destroy(): void;
}

/** Problems that say the app's state moved (its code changed, it broke, it went): read list_apps
 * again, so the card follows. Bad input, a busy app or a too-big answer say nothing of the state. */
const STATE_PROBLEMS: ReadonlySet<string> = new Set(['needs-approval', 'app-invalid', 'app-not-found', 'app-failed', 'app-timeout']);

/** The board's theme changed: the toolbar's choice (`data-theme` on the root) or the system's. */
export function watchTheme(changed: () => void): () => void {
  const media = matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', changed);
  const root = new MutationObserver(changed);
  root.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => {
    media.removeEventListener('change', changed);
    root.disconnect();
  };
}

/** "Allowed ▾"'s menu on an app card (card-polish FE_01): one open at a time, its items focused and
 * moved through with the board's menu keys; Esc gives focus back to its button, Tab or a press
 * outside just closes it. Drawn in the card's footer (node-template.ts `appStatus`). */
function createAppMenus(): { toggle(opener: HTMLButtonElement): void; close(focusBack: boolean): void; destroy(): void } {
  let open: { opener: HTMLButtonElement; menu: HTMLElement } | null = null;
  const items = (menu: HTMLElement) => [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  const keydown = (e: KeyboardEvent) => { if (open) menuKeydown(e, items(open.menu), close); };
  const outside = (e: PointerEvent) => { if (open && !open.menu.parentElement!.contains(e.target as Node)) close(false); };
  function close(focusBack: boolean): void {
    if (!open) return;
    const { opener, menu } = open;
    open = null;
    menu.hidden = true;
    opener.setAttribute('aria-expanded', 'false');
    menu.removeEventListener('keydown', keydown);
    document.removeEventListener('pointerdown', outside, true);
    if (focusBack && opener.isConnected) opener.focus({ preventScroll: true });
  }
  function toggle(opener: HTMLButtonElement): void {
    const menu = document.getElementById(opener.getAttribute('aria-controls') ?? '');
    const again = open?.opener === opener;
    close(again);
    if (again || !menu) return;
    open = { opener, menu };
    menu.hidden = false;
    opener.setAttribute('aria-expanded', 'true');
    menu.addEventListener('keydown', keydown);
    document.addEventListener('pointerdown', outside, true);
    items(menu)[0]?.focus({ preventScroll: true });
  }
  return { toggle, close, destroy: () => close(false) };
}

export function createAppCards(d: AppCardsDeps): AppCards {
  const states = createAppStates({ on: d.on, changed: () => d.redraw(), fail: d.fail });
  /** The app cards drawn, by node id (filled as the cards' conditions are asked for). */
  const shown = new Map<string, ViewNode>();
  const wired = new WeakSet<VbAppFrameElement>();

  /** The app as list_apps last gave it (none until it answered); a past version keeps its size. */
  const input = (n: ViewNode): AppCardInput => {
    const info = states.info(n.app?.id ?? '');
    const known = info ? { info } : {};
    return d.past() ? { ...known, past: true } : known;
  };

  /** A tool call from a card's panel; a refusal that says the state moved reads it again. */
  async function call(app: string, name: string, args: Record<string, unknown>) {
    try {
      return await callAppTool(app, name, args);
    } catch (err) {
      if (STATE_PROBLEMS.has((err as AppCallRefusal).problem)) void states.refresh();
      throw err;
    }
  }

  function wire(card: VbNodeElement, frame: VbAppFrameElement): void {
    if (wired.has(frame)) return;
    wired.add(frame);
    frame.wire({
      callTool: (name, args) => call(frame.dataset.app ?? '', name, args),
      focusCame,
      onEscape: () => card.focus({ preventScroll: true }),
      onLoad: () => void states.refresh(),
    });
  }

  function place(): void {
    if (!d.on || !shown.size) return;
    const layout = d.layout();
    const cards = d.cards();
    const near = !isFar(d.vp.k);
    const seen = viewBounds(d.vp, d.stage, 0);
    const kept = viewBounds(d.vp, d.stage);
    for (const [id, n] of shown) {
      const el = cards.get(id);
      if (!el) {
        shown.delete(id);
        continue;
      }
      const frame = el.querySelector<VbAppFrameElement>('vb-app-frame');
      if (!frame) continue;
      wire(el, frame);
      const b = layout?.nodes.get(id);
      if (!near || !b || el.hidden || !appView(n, input(n)).frame || outside(b, kept)) {
        if (frame.loaded) frame.unload();
      } else if (!frame.loaded && !outside(b, seen)) frame.load();
    }
  }

  const frames = (): VbAppFrameElement[] =>
    [...shown.keys()].flatMap((id) => [...(d.cards().get(id)?.querySelectorAll<VbAppFrameElement>('vb-app-frame') ?? [])]);

  /** Allow, Stop app, and Check again or Restart (`button`), on app card `card`. */
  async function press(card: VbNodeElement, n: ViewNode, button: HTMLButtonElement): Promise<void> {
    const what = button.dataset.appAct ?? '';
    const app = n.app?.id;
    if (!app) return;
    const info = states.info(app);
    const name = info?.title ?? n.title;
    if (what === 'retry') {
      const before = info?.state;
      await states.refresh();
      // A new state draws a new view, without the button pressed: focus stays on the card.
      if (!button.isConnected) card.focus({ preventScroll: true });
      d.toast(retryDone(name, before, states.info(app)?.state));
      return;
    }
    if (what !== 'app-allow' && what !== 'app-revoke') return;
    const action: ActionId = what;
    // An allow names the version list_apps gave; with none known yet there is nothing to allow.
    if (action === 'app-allow' && !info?.hash) return;
    // The footer's control the act is for: Allow, or "Allowed ▾" for its menu's Stop app.
    const control = button.closest('.vb-app-status')?.querySelector<HTMLButtonElement>(action === 'app-allow' ? '[data-app-act="app-allow"]' : '[data-app-menu]');
    if (control?.getAttribute('aria-busy') === 'true') return;
    control?.removeAttribute('data-error');
    if (ACTIONS[action].needsConfirmation && !(await d.confirm(...appAsk(action, name, info?.changed === true)))) return;
    const fields: ActFields = action === 'app-allow' ? { action, app, hash: info!.hash! } : { action, app };
    for (const a of ['aria-busy', 'aria-disabled']) control?.setAttribute(a, 'true');
    const problem = await d.act(fields);
    for (const a of ['aria-busy', 'aria-disabled']) control?.removeAttribute(a);
    if (problem !== null) {
      control?.setAttribute('data-error', '');
      return;
    }
    await states.refresh();
    card.focus({ preventScroll: true });
    d.toast(appDone(action, name));
  }

  const menus = createAppMenus();
  const onClick = (e: MouseEvent): void => {
    const target = e.target as Element;
    const opener = target.closest<HTMLButtonElement>('button[data-app-menu]');
    if (opener) return menus.toggle(opener);
    const b = target.closest<HTMLButtonElement>('button[data-app-act]');
    const card = b?.closest<VbNodeElement>('vb-node');
    const n = card && shown.get(card.dataset.id ?? '');
    if (b?.getAttribute('role') === 'menuitem') menus.close(true);
    if (b && card && n) void press(card, n, b);
  };
  if (d.on) d.stage.addEventListener('click', onClick);
  const stops = d.on ? [
    watchTheme(() => { for (const f of frames()) f.lookChanged(); }),
    // One read for every app card a change selected.
    d.selection.onChange((c) => { if (c.changed.some((id) => shown.has(id) && d.selection.has(id))) void states.refresh(); }),
  ] : [];

  return {
    card(n) {
      if (!d.on || n.kind !== 'app') return {};
      shown.set(n.id, n);
      return { app: input(n) };
    },
    lines: (lines, full, state) => states.lines(lines, full, state),
    place,
    destroy() {
      d.stage.removeEventListener('click', onClick);
      menus.destroy();
      for (const stop of stops) stop();
    },
  };
}
