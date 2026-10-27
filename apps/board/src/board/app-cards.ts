// App cards on the board (D-047 rulings 7, 10, 13-15; app-cards FE_02). The node pattern draws an
// app card's states and the app-frame pattern its panel (packages/ui); this wires them to the page:
// - what each app card shows, from the one copy of list_apps' answer (app-state.ts), or the past
//   version's placeholder at the size the app gives (`card`, the card's conditions);
// - that copy read again when an app card is selected or its frame loads (its panel, or the route's
//   refusal once the folder went), so a card follows its folder without a timer (app-cards FIX_02);
// - each card's frame, wired once to `call_app_tool` through the page's one I/O layer (io.ts), to
//   its card's saved panel state (panel-states.ts: kept in memory, written debounced, restored when
//   the panel starts again; app-state-kept FE_02) and to Esc (back to its card), loaded the first time its card is on the visible stage and the zoom
//   is at or above FAR_K, then kept loaded (D-050, superseding ruling 14; app-state-kept
//   FE_01): frozen while the card is off the stage, hidden or the board zoomed out past FAR_K,
//   thawed when it is back; unloaded only when its card goes, its state shows no panel, or more
//   than LIVE_PANELS are loaded (the least recently used frozen one first; the bounds are
//   offscreen.ts');
// - the board's theme, told to every loaded panel when it changes (the toolbar's theme or the
//   system's);
// - the buttons with `data-app-act`: Allow and Stop app are the person's acts, asked first as the
//   action registry says and sent through the one sender, the footer's control marked loading while
//   one is in flight and error when it was refused; Check again and Restart read list_apps again.
//   Each says what happened (the toast, a live region) and keeps focus on the card;
// - "Allowed ▾" in the footer (card-polish FE_01): its menu, one item, Stop app, with the board's
//   menu keys (the shared menu, `#ui` `openMenu`); Esc or a press outside closes it.
import type { ActionId, LedgerEvent, ViewNode } from '#format';
import type { LedgerState } from '#actions';
import { ACTIONS } from '#actions';
import type { BoardLayout } from '#layout';
import type { AppCardInput, CardConditions, VbAppFrameElement, VbNodeElement } from '#ui';
import type { OpenMenu } from '#ui';
import { appView, openMenu } from '#ui';
import { createAppStates } from './app-state.ts';
import { appAsk, appDone, retryDone } from './app-words.ts';
import type { ActFields, AppCallRefusal } from './io.ts';
import { callAppTool, panelState, savePanelState } from './io.ts';
import type { PanelKey } from './panel-states.ts';
import { createPanelStates } from './panel-states.ts';
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
  /** The board shown: its app cards' saved panel states are kept under it. */
  board(): string;
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
  /** Load or thaw the frames of the app cards on screen and near enough, freeze the rest, unload
   * past the cap; after every draw and every pan or zoom. */
  place(): void;
  destroy(): void;
}

/** The most panels kept loaded at once (D-050): past it, the least recently used frozen one
 * unloads. A page concern, not part of the app contract. */
export const LIVE_PANELS = 8;

/** Which loaded panels to unload so at most `cap` stay loaded: walking `used` (least recently used
 * first), the frozen ones (not in `live`) until the count fits. A live panel never goes for the cap,
 * so the panels on screen all run, however many there are. */
export function overCap(used: readonly string[], live: ReadonlySet<string>, cap: number): string[] {
  const out: string[] = [];
  for (const id of used) {
    if (used.length - out.length <= cap) break;
    if (!live.has(id)) out.push(id);
  }
  return out;
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
 * moved through with the shared menu's keys; Esc gives focus back to its button, Tab or a press
 * outside just closes it. Drawn in the card's footer (node-template.ts `appStatus`). */
function createAppMenus(): { toggle(opener: HTMLButtonElement): void; close(focusBack: boolean): void; destroy(): void } {
  let open: { opener: HTMLButtonElement; menu: OpenMenu } | null = null;
  const close = (focusBack: boolean): void => open?.menu.close(focusBack);
  function toggle(opener: HTMLButtonElement): void {
    const menu = document.getElementById(opener.getAttribute('aria-controls') ?? '');
    const again = open?.opener === opener;
    close(again);
    if (again || !menu) return;
    menu.hidden = false;
    open = { opener, menu: openMenu({ menu, opener, within: (t) => !!menu.parentElement?.contains(t), onClose: () => { open = null; menu.hidden = true; } }) };
  }
  return { toggle, close, destroy: () => close(false) };
}

export function createAppCards(d: AppCardsDeps): AppCards {
  const states = createAppStates({ on: d.on, changed: () => d.redraw(), fail: d.fail });
  /** The app cards drawn, by node id (filled as the cards' conditions are asked for). */
  const shown = new Map<string, ViewNode>();
  const wired = new WeakSet<VbAppFrameElement>();
  const saved = createPanelStates({ read: (k) => panelState(k.board, k.n), write: (k, state) => savePanelState(k.board, k.n, state) });
  /** The loaded frames, by node id, least recently on screen first (LIVE_PANELS). */
  const used = new Map<string, VbAppFrameElement>();

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
    /** The card's panel now: the board shown, the card's number, the app its frame shows. */
    const key = (): PanelKey => ({ board: d.board(), n: Number(card.dataset.id), app: frame.dataset.app ?? '' });
    frame.wire({
      callTool: (name, args) => call(frame.dataset.app ?? '', name, args),
      saveState: (state) => saved.save(key(), state),
      loadState: () => saved.load(key()),
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
    const live = new Set<string>();
    for (const [id, n] of shown) {
      const el = cards.get(id);
      if (!el) shown.delete(id);
      const frame = el?.querySelector<VbAppFrameElement>('vb-app-frame');
      if (!el || !frame) continue;
      wire(el, frame);
      const b = layout?.nodes.get(id);
      if (!appView(n, input(n)).frame) frame.unload();
      else if (near && b && !el.hidden && !outside(b, seen)) {
        frame.load();
        frame.thaw();
        live.add(id);
        used.delete(id);
        used.set(id, frame);
      } else frame.freeze();
    }
    // A frame that went (its card, its state, or a new frame in its place) is no longer counted.
    for (const [id, f] of used) if (!f.loaded || !f.isConnected) used.delete(id);
    for (const id of overCap([...used.keys()], live, LIVE_PANELS)) {
      used.get(id)!.unload();
      used.delete(id);
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
