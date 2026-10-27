// The folder the board has open is always on show (current-folder task, currentFolder flag, on by
// default, needs openFolder): a chip at the far left of the toolbar with the folder's name, its path
// (home as ~) in the tooltip, a click opening the folder dialog; a plain "Current:" line under Open
// folder… in the "⋯" menu; a "Current folder" line with Copy at the top of the dialog, apart from its
// lists; narrow windows keep the chip whole; axe and APCA light and dark; flag off is the board as it
// was; the gallery's section. Runs on the open-folder tests' own server (folder-server.ts, a temp home).
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { FolderServer } from './folder-server.ts';
import { startFolderServer } from './folder-server.ts';
import { lc, pixel, resolved } from './apca.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { folderDialog as dialog, menu, menuButton } from './board-page.ts';

test.describe.configure({ mode: 'serial' });

let srv: FolderServer;
let long: string;
const LONG_NAME = 'atlas-customer-research-and-interview-notes-for-the-platform-team';
test.beforeAll(async () => {
  srv = await startFolderServer();
  long = path.join(srv.home, 'projects', LONG_NAME);
  fs.mkdirSync(long, { recursive: true });
});
test.afterAll(async () => { await srv.close(); });
test.beforeEach(async () => { await srv.open(srv.start); });

async function open(page: Page, flags = '') {
  await page.goto(`${srv.base}/?vbwork${flags && `&flags=${flags}`}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
}
/** The long-named folder, which has no board yet: make one as the person does, then open it. */
async function openLong(page: Page) {
  await srv.open(long, true);
  await page.goto(`${srv.base}/?vbwork`);
  await expect(chip(page)).toBeVisible();
  const made = await page.request.put(`${srv.base}/api/boards/long-board`, { data: { title: 'A board in a folder with a long name', summary: 'For the chip.' } });
  expect([200, 201]).toContain(made.status());
  await open(page);
}
const chip = (page: Page) => page.locator('#folder-chip');
const current = (page: Page) => page.locator('.vb-menu-current');
const line = (page: Page) => dialog(page).getByRole('group', { name: 'Current folder' });
const THEMES: Theme[] = ['light', 'dark'];

test('the chip is first in the toolbar, names the folder, gives the path in its tooltip and opens the dialog', async ({ page }) => {
  await open(page);
  await expect(chip(page)).toHaveText('start');
  await expect(chip(page)).toHaveAttribute('title', '~/projects/start');
  await expect(chip(page)).toHaveAccessibleName('Folder start: ~/projects/start. Open another folder');
  await expect(chip(page)).toHaveAttribute('aria-haspopup', 'dialog');
  // Before the board picker, to its left (after the app icon).
  const [c, b] = [(await chip(page).boundingBox())!, (await page.locator('#board').boundingBox())!];
  expect(c.x + c.width).toBeLessThanOrEqual(b.x);
  await chip(page).click();
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(chip(page)).toBeFocused();
  // By keyboard.
  await chip(page).focus();
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toBeVisible();
});

for (const width of [1500, 1100, 1024, 768]) {
  test(`at ${width}px a long folder name is cut with an ellipsis and the toolbar stays whole`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await openLong(page);
    await expect(chip(page)).toHaveAttribute('title', `~/projects/${LONG_NAME}`);
    const shown = await page.evaluate(() => {
      const bar = document.querySelector('.vb-toolbar') as HTMLElement;
      const name = document.querySelector('#folder-chip .vb-folder-chip-name') as HTMLElement;
      const box = (document.querySelector('#folder-chip') as HTMLElement).getBoundingClientRect();
      const ends = [...bar.querySelectorAll<HTMLElement>(':scope > *, .vb-toolbar-end > *')]
        .filter((e) => e.getClientRects().length > 0 && !e.classList.contains('vb-visually-hidden') && !e.classList.contains('vb-toolbar-end'))
        .map((e) => e.getBoundingClientRect());
      return {
        cut: name.scrollWidth > name.clientWidth, width: box.width, ellipsis: getComputedStyle(name).textOverflow,
        scroll: bar.scrollWidth - bar.clientWidth, page: document.documentElement.scrollWidth - innerWidth,
        inside: ends.every((r) => r.left >= 0 && r.right <= innerWidth),
      };
    });
    expect(shown.cut, 'the name is cut').toBe(true);
    expect(shown.ellipsis).toBe('ellipsis');
    expect(shown.width, 'the chip has room for its icon and an ellipsis').toBeGreaterThanOrEqual(36);
    expect(shown.scroll, 'the toolbar scrolls').toBeLessThanOrEqual(0);
    expect(shown.page, 'the page scrolls sideways').toBeLessThanOrEqual(0);
    expect(shown.inside, 'every control inside the window').toBe(true);
  });
}

test('the "⋯" menu says which folder is open on a line under Open folder…, which is not a row', async ({ page }) => {
  await open(page);
  await menuButton(page).click();
  await expect(current(page)).toHaveText('Current: ~/projects/start');
  await expect(current(page)).toHaveAttribute('title', '~/projects/start');
  expect(await menu(page).getByText('Current:').evaluate((e) => e.getAttribute('role'))).toBe('none');
  // Under Open folder…, and the keys skip it: End lands on the row, Down wraps to the first.
  const [row, line] = [(await page.locator('#open-folder').boundingBox())!, (await current(page).boundingBox())!];
  expect(line.y).toBeGreaterThanOrEqual(row.y + row.height - 1);
  await page.keyboard.press('End');
  await expect(page.locator('#open-folder')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#theme')).toBeFocused();
});

test('a long path is elided in the middle in the menu, the whole path in its tooltip', async ({ page }) => {
  await openLong(page);
  await menuButton(page).click();
  await expect(current(page)).toHaveText(`Current: ~/…/${LONG_NAME}`);
  await expect(current(page)).toHaveAttribute('title', `~/projects/${LONG_NAME}`);
});

test('the dialog: its heading, then the Current folder line apart from the lists, and Copy says Copied', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: srv.base });
  await open(page);
  await chip(page).click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText('Open folder — choose a project folder');
  await expect(line(page)).toBeVisible();
  await expect(line(page).locator('code')).toHaveText('~/projects/start');
  // Apart from the browse and recent lists: outside the scrolling box, above it.
  await expect(dialog(page).locator('.vb-folder-lists').locator('.vb-folder-current')).toHaveCount(0);
  const [here, lists] = [(await line(page).boundingBox())!, (await dialog(page).locator('.vb-folder-lists').boundingBox())!];
  expect(here.y + here.height).toBeLessThanOrEqual(lists.y);
  const copy = line(page).getByRole('button');
  await expect(copy).toHaveText('Copy');
  await copy.click();
  await expect(copy).toHaveText('Copied');
  await expect(line(page).getByRole('status')).toHaveText('Path copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(srv.start);
  await expect(copy).toHaveText('Copy', { timeout: 5000 });
  // The picking flow is as before: Cancel closes it, the lists still choose.
  await expect(dialog(page).getByRole('list', { name: /^In / }).getByRole('button')).toHaveText(['projects']);
});

test('the dialog line is for the folder open now, not the one being browsed', async ({ page }) => {
  await open(page);
  await chip(page).click();
  await dialog(page).getByRole('list', { name: /^In / }).getByRole('button').first().click();
  await expect(dialog(page).locator('.vb-folder-status')).not.toBeEmpty();
  await expect(line(page).locator('code')).toHaveText('~/projects/start');
});

for (const theme of THEMES) {
  test(`axe passes with the chip, the open menu and the dialog (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page);
    await expectNoAxeViolations(page);
    if (process.env.CF_SHOTS) await page.locator('.vb-toolbar').screenshot({ path: `${process.env.CF_SHOTS}/toolbar-${theme}.png` });
    await menuButton(page).click();
    await expect(current(page)).toBeVisible();
    await expectNoAxeViolations(page);
    if (process.env.CF_SHOTS) {
      const box = (await menu(page).boundingBox())!;
      await page.screenshot({ path: `${process.env.CF_SHOTS}/menu-${theme}.png`, clip: { x: box.x - 40, y: 0, width: box.width + 60, height: box.y + box.height + 12 } });
    }
    await page.keyboard.press('Escape');
    await chip(page).click();
    await expect(line(page)).toBeVisible();
    await expect(line(page).getByRole('button')).toBeVisible();
    await expectNoAxeViolations(page);
    if (process.env.CF_SHOTS) {
      await page.screenshot({ path: `${process.env.CF_SHOTS}/dialog-${theme}.png` });
    }
  });

  test(`APCA (${theme}): the name Lc 60, the folder icon Lc 30, the menu line and the dialog line Lc 60`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page);
    const paint = (css: string) => resolved(page, css).then((c) => pixel(page, c));
    const colour = (sel: string) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).color).then((c) => pixel(page, c));
    const back = (sel: string) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).backgroundColor).then((c) => pixel(page, c));
    const chipBack = await back('#folder-chip');
    const name = lc(await colour('#folder-chip .vb-folder-chip-name'), chipBack);
    const icon = lc(await colour('#folder-chip .vb-btn-icon'), chipBack);
    await chip(page).hover();
    const hoverBack = await back('#folder-chip');
    const nameHover = lc(await colour('#folder-chip .vb-folder-chip-name'), hoverBack);
    const iconHover = lc(await colour('#folder-chip .vb-btn-icon'), hoverBack);
    await menuButton(page).click();
    const menuBack = await back('.vb-menu-list');
    const word = lc(await colour('.vb-menu-current'), menuBack);
    const path = lc(await colour('.vb-menu-current b'), menuBack);
    await page.keyboard.press('Escape');
    await chip(page).click();
    await expect(line(page)).toBeVisible();
    const boxBack = await back('.vb-folder-current');
    const label = lc(await colour('.vb-folder-current-label'), boxBack);
    const value = lc(await colour('.vb-folder-current-path'), boxBack);
    expect(await paint('var(--vb-surface-sunken)')).toEqual(boxBack);
    console.log(`APCA ${theme}: chip name ${name.toFixed(1)} (hover ${nameHover.toFixed(1)}), icon ${icon.toFixed(1)} (hover ${iconHover.toFixed(1)}), menu word ${word.toFixed(1)}, path ${path.toFixed(1)}, dialog label ${label.toFixed(1)}, path ${value.toFixed(1)}`);
    for (const [what, v, bar] of [['name', name, 60], ['name hovered', nameHover, 60], ['icon', icon, 30], ['icon hovered', iconHover, 30],
      ['menu word', word, 60], ['menu path', path, 60], ['dialog label', label, 60], ['dialog path', value, 60]] as const) {
      expect(v, what).toBeGreaterThanOrEqual(bar);
    }
  });
}

