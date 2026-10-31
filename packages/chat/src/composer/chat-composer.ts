// Composer pattern, layer 3 (element): <chat-composer>, in light DOM. The text and the chips the
// host attaches, each removable, and the host's context chip (`setContext`), which opens a preview
// of exactly what goes: on hover (it stays while the pointer is on the chip or the preview), or by
// click, Enter or Space (it stays until pressed again, Esc, or focus leaves both); Esc closes it with
// focus on the chip. Enter sends, Shift+Enter breaks the line. It raises `chat-send` (the words and
// the chips) and `chat-chip-remove`; it never calls the server, and it keeps the words until the host
// calls `clear()` once the message went through. With the host's words for attaching (composer-attach.ts,
// D-068) it raises `chat-files` with each `File` and `chat-file-remove`, and the host says where each file
// stands (`setFiles`); every change of state is announced. Browser only.
import type { Chip } from '../events.ts';
import { CHAT_CHIP_REMOVE_EVENT, CHAT_FILE_REMOVE_EVENT, CHAT_SEND_EVENT, TEXT_MAX } from '../events.ts';
import type { ChatFileRemoveDetail } from './composer-attach.ts';
import { announcer, drawAttaching, drawDoing, dropArea, removeButton, wireAttaching } from './composer-attach.ts';
import type { ComposerContext, ComposerFile, ComposerView } from './composer-core.ts';
import { chipKey, COMPOSER_KEYS, filesReady, filesUploading, newestFile, onlyDoingMoved, sendIntent, whyFilesHold, withoutChip } from './composer-core.ts';
import { chipsTemplate, composerTemplate, lineTemplate, previewTemplate } from './composer-template.ts';

export const CHAT_COMPOSER_TAG = 'chat-composer';
/** The `chat-send` event's detail (bubbles). */
export interface ChatSendDetail { text: string; chips: Chip[] }
/** The `chat-chip-remove` event's detail (bubbles): the chip the person took off. */
export interface ChatChipRemoveDetail { chip: Chip }

export interface ChatComposerElement extends HTMLElement {
  show(v: ComposerView): void;
  setChips(chips: readonly Chip[]): void;
  readonly chips: readonly Chip[];
  /** The host's context beside the chips (null: none): one chip, its summary, opening a preview of
   *  exactly what goes; it goes with every message the host sends. */
  setContext(context: ComposerContext | null): void;
  /** Take a dropped file anywhere on `area`, a panel the host keeps around the composer; the drop target still shows here. */
  dropArea(area: HTMLElement): void;
  /** Where each attached file stands: the host's to say. */
  setFiles(files: readonly ComposerFile[]): void;
  /** Whether anything is attached: a chip, the context or a file that is ready. */
  readonly attached: boolean;
  text: string;
  /** Empties the words, the chips and the files (the message went through). */
  clear(): void;
  focusText(): void;
}

let made = 0;
/** How long the preview opened by hover stays after the pointer leaves, so it can cross to it. */
const HOVER_GRACE_MS = 200;
const CHIP = 'button.chat-cmp-ctx';
const POP = '.chat-cmp-pop';

