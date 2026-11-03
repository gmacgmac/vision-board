// Ledger folders on the server, seen from the page (LEDGERS_01, D-084; the `ledgerFolders` flag on): the
// page draws the open ledger's boards; after a switch to another ledger of the folder (open_project with
// `ledger`, as the ledger chip will send it in LEDGER_UI_01) a reload draws that ledger's; opening an
// old-layout folder moves it into `main/` and an open page follows the switch. No ledger UI yet: the
// chip, its dropdown and the New ledger dialog are LEDGER_UI_01's. Runs on its own folder server
// (folder-server.ts with `ledgers`, a temp home, the worker's ledgers port).
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import { ledgerFiles, ledgerFolder } from '#format';
import type { FolderServer } from './folder-server.ts';
import { startFolderServer } from './folder-server.ts';
import { expect, test } from './helpers.ts';

test.describe.configure({ mode: 'serial' });

let srv: FolderServer;
test.beforeAll(async () => { srv = await startFolderServer({ ledgers: true }); });
test.afterAll(async () => { await srv.close(); });

/** Open the board and wait for its first draw. */
async function open(page: Page) {
  await page.goto(`${srv.base}/?vbwork`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
}
const card = (page: Page) => page.locator('vb-node .vb-node-title');

test('the page draws the open ledger; after a switch to a second ledger, a reload draws that one\'s board', async ({ page }) => {
  await open(page);
  await expect(card(page)).toHaveText(['Start card']);
  await srv.open(srv.start, false, 'ui');
  await open(page);
  await expect(page).toHaveTitle('start · Vision Board', { timeout: 10_000 });
  await expect(card(page)).toHaveText(['UI card']);
  await srv.open(srv.start, false, 'main');
  await open(page);
  await expect(card(page)).toHaveText(['Start card']);
});

test('opening an old-layout folder moves it into main/, and an open page follows the switch', async ({ page }) => {
  await open(page);
  await expect(card(page)).toHaveText(['Start card']);
  await srv.open(srv.other);
  await expect(page).toHaveTitle('other · Vision Board', { timeout: 10_000 });
  await expect(card(page)).toHaveText(['Other card']);
  expect(fs.existsSync(ledgerFiles(ledgerFolder(srv.other, 'main')).ledger)).toBe(true);
  expect(fs.existsSync(ledgerFiles(ledgerFolder(srv.other)).ledger)).toBe(false);
  await srv.open(srv.start);
});
