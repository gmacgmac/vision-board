// Container tool rail, its states (toolRail flag; cortex-tasks/board/2026-10-25_board-ui_container-tool-rail.md,
// Design 4, 6 and 7; placement, bounds, dim and APCA are container-rail.spec.ts): a short frame's rail
// collapses and expands over the cards on hover or focus, collapsing again on leave, blur and Esc; its
// popovers open to its right; Up and Down move through it and Right opens the cog's menu; axe passes
// at rest, expanded and open; a touch screen never dims it; and the gallery's rail section.
import type { Locator, Page } from '@playwright/test';
import { act } from './agent-board.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import { board, boxOf, centreOn, frame, iconOpacity, rail, THEMES, zoomTo } from './rail-board.ts';
import type { Box } from './rail-board.ts';

/** The rail's buttons drawn (any height), by name. */
const drawn = (f: Locator) => f.locator('.vb-mode-row button').evaluateAll((bs) => bs
  .filter((b) => b.getBoundingClientRect().height > 1).map((b) => b.getAttribute('aria-label')!.split(' ')[0]));
const cardBoxes = (page: Page) => page.locator('vb-node').evaluateAll((ns) => ns.map((n) => n.getBoundingClientRect().toJSON() as Box));

test('a short frame: the rail collapses, expands over the cards on hover or focus moving nothing, and collapses on leave, blur and Esc', async ({ page, request }) => {
  await board(page, request);
  await zoomTo(page, 1);
  const f = frame(page);
  const all = ['Grid', 'Flow', 'Lanes', 'Radial', 'Column', 'Row', 'Match', 'Comment', 'Settings'];
  expect((await boxOf(f)).height, 'a one-card frame is short of the full rail').toBeLessThan(275);
  expect(await drawn(f)).toEqual(['Grid', 'Comment', 'Settings']);
  const cards = await cardBoxes(page);
  await rail(page).hover();
  expect(await drawn(f)).toEqual(all);
  expect(await f.evaluate((e) => getComputedStyle(e).zIndex), 'drawn over the cards').toBe('4');
  expect(await cardBoxes(page), 'nothing moved').toEqual(cards);
  await page.mouse.move(2, 990);
  expect(await drawn(f)).toEqual(['Grid', 'Comment', 'Settings']);
  // Keyboard: Tab from the grip reaches the rail next (Design 7), which expands; Esc collapses it,
  // keeping the focused button drawn; moving on expands it again; Tab out collapses it.
  await f.locator('.vb-region-grip').focus();
  await page.keyboard.press('Tab');
  await expect(f.getByRole('radio', { name: 'Grid' })).toBeFocused();
  expect(await drawn(f)).toEqual(all);
  await page.keyboard.press('ArrowDown');
  await expect(f.getByRole('radio', { name: 'Flow' })).toBeFocused();
  // The icon's tooltip is open (layoutTooltip flag): the first Esc dismisses it and nothing else; the next collapses the rail.
  await expect(f.getByRole('radio', { name: 'Flow' }).locator('.vb-mode-tip')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(f.getByRole('radio', { name: 'Flow' }).locator('.vb-mode-tip')).toBeHidden();
  expect(await drawn(f)).toEqual(all);
  await page.keyboard.press('Escape');
  await expect(f.getByRole('radio', { name: 'Flow' })).toBeFocused();
  expect(await drawn(f)).toEqual(['Grid', 'Flow', 'Comment', 'Settings']);
  await page.keyboard.press('ArrowDown');
  expect(await drawn(f)).toEqual(all);
  await page.keyboard.press('Shift+Tab');
  await expect(f.locator('.vb-region-grip')).toBeFocused();
  expect(await drawn(f)).toEqual(['Grid', 'Comment', 'Settings']);
  // The narrowest form: only the cog (no badge shows), expanding the same way.
  await zoomTo(page, 0.56);
  expect(await drawn(f)).toEqual(['Settings']);
  await rail(page).hover();
  expect(await drawn(f)).toEqual(all);
});

test('popovers open to the right of the rail, top-aligned with what opened them, inside the window (the layout popover with layoutTooltip off)', async ({ page, request }) => {
  const d = await board(page, request, '?flags=-layoutTooltip');
  await act(page, d, { action: 'comment', board: d.board, region: 'p', text: 'Is the order right?' });
  await zoomTo(page, 0.8);
  await centreOn(page);
  const f = frame(page);
  const view = page.viewportSize()!;
  const check = async (pop: Locator, by: Locator, what: string) => {
    await expect(pop).toBeVisible();
    const [p, r, b] = [await boxOf(pop), await boxOf(rail(page)), await boxOf(by)];
    expect(p.x, `${what}: right of the rail`).toBeGreaterThanOrEqual(r.x + r.width);
    expect(Math.abs(p.y - b.y), `${what}: top-aligned with its opener`).toBeLessThanOrEqual(4);
    expect(p.x + p.width <= view.width && p.y + p.height <= view.height && p.y >= 0, `${what}: inside the window`).toBe(true);
  };
  await rail(page).hover();
  await f.getByRole('radio', { name: 'Grid' }).hover();
  await check(f.locator('.vb-mode-pop'), f.getByRole('radio', { name: 'Grid' }), 'layout popover');
  // The pointer crosses the gap into the popover and it stays (WCAG 1.4.13).
  await f.locator('.vb-mode-pop').hover();
  await expect(f.locator('.vb-mode-pop')).toBeVisible();
  await page.mouse.move(2, 990);
  await expect(f.locator('.vb-mode-pop')).toBeHidden();
  await f.locator('.vb-region-comment').hover();
  await check(f.locator('.vb-note-pop'), f.locator('.vb-region-comment'), 'note preview');
  await page.mouse.move(2, 990);
  await expect(f.locator('.vb-note-pop')).toBeHidden();
  await f.locator('.vb-cog').click();
  await check(f.locator('.vb-region-menu'), f.locator('.vb-cog'), 'settings menu');
  await page.keyboard.press('Escape');
  await expect(f.locator('.vb-region-menu')).toBeHidden();
});

test('keys: Up and Down move through the rail and wrap; on the cog Right opens its menu, Left and Esc close it', async ({ page, request }) => {
  await board(page, request);
  await zoomTo(page, 1);
  const f = frame(page);
  const grid = f.getByRole('radio', { name: 'Grid' });
  const cog = f.locator('.vb-cog');
  await grid.focus();
  await page.keyboard.press('ArrowDown');
  await expect(f.getByRole('radio', { name: 'Flow' })).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(grid).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(cog).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(grid, 'Down on the cog moves on (wrapping), the menu opens to the right').toBeFocused();
  await expect(f).not.toHaveAttribute('data-open', 'menu');
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowRight');
  await expect(f).toHaveAttribute('data-open', 'menu');
  await expect(f.getByRole('menuitem', { name: 'Reset places' })).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(f).not.toHaveAttribute('data-open');
  await expect(cog).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(f).toHaveAttribute('data-open', 'menu');
  await page.keyboard.press('Escape');
  await expect(f).not.toHaveAttribute('data-open');
  await expect(cog).toBeFocused();
});

for (const theme of THEMES) {
  test(`axe passes with the rail at rest, expanded and with its menu open (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    await board(page, request);
    await zoomTo(page, 1);
    await expectNoAxeViolations(page);
    await rail(page).hover();
    await expectNoAxeViolations(page);
    await frame(page).locator('.vb-cog').click();
    await expectNoAxeViolations(page);
  });
}

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true, isMobile: true });
  test('the rail is never dimmed (no hover to light it)', async ({ page, request }) => {
    await board(page, request);
    expect(await page.evaluate(() => matchMedia('(hover: none)').matches)).toBe(true);
    await expect.poll(() => iconOpacity(frame(page))).toBe(1);
  });
});

for (const theme of THEMES) {
  test(`the gallery's rail section: rest, lit, collapsed, expanded, narrowest, popovers, tiles and Later (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    const section = page.locator('section[data-feature="toolRail"]');
    await expect(section.locator('vb-region[data-rail]')).toHaveCount(14);
    await expect(section.locator('vb-region[data-region="rail-menu"] .vb-region-menu')).toBeVisible();
    // The layout tiles: hovered, pressed, focus ring and current, and paused when the board is locked.
    const tiles = section.locator('vb-region[data-region="rail-tiles"] .vb-mode-pop');
    await expect(tiles.locator('.vb-mtile[data-hover]')).toHaveAttribute('data-tile', 'flow');
    await expect(tiles.locator('.vb-mtile[data-look="pressed"]')).toHaveAttribute('data-tile', 'radial');
    await expect(tiles.locator('.vb-mtile[data-look="focus"]')).toHaveAttribute('data-tile', 'row');
    await expect(tiles.locator('.vb-mtile[data-current]')).toHaveAttribute('data-tile', 'grid');
    await expect(section.locator('vb-region[data-region="rail-tiles-locked"] .vb-mtile[data-paused]')).toHaveCount(6);
    await expectNoAxeViolations(page);
    await expect(section).toHaveScreenshot(`rail-${theme}.png`);
  });
}
