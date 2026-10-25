// Region pattern, the mode row's behaviour (browser only): the row's single Tab stop with arrow
// keys between the layouts and the cog, the layout popover (opens on hover or keyboard focus of an
// icon, closes on leave, blur, Esc or a pick) and the cog's settings menu (Esc and an outside click
// close it, focus goes back to the cog). Open state is `data-open` on the <vb-region> ("modes" or
// "menu"), which region.css reads. Picks and the menu's items are plain clicks that bubble to the
// page's delegated listener (data-mode, data-reset, data-put-back, data-remove-region); a disabled
// item is stopped here, but one a locked board paused (`data-paused`) goes on, so the page says why.
// Up and Down move between the menu's items, Home and End to the first and the last. With the
// toolRail flag the row is a vertical rail (`data-rail` on the frame): Right on the cog opens its
// menu and Left in the menu closes it, back to the cog.
// Nothing here touches HTMLElement at import, so the ui front door stays importable from Node.
import type { Mode } from '../../../format/src/index.ts';
import { MODE_HINT } from './region-core.ts';
import { regionIds } from './region-template.ts';

export type RegionOpen = 'modes' | 'menu';

const RADIO = 'button[role="radio"]';
const COMMENT = 'button.vb-region-comment';
const WIDTHS = 'button.vb-widths';
const COG = 'button.vb-cog';
const ITEM = '[role="menuitem"]';

export interface ModeRow {
  /** Open the popover with `mode` highlighted, or the settings menu (focusing its item unless
   * `focus` is false). The gallery uses it to draw the open states. */
  open(what: RegionOpen, opts?: { mode?: Mode; focus?: boolean }): void;
  close(): void;
  /** After `update`: the checked layout is the row's Tab stop, unless focus is inside the row. */
  sync(): void;
}

