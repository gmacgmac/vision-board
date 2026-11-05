// Read-only as one toggle (readOnlyToggle flag, PLAN decision 11, point 431; FE_02), on a folder server that opens every
// ledger read-only (folder-server.ts `readOnly`, with ledger folders): the header's state is one button that shows it,
// "Read-only" or "Editing", and flips it on a press (aria-pressed, its name Edit, constant); one press takes the
// ledger's lock, one more gives it back; Space and Enter do the same; another computer holding the ledger leaves it
// Read-only and the toast says who; it is in the bar at every tier, with no Edit button or "⋯" row beside it; axe and
// APCA in light and dark; the flag off is the menu as before (read-only.spec.ts holds the rest of that); the gallery's
// section. Fresh for this file; the tests run in order, each leaving `main` open, read-only.
import fs from 'node:fs';
import type { Page } from '@playwright/test';
import { ledgerFiles, ledgerFolder } from '#format';
import { lc, pixel } from './apca.ts';
import { idle, menuButton, toast } from './board-page.ts';
import type { FolderServer } from './folder-server.ts';
import { startFolderServer } from './folder-server.ts';
import { expectBarPasses, expectWhole } from './header-fit.ts';
import { bid, expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

test.describe.configure({ mode: 'serial' });

const THEMES: Theme[] = ['light', 'dark'];
const FLAGS = 'readOnlyStart,ledgerFolders,readOnlyToggle';
let srv: FolderServer;
test.beforeAll(async () => { srv = await startFolderServer({ ledgers: true, readOnly: true }); });
test.afterAll(async () => { await srv.close(); });

/** The page at `width` with the flags on (or `flags` as given), drawn and settled. */
async function open(page: Page, width = 1400, flags = FLAGS) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${srv.base}/?vbwork&flags=${flags}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
  await idle(page);
}
const toggle = (page: Page) => page.locator(bid('editing'));
/** The server's word on the open ledger. */
const project = async (page: Page) => (await (await page.request.get(`${srv.base}/api/project`)).json()) as { readOnly?: true; editing?: { here?: true; host?: string } };
/** Back to read-only on `main`, as every test leaves it. */
async function reset(page: Page) {
  if ((await project(page)).editing?.here) expect((await page.request.delete(`${srv.base}/api/project/edit`)).status()).toBe(200);
}
/** The toggle says `state`: its word, its data-state and aria-pressed, and the server agrees. */
async function says(page: Page, state: 'read-only' | 'editing') {
  await expect(toggle(page)).toHaveAttribute('data-state', state);
  await expect(toggle(page)).toHaveAttribute('aria-pressed', String(state === 'editing'));
  await expect(toggle(page)).toContainText(state === 'editing' ? 'Editing' : 'Read-only');
  await expect.poll(async () => ((await project(page)).editing?.here ? 'editing' : 'read-only')).toBe(state);
}

test('one toggle: it shows Read-only, named Edit, not pressed; no menu and no Edit button beside it', async ({ page }) => {
  await open(page);
  await expect(toggle(page)).toBeVisible();
  await expect(toggle(page)).toHaveRole('button');
  await expect(toggle(page)).toHaveAccessibleName('Edit');
  await expect(toggle(page)).toHaveAttribute('title', 'Read-only: press to edit this ledger here');
  await expect(toggle(page)).not.toHaveAttribute('aria-haspopup');
  await says(page, 'read-only');
  await expect(page.locator(bid('edit'))).toHaveCount(0);
  await expect(page.locator('.vb-edit-btn, .vb-editing [role="menu"]')).toHaveCount(0);
});

test('a press takes the lock and shows Editing; one more gives it back; a write works only between', async ({ page }) => {
  await open(page);
  await toggle(page).click();
  await says(page, 'editing');
  await expect(toggle(page)).toHaveAccessibleName('Edit');
  await expect(toggle(page)).toHaveAttribute('title', 'Editing: this ledger is open for changes here; press to make it read-only again');
  await expect(page.getByRole('status').filter({ hasText: 'You are editing this ledger.' })).toHaveCount(1);
  const ack = page.locator('vb-node').first().locator('button[data-act]').first();
  await expect(ack).not.toHaveAttribute('aria-disabled', 'true');
  await toggle(page).click();
  await says(page, 'read-only');
  await expect(page.getByRole('status').filter({ hasText: 'This ledger is now read-only.' })).toHaveCount(1);
  await expect(ack).toHaveAttribute('aria-disabled', 'true');
});

