// Card size tiers (D-030, U7), behind the nodeSize feature flag (rule 12), on by default since
// 2026-10-05 (maintainer): on the board, off with ?flags=-nodeSize, and the gallery's Node size
// section. On the worker's roadmap board, fresh for this file (servers.ts); it leaves every size
// pick it makes back on Auto, for the tests after it in this file.
import type { Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { card, openBoard, ROADMAP_CARDS, zoomToFull } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];
/** The tier widths (tokens.css). */
const WIDTH = { s: 280, m: 360, l: 464 };

const width = async (page: Page, n: number) => (await card(page, n).boundingBox())!.width;
/** Width in CSS pixels, whatever the board's zoom. */
const cssWidth = (page: Page, n: number) => card(page, n).evaluate((e) => (e as HTMLElement).offsetWidth);

/** Zoom in with + until the stage is no longer "far", so the size control shows (N8). */
async function zoomIn(page: Page): Promise<void> {
  for (let i = 0; i < 8 && (await page.locator('#stage[data-zoom="far"]').count()); i += 1) await page.keyboard.press('+');
  await expect(page.locator('#stage')).not.toHaveAttribute('data-zoom', 'far');
}

const active = (page: Page) => page.evaluate(() => {
  const a = document.activeElement as HTMLElement | null;
  return { cls: a?.className ?? '', pick: a?.dataset.sizePick ?? null, card: a?.closest('vb-node')?.getAttribute('data-id') ?? null };
});

test('flag off: no tiers and no size control on the board', async ({ page }) => {
  await openBoard(page, { query: '?flags=-nodeSize' });
  await expect(page.locator('vb-node[data-size]')).toHaveCount(0);
  await expect(page.locator('vb-node .vb-size')).toHaveCount(0);
});

test('flag on by default: every card has a tier, and a long card is wider than a short one', async ({ page }) => {
  await openBoard(page);
  await expect(page.locator('vb-node[data-size]')).toHaveCount(ROADMAP_CARDS);
  await expect(page.locator('vb-node .vb-size')).toHaveCount(ROADMAP_CARDS);
  // Card 1 has a short body (S); card 13 is emphasised, one tier up (M).
  await expect(card(page, 1)).toHaveAttribute('data-size', 's');
  await expect(card(page, 13)).toHaveAttribute('data-size', 'm');
  expect(await cssWidth(page, 1)).toBe(WIDTH.s);
  expect(await cssWidth(page, 13)).toBe(WIDTH.m);
  expect(await width(page, 13)).toBeGreaterThan(await width(page, 1));
});

test('flag off via localStorage too, and ?flags=nodeSize turns it on again', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('vb.flags', '-nodeSize'));
  await openBoard(page);
  await expect(page.locator('vb-node[data-size]')).toHaveCount(0);
  await openBoard(page, { query: '?flags=nodeSize' });
  await expect(page.locator('vb-node[data-size]')).toHaveCount(ROADMAP_CARDS);
  await page.evaluate(() => localStorage.removeItem('vb.flags'));
});

