// Opening a folder from the board (open-folder task, U12, openFolder flag, on by default): the "⋯"
// menu's Open folder… row and the page title name the open folder; the picker by pointer and by
// keyboard (breadcrumb, recent first, folders with a board marked, found with Open, not found with
// Create, Esc); Open reloads the page onto the other folder's boards, and another open page follows;
// Create lands on an empty project; the chat panel's agent works in the folder now open; axe light
// and dark with the picker open; flag off is the board as it was; the Cloud storage group on the
// home listing (folder-links-cloud task) by pointer and keyboard, axe light and dark. The server is
// this file's own (folder-server.ts) with a temp home folder, never the real one; each test starts
// on `start`.
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import type { FolderServer } from './folder-server.ts';
import { startFolderServer } from './folder-server.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { folderDialog as dialog, menuButton } from './board-page.ts';

test.describe.configure({ mode: 'serial' });

let srv: FolderServer;
test.beforeAll(async () => { srv = await startFolderServer(); });
test.afterAll(async () => { await srv.close(); });
test.beforeEach(async () => { await srv.open(srv.start); });

/** Open the board and wait for its first draw. */
async function open(page: Page, flags = '') {
  await page.goto(`${srv.base}/?vbwork${flags && `&flags=${flags}`}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
}
const row = (page: Page) => page.locator('#open-folder');
/** The folders in the chosen folder (the recent list is its own). */
const rows = (page: Page) => dialog(page).getByRole('list', { name: /^In / }).getByRole('button');
const status = (page: Page) => dialog(page).locator('.vb-folder-status');
const accept = (page: Page) => dialog(page).locator('#folder-dialog-accept');
const card = (page: Page) => page.locator('vb-node .vb-node-title');

async function openPicker(page: Page) {
  await menuButton(page).click();
  await row(page).click();
  await expect(dialog(page)).toBeVisible();
  await expect(rows(page)).toHaveText(['projects']);
}

test('the row and the title name the open folder; with -openFolder neither shows and nothing asks', async ({ page }) => {
  await open(page);
  await expect(page).toHaveTitle('start · Vision Board');
  await menuButton(page).click();
  await expect(row(page)).toHaveText(/Open folder…/);
  await expect(row(page)).toHaveAttribute('title', 'Open another folder (open now: ~/projects/start)');
  await expect(row(page)).toHaveAttribute('aria-haspopup', 'dialog');
  const asked: string[] = [];
  page.on('request', (r) => { if (/\/api\/(project|folders)/.test(r.url())) asked.push(r.url()); });
  await open(page, '-openFolder');
  await expect(page).toHaveTitle('Vision Board');
  await menuButton(page).click();
  await expect(row(page)).toHaveCount(0);
  await expect(page.locator('#folder-dialog')).toHaveCount(0);
  expect(asked).toEqual([]);
});

test('by pointer: home, then projects with the boards marked, then Open reloads onto the other folder', async ({ page }) => {
  await open(page);
  await expect(card(page)).toHaveText(['Start card']);
  await openPicker(page);
  await expect(dialog(page).getByRole('navigation', { name: 'Folder path' }).getByRole('button')).toHaveText(['~']);
  // Never a board in home itself (open-folder.ts HOME_ITSELF): no Create there.
  await expect(status(page)).toHaveText('Choose a project folder under ~');
  await expect(accept(page)).toHaveText('Open');
  await expect(accept(page)).toBeDisabled();
  await rows(page).first().click();
  await expect(rows(page)).toHaveText(['empty-app', /^other\s*board, has a Vision Board$/, /^start\s*board, has a Vision Board$/]);
  await expect(dialog(page).getByRole('navigation').getByRole('button')).toHaveText(['~', 'projects']);
  await rows(page).filter({ hasText: 'other' }).click();
  await expect(status(page)).toHaveText('Vision Board found (1 board)');
  await expect(accept(page)).toHaveText('Open');
  await expect(accept(page)).toBeFocused();
  await accept(page).click();
  await expect(page).toHaveTitle('other · Vision Board');
  await expect(card(page)).toHaveText(['Other card']);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe('#other-board');
  // The folder left is recent now; the one open is never offered again.
  await openPicker(page);
  await expect(dialog(page).getByRole('list', { name: 'Recent' }).getByRole('button')).toHaveText([/~\/projects\/start/]);
  await dialog(page).getByRole('navigation').getByRole('button', { name: '~' }).click();
  await rows(page).first().click();
  await rows(page).filter({ hasText: 'other' }).click();
  await expect(status(page)).toHaveText('This folder is open now (1 board).');
  await expect(accept(page)).toBeDisabled();
});

test('by keyboard: Enter on the row, Enter into folders, Create focused on one with no board, Esc closes', async ({ page }) => {
  await open(page);
  await menuButton(page).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('End');
  await expect(row(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toBeVisible();
  await expect(rows(page).first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(rows(page).first()).toHaveText('empty-app');
  await expect(rows(page).first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveText('No Vision Board here');
  await expect(accept(page)).toHaveText('Create');
  await expect(accept(page)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog(page).locator('#folder-dialog-cancel')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(menuButton(page)).toBeFocused();
  await expect(page).toHaveTitle('start · Vision Board');
  expect(fs.existsSync(`${srv.empty}/.visionboard`)).toBe(false);
});

test('Create makes a Vision Board in a folder with none and lands on its empty board', async ({ page }) => {
  await open(page);
  await openPicker(page);
  await rows(page).first().click();
  await rows(page).filter({ hasText: 'empty-app' }).click();
  await accept(page).click();
  await expect(page).toHaveTitle('empty-app · Vision Board');
  await expect(page.locator('.vb-message')).toContainText('No boards yet');
  await expect(card(page)).toHaveCount(0);
  expect(fs.readFileSync(`${srv.empty}/.visionboard/ledger.jsonl`, 'utf8')).toBe('');
});

test('another open page follows the switch: it reloads onto the new folder\'s boards', async ({ page, context }) => {
  await open(page);
  const other = await context.newPage();
  await other.goto(`${srv.base}/`);
  await expect(other.locator('vb-node .vb-node-title')).toHaveText(['Start card']);
  await openPicker(page);
  await rows(page).first().click();
  await rows(page).filter({ hasText: 'other' }).click();
  await accept(page).click();
  await expect(card(page)).toHaveText(['Other card']);
  await expect(other).toHaveTitle('other · Vision Board', { timeout: 10_000 });
  await expect(other.locator('vb-node .vb-node-title')).toHaveText(['Other card']);
  await other.close();
});

test('the chat panel\'s agent works in the folder now open', async ({ page }) => {
  await srv.open(srv.other);
  srv.fake.mode('hang');
  try {
    await open(page);
    await page.locator('#chat-toggle').click();
    const text = page.locator('#chat').getByRole('textbox', { name: 'Message to the agent' });
    await text.fill('Where are you?');
    await text.press('Enter');
    const run = await srv.fake.run(1);
    expect(fs.realpathSync(run.cwd)).toBe(srv.other);
  } finally {
    srv.fake.mode('replay');
  }
});

for (const theme of ['light', 'dark'] as Theme[]) {
  test(`the picker passes axe (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page);
    await openPicker(page);
    await rows(page).first().click();
    await expect(rows(page)).toHaveCount(3);
    await expectNoAxeViolations(page);
    await rows(page).filter({ hasText: 'other' }).click();
    await expect(status(page)).toHaveText('Vision Board found (1 board)');
    await expectNoAxeViolations(page);
  });
}