test('by keyboard: Space flips it, Enter flips it back; focus stays on it', async ({ page }) => {
  await open(page);
  await toggle(page).focus();
  await page.keyboard.press('Space');
  await says(page, 'editing');
  await expect(toggle(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await says(page, 'read-only');
  await expect(toggle(page)).toBeFocused();
});

/** A lock another computer's board server holds live on `main`, as lock.ts writes one. */
function anotherComputer(): () => void {
  const lock = ledgerFiles(ledgerFolder(srv.start, 'main')).lock;
  const now = new Date().toISOString();
  fs.writeFileSync(lock, `${JSON.stringify({ host: 'another-computer', pid: 1, port: 4470, started: now, beat: now })}\n`);
  return () => fs.rmSync(lock, { force: true });
}

test.describe('another computer edits', () => {
  // The press's refusal is the server's 409, on purpose.
  test.use({ expected: { problems: [/^response 409: POST http:\/\/127\.0\.0\.1:\d+\/api\/project\/edit$/, /status of 409/] } });

  test('a press is refused: it stays Read-only, the toast says who, and its tooltip names them', async ({ page }) => {
    const gone = anotherComputer();
    try {
      await open(page);
      await toggle(page).click();
      await expect(toast(page)).toContainText('another-computer has been editing this ledger since');
      await expect(toast(page)).toContainText('Press again once it stops editing.');
      await says(page, 'read-only');
      await expect(toggle(page)).toHaveAttribute('title', /^Read-only: being edited on another-computer since \d.*; press to try again$/);
      await expect(toggle(page)).toBeFocused();
    } finally { gone(); }
  });
});

test('every tier: the toggle is in the bar at 1400, 900 and 600 px, its word gives way at a third; "⋯" holds no Edit row', async ({ page }) => {
  for (const [width, form] of [[1400, 'full'], [900, 'half'], [620, 'half'], [600, 'third']] as const) {
    await open(page, width);
    await expect(page.locator('.vb-toolbar')).toHaveAttribute('data-tier', form);
    await expect(toggle(page), `${width}px`).toBeVisible();
    await expect(toggle(page).locator('.vb-btn-icon').first(), `${width}px: the icon`).toBeVisible();
    const word = await toggle(page).locator('.vb-chip-word').evaluate((e) => getComputedStyle(e).position);
    expect(word, `${width}px: the word`).toBe(width <= 620 ? 'absolute' : 'static');
    await expect(toggle(page), `${width}px: the name`).toHaveAccessibleName('Edit');
    await expectWhole(page, `${width}px`);
    if (form !== 'full') {
      await menuButton(page).click();
      await expect(page.locator('.vb-menu-fields').first()).toBeAttached();
      await expect(page.locator(bid('edit')), `${width}px: no Edit row`).toHaveCount(0);
      await page.keyboard.press('Escape');
    }
  }
  // At a third, its icon alone: a press flips it all the same.
  await toggle(page).click();
  await says(page, 'editing');
  await toggle(page).click();
  await says(page, 'read-only');
});

for (const theme of THEMES) {
  test(`axe at 1400, 900 and 600 px, read-only and editing (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    for (const width of [1400, 900, 600]) {
      await open(page, width);
      await expectBarPasses(page);
      await toggle(page).click();
      await says(page, 'editing');
      await expectBarPasses(page);
      await toggle(page).click();
      await says(page, 'read-only');
    }
  });

  test(`APCA (${theme}): the word Lc 60 and the icon Lc 30, read-only, hovered and editing`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page, 1400);
    const colour = (sel: string) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).color).then((c) => pixel(page, c));
    const ground = () => toggle(page).evaluate((e) => getComputedStyle(e).backgroundColor).then((c) => pixel(page, c));
    const found: [string, number, number][] = [];
    const measure = async (what: string) => found.push(
      [`${what} word`, lc(await colour('.vb-chip-editing .vb-chip-word'), await ground()), 60],
      [`${what} icon`, lc(await colour('.vb-chip-editing .vb-btn-icon'), await ground()), 30]);
    await measure('read-only');
    await toggle(page).hover();
    await measure('read-only hovered');
    await toggle(page).click();
    await says(page, 'editing');
    await measure('editing hovered');
    await page.mouse.move(0, 500);
    await measure('editing');
    console.log(`APCA ${theme}: ${found.map(([w, v]) => `${w} ${v.toFixed(1)}`).join(', ')}`);
    for (const [what, v, tier] of found) expect(Math.abs(v), what).toBeGreaterThanOrEqual(tier);
    await reset(page);
  });
}

test('the flag off: the chip opens its menu and Edit is a button beside it, as before', async ({ page }) => {
  await open(page, 1400, 'readOnlyStart,ledgerFolders,-readOnlyToggle');
  await expect(toggle(page)).toHaveAttribute('aria-haspopup', 'menu');
  await expect(toggle(page)).not.toHaveAttribute('aria-pressed');
  await expect(toggle(page)).toHaveAccessibleName('Read-only: press Edit to change this ledger');
  await expect(page.locator(bid('edit'))).toHaveAccessibleName('Edit');
  await toggle(page).click();
  await expect(page.getByRole('menu', { name: 'This ledger' })).toBeVisible();
  await page.keyboard.press('Escape');
});

// ---- The gallery's section (readOnlyStart flag; the toggle with readOnlyToggle) ----
const section = (page: Page) => page.locator('section[data-feature="readOnlyStart"]');
const GALLERY = '/gallery.html?flags=readOnlyStart,-ledgerFolders,readOnlyToggle';

test('gallery: the toggle in the three forms, read-only and editing, busy, and the refusal; no menu, no Edit button', async ({ page }) => {
  await page.goto(GALLERY);
  for (const form of ['full', 'half', 'third']) await expect(section(page).locator(`.vb-toolbar[data-tier="${form}"] .vb-chip-editing`).first()).toBeVisible();
  const toggles = (state: string) => section(page).locator(`.vb-chip-editing${state}`);
  await expect(toggles('[aria-pressed="true"]').first()).toBeVisible();
  await expect(toggles('[aria-pressed="false"]').first()).toBeVisible();
  await expect(toggles('[aria-busy="true"]')).toHaveCount(2);
  await expect(section(page).locator('.vb-edit-btn, .vb-editing [role="menu"], .vb-chip-editing[aria-haspopup]')).toHaveCount(0);
  await expect(section(page)).toContainText('Press again once it stops editing.');
});

for (const theme of THEMES) {
  test(`gallery: the toggle's section passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto(GALLERY);
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`read-only-toggle-${theme}.png`);
  });
}
