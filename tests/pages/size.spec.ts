// Card size tiers (D-030, U7), behind the nodeSize feature flag (rule 12), on by default since
// 2026-10-05 (maintainer): on the board, off with ?flags=-nodeSize, picked with the selection bar's Width (D-099 3),
// and the gallery's Node size section. On the worker's roadmap board, fresh for this file (servers.ts); it leaves every size
// pick it makes back on Auto, for the tests after it in this file.
import type { Page } from '@playwright/test';
import { expect, expectNoAxeViolations, openSelectionBar, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { bar, card, openBoard, ROADMAP_CARDS, zoomToFull } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];
/** The tier widths (tokens.css). */
const WIDTH = { s: 280, m: 360, l: 464 };

const width = async (page: Page, n: number) => (await card(page, n).boundingBox())!.width;
/** Width in CSS pixels, whatever the board's zoom. */
const cssWidth = (page: Page, n: number) => card(page, n).evaluate((e) => (e as HTMLElement).offsetWidth);

/** Card `n` alone selected, and the selection bar's Width list open: pick `size` from it. */
async function pickWidth(page: Page, n: number, size: 'Small' | 'Medium' | 'Large' | 'Auto'): Promise<void> {
  await card(page, n).focus(); // focusing pans it into view
  await card(page, n).locator('.vb-node-title').click({ position: { x: 4, y: 4 } });
  await openSelectionBar(page);
  await bar(page).getByRole('button', { name: 'Width' }).click();
  await page.getByRole('menu', { name: /^Width of/ }).getByRole('menuitem', { name: size }).click();
}

test('flag off: no tiers on the board', async ({ page }) => {
  await openBoard(page, { query: '?flags=-nodeSize' });
  await expect(page.locator('vb-node[data-size]')).toHaveCount(0);
});

test('flag on by default: every card has a tier, and a long card is wider than a short one', async ({ page }) => {
  await openBoard(page);
  await expect(page.locator('vb-node[data-size]')).toHaveCount(ROADMAP_CARDS);
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

test('Width on the selection bar picks L, which survives a reload; Auto hands the size back to the rule', async ({ page }) => {
  await openBoard(page);
  await zoomToFull(page);
  const c = card(page, 1);
  await expect(c).toHaveAttribute('data-size', 's');
  await pickWidth(page, 1, 'Large');
  await expect(c).toHaveAttribute('data-size', 'l');
  await expect(c).toHaveAttribute('data-size-picked', '');
  expect(await cssWidth(page, 1)).toBe(WIDTH.l);
  await page.reload();
  await expect(page.locator('vb-node')).toHaveCount(ROADMAP_CARDS);
  await expect(card(page, 1)).toHaveAttribute('data-size', 'l');
  expect(await cssWidth(page, 1)).toBe(WIDTH.l);
  await zoomToFull(page);
  await pickWidth(page, 1, 'Auto');
  await expect(card(page, 1)).toHaveAttribute('data-size', 's');
  await expect(card(page, 1)).not.toHaveAttribute('data-size-picked', '');
  expect(await cssWidth(page, 1)).toBe(WIDTH.s);
  const sizes = await (await page.request.get('/api/boards/roadmap')).json() as { state: { sizes?: Record<string, string> } };
  // get_board leaves `sizes` out when no card has a pick (api.md 32).
  expect(sizes.state.sizes ?? {}).toEqual({});
});

for (const theme of THEMES) {
  test(`flag on: axe passes on the board at full size, the Width list open (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page);
    await zoomToFull(page, { check: true });
    await card(page, 1).focus();
    await card(page, 1).locator('.vb-node-title').click({ position: { x: 4, y: 4 } });
    await openSelectionBar(page);
    await bar(page).getByRole('button', { name: 'Width' }).click();
    await expect(page.getByRole('menu', { name: /^Width of/ })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
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
  // The person's pick (the selection bar's Width, D-099 3) is the node's own width; no control on the node.
  await expect(sample(page, 'Is the credit two months or three?')).toHaveAttribute('data-size-picked', '');
  await expect(section(page).locator('.vb-size, .vb-size-trig, .vb-node-pin')).toHaveCount(0);
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
