// An app card fits its panel's content (the appFit flag; apps.md § Panel size): a panel that tells its
// height (`ui/notifications/size-changed`) gets a frame that height, held to 120 to
// APP_LIMITS.toldHeight (1080, past the agent's 800), as wide as the agent drew it; the card is
// measured again and the cards under it move with it; nothing is written to
// the ledger. A panel that tells nothing keeps the agent's size. Frozen, a panel keeps its last height.
// On a temp project of its own (app-server.ts) with the test app `grow` (fixtures/apps/grow: rows of
// 40px under 12px of padding, `rows(n)`) and the panel-only test app; then the gallery's entry, the
// example calculator asked for 600px and fitting its 440, light and dark, and with the flag off.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Locator, Page } from '@playwright/test';
import { APP_LIMITS, APP_SIZE } from '#format';
import type { AppServer } from './app-server.ts';
import { startAppServer } from './app-server.ts';
import { expect, expectNoAxeViolations, setTheme, test, bid } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { card as cardOf, head, panelOf } from './board-page.ts';

const GROW = fileURLToPath(new URL('./fixtures/apps/grow', import.meta.url));
/** The grow app's content height with `n` rows. */
const tall = (n: number) => 24 + 40 * n;

let s: AppServer;
test.beforeAll(async () => {
  s = await startAppServer({ fixtures: ['panel-only'] });
  fs.cpSync(GROW, s.dir('grow'), { recursive: true });
});
test.afterAll(async () => { await s.close(); });

/** A board of its own: one column holding `cards`, top to bottom; their numbers. */
async function column(cards: object[]): Promise<{ board: string; n: number[] }> {
  const board = `fit-${Math.random().toString(36).slice(2, 8)}`;
  const results = await s.write(board, [
    { type: 'board', title: 'Fit' }, { type: 'region', region: { id: 'col', title: 'Column', mode: 'column' } },
    ...cards.map((node) => ({ type: 'node', node: { region: 'col', ...node } })),
  ]);
  return { board, n: results.slice(2).map((r) => r.n!) };
}

async function open(page: Page, board: string, count: number): Promise<void> {
  await page.goto(`${s.base}/#${board}`);
  await expect(page.locator('vb-node')).toHaveCount(count);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
}

/** A card's place in the world (its transform, unscaled) and its height. */
const placeOf = (card: Locator) => card.evaluate((e: HTMLElement) => {
  const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(e.style.transform);
  return { y: Number(m?.[2]), h: e.offsetHeight };
});
const frameSize = (card: Locator) => card.locator('vb-app-frame').evaluate((f: HTMLElement) => [f.offsetWidth, f.offsetHeight]);

