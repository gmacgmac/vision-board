// Save as PDF through the host (nclite's `savePdf(ask)`, ADR-0381; plugin.md § What the host gives): the board draws
// Save as PDF only when the host gives `savePdf` (never for the deprecated `print` alone); it sets its print view inside
// its own root and asks with the board's title, the look Save in chose and the page's size, the root's own (no
// `content`, no `orientation`); it names no page and sets nothing on <html>; the root wears the board's canvas, so the
// page's colour read from it is the board's; the host's rejection is said through `notify`; and the view comes off after.
import type { Page } from '@playwright/test';
import { drawn, drawPlans, drive, expect, openHost, test } from './harness.ts';

const more = (page: Page) => page.locator('.host-root #vb1-toolbar-menu');
const item = (page: Page, id: string) => page.locator(`.host-root #vb1-${id}`);

/** Opens Save as PDF… from "⋯", chooses `look`, and saves. */
async function saveIn(page: Page, look: 'light' | 'dark'): Promise<void> {
  await more(page).click();
  await item(page, 'print-board').click();
  await item(page, `files-theme-${look}`).check();
  await item(page, 'files-go').click();
  await expect(item(page, 'files-dialog')).toBeHidden();
}

for (const [name, options] of [['no hook', {}], ['the deprecated print alone', { printOnly: true }]] as const) {
  test(`${name}: no Save as PDF item`, async ({ page, host }) => {
    await openHost(page, host, options);
    await drawPlans(host);
    await drawn(page);
    await more(page).click();
    await expect(item(page, 'print-board')).toHaveCount(0);
  });
}

test('savePdf(ask): the title, the look and the root\'s size, no content or orientation; the root on the board\'s canvas; nothing on <html>; the view comes off after', async ({ page, host }) => {
  await openHost(page, host, { savePdf: 'ok' });
  await drawPlans(host);
  await drawn(page);
  await more(page).click();
  await expect(item(page, 'print-board')).toHaveText('Save as PDF…');
  await page.keyboard.press('Escape');
  const html = await page.evaluate(() => document.documentElement.getAttributeNames().sort());
  for (const look of ['dark', 'light'] as const) await saveIn(page, look);
  const { prints } = await drive(page, 'record');
  expect(prints).toHaveLength(2);
  for (const [i, look] of (['dark', 'light'] as const).entries()) {
    const p = prints[i];
    expect(p.keys, 'title, look and size; no content, no orientation').toEqual(['look', 'size', 'title']);
    expect(p.ask.title).toBe('Plans');
    expect(p.ask.look).toBe(look);
    expect(p.ask.size, 'the page is the root\'s own size').toEqual({ width: p.w, height: p.h });
    expect(Number.isInteger(p.w) && Number.isInteger(p.h) && p.w > 0 && p.h > 0).toBe(true);
    expect(p.ground, 'the root wears the board\'s canvas: one colour on the page').toBe(p.canvas);
    expect(p.ground).not.toBe('rgba(0, 0, 0, 0)');
    expect(p.html, 'the board sets nothing on <html>').toEqual(html);
    expect(p.root, 'the print view, inside the root: no page name, no print theme').toEqual(['data-vb-print', 'data-vb-print-border']);
  }
  expect(await page.locator('.host-root').evaluate((r) => r.getAttributeNames().filter((a) => a.startsWith('data-vb-print')))).toEqual([]);
  await expect(page.locator('.host-root .vb-toolbar')).toBeVisible();
});

test('a rejected save: the host\'s words through notify, as an error; the view comes off', async ({ page, host }) => {
  await openHost(page, host, { savePdf: 'A Save as PDF is already under way.' });
  await drawPlans(host);
  await drawn(page);
  await saveIn(page, 'light');
  await expect.poll(async () => (await drive(page, 'record')).notices).toContainEqual({ text: 'A Save as PDF is already under way.', tone: 'error' });
  expect(await page.locator('.host-root').evaluate((r) => r.getAttributeNames().filter((a) => a.startsWith('data-vb-print')))).toEqual([]);
});
