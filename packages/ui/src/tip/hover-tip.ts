// A hover tip (found-in-use FE_03; card notes reuse it in FE_04): a small box that shows the full
// text of something the pattern had to cut. The open rules are WCAG 1.4.13 and are the ones the
// container-note preview uses (`previewStep` in region/region-preview.ts): hoverable (it stays
// while the pointer crosses onto it), persistent (it stays while focus is in the group) and
// dismissible without moving anything (Esc). Browser only. The helper draws nothing: it sets one
// attribute on the host while the tip should show, and the pattern's CSS reads it. Touch has no
// hover: a tap on the anchor opens it, a tap outside closes it.
import type { PreviewEvent } from '../region/region-preview.ts';
import { PREVIEW_CLOSED, previewShown, previewStep } from '../region/region-preview.ts';

export interface HoverTipOptions {
  /** Hovering or focusing this (a selector, inside the host; `:host` is the host itself) shows the tip. */
  anchor: string;
  /** The tip itself; the pointer on it keeps it open. */
  tip: string;
  /** Focus anywhere in this group (a selector, or `:host`) keeps the tip open; defaults to the anchor. */
  group?: string;
  /** The attribute set on the host while the tip shows. */
  attr: string;
  /** Whether there is anything to show right now (e.g. the text is cut); read on each change. */
  needed?: () => boolean;
}

export interface HoverTip {
  /** Close the tip now (the pattern opened something else, or was rebuilt). */
  close(): void;
}

export function bindHoverTip(host: HTMLElement, o: HoverTipOptions): HoverTip {
  const group = o.group ?? o.anchor;
  let state = PREVIEW_CLOSED;
  let touch = false;
  const pick = (sel: string) => (sel === ':host' ? host : host.querySelector(sel));
  const within = (n: EventTarget | null, sel: string) => n instanceof Node && !!pick(sel)?.contains(n);
  const inTip = (n: EventTarget | null) => within(n, group) || within(n, o.anchor) || within(n, o.tip);

  function step(e: PreviewEvent) {
    state = previewStep(state, e);
    const on = previewShown(state, o.needed?.() ?? true);
    host.toggleAttribute(o.attr, on);
    // Esc and a press outside are heard on the page only while the tip is open.
    if (on) {
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('pointerdown', onOutside, true);
    } else {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onOutside, true);
    }
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    step('escape');
  };
  const onOutside = (e: PointerEvent) => {
    if (!inTip(e.target)) step('outside');
  };

  const hovering = (e: PointerEvent) => e.pointerType !== 'touch';
  host.addEventListener('pointerover', (e) => {
    if (!hovering(e)) return;
    if (within(e.target, o.anchor) && !within(e.relatedTarget, o.anchor)) step('button-enter');
    if (within(e.target, o.tip) && !within(e.relatedTarget, o.tip)) step('popover-enter');
  });
  host.addEventListener('pointerout', (e) => {
    if (!hovering(e)) return;
    if (within(e.target, o.anchor) && !within(e.relatedTarget, o.anchor)) step('button-leave');
    if (within(e.target, o.tip) && !within(e.relatedTarget, o.tip)) step('popover-leave');
  });
  host.addEventListener('pointerdown', (e) => {
    touch = e.pointerType === 'touch';
  });
  host.addEventListener('click', (e) => {
    if (touch && within(e.target, o.anchor)) step('tap');
    touch = false;
  });
  host.addEventListener('focusin', (e) => step(inTip(e.target) ? 'focus-in' : 'focus-out'));
  host.addEventListener('focusout', (e) => {
    if (!inTip((e as FocusEvent).relatedTarget)) step('focus-out');
  });

  return { close: () => step('close') };
}
