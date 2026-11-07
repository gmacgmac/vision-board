// The root a host gives the board (plugin.md § A guest in the host's page; FE_01): the board needs it to be a containing
// block, because everything it draws is placed against it, so its sheet gives the root `position: relative`. That is the
// board's default and no more: a host's own `position` on the root wins, from a sheet loaded before the board's or after
// it, whatever its selector weighs. The rule is `.vb-board { :where(&) { position: relative } }`, which takes no
// specificity and so loses a tie it would otherwise win by coming later.
import type { Page } from '@playwright/test';
import { expect, test } from './helpers.ts';
import { call, LINES, open } from './board-host-page.ts';

const positionOf = (page: Page, id: string) => page.locator(`#${id}`).evaluate((el) => getComputedStyle(el).position);

/** The host's sheet, in the page's head before the board's sheet or after it. */
async function hostSheet(page: Page, css: string, where: 'before' | 'after'): Promise<void> {
  await page.evaluate(({ css, where }) => {
    const style = document.createElement('style');
    style.textContent = css;
    if (where === 'before') document.head.prepend(style); else document.head.append(style);
  }, { css, where });
}

for (const where of ['before', 'after'] as const) {
  test(`a host's own position on the root wins: its rule loaded ${where} the board's sheet, a class (as heavy as the board's own) or an id`, async ({ page }) => {
    await open(page);
    await hostSheet(page, '.pane { position: absolute; } #b { position: sticky; top: 0; }', where);
    await page.evaluate(() => document.getElementById('a')!.classList.add('pane'));
    await call(page, (h, lines: object[]) => { h.mount('a', lines, lines.length); h.mount('b', lines, lines.length); }, LINES);
    await expect(page.locator('#a .vb-toolbar')).toBeVisible();
    await expect(page.locator('#b .vb-toolbar')).toBeVisible();
    expect(await positionOf(page, 'a')).toBe('absolute');
    expect(await positionOf(page, 'b')).toBe('sticky');
    // Whatever the root's position, the board's controls are placed against it: the toolbar sits at the root's top edge.
    for (const id of ['a', 'b']) {
      const gap = await page.evaluate((i) => document.querySelector(`#${i} .vb-toolbar`)!.getBoundingClientRect().top - document.getElementById(i)!.getBoundingClientRect().top, id);
      expect(gap).toBe(0);
    }
  });
}

test('a root with no position of its own gets relative, and is given back as it was: the board puts nothing on it that stays', async ({ page }) => {
  await open(page);
  expect(await positionOf(page, 'a')).toBe('static');
  await call(page, (h, lines: object[]) => { h.mount('a', lines, lines.length); }, LINES);
  await expect(page.locator('#a .vb-toolbar')).toBeVisible();
  expect(await positionOf(page, 'a')).toBe('relative');
  await call(page, (h) => { h.unmount('a'); });
  expect(await page.locator('#a').evaluate((el) => el.className)).toBe('');
  expect(await positionOf(page, 'a')).toBe('static');
});
