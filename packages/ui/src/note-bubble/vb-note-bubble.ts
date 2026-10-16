// Note bubble pattern, layer 3 (element): <vb-note-bubble>, in light DOM (components.md § The
// element). A non-modal dialog beside one card. The page creates one, calls `show()` with what it
// says, `place()` on every pan, zoom and relayout, and listens for `vb-note` events; the element
// never writes anything itself (rule 8). Keys: Enter saves, Shift+Enter is a new line, Esc
// cancels. The conversation (review polish ruling 6) opens at an entry: `reveal` scrolls to it and
// `focusText` focuses it. Browser only: the class is created inside defineVbNoteBubble().
import type { Kind } from '../../../format/src/index.ts';
import type { BubbleMode, BubblePhase, BubbleView, NoteDiscardDetail, Placement } from './note-bubble-core.ts';
import { cancelIntent, isDirty, NOTE_DISCARD_EVENT, readOnlyMode } from './note-bubble-core.ts';
import { noteBubbleTemplate } from './note-bubble-template.ts';

export const VB_NOTE_BUBBLE_TAG = 'vb-note-bubble';

/** What the person asked for: the `vb-note` event's detail. `edit`: Edit on a note in the
 *  conversation, its `seq` in `note` (decision 8: the page opens that note to edit). */
export type NoteChoice = 'save' | 'cancel' | 'remove' | 'edit';
export interface NoteEventDetail { choice: NoteChoice; text: string; note?: number }

export interface VbNoteBubbleElement extends HTMLElement {
  /** Draw the bubble for one card (its kind's colour and number), a group of cards (no `kind`,
   *  so the neutral edge; no number chip) or a whole container (`line`: the container's frame
   *  colour from `regionColour`, which its edge wears; sets `data-on="container"`), with the view
   *  from `bubbleView`. */
  show(v: BubbleView, card: { kind?: Kind; number?: number; line?: string }): void;
  /** Put it beside its card (from `placeBubble`), in the coordinates of its offset parent. */
  place(p: Placement): void;
  /** `saving` disables the buttons; `error` shows `message` under the text and keeps it. */
  setPhase(phase: BubblePhase, message?: string): void;
  /** The words typed so far. */
  readonly text: string;
  /** Whether the words typed differ from those it was shown with (`isDirty`); false for a sent
   *  note or a reply. The page reads it before opening another bubble over this one (step 4G ruling 4). */
  readonly dirty: boolean;
  /** Move focus into the text, caret at the end; in the conversation, to the entry `reveal` chose;
   *  on a sent note, to the ×. */
  focusText(): void;
  /** In the conversation: scroll to the entry with ledger `seq`, or to the bottom (the latest) when
   *  it is the last entry or not given (review polish ruling 6 and the maintainer's answer, 129). */
  reveal(seq?: number): void;
}

export function defineVbNoteBubble(): void {
  if (customElements.get(VB_NOTE_BUBBLE_TAG)) return;

  class VbNoteBubble extends HTMLElement implements VbNoteBubbleElement {
    /** The words it was shown with, which `dirty` compares against. */
    private opened = '';
    /** The conversation's entry `reveal` chose, which `focusText` focuses. */
    private at: HTMLElement | null = null;

    constructor() {
      super();
      this.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-note-do]');
        if (b && !b.disabled) this.choose(b.dataset.noteDo as NoteChoice, b.dataset.edit ? Number(b.dataset.edit) : undefined);
      });
      this.addEventListener('keydown', (e) => this.onKey(e));
      this.addEventListener('input', () => this.grow());
    }

    /** Drawn in a gallery stage before it joins the page: measure once it is there. */
    connectedCallback(): void {
      this.grow();
    }

    show(v: BubbleView, card: { kind?: Kind; number?: number; line?: string }): void {
      this.setAttribute('role', 'dialog');
      this.setAttribute('aria-label', v.heading);
      this.dataset.mode = v.mode;
      // CSSOM, not a style attribute: the page's CSP refuses inline styles.
      if (card.line) this.style.setProperty('--kind', card.line);
      else if (card.kind) this.style.setProperty('--kind', `var(--vb-kind-${card.kind})`);
      else this.style.removeProperty('--kind');
      if (card.line) this.dataset.on = 'container';
      else delete this.dataset.on;
      this.innerHTML = noteBubbleTemplate(v, card.number);
      this.opened = v.text;
      this.at = null;
      this.setPhase('idle');
      this.hidden = false;
      this.grow();
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

    get dirty(): boolean {
      return !readOnlyMode(this.dataset.mode as BubbleMode) && isDirty(this.opened, this.text);
    }

    focusText(): void {
      const ta = this.querySelector('textarea');
      if (!ta) return void (this.at ?? this.querySelector<HTMLButtonElement>('button'))?.focus({ preventScroll: true });
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }

    reveal(seq?: number): void {
      const list = this.querySelector<HTMLElement>('.vb-nb-thread');
      const items = [...this.querySelectorAll<HTMLElement>('.vb-nb-convo [data-seq]')];
      if (!list || !items.length) return;
      const at = items.find((x) => x.dataset.seq === String(seq)) ?? items.at(-1)!;
      this.at = at;
      // The latest at the bottom; an older one at the top of the list, as far as the list scrolls.
      list.scrollTop = at === items.at(-1) ? list.scrollHeight
        : at.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    }

    /** The text grows with its words (found-in-use FE_04 ruling 2): never shorter than it is, so a
     *  manual resize stays; note-bubble.css gives the minimum and the maximum, past which it scrolls. */
    private grow(): void {
      const ta = this.querySelector('textarea');
      if (ta && ta.scrollHeight > ta.clientHeight) ta.style.height = `${ta.scrollHeight + ta.offsetHeight - ta.clientHeight}px`;
    }

    private choose(choice: NoteChoice, note?: number): void {
      // Esc or Cancel with changed words asks the page first (step 4G ruling 4); unchanged, it
      // closes as before.
      if (choice === 'cancel' && cancelIntent(this.dataset.mode as BubbleMode, this.dirty) === 'ask') {
        const ask: NoteDiscardDetail = { text: this.text };
        this.dispatchEvent(new CustomEvent<NoteDiscardDetail>(NOTE_DISCARD_EVENT, { bubbles: true, detail: ask }));
        return;
      }
      const detail: NoteEventDetail = { choice, text: this.text, ...(note !== undefined && { note }) };
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
