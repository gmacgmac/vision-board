// Note bubble pattern, layer 3 (element): <vb-note-bubble>, in light DOM (components.md § The
// element). A non-modal dialog beside one card. The page creates one, calls `show()` with what it
// says, `place()` on every pan, zoom and relayout, and listens for `vb-note` events; the element
// never writes anything itself (rule 8). Keys: Enter saves, Shift+Enter is a new line, Esc
// cancels. The conversation (review polish ruling 6) opens at an entry: `reveal` scrolls to it and
// `focusText` focuses it. The conversation box (`conversation` mode, FE_03) draws from its own template,
// loaded on first use (`useConversation`); in it Enter does the active mode (Add note or Ask now: pressing either
// button makes it the active one, FIX_03 ruling 3), Cmd or Ctrl Enter is always Ask now, and `show(..., true)` draws
// it again keeping the words typed, the caret, the focus and what the box says of the last write. An agent's name cut on
// its label line gets its whole name as a tip on hover.
// Browser only: the class is created inside defineVbNoteBubble().
import type { Kind } from '#format';
import type { MarkdownOptions } from '../markdown/render.ts';
import type { BoxAct, BoxView, BubbleMode, BubblePhase, BubbleView, NoteDiscardDetail, Placement } from './note-bubble-core.ts';
import { cancelIntent, fieldKey, isDirty, NOTE_DISCARD_EVENT, readOnlyMode } from './note-bubble-core.ts';
import { noteBubbleTemplate } from './note-bubble-template.ts';
import * as noteBubbleWords from '../words/note-bubble.ts';

export const VB_NOTE_BUBBLE_TAG = 'vb-note-bubble';

/** The conversation box's template, once loaded (elements.ts `loadConversation`). */
let conversation: typeof noteBubbleTemplate | null = null;
export const useConversation = (template: typeof noteBubbleTemplate): void => { conversation = template; };

/** What the person asked for: the `vb-note` event's detail. `edit`: Edit on a note in the
 *  conversation, its `seq` in `note` (decision 8: the page opens that note to edit). In the conversation box, `ask`:
 *  Ask now (sent even while it is disabled, so the page says why), and `tab`: a tab, its key in `tab`. */
export type NoteChoice = 'save' | 'cancel' | 'remove' | 'edit' | 'ask' | 'tab';
/** `active`: the conversation box's mode this press made the active one (a click on Add note or Ask now, not on a
 *  disabled Ask now), for the page to remember. */
export interface NoteEventDetail { choice: NoteChoice; text: string; note?: number; tab?: string; active?: BoxAct }

export interface VbNoteBubbleElement extends HTMLElement {
  /** Draw the bubble for one card (its kind's colour and number), a group of cards (no `kind`,
   *  so the neutral edge; no number chip) or a whole container (`line`: the container's frame
   *  colour from `regionColour`, which its edge wears; sets `data-on="container"`), with the view
   *  from `bubbleView`. `keep`: the same box drawn again (a reply arrived, a redraw): the words typed, the caret, the
   *  focus, the phase and the thread's place stay. */
  show(v: BubbleView, card: { kind?: Kind; number?: number; line?: string }, md?: MarkdownOptions, keep?: boolean): void;
  /** Put it beside its card (from `placeBubble`), in the coordinates of its offset parent. */
  place(p: Placement): void;
  /** `saving` disables the buttons (the one pressed, `by`, says so); `error` shows `message` under the text and keeps it. */
  setPhase(phase: BubblePhase, message?: string, by?: 'save' | 'ask'): void;
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
    /** What the conversation box says (its modes), while it shows. */
    private box: BoxView | undefined;

