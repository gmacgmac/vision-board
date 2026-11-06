// A container's layout icons show a tooltip, not the big popover (host-styling FE_02, layoutTooltip flag): on hover and
// on keyboard focus each icon shows its name over what it does, beside it and never over it; the hint is the icon's
// accessible description whether or not the tip shows; Esc dismisses the tip; the pointer may move onto it; and
// choosing a layout works by pointer and by keyboard as before. Off (?flags=-layoutTooltip) the popover opens as it did.
// On a board of its own, drawn through the API (rail-board.ts).
import type { Locator, Page } from '@playwright/test';
import { MODES } from '#format';
import { MODE_HINT, MODE_LABEL } from '#ui';
import { boardLines } from './board-lines.ts';
import { lc, pixel } from './apca.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import { board, boxOf, frame, THEMES, zoomTo } from './rail-board.ts';

const radio = (page: Page, mode: (typeof MODES)[number]) => frame(page).getByRole('radio', { name: MODE_LABEL[mode], exact: true });
const tip = (page: Page, mode: (typeof MODES)[number]) => radio(page, mode).locator('.vb-mode-tip');
const away = (page: Page) => page.mouse.move(2, 990);
const modeActs = async (page: Page, id: string) => (await boardLines(page, id)).filter((l) => l.type === 'act' && l.action === 'mode');

/** The tip's box does not overlap the box of the control it explains. */
async function beside(control: Locator, shown: Locator): Promise<void> {
  const [c, t] = [await boxOf(control), await boxOf(shown)];
  const apart = t.x >= c.x + c.width - 0.5 || t.x + t.width <= c.x + 0.5 || t.y >= c.y + c.height - 0.5 || t.y + t.height <= c.y + 0.5;
  expect(apart, `tip ${JSON.stringify(t)} must not cover its control ${JSON.stringify(c)}`).toBe(true);
}

test('hover on each of the six icons: its name over what it does, beside the icon, and no popover', async ({ page, request }) => {
  await board(page, request);
  await zoomTo(page, 1);
  await frame(page).locator('.vb-region-tools').hover();
  for (const mode of MODES) {
    await expect(tip(page, mode), mode).toBeHidden();
    await radio(page, mode).hover();
    await expect(tip(page, mode), mode).toBeVisible();
    const name = tip(page, mode).locator('.vb-mode-tip-name');
    const hint = tip(page, mode).locator('.vb-mode-tip-hint');
    await expect(name).toHaveText(MODE_LABEL[mode]);
    await expect(hint).toHaveText(MODE_HINT[mode]);
    expect((await boxOf(name)).y, `${mode}: the name is above the hint`).toBeLessThan((await boxOf(hint)).y);
    await beside(radio(page, mode), tip(page, mode));
    await expect(frame(page).locator('.vb-mode-pop, .vb-mtile')).toHaveCount(0);
    await expect(frame(page)).not.toHaveAttribute('data-open', /.*/);
  }
});

test('focus on each of the six icons: the tip shows, the hint is the description, Esc dismisses the tip and keeps the focus', async ({ page, request }) => {
  await board(page, request);
  await zoomTo(page, 1);
  for (const mode of MODES) {
    const icon = radio(page, mode);
    await icon.focus();
    await expect(tip(page, mode), mode).toBeVisible();
    await expect(icon).toHaveAccessibleName(MODE_LABEL[mode]);
    await expect(icon).toHaveAccessibleDescription(MODE_HINT[mode]);
    await page.keyboard.press('Escape');
    await expect(tip(page, mode), mode).toBeHidden();
    await expect(icon).toBeFocused();
    await expect(icon, 'dismissed or not, the description stays').toHaveAccessibleDescription(MODE_HINT[mode]);
  }
});

test('every icon describes itself, with no hover or focus at all', async ({ page, request }) => {
  await board(page, request);
  for (const mode of MODES) await expect(radio(page, mode)).toHaveAccessibleDescription(MODE_HINT[mode]);
  await expect(frame(page).locator('.vb-mode-tip:visible')).toHaveCount(0);
});

