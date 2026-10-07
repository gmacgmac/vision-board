// Container polish (found-in-use FE_03), on the gallery's real <vb-region> frames: a title wraps
// to two lines and its full text shows in a tip on hover of the title or keyboard focus in the
// label group (titleTip flag, WCAG 1.4.13: hoverable, persistent, Esc dismisses), and a
// container's popovers draw above its own mode row in a narrow frame. Read-only; no server state.
import type { Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['dark', 'light'];
const FULL = 'Annual plan pricing, packaging, discount rules and regional overrides for review';

test.beforeEach(async ({ page }) => {
  await page.goto('/gallery.html');
  await expect(page.locator('section[data-pattern="region"] vb-region').first()).toBeVisible();
});

const frame = (page: Page, id: string) => page.locator(`section[data-pattern="region"] vb-region[data-region="${id}"]`);

/** Whether the element at the centre of `target` is `target` or inside it (nothing draws over it). */
const onTop = (target: Locator) => target.evaluate((e) => {
  const r = e.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return top !== null && e.contains(top);
});

/** The same for the top edge of a popover (4px in), the part the mode row used to cover. */
const topEdgeOnTop = (pop: Locator) => pop.evaluate((e) => {
  const r = e.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + 4);
  return top !== null && e.contains(top);
});

/** The sample draws the tip open; start from closed so hover and focus do the opening. */
async function closed(page: Page, id: string): Promise<Locator> {
  const f = frame(page, id);
  await f.evaluate((e) => e.removeAttribute('data-title-tip-open'));
  return f;
}

test('title: wraps to two lines and ends in an ellipsis, the full text stays in the heading', async ({ page }) => {
  for (const id of ['title-wide', 'title-narrow']) {
    const h2 = frame(page, id).locator('h2');
    await expect(h2).toHaveText(FULL);
    const m = await h2.evaluate((e) => {
      const s = getComputedStyle(e);
      const one = e.closest('section')!.querySelector<HTMLElement>('vb-region[data-region="title-short"] h2')!.clientHeight;
      return { clamp: s.webkitLineClamp, cut: e.scrollHeight > e.clientHeight, lines: Math.round(e.clientHeight / one) };
    });
    expect(m, id).toEqual({ clamp: '2', cut: true, lines: 2 });
  }
  const short = frame(page, 'title-short').locator('h2');
  expect(await short.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(false);
});

test('title tip: opens on hover of a cut title, stays while the pointer is on it, closes on leave', async ({ page }) => {
  const f = await closed(page, 'title-narrow');
  const tip = f.locator('.vb-title-tip');
  await expect(tip).toBeHidden();
  await f.locator('h2').hover();
  await expect(f).toHaveAttribute('data-title-tip-open', '');
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText(FULL);
  expect(await onTop(tip)).toBe(true);
  // Hoverable: the pointer crosses onto the tip (over the gap) and it stays.
  await tip.hover();
  await expect(tip).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(tip).toBeHidden();
});

test('title tip: opens on focus of the grip, persists while focus stays, Esc dismisses it', async ({ page }) => {
  const f = await closed(page, 'title-wide');
  const tip = f.locator('.vb-title-tip');
  await f.locator('.vb-region-grip').focus();
  await expect(tip).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(tip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
  await expect(f.locator('.vb-region-grip')).toBeFocused();
  await f.locator('.vb-region-grip').blur();
});

test('title tip: a title that fits has none', async ({ page }) => {
  const f = await closed(page, 'title-short');
  await f.locator('h2').hover();
  await expect(f).not.toHaveAttribute('data-title-tip-open');
  await f.locator('.vb-region-grip').focus();
  await expect(f).not.toHaveAttribute('data-title-tip-open');
});

test('title tip: off with ?flags=-titleTip, a cut title ends in an ellipsis with no tip', async ({ page }) => {
  await page.goto('/gallery.html?flags=-titleTip');
  const f = await closed(page, 'title-narrow');
  await expect(f.locator('h2')).toHaveText(FULL);
  await f.locator('h2').hover();
  await f.locator('.vb-region-grip').focus();
  await expect(f).not.toHaveAttribute('data-title-tip-open');
});

test('popovers: in a narrow frame the note preview, the layout popover and the settings menu draw above the mode row', async ({ page }) => {
  const f = frame(page, 'n-narrow');
  await f.locator('.vb-region-comment').hover();
  const preview = f.locator('.vb-note-pop');
  await expect(preview).toBeVisible();
  // The text sits just under the row; with the preview under the expanded row (z 3) it was cut off.
  expect(await topEdgeOnTop(preview)).toBe(true);
  expect(await onTop(f.locator('.vb-note-pop-text'))).toBe(true);
  expect(await onTop(preview.getByRole('button', { name: 'Edit' }))).toBe(true);
  await page.mouse.move(0, 0);
  await expect(preview).toBeHidden();

  await f.getByRole('button', { name: /^Settings for / }).click();
  await expect(f.locator('.vb-region-menu')).toBeVisible();
  expect(await topEdgeOnTop(f.locator('.vb-region-menu'))).toBe(true);
  expect(await onTop(f.getByRole('menuitem', { name: 'Reset places' }))).toBe(true);
  await page.keyboard.press('Escape');

  // The layout popover opens on hover of an icon; the collapsed row first expands on hover.
  await f.locator('.vb-mode-row').hover();
  await f.getByRole('radio', { name: 'Flow' }).hover();
  await expect(f.locator('.vb-mode-pop')).toBeVisible();
  expect(await topEdgeOnTop(f.locator('.vb-mode-pop'))).toBe(true);
  expect(await onTop(f.locator('.vb-mode-tiles'))).toBe(true);
  expect(await onTop(f.locator('.vb-mode-line'))).toBe(true);
});

for (const theme of THEMES) {
  test(`title tip: axe passes with the tip open (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await expect(frame(page, 'title-wide').locator('.vb-title-tip')).toBeVisible();
    await expectNoAxeViolations(page);
    const f = await closed(page, 'title-narrow');
    await f.locator('h2').hover();
    await expect(f.locator('.vb-title-tip')).toBeVisible();
    await expectNoAxeViolations(page);
  });
}
