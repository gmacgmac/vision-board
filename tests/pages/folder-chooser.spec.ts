// The folder dialog, wider and wrapping, and the system's folder chooser (D-110, systemFolderChooser flag, on by
// default; folder-chooser-setup T_01): the dialog is 720px wide on a wide window and keeps a 16px gutter on a phone;
// a long folder name wraps in its row and is never cut. "Choose in Finder…" shows where the server offers the chooser
// (a stand-in runner here, folder-server.ts: no test opens the real one), Tab reaches it, and while it is open the
// status says so and Cancel closes both. A pick outside home shows on the Chosen folder line with Open focused; Open
// reloads onto it and it joins Recent, by its whole path, from where it is chosen again. A hidden pick is refused in the
// problem line and the dialog stays. Axe and APCA (the Chosen folder line Lc 60) light and dark; -systemFolderChooser
// shows no button. The gallery's own section (last in the gallery) in each state, axe and its screenshot. The home folder and the
// "drive" are temp folders.
import type { Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { FolderServer } from './folder-server.ts';
import { seed, startFolderServer } from './folder-server.ts';
import { lc, pixel } from './apca.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { OLD_HEADER, folderDialog as dialog, menuButton } from './board-page.ts';

test.describe.configure({ mode: 'serial' });

const LONG = 'customer-research-interviews-2026-autumn-round-with-the-whole-product-team-notes-and-every-recording';
let srv: FolderServer;
let drive: string;
let atlas: string;
let hidden: string;
/** What the stand-in chooser answers next; `signals` holds each call's signal. */
let next: () => Promise<string | undefined> = async () => undefined;
const signals: AbortSignal[] = [];

test.beforeAll(async () => {
  drive = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vb-chooser-drive-')));
  atlas = path.join(drive, 'projects', 'atlas');
  hidden = path.join(drive, '.archive', 'atlas');
  seed(atlas, 'atlas-board', 'Atlas card');
  fs.mkdirSync(hidden, { recursive: true });
  // As the real one: aborting the call closes it, answered as cancelled.
  srv = await startFolderServer({
    chooser: ({ signal }) => new Promise((resolve, reject) => {
      signals.push(signal);
      signal.addEventListener('abort', () => resolve(undefined), { once: true });
      next().then(resolve, reject);
    }),
  });
  fs.mkdirSync(path.join(srv.home, 'projects', LONG));
});
test.afterAll(async () => {
  await srv.close();
  fs.rmSync(drive, { recursive: true, force: true });
});
test.beforeEach(async () => { await srv.open(srv.start); });

async function open(page: Page, flags = '') {
  await page.goto(`${srv.base}/?vbwork&flags=${[OLD_HEADER, flags].filter(Boolean).join(',')}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
}
const finder = (page: Page) => dialog(page).locator('#folder-dialog-finder');
const status = (page: Page) => dialog(page).locator('.vb-folder-status');
const accept = (page: Page) => dialog(page).locator('#folder-dialog-accept');
const chosen = (page: Page) => dialog(page).locator('.vb-folder-chosen-path');
const problem = (page: Page) => dialog(page).locator('.vb-dialog-problem');
const recentRows = (page: Page) => dialog(page).getByRole('list', { name: 'Recent' }).getByRole('button');

async function openPicker(page: Page) {
  await menuButton(page).click();
  await page.locator('#open-folder').click();
  await expect(dialog(page).getByRole('list', { name: /^In / }).getByRole('button')).toHaveText(['projects']);
}

/** The stand-in chooser waits until `answer` is called with the pick. */
function held(): (pick: string | undefined) => void {
  let answer!: (pick: string | undefined) => void;
  next = () => new Promise((resolve) => { answer = resolve; });
  return (pick) => answer(pick);
}

test('the dialog is 720px wide, with a 16px gutter at phone width; a long name wraps, never cut', async ({ page }) => {
  await open(page);
  await openPicker(page);
  expect((await dialog(page).boundingBox())!.width).toBe(720);
  await dialog(page).getByRole('button', { name: 'projects' }).click();
  const name = dialog(page).locator('.vb-folder-name', { hasText: LONG });
  await expect(name).toBeVisible();
  const fits = await name.evaluate((el) => ({ cut: el.scrollWidth > el.clientWidth, ellipsis: getComputedStyle(el).textOverflow, lines: el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight) }));
  expect(fits).toMatchObject({ cut: false, ellipsis: 'clip' });
  expect(fits.lines).toBeGreaterThan(1.5);
  await page.setViewportSize({ width: 375, height: 812 });
  const box = (await dialog(page).boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(16);
  expect(box.x + box.width).toBeLessThanOrEqual(375 - 16);
  expect(await dialog(page).evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true); // nothing in it runs past its edge
});

test('Choose in Finder…: Tab reaches it; waiting says so; the pick outside home opens and joins Recent', async ({ page }) => {
  await open(page);
  await openPicker(page);
  await dialog(page).getByRole('button', { name: 'projects' }).focus();
  await page.keyboard.press('Tab');
  await expect(finder(page)).toBeFocused();
  await expect(finder(page)).toHaveText('Choose in Finder…');
  const answer = held();
  await page.keyboard.press('Enter');
  await expect(status(page)).toHaveText('Waiting for Finder… Choose a folder there, or Cancel here.');
  await expect(finder(page)).toHaveAttribute('aria-disabled', 'true');
  await expect(accept(page)).toBeDisabled();
  answer(`${atlas}/`);
  await expect(chosen(page)).toHaveText(atlas);
  await expect(status(page)).toHaveText('Vision Board found (1 board)');
  await expect(accept(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveTitle('atlas · Vision Board');
  await expect(page.locator('vb-node .vb-node-title')).toHaveText(['Atlas card']);
  await srv.open(srv.start);
  await open(page);
  await openPicker(page);
  await expect(recentRows(page).first()).toHaveText(new RegExp(`^${atlas}`));
  await recentRows(page).first().click();
  await expect(chosen(page)).toHaveText(atlas); // can't be listed: it is the chosen folder
  await expect(accept(page)).toBeFocused();
  await dialog(page).getByRole('button', { name: '~', exact: true }).click();
  await expect(chosen(page)).toHaveCount(0);
});

test.describe('a refused pick', () => {
  // The refusal is the server's answer on purpose: 422, and the browser's console line for it.
  test.use({ expected: { problems: [/response 422: POST .*\/api\/folders\/choose$/, /console error: Failed to load resource: .* 422/] } });
  test('a hidden pick is refused in the problem line, and the dialog stays', async ({ page }) => {
  await open(page);
  await openPicker(page);
  next = async () => hidden;
  await finder(page).click();
  await expect(problem(page)).toHaveText(`${hidden} is hidden (a part of its path starts with a dot), so it can't be a project folder. Choose a folder that is not hidden.`);
  await expect(dialog(page)).toBeVisible();
  await expect(chosen(page)).toHaveCount(0);
  await expect(page).toHaveTitle('start · Vision Board');
  });
});

