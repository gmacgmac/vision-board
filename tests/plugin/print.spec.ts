// Print through the host (nclite's `print(ask)`, plugin.md § What the host gives; folders-labels-print PLAN decision 6):
// the board draws Print only when the host gives `print`; it sets its print view inside its own root and asks with the
// board's title, the look Print in chose and the side its fit is wider on, never `content`; it names no page and sets
// nothing on <html>; the host's rejection is said through `notify`; and the view comes off after.
import type { Page } from '@playwright/test';
import { drawn, drawPlans, drive, expect, openHost, test } from './harness.ts';

const more = (page: Page) => page.locator('.host-root #vb1-toolbar-menu');
const item = (page: Page, id: string) => page.locator(`.host-root #vb1-${id}`);

/** Opens Print… from "⋯", chooses `look`, and prints. */
async function printIn(page: Page, look: 'light' | 'dark'): Promise<void> {
  await more(page).click();
  await item(page, 'print-board').click();
  await item(page, `files-theme-${look}`).check();
  await item(page, 'files-go').click();
  await expect(item(page, 'files-dialog')).toBeHidden();
}

test('no print hook, no Print item', async ({ page, host }) => {
  await openHost(page, host);
  await drawPlans(host);
  await drawn(page);
  await more(page).click();
  await expect(item(page, 'print-board')).toHaveCount(0);
});

test('print(ask): the title, the look and the fitted side, no content; nothing on <html>, no page named; the view comes off after', async ({ page, host }) => {
  await openHost(page, host, { print: 'ok' });
  await drawPlans(host);
  await drawn(page);
  const html = await page.evaluate(() => document.documentElement.getAttributeNames().sort());
  for (const look of ['dark', 'light'] as const) await printIn(page, look);
  const { prints } = await drive(page, 'record');
  expect(prints).toHaveLength(2);
  for (const [i, look] of (['dark', 'light'] as const).entries()) {
    const p = prints[i];
    expect(p.keys, 'title, look and orientation; no content').toEqual(['look', 'orientation', 'title']);
    expect(p.ask.title).toBe('Plans');
    expect(p.ask.look).toBe(look);
    expect(p.ask.orientation).toBe(p.w > p.h ? 'landscape' : 'portrait');
    expect(p.html, 'the board sets nothing on <html>').toEqual(html);
    expect(p.root, 'the print view, inside the root: no page name, no print theme').toEqual(['data-vb-print', 'data-vb-print-border']);
  }
  expect(await page.locator('.host-root').evaluate((r) => r.getAttributeNames().filter((a) => a.startsWith('data-vb-print')))).toEqual([]);
  await expect(page.locator('.host-root .vb-toolbar')).toBeVisible();
});

test('a rejected print: the host\'s words through notify, as an error; the view comes off', async ({ page, host }) => {
  await openHost(page, host, { print: 'A print is already under way.' });
  await drawPlans(host);
  await drawn(page);
  await printIn(page, 'light');
  await expect.poll(async () => (await drive(page, 'record')).notices).toContainEqual({ text: 'A print is already under way.', tone: 'error' });
  expect(await page.locator('.host-root').evaluate((r) => r.getAttributeNames().filter((a) => a.startsWith('data-vb-print')))).toEqual([]);
});
