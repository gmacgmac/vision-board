// Chat header pattern, layer 3 (element): <chat-header>, in light DOM. It raises `chat-stop`,
// `chat-new-session` (the host confirms first) and `chat-pick` (an agent or a model chosen for the
// next session); it never calls the server. Browser only.
import { CHAT_NEW_SESSION_EVENT, CHAT_PICK_EVENT, CHAT_STOP_EVENT } from '../events.ts';
import type { HeaderView } from './header-core.ts';
import { headerTemplate } from './header-template.ts';

export const CHAT_HEADER_TAG = 'chat-header';
/** The `chat-pick` event's detail (bubbles). */
export interface ChatPickDetail { field: 'agent' | 'model'; id: string }

export interface ChatHeaderElement extends HTMLElement {
  show(v: HeaderView): void;
}

export function defineChatHeader(): void {
  if (customElements.get(CHAT_HEADER_TAG)) return;

  class ChatHeader extends HTMLElement implements ChatHeaderElement {
    constructor() {
      super();
      this.addEventListener('click', (e) => {
        const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-do]');
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
    }

    show(v: HeaderView): void {
      // Focus stays on a button that is redrawn (Stop turning off moves it to New session).
      const focused = this.contains(document.activeElement) ? (document.activeElement as HTMLElement) : null;
      const at = focused?.dataset.do ?? focused?.dataset.pick;
      this.dataset.status = v.status.kind;
      this.innerHTML = headerTemplate(v);
      if (!at) return;
      const again = this.querySelector<HTMLElement>(`[data-do="${at}"]:not(:disabled), [data-pick="${at}"]`)
        ?? this.querySelector<HTMLElement>('[data-do="new"]');
      again?.focus({ preventScroll: true });
    }
  }

  customElements.define(CHAT_HEADER_TAG, ChatHeader);
}
