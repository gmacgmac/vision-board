// The chat panel's drawing, loaded the first time the panel opens (lazy-load-chat-panel): the chat
// package's elements and their styles, and the three of them made and put in the panel. Everything the
// board needs while the panel is closed stays in chat-panel.ts, chat-rules.ts and chat-bridge.ts, which
// know these elements by their types only (`import type`) and by the event names in packages/chat
// events.ts; nothing outside this file and the gallery imports the element code or its CSS, so the
// build keeps them in a chunk of their own.
import '../../../../packages/chat/src/chat.css';
import '../styles/chat-host.css';
import type { ChatComposerElement, ChatFeedElement, ChatHeaderElement } from '../../../../packages/chat/src/index.ts';
import { defineChatElements } from '../../../../packages/chat/src/index.ts';

export interface ChatView {
  header: ChatHeaderElement;
  feed: ChatFeedElement;
  composer: ChatComposerElement;
}

/** Define the elements (once) and put a header, a feed and a composer in `panel`. */
export function mountChatView(panel: HTMLElement): ChatView {
  defineChatElements();
  const header = document.createElement('chat-header') as ChatHeaderElement;
  const feed = document.createElement('chat-feed') as ChatFeedElement;
  const composer = document.createElement('chat-composer') as ChatComposerElement;
  panel.append(header, feed, composer);
  return { header, feed, composer };
}
