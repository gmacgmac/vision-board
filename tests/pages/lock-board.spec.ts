// Lock a board (N40 rulings 1-6, lockBoard flag, on by default; api.md 138-140). "⋯" › Lock board
// makes the open board read-only for everyone: "Locked" shows beside its name, the menu offers Unlock
// board, and every control that would change the board is paused in place (aria-disabled, the quiet
// look), saying "Locked: unlock to change it" when pressed, while nothing is written; the bookmark, the
// person's private mark, still works, by click and by B. A lock from another tab shows at once.
// All by keyboard as well, axe in both themes. It runs on the worker's empty project (EMPTY_BASE),
// fresh for this file (servers.ts), on a board of its own, and leaves it unlocked between tests.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, openSelectionBar, setTheme, test, bid } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { EMPTY_BASE } from './ports.ts';
import { card, idle, menuButton, toast } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];
const VAULT = 'vault';
const REASON = 'Locked: unlock to change it';

/** Open the page on the vault board and wait until it has read the ledger and drawn. */
async function open(page: Page, flags = ''): Promise<void> {
  await page.goto(`${EMPTY_BASE}/?vbwork${flags && `&flags=${flags}`}#${VAULT}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: unknown }).__vbWork !== undefined);
  await idle(page);
  await expect(page.locator(bid('board'))).toHaveValue(VAULT);
}

let made = false;
/** A board an agent drew: one container with a question and a decision. */
async function setUp(request: APIRequestContext): Promise<void> {
  if (made) return;
  const agent = await (await request.post(`${EMPTY_BASE}/api/agents`, { data: { label: 'Vault chat' } })).json() as { secret: string };
  const items = [
    { type: 'board', title: 'Vault' },
    { type: 'region', region: { id: 'ideas', title: 'Ideas', mode: 'grid' } },
    { type: 'node', node: { region: 'ideas', kind: 'question', title: 'Keep the vault?' } },
    { type: 'node', node: { region: 'ideas', kind: 'decision', title: 'Open it on Friday?' } },
  ];
  const r = await request.post(`${EMPTY_BASE}/api/boards/${VAULT}/write`, { headers: { Authorization: `Bearer ${agent.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  made = true;
}

/** Lock or unlock the vault as the person, through the API, as another tab would. */
async function mark(page: Page, action: 'lock' | 'unlock'): Promise<void> {
  const r = await page.request.post(`${EMPTY_BASE}/api/boards/${VAULT}/act`, { data: { type: 'act', action, board: VAULT } });
  expect(r.status(), await r.text()).toBe(201);
}

/** Whether the server has the vault locked (`get_board`'s `locked`). */
const serverLocked = async (page: Page) =>
  ((await (await page.request.get(`${EMPTY_BASE}/api/boards/${VAULT}`)).json()) as { locked?: true }).locked === true;
/** The ledger's lines after `after` (the person's `read_ledger`). */
const linesAfter = async (page: Page, after: number) =>
  ((await (await page.request.get(`${EMPTY_BASE}/api/ledger?after=${after}`)).json()) as { events: { type: string }[] }).events;
/** The ledger's latest line. */
const head = async (page: Page) => ((await (await page.request.get(`${EMPTY_BASE}/api/boards`)).json()) as { head: number }).head;

const lockRow = (page: Page) => page.locator(bid('lock-board'));
const chip = (page: Page) => page.locator(bid('locked'));
const frame = (page: Page) => page.locator('vb-region[data-region="ideas"]');

/** Every control a lock pauses on the board; never the bookmark, the number. */
const PAUSED = 'vb-node [data-mark="answer"], vb-region button.vb-mtile, vb-region .vb-region-grip, vb-region .vb-region-comment';
const disc = (page: Page, n: number) => card(page, n).locator('[data-mark="answer"]');
const number = (page: Page, n: number) => card(page, n).locator('[data-mark="number"]');

/** Leave the vault unlocked whatever a test did. */
test.afterEach(async ({ page }) => {
  if (made && await serverLocked(page)) await mark(page, 'unlock');
});

test('"⋯" › Lock board pauses the board in place, says so beside its name, and offers Unlock board', async ({ page, request }) => {
  await setUp(request);
  await open(page);
  await expect(chip(page)).toHaveCount(0);
  await menuButton(page).click();
  await expect(lockRow(page)).toHaveText('Lock board');
  await expect(lockRow(page)).toHaveAttribute('aria-disabled', 'false');
  await expect(lockRow(page).locator('svg.vb-btn-icon')).toHaveCount(1); // a flat SVG padlock, never an emoji
  await lockRow(page).click();
  await idle(page);
  await expect(toast(page)).toHaveText('Board locked: nobody can change it until you unlock it');
  await expect(chip(page)).toHaveText('Locked');
  await expect(chip(page)).toHaveAttribute('title', /^Locked: unlock to change it/);
  expect(await serverLocked(page)).toBe(true);
  await expect(page.locator('.vb-world')).toHaveAttribute('data-locked', '');
  const paused = page.locator(PAUSED);
  expect(await paused.count()).toBeGreaterThanOrEqual(6);
  for (const el of await paused.all()) await expect(el).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('vb-node [data-mark="number"]').first()).not.toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator(bid('send'))).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator(bid('send'))).toHaveAttribute('title', REASON);
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
  }
  await menuButton(page).click();
  await expect(lockRow(page)).toHaveText('Unlock board');
  await lockRow(page).click();
  await idle(page);
  await expect(toast(page)).toHaveText('Board unlocked');
  await expect(chip(page)).toHaveCount(0);
  await expect(page.locator('.vb-world')).not.toHaveAttribute('data-locked', '');
  for (const el of await paused.all()) await expect(el).not.toHaveAttribute('aria-disabled', 'true');
  expect(await serverLocked(page)).toBe(false);
});

