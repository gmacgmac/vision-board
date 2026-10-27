// Another folder chosen while a note holds changed words (M11_01-R4, leavePrompt flag): the board asks
// "Discard your changes?" before the server switches folders (FolderDialog.svelte `accept`, the
// board's `leave()`), so Cancel leaves the page and the server on the same folder, with the words and
// focus back in the note; Discard opens the other folder with no browser prompt. With the flag off the
// switch goes ahead as before. The server is this file's own (folder-server.ts).
import type { Page } from '@playwright/test';
import type { FolderServer } from './folder-server.ts';
import { startFolderServer } from './folder-server.ts';
import { expect, test } from './helpers.ts';
import { folderDialog as dialog, menuButton } from './board-page.ts';

test.describe.configure({ mode: 'serial' });

let srv: FolderServer;
test.beforeAll(async () => { srv = await startFolderServer(); });
test.afterAll(async () => { await srv.close(); });
test.beforeEach(async () => { await srv.open(srv.start); });

const text = (page: Page) => page.locator('vb-note-bubble textarea');
const discard = (page: Page) => page.getByRole('dialog', { name: 'Discard your changes?' });
const serverFolder = async (page: Page) => ((await (await page.request.get(`${srv.base}/api/project`)).json()) as { path: string }).path;

/** Open the board on `start`, write in a note on its card, and choose `other` in the folder picker. */
async function writeThenChoose(page: Page, flags = '') {
  await page.goto(`${srv.base}/${flags && `?flags=${flags}`}`);
  await expect(page.locator('vb-node')).toHaveCount(1);
  await page.locator('vb-node').first().focus();
  await page.keyboard.press('c');
  await page.keyboard.type('Half a thought');
  await menuButton(page).click();
  await page.locator('#open-folder').click();
  const rows = dialog(page).getByRole('list', { name: /^In / }).getByRole('button');
  await rows.first().click();
  await rows.filter({ hasText: 'other' }).click();
  await dialog(page).locator('#folder-dialog-accept').click();
}

test('another folder with changed words asks before the server switches: Cancel keeps both on this folder, Discard opens the other', async ({ page }) => {
  const dialogs: string[] = [];
  page.on('dialog', (d) => { dialogs.push(d.type()); void d.dismiss(); });
  await writeThenChoose(page);
  await expect(discard(page)).toBeVisible();
  expect(await serverFolder(page), 'nothing switched while it asks').toBe(srv.start);
  await discard(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(text(page)).toBeFocused();
  await expect(text(page)).toHaveValue('Half a thought');
  await expect(page).toHaveTitle('start · Vision Board');
  expect(await serverFolder(page)).toBe(srv.start);

  await menuButton(page).click();
  await page.locator('#open-folder').click();
  const rows = dialog(page).getByRole('list', { name: /^In / }).getByRole('button');
  await rows.first().click();
  await rows.filter({ hasText: 'other' }).click();
  await dialog(page).locator('#folder-dialog-accept').click();
  await discard(page).getByRole('button', { name: 'Discard' }).click();
  await expect(page).toHaveTitle('other · Vision Board');
  expect(await serverFolder(page)).toBe(srv.other);
  expect(dialogs, 'no browser prompt once the words are discarded').toEqual([]);
});

test('with the leavePrompt flag off another folder opens as before, without asking', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await writeThenChoose(page, '-leavePrompt');
  await expect(page).toHaveTitle('other · Vision Board');
  await expect(discard(page)).toBeHidden();
});