export function defineChatComposer(): void {
  if (customElements.get(CHAT_COMPOSER_TAG)) return;

  class ChatComposer extends HTMLElement implements ChatComposerElement {
    private view: ComposerView = { send: true, hint: COMPOSER_KEYS, placeholder: 'Message the agent' };
    private current: readonly Chip[] = [];
    private files: readonly ComposerFile[] = [];
    private context: ComposerContext | null = null;
    /** The preview: closed, opened by hover, or held open (click, Enter, Space). */
    private open: false | 'hover' | 'held' = false;
    private leaving = 0;
    private drawing = false;
    /** Whether the pointer is on the chip or the preview. */
    private over = false;
    /** Closed by the person while the pointer is on them: hover opens it again only after leaving. */
    private quiet = false;
    private readonly popId = `chat-cmp-pop-${++made}`;
    private readonly say = announcer(this, () => this.view.files, () => this.files);
    private readonly drops = dropArea(this, () => this.view);

    constructor() {
      super();
      this.addEventListener('click', (e) => {
        const t = e.target as HTMLElement;
        const x = t.closest<HTMLButtonElement>('button.chat-chip-x');
        if (x?.dataset.file) return this.removeFile(x.dataset.file);
        if (x) return this.removeChip(x.dataset.chip ?? '');
        if (t.closest(CHIP)) return this.toggle();
        if (t.closest('button.chat-cmp-send')) this.send();
      });
      this.addEventListener('pointerover', (e) => this.hover(e.target as Element));
      this.addEventListener('pointerout', (e) => this.hover(e.relatedTarget as Element | null));
      this.addEventListener('focusout', (e) => {
        if (this.open === 'held' && !this.drawing && !this.inPreview(e.relatedTarget as Element | null)) this.preview(false);
      });
      this.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.open) {
          e.preventDefault();
          e.stopPropagation();
          this.close();
          return this.querySelector<HTMLElement>(CHIP)?.focus();
        }
        if ((e.target as HTMLElement).localName !== 'textarea') return;
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
          e.preventDefault();
          this.send();
        }
      });
      this.addEventListener('input', () => this.syncSend());
      wireAttaching(this, () => this.view);
    }

    /** A press anywhere off the chip and the preview closes one held open. */
    private readonly away = (e: PointerEvent) => {
      if (this.open === 'held' && !this.inPreview(e.target as Element)) this.preview(false);
    };

    connectedCallback(): void {
      this.box();
      this.drops.on();
      document.addEventListener('pointerdown', this.away);
    }

    disconnectedCallback(): void {
      this.drops.off();
      document.removeEventListener('pointerdown', this.away);
      window.clearTimeout(this.leaving);
    }

    show(v: ComposerView): void {
      this.view = v;
      const ta = this.box();
      ta.placeholder = v.placeholder;
      ta.disabled = v.shut !== undefined;
      this.toggleAttribute('data-shut', v.shut !== undefined);
      drawAttaching(this, v);
      this.drawLine();
      this.syncSend();
    }

    /** The line under the box; while a file uploads, why Send waits. */
    private drawLine(): void {
      const v = this.view;
      const line = this.querySelector<HTMLElement>('.chat-cmp-line')!;
      const waits = v.files && !v.shut ? (filesUploading(this.files) ? v.files.waits : whyFilesHold(this.files)) : undefined;
      line.innerHTML = lineTemplate(waits ? { ...v, hint: waits } : v);
      line.hidden = line.innerHTML === '';
    }

    readonly dropArea = (area: HTMLElement): void => this.drops.move(area);

    setChips(chips: readonly Chip[]): void {
      this.current = [...chips];
      this.drawChips();
    }

    get chips(): readonly Chip[] {
      return this.current;
    }

    setFiles(files: readonly ComposerFile[]): void {
      this.box();
      if (onlyDoingMoved(this.files, files)) {
        this.files = [...files];
        return drawDoing(this, files);
      }
      const newest = newestFile(this.files, files);
      this.files = [...files];
      this.say();
      this.drawChips();
      this.drawLine();
      if (newest) this.querySelector(`button[data-file="${CSS.escape(newest.id)}"]`)?.closest('li')?.scrollIntoView({ block: 'nearest' });
    }

    setContext(context: ComposerContext | null): void {
      this.context = context;
      if (!context?.text) this.open = false;
      this.drawChips();
    }

    get attached(): boolean {
      return this.current.length > 0 || this.context !== null || filesReady(this.files);
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
      this.files = [];
      this.setChips([]);
      this.drawLine();
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

    /** The chips row, the preview with it; Send follows what is attached. Focus on the context chip,
     *  in the preview or on a remove button, and the preview's scroll, stay when the row is drawn again
     *  (a file's state can move while the person is on another chip). */
    private drawChips(): void {
      this.box();
      const row = this.querySelector<HTMLElement>('.chat-cmp-chips')!;
      const active = document.activeElement;
      const focused = active && row.contains(active) ? removeButton(active as HTMLElement) ?? [CHIP, POP].find((sel) => active.matches(sel)) : undefined;
      const scrolled = this.querySelector<HTMLElement>(POP)?.scrollTop ?? 0;
      const listed = row.querySelector('.chat-chips')?.scrollTop ?? 0;
      this.drawing = true;
      row.innerHTML = chipsTemplate(this.current, this.context, this.open !== false, this.popId, this.files, this.view.files);
      this.drawing = false;
      row.hidden = row.innerHTML === '';
      const pop = this.querySelector<HTMLElement>(POP);
      if (pop) pop.scrollTop = scrolled;
      row.querySelector('.chat-chips')?.scrollTo({ top: listed });
      if (focused) this.querySelector<HTMLElement>(focused)?.focus({ preventScroll: true });
      this.syncSend();
    }

    /** Click, Enter or Space on the chip: hold the preview open, or close it. */
    private toggle(): void {
      if (this.open === 'held') this.close(); else this.preview('held');
    }

    private close(): void {
      this.quiet = this.over;
      this.preview(false);
    }

    /** Open or close the preview in place: the chip under the pointer is never drawn again. */
    private preview(open: false | 'hover' | 'held'): void {
      window.clearTimeout(this.leaving);
      if (open === this.open) return;
      this.open = open;
      const chip = this.querySelector<HTMLElement>(CHIP);
      this.drawing = true;
      this.querySelector(POP)?.remove();
      this.drawing = false;
      if (!chip || !this.context) return;
      chip.setAttribute('aria-expanded', String(open !== false));
      if (open === false) return chip.removeAttribute('aria-controls');
      chip.setAttribute('aria-controls', this.popId);
      this.querySelector('.chat-cmp-chips')!.insertAdjacentHTML('beforeend', previewTemplate(this.context, this.popId));
    }

    /** Whether `el` is the context chip or in its preview. */
    private inPreview(el: Element | null): boolean {
      return !!el && !!el.closest(`${CHIP}, ${POP}`) && this.contains(el);
    }

    /** The pointer is now on `el`: on the chip or the preview it opens (or stays); off them, a
     *  preview opened by hover closes after a moment. */
    private hover(el: Element | null): void {
      this.over = this.inPreview(el);
      if (this.over) {
        window.clearTimeout(this.leaving);
        if (!this.open && !this.quiet && this.querySelector(CHIP)) this.preview('hover');
        return;
      }
      this.quiet = false;
      if (this.open === 'hover') {
        window.clearTimeout(this.leaving);
        this.leaving = window.setTimeout(() => this.preview(false), HOVER_GRACE_MS);
      }
    }

    private syncSend(): void {
      const b = this.querySelector<HTMLButtonElement>('button.chat-cmp-send');
      if (b) b.disabled = sendIntent(this.text, this.view, this.attached, this.files) === 'skip';
    }

    private send(): void {
      if (sendIntent(this.text, this.view, this.attached, this.files) === 'skip') return;
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

    private removeFile(id: string): void {
      const file = this.files.find((f) => f.id === id);
      if (!file) return;
      this.setFiles(this.files.filter((f) => f !== file));
      this.focusText();
      if (this.view.files) this.say(this.view.files.removed(file.name));
      this.dispatchEvent(new CustomEvent<ChatFileRemoveDetail>(CHAT_FILE_REMOVE_EVENT, { bubbles: true, detail: { id } }));
    }
  }

  customElements.define(CHAT_COMPOSER_TAG, ChatComposer);
}