test('with -currentFolder neither the chip, the menu line nor the dialog line shows, and the dialog heading is as it was', async ({ page }) => {
  await open(page, '-currentFolder');
  await expect(chip(page)).toHaveCount(0);
  await expect(page).toHaveTitle('start · Vision Board');
  await menuButton(page).click();
  await expect(page.locator('#open-folder')).toHaveAttribute('title', 'Open another folder (open now: ~/projects/start)');
  await expect(current(page)).toHaveCount(0);
  await page.locator('#open-folder').click();
  await expect(dialog(page).getByRole('heading', { level: 2 })).toHaveText('Open folder');
  await expect(dialog(page).locator('.vb-folder-current')).toHaveCount(0);
});

test('with -openFolder (no folder known) none of it shows and the page never asks', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (r) => { if (/\/api\/(project|folders)/.test(r.url())) asked.push(r.url()); });
  await open(page, '-openFolder');
  await expect(chip(page)).toHaveCount(0);
  await menuButton(page).click();
  await expect(current(page)).toHaveCount(0);
  expect(asked).toEqual([]);
});

// ---- The gallery's section (currentFolder flag) ----
const section = (page: Page) => page.locator('section[data-feature="currentFolder"]');

test('gallery: the section shows by default, and not with -currentFolder or -openFolder', async ({ page }) => {
  await page.goto('/gallery.html?flags=-currentFolder');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html?flags=-openFolder');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  await expect(section(page).locator('.vb-folder-chip')).toHaveCount(5);
  await expect(section(page).locator('.vb-menu-current')).toHaveText(['Current: ~/projects/atlas', 'Current: ~/…/atlas-customer-research']);
  await expect(section(page).locator('.vb-folder-current')).toHaveCount(1);
  await expect(section(page).locator('[id="folder-chip"], [id="toolbar-menu"], [id="open-folder"]')).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`gallery: the section passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`current-folder-${theme}.png`);
  });
}