test('by keyboard: Tab reaches the glyph, which opens the pill; L is picked and survives a reload', async ({ page }) => {
  await openBoard(page, { query: '?flags=nodeSize' });
  await zoomIn(page);
  const c = card(page, 1);
  const trig = c.locator('.vb-size-trig');
  const menu = c.locator('.vb-size-menu');
  await expect(trig).toHaveAttribute('aria-label', 'Card size: S, automatic. Change size');
  await expect(menu).toBeHidden();
  await c.focus();
  await page.keyboard.press('Tab');
  expect(await active(page)).toEqual({ cls: 'vb-size-trig', pick: null, card: '1' });
  await expect(menu).toBeVisible();
  await expect(trig).toHaveAttribute('aria-expanded', 'true');
  for (const pick of ['s', 'm', 'l']) {
    await page.keyboard.press('Tab');
    expect((await active(page)).pick).toBe(pick);
  }
  await page.keyboard.press('Enter');
  await expect(c).toHaveAttribute('data-size', 'l');
  await expect(c).toHaveAttribute('data-size-picked', '');
  await expect(trig).toHaveAttribute('aria-label', 'Card size: L, your pick. Change size');
  await expect(trig).toHaveText('◆ L');
  await expect(c.locator('[data-size-pick="l"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(c.locator('[data-size-pick="auto"]')).toHaveAttribute('aria-pressed', 'false');
  expect(await cssWidth(page, 1)).toBe(WIDTH.l);
  // Esc closes the pill and gives focus back to the card.
  await page.keyboard.press('Escape');
  expect((await active(page)).cls).toBe('');
  expect((await active(page)).card).toBe('1');
  await expect(menu).toBeHidden();
  await expect(trig).toHaveAttribute('aria-expanded', 'false');

  await page.reload();
  await expect(page.locator('vb-node')).toHaveCount(ROADMAP_CARDS);
  await expect(card(page, 1)).toHaveAttribute('data-size', 'l');
  await expect(card(page, 1).locator('.vb-size-trig')).toHaveText('◆ L');
  expect(await cssWidth(page, 1)).toBe(WIDTH.l);
});

test('Auto hands the size back to the rule', async ({ page }) => {
  await openBoard(page, { query: '?flags=nodeSize' });
  await zoomIn(page);
  const c = card(page, 1);
  await expect(c).toHaveAttribute('data-size', 'l');
  await c.focus();
  await c.locator('.vb-size-trig').focus();
  await c.locator('[data-size-pick="auto"]').click();
  await expect(c).toHaveAttribute('data-size', 's');
  await expect(c).not.toHaveAttribute('data-size-picked', '');
  await expect(c.locator('.vb-size-trig')).toHaveAttribute('aria-label', 'Card size: S, automatic. Change size');
  await expect(c.locator('[data-size-pick="auto"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(c.locator('[data-size-pick="s"]')).toHaveAttribute('data-auto', '');
  expect(await cssWidth(page, 1)).toBe(WIDTH.s);
  const sizes = await (await page.request.get('/api/boards/roadmap')).json() as { state: { sizes?: Record<string, string> } };
  // get_board leaves `sizes` out when no card has a pick (api.md 32).
  expect(sizes.state.sizes ?? {}).toEqual({});
});

for (const theme of THEMES) {
  test(`flag on: axe passes on the board, the size control open included (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page, { query: '?flags=nodeSize' });
    // N13: zoomed out at the opening fit-to-view zoom the controls are not drawn, so nothing is excused
    // there, nor at full size below.
    await expectNoAxeViolations(page);
    await zoomToFull(page, { check: true });
    await card(page, 1).focus();
    await card(page, 1).locator('.vb-size-trig').focus();
    await expect(card(page, 1).locator('.vb-size-menu')).toBeVisible();
    await expectNoAxeViolations(page);
  });
}

// ---- The gallery's Node size section ----

const section = (page: Page) => page.locator('section[data-feature="nodeSize"]');
const sample = (page: Page, title: string) => section(page).locator('vb-node').filter({ has: page.locator(`h3:text-is("${title}")`) });

test('gallery: the Node size section shows by default and not with -nodeSize', async ({ page }) => {
  await page.goto('/gallery.html?flags=-nodeSize');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  await expect(section(page)).toBeVisible();
});

test('gallery: the tiers come from the body, the agent, emphasis and the person', async ({ page }) => {
  await page.goto('/gallery.html?flags=nodeSize');
  const tiers: [string, keyof typeof WIDTH][] = [
    ['Do we grandfather existing annual plans?', 's'],
    ['The usage tier carries 3x the support load', 'm'],
    ['Grandfather annual plans for 12 months, then migrate at renewal', 'l'],
    ['Agent suggestion: M', 'm'],
    ['Emphasis: one tier up', 'm'],
    ['Is the credit two months or three?', 's'],
  ];
  for (const [title, tier] of tiers) {
    await expect(sample(page, title), title).toHaveAttribute('data-size', tier);
    expect(await sample(page, title).evaluate((e) => (e as HTMLElement).offsetWidth), title).toBe(WIDTH[tier]);
  }
  // The long card is wider than the short one, by the auto rule alone.
  const w = async (t: string) => (await sample(page, t).boundingBox())!.width;
  expect(await w('Grandfather annual plans for 12 months, then migrate at renewal')).toBeGreaterThan(await w('Do we grandfather existing annual plans?'));
  // The person's pick shows as the letter; the moved card keeps its marker beside the control.
  await expect(sample(page, 'Is the credit two months or three?').locator('.vb-size-trig')).toHaveText('◆ S');
  await expect(sample(page, 'Who sends the migration email?').locator('.vb-node-pin')).toBeVisible();
  await expect(section(page).locator('.vb-size[data-open] .vb-size-menu:visible')).toHaveCount(2);
});

for (const theme of THEMES) {
  test(`gallery: Node size passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html?flags=nodeSize');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    // Text anti-aliasing, a few pixels (3 to 6 differ at Playwright's default per-pixel threshold): all of
    // them in the lines that hold the "◆" glyph (the section's prose, the size control's letter), where
    // the text after it sits a sub-pixel off [INFERENCE: the glyph comes from a fallback font]. A
    // tolerance of 20 pixels keeps the picture exact enough to fail on any real change, which differs by
    // hundreds, without a baseline that drifts again.
    await expect(section(page)).toHaveScreenshot(`node-size-${theme}.png`, { maxDiffPixels: 20 });
  });
}
