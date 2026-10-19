// The chat feed follows the latest unless the person scrolls away (chat-follow-latest): a reply that
// grows stays in view while the composer resizes, chips change or the Working line comes and goes;
// a panel that opens shows the latest; the person's wheel up stops it and "Jump to latest" shows;
// sending, the button, or scrolling back to the end follows again. The feed is driven in the gallery
// (the 'empty' sample's panel: header, feed, composer) with long states, so a reply can grow chunk
// by chunk; the last test sends through the board's own panel (chat-server.ts, the fake `claude`).
import type { Locator, Page } from '@playwright/test';
import type { ChatServer } from './chat-server.ts';
import { startChatServer } from './chat-server.ts';
import { expect, test } from './helpers.ts';

const feed = (page: Page) => page.locator('.g-chat-sample[data-state="empty"] chat-feed');
const log = (feed: Locator) => feed.getByRole('log', { name: 'Conversation' });
const jump = (feed: Locator) => feed.getByRole('button', { name: 'Jump to latest' });
/** Pixels between the view and the end of the log. */
const gap = (l: Locator) => l.evaluate((el) => Math.round(el.scrollHeight - el.scrollTop - el.clientHeight));

/** Show `n` long agent entries; the last one has `extra` more lines (a reply that is still growing). */
const showReply = (f: Locator, n: number, extra = 0) => f.evaluate((el, [count, more]) => {
  const entries = Array.from({ length: count as number }, (_, i) => ({
    type: 'agent', key: `k${i}`, interim: false,
    text: `Line ${i}. `.repeat(12) + (i === (count as number) - 1 ? '\n\nmore words here. '.repeat(more as number) : ''),
  }));
  (el as unknown as { show(s: unknown): void }).show({ seq: 1, entries, running: [], pending: [], busy: true });
}, [n, extra]);

test.beforeEach(async ({ page }) => {
  await page.goto('/gallery.html?flags=chatPanel');
  await expect(feed(page)).toBeVisible();
  await feed(page).scrollIntoViewIfNeeded();
});

test('(a) a reply that grows stays in view while the composer grows by 80px mid-reply', async ({ page }) => {
  const f = feed(page);
  await showReply(f, 30);
  await expect.poll(() => gap(log(f))).toBeLessThanOrEqual(1);
  await f.evaluate((el) => { el.parentElement!.querySelector<HTMLElement>('chat-composer')!.style.paddingBottom = '80px'; });
  for (const more of [1, 3, 6]) {
    await showReply(f, 30, more);
    await expect.poll(() => gap(log(f))).toBeLessThanOrEqual(1);
  }
  await expect(jump(f)).toBeHidden();
});

test('(b) the board selection (chips) changing mid-reply keeps the reply pinned', async ({ page }) => {
  const f = feed(page);
  await showReply(f, 30);
  await f.evaluate((el) => {
    const chips = Array.from({ length: 40 }, (_, i) => ({ kind: 'card', ref: i + 1, label: `Card number ${i + 1}` }));
    el.parentElement!.querySelector<{ setChips(c: unknown): void } & HTMLElement>('chat-composer')!.setChips(chips);
  });
  await showReply(f, 30, 2);
  await expect.poll(() => gap(log(f))).toBeLessThanOrEqual(1);
});

