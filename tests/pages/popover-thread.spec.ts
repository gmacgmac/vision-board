// Larger popovers and the exchange (popovers-larger-thread, rulings 1-4): a container's comment bubble is one step bigger
// and every popover reads the shared popover tokens; a click on a reply in a container's note block, or Enter on its
// note, opens the conversation beside what was pressed (review polish ruling 6); Esc closes and focus goes back. A node's
// notes are its conversation box (conversation-box.spec.ts). Each test draws its own board through the API.
import type { Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test, bid } from './helpers.ts';
import type { Theme } from './helpers.ts';
import type { Drawn } from './agent-board.ts';
import { act, card, draw, open, reply, tabTo } from './agent-board.ts';
import { bubble } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];
const shown = (page: Page) => bubble(page).locator('.vb-nb-reply');
const css = (l: Locator, prop: string) => l.evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), prop);

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

/** A card whose note was sent, with the agent's replies to it (oldest first). */
async function exchange(page: Page, request: Parameters<typeof draw>[0], texts: string[]): Promise<{ d: Drawn; n: number; note: number }> {
  const d = await draw(request, 1, 'thread');
  const [n] = d.n as [number];
  const note = await act(page, d, { action: 'comment', n, ver: 1, text: 'Do any accounts still pay quarterly?' });
  await act(page, d, { action: 'send', board: d.board });
  for (const t of texts) await reply(request, d, n, t, note);
  return { d, n, note };
}

/** The bubble's arrow points at the middle of `part` (it opened beside it), to the pixel. */
async function pointsAt(page: Page, part: Locator): Promise<void> {
  await expect(bubble(page)).not.toHaveAttribute('data-side', 'below');
  const [b, p] = [(await bubble(page).boundingBox())!, (await part.boundingBox())!];
  const arrow = parseFloat(await css(bubble(page), '--vb-arrow'));
  expect(Math.abs(b.y + arrow - (p.y + p.height / 2))).toBeLessThanOrEqual(2);
}

// The popover tokens: one text size, 15px, for everything in a popover (rulings 1 and 4, then the
// maintainer's changes, chats 698 and 701), labels and chips 13px, 360px wide.
const TEXT = '15px';

test('the comment bubble is bigger and one size: 15px for the text typed, heads, hint and buttons, 360px wide, 32px buttons', async ({ page, request }) => {
  const d = await draw(request, 1, 'thread');
  await open(page, d);
  await page.locator('vb-region[data-region="p"] .vb-region-comment').focus();
  await page.keyboard.press('Enter');
  const b = bubble(page);
  await expect(b).toBeVisible();
  expect(await css(b, 'width')).toBe('360px');
  expect(await css(b, 'font-size')).toBe(TEXT);
  expect(await css(b.getByLabel('Note text'), 'font-size')).toBe(TEXT);
  expect(await css(b.locator('.vb-nb-head'), 'font-size')).toBe(TEXT);
  expect(await css(b.locator('.vb-nb-hint'), 'font-size')).toBe(TEXT);
  expect(await css(b.locator('.vb-nb-btn').first(), 'font-size')).toBe(TEXT);
  for (const btn of await b.locator('.vb-nb-btn').all()) expect((await btn.boundingBox())!.height).toBeGreaterThanOrEqual(32);
  // Three lines tall at rest, in proportion to the text.
  expect((await b.getByLabel('Note text').boundingBox())!.height).toBeGreaterThanOrEqual(15 * 1.45 * 3);
  await page.keyboard.press('Escape');
  await expect(b).toBeHidden();
});

test('container: a click on a reply in the note block, or Enter on its note, opens the conversation beside it', async ({ page, request }) => {
  const d = await draw(request, 1, 'thread');
  const note = await act(page, d, { action: 'comment', board: d.board, region: 'p', text: 'Is the order right?' });
  await act(page, d, { action: 'send', board: d.board });
  await reply(request, d, d.n[0]!, 'Yes, in **price** order.', note);
  await open(page, d);
  const frame = page.locator('vb-region[data-region="p"]');
  await frame.locator('.vb-region-comment').focus();
  await frame.getByRole('button', { name: 'Show in container' }).click();
  // The preview under Comment closes first (it hangs over the block while focus is in it).
  await page.keyboard.press('Escape');
  await expect(frame.locator('.vb-note-pop')).toBeHidden();
  const block = frame.locator('.vb-region-note-block');
  await expect(block.locator('.vb-nblock-reply')).toHaveCount(1);
  await block.locator('.vb-nblock-reply').click();
  await expect(page.getByRole('dialog', { name: 'Conversation on container Pricing thread' })).toBeVisible();
  await expect(bubble(page)).toHaveAttribute('data-on', 'container');
  await expect(bubble(page).locator('.vb-nb-note-text')).toHaveText('Is the order right?');
  await expect(shown(page)).toHaveCount(1);
  await expect(shown(page).locator('strong')).toHaveText('price');
  await pointsAt(page, block.locator('.vb-nblock-reply'));
  await page.keyboard.press('Escape');
  await expect(bubble(page)).toBeHidden();
  await expect(block.locator('.vb-nblock-reply')).toBeFocused();
  await block.locator('.vb-nblock-text').focus();
  await page.keyboard.press('Enter');
  await expect(shown(page)).toHaveCount(1);
  await pointsAt(page, block.locator('.vb-nblock-text'));
  await page.keyboard.press('Escape');
  await expect(block.locator('.vb-nblock-text')).toBeFocused();
});

test('gallery: every popover reads the shared tokens: the bubble and the container preview', async ({ page }) => {
  await page.goto('/gallery.html');
  // The conversation box is a node's own, about the node's width (FE_03 run 2): not one of these.
  const bubbles = page.locator('section[data-pattern="note-bubble"] vb-note-bubble:not([data-mode="conversation"])');
  await expect(bubbles.first()).toBeVisible();
  for (const b of await bubbles.all()) {
    expect(await css(b, 'width')).toBe('360px');
    expect(await css(b, 'font-size')).toBe(TEXT);
  }
  // The conversation on a container (review polish ruling 6), with the × and no bottom row; a node's notes are its
  // conversation box (D-099 3), drawn apart in the conversation box group.
  const talks = page.locator('section[data-pattern="note-bubble"] vb-note-bubble[data-mode="thread"]');
  await expect(talks).toHaveCount(1);
  await expect(talks.locator('.vb-nb-x')).toHaveCount(1);
  await expect(talks.locator('.vb-nb-row')).toHaveCount(0);
  await expect(talks).toHaveAttribute('data-on', 'container');
  const preview = page.locator('vb-region .vb-note-pop').first();
  expect(await css(preview, 'width')).toBe('360px');
  expect(await css(preview, 'font-size')).toBe(TEXT);
});
