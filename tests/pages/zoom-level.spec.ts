// The zoom level and the hidden card controls (tracker N13; task 2026-10-12_board-app_zoom-level-hide-controls).
// The toolbar's zoom group shows the zoom as a percentage that follows every zoom path (keys, buttons,
// Fit, wheel and pinch), the buttons' tooltips say the level, and a polite status announces it once the
// zoom settles. With the hideControlsZoomedOut flag (on by default) the cards' buttons, the size control
// and the containers' icon rows hide below FAR_K, and nothing small is drawn, so axe excuses nothing at
// the opening zoom. Read-only on the roadmap board, so it leaves the shared ledger as it found it.
import type { Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const NODES = 17;
const THEMES: Theme[] = ['dark', 'light'];
/** FAR_K (apps/board/src/board/viewport.ts) as a percentage. */
const FAR_PERCENT = 75;

const level = (page: Page) => page.locator('.vb-zoom .vb-zoom-level');
const status = (page: Page) => page.locator('.vb-zoom [role="status"]');
const zoomButton = (page: Page, name: string) => page.locator('.vb-zoom').getByRole('button', { name, exact: true });
/** The zoom the world is drawn at, as the percentage the toolbar should show (rounded down). */
const percent = (page: Page) => page.locator('#world').evaluate((e) => Math.floor(new DOMMatrix(getComputedStyle(e).transform).a * 100 + 1e-6));
const shown = async (page: Page) => Number.parseInt((await level(page).textContent()) ?? '', 10);

async function openBoard(page: Page, query = ''): Promise<void> {
  await page.goto(`/${query}`);
  await expect(page.locator('vb-node')).toHaveCount(NODES);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
  await expect(page.locator('#wires')).not.toHaveClass(/settling/);
  await page.locator('#stage').focus();
}

/** The level the toolbar shows matches the one the board is drawn at. */
async function expectInSync(page: Page): Promise<number> {
  await expect.poll(async () => (await shown(page)) - (await percent(page))).toBe(0);
  return shown(page);
}

test('the zoom group shows the zoom as a percentage, matching the board, from the moment it opens', async ({ page }) => {
  await openBoard(page);
  await expect(level(page)).toHaveText(/^\d+%$/);
  const open = await expectInSync(page);
  console.log(`opening zoom on the roadmap board at 1600x1000: ${open}%`);
  // The readout is part of the Zoom group, beside Fit, and not a button or a tab stop.
  await expect(page.getByRole('group', { name: 'Zoom' }).locator('.vb-zoom-level')).toHaveCount(1);
  await expect(level(page)).not.toHaveAttribute('tabindex', /.*/);
});

test('the percentage follows every zoom path: keys, buttons, Fit, wheel and pinch', async ({ page }) => {
  await openBoard(page);
  const start = await expectInSync(page);
  await page.keyboard.press('+');
  const afterKey = await expectInSync(page);
  expect(afterKey).toBeGreaterThan(start);
  await zoomButton(page, 'Zoom out').click();
  const afterOut = await expectInSync(page);
  expect(afterOut).toBeLessThan(afterKey);
  await zoomButton(page, 'Zoom in').click();
  await zoomButton(page, 'Zoom in').click();
  expect(await expectInSync(page)).toBeGreaterThan(afterKey);
  // Ctrl + wheel is how a trackpad pinch arrives; it zooms at the pointer.
  const before = await shown(page);
  await page.mouse.move(800, 520);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -200);
  await page.keyboard.up('Control');
  await expect.poll(() => shown(page)).toBeGreaterThan(before);
  await expectInSync(page);
  // Fit brings it back to where the board opened.
  await zoomButton(page, 'Fit').click();
  expect(await expectInSync(page)).toBe(start);
  // The limits: the readout never leaves what the board allows.
  for (let i = 0; i < 20; i += 1) await page.keyboard.press('-');
  expect(await expectInSync(page)).toBeGreaterThanOrEqual(20);
  for (let i = 0; i < 30; i += 1) await page.keyboard.press('+');
  expect(await expectInSync(page)).toBeLessThanOrEqual(250);
});

test('the zoom buttons say what they do and the level in their tooltips, and keep their names', async ({ page }) => {
  await openBoard(page);
  const now = await expectInSync(page);
  await expect(zoomButton(page, 'Zoom out')).toHaveAttribute('title', `Zoom out · - · ${now}% now`);
  await expect(zoomButton(page, 'Fit')).toHaveAttribute('title', `Fit · F · ${now}% now`);
  await expect(zoomButton(page, 'Zoom in')).toHaveAttribute('title', `Zoom in · + · ${now}% now`);
  await page.keyboard.press('+');
  const next = await expectInSync(page);
  expect(next).not.toBe(now);
  await expect(zoomButton(page, 'Zoom in')).toHaveAttribute('title', `Zoom in · + · ${next}% now`);
  await expect(zoomButton(page, 'Fit')).toHaveAttribute('title', `Fit · F · ${next}% now`);
});

