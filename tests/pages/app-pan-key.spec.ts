// Cmd (Ctrl elsewhere) held over an app card (maintainer, point 313): the panel is a frame, so a wheel
// or a drag over it goes to the panel's own page and never reached the board. While the key is held the
// frame takes no pointer (board.css `.vb-stage[data-pan-key] vb-app-frame`), so Cmd+wheel zooms and
// Cmd+drag pans over an app card as over any other; without the key the panel keeps its own pointer.
import type { Page } from '@playwright/test';
import type { AppServer } from './app-server.ts';
import { CALCULATOR, startAppServer } from './app-server.ts';
import { expect, test } from './helpers.ts';
import { card as cardOf, panelOf } from './board-page.ts';

let s: AppServer;
test.beforeAll(async () => { s = await startAppServer(); });
test.afterAll(async () => { await s.close(); });

const PAN_KEY = process.platform === 'darwin' ? 'Meta' : 'Control';
const world = (page: Page) => page.locator('.vb-world').evaluate((e) => getComputedStyle(e).transform);

test('Cmd+wheel zooms and Cmd+drag pans over an app card; without Cmd the panel keeps the pointer', async ({ page }) => {
  const { board, n: [n] } = await s.draw([CALCULATOR]);
  await page.goto(`${s.base}/#${board}`);
  const card = cardOf(page, n!);
  await panelOf(card);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
  const f = (await card.locator('vb-app-frame').boundingBox())!;
  const mid = { x: f.x + f.width / 2, y: f.y + f.height / 2 };
  // Focus on the board, as after a click on its canvas: the board hears the key.
  await page.locator('#stage').focus();
  await page.mouse.move(mid.x, mid.y);

  // No key: the wheel is the panel's, the board stays put.
  const still = await world(page);
  await page.mouse.wheel(0, 200);
  await page.waitForTimeout(200);
  expect(await world(page)).toBe(still);

  // Cmd held: the wheel zooms the board.
  await page.keyboard.down(PAN_KEY);
  await expect(page.locator('#stage')).toHaveAttribute('data-pan-key', '');
  await page.mouse.wheel(0, -200);
  await expect.poll(() => world(page)).not.toBe(still);
  const zoomed = await world(page);

  // Cmd held: a drag that starts on the panel pans the board.
  await page.mouse.move(mid.x, mid.y);
  await page.mouse.down();
  await page.mouse.move(mid.x + 120, mid.y + 60, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up(PAN_KEY);
  await expect.poll(() => world(page)).not.toBe(zoomed);
  await expect(page.locator('#stage')).not.toHaveAttribute('data-pan-key');
});
