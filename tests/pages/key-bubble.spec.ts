// The key commands bubble (navigation FE_04, keyBubble flag, on by default): a round "?" at the
// bottom left; hover or focus lists every command, grouped Items, Selection, Board, View; it stays
// while the pointer is on it, Esc closes it, "?" opens it; the old hard-coded key bar is gone.
// The list's content is tested against the command table and the registry in
// apps/board/tests/key-help.test.ts; here the page shows it. Read-only, on the worker's roadmap board.
import type { Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { openBoard } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];
const button = (page: Page) => page.getByRole('button', { name: 'Key commands' });
const list = (page: Page) => page.locator('.vb-keys-tip');

test('a round "?" sits at the bottom left and the old key bar is gone', async ({ page }) => {
  await openBoard(page);
  await expect(button(page)).toHaveText('?');
  await expect(page.locator('.vb-help')).toHaveCount(0);
  const b = (await button(page).boundingBox())!;
  const view = page.viewportSize()!;
  expect(b.x).toBeLessThan(view.width / 4);
  expect(b.y).toBeGreaterThan(view.height * 0.75);
  expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(24);
  await expect(list(page)).toBeHidden();
});

test('hover shows the grouped list, it stays while the pointer is on it, and it closes on leaving', async ({ page }) => {
  await openBoard(page);
  await button(page).hover();
  await expect(list(page)).toBeVisible();
  await expect(list(page).getByRole('heading')).toHaveText(['Items', 'Selection', 'Board', 'View']);
  await expect(list(page).locator('[data-row="action:ack"]')).toContainText('Check');
  await expect(list(page).locator('[data-row="action:context"]')).toHaveCount(0);
  await expect(list(page).locator('[data-row="command:zoom-in"]')).toContainText('Zoom in');
  // Onto the list: it stays (WCAG 1.4.13).
  await list(page).locator('[data-row="command:fit"]').hover();
  await expect(list(page)).toBeVisible();
  await page.mouse.move(600, 300);
  await expect(list(page)).toBeHidden();
});

test('focus shows it, Esc closes it without anything else happening, and "?" opens it again', async ({ page }) => {
  await openBoard(page);
  await button(page).focus();
  await expect(list(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(list(page)).toBeHidden();
  await expect(button(page)).toBeFocused();
  await page.keyboard.press('?');
  await expect(list(page)).toBeVisible();
  await page.keyboard.press('?');
  await expect(list(page)).toBeHidden();
  // From the stage, "?" opens it and moves focus to the button.
  await page.locator('#stage').focus();
  await page.keyboard.press('?');
  await expect(list(page)).toBeVisible();
  await expect(button(page)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(list(page)).toBeHidden();
});

test('"?" typed in a text field is just a character', async ({ page }) => {
  await openBoard(page);
  await page.locator('vb-node').first().focus();
  await page.keyboard.press('c');
  const field = page.locator('textarea:visible').first();
  await expect(field).toBeVisible();
  await field.fill('');
  await page.keyboard.type('why?');
  await expect(field).toHaveValue('why?');
  await expect(list(page)).toBeHidden();
});

test('flag off (?flags=-keyBubble): no bubble and no key bar', async ({ page }) => {
  await openBoard(page, { query: '?flags=-keyBubble' });
  await expect(button(page)).toHaveCount(0);
  await expect(page.locator('.vb-help')).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`axe passes with the bubble shut and open (${theme}), and the open list matches its screenshot`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page, { query: '?flags=-chatPanel' });
    await expectNoAxeViolations(page);
    await button(page).focus();
    await expect(list(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(list(page)).toHaveScreenshot(`key-bubble-open-${theme}.png`);
  });
}

// ---- The gallery's sample ----

const section = (page: Page) => page.locator('section[data-feature="keyBubble"]');

test('gallery: the Key commands section shows by default and not with -keyBubble', async ({ page }) => {
  await page.goto('/gallery.html?flags=-keyBubble');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  await expect(section(page).locator('.vb-keys-btn')).toHaveCount(2);
  await expect(section(page).locator('.vb-keys-tip:visible')).toHaveCount(1);
});

for (const theme of THEMES) {
  test(`gallery: the sample passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html?flags=-chatPanel');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`key-bubble-gallery-${theme}.png`);
  });
}