export function bindModeRow(host: HTMLElement): ModeRow {
  const q = <T extends HTMLElement>(s: string) => host.querySelector<T>(s);
  const radios = () => [...host.querySelectorAll<HTMLButtonElement>(RADIO)];
  /** The row's stops in order: the six layouts, Match card widths (widthsControl flag), Comment
   * (3_FE_04), then the cog. */
  const stops = () => [...host.querySelectorAll<HTMLButtonElement>(`${RADIO}, ${WIDTHS}, ${COMMENT}, ${COG}`)];
  const tools = () => q<HTMLElement>('.vb-region-tools');
  const inTools = (n: EventTarget | null) => n instanceof Node && !!tools()?.contains(n);
  const inRow = (n: EventTarget | null) => n instanceof Node && !!q('.vb-mode-row')?.contains(n);

  function rove(to: HTMLElement) {
    for (const b of stops()) b.tabIndex = b === to ? 0 : -1;
  }

  function sync() {
    if (inRow(document.activeElement)) return;
    // A fixed frame (Later) has no layouts: the cog is the row's one stop.
    const to = radios().find((b) => b.getAttribute('aria-checked') === 'true') ?? radios()[0] ?? q<HTMLElement>(COG);
    if (to) rove(to);
  }

  /** Highlight one layout in the popover and tie the popover to its icon (aria-describedby). */
  function highlight(mode: Mode | null) {
    const pop = regionIds(host.dataset.region ?? '').modes;
    for (const b of radios()) {
      const on = b.dataset.mode === mode;
      b.toggleAttribute('data-hover', on);
      if (on) b.setAttribute('aria-describedby', pop);
      else b.removeAttribute('aria-describedby');
    }
    for (const t of host.querySelectorAll<HTMLElement>('.vb-mtile')) t.toggleAttribute('data-hover', t.dataset.tile === mode);
    const line = q('.vb-mode-line');
    const current = host.dataset.mode as Mode | undefined;
    if (line) line.textContent = MODE_HINT[(mode ?? current ?? 'grid') as Mode];
  }

  /** Esc in the rail with no popover open: a short frame's rail collapses (region-rail.css reads
   * data-shut on the row; the focused button stays drawn) until the pointer comes back or focus moves. */
  const shut = () => q('.vb-mode-row')?.toggleAttribute('data-shut', true);

  const unshut = () => q('.vb-mode-row')?.removeAttribute('data-shut');

  function onOutside(e: PointerEvent) {
    if (!inTools(e.target)) closeMenu(true);
  }

  function closeModes() {
    if (host.dataset.open === 'modes') delete host.dataset.open;
    highlight(null);
  }

  function closeMenu(focusCog: boolean) {
    document.removeEventListener('pointerdown', onOutside, true);
    if (host.dataset.open !== 'menu') return;
    delete host.dataset.open;
    q(COG)?.setAttribute('aria-expanded', 'false');
    if (focusCog) q<HTMLElement>(COG)?.focus({ preventScroll: true });
  }

  function openModes(mode: Mode) {
    if (host.dataset.open === 'menu') return;
    host.dataset.open = 'modes';
    highlight(mode);
  }

  function openMenu(focus = true) {
    closeModes();
    host.dataset.open = 'menu';
    q(COG)?.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', onOutside, true);
    if (focus) q<HTMLElement>(ITEM)?.focus({ preventScroll: true });
  }

  /** Arrow keys inside the row: Left/Up back, Right/Down on, Home/End; wraps. The key towards the
   * cog's menu opens it instead (a menu button): Down on the top line, where the menu opens below;
   * Right in the rail (`data-rail`, toolRail flag), where it opens to the right and Down moves on. */
  function onRowKey(e: KeyboardEvent, from: HTMLElement) {
    const list = stops();
    const i = list.indexOf(from as HTMLButtonElement);
    const opener = from.matches(COG) ? (host.hasAttribute('data-rail') ? 'ArrowRight' : 'ArrowDown') : null;
    let to: number | null = null;
    if (e.key === opener) {
      e.preventDefault();
      return openMenu();
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') to = (i + 1) % list.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') to = (i - 1 + list.length) % list.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = list.length - 1;
    else if (e.key === 'Escape' && (host.dataset.open === 'modes' || host.hasAttribute('data-rail'))) {
      // Esc closes the popover; in the rail it also collapses a short frame's rail.
      e.preventDefault();
      closeModes();
      if (host.hasAttribute('data-rail')) shut();
      return;
    }
    if (to === null) return;
    e.preventDefault();
    list[to]!.focus({ preventScroll: true });
  }

  function onMenuKey(e: KeyboardEvent) {
    // In the rail the menu opens to the right of the cog, so Left goes back to it, as Esc does.
    if (e.key === 'Escape' || (e.key === 'ArrowLeft' && host.hasAttribute('data-rail'))) {
      e.preventDefault();
      closeMenu(true);
    } else if (e.key === 'Tab') {
      closeMenu(false);
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      const list = [...host.querySelectorAll<HTMLElement>(ITEM)];
      const i = list.indexOf(e.target as HTMLElement);
      const last = list.length - 1;
      const to = e.key === 'Home' ? 0 : e.key === 'End' ? last : e.key === 'ArrowDown' ? (i + 1) % list.length : i <= 0 ? last : i - 1;
      list[to]?.focus({ preventScroll: true });
    }
  }

  host.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('.vb-region-menu')) return onMenuKey(e);
    if (t.closest('.vb-mode-row')) onRowKey(e, t.closest<HTMLElement>('button')!);
  });

  host.addEventListener('mouseover', (e) => {
    const t = e.target as HTMLElement;
    if (inRow(t) && !inRow(e.relatedTarget)) unshut();
    const radio = t.closest<HTMLElement>(RADIO);
    if (radio) openModes(radio.dataset.mode as Mode);
    else if (t.closest(COG) || t.closest(COMMENT) || t.closest(WIDTHS)) closeModes();
  });

  // Leaving the row and the popover closes it, unless the keyboard is using the row.
  host.addEventListener('mouseout', (e) => {
    if (host.dataset.open !== 'modes' || inTools(e.relatedTarget)) return;
    if (!q('.vb-mode-row :focus-visible')) closeModes();
  });

  host.addEventListener('focusin', (e) => {
    const t = e.target as HTMLElement;
    if (!inRow(t)) return;
    unshut();
    rove(t);
    if (t.matches(RADIO)) openModes(t.dataset.mode as Mode);
    else closeModes();
  });

  host.addEventListener('focusout', (e) => {
    if (inTools((e as FocusEvent).relatedTarget)) return;
    unshut();
    closeModes();
    closeMenu(false);
    sync();
  });

  host.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest(RADIO) || t.closest(COMMENT) || t.closest(WIDTHS)) {
      // A pick, Match card widths or Comment (its click bubbles on to the page, which sends the act
      // or opens the note bubble).
      closeMenu(false);
      return closeModes();
    }
    if (t.closest(COG)) return host.dataset.open === 'menu' ? closeMenu(true) : openMenu();
    const item = t.closest<HTMLElement>(ITEM);
    if (!item) return;
    if (item.getAttribute('aria-disabled') === 'true' && !item.hasAttribute('data-paused')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    closeMenu(true);
  });

  return {
    open(what, opts = {}) {
      if (what === 'menu') return openMenu(opts.focus ?? true);
      openModes(opts.mode ?? (host.dataset.mode as Mode));
    },
    close() {
      closeModes();
      closeMenu(false);
    },
    sync,
  };
}
