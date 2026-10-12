// Archive a board (N39 rulings 4-6, archiveBoard flag, on by default; api.md 135-137). "⋯" › Archive
// board… asks first (the board's name and dates, Cancel focused), then the board leaves the picker,
// every agent's reads, and the page opens the next board. The picker then ends with "Archived (N)…",
// a list of archived boards each with Restore, which brings the board back and opens it. A board
// archived elsewhere leaves the page too; a reload, the hash or the remembered board never opens it;
// with no board left the page shows its empty state. All by keyboard as well, axe in both themes.
// It runs on the empty project's server (EMPTY_BASE) after new-board.spec.ts, adds two boards of its
// own, and restores every board it archived, so toolbar.spec.ts after it finds the boards as they were.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { EMPTY_BASE } from './perf-server.ts';

const THEMES: Theme[] = ['dark', 'light'];
const ONE = 'multi-bot';
const TWO = 'multi-bot-plan';

/** The page has read every line written so far and drawn it. */
const idle = (page: Page) => page.evaluate(() => (window as unknown as { __vbWork: { idle(): Promise<void> } }).__vbWork.idle());

/** Open the page (on `board` when given) and wait until it has read the ledger and drawn. */
async function open(page: Page, hash = '', flags = ''): Promise<void> {
  await page.goto(`${EMPTY_BASE}/?vbwork${flags && `&flags=${flags}`}${hash && `#${hash}`}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: unknown }).__vbWork !== undefined);
  await idle(page);
}

let made = false;
/** Two boards an agent drew, side by side in the picker, the first with a question on it. */
async function setUp(request: APIRequestContext): Promise<void> {
  if (made) return;
  const agent = await (await request.post(`${EMPTY_BASE}/api/agents`, { data: { label: 'Multi-bot chat' } })).json() as { secret: string };
  for (const [board, title] of [[ONE, 'Multi-bot'], [TWO, 'Multi-bot plan']]) {
    const items = [
      { type: 'board', title },
      { type: 'region', region: { id: 'plan', title: 'Plan', mode: 'grid' } },
      { type: 'node', node: { region: 'plan', kind: 'question', title: `Which bot first on ${title}?` } },
    ];
    const r = await request.post(`${EMPTY_BASE}/api/boards/${board}/write`, { headers: { Authorization: `Bearer ${agent.secret}` }, data: { items } });
    expect(r.status(), await r.text()).toBe(200);
  }
  made = true;
}

/** Archive or restore `board` as the person, through the API, as another tab would. */
async function mark(page: Page, board: string, action: 'archive' | 'restore'): Promise<void> {
  const r = await page.request.post(`${EMPTY_BASE}/api/boards/${board}/act`, { data: { type: 'act', action, board } });
  expect(r.status(), await r.text()).toBe(201);
}

/** The boards an agent sees (`list_boards`). */
const agentBoards = async (request: APIRequestContext) =>
  ((await (await request.get(`${EMPTY_BASE}/api/boards`)).json()) as { boards: { board: string }[] }).boards.map((b) => b.board);

const picker = (page: Page) => page.locator('#board');
const menuButton = (page: Page) => page.locator('#toolbar-menu');
const archiveRow = (page: Page) => page.locator('#archive-board');
const confirmDialog = (page: Page) => page.locator('#confirm-dialog');
const archived = (page: Page) => page.locator('#archived-dialog');

test('Archive board… asks with the board\'s name and dates; Cancel and Esc change nothing', async ({ page, request }) => {
  await setUp(request);
  await open(page, ONE);
  await expect(picker(page)).toHaveValue(ONE);
  await menuButton(page).click();
  await expect(archiveRow(page)).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(archiveRow(page)).toHaveAttribute('aria-disabled', 'false');
  await archiveRow(page).click();
  await expect(confirmDialog(page)).toBeVisible();
  await expect(page.locator('#confirm-title')).toHaveText('Archive \'Multi-bot\'?');
  await expect(page.locator('#confirm-body')).toHaveText(/^Created \S.*, last updated \S.*\. Agents won't see it; you can restore it from the board picker\.$/);
  await expect(page.locator('#confirm-ok')).toHaveText('Archive');
  await expect(page.locator('#confirm-cancel')).toBeFocused(); // Enter never archives by accident
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
  }
  await page.keyboard.press('Escape');
  await expect(confirmDialog(page)).toBeHidden();
  await menuButton(page).click();
  await archiveRow(page).click();
  await page.locator('#confirm-cancel').click();
  await expect(confirmDialog(page)).toBeHidden();
  await idle(page);
  await expect(picker(page).locator(`option[value="${ONE}"]`)).toHaveCount(1);
  expect(await agentBoards(request)).toContain(ONE);
});

test('archived by keyboard: it leaves the picker and every agent, and the next board opens', async ({ page, request }) => {
  await setUp(request);
  await open(page, ONE);
  await menuButton(page).focus();
  await page.keyboard.press('Enter');
  for (let i = 0; i < 6 && !(await archiveRow(page).evaluate((e) => e === document.activeElement)); i++) await page.keyboard.press('ArrowDown');
  await expect(archiveRow(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#confirm-cancel')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#confirm-ok')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(confirmDialog(page)).toBeHidden();
  await idle(page);
  await expect(picker(page).locator(`option[value="${ONE}"]`)).toHaveCount(0);
  await expect(picker(page)).toHaveValue(TWO); // the board after it in the picker
  await expect(page.locator('#title')).toHaveText('Multi-bot plan');
  await expect(picker(page).locator('option[value=":archived"]')).toHaveText('Archived (1)…');
  expect(await agentBoards(request)).not.toContain(ONE);
  expect((await request.get(`${EMPTY_BASE}/api/boards/${ONE}`)).status()).toBe(404);
});

test('the picker\'s Archived list: Esc closes it; Restore brings the board back and opens it', async ({ page, request }) => {
  await setUp(request);
  await open(page, TWO);
  await picker(page).focus(); // as a click or Tab would
  await picker(page).selectOption(':archived');
  await expect(archived(page)).toBeVisible();
  await expect(archived(page).getByRole('heading')).toHaveText('Archived boards');
  const restore = archived(page).getByRole('button', { name: 'Restore Multi-bot', exact: true });
  await expect(restore).toBeFocused();
  await expect(archived(page).locator('.vb-archived-row')).toHaveText([/Multi-bot\s*Last updated \S.*Restore/]);
  await expect(picker(page)).toHaveValue(TWO); // choosing the entry leaves the open board in the picker
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
  }
  await page.keyboard.press('Escape');
  await expect(archived(page)).toBeHidden();
  await expect(picker(page)).toBeFocused();
  // The race a full run used to lose (N40 step 5): Esc shuts the dialog and queues its close event,
  // and the entry is chosen again before that event fires. Played in one task, so the event always
  // lands after the dialog has opened again: it must close nothing.
  expect(await page.evaluate(async () => {
    const dialog = document.querySelector<HTMLDialogElement>('#archived-dialog')!;
    const select = document.querySelector<HTMLSelectElement>('#board')!;
    dialog.close(); // as the shell had it shut: no-op
    select.value = ':archived';
    select.dispatchEvent(new Event('change', { bubbles: true })); // opens it
    await new Promise((r) => setTimeout(r, 50));
    if (!dialog.open) return 'not opened';
    dialog.dispatchEvent(new Event('cancel', { cancelable: true })); // Esc: the shell lets it shut
    dialog.close(); // Esc's own close, its close event queued as a task
    select.value = ':archived';
    select.dispatchEvent(new Event('change', { bubbles: true })); // chosen again first
    await new Promise((r) => setTimeout(r, 50)); // the queued close event has fired
    return dialog.open ? 'open' : 'closed by the stale close event';
  })).toBe('open');
  await page.keyboard.press('Escape');
  await expect(archived(page)).toBeHidden();
  await picker(page).focus();
  await picker(page).selectOption(':archived');
  await expect(restore).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(archived(page)).toBeHidden();
  await idle(page);
  await expect(picker(page)).toHaveValue(ONE);
  await expect(page.locator('#title')).toHaveText('Multi-bot');
  await expect(picker(page).locator('option[value=":archived"]')).toHaveCount(0);
  expect(await agentBoards(request)).toContain(ONE);
});

test('archived in another tab, the open board gives way to the next; the hash and the remembered board never open it', async ({ page, request }) => {
  await setUp(request);
  await open(page, TWO);
  await mark(page, TWO, 'archive');
  await idle(page);
  await expect(picker(page)).not.toHaveValue(TWO);
  await expect(picker(page)).toHaveValue(ONE); // the last board in the picker: the one before it
  // The page remembers TWO as the last board looked at, and the hash may name it: neither opens it.
  await page.evaluate((id) => {
    for (const k of [...Object.keys(localStorage), 'vb.lastBoard']) if (k.startsWith('vb.lastBoard')) localStorage.setItem(k, id);
  }, TWO);
  await open(page);
  await expect(picker(page)).toHaveValue(ONE);
  await open(page, TWO);
  await expect(picker(page)).toHaveValue(ONE);
  await expect(page.locator('#message')).toBeHidden();
  await mark(page, TWO, 'restore');
  await idle(page);
  await expect(picker(page).locator(`option[value="${TWO}"]`)).toHaveCount(1);
  await expect(picker(page)).toHaveValue(ONE); // a restore elsewhere opens nothing here
});

test('with no board left, the page shows its empty state and the Archived list; restored, the board opens', async ({ page, request }) => {
  await setUp(request);
  const all = await agentBoards(request);
  await open(page, ONE);
  try {
    for (const b of all.filter((x) => x !== ONE)) await mark(page, b, 'archive');
    await idle(page);
    await expect(picker(page)).toHaveValue(ONE);
    await menuButton(page).click();
    await archiveRow(page).click();
    await page.locator('#confirm-ok').click();
    // No board is left to open: the page reloads into its empty state, as it boots in such a folder.
    await page.waitForFunction(() => document.querySelector('#message')?.textContent?.includes('archived'));
    await expect(page.locator('#message')).toHaveText(new RegExp(`No boards yet\\. Waiting for an agent to draw\\.[\\s\\S]*${all.length} archived: restore one from the board picker\\.`));
    await expect(picker(page).locator('option[value=":archived"]')).toHaveText(`Archived (${all.length})…`);
    await expect(page).not.toHaveURL(/#/);
    for (const theme of THEMES) {
      await setTheme(page, theme);
      await expectNoAxeViolations(page);
    }
    await picker(page).selectOption(':archived');
    await archived(page).getByRole('button', { name: 'Restore Multi-bot plan', exact: true }).click();
    await expect(archived(page)).toBeHidden();
    await page.waitForFunction(() => (window as unknown as { __vbWork?: unknown }).__vbWork !== undefined);
    await idle(page);
    await expect(picker(page)).toHaveValue(TWO);
    await expect(page.locator('#message')).toBeHidden();
  } finally {
    const shown = await agentBoards(request);
    for (const b of all.filter((x) => !shown.includes(x))) await mark(page, b, 'restore');
  }
  expect((await agentBoards(request)).sort()).toEqual([...all].sort());
});

test('with -archiveBoard: no Archive board… row and no Archived entry', async ({ page, request }) => {
  await setUp(request);
  await open(page, ONE, '-archiveBoard');
  await menuButton(page).click();
  await expect(page.getByRole('menu', { name: 'More' })).toBeVisible();
  await expect(archiveRow(page)).toHaveCount(0);
  await expect(picker(page).locator('option[value=":archived"]')).toHaveCount(0);
});

// ---- The gallery's archive section (archiveBoard flag) ----
const section = (page: Page) => page.locator('section[data-feature="archiveBoard"]');

test('gallery: the archive section shows by default, and not with -archiveBoard', async ({ page }) => {
  await page.goto('/gallery.html?flags=-archiveBoard');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  await expect(section(page).locator('.vb-archived-list')).toHaveCount(3);
  await expect(section(page).getByText('No archived boards.')).toBeVisible();
  await expect(section(page).locator('[id="archive-board"], [id="archived-dialog"]')).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`gallery: the archive section passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`archive-${theme}.png`);
  });
}
