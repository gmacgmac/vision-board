// Read-only and Edit in the header (readOnlyStart flag, D-085; READONLY_UI_01), on a folder server that opens every
// ledger read-only (folder-server.ts `readOnly`, with ledger folders: `start` holds `main` and `ui`): the page opens
// read-only and says so after the path at every width (1400, 900, 600); every control that would write is paused
// with the reason; Edit (the button at full, a row of "⋯" from half, the chip's menu always) takes the ledger and a
// write works; Stop editing gives it back; another computer holding the ledger makes Edit say who, and the ledger
// stays read-only; long names fit every form; axe and APCA in light and dark; the flag off shows nothing and writes
// as today; the gallery's section. Fresh for this file; the tests run in order, each leaving `main` open, read-only.
import fs from 'node:fs';
import path from 'node:path';
import type { APIRequestContext, Page } from '@playwright/test';
import { ledgerFiles, ledgerFolder } from '#format';
import { lc, pixel, resolved } from './apca.ts';
import { card, idle, menuButton, toast } from './board-page.ts';
import type { FolderServer } from './folder-server.ts';
import { startFolderServer } from './folder-server.ts';
import { expectBarPasses, expectWhole } from './header-fit.ts';
import { bid, expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { MAIN_BASE } from './ports.ts';

test.describe.configure({ mode: 'serial' });

const THEMES: Theme[] = ['light', 'dark'];
const REASON = 'Read-only: press Edit to change it';
const FLAGS = 'readOnlyStart,ledgerFolders';
let srv: FolderServer;
test.beforeAll(async () => { srv = await startFolderServer({ ledgers: true, readOnly: true }); });
test.afterAll(async () => { await srv.close(); });

/** The page at `width` with the flags on (or `flags` as given), drawn and settled. */
async function open(page: Page, width = 1400, flags = FLAGS, base = srv.base) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${base}/?vbwork${flags && `&flags=${flags}`}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
  await idle(page);
}
const chip = (page: Page) => page.locator(bid('editing'));
const button = (page: Page) => page.locator(bid('edit'));
const head = async (page: Page, base = srv.base) => ((await (await page.request.get(`${base}/api/boards`)).json()) as { head: number }).head;
/** Edit, or Stop editing, as the person, through the API (another tab's press). */
async function editing(page: Page, on: boolean): Promise<void> {
  const r = on ? await page.request.post(`${srv.base}/api/project/edit`) : await page.request.delete(`${srv.base}/api/project/edit`);
  expect(r.status(), await r.text()).toBe(200);
}
/** The server's word on the open ledger. */
const project = async (page: Page) => (await (await page.request.get(`${srv.base}/api/project`)).json()) as { readOnly?: true; editing?: { here?: true; host?: string } };
/** Back to read-only on `main`, as every test leaves it. */
async function reset(page: Page) {
  if ((await project(page)).editing?.here) await editing(page, false);
}

test('opens read-only: the chip says so, and every control that would write is paused with the reason', async ({ page }) => {
  await open(page);
  await expect(chip(page)).toBeVisible();
  await expect(chip(page)).toHaveAttribute('data-state', 'read-only');
  await expect(chip(page)).toContainText('Read-only');
  await expect(chip(page)).toHaveAccessibleName('Read-only: press Edit to change this ledger');
  await expect(chip(page)).toHaveAttribute('title', 'Read-only: press Edit to change this ledger');
  await expect(button(page)).toBeVisible();
  await expect(button(page)).toHaveAccessibleName('Edit');
  // The path, then the state, then Edit.
  const order = await page.locator('.vb-toolbar').evaluate((bar) => [bar.querySelector('.vb-path'), bar.querySelector('.vb-chip-editing'), bar.querySelector('.vb-edit-btn')]
    .map((e) => e!.getBoundingClientRect().left));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  // On the cards: the answers, the size, the note pin and the flag; on the frame: its tools.
  const node = page.locator('vb-node').first();
  for (const sel of ['button[data-act]', 'button[data-flag]', '.vb-note-pin']) {
    for (const el of await node.locator(sel).all()) await expect(el, sel).toHaveAttribute('aria-disabled', 'true');
  }
  await expect(page.locator('vb-region .vb-region-comment').first()).toHaveAttribute('aria-disabled', 'true');
  // Send: paused, its title the reason.
  await expect(page.locator(bid('send'))).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator(bid('send'))).toHaveAttribute('title', REASON);
  // The picker's New board… and Rename board…: off, saying why.
  for (const text of ['New board…', 'Rename board…']) {
    const option = page.locator(`${bid('board')} option`, { hasText: text });
    await expect(option).toBeDisabled();
    await expect(option).toHaveAttribute('title', REASON);
  }
  // "⋯": Lock board… and Archive board…: off, saying why.
  await menuButton(page).click();
  for (const id of ['lock-board', 'archive-board']) {
    await expect(page.locator(bid(id))).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator(bid(id))).toHaveAttribute('title', REASON);
  }
  await page.keyboard.press('Escape');
  // A press says why and writes nothing.
  const before = await head(page);
  await node.locator('button[data-flag]').click({ force: true });
  await expect(toast(page)).toHaveText(REASON);
  expect(await head(page)).toBe(before);
});

