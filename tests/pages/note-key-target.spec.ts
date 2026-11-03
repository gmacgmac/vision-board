// Which card the note key (C) writes on (KEY_01, point 394, focusLeads flag): the card the keyboard
// focus is on. A selection of two or more the person made on purpose counts when the focus is in it,
// or nowhere; N and the bar's Comment are the selection's wherever focus is. A ✓ or ✗ gives focus back
// to its card only if the person has not moved it on while the write was away. On the worker's roadmap
// board, fresh for this file (servers.ts); no note is sent, and every bubble is closed with Esc.
import type { Page } from '@playwright/test';
import { expect, test, zoomToControls } from './helpers.ts';
import { bubble, card, openBoard, selectedIds } from './board-page.ts';

/** Click a card's title (its content, not a control): selects it. */
const clickCard = (page: Page, n: number, modifiers: ('Shift' | 'Meta' | 'Control')[] = []) =>
  card(page, n).locator('.vb-node-title').click({ modifiers, position: { x: 4, y: 4 } });

/** The cards the open note bubble is written on, by id (the page marks each with data-bubble). */
const writtenOn = (page: Page) => page.locator('vb-node[data-bubble]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id));
const focusedCard = (page: Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.closest('vb-node')?.getAttribute('data-id') ?? null);

for (const [name, query] of [['on', ''], ['off', '?flags=-focusLeads']] as const) {
  test.describe(`focusLeads ${name}`, () => {
    const led = name === 'on';
    test.beforeEach(async ({ page }) => { await openBoard(page, { query }); });

    test('one card selected (by a click), the focus moved to another: C writes on the focused card', async ({ page }) => {
      await clickCard(page, 1);
      await card(page, 2).focus();
      await page.keyboard.press('c');
      await expect(bubble(page)).toBeVisible();
      expect(await writtenOn(page)).toEqual(['2']);
      expect(await selectedIds(page)).toEqual(['1']);
      await page.keyboard.press('Escape');
    });

    test('two selected, focus on one of them: C is the group note, as before', async ({ page }) => {
      await clickCard(page, 1);
      await clickCard(page, 3, ['Shift']);
      await card(page, 3).focus();
      await page.keyboard.press('c');
      await expect(bubble(page)).toBeVisible();
      expect(await writtenOn(page)).toEqual(['1', '3']);
      await page.keyboard.press('Escape');
    });

    test('two selected, focus on a card outside them: C writes on the focused card alone; N is still the selection\'s', async ({ page }) => {
      await clickCard(page, 1);
      await clickCard(page, 3, ['Shift']);
      await card(page, 2).focus();
      await page.keyboard.press('c');
      await expect(bubble(page)).toBeVisible();
      expect(await writtenOn(page)).toEqual(led ? ['2'] : ['1', '3']);
      expect(await selectedIds(page)).toEqual(['1', '3']);
      await page.keyboard.press('Escape');
      await expect(bubble(page)).toBeHidden();
      await card(page, 2).focus();
      await page.keyboard.press('n');
      await expect(bubble(page)).toBeVisible();
      expect(await writtenOn(page)).toEqual(['1', '3']);
      await page.keyboard.press('Escape');
    });

    test('a ✗ whose write comes back after the focus has moved on does not take it back', async ({ page }) => {
      const [from, to] = led ? [1, 2] : [4, 5]; // each group answers cards of its own: the board is shared
      await clickCard(page, from);
      await zoomToControls(page);
      await page.route('**/api/**', async (route) => {
        if (route.request().method() === 'POST') await new Promise((r) => setTimeout(r, 600));
        await route.continue();
      });
      await card(page, from).locator('button[data-act="drop"]').click();
      await card(page, to).focus();
      await expect(card(page, from)).toHaveAttribute('data-status', 'dropped');
      expect(await focusedCard(page)).toBe(String(led ? to : from));
      await page.keyboard.press('c');
      await expect(bubble(page)).toBeVisible();
      expect(await writtenOn(page)).toEqual([String(led ? to : from)]);
      await page.keyboard.press('Escape');
    });
  });
}

test('a ✗ with the focus still on its card (or lost to the redraw) leaves the focus on that card', async ({ page }) => {
  await openBoard(page);
  await zoomToControls(page);
  await card(page, 6).locator('button[data-act="drop"]').click();
  await expect(card(page, 6)).toHaveAttribute('data-status', 'dropped');
  await expect.poll(() => focusedCard(page)).toBe('6');
});
