// The ledger chip (ledgerFolders flag, D-084 7; LEDGER_UI_01), on the page with the flag on: the path reads
// folder / ledger / board / version at full, the ledger keeps its icon and name at half and is a row of "⋯" at a
// third; choosing a ledger opens it and its board; another tab follows a ledger switch (LEDGERS_01-R1); New ledger…
// makes one, kept out of git when asked; a name the rule refuses, one the folder has and a refusal stay in the
// dialog; every form fits with long names; axe and APCA in light and dark; the flag off shows no ledger; the gallery's
// section. Runs on the folder server with two ledgers (folder-server.ts `ledgers`: `start` has `main` and `ui`, one
// board each), fresh for this file; the tests run in order, each leaving `main` open.
import fs from 'node:fs';
import path from 'node:path';
import type { APIRequestContext, Page } from '@playwright/test';
import { ledgerFiles, ledgerFolder } from '#format';
import { lc, pixel, resolved } from './apca.ts';
import { menu, menuButton } from './board-page.ts';
import type { FolderServer } from './folder-server.ts';
import { startFolderServer } from './folder-server.ts';
import { expectBarPasses, expectWhole } from './header-fit.ts';
import { bid, expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

test.describe.configure({ mode: 'serial' });

const THEMES: Theme[] = ['light', 'dark'];
let srv: FolderServer;
test.beforeAll(async () => { srv = await startFolderServer({ ledgers: true }); });
test.afterAll(async () => { await srv.close(); });

/** The page at `width`, the flag on (or `flags` as given), drawn and settled. */
async function open(page: Page, width = 1470, flags = 'ledgerFolders') {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${srv.base}/?vbwork${flags && `&flags=${flags}`}`);
  await drawn(page);
}
async function drawn(page: Page) {
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
  await page.evaluate(() => (window as unknown as { __vbWork: { idle(): Promise<void> } }).__vbWork.idle());
}
const card = (page: Page) => page.locator('vb-node .vb-node-title');
const chip = (page: Page) => page.locator('.vb-ledger-chip');
const select = (page: Page) => page.locator(bid('ledger-chip'));
const dialog = (page: Page) => page.getByRole('dialog', { name: 'New ledger' });
/** Back on `main`, as every test leaves it. */
const backToMain = () => srv.open(srv.start, false, 'main');

test('full: the path reads folder / ledger / board / version, and the list names each ledger with its boards', async ({ page }) => {
  await open(page);
  const nav = page.getByRole('navigation', { name: 'Where you are' });
  const order = await nav.evaluate((bar) => [...bar.querySelectorAll(':scope > *, :scope > .vb-part > *')]
    .filter((e) => e.getClientRects().length).map((e) => (e.classList.contains('vb-path-sep') ? '/' : e.classList.contains('vb-folder-chip') ? 'folder'
      : e.classList.contains('vb-ledger-chip') ? 'ledger' : e.classList.contains('vb-path-board') ? 'board' : e.querySelector('select')?.id.endsWith('version') ? 'version' : '?')));
  expect(order).toEqual(['folder', '/', 'ledger', '/', 'board', '/', 'version']);
  await expect(chip(page).locator('.vb-ledger-name')).toHaveText('main');
  await expect(chip(page).locator('.vb-btn-icon')).toHaveCount(2);
  await expect(chip(page)).toHaveAttribute('title', 'Ledger main: choose another ledger of this folder, or make a new one');
  await expect(select(page)).toHaveAccessibleName('Ledger');
  await expect(select(page)).toHaveValue('main');
  expect(await select(page).evaluate((e) => [e.tagName, getComputedStyle(e).opacity])).toEqual(['SELECT', '0']);
  await expect(select(page).locator('option')).toHaveText(['main · 1 board', 'ui · 1 board', 'New ledger…']);
  // The path's keys: Tab from the folder reaches the ledger, then the board picker; its ring is the face's.
  await page.locator(bid('folder-chip')).focus();
  await page.keyboard.press('Tab');
  await expect(select(page)).toBeFocused();
  await expect(chip(page)).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Tab');
  await expect(page.locator(bid('board'))).toBeFocused();
  // Hover gives it the sunken surface, as the path's other parts.
  await page.mouse.move(0, 400);
  const sunken = await resolved(page, 'var(--vb-surface-sunken)');
  await expect(chip(page)).not.toHaveCSS('background-color', sunken);
  await chip(page).hover();
  await expect(chip(page)).toHaveCSS('background-color', sunken);
});

test('the "⋯" tooltip names New ledger at full, and the Ledger row at a third, where that row stands for it (LEDGER_UI_01-R1)', async ({ page }) => {
  await open(page);
  await expect(menuButton(page)).toHaveAttribute('title', /, Open folder, New ledger$/);
  await open(page, 490);
  await expect(menuButton(page)).toHaveAttribute('title', /^More: Folder, Ledger, Version, /);
  await expect(menuButton(page)).not.toHaveAttribute('title', /New ledger/);
});

test('half: the folder is its icon, the ledger keeps its icon and its name, no "/"', async ({ page }) => {
  await open(page, 900);
  await expect(page.locator('.vb-toolbar')).toHaveAttribute('data-tier', 'half');
  await expect(page.locator(`${bid('folder-chip')} .vb-folder-chip-name`)).toBeHidden();
  await expect(chip(page).locator('.vb-btn-icon').first()).toBeVisible();
  await expect(chip(page).locator('.vb-ledger-name')).toHaveText('main');
  expect(await chip(page).locator('.vb-ledger-name').evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  await expect(page.locator('.vb-path-sep')).toHaveCount(0);
  await menuButton(page).click();
  await expect(menu(page).getByRole('menuitem', { name: /New ledger/ })).toBeVisible();
  await page.keyboard.press('Escape');
});

test('a third: the Ledger row is under the Folder row in "⋯", and its list switches; New ledger… is in its list', async ({ page }) => {
  await open(page, 490);
  await expect(chip(page)).toHaveCount(0);
  await menuButton(page).click();
  const fields = page.getByRole('group', { name: 'Moved from the bar' });
  await expect(fields.locator('> *').nth(0)).toContainText('Folder');
  await expect(fields.locator('> *').nth(1)).toContainText(/Ledger\s*main/);
  await expect(menu(page).getByRole('menuitem', { name: /New ledger/ })).toHaveCount(0); // the Ledger row stands for it
  // Keys: Home is the Folder row, Down the Ledger row.
  await page.keyboard.press('Home');
  await expect(page.locator(bid('folder-chip'))).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(select(page)).toBeFocused();
  await expect(fields.locator('.vb-ledger-row')).toHaveCSS('outline-style', 'solid');
  await select(page).selectOption('ui');
  await expect(card(page)).toHaveText(['UI card'], { timeout: 10_000 });
  await menuButton(page).click();
  await expect(fields.locator('.vb-ledger-row')).toContainText(/Ledger\s*ui/);
  await select(page).selectOption('main');
  await expect(card(page)).toHaveText(['Start card'], { timeout: 10_000 });
});

test('switching: the ledger opens with its own board, the board last looked at is kept per ledger, and back', async ({ page }) => {
  await open(page);
  await expect(card(page)).toHaveText(['Start card']);
  await select(page).selectOption('ui');
  await expect(chip(page).locator('.vb-ledger-name')).toHaveText('ui', { timeout: 10_000 });
  await expect(card(page)).toHaveText(['UI card']);
  await expect(page).toHaveURL(/#ui-board$/);
  expect(new URL(page.url()).searchParams.get('flags')).toBe('ledgerFolders'); // the reload keeps the address's flags
  // main keeps the folder's own key (so the board looked at before the move into main/ still opens); ui its folder's.
  const kept = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('vb.lastBoard:'))));
  expect(kept).toMatchObject({ [`vb.lastBoard:${srv.start}`]: 'start-board', [`vb.lastBoard:${ledgerFolder(srv.start, 'ui')}`]: 'ui-board' });
  // The open one is chosen in the list; choosing it again does nothing.
  await expect(select(page)).toHaveValue('ui');
  await select(page).selectOption('main');
  await expect(card(page)).toHaveText(['Start card'], { timeout: 10_000 });
  await expect(page).toHaveURL(/#start-board$/);
});

test('another tab follows a ledger switch in the same folder (LEDGERS_01-R1)', async ({ page }) => {
  await open(page);
  await expect(card(page)).toHaveText(['Start card']);
  await srv.open(srv.start, false, 'ui'); // as another tab's chip would
  await expect(chip(page).locator('.vb-ledger-name')).toHaveText('ui', { timeout: 10_000 });
  await expect(card(page)).toHaveText(['UI card']);
  await backToMain();
  await expect(card(page)).toHaveText(['Start card'], { timeout: 10_000 });
});

/** New ledger… from "⋯": the dialog, fresh, focus in the name. */
async function newLedger(page: Page) {
  await menuButton(page).click();
  await menu(page).getByRole('menuitem', { name: /New ledger/ }).click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByLabel('Name')).toBeFocused();
  await expect(dialog(page).getByLabel('Name')).toHaveValue('');
  await expect(dialog(page).getByRole('checkbox', { name: 'Keep out of git' })).not.toBeChecked();
}

test('New ledger: the name shown as an id as it is typed, kept out of git, created and opened', async ({ page }) => {
  await open(page);
  await newLedger(page);
  const name = dialog(page).getByLabel('Name');
  await name.pressSequentially('Scratch Plans');
  await expect(name).toHaveValue('scratch-plans');
  await expect(dialog(page)).toContainText('Lowercase letters, digits and -, like a board id.');
  await dialog(page).getByRole('checkbox', { name: 'Keep out of git' }).check();
  await dialog(page).getByRole('button', { name: 'Create' }).click();
  await expect(chip(page).locator('.vb-ledger-name')).toHaveText('scratch-plans', { timeout: 10_000 });
  await expect(page.locator('.vb-path-name')).toHaveText('No boards yet');
  expect(fs.readFileSync(ledgerFiles(ledgerFolder(srv.start, 'scratch-plans')).gitignore, 'utf8').trim()).toBe('*');
  await expect(select(page).locator('option')).toHaveText(['main · 1 board', 'scratch-plans · 0 boards · kept out of git', 'ui · 1 board', 'New ledger…']);
  await select(page).selectOption('main');
  await expect(card(page)).toHaveText(['Start card'], { timeout: 10_000 });
  // A ledger made without the box ticked has no .gitignore of its own.
  await newLedger(page);
  await dialog(page).getByLabel('Name').fill('kept');
  await dialog(page).getByRole('button', { name: 'Create' }).click();
  await expect(chip(page).locator('.vb-ledger-name')).toHaveText('kept', { timeout: 10_000 });
  expect(fs.existsSync(ledgerFiles(ledgerFolder(srv.start, 'kept')).gitignore) && fs.readFileSync(ledgerFiles(ledgerFolder(srv.start, 'kept')).gitignore, 'utf8').trim() === '*').toBe(false);
  await backToMain();
  await expect(card(page)).toHaveText(['Start card'], { timeout: 10_000 });
});

test('New ledger: a name the rule refuses and one the folder has are said as they are typed, and Create sends nothing', async ({ page }) => {
  await open(page);
  const sent: string[] = [];
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/api/project')) sent.push(r.url()); });
  await newLedger(page);
  const name = dialog(page).getByLabel('Name');
  await name.fill('images');
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toHaveAccessibleDescription(/"images" is the name of a file or folder the board keeps/);
  await dialog(page).getByRole('button', { name: 'Create' }).click();
  await expect(name).toBeFocused();
  await name.fill('main');
  await expect(dialog(page)).toContainText('There is a ledger named main already: choose it from the ledger list.');
  await name.fill('-dash');
  await expect(dialog(page)).toContainText('starts with a letter or digit');
  await page.keyboard.press('Enter');
  await name.fill('fine-name');
  await expect(name).not.toHaveAttribute('aria-invalid', 'true');
  await expect(dialog(page)).toContainText('Lowercase letters, digits and -, like a board id.');
  expect(sent).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  // It opens fresh: the name empty again.
  await newLedger(page);
  await page.keyboard.press('Escape');
});

test.describe('a refusal', () => {
  test.use({ expected: { problems: [/response 409: POST .*\/api\/project/, /Failed to load resource.*409/] } });

  test('stays in the dialog in the server\'s words, the name kept, and Create is ready again', async ({ page }) => {
    await open(page);
    const words = 'Another board server holds this ledger: computer "studio-example", process 4120, port 4470, running since 09:12. Stop that server first.';
    await page.route('**/api/project', (route) => (route.request().method() === 'POST'
      ? route.fulfill({ status: 409, contentType: 'application/problem+json', body: JSON.stringify({ type: 'https://vision-board.invalid/problems/conflict', title: 'Conflict', status: 409, detail: words }) })
      : route.fallback()));
    await newLedger(page);
    await dialog(page).getByLabel('Name').fill('roadmap');
    await dialog(page).getByRole('button', { name: 'Create' }).click();
    await expect(dialog(page).getByRole('alert')).toHaveText(words);
    await expect(dialog(page).getByLabel('Name')).toHaveValue('roadmap');
    await expect(dialog(page).getByRole('button', { name: 'Create' })).toBeEnabled();
    await expect(chip(page).locator('.vb-ledger-name')).toHaveText('main');
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
  });
});

test('the flag off: no ledger in the path or in "⋯", the path as it was', async ({ page }) => {
  await open(page, 1470, '-ledgerFolders');
  await expect(page.locator(bid('folder-chip'))).toBeVisible();
  await expect(chip(page)).toHaveCount(0);
  await expect(page.locator('.vb-path-sep')).toHaveCount(2);
  await menuButton(page).click();
  await expect(menu(page).getByRole('menuitem', { name: /New ledger/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('#ledger-dialog')).toHaveCount(0);
});

// ---- Long names, every form (FULL_MIN and HALF_MIN re-measured with a ledger, LEDGER_UI_01 step 4) ----
const LONG_LEDGER = 'customer-research-interviews-and-surveys'; // 40, the longest name
const LONG_BOARD = 'Quarterly hiring plan for the platform and data teams across every region, with budgets and open questions';
const FORMS = [[1470, 'full'], [1400, 'full'], [1300, 'full'], [1299, 'half'], [900, 'half'], [620, 'half'], [619, 'third'], [490, 'third'], [400, 'third']] as const;

/** A long-named folder, ledger and board, a card flagged and the board locked: the most the path holds. */
async function longNames(page: Page, request: APIRequestContext) {
  const folder = path.join(srv.home, 'projects', 'atlas-customer-research-programme-2027');
  fs.mkdirSync(folder, { recursive: true });
  await srv.open(folder, true, LONG_LEDGER);
  // An agent's calls carry no person cookie (`request`); the person's do (`page.request`).
  const agent = (await (await request.post(`${srv.base}/api/agents`, { data: { label: 'Ledger chat' } })).json() as { secret: string }).secret;
  const wrote = await request.post(`${srv.base}/api/boards/long-board/write`, { headers: { Authorization: `Bearer ${agent}` }, data: { items: [
    { type: 'board', title: LONG_BOARD }, { type: 'region', region: { id: 'roles', title: 'Roles', mode: 'grid' } },
    { type: 'node', node: { region: 'roles', kind: 'question', title: 'Which role first?' } }] } });
  expect(wrote.status(), await wrote.text()).toBe(200);
  const n = (await wrote.json() as { results: { n?: number }[] }).results[2]!.n!;
  for (const action of [{ action: 'flag', n }, { action: 'lock' }]) {
    const r = await page.request.post(`${srv.base}/api/boards/long-board/act`, { data: { type: 'act', board: 'long-board', ...action } });
    expect(r.status(), await r.text()).toBe(201);
  }
}

test('long folder, ledger and board names: every form fits, the ledger never under its icon and a "…"', async ({ page, request }) => {
  await open(page);
  await longNames(page, request);
  const widths: string[] = [];
  for (const [width, form] of FORMS) {
    await open(page, width);
    await expect(page.locator('.vb-toolbar')).toHaveAttribute('data-tier', form);
    await expect(page.locator(bid('locked'))).toBeVisible();
    await expectWhole(page, `${width}px`);
    if (form === 'third') { await expect(chip(page)).toHaveCount(0); continue; }
    const [folder, ledger, board] = await Promise.all([page.locator(bid('folder-chip')), chip(page), page.locator('.vb-path-board')].map(async (e) => (await e.boundingBox())!.width));
    expect(ledger, `${width}px: the ledger's floor`).toBeGreaterThanOrEqual(44);
    expect(board, `${width}px: the board's floor`).toBeGreaterThanOrEqual(form === 'full' ? 100 : 80);
    // At full's first width the path can still give 70px, for Send's longest word and Chat's marks (header-tiers.spec.ts; floors: folder 36, board 100).
    if (width === 1300) expect(folder! + board!).toBeGreaterThanOrEqual(206);
    widths.push(`${width}px folder ${Math.round(folder!)} ledger ${Math.round(ledger!)} board ${Math.round(board!)}`);
  }
  console.log(`Ledger chip widths: ${widths.join('; ')}`);
  await page.request.post(`${srv.base}/api/boards/long-board/act`, { data: { type: 'act', board: 'long-board', action: 'unlock' } });
  await backToMain();
});