test('Edit, and a write works; Stop editing, and it is read-only again', async ({ page }) => {
  await open(page);
  await button(page).click();
  await expect(chip(page)).toHaveAttribute('data-state', 'editing');
  await expect(chip(page)).toContainText('Editing');
  await expect(button(page)).toHaveAccessibleName('Stop editing');
  await expect(page.getByRole('status').filter({ hasText: 'You are editing this ledger.' })).toHaveCount(1);
  expect((await project(page)).editing?.here).toBe(true);
  const ack = page.locator('vb-node').first().locator('button[data-act]').first();
  await expect(ack).not.toHaveAttribute('aria-disabled', 'true');
  const before = await head(page);
  await ack.click();
  await idle(page);
  await expect(ack).toHaveAttribute('aria-pressed', 'true');
  expect(await head(page)).toBe(before + 1);
  await ack.click(); // as it was
  await idle(page);
  await button(page).click();
  await expect(chip(page)).toHaveAttribute('data-state', 'read-only');
  await expect(button(page)).toHaveAccessibleName('Edit');
  await expect(ack).toHaveAttribute('aria-disabled', 'true');
  expect((await project(page)).readOnly).toBe(true);
});

/** A lock another computer's board server holds live on `main`, as lock.ts writes one. */
function anotherComputer(): () => void {
  const lock = ledgerFiles(ledgerFolder(srv.start, 'main')).lock;
  const now = new Date().toISOString();
  fs.writeFileSync(lock, `${JSON.stringify({ host: 'another-computer', pid: 1, port: 4470, started: now, beat: now })}\n`);
  return () => fs.rmSync(lock, { force: true });
}

