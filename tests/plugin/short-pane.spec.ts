// A short, narrow pane (docs/specification/plugin.md § A guest in the host's page; the board's window-sized caps): what
// opens stays inside the root, by the root's size and not the window's. The window here is 1600 by 1000.
import type { Locator, Page } from '@playwright/test';
import { drawPlans, expect, openHost, test } from './harness.ts';

/** Shorter and narrower than anything the board's window-sized caps knew. */
const PANE = [420, 300] as const;

/** `inner` lies inside the root's box. */
async function staysIn(page: Page, inner: Locator): Promise<void> {
  const [root, box] = await Promise.all([page.locator('.host-root').boundingBox(), inner.boundingBox()]);
  expect(box, 'shown').toBeTruthy();
  expect(box!.y, 'not above the root').toBeGreaterThanOrEqual(root!.y - 0.5);
  expect(box!.y + box!.height, 'not below the root').toBeLessThanOrEqual(root!.y + root!.height + 0.5);
  expect(box!.x, 'not left of the root').toBeGreaterThanOrEqual(root!.x - 0.5);
  expect(box!.x + box!.width, 'not right of the root').toBeLessThanOrEqual(root!.x + root!.width + 0.5);
}

test.beforeEach(async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host, { size: PANE });
  await expect(page.locator('.host-root vb-node')).toHaveCount(3);
});

test('the "⋯" surface keeps inside a short pane', async ({ page }) => {
  await page.locator('.host-root #toolbar-menu').click();
  await staysIn(page, page.locator('.host-root .vb-menu-surface[data-fields]'));
});

test('the key help keeps inside a short, narrow pane', async ({ page }) => {
  await page.locator('.host-root .vb-keys-btn').hover();
  const tip = page.locator('.host-root .vb-keys-tip');
  await expect(tip).toBeVisible();
  await staysIn(page, tip);
});

test('the proposals notice keeps inside a narrow pane', async ({ page, host }) => {
  await page.locator('.host-root').evaluate((e) => { (e as HTMLElement).style.width = '220px'; });
  const wrote = await host.tool('write_board', { board: 'plans', items: [{ type: 'propose', n: 1, ver: 1, action: 'cross', reason: 'The client declined', source: 'A message' }] });
  expect(wrote.isError, JSON.stringify(wrote)).toBe(false);
  const notice = page.locator('.host-root .vb-proposals');
  await expect(notice).toBeVisible();
  await staysIn(page, notice);
});

test('the selection pill paints under what opens over it: "⋯" and the key help', async ({ page }) => {
  await page.locator('.host-root vb-node').first().click();
  const pill = page.locator('.host-root vb-selection-bar');
  await expect(pill).toBeVisible();
  const box = (await pill.boundingBox())!;
  const on = () => page.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e?.closest('vb-selection-bar') ? 'pill' : 'over it'; }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  const overlaps = async (other: Locator) => { const o = (await other.boundingBox())!; return o.x < box.x + box.width && box.x < o.x + o.width && o.y < box.y + box.height && box.y < o.y + o.height; };
  expect(await on()).toBe('pill');
  await page.locator('.host-root #toolbar-menu').click();
  expect(await overlaps(page.locator('.host-root .vb-menu-surface[data-fields]')), 'the surface reaches the pill').toBe(true);
  expect(await on()).toBe('over it');
  await page.keyboard.press('Escape');
  await page.locator('.host-root .vb-keys-btn').hover();
  await expect(page.locator('.host-root .vb-keys-tip')).toBeVisible();
  expect(await overlaps(page.locator('.host-root .vb-keys-tip')), 'the box reaches the pill').toBe(true);
  expect(await on()).toBe('over it');
});
