// Composer pattern, layer 3 (element): <chat-composer>, in light DOM. The text and the chips the
// host attaches, each removable, and the host's context chip (`setContext`), which opens and closes
// its lines. Enter sends, Shift+Enter breaks the line. It raises `chat-send` (the words and the
// chips) and `chat-chip-remove`; it never calls the server, and it keeps the words until the host
// calls `clear()` once the message went through. Browser only.
import type { Chip } from '../events.ts';
import { TEXT_MAX } from '../events.ts';
import type { ComposerContext, ComposerView } from './composer-core.ts';
import { chipKey, COMPOSER_KEYS, sendIntent, withoutChip } from './composer-core.ts';
import { chipsTemplate, composerTemplate, lineTemplate } from './composer-template.ts';

export const CHAT_COMPOSER_TAG = 'chat-composer';
export const CHAT_SEND_EVENT = 'chat-send';
export const CHAT_CHIP_REMOVE_EVENT = 'chat-chip-remove';
/** The `chat-send` event's detail (bubbles). */
export interface ChatSendDetail { text: string; chips: Chip[] }
/** The `chat-chip-remove` event's detail (bubbles): the chip the person took off. */
export interface ChatChipRemoveDetail { chip: Chip }

export interface ChatComposerElement extends HTMLElement {
  show(v: ComposerView): void;
  setChips(chips: readonly Chip[]): void;
  readonly chips: readonly Chip[];
  /** The host's context beside the chips (null: none); it goes with every message the host sends. */
  setContext(context: ComposerContext | null): void;
  /** Whether anything is attached: a chip or the context. */
  readonly attached: boolean;
  text: string;
  /** Empties the words and the chips (the message went through). */
  clear(): void;
  focusText(): void;
}

let made = 0;

export function defineChatComposer(): void {
  if (customElements.get(CHAT_COMPOSER_TAG)) return;

  class ChatComposer extends HTMLElement implements ChatComposerElement {
    private view: ComposerView = { send: true, hint: COMPOSER_KEYS, placeholder: 'Message the agent' };
    private current: readonly Chip[] = [];
    private context: ComposerContext | null = null;
    private open = false;
    private readonly linesId = `chat-cmp-ctx-${++made}`;

    constructor() {
      super();
      this.addEventListener('click', (e) => {
        const t = e.target as HTMLElement;
        const x = t.closest<HTMLButtonElement>('button.chat-chip-x');
        if (x) return this.removeChip(x.dataset.chip ?? '');
        if (t.closest('button.chat-cmp-ctx')) return this.toggle();
        if (t.closest('button.chat-cmp-send')) this.send();
      });
      this.addEventListener('keydown', (e) => {
        if ((e.target as HTMLElement).localName !== 'textarea') return;
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          this.send();
        }
      });
      this.addEventListener('input', () => this.syncSend());
    }

    connectedCallback(): void {
      this.box();
    }

    show(v: ComposerView): void {
      this.view = v;
      const ta = this.box();
      ta.placeholder = v.placeholder;
      ta.disabled = v.shut !== undefined;
      this.toggleAttribute('data-shut', v.shut !== undefined);
      const line = this.querySelector<HTMLElement>('.chat-cmp-line')!;
      line.innerHTML = lineTemplate(v);
      line.hidden = line.innerHTML === '';
      this.syncSend();
    }

    setChips(chips: readonly Chip[]): void {
      this.current = [...chips];
      this.drawChips();
    }

    get chips(): readonly Chip[] {
      return this.current;
    }

    setContext(context: ComposerContext | null): void {
      this.context = context;
      if (!context?.lines.length) this.open = false;
      this.drawChips();
    }

    get attached(): boolean {
      return this.current.length > 0 || this.context !== null;
    }

    get text(): string {
      return this.box().value;
    }

    set text(value: string) {
      this.box().value = value;
      this.syncSend();
    }

    clear(): void {
      this.text = '';
      this.setChips([]);
    }

    focusText(): void {
      this.box().focus({ preventScroll: true });
    }

    /** The textarea, drawing the composer first if it is not drawn yet. */
    private box(): HTMLTextAreaElement {
      let ta = this.querySelector<HTMLTextAreaElement>('textarea.chat-cmp-text');
      if (ta) return ta;
      this.innerHTML = composerTemplate('Message to the agent', TEXT_MAX);
      ta = this.querySelector<HTMLTextAreaElement>('textarea.chat-cmp-text')!;
      this.show(this.view);
      this.drawChips();
      return ta;
    }

    /** The chips row, the context's lines with it; Send follows what is attached. Focus on the
     *  context chip stays on it when the row is drawn again. */
    private drawChips(): void {
      this.box();
      const row = this.querySelector<HTMLElement>('.chat-cmp-chips')!;
      const focused = row.contains(document.activeElement) && document.activeElement?.matches('button.chat-cmp-ctx');
      row.innerHTML = chipsTemplate(this.current, this.context, this.open, this.linesId);
      row.hidden = !this.attached;
      if (focused) this.querySelector<HTMLElement>('button.chat-cmp-ctx')?.focus();
      this.syncSend();
    }

    /** Open or close the context's lines. */
    private toggle(): void {
      this.open = !this.open;
      this.drawChips();
    }

    private syncSend(): void {
      const b = this.querySelector<HTMLButtonElement>('button.chat-cmp-send');
      if (b) b.disabled = sendIntent(this.text, this.view, this.attached) === 'skip';
    }

    private send(): void {
      if (sendIntent(this.text, this.view, this.attached) === 'skip') return;
      const detail: ChatSendDetail = { text: this.text, chips: [...this.current] };
      this.dispatchEvent(new CustomEvent<ChatSendDetail>(CHAT_SEND_EVENT, { bubbles: true, detail }));
    }

    private removeChip(key: string): void {
      const chip = this.current.find((c) => chipKey(c) === key);
      if (!chip) return;
      this.setChips(withoutChip(this.current, key));
      this.focusText();
      this.dispatchEvent(new CustomEvent<ChatChipRemoveDetail>(CHAT_CHIP_REMOVE_EVENT, { bubbles: true, detail: { chip } }));
    }
  }

  customElements.define(CHAT_COMPOSER_TAG, ChatComposer);
}
