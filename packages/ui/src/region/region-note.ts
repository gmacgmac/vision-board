// Region pattern, the container note's behaviour (browser only, 3_FE_04 step 4G): Comment's
// badge, the preview popover under Comment and the note block above the cards. The open rules are
// region-preview.ts; this file only feeds them events and draws the result (`data-preview` on the
// frame, which region.css reads). Every press is reported as a `vb-region-note` event and the
// block's height as `vb-region-note-resize`; nothing here writes or decides (rule 8). Nothing
// touches HTMLElement at import, so the ui front door stays importable from Node.
import type { RegionNoteAction, RegionNoteEventDetail, RegionNoteResizeDetail, RegionNoteState } from './region-core.ts';
import { REGION_NOTE_EVENT, REGION_NOTE_RESIZE_EVENT } from './region-core.ts';
import type { PreviewEvent } from './region-preview.ts';
import { PREVIEW_CLOSED, previewShown, previewStep } from './region-preview.ts';
import { regionIds } from './region-template.ts';

const COMMENT = 'button.vb-region-comment';
const POP = '.vb-note-pop';
const BLOCK = '.vb-region-note-block';

export interface NoteParts {
  /** After `render`: re-find the parts (the markup was rebuilt) and observe the new block. */
  bind(): void;
  /** Apply the container's latest note (or none) from `update`. */
  apply(note: RegionNoteState | undefined): void;
  /** `noteShown` changed: show or hide the block, relabel Show / Hide. */
  shown(on: boolean): void;
  /** The block's height as `vb-region-note-resize` reports it: 0 while hidden. */
  height(): number;
  /** Close the preview (the bubble opened, or the frame was rebuilt). */
  close(): void;
}