test('(c) a panel that opens shows the latest, not the top of the history', async ({ page }) => {
  const f = feed(page);
  await f.evaluate((el) => {
    const box = document.createElement('div');
    box.id = 'closed-panel';
    box.className = 'chat-panel g-chat';
    box.style.display = 'none';
    const mine = document.createElement('chat-feed');
    box.append(mine);
    el.closest('.g-chat-sample')!.append(box);
    (mine as unknown as { show(s: unknown): void }).show({
      seq: 1, running: [], pending: [], busy: false,
      entries: Array.from({ length: 40 }, (_, i) => ({ type: 'agent', key: `k${i}`, interim: false, text: `Line ${i}. `.repeat(12) })),
    });
  });
  const opened = page.locator('#closed-panel chat-feed');
  await page.locator('#closed-panel').evaluate((el) => { el.style.display = ''; });
  await expect(opened).toBeVisible();
  expect(await log(opened).evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(500);
  await expect.poll(() => gap(log(opened))).toBeLessThanOrEqual(1);
});

test('(d) the wheel up stops following: a new chunk does not move the view and Jump to latest shows', async ({ page }) => {
  const f = feed(page);
  await showReply(f, 30);
  await expect.poll(() => gap(log(f))).toBeLessThanOrEqual(1);
  await log(f).hover();
  await page.mouse.wheel(0, -600);
  await expect(jump(f)).toBeVisible();
  const top = await log(f).evaluate((el) => el.scrollTop);
  await showReply(f, 30, 4);
  await showReply(f, 31, 4);
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  expect(await log(f).evaluate((el) => el.scrollTop)).toBe(top);
  expect(await gap(log(f))).toBeGreaterThan(300);
  // Pressing it follows again.
  await jump(f).click();
  await expect.poll(() => gap(log(f))).toBeLessThanOrEqual(1);
  await expect(jump(f)).toBeHidden();
  await showReply(f, 32, 4);
  await expect.poll(() => gap(log(f))).toBeLessThanOrEqual(1);
});

test('(e) sending a message follows again (the host calls follow())', async ({ page }) => {
  const f = feed(page);
  await showReply(f, 30);
  await log(f).hover();
  await page.mouse.wheel(0, -600);
  await expect(jump(f)).toBeVisible();
  await f.evaluate((el) => (el as unknown as { follow(): void }).follow());
  await expect.poll(() => gap(log(f))).toBeLessThanOrEqual(1);
  await expect(jump(f)).toBeHidden();
});

test('(f) scrolling back to the end by hand follows again', async ({ page }) => {
  const f = feed(page);
  await showReply(f, 30);
  await log(f).hover();
  await page.mouse.wheel(0, -600);
  await expect(jump(f)).toBeVisible();
  await page.mouse.wheel(0, 5000);
  await expect(jump(f)).toBeHidden();
  await showReply(f, 30, 5);
  await expect.poll(() => gap(log(f))).toBeLessThanOrEqual(1);
});

test('the keys that scroll up in the log stop following; the page scrolling never does', async ({ page }) => {
  const f = feed(page);
  await showReply(f, 30);
  await expect.poll(() => gap(log(f))).toBeLessThanOrEqual(1);
  await log(f).focus();
  await page.keyboard.press('PageUp');
  await expect(jump(f)).toBeVisible();
  await jump(f).click();
  await expect(jump(f)).toBeHidden();
  // The page growing the log, with nobody scrolling, leaves it following.
  await showReply(f, 30, 8);
  await expect.poll(() => gap(log(f))).toBeLessThanOrEqual(1);
  await expect(jump(f)).toBeHidden();
});

test('Jump to latest is keyboard reachable and labelled', async ({ page }) => {
  const f = feed(page);
  await showReply(f, 30);
  await log(f).hover();
  await page.mouse.wheel(0, -600);
  await jump(f).focus();
  await expect(jump(f)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect.poll(() => gap(log(f))).toBeLessThanOrEqual(1);
});

test.describe('through the board\'s own panel', () => {
  let srv: ChatServer;
  test.beforeAll(async () => {
    srv = await startChatServer();
    await srv.write('scratch', [
      { type: 'board', key: 'board', title: 'Scratch' }, { type: 'region', key: 'ideas', region: { id: 'ideas', title: 'Ideas', mode: 'grid' } },
      { type: 'node', key: 'q1', node: { region: 'ideas', kind: 'question', title: 'Ship on Friday?' } },
    ]);
  });
  test.afterAll(async () => { await srv.close(); });

  test('sending from the composer pins the latest even after scrolling away; reopening shows the latest', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 420 });
    await page.goto(`${srv.base}/?vbwork&flags=chatPanel#scratch`);
    await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
    await page.locator('#chat-toggle').click();
    const side = page.locator('#chat');
    const text = side.getByRole('textbox', { name: 'Message to the agent' });
    const conversation = side.getByRole('log', { name: 'Conversation' });
    let runs = 0;
    for (const words of ['First question', 'Second question', 'Third question']) {
      await text.fill(words);
      await text.press('Enter');
      await srv.fake.run(++runs);
      await expect(side.locator('.chat-hd-status')).toHaveText('Status: Ready');
    }
    expect(await conversation.evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(100);
    await expect.poll(() => gap(conversation)).toBeLessThanOrEqual(1);
    // Away, then a message: the view is at the latest, with the message in it.
    await conversation.hover();
    await page.mouse.wheel(0, -2000);
    await expect(jump(side)).toBeVisible();
    await text.fill('Fourth question');
    await text.press('Enter');
    await expect(conversation.getByText('Fourth question')).toBeInViewport();
    await srv.fake.run(++runs);
    await expect.poll(() => gap(conversation)).toBeLessThanOrEqual(1);
    // Closed and opened: the latest.
    await page.locator('#chat-toggle').click();
    await expect(side).toBeHidden();
    await page.locator('#chat-toggle').click();
    await expect(side).toBeVisible();
    await expect.poll(() => gap(conversation)).toBeLessThanOrEqual(1);
  });
});