test('a panel that tells its height gets a card that fits it, 120 to 1080 (past the agent\'s 800), as wide as the agent drew it; the card under it moves with it; no ledger write', async ({ page }) => {
  const { board, n: [a, b] } = await column([{ kind: 'app', title: 'Grow', app: { id: 'grow', w: 320, h: 400 } }, { kind: 'finding', title: 'The card under it' }]);
  await open(page, board, 2);
  const app = cardOf(page, a!);
  const under = cardOf(page, b!);
  const panel = await panelOf(app);
  await expect(app.locator('vb-app-frame')).toHaveAttribute('data-h', '400');
  // Four rows: shorter than the agent's 400, so the card shrinks to them.
  await expect.poll(() => frameSize(app)).toEqual([320, tall(4)]);
  const first = await placeOf(app);
  const chrome = first.h - tall(4);
  const gap = (await placeOf(under)).y - (first.y + first.h);
  const ledger = await head(page, s.base);
  const fits = async (height: number, why: string) => {
    await expect.poll(() => frameSize(app), why).toEqual([320, height]);
    await expect.poll(async () => { const [p, q] = [await placeOf(app), await placeOf(under)]; return [p.h - chrome, q.y - (p.y + p.h)]; }, why).toEqual([height, gap]);
  };
  for (const [rows, height] of [[9, tall(9)], [19, tall(19)], [24, tall(24)], [30, APP_LIMITS.toldHeight], [0, APP_SIZE.h.min], [3, tall(3)]] as const) {
    await panel.evaluate((n) => (window as unknown as { rows(n: number): void }).rows(n), rows);
    await fits(height, `${rows} rows`);
  }
  // A width from the panel is ignored: the card keeps the agent's.
  await panel.evaluate(() => parent.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/size-changed', params: { width: 900, height: 300 } }, '*'));
  await fits(300, 'a width and a height');
  expect(await head(page, s.base)).toBe(ledger);
  await expectNoAxeViolations(page);
});

test('a panel that tells nothing keeps the size the agent drew', async ({ page }) => {
  const { board, n: [a] } = await column([{ kind: 'app', title: 'Quiet', app: { id: 'panel-only', w: 300, h: 260 } }]);
  await open(page, board, 1);
  const app = cardOf(page, a!);
  await panelOf(app);
  await page.waitForTimeout(300);
  expect(await frameSize(app)).toEqual([300, 260]);
});

test('frozen (zoomed far), a panel keeps its last height; zoomed back in, the same', async ({ page }) => {
  const { board, n: [a] } = await column([{ kind: 'app', title: 'Grow', app: { id: 'grow', w: 320, h: 400 } }]);
  await open(page, board, 1);
  const app = cardOf(page, a!);
  const panel = await panelOf(app);
  await panel.evaluate(() => (window as unknown as { rows(n: number): void }).rows(7));
  await expect.poll(() => frameSize(app)).toEqual([320, tall(7)]);
  const stage = page.locator(bid('stage'));
  await app.focus();
  for (let i = 0; i < 12 && (await stage.getAttribute('data-zoom')) !== 'far'; i += 1) await page.keyboard.press('-');
  await expect(app.locator('vb-app-frame')).toHaveAttribute('data-frozen', '');
  expect(await frameSize(app)).toEqual([320, tall(7)]);
  for (let i = 0; i < 12 && (await stage.getAttribute('data-zoom')) === 'far'; i += 1) await page.keyboard.press('+');
  await expect(app.locator('vb-app-frame')).not.toHaveAttribute('data-frozen');
  expect(await frameSize(app)).toEqual([320, tall(7)]);
});

const THEMES: Theme[] = ['light', 'dark'];
const fitSection = (page: Page) => page.locator('section[data-feature="appFit"]');

for (const theme of THEMES) {
  test(`gallery: the calculator, asked for 600px, fits its 440 (${theme})`, async ({ page }) => {
    await page.goto('/gallery.html');
    await setTheme(page, theme);
    const section = fitSection(page);
    const frame = section.locator('vb-app-frame');
    // In view: the browser holds back a frame's rendering (its ResizeObserver too) while it is out of view.
    await section.scrollIntoViewIfNeeded();
    await expect(frame).toHaveAttribute('data-state', 'ready');
    await expect(frame).toHaveAttribute('data-h', '600');
    await expect.poll(() => frame.evaluate((f: HTMLElement) => [f.offsetWidth, f.offsetHeight])).toEqual([360, 440]);
    await expectNoAxeViolations(page);
    await expect(section).toHaveScreenshot(`app-fit-${theme}.png`);
  });
}

test('gallery, the appFit flag off: the panel keeps the 600px the agent asked for', async ({ page }) => {
  await page.goto('/gallery.html?flags=-appFit');
  const frame = fitSection(page).locator('vb-app-frame');
  await fitSection(page).scrollIntoViewIfNeeded();
  await expect(frame).toHaveAttribute('data-state', 'ready');
  // The panel has told its height by now (the flag on, the same wait sees 440).
  await page.waitForTimeout(500);
  expect(await frame.evaluate((f: HTMLElement) => [f.offsetWidth, f.offsetHeight])).toEqual([360, 600]);
});
