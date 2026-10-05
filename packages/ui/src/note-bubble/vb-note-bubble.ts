// Note bubble pattern, layer 3 (element): <vb-note-bubble>, in light DOM (components.md § The
// element). A non-modal dialog beside one card. The page creates one, calls `show()` with what it
// says, `place()` on every pan, zoom and relayout, and listens for `vb-note` events; the element
// never writes anything itself (rule 8). Keys: Enter saves, Shift+Enter is a new line, Esc
// cancels. Browser only: the class is created inside defineVbNoteBubble().
import type { Kind } from '../../../format/src/index.ts';
import type { BubblePhase, BubbleView, Placement } from './note-bubble-core.ts';
import { noteBubbleTemplate } from './note-bubble-template.ts';

export const VB_NOTE_BUBBLE_TAG = 'vb-note-bubble';

/** What the person asked for: the `vb-note` event's detail. */
export type NoteChoice = 'save' | 'cancel' | 'remove';
export interface NoteEventDetail { choice: NoteChoice; text: string }

export interface VbNoteBubbleElement extends HTMLElement {
  /** Draw the bubble for one card (its kind's colour and number) or a group of cards (no `kind`,
   *  so the neutral edge; no number chip), with the view from `bubbleView`. */
  show(v: BubbleView, card: { kind?: Kind; number?: number }): void;
  /** Put it beside its card (from `placeBubble`), in the coordinates of its offset parent. */
  place(p: Placement): void;
  /** `saving` disables the buttons; `error` shows `message` under the text and keeps it. */
  setPhase(phase: BubblePhase, message?: string): void;
  /** The words typed so far. */
  readonly text: string;
  /** Move focus into the text, caret at the end (or to the first button of a sent note). */
  focusText(): void;
}

export function defineVbNoteBubble(): void {
  if (customElements.get(VB_NOTE_BUBBLE_TAG)) return;

  class VbNoteBubble extends HTMLElement implements VbNoteBubbleElement {
    constructor() {
      super();
      this.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-note-do]');
        if (b && !b.disabled) this.choose(b.dataset.noteDo as NoteChoice);
      });
      this.addEventListener('keydown', (e) => this.onKey(e));
    }

    show(v: BubbleView, card: { kind?: Kind; number?: number }): void {
      this.setAttribute('role', 'dialog');
      this.setAttribute('aria-label', v.heading);
      this.dataset.mode = v.mode;
      // CSSOM, not a style attribute: the page's CSP refuses inline styles.
      if (card.kind) this.style.setProperty('--kind', `var(--vb-kind-${card.kind})`);
      else this.style.removeProperty('--kind');
      this.innerHTML = noteBubbleTemplate(v, card.number);
      this.setPhase('idle');
      this.hidden = false;
    }

    place(p: Placement): void {
      this.dataset.side = p.side;
      this.style.left = `${Math.round(p.x)}px`;
      this.style.top = `${Math.round(p.y)}px`;
      this.style.setProperty('--arrow', `${Math.round(p.arrow)}px`);
    }

    setPhase(phase: BubblePhase, message = ''): void {
      this.dataset.phase = phase;
      this.toggleAttribute('aria-busy', phase === 'saving');
      for (const b of this.querySelectorAll<HTMLButtonElement>('button[data-note-do]')) b.disabled = phase === 'saving';
      const save = this.querySelector<HTMLButtonElement>('button[data-note-do="save"]');
      if (save) {
        save.dataset.label ??= save.textContent ?? '';
        save.textContent = phase === 'saving' ? 'Saving…' : save.dataset.label;
      }
      const error = this.querySelector<HTMLElement>('.vb-nb-error');
      if (error) {
        error.hidden = phase !== 'error';
        error.textContent = phase === 'error' ? message : '';
      }
    }

    get text(): string {
      return this.querySelector('textarea')?.value ?? '';
    }

    focusText(): void {
      const ta = this.querySelector('textarea');
      if (!ta) return void this.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }

    private choose(choice: NoteChoice): void {
      const detail: NoteEventDetail = { choice, text: this.text };
      this.dispatchEvent(new CustomEvent<NoteEventDetail>('vb-note', { bubbles: true, detail }));
    }

    private onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (this.dataset.phase !== 'saving') this.choose('cancel');
        return;
      }
      const inText = (e.target as HTMLElement).localName === 'textarea';
      if (inText && e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        if (this.dataset.phase !== 'saving') this.choose('save');
      }
    }
  }

  customElements.define(VB_NOTE_BUBBLE_TAG, VbNoteBubble);
}
