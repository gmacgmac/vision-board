// Z on a container (maintainer, 2026-10-28; containerZoom flag): a click on a container's empty inside
// or on its title line makes it the one Z zooms to, as Z zooms to the selected cards. On the worker's
// roadmap board, fresh for this file (servers.ts).
import type { Page } from '@playwright/test';
import { expect, test } from './helpers.ts';
import { card, frame, openBoard } from './board-page.ts';

const view = (page: Page) => page.locator('.vb-world').evaluate((e) => getComputedStyle(e).transform);

/** How the container sits on the stage: the side it fills most, and how far its centre is from the stage's. */
async function placed(page: Page, region: string): Promise<{ fill: number; dx: number; dy: number }> {
  const [s, f] = [(await page.locator('#stage').boundingBox())!, (await frame(page, region).boundingBox())!];
  return {
    fill: Math.max(f.width / s.width, f.height / s.height),
    dx: Math.abs(f.x + f.width / 2 - (s.x + s.width / 2)),
    dy: Math.abs(f.y + f.height / 2 - (s.y + s.height / 2)),
  };
}

/** Zoomed to the container as the container finder zooms (`zoomToContainer`, capped at its top zoom):
 *  it moved, it is centred, and all of it is on the stage. */
async function expectZoomedTo(page: Page, region: string, before: string): Promise<void> {
  await expect.poll(async () => (await placed(page, region)).dx).toBeLessThan(3);
  expect(await view(page)).not.toBe(before);
  const p = await placed(page, region);
  expect(p.dy).toBeLessThan(3);
  expect(p.fill).toBeLessThanOrEqual(1.001);
}

/** A point inside the container, near its bottom-left corner, on no card. */
async function inside(page: Page, region: string): Promise<{ x: number; y: number }> {
  const f = (await frame(page, region).boundingBox())!;
  return { x: f.x + 4, y: f.y + f.height - 4 };
}

test('a click inside a container, then Z, zooms to the whole container', async ({ page }) => {
  await openBoard(page);
  const at = await inside(page, 'review');
  await page.mouse.click(at.x, at.y);
  const before = await view(page);
  await page.keyboard.press('z');
  await expectZoomedTo(page, 'review', before);
});

test('a click on a container\'s title, then Z, zooms to the whole container', async ({ page }) => {
  await openBoard(page);
  await frame(page, 'review').locator('.vb-region-head h2').click();
  const before = await view(page);
  await page.keyboard.press('z');
  await expectZoomedTo(page, 'review', before);
});

test('a click on a card, then Z, still zooms to the card, not its container', async ({ page }) => {
  await openBoard(page);
  await card(page, 1).locator('.vb-node-title').click({ position: { x: 4, y: 4 } });
  await page.keyboard.press('z');
  await expect.poll(async () => (await placed(page, 'review')).fill).toBeGreaterThan(1.05);
});

test('flag off: a click inside a container, then Z, does nothing', async ({ page }) => {
  await openBoard(page, { query: '?flags=-containerZoom' });
  const at = await inside(page, 'review');
  await page.mouse.click(at.x, at.y);
  const before = await view(page);
  await page.keyboard.press('z');
  await page.waitForTimeout(400);
  expect(await view(page)).toBe(before);
});

/** The focus ring on the container's title line, as drawn now. */
const ring = (page: Page) => frame(page, 'review').locator('.vb-region-head h2').evaluate((e) => getComputedStyle(e).outlineStyle);

test('a click, then Z: the title line has focus but draws no ring; focused by the keyboard it does', async ({ page }) => {
  await openBoard(page);
  const at = await inside(page, 'review');
  await page.mouse.click(at.x, at.y);
  await page.keyboard.press('z');
  await expect(frame(page, 'review').locator('.vb-region-head h2')).toBeFocused();
  expect(await ring(page)).toBe('none');
  // Focus that came by a key (the container finder chosen with the keyboard focuses it the same way).
  await page.locator('#stage').focus();
  await page.keyboard.press('Shift');
  await frame(page, 'review').locator('.vb-region-head h2').evaluate((e: HTMLElement) => e.focus());
  expect(await ring(page)).not.toBe('none');
});