export function bindNoteParts(host: HTMLElement): NoteParts {
  const q = <T extends HTMLElement>(s: string) => host.querySelector<T>(s);
  let state = PREVIEW_CLOSED;
  let note: RegionNoteState | undefined;
  let expanded = false;
  let lastHeight = 0;
  let touch = false;
  let openAtPress = false;
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => measure());

  const within = (n: EventTarget | null, sel: string) => n instanceof Node && !!q(sel)?.contains(n);
  const inPreview = (n: EventTarget | null) => within(n, COMMENT) || within(n, POP);

  function step(e: PreviewEvent) {
    state = previewStep(state, e);
    draw();
  }

  /** Draw the preview's open state; a note removed or arriving redraws it with no event. */
  function draw() {
    // The settings menu has the row: the preview never draws over it.
    const on = previewShown(state, note !== undefined) && host.dataset.open !== 'menu';
    host.toggleAttribute('data-preview', on);
    const comment = q(COMMENT);
    if (on) comment?.setAttribute('aria-describedby', regionIds(host.dataset.region ?? '').previewText);
    else comment?.removeAttribute('aria-describedby');
    if (state.tapped) document.addEventListener('pointerdown', onOutside, true);
    else document.removeEventListener('pointerdown', onOutside, true);
  }

  function onOutside(e: PointerEvent) {
    if (!inPreview(e.target)) step('outside');
  }

  function emit(action: RegionNoteAction) {
    if (!note) return;
    const detail: RegionNoteEventDetail = { region: host.dataset.region ?? '', action, seq: note.seq };
    host.dispatchEvent(new CustomEvent<RegionNoteEventDetail>(REGION_NOTE_EVENT, { bubbles: true, detail }));
  }

  /** Mouse and pen only: a touch has no hover, its tap is the click below. */
  const hovering = (e: PointerEvent) => e.pointerType !== 'touch';

  host.addEventListener('pointerover', (e) => {
    if (!hovering(e)) return;
    if (within(e.target, COMMENT) && !within(e.relatedTarget, COMMENT)) step('button-enter');
    if (within(e.target, POP) && !within(e.relatedTarget, POP)) step('popover-enter');
  });
  host.addEventListener('pointerout', (e) => {
    if (!hovering(e)) return;
    if (within(e.target, COMMENT) && !within(e.relatedTarget, COMMENT)) step('button-leave');
    if (within(e.target, POP) && !within(e.relatedTarget, POP)) step('popover-leave');
  });
  host.addEventListener('pointerdown', (e) => {
    touch = e.pointerType === 'touch';
    // Read before the press moves focus onto Comment, which would open the preview by focus.
    openAtPress = host.hasAttribute('data-preview');
  });

  host.addEventListener('focusin', (e) => step(inPreview(e.target) ? 'focus-in' : 'focus-out'));
  host.addEventListener('focusout', (e) => {
    if (!inPreview((e as FocusEvent).relatedTarget)) step('focus-out');
  });

  host.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !host.hasAttribute('data-preview') || !inPreview(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    // Focus goes back to Comment, so the keyboard user is where the preview came from.
    if (within(e.target, POP)) q(COMMENT)?.focus({ preventScroll: true });
    step('escape');
  });

  host.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest(COMMENT)) {
      // Touch (ruling 2): the first tap on a noted Comment opens the preview and goes no further;
      // a tap on the open preview's Comment, a mouse click or Enter opens the bubble as before.
      const tap = touch && !openAtPress;
      touch = false;
      if (tap && note) {
        e.stopPropagation();
        return step('tap');
      }
      return step('close');
    }
    const more = t.closest<HTMLButtonElement>('.vb-nblock-more');
    if (more) return toggleMore();
    const act = t.closest<HTMLButtonElement>('button[data-note-act]');
    if (!act) return;
    const action = act.dataset.noteAct as RegionNoteAction;
    if (action === 'edit') step('close');
    emit(action);
  });

  function toggleMore() {
    expanded = !expanded;
    applyMore();
  }

  function applyMore() {
    const block = q(BLOCK);
    const more = q<HTMLButtonElement>('.vb-nblock-more');
    if (!block || !more) return;
    block.toggleAttribute('data-expanded', expanded);
    more.setAttribute('aria-expanded', String(expanded));
    more.textContent = expanded ? 'Show less' : 'Show all';
  }

  /** "Show all" only when the 3 lines cut the text (checked while collapsed), then the height. */
  function measure() {
    const block = q(BLOCK);
    const text = q('.vb-nblock-text');
    const more = q<HTMLButtonElement>('.vb-nblock-more');
    if (block && text && more && !block.hidden && !expanded) more.hidden = text.scrollHeight <= text.clientHeight;
    const h = height();
    if (h === lastHeight) return;
    lastHeight = h;
    const detail: RegionNoteResizeDetail = { region: host.dataset.region ?? '', height: h };
    host.dispatchEvent(new CustomEvent<RegionNoteResizeDetail>(REGION_NOTE_RESIZE_EVENT, { bubbles: true, detail }));
  }

  /** The block's own (unscaled) height and its gap to the cards; 0 when hidden or absent. */
  function height(): number {
    const block = q(BLOCK);
    if (!block || block.hidden) return 0;
    return block.offsetHeight + (parseFloat(getComputedStyle(block).marginBottom) || 0);
  }

  function apply(next: RegionNoteState | undefined) {
    if (next?.seq !== note?.seq || next?.text !== note?.text) expanded = false;
    note = next;
    if (next) {
      host.dataset.noteStage = next.stage;
      host.dataset.badge = next.badge;
    } else {
      delete host.dataset.noteStage;
      delete host.dataset.badge;
    }
    for (const el of host.querySelectorAll<HTMLElement>('.vb-note-state')) el.textContent = next?.stateText ?? '';
    for (const el of host.querySelectorAll<HTMLElement>('.vb-note-pop-text, .vb-nblock-text')) el.textContent = next?.text ?? '';
    const ro = q('.vb-nblock-ro');
    if (ro) ro.textContent = next?.readOnlyText ?? '';
    for (const b of host.querySelectorAll<HTMLButtonElement>('.vb-region-note-block [data-note-act]')) b.hidden = !next?.editable;
    const edit = q('.vb-note-pop [data-note-act="edit"]');
    // A sent note opens read-only in the bubble: the preview's button says so.
    if (edit) edit.textContent = next && !next.editable ? 'Open' : 'Edit';
    applyMore();
    shown(host.hasAttribute('data-note-shown'));
    draw();
  }

  function shown(on: boolean) {
    const block = q(BLOCK);
    if (block) block.hidden = !(on && note);
    const show = q<HTMLButtonElement>('.vb-note-pop [data-note-act]:not([data-note-act="edit"])');
    if (show) {
      show.dataset.noteAct = on ? 'hide' : 'show';
      show.querySelector('.vb-note-show-label')!.textContent = on ? 'Hide' : 'Show in container';
    }
    measure();
  }

  function bind() {
    observer?.disconnect();
    const block = q(BLOCK);
    if (block) observer?.observe(block);
    state = PREVIEW_CLOSED;
    host.removeAttribute('data-preview');
  }

  return { bind, apply, shown, height, close: () => step('close') };
}
