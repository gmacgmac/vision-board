// Front door of packages/chat (D-016, D-037): hosts import from here only. It imports nothing from
// this repo, so it moves into another host (nclite) unchanged. Element files are safe to export
// here: nothing in them touches the DOM until defineChatElements() runs. The events' names are in
// events.ts, so a host can listen without loading the elements (the board loads them on first open).
// Styles: `#chat/styles.css` (src/chat.css); Node-side file paths: `#chat/files` (D-059).
export * from './events.ts';
export { esc, plainText } from './esc.ts';
export type { RenderText } from './esc.ts';
export * from './feed/feed-core.ts';
export * from './feed/feed-template.ts';
export * from './conditions.ts';
export * from './approval/approval-core.ts';
export * from './approval/approval-template.ts';
export * from './message/message-template.ts';
export * from './composer/composer-core.ts';
export * from './composer/composer-template.ts';
export * from './header/header-core.ts';
export * from './header/header-template.ts';
export { CHAT_APPROVAL_TAG } from './approval/chat-approval.ts';
export type { AnswerPhase, ChatAnswerDetail, ChatApprovalElement } from './approval/chat-approval.ts';
export { CHAT_FEED_TAG } from './feed/chat-feed.ts';
export type { ChatChangeDetail, ChatFeedElement, ChatFeedOptions } from './feed/chat-feed.ts';
export { CHAT_MESSAGE_TAG } from './message/chat-message.ts';
export type { ChatMessageElement } from './message/chat-message.ts';
export { CHAT_COMPOSER_TAG } from './composer/chat-composer.ts';
export type { ChatChipRemoveDetail, ChatComposerElement, ChatSendDetail } from './composer/chat-composer.ts';
export { CHAT_HEADER_TAG } from './header/chat-header.ts';
export type { ChatForgetDetail, ChatHeaderElement, ChatPickDetail } from './header/chat-header.ts';
export { defineChatElements } from './elements.ts';