test('the arrow keys move the tip with the focus: one tip at a time; the cog, Comment and the switch have none', async ({ page, request }) => {
  await board(page, request);
  await zoomTo(page, 1);
  await radio(page, 'grid').focus();
  await expect(tip(page, 'grid')).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(radio(page, 'flow')).toBeFocused();
  await expect(tip(page, 'flow')).toBeVisible();
  await expect(tip(page, 'grid')).toBeHidden();
  await expect(frame(page).locator('.vb-mode-tip:visible')).toHaveCount(1);
  await frame(page).locator('.vb-cog').focus();
  await expect(frame(page).locator('.vb-mode-tip:visible')).toHaveCount(0);
  await frame(page).locator('.vb-region-comment').hover();
  await expect(frame(page).locator('.vb-mode-tip:visible')).toHaveCount(0);
});

test('hoverable and dismissible (WCAG 1.4.13): the pointer can move onto the tip and it stays; leaving closes it; Esc closes it under the pointer', async ({ page, request }) => {
  await board(page, request);
  await zoomTo(page, 1);
  await frame(page).locator('.vb-region-tools').hover();
  await radio(page, 'row').hover();
  await expect(tip(page, 'row')).toBeVisible();
  await tip(page, 'row').hover();
  await expect(tip(page, 'row')).toBeVisible();
  await away(page);
  await expect(tip(page, 'row')).toBeHidden();
  await frame(page).locator('.vb-region-tools').hover();
  await radio(page, 'row').hover();
  await expect(tip(page, 'row')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tip(page, 'row')).toBeHidden();
});

test('choosing a layout still works: a click sends one mode act, Enter and Space on a focused icon do too, no popover opens', async ({ page, request }) => {
  const d = await board(page, request);
  await zoomTo(page, 1);
  const before = (await modeActs(page, d.board)).length;
  await frame(page).locator('.vb-region-tools').hover();
  await radio(page, 'row').click();
  await expect(frame(page)).toHaveAttribute('data-mode', 'row');
  await expect(radio(page, 'row')).toHaveAttribute('aria-checked', 'true');
  await radio(page, 'column').focus();
  await page.keyboard.press('Enter');
  await expect(frame(page)).toHaveAttribute('data-mode', 'column');
  await radio(page, 'flow').focus();
  await page.keyboard.press('Space');
  await expect(frame(page)).toHaveAttribute('data-mode', 'flow');
  const acts = await modeActs(page, d.board);
  expect(acts.length - before).toBe(3);
  expect(acts.slice(-3).map((a) => a.mode)).toEqual(['row', 'column', 'flow']);
  await expect(frame(page).locator('.vb-mode-pop')).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`${theme}: the tip reads at Lc 60 and is clean for axe`, async ({ page, request }) => {
    await setTheme(page, theme);
    await board(page, request);
    await zoomTo(page, 1);
    await radio(page, 'lanes').focus();
    const shown = tip(page, 'lanes');
    await expect(shown).toBeVisible();
    const colours = await shown.evaluate((e) => {
      const back = getComputedStyle(e).backgroundColor;
      const of = (s: string) => getComputedStyle(e.querySelector(s)!).color;
      return { back, name: of('.vb-mode-tip-name'), hint: of('.vb-mode-tip-hint') };
    });
    const back = await pixel(page, colours.back);
    for (const part of [colours.name, colours.hint]) expect(Math.abs(lc(await pixel(page, part), back))).toBeGreaterThanOrEqual(60);
    await expectNoAxeViolations(page);
  });
}

test('off (?flags=-layoutTooltip): the popover opens as before and the icons carry no tip', async ({ page, request }) => {
  await board(page, request, '?flags=-layoutTooltip');
  await zoomTo(page, 1);
  await expect(frame(page).locator('.vb-mode-tip')).toHaveCount(0);
  await radio(page, 'grid').hover();
  await expect(frame(page).locator('.vb-mode-pop')).toBeVisible();
  await expect(frame(page).locator('.vb-mtile')).toHaveCount(6);
});
