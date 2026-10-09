// The focus ring on a card a pointer focused (cortex-tasks/board/2026-10-09_board-app_pointer-focus-ring.md):
// a key that moves no focus (Z, Esc, Space) draws no ring on it; focus moved by the keyboard (Tab,
// Shift+Tab, J) shows it again, and a card the keyboard focused keeps it through Z (WCAG 2.4.7).
// Runs on the shared server's roadmap board and writes nothing to it.
import type { Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const NODES = 17;
const THEMES: Theme[] = ['dark', 'light'];

const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);
/** The focus ring as drawn: the outline style of `el` ('none' when there is no ring). */
const ringOf = (page: Page, n: number) => card(page, n).evaluate((e) => getComputedStyle(e).outlineStyle);
const ringOnFocused = (page: Page) => page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
const scale = (page: Page) => page.locator('#world').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a);

async function openBoard(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('vb-node')).toHaveCount(NODES);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
  await expect(page.locator('#wires')).not.toHaveClass(/settling/);
}

async function clickCard(page: Page, n: number): Promise<void> {
  await card(page, n).locator('.vb-node-title').click({ position: { x: 4, y: 4 } });
}

/** Click card `n` and press Z: it zooms to the card, which keeps focus. */
async function clickAndZoom(page: Page, n: number): Promise<void> {
  const before = await scale(page);
  await clickCard(page, n);
  await expect(card(page, n)).toBeFocused();
  expect(await ringOf(page, n)).toBe('none');
  await page.keyboard.press('z');
  await expect.poll(() => scale(page)).toBeGreaterThan(before);
  await expect(card(page, n)).toBeFocused();
}

test('a clicked card shows no focus ring when Z, Space or Esc is pressed', async ({ page }) => {
  await openBoard(page);
  await clickAndZoom(page, 12);
  expect(await ringOf(page, 12)).toBe('none');
  await expect(card(page, 12)).toHaveAttribute('data-selected', '');
  for (const key of ['Space', 'Space', 'Escape']) {
    await page.keyboard.press(key);
    expect(await ringOf(page, 12), key).toBe('none');
  }
});

test('focus moved by the keyboard from a clicked card shows the ring: Tab, Shift+Tab, J', async ({ page }) => {
  await openBoard(page);
  await clickAndZoom(page, 12);
  await page.keyboard.press('Tab');
  await expect(card(page, 12)).not.toBeFocused();
  expect(await ringOnFocused(page)).toBe('solid');
  await page.keyboard.press('Shift+Tab');
  await expect(card(page, 12)).toBeFocused();
  expect(await ringOf(page, 12)).toBe('solid');
  // Clicked again, then J: the next card gets focus from the keyboard, ring and all.
  await clickCard(page, 12);
  await page.keyboard.press('z');
  expect(await ringOf(page, 12)).toBe('none');
  await page.keyboard.press('j');
  await expect(card(page, 12)).not.toBeFocused();
  expect(await ringOnFocused(page)).toBe('solid');
});

test('a card the keyboard focused keeps its ring through Z', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 12);
  await page.keyboard.press('j');
  const id = await page.evaluate(() => (document.activeElement as HTMLElement).dataset.id);
  expect(id).toBeDefined();
  expect(await ringOnFocused(page)).toBe('solid');
  await page.keyboard.press('Space');
  await page.keyboard.press('z');
  expect(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.id)).toBe(id);
  expect(await ringOnFocused(page)).toBe('solid');
});

test('a lasso and Z: no card shows a focus ring', async ({ page }) => {
  await openBoard(page);
  const f = (await page.locator('vb-region[data-region="review"]').boundingBox())!;
  await page.keyboard.down('Shift');
  await page.mouse.move(f.x + 2, f.y + f.height - 2);
  await page.mouse.down();
  await page.mouse.move(f.x + f.width - 2, f.y + 2, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(3);
  await page.keyboard.press('z');
  const rings = await page.locator('vb-node').evaluateAll((els) => els.map((e) => getComputedStyle(e).outlineStyle));
  expect(rings.filter((r) => r !== 'none')).toEqual([]);
});

for (const theme of THEMES) {
  test(`axe passes with a clicked card zoomed to by Z (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page);
    await clickAndZoom(page, 12);
    expect(await ringOf(page, 12)).toBe('none');
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
  });
}