test('locked, a press on a paused control says why and writes nothing: the disc, a key, a note, a layout, the selection bar', async ({ page, request }) => {
  await setUp(request);
  await open(page);
  await mark(page, 'lock');
  await idle(page);
  const before = await head(page);
  // A paused control is aria-disabled, which Playwright won't press unless forced; a person's click still lands: the
  // disc turns into a lock for a moment and says why (point 328).
  await disc(page, 1).click({ force: true });
  await expect(disc(page, 1)).toHaveAttribute('data-locked', '');
  await expect(page.locator('.vb-mark-tip')).toHaveText('Board is locked');
  await expect(disc(page, 1)).toHaveAttribute('data-answer', 'waiting');
  // X answers as the disc does: the lock on the mark.
  await card(page, 2).focus();
  await page.keyboard.press('x');
  await expect(disc(page, 2)).toHaveAttribute('data-locked', '');
  await expect(disc(page, 2)).toHaveAttribute('data-answer', 'waiting');
  await page.keyboard.press('c');
  await expect(page.locator('vb-note-bubble')).toBeHidden(); // no note can be written
  // A tile of the layout popover is paused: aria-disabled, and a press says why and sends nothing.
  const tile = frame(page).locator('button.vb-mtile[data-tile="column"]');
  await expect(tile).toHaveAttribute('aria-disabled', 'true');
  await tile.evaluate((e) => (e as HTMLElement).click());
  await expect(toast(page)).toHaveText(REASON);
  await expect(frame(page)).toHaveAttribute('data-mode', 'grid');
  await card(page, 1).click();
  await openSelectionBar(page);
  await expect(page.locator('vb-selection-bar button[data-command="comment"]')).toBeDisabled();
  await page.keyboard.press('Escape');
  await idle(page);
  expect((await linesAfter(page, before)).map((e) => e.type).filter((t) => t !== 'seen'), 'nothing but what the person saw').toEqual([]);
  await mark(page, 'unlock');
  await idle(page);
  await card(page, 1).focus();
  await page.keyboard.press('a');
  await idle(page);
  await expect(disc(page, 1)).toHaveAttribute('data-answer', 'ticked');
  expect(await head(page)).toBeGreaterThan(before);
});

test('locked, the bookmark still works: by the number and by B (it changes nothing an agent reads)', async ({ page, request }) => {
  await setUp(request);
  await open(page);
  await mark(page, 'lock');
  await idle(page);
  const bookmark = number(page, 2);
  await bookmark.click();
  await idle(page);
  await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator(bid('bookmarked'))).toBeVisible();
  await card(page, 2).focus();
  await page.keyboard.press('b');
  await idle(page);
  await expect(bookmark).toHaveAttribute('aria-pressed', 'false');
  await expect(toast(page)).not.toHaveText(REASON);
});

test('locked or unlocked in another tab, the page follows at once', async ({ page, request }) => {
  await setUp(request);
  await open(page);
  await mark(page, 'lock');
  await idle(page);
  await expect(chip(page)).toHaveText('Locked');
  await expect(disc(page, 1)).toHaveAttribute('aria-disabled', 'true');
  await mark(page, 'unlock');
  await idle(page);
  await expect(chip(page)).toHaveCount(0);
  await expect(disc(page, 1)).not.toHaveAttribute('aria-disabled', 'true');
});

test('by keyboard: the "⋯" menu\'s Lock board, then Unlock board', async ({ page, request }) => {
  await setUp(request);
  await open(page);
  for (const [word, locked] of [['Lock board', true], ['Unlock board', false]] as const) {
    await menuButton(page).focus();
    await page.keyboard.press('Enter');
    for (let i = 0; i < 8 && !(await lockRow(page).evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press('ArrowDown');
    await expect(lockRow(page)).toBeFocused();
    await expect(lockRow(page)).toHaveText(word);
    await page.keyboard.press('Enter');
    await idle(page);
    await expect(menuButton(page)).toBeFocused();
    expect(await serverLocked(page)).toBe(locked);
    await expect(chip(page)).toHaveCount(locked ? 1 : 0);
  }
});

test('with -lockBoard: no Lock board row; a board locked elsewhere still shows Locked and stays paused', async ({ page, request }) => {
  await setUp(request);
  await open(page, '-lockBoard');
  await menuButton(page).click();
  await expect(page.getByRole('menu', { name: 'More' })).toBeVisible();
  await expect(lockRow(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await mark(page, 'lock');
  await idle(page);
  await expect(chip(page)).toHaveText('Locked');
  await expect(disc(page, 1)).toHaveAttribute('aria-disabled', 'true');
});

// ---- The gallery's lock section (lockBoard flag) ----
const section = (page: Page) => page.locator('section[data-feature="lockBoard"]');

test('gallery: the lock section shows by default, and not with -lockBoard', async ({ page }) => {
  await page.goto('/gallery.html?flags=-lockBoard');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  await expect(section(page).getByRole('menuitem', { name: 'Lock board', exact: true })).toBeVisible();
  await expect(section(page).getByRole('menuitem', { name: 'Unlock board' })).toBeVisible();
  await expect(section(page).locator('.vb-chip-locked')).toHaveText('Locked');
  await expect(section(page).locator('vb-node [data-mark="answer"]').first()).toHaveAttribute('aria-disabled', 'true');
  await expect(section(page).locator('vb-node [data-mark="number"]').first()).not.toHaveAttribute('aria-disabled', 'true');
  await expect(section(page).locator(`${bid('lock-board')}, ${bid('locked')}`)).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`gallery: the lock section passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`lock-${theme}.png`);
  });
}