test.describe('Cancel while waiting', () => {
  // Cancel aborts the page's call on purpose: that is what closes the chooser.
  test.use({ expected: { problems: [/request failed: POST .*\/api\/folders\/choose \(net::ERR_ABORTED\)$/] } });
  test('Cancel while Finder is open closes the dialog and the chooser (its call is aborted)', async ({ page }) => {
  await open(page);
  await openPicker(page);
  held();
  const before = signals.length;
  await finder(page).click();
  await expect(status(page)).toHaveText(/^Waiting for Finder/);
  await expect.poll(() => signals.length).toBe(before + 1);
  await dialog(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog(page)).toBeHidden();
  await expect.poll(() => signals.at(-1)!.aborted).toBe(true);
  });
});

test('with -systemFolderChooser there is no button', async ({ page }) => {
  await open(page, '-systemFolderChooser');
  await openPicker(page);
  await expect(finder(page)).toHaveCount(0);
});

for (const theme of ['light', 'dark'] as Theme[]) {
  test(`axe passes waiting on Finder and with a chosen folder (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page);
    await openPicker(page);
    const answer = held();
    await finder(page).click();
    await expect(status(page)).toHaveText(/^Waiting for Finder/);
    await expectNoAxeViolations(page);
    answer(atlas);
    await expect(chosen(page)).toHaveText(atlas);
    await expectNoAxeViolations(page);
  });
}

for (const theme of ['light', 'dark'] as Theme[]) {
  test(`APCA (${theme}): the Chosen folder line, label and path, Lc 60`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page);
    await openPicker(page);
    next = async () => atlas;
    await finder(page).click();
    await expect(chosen(page)).toHaveText(atlas);
    const colour = (sel: string) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).color).then((c) => pixel(page, c));
    const back = await page.locator('.vb-folder-chosen').evaluate((e) => getComputedStyle(e).backgroundColor).then((c) => pixel(page, c));
    const label = lc(await colour('.vb-folder-chosen-label'), back);
    const value = lc(await colour('.vb-folder-chosen-path'), back);
    console.log(`APCA ${theme}: chosen label ${label.toFixed(1)}, path ${value.toFixed(1)}`);
    expect(label, 'label').toBeGreaterThanOrEqual(60);
    expect(value, 'path').toBeGreaterThanOrEqual(60);
  });
}

// ---- The gallery's section (folder-chooser-section.ts), last in the gallery ----
const section = (page: Page) => page.locator('section[data-feature="systemFolderChooser"]');

test('gallery: long names, then the chooser\'s states; with -systemFolderChooser only the long names', async ({ page }) => {
  await page.goto('/gallery.html?flags=-systemFolderChooser');
  await expect(section(page).locator('.vb-folder-status')).toHaveText(['Vision Board found (12 boards)']);
  await page.goto('/gallery.html');
  await expect(section(page).locator('.vb-folder-status')).toHaveText([
    'Vision Board found (12 boards)', 'Choose a project folder under ~', 'Waiting for Finder… Choose a folder there, or Cancel here.',
    'Vision Board found (2 boards)', 'Choose a project folder under ~',
  ]);
  await expect(section(page).locator('.vb-folder-finder')).toHaveCount(4);
  await expect(section(page).locator('.vb-folder-chosen-path')).toHaveText(['/Volumes/Example-Drive/projects/atlas']);
  await expect(section(page).locator('.vb-dialog-problem')).toHaveText(/is hidden/);
  await page.goto('/gallery.html?flags=-openFolder');
  await expect(section(page)).toHaveCount(0);
});

for (const theme of ['dark', 'light'] as Theme[]) {
  test(`gallery: the section passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`folder-chooser-${theme}.png`);
  });
}