    constructor() {
      super();
      this.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-note-do]');
        if (!b || b.disabled) return;
        const choice = b.dataset.noteDo as NoteChoice;
        // A press on Add note or Ask now makes it the box's mode (a disabled Ask now only says why).
        const active = this.box && (choice === 'save' || choice === 'ask') && b.getAttribute('aria-disabled') !== 'true' ? choice : undefined;
        if (active) this.mode(active);
        this.choose(choice, b.dataset.edit ? Number(b.dataset.edit) : undefined, b.dataset.tab, active);
      });
      this.addEventListener('keydown', (e) => this.onKey(e));
      this.addEventListener('input', () => this.grow());
      // An agent's name cut short on its label line (point 619) shows whole on hover; one that fits has no tip.
      this.addEventListener('pointerover', (e) => {
        const name = (e.target as HTMLElement).closest<HTMLElement>('.vb-nb-who-name');
        if (!name) return;
        if (name.scrollWidth > name.clientWidth) name.title = name.textContent ?? '';
        else name.removeAttribute('title');
      });
    }

    /** Drawn in a gallery stage before it joins the page: measure once it is there. */
    connectedCallback(): void {
      this.grow();
    }

    show(v: BubbleView, card: { kind?: Kind; number?: number; line?: string }, md?: MarkdownOptions, keep = false): void {
      const was = keep ? this.held() : null;
      this.setAttribute('role', 'dialog');
      this.setAttribute('aria-label', v.heading);
      this.dataset.mode = v.mode;
      // The conversation box is a box beside a node (node-box.css), styled as the history and proposal boxes are.
      this.classList.toggle('vb-node-box', v.mode === 'conversation');
      // CSSOM, not a style attribute: the page's CSP refuses inline styles.
      if (card.line) this.style.setProperty('--vb-kind', card.line);
      else if (card.kind) this.style.setProperty('--vb-kind', `var(--vb-kind-${card.kind})`);
      else this.style.removeProperty('--vb-kind');
      if (card.line) this.dataset.on = 'container';
      else delete this.dataset.on;
      this.innerHTML = (v.mode === 'conversation' && conversation ? conversation : noteBubbleTemplate)(v, card.number, md);
      // The box's field starts empty: any words in it, a draft carried to another tab too, are unsaved.
      this.opened = v.mode === 'conversation' ? '' : v.text;
      this.at = null;
      this.box = v.box;
      this.setPhase('idle');
      this.hidden = false;
      if (was) was();
      this.grow();
    }

    /** What `show(..., true)` keeps, as a function that puts it back on the new markup. */
    private held(): (() => void) | null {
      const ta = this.querySelector('textarea');
      if (!ta || this.hidden) return null;
      const { value, selectionStart, selectionEnd } = ta;
      const focused = document.activeElement === ta;
      // A pressed button of the box keeps focus too (its mode's turn redraws nothing, a reply that lands does).
      const pressed = (document.activeElement as HTMLElement | null)?.closest?.('vb-note-bubble') === this ? (document.activeElement as HTMLElement).dataset.noteDo : undefined;
      const [phase, message] = [this.dataset.phase as BubblePhase, this.querySelector('.vb-nb-error')?.textContent ?? ''];
      const list = this.querySelector<HTMLElement>('.vb-nb-thread');
      const bottom = !list || list.scrollTop + list.clientHeight >= list.scrollHeight - 4;
      const top = list?.scrollTop ?? 0;
      return () => {
        const now = this.querySelector('textarea')!;
        now.value = value;
        if (focused) now.focus({ preventScroll: true });
        else if (pressed) this.querySelector<HTMLElement>(`button[data-note-do="${pressed}"]`)?.focus({ preventScroll: true });
        now.setSelectionRange(selectionStart, selectionEnd);
        this.setPhase(phase, message);
        // A reply that arrives shows when the person was at the latest; else the thread stays where they read.
        const l = this.querySelector<HTMLElement>('.vb-nb-thread');
        if (l) l.scrollTop = bottom ? l.scrollHeight : top;
      };
    }

    place(p: Placement): void {
      this.dataset.side = p.side;
      this.style.left = `${Math.round(p.x)}px`;
      this.style.top = `${Math.round(p.y)}px`;
      this.style.setProperty('--vb-arrow', `${Math.round(p.arrow)}px`);
    }

    setPhase(phase: BubblePhase, message = '', by: 'save' | 'ask' = 'save'): void {
      this.dataset.phase = phase;
      this.toggleAttribute('aria-busy', phase === 'saving');
      for (const b of this.querySelectorAll<HTMLButtonElement>('button[data-note-do]')) b.disabled = phase === 'saving';
      for (const b of this.querySelectorAll<HTMLButtonElement>('button[data-note-do="save"], button[data-note-do="ask"]')) {
        b.dataset.label ??= b.textContent ?? '';
        const busy = phase === 'saving' && b.dataset.noteDo === by;
        b.textContent = busy ? (by === 'ask' ? noteBubbleWords.asking : noteBubbleWords.saving) : b.dataset.label;
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
      // The box's field is one line that grows to three, then scrolls (note-bubble.css), and shrinks back as words go.
      if (ta && this.dataset.mode === 'conversation') ta.style.height = '';
      if (ta && ta.scrollHeight > ta.clientHeight) ta.style.height = `${ta.scrollHeight + ta.offsetHeight - ta.clientHeight}px`;
    }

    /** The box's mode turns to `act` at once: its button primary and pressed, the field and the tooltips saying so. */
    private mode(act: BoxAct): void {
      const box = this.box;
      if (!box || box.active === act) return;
      this.box = { ...box, active: act };
      const words = box.modes[act];
      const ta = this.querySelector('textarea');
      ta?.setAttribute('placeholder', words.placeholder);
      ta?.setAttribute('aria-label', words.placeholder);
      for (const b of this.querySelectorAll<HTMLButtonElement>('.vb-nb-pair button[data-note-do]')) {
        const on = b.dataset.noteDo === act;
        b.classList.toggle('vb-nb-primary', on);
        b.setAttribute('aria-pressed', String(on));
        b.title = b.dataset.noteDo === 'ask' ? words.askTip : words.addTip;
      }
    }

    private choose(choice: NoteChoice, note?: number, tab?: string, active?: BoxAct): void {
      // Esc or Cancel with changed words asks the page first (step 4G ruling 4); unchanged, it
      // closes as before.
      if (choice === 'cancel' && cancelIntent(this.dataset.mode as BubbleMode, this.dirty) === 'ask') {
        const ask: NoteDiscardDetail = { text: this.text };
        this.dispatchEvent(new CustomEvent<NoteDiscardDetail>(NOTE_DISCARD_EVENT, { bubbles: true, detail: ask }));
        return;
      }
      const detail: NoteEventDetail = { choice, text: this.text, ...(note !== undefined && { note }), ...(tab !== undefined && { tab }), ...(active && { active }) };
      this.dispatchEvent(new CustomEvent<NoteEventDetail>('vb-note', { bubbles: true, detail }));
    }

    private onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (this.dataset.phase !== 'saving') this.choose('cancel');
        return;
      }
      const key = (e.target as HTMLElement).localName === 'textarea' ? fieldKey(e, this.dataset.mode as BubbleMode, this.box?.active) : null;
      if (key) {
        e.preventDefault();
        if (this.dataset.phase !== 'saving') this.choose(key);
      }
    }
  }

  customElements.define(VB_NOTE_BUBBLE_TAG, VbNoteBubble);
}