test.describe('another computer edits', () => {
  // Edit's refusal is the server's 409, on purpose.
  test.use({ expected: { problems: [/^response 409: POST http:\/\/127\.0\.0\.1:\d+\/api\/project\/edit$/, /status of 409/] } });

  test('Edit says who and stays read-only; the chip\'s tooltip and menu name it', async ({ page }) => {
  const gone = anotherComputer();
  try {
    await open(page);
    await button(page).click();
    await expect(toast(page)).toContainText('another-computer has been editing this ledger since');
    await expect(chip(page)).toHaveAttribute('data-state', 'read-only');
    await expect(chip(page)).toHaveAttribute('title', /^Read-only: being edited on another-computer since \d/);
    await chip(page).click();
    const menu = page.getByRole('menu', { name: 'This ledger' });
    await expect(menu).toBeVisible();
    await expect(menu).toContainText('being edited on another-computer');
    await expect(menu.getByRole('menuitem', { name: 'Edit' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(chip(page)).toBeFocused();
  } finally { gone(); }
  expect((await project(page)).readOnly).toBe(true);
  });
});

test('the state is in the bar at 1400, 900 and 600 px; Edit is a button at full and a row of "⋯" below', async ({ page }) => {
  for (const [width, form] of [[1400, 'full'], [900, 'half'], [740, 'half'], [620, 'half'], [600, 'third']] as const) {
    await open(page, width);
    await expect(page.locator('.vb-toolbar')).toHaveAttribute('data-tier', form);
    await expect(chip(page), `${width}px`).toBeVisible();
    await expect(chip(page).locator('.vb-btn-icon').first(), `${width}px: the icon`).toBeVisible();
    // The word: at a third for screen readers only.
    const word = await chip(page).locator('.vb-chip-word').evaluate((e) => getComputedStyle(e).position);
    expect(word, `${width}px: the word`).toBe(width <= 620 ? 'absolute' : 'static');
    await expect(page.locator('.vb-toolbar .vb-edit-btn')).toHaveCount(form === 'full' ? 1 : 0);
    await expectWhole(page, `${width}px`);
  }
  // At a third, by keyboard: "⋯", the Edit row, Enter; Editing in the bar.
  await menuButton(page).focus();
  await page.keyboard.press('Enter');
  const row = page.locator(`.vb-menu-fields ${bid('edit')}`);
  await expect(row).toBeVisible();
  await expect(row).toHaveText('Edit');
  await row.focus();
  await page.keyboard.press('Enter');
  await expect(chip(page)).toHaveAttribute('data-state', 'editing');
  // Stop editing from the chip's menu, by keyboard.
  await chip(page).focus();
  await page.keyboard.press('Enter');
  const stop = page.getByRole('menu', { name: 'This ledger' }).getByRole('menuitem', { name: 'Stop editing' });
  await expect(stop).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(chip(page)).toHaveAttribute('data-state', 'read-only');
  await reset(page);
});

const LONG_LEDGER = 'customer-research-interviews-2027-q1-q2';
const LONG_BOARD = 'Interview notes, round one: what the participants said about onboarding, pricing and the support they want';
/** Long folder, ledger and board names, a flagged card and a locked board, then read-only again. */
async function longNames(page: Page, request: APIRequestContext) {
  const folder = path.join(srv.home, 'projects', 'atlas-customer-research-programme-2027');
  fs.mkdirSync(folder, { recursive: true });
  await srv.open(folder, true, LONG_LEDGER);
  await editing(page, true);
  const agent = (await (await request.post(`${srv.base}/api/agents`, { data: { label: 'Long chat' } })).json() as { secret: string }).secret;
  const wrote = await request.post(`${srv.base}/api/boards/long-board/write`, { headers: { Authorization: `Bearer ${agent}` }, data: { items: [
    { type: 'board', title: LONG_BOARD }, { type: 'region', region: { id: 'roles', title: 'Roles', mode: 'grid' } },
    { type: 'node', node: { region: 'roles', kind: 'question', title: 'Which role first?' } }] } });
  expect(wrote.status(), await wrote.text()).toBe(200);
  const n = (await wrote.json() as { results: { n?: number }[] }).results[2]!.n!;
  for (const action of [{ action: 'flag', n }, { action: 'lock' }]) {
    const r = await page.request.post(`${srv.base}/api/boards/long-board/act`, { data: { type: 'act', board: 'long-board', ...action } });
    expect(r.status(), await r.text()).toBe(201);
  }
  await editing(page, false);
}

test('long folder, ledger and board names, Locked and flagged, read-only: every form fits', async ({ page, request }) => {
  await open(page);
  await longNames(page, request);
  const widths: string[] = [];
  for (const [width, form] of [[1470, 'full'], [1400, 'full'], [1300, 'full'], [1299, 'half'], [900, 'half'], [620, 'half'], [600, 'third'], [400, 'third']] as const) {
    await open(page, width);
    await expect(page.locator('.vb-toolbar')).toHaveAttribute('data-tier', form);
    await expect(chip(page)).toBeVisible();
    await expect(page.locator(bid('locked'))).toBeVisible();
    await expectWhole(page, `${width}px`);
    if (form !== 'third') {
      const board = (await page.locator('.vb-path-board').boundingBox())!.width;
      expect(board, `${width}px: the board's floor`).toBeGreaterThanOrEqual(form === 'full' ? 100 : 80);
      widths.push(`${width}px board ${Math.round(board)} edit ${await button(page).isVisible() ? 'button' : 'in the chip'}`);
    }
  }
  console.log(`Read-only header: ${widths.join('; ')}`);
  await srv.open(srv.start, false, 'main');
});

for (const theme of THEMES) {
  test(`axe at 1400, 900 and 600 px, the chip's menu and "⋯" open, read-only and editing (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    for (const width of [1400, 900, 600]) {
      await open(page, width);
      await expectBarPasses(page);
      await chip(page).click();
      await expectBarPasses(page);
      await page.keyboard.press('Escape');
      await menuButton(page).click();
      await expectBarPasses(page);
      await page.keyboard.press('Escape');
    }
    await editing(page, true);
    await open(page, 1400);
    await expect(chip(page)).toHaveAttribute('data-state', 'editing');
    await expectBarPasses(page);
    await reset(page);
  });

  test(`APCA (${theme}): the state's word Lc 60 and icon Lc 30, read-only, hovered and editing; its menu's line Lc 60`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page, 1400);
    const paint = (css: string) => resolved(page, css).then((c) => pixel(page, c));
    const colour = (sel: string) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).color).then((c) => pixel(page, c));
    const ground = () => chip(page).evaluate((e) => getComputedStyle(e).backgroundColor).then((c) => pixel(page, c));
    const found: [string, number, number][] = [];
    found.push(['word', lc(await colour('.vb-chip-editing .vb-chip-word'), await ground()), 60], ['eye', lc(await colour('.vb-chip-editing .vb-btn-icon'), await ground()), 30]);
    await chip(page).hover();
    found.push(['word hovered', lc(await colour('.vb-chip-editing .vb-chip-word'), await ground()), 60]);
    await chip(page).click();
    found.push(['menu line', lc(await colour('.vb-editing-line'), await paint('var(--vb-surface-raised)')), 60]);
    await page.keyboard.press('Escape');
    await editing(page, true);
    await open(page, 1400);
    await page.mouse.move(0, 500);
    found.push(['editing word', lc(await colour('.vb-chip-editing .vb-chip-word'), await ground()), 60], ['pencil', lc(await colour('.vb-chip-editing .vb-btn-icon'), await ground()), 30]);
    console.log(`APCA ${theme}: ${found.map(([w, v]) => `${w} ${v.toFixed(1)}`).join(', ')}`);
    for (const [what, v, tier] of found) expect(Math.abs(v), what).toBeGreaterThanOrEqual(tier);
    await reset(page);
  });
}

test('the flag off on the page: no chip and no Edit, and on a server without it, writes as today', async ({ page }) => {
  // The page's flag off, on this read-only server: nothing of the state shows.
  await open(page, 1400, 'ledgerFolders');
  await expect(page.locator('.vb-chip-editing, .vb-edit-btn')).toHaveCount(0);
  // The worker's own board (edit mode, the server's flag off), the page's flag on: nothing shows, and a press writes.
  await open(page, 1400, FLAGS, MAIN_BASE);
  await expect(page.locator('.vb-chip-editing, .vb-edit-btn')).toHaveCount(0);
  await expect(page.locator(bid('send'))).not.toHaveAttribute('title', REASON);
  const item = page.locator('vb-node[data-kind="decision"]').first();
  await expect(item.locator('button[data-act]').first()).not.toHaveAttribute('aria-disabled', 'true');
  const before = await head(page, MAIN_BASE);
  await item.focus();
  await page.keyboard.press('x'); // ✗, by its key (the opening zoom hides the card's buttons)
  await idle(page);
  await expect.poll(() => head(page, MAIN_BASE)).toBe(before + 1);
  await page.keyboard.press('x'); // as it was
  await idle(page);
});

// ---- The gallery's section (readOnlyStart flag) ----
const section = (page: Page) => page.locator('section[data-feature="readOnlyStart"]');

test('gallery: the section is there only with the flag, last, with the three forms and ids of its own', async ({ page }) => {
  await page.goto('/gallery.html');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html?flags=readOnlyStart');
  await expect(page.locator('main > section').last()).toHaveAttribute('data-feature', 'readOnlyStart');
  for (const form of ['full', 'half', 'third']) await expect(section(page).locator(`.vb-toolbar[data-tier="${form}"] .vb-chip-editing`).first()).toBeVisible();
  await expect(section(page).locator(`${bid('editing')}, ${bid('edit')}`)).toHaveCount(0);
  await expect(section(page).locator('vb-node button[data-flag]').first()).toHaveAttribute('aria-disabled', 'true');
});

for (const theme of THEMES) {
  test(`gallery: the section passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html?flags=readOnlyStart');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`read-only-${theme}.png`);
  });
}