for (const theme of THEMES) {
  test(`axe at every form, "⋯" open and the dialog open (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    for (const width of [1470, 900, 490]) {
      await open(page, width);
      await expectBarPasses(page);
      await menuButton(page).click();
      await expectBarPasses(page);
      await page.keyboard.press('Escape');
    }
    await open(page, 1470);
    await newLedger(page);
    await dialog(page).getByLabel('Name').fill('images');
    await expectBarPasses(page);
    await page.keyboard.press('Escape');
  });

  test(`APCA (${theme}): the ledger's name Lc 60, its icon Lc 30, its row Lc 60, the dialog's lines Lc 60`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page, 1470);
    const paint = (css: string) => resolved(page, css).then((c) => pixel(page, c));
    const colour = (sel: string) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).color).then((c) => pixel(page, c));
    const bar = await paint('var(--vb-surface-region)');
    const found: [string, number, number][] = [
      ['ledger name', lc(await colour('.vb-ledger-name'), bar), 60], ['ledger icon', lc(await colour('.vb-ledger-chip .vb-btn-icon'), bar), 30],
    ];
    await chip(page).hover();
    found.push(['ledger name hovered', lc(await colour('.vb-ledger-name'), await paint('var(--vb-surface-sunken)')), 60]);
    await open(page, 490);
    await menuButton(page).click();
    const raised = await paint('var(--vb-surface-raised)');
    found.push(['row word', lc(await colour('.vb-ledger-row .vb-menu-label'), raised), 60], ['row value', lc(await colour('.vb-ledger-row .vb-menu-value'), raised), 60]);
    await page.keyboard.press('Escape');
    await open(page, 1470);
    await newLedger(page);
    const panel = await dialog(page).evaluate((e) => getComputedStyle(e).backgroundColor).then((c) => pixel(page, c));
    found.push(['name rule', lc(await colour('.vb-ledger-check'), panel), 60], ['git note', lc(await colour('.vb-ledger-git-note'), panel), 60], ['git label', lc(await colour('.vb-ledger-git span'), panel), 60]);
    await dialog(page).getByLabel('Name').fill('images');
    found.push(['name problem', lc(await colour('.vb-ledger-check[data-problem]'), await paint('var(--vb-state-drop-soft)')), 60]);
    console.log(`APCA ${theme}: ${found.map(([w, v]) => `${w} ${v.toFixed(1)}`).join(', ')}`);
    for (const [what, v, tier] of found) expect(Math.abs(v), what).toBeGreaterThanOrEqual(tier);
    await page.keyboard.press('Escape');
  });
}

// ---- The gallery's section (ledgerFolders flag) ----
const section = (page: Page) => page.locator('section[data-feature="ledgerFolders"]');

test('gallery: the section is there only with the flag, last, with the three forms and ids of its own', async ({ page }) => {
  await page.goto('/gallery.html?flags=-ledgerFolders');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html?flags=ledgerFolders,-readOnlyStart');
  await expect(page.locator('main > section').last()).toHaveAttribute('data-feature', 'ledgerFolders');
  for (const form of ['full', 'half', 'third']) await expect(section(page).locator(`.vb-toolbar[data-tier="${form}"]`).first()).toBeVisible();
  await expect(section(page).locator('.vb-ledger-chip').first()).toContainText('customer-research-interviews');
  await expect(section(page).locator(`${bid('ledger-chip')}, #new-ledger, #ledger-dialog`)).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`gallery: the section passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html?flags=ledgerFolders');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`ledgers-${theme}.png`);
  });
}
