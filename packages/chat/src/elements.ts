// Defines the chat's elements. The host calls defineChatElements() once at start-up, before it
// creates any of them; each define is idempotent.
import { defineChatApproval } from './approval/chat-approval.ts';
import { defineChatComposer } from './composer/chat-composer.ts';
import { defineChatFeed } from './feed/chat-feed.ts';
import { defineChatHeader } from './header/chat-header.ts';
import { defineChatMessage } from './message/chat-message.ts';

export function defineChatElements(): void {
  defineChatMessage();
  defineChatApproval();
  defineChatFeed();
  defineChatComposer();
  defineChatHeader();
}
