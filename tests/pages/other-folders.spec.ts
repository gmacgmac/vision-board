// Agents from other folders (otherFolders flag, on by default; D-120, api.md 215). "⋯" › "Let agents from other
// folders in" is a checkbox, off by default; a press writes the person's `folders-allow` and the server then lets an
// agent whose `VB-Project` names another folder read the board; a second press writes `folders-revoke` and it is
// refused again. By keyboard too, axe in both themes, and the gallery's entry. It runs on the worker's empty project
// (EMPTY_BASE), fresh for this file (servers.ts), on a board of its own, and leaves the switch off between tests.
import os from 'node:os';
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test, bid } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { EMPTY_BASE } from './ports.ts';
import { idle, menuButton } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];
const BOARD = 'visitors';
const row = (page: Page) => page.locator(bid('other-folders'));
/** A folder that is not the open project's. */
const AWAY = encodeURI(os.tmpdir());

async function open(page: Page): Promise<void> {
  await page.goto(`${EMPTY_BASE}/?vbwork#${BOARD}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: unknown }).__vbWork !== undefined);
  await idle(page);
  await expect(page.locator(bid('board'))).toHaveValue(BOARD);
}

let made = false;
/** A board an agent of this folder drew. */
async function setUp(request: APIRequestContext): Promise<void> {
  if (made) return;
  const agent = await (await request.post(`${EMPTY_BASE}/api/agents`, { data: { label: 'Home agent' } })).json() as { secret: string };
  const items = [{ type: 'board', title: 'Visitors' }, { type: 'region', region: { id: 'r', title: 'R', mode: 'grid' } }];
  const r = await request.post(`${EMPTY_BASE}/api/boards/${BOARD}/write`, { headers: { Authorization: `Bearer ${agent.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  made = true;
}

/** What an agent from another folder is answered on `list_boards`. */
const fromAway = async (page: Page) => (await page.request.get(`${EMPTY_BASE}/api/boards`, { headers: { 'VB-Project': AWAY } })).status();
/** Whether the ledger lets other folders in now, by the person's last switch line. */
const lastSwitch = async (page: Page) => {
  const { events } = (await (await page.request.get(`${EMPTY_BASE}/api/ledger`)).json()) as { events: { type: string; action?: string }[] };
  return events.filter((e) => e.action === 'folders-allow' || e.action === 'folders-revoke').at(-1)?.action;
};

test.afterEach(async ({ page }) => {
  if (made && await lastSwitch(page) === 'folders-allow') {
    await page.request.post(`${EMPTY_BASE}/api/boards/${BOARD}/act`, { data: { type: 'act', action: 'folders-revoke' } });
  }
});

for (const theme of THEMES) {
  test(`gallery: the entry shows the row off and on, and passes axe (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    const section = page.locator('section[data-feature="otherFolders"]');
    await expect(section).toBeVisible();
    const rows = section.getByRole('menuitemcheckbox', { name: /Let agents from other folders in/ });
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toHaveAttribute('aria-checked', 'false');
    await expect(rows.nth(1)).toHaveAttribute('aria-checked', 'true');
    await expectNoAxeViolations(page);
  });
}

test('"⋯" › Let agents from other folders in: off by default; a press lets them in, a second shuts them out', async ({ page, request }) => {
  await setUp(request);
  await open(page);
  expect(await fromAway(page)).toBe(409);
  await menuButton(page).click();
  await expect(row(page)).toHaveRole('menuitemcheckbox');
  await expect(row(page)).toHaveText(/Let agents from other folders in/);
  await expect(row(page)).toHaveAttribute('aria-checked', 'false');
  await expect(row(page)).toHaveAttribute('aria-disabled', 'false');
  await expect(row(page).locator('svg.vb-btn-icon')).toHaveCount(1);
  await row(page).click();
  await idle(page);
  expect(await lastSwitch(page)).toBe('folders-allow');
  expect(await fromAway(page)).toBe(200);
  await menuButton(page).click();
  await expect(row(page)).toHaveAttribute('aria-checked', 'true');
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
  }
  // By keyboard: Enter on the focused row chooses it, as a click does.
  await row(page).focus();
  await page.keyboard.press('Enter');
  await idle(page);
  expect(await lastSwitch(page)).toBe('folders-revoke');
  expect(await fromAway(page)).toBe(409);
  await menuButton(page).click();
  await expect(row(page)).toHaveAttribute('aria-checked', 'false');
});

test('flag off: no row', async ({ page, request }) => {
  await setUp(request);
  await page.goto(`${EMPTY_BASE}/?vbwork&flags=-otherFolders#${BOARD}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: unknown }).__vbWork !== undefined);
  await idle(page);
  await menuButton(page).click();
  await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(row(page)).toHaveCount(0);
});
