// The chat panel as its specs drive it (chat-*.spec.ts), one definition each: the side panel, its
// toggle, the composer and its Send, the conversation log, the header's status, and a card on the
// chat server's `ideas` container as an agent writes it.
import type { Page } from '@playwright/test';
import { bid } from './helpers.ts';

export const side = (page: Page) => page.locator('#chat');
export const toggle = (page: Page) => page.locator('#chat-toggle');
export const text = (page: Page) => side(page).getByRole('textbox', { name: 'Message to the agent' });
export const sendButton = (page: Page) => page.locator(bid('send'));
export const log = (page: Page) => side(page).getByRole('log', { name: 'Conversation' });
export const status = (page: Page) => side(page).locator('.chat-hd-status');
export const card = (key: string, title: string) => ({ type: 'node', key, node: { region: 'ideas', kind: 'question', title } });
