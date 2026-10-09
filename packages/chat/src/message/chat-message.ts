// Chat message pattern, layer 3 (element): <chat-message>, in light DOM. One message in the feed:
// the person's (right, with its chips) or the agent's (left; `data-interim` for words said partway
// through a turn). It only draws; it raises nothing. Browser only.
import type { RenderText } from '../esc.ts';
import type { AgentEntry, PersonEntry } from '../feed/feed-core.ts';
import { messageTemplate } from './message-template.ts';

export const CHAT_MESSAGE_TAG = 'chat-message';

export interface ChatMessageElement extends HTMLElement {
  show(m: PersonEntry | AgentEntry, render: RenderText): void;
}

export function defineChatMessage(): void {
  if (customElements.get(CHAT_MESSAGE_TAG)) return;

  class ChatMessage extends HTMLElement implements ChatMessageElement {
    show(m: PersonEntry | AgentEntry, render: RenderText): void {
      this.dataset.from = m.type;
      this.toggleAttribute('data-interim', m.type === 'agent' && m.interim);
      this.innerHTML = messageTemplate(m, render);
    }
  }

  customElements.define(CHAT_MESSAGE_TAG, ChatMessage);
}