// ---- The Cloud storage group (folder-links-cloud task): ~/Library/CloudStorage's real folders ----
const places = (page: Page) => dialog(page).getByRole('list', { name: 'Cloud storage' }).getByRole('button');
const crumbs = (page: Page) => dialog(page).getByRole('navigation', { name: 'Folder path' }).getByRole('button');

/** With a cloud storage place in the temp home and no recent folders, run `body`; then go back to
 * `start` and remove the place. */
async function withCloud(body: (repo: string) => Promise<void>) {
  const repo = srv.addCloud();
  fs.rmSync(path.join(srv.home, '.visionboard', 'recent.json'), { force: true });
  try { await body(repo); } finally {
    await srv.open(srv.start);
    srv.removeCloud();
  }
}

test('Cloud storage by pointer: the place by its real name, browsing under real names, Open', async ({ page }) => {
  await withCloud(async () => {
    await open(page);
    await menuButton(page).click();
    await row(page).click();
    await expect(places(page)).toHaveText(['Cloud-Example']);
    // Home's link to the place is not listed (ruling 1); Library is, as before.
    await expect(rows(page)).toHaveText(['Library', 'projects']);
    await places(page).click();
    await expect(crumbs(page)).toHaveText(['~', 'Library', 'CloudStorage', 'Cloud-Example']);
    await expect(places(page)).toHaveCount(0);
    await expect(rows(page)).toHaveText([/^repo\s*board, has a Vision Board$/]);
    await rows(page).click();
    await expect(status(page)).toHaveText('Vision Board found (1 board)');
    await accept(page).click();
    await expect(page).toHaveTitle('repo · Vision Board');
    await expect(card(page)).toHaveText(['Cloud card']);
    await menuButton(page).click();
    await expect(row(page)).toHaveAttribute('title', 'Open another folder (open now: ~/Library/CloudStorage/Cloud-Example/repo)');
  });
});

test('Cloud storage by keyboard: Shift+Tab from the first folder in ~ reaches the place; Enter goes in', async ({ page }) => {
  await withCloud(async () => {
    await open(page);
    await menuButton(page).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(rows(page).first()).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(places(page).first()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(crumbs(page)).toHaveText(['~', 'Library', 'CloudStorage', 'Cloud-Example']);
    await expect(rows(page).first()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(status(page)).toHaveText('Vision Board found (1 board)');
    await expect(accept(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveTitle('repo · Vision Board');
  });
});

for (const theme of ['light', 'dark'] as Theme[]) {
  test(`the picker with Cloud storage passes axe (${theme})`, async ({ page }) => {
    await withCloud(async () => {
      await setTheme(page, theme);
      await open(page);
      await menuButton(page).click();
      await row(page).click();
      await expect(places(page)).toHaveText(['Cloud-Example']);
      await expectNoAxeViolations(page);
    });
  });
}

// ---- The gallery's folder picker section (openFolder flag) ----
const section = (page: Page) => page.locator('section[data-feature="openFolder"]');

test('gallery: the folder picker section shows by default in each state, and not with -openFolder', async ({ page }) => {
  await page.goto('/gallery.html?flags=-openFolder');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  await expect(section(page).locator('.vb-folder-dialog')).toHaveCount(7);
  await expect(section(page).locator('.vb-folder-status')).toHaveText([
    'Choose a project folder under ~', 'No Vision Board here', 'Vision Board found (3 boards)', 'No Vision Board here', 'Reading folders…',
    'Vision Board found (3 boards)', 'Vision Board found (3 boards)',
  ]);
  await expect(section(page).locator('[id^="folder-dialog"]')).toHaveCount(0);
});

for (const theme of ['dark', 'light'] as Theme[]) {
  test(`gallery: the folder picker section passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`folder-picker-${theme}.png`);
  });
}
