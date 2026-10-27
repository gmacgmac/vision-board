// The chat panel's drawing loads when the panel first opens (lazy-load-chat-panel): with the panel
// closed the page never asks for the chat's chunk and the chat's elements are not defined, while the
// chat's state still works from the start; opening it (the Chat button, T) loads it, focuses the
// composer, and a message goes; a panel kept open loads at start; a change chip's link in a card's
// updates loads it too; a chunk that does not come shows the error state with Try again, and one
// that is slow shows the loading state. The server is chat-server.ts's (the agent package's fake
// `claude`, never the real one).
import type { Page } from '@playwright/test';
import type { ChatServer } from './chat-server.ts';
import { startChatServer } from './chat-server.ts';
import { expect, test } from './helpers.ts';
import { side, text, toggle } from './chat-page.ts';

test.describe.configure({ mode: 'serial' });

let srv: ChatServer;
let runs = 0;
const CHUNK = /\/assets\/chat-(host|view)-[\w-]+\.(js|css)/;

test.beforeAll(async () => {
  srv = await startChatServer();
  // The recorded turn drew cards 1 and 2 on "scratch": the same board, so its change chip lands here.
  await srv.write('scratch', [
    { type: 'board', key: 'board', title: 'Scratch' }, { type: 'region', key: 'ideas', region: { id: 'ideas', title: 'Ideas', mode: 'grid' } },
    { type: 'node', key: 'q1', node: { region: 'ideas', kind: 'question', title: 'Ship on Friday?' } },
    { type: 'node', key: 'q2', node: { region: 'ideas', kind: 'question', title: 'Add dark mode?' } },
  ]);
});
test.afterAll(async () => { await srv.close(); });

/** Open the board and wait for its first draw. Returns the chat chunk requests seen so far, live. */
async function open(page: Page): Promise<string[]> {
  const seen: string[] = [];
  page.on('request', (r) => { if (CHUNK.test(r.url())) seen.push(r.url()); });
  await page.goto(`${srv.base}/?vbwork&flags=chatPanel#scratch`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
  return seen;
}
const defined = (page: Page) => page.evaluate(() => !!customElements.get('chat-feed') && !!customElements.get('chat-composer'));

test('closed, the chat\'s code is not requested and its elements are not defined; the toolbar still works', async ({ page }) => {
  const seen = await open(page);
  await expect(side(page)).toBeHidden();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await page.waitForLoadState('networkidle');
  expect(seen).toEqual([]);
  expect(await defined(page)).toBe(false);
  await expect(side(page).locator('chat-feed')).toHaveCount(0);
});

test('opening loads it once, focuses the composer, and a message goes; closing and opening again loads nothing more', async ({ page }) => {
  const seen = await open(page);
  await toggle(page).click();
  await expect(text(page)).toBeFocused();
  expect(await defined(page)).toBe(true);
  const loaded = seen.length;
  expect(loaded).toBeGreaterThan(0);
  await text(page).fill('Hello from the page test');
  await text(page).press('Enter');
  const given = await srv.fake.run(++runs);
  expect(given.prompt).toContain('Hello from the page test');
  await expect(side(page).getByRole('log', { name: 'Conversation' }).locator('chat-message[data-from="person"]')).toContainText('Hello from the page test');
  await toggle(page).click();
  await expect(side(page)).toBeHidden();
  await toggle(page).click();
  await expect(text(page)).toBeFocused();
  expect(seen.length).toBe(loaded);
});

test('T opens it and loads the drawing', async ({ page }) => {
  const seen = await open(page);
  await page.locator('#stage').focus();
  await page.keyboard.press('t');
  await expect(text(page)).toBeFocused();
  expect(seen.length).toBeGreaterThan(0);
});

test('a panel kept open loads at start, with the conversation, and the composer is not stolen', async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('vb.chat-open', '1'); } catch { /* none */ } });
  const seen = await open(page);
  await expect(side(page)).toBeVisible();
  await expect(text(page)).toBeVisible();
  await expect(side(page).getByRole('log', { name: 'Conversation' }).locator('chat-message[data-from="person"]')).toContainText('Hello from the page test');
  expect(seen.length).toBeGreaterThan(0);
  await expect(text(page)).not.toBeFocused();
});

test('a change chip\'s link in a card\'s updates, with the panel closed, loads it and shows the chat\'s write', async ({ page }) => {
  // The chat has a board write in it (the first message), and the panel was closed afterwards.
  await open(page);
  await toggle(page).click();
  await text(page).fill('Draw two questions');
  await text(page).press('Enter');
  await srv.fake.run(++runs);
  await expect(side(page).getByRole('button', { name: /Drew 2 cards on Scratch/ }).last()).toBeVisible();
  await toggle(page).click();
  await srv.write('scratch', [{ type: 'node', key: 'q1-v2', n: 1, node: { region: 'ideas', kind: 'question', title: 'Ship on Friday, or Monday?' } }]);
  await page.reload();
  const seen: string[] = [];
  page.on('request', (r) => { if (CHUNK.test(r.url())) seen.push(r.url()); });
  await expect(side(page)).toBeHidden();
  const updates = page.locator('vb-node[data-id="1"] [data-tab="updates"]');
  await expect(updates).toHaveText('1 update');
  await updates.click();
  expect(seen).toEqual([]);
  await page.locator('vb-node[data-id="1"]').getByRole('button', { name: 'Show in the chat' }).click();
  await expect(side(page)).toBeVisible();
  await expect(side(page).getByRole('log', { name: 'Conversation' }).getByRole('button', { name: /Drew 2 cards on Scratch/ }).last()).toBeFocused();
  expect(seen.length).toBeGreaterThan(0);
});

test.describe('a chunk that does not come', () => {
  // The refused request is the point: the page's failed-request tripwire expects it here and only here.
  test.use({ expected: { problems: [/^request failed: GET \S*\/assets\/chat-/, /Failed to load resource/, /Failed to fetch dynamically imported module/] } });

  test('a chunk that does not come shows the error state; Try again reloads the page and the chat comes', async ({ page }) => {
    await page.route(CHUNK, (route) => route.abort());
    await open(page);
    await toggle(page).click();
    const failed = side(page).getByRole('alert');
    await expect(failed).toContainText('The chat did not load.');
    await expect(side(page).locator('chat-feed')).toHaveCount(0);
    await page.unroute(CHUNK);
    await failed.getByRole('button', { name: 'Try again' }).click();
    await expect(text(page)).toBeVisible();
    await expect(side(page).getByRole('alert')).toHaveCount(0);
  });
});

test('a chunk that is slow shows the loading state until it comes', async ({ page }) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => { release = resolve; });
  await page.route(CHUNK, async (route) => { await held; await route.continue(); });
  await open(page);
  await toggle(page).click();
  await expect(side(page).getByRole('status').filter({ hasText: 'Loading the chat' })).toBeVisible();
  release();
  await expect(text(page)).toBeFocused();
  await expect(side(page).getByRole('status').filter({ hasText: 'Loading the chat' })).toHaveCount(0);
});

test('the gallery shows the sidebar before its drawing is there: loading, and the error with Try again', async ({ page }) => {
  await page.goto('/gallery.html?flags=chatPanel');
  const loading = page.locator('.g-chat-load[data-view="loading"]');
  await expect(loading.getByRole('status')).toHaveText('Loading the chat…');
  const failed = page.locator('.g-chat-load[data-view="error"]').getByRole('alert');
  await expect(failed).toContainText('The chat did not load.');
  await expect(failed.getByRole('button', { name: 'Try again' })).toBeEnabled();
});
