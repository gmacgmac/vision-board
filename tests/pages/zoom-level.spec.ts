// The zoom level and the hidden card controls (tracker N13; task 2026-10-12_board-app_zoom-level-hide-controls).
// The toolbar's zoom group shows the zoom as a percentage that follows every zoom path (keys, buttons,
// Fit, wheel and pinch), the buttons' tooltips say the level, and a polite status announces it once the
// zoom settles. With the hideControlsZoomedOut flag (on by default) the cards' buttons, the size control
// and the containers' icon rows hide below FAR_K, and nothing small is drawn, so axe excuses nothing at
// the opening zoom. Read-only on the roadmap board, so it leaves the shared ledger as it found it.
import type { Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { openBoard } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];
/** FAR_K (apps/board/src/board/canvas/viewport.ts) as a percentage: 55 since review polish round 2 ruling 2
 *  (tracker N13 closed), so the controls show from 55%. */
const FAR_PERCENT = 55;

const level = (page: Page) => page.locator('.vb-zoom .vb-zoom-level');
const status = (page: Page) => page.locator('.vb-zoom [role="status"]');
const zoomButton = (page: Page, name: string) => page.locator('.vb-zoom').getByRole('button', { name, exact: true });
/** The zoom the world is drawn at, as the percentage the toolbar should show (rounded down). */
const percent = (page: Page) => page.locator('.vb-world').evaluate((e) => Math.floor(new DOMMatrix(getComputedStyle(e).transform).a * 100 + 1e-6));
const shown = async (page: Page) => Number.parseInt((await level(page).textContent()) ?? '', 10);

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
  await openBoard(page, { query: '?flags=-hideControlsZoomedOut' });
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

// Review polish ruling 2 (FE_02, decision 6): a container's whole top line keeps one on-screen size at
// every zoom, so titles read zoomed all the way out; its width follows the frame's on-screen width, so
// a title never draws past the frame. Below FAR_K the controls hide as before.
interface TitleLine { id: string; textPx: number; h2Height: number; h2Width: number; h2Right: number; frameRight: number; headRight: number }

/** Every container's title on screen: its text size (font size times the on-screen scale), height and right edges. */
const titleLines = (page: Page): Promise<TitleLine[]> => page.locator('vb-region').evaluateAll((frames) => frames.map((f) => {
  const h2 = f.querySelector<HTMLElement>('.vb-region-head h2')!;
  const head = f.querySelector<HTMLElement>('.vb-region-head')!;
  const [r, fr, hr] = [h2.getBoundingClientRect(), f.getBoundingClientRect(), head.getBoundingClientRect()];
  const scale = hr.width / head.offsetWidth;
  return {
    id: (f as HTMLElement).dataset.region!, textPx: parseFloat(getComputedStyle(h2).fontSize) * scale,
    h2Height: r.height, h2Width: r.width, h2Right: r.right, frameRight: fr.right, headRight: hr.right,
  };
}));

test('a container title keeps one on-screen size at 20%, about 100% and 250%, and never draws past its frame', async ({ page }) => {
  await openBoard(page);
  const at: Record<string, TitleLine[]> = {};
  for (let i = 0; i < 30 && (await percent(page)) > 20; i += 1) await page.keyboard.press('-');
  expect(await expectInSync(page)).toBe(20);
  at['20'] = await titleLines(page);
  for (let i = 0; i < 30 && (await percent(page)) < 100; i += 1) await page.keyboard.press('+');
  at[String(await expectInSync(page))] = await titleLines(page);
  for (let i = 0; i < 30 && (await percent(page)) < 250; i += 1) await page.keyboard.press('+');
  expect(await expectInSync(page)).toBe(250);
  at['250'] = await titleLines(page);
  const first = Object.values(at)[0]!;
  // The title's size is the token (D-051: --vb-text-lg), read from the page rather than written here.
  const size = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vb-text-lg')));
  for (const [zoom, lines] of Object.entries(at)) {
    for (const [i, l] of lines.entries()) {
      expect(l.textPx, `${l.id} at ${zoom}%: ${size}px text on screen`).toBeCloseTo(size, 1);
      expect(l.h2Height, `${l.id} at ${zoom}%: the same height`).toBeCloseTo(first[i]!.h2Height, 0);
      expect(l.h2Width, `${l.id} at ${zoom}%: some of the title shows`).toBeGreaterThan(20);
      expect(l.h2Right, `${l.id} at ${zoom}%: inside its frame`).toBeLessThanOrEqual(l.frameRight + 0.5);
      expect(l.headRight, `${l.id} at ${zoom}%: the whole line inside its frame`).toBeLessThanOrEqual(l.frameRight + 0.5);
    }
  }
});

test('zoomed out, the controls, grip and retired marker leave the line, so the title takes their room', async ({ page }) => {
  await openBoard(page);
  for (let i = 0; i < 20 && (await percent(page)) >= FAR_PERCENT; i += 1) await page.keyboard.press('-');
  await expect(page.locator('#stage')).toHaveAttribute('data-zoom', 'far');
  const gone = await page.locator('vb-region').evaluateAll((frames) => frames.flatMap((f) =>
    [...f.querySelectorAll<HTMLElement>('.vb-region-tools, .vb-region-grip, .vb-region-retired, .vb-holder')]
      .filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.className)));
  expect(gone).toEqual([]);
});
