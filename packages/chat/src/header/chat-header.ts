// Chat header pattern, layer 3 (element): <chat-header>, in light DOM. It raises `chat-stop`,
// `chat-new-session` (the host confirms first) and `chat-pick` (an agent or a model chosen for the
// next session); it never calls the server. With a list of what was allowed for the folder it also draws
// a button that opens it (`chat-allowed`: the host refreshes the list) and raises `chat-forget` for a yes
// the person chose to forget (the host confirms, then forgets). The rest of the header is drawn once and
// updated in place (morph.ts), so a picker is never thrown away and drawn again while data arrives (point 387);
// the list stays where it is; Esc, a press outside or the button closes it. Browser only.
import { CHAT_ALLOWED_EVENT, CHAT_FORGET_EVENT, CHAT_NEW_SESSION_EVENT, CHAT_PICK_EVENT, CHAT_STOP_EVENT } from '../events.ts';
import { morphNodes } from '../morph.ts';
import type { AllowedItem, HeaderView } from './header-core.ts';
import { allowedTemplate, headerTemplate } from './header-template.ts';

export const CHAT_HEADER_TAG = 'chat-header';
/** The `chat-pick` event's detail (bubbles). */
export interface ChatPickDetail { field: 'agent' | 'model'; id: string }
/** The `chat-forget` event's detail (bubbles): the kept yes the person chose to forget. */
export interface ChatForgetDetail { id: string }

export interface ChatHeaderElement extends HTMLElement {
  show(v: HeaderView): void;
}

let made = 0;
const TOGGLE = 'button[data-allowed]';

export function defineChatHeader(): void {
  if (customElements.get(CHAT_HEADER_TAG)) return;

  class ChatHeader extends HTMLElement implements ChatHeaderElement {
    /** The list of what was allowed: made once and kept, so focus in it survives the header's redraws. */
    private box: HTMLElement | null = null;
    private drawn = '';
    private items: readonly AllowedItem[] = [];
    private open = false;
    /** A yes sent to be forgotten and where it stood: focus goes to the row now there once it is gone. */
    private forgetting: { id: string; at: number } | null = null;
    private readonly popId = `chat-hd-pop-${++made}`;

    constructor() {
      super();
      this.addEventListener('click', (e) => {
        const t = e.target as HTMLElement;
        const forget = t.closest<HTMLButtonElement>('button[data-forget]');
        if (forget) return this.forget(forget.dataset.forget ?? '');
        if (t.closest(TOGGLE)) return this.toggle();
        const b = t.closest<HTMLButtonElement>('button[data-do]');
        if (!b || b.disabled) return;
        const type = b.dataset.do === 'stop' ? CHAT_STOP_EVENT : CHAT_NEW_SESSION_EVENT;
        this.dispatchEvent(new CustomEvent(type, { bubbles: true }));
      });
      this.addEventListener('change', (e) => {
        const s = (e.target as HTMLElement).closest<HTMLSelectElement>('select[data-pick]');
        if (!s) return;
        const detail: ChatPickDetail = { field: s.dataset.pick as ChatPickDetail['field'], id: s.value };
        this.dispatchEvent(new CustomEvent<ChatPickDetail>(CHAT_PICK_EVENT, { bubbles: true, detail }));
      });
      this.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape' || !this.open || !this.box?.contains(e.target as Node)) return;
        e.preventDefault();
        e.stopPropagation();
        this.toggle(false);
      });
    }

    /** A press outside the list (and outside a dialog the host asks in) closes it. */
    private readonly away = (e: PointerEvent) => {
      const t = e.target as Element;
      if (this.open && !this.box?.contains(t) && !t.closest('dialog')) this.toggle(false, false);
    };

    connectedCallback(): void { document.addEventListener('pointerdown', this.away); }
    disconnectedCallback(): void { document.removeEventListener('pointerdown', this.away); }

    show(v: HeaderView): void {
      // Drawn once, then updated in place; focus on a control that is put in new (a picker becoming plain
      // text, or back) goes to its new one, and from Stop turning off to New session.
      const focused = this.contains(document.activeElement) && !this.box?.contains(document.activeElement) ? (document.activeElement as HTMLElement) : null;
      const at = focused?.dataset.do ?? focused?.dataset.pick;
      this.dataset.status = v.status.kind;
      const main = document.createElement('template');
      main.innerHTML = headerTemplate(v);
      const now = [...this.childNodes].filter((n) => n !== this.box);
      if (!morphNodes(now, [...main.content.childNodes])) {
        for (const n of now) n.remove();
        this.prepend(...main.content.childNodes);
      }
      this.list(v.allowed);
      if (!at) return;
      const again = this.querySelector<HTMLElement>(`[data-do="${at}"]:not(:disabled), [data-pick="${at}"]`)
        ?? this.querySelector<HTMLElement>('[data-do="new"]');
      if (again !== document.activeElement) again?.focus({ preventScroll: true });
    }

    /** Draw the list of what was allowed, only when it changed; none given, none drawn. */
    private list(allowed: readonly AllowedItem[] | undefined): void {
      if (!allowed) {
        this.box?.remove();
        [this.box, this.drawn, this.open, this.items] = [null, '', false, []];
        return;
      }
      this.items = allowed;
      const html = allowedTemplate(allowed, this.open, this.popId);
      if (this.box && html === this.drawn) return;
      const box = this.box ?? this.appendChild(Object.assign(document.createElement('div'), { className: 'chat-hd-allowed' }));
      const inside = box.contains(document.activeElement) ? (document.activeElement as HTMLElement) : null;
      const row = inside?.dataset.forget;
      this.box = box;
      this.drawn = html;
      box.innerHTML = html;
      this.refocus(box, row, inside !== null);
    }

    /** Focus after a redraw of the list: the same row; a row gone, the one now at its place, else the button. */
    private refocus(box: HTMLElement, row: string | undefined, had: boolean): void {
      const gone = this.forgetting && !this.items.some((a) => a.id === this.forgetting!.id) ? this.forgetting : null;
      if (!had && !(gone && (document.activeElement === document.body || document.activeElement === null))) return;
      const forgets = [...box.querySelectorAll<HTMLElement>('button[data-forget]')];
      const same = row ? forgets.find((b) => b.dataset.forget === row) : undefined;
      const next = same ?? (gone ? forgets[Math.min(gone.at, forgets.length - 1)] : undefined) ?? box.querySelector<HTMLElement>(TOGGLE);
      if (gone) this.forgetting = null;
      next?.focus({ preventScroll: true });
    }

    /** Open or close the list; opening asks the host to bring it up to date; closing by key gives focus back. */
    private toggle(open = !this.open, focusBack = true): void {
      if (!this.box || open === this.open) return;
      this.open = open;
      this.drawn = '';
      this.list(this.items);
      if (open) this.dispatchEvent(new CustomEvent(CHAT_ALLOWED_EVENT, { bubbles: true }));
      else if (focusBack) this.box.querySelector<HTMLElement>(TOGGLE)?.focus({ preventScroll: true });
    }

    private forget(id: string): void {
      this.forgetting = { id, at: this.items.findIndex((a) => a.id === id) };
      this.dispatchEvent(new CustomEvent<ChatForgetDetail>(CHAT_FORGET_EVENT, { bubbles: true, detail: { id } }));
    }
  }

  customElements.define(CHAT_HEADER_TAG, ChatHeader);
}