test('screen readers hear the level once it settles, politely, and not on every frame', async ({ page }) => {
  await openBoard(page);
  await expect(status(page)).toHaveAttribute('aria-live', 'polite');
  await expectInSync(page);
  // Record every text the status holds from here on.
  await page.evaluate(() => {
    const el = document.querySelector('.vb-zoom [role="status"]')!;
    const heard: string[] = [];
    (window as unknown as { __heard: string[] }).__heard = heard;
    new MutationObserver(() => { if (el.textContent) heard.push(el.textContent); }).observe(el, { childList: true, characterData: true, subtree: true });
  });
  // Five quick presses are one announcement: the last level.
  for (let i = 0; i < 5; i += 1) await page.keyboard.press('+');
  const final = await expectInSync(page);
  await expect(status(page)).toHaveText(`Zoom ${final}%`);
  await page.waitForTimeout(1200);
  const heard = await page.evaluate(() => (window as unknown as { __heard: string[] }).__heard);
  expect(heard, 'one announcement for a burst of zooming').toEqual([`Zoom ${final}%`]);
  // The visible readout is for the eyes, so the level is not read twice.
  await expect(level(page)).toHaveAttribute('aria-hidden', 'true');
});

test('card controls hide below the level and show above it, and focus never lands on a hidden one', async ({ page }) => {
  await openBoard(page);
  const controls = '.vb-act:visible, .vb-size-trig:visible, .vb-mode-row:visible';
  // Zoom out until the stage is far, then back in: the controls follow the level.
  for (let i = 0; i < 20 && (await percent(page)) >= FAR_PERCENT; i += 1) await page.keyboard.press('-');
  expect(await percent(page)).toBeLessThan(FAR_PERCENT);
  await expect(page.locator('#stage')).toHaveAttribute('data-zoom', 'far');
  await expect(page.locator(controls)).toHaveCount(0);
  // Tab through the page: it never stops on a control that is not drawn.
  await page.locator('#stage').focus();
  const stops = new Set<string>();
  for (let i = 0; i < 60; i += 1) {
    await page.keyboard.press('Tab');
    stops.add(await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return a?.closest('.vb-act, .vb-size, .vb-mode-row') ? `hidden control: ${a.className}` : (a?.localName ?? '');
    }));
  }
  expect([...stops].filter((s) => s.startsWith('hidden control')), [...stops].join('\n')).toEqual([]);
  await page.locator('#stage').focus();
  for (let i = 0; i < 20 && (await percent(page)) < FAR_PERCENT; i += 1) await page.keyboard.press('+');
  expect(await percent(page)).toBeGreaterThanOrEqual(FAR_PERCENT);
  await expect(page.locator('#stage')).not.toHaveAttribute('data-zoom', 'far');
  await expect(page.locator('vb-node .vb-act:visible').first()).toBeVisible();
  await expect(page.locator('vb-region .vb-mode-row:visible').first()).toBeVisible();
});

test('the keyboard shortcuts for a card still work while its buttons are hidden', async ({ page }) => {
  await openBoard(page);
  for (let i = 0; i < 20 && (await percent(page)) >= FAR_PERCENT; i += 1) await page.keyboard.press('-');
  await expect(page.locator('#stage')).toHaveAttribute('data-zoom', 'far');
  // C opens the focused card's note bubble (nothing is written until it is sent).
  await page.locator('vb-node[data-id="1"]').focus();
  await page.keyboard.press('c');
  await expect(page.locator('vb-note-bubble')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('vb-note-bubble')).toBeHidden();
});

test('with -hideControlsZoomedOut every control stays visible at every zoom', async ({ page }) => {
  await openBoard(page, '?flags=-hideControlsZoomedOut');
  for (let i = 0; i < 20 && (await percent(page)) >= FAR_PERCENT; i += 1) await page.keyboard.press('-');
  expect(await percent(page)).toBeLessThan(FAR_PERCENT);
  await expect(page.locator('#stage')).not.toHaveAttribute('data-zoom', 'far');
  await expect(page.locator('vb-node .vb-act:visible').first()).toBeVisible();
  await expect(page.locator('vb-region .vb-mode-row:visible').first()).toBeVisible();
});

for (const theme of THEMES) {
  test(`axe passes with nothing excused at the opening zoom, zoomed out and at 1:1 (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page);
    await expectNoAxeViolations(page);
    for (let i = 0; i < 20 && (await percent(page)) >= FAR_PERCENT; i += 1) await page.keyboard.press('-');
    await expectNoAxeViolations(page);
    for (let i = 0; i < 20 && (await percent(page)) < 100; i += 1) await page.keyboard.press('+');
    expect(await percent(page)).toBeGreaterThanOrEqual(100);
    await expectNoAxeViolations(page);
  });
}
