// New board and Rename board from the picker (navigation BE_01, boardEdit flag, on by default;
// api.md 90, D-034). "New board…" opens a small dialog; Create writes the person's `board` line and
// the new board opens, its id made from the title. An agent's write on it then needs the board
// granted. "Rename board…" opens the same dialog with the open board's words, and the picker and
// title follow the rename live. In a past version both entries are off. The dialog passes axe in
// both themes. It runs on the empty project's server (EMPTY_BASE), which live-boards.spec.ts has
// already drawn on, so the boards it makes never reach the shared server's screenshots.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { EMPTY_BASE } from './perf-server.ts';

const THEMES: Theme[] = ['dark', 'light'];

interface Agent { secret: string }
interface Result { ok: boolean; problem?: { type: string; board?: string } }

async function join(request: APIRequestContext, label: string): Promise<Agent> {
  const r = await request.post(`${EMPTY_BASE}/api/agents`, { data: { label } });
  expect(r.status(), await r.text()).toBe(201);
  return await r.json() as Agent;
}

/** Write `items` on `board` as `a`; each item's result. */
async function write(request: APIRequestContext, a: Agent, board: string, items: unknown[]): Promise<Result[]> {
  const r = await request.post(`${EMPTY_BASE}/api/boards/${board}/write`, { headers: { Authorization: `Bearer ${a.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  return (await r.json() as { results: Result[] }).results;
}

/** The page has read every line written so far and drawn it. */
const idle = (page: Page) => page.evaluate(() => (window as unknown as { __vbWork: { idle(): Promise<void> } }).__vbWork.idle());

/** Open the page and wait until it has read the ledger (the project may have no board yet). */
async function open(page: Page): Promise<void> {
  await page.goto(`${EMPTY_BASE}/?vbwork`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: unknown }).__vbWork !== undefined);
  await idle(page);
}

const picker = (page: Page) => page.locator('#board');
const dialog = (page: Page) => page.locator('#board-dialog');
const region = { type: 'region', region: { id: 'roles', title: 'Roles', mode: 'grid' } };

test('New board makes a board the person owns and opens it; an agent then needs it granted', async ({ page, request }) => {
  await open(page);
  await picker(page).focus(); // as a click or Tab would
  await picker(page).selectOption(':new-board');
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole('heading')).toHaveText('New board');
  await expect(page.locator('#board-title')).toBeFocused();
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
  }
  await page.locator('#board-title').fill('Hiring plan');
  await page.locator('#board-summary').fill('Who we hire next, and when.');
  await page.locator('#board-save').click();
  await expect(dialog(page)).toBeHidden();
  await idle(page);
  await expect(picker(page)).toHaveValue('hiring-plan');
  await expect(picker(page).locator('option:checked')).toHaveText('Hiring plan');
  await expect(page.locator('#title')).toHaveText('Hiring plan');
  await expect(picker(page)).toBeFocused(); // the dialog gives focus back to the picker

  // D-034: a board the person made has no agent creator, so an agent asks for it first.
  const agent = await join(request, 'Hiring chat');
  const refused = await write(request, agent, 'hiring-plan', [region]);
  expect([refused[0]!.problem?.type.split('/').pop(), refused[0]!.problem?.board]).toEqual(['needs-grant', 'hiring-plan']);
  const own = await write(request, agent, 'hiring-plan', [{ type: 'board', title: 'Mine' }]);
  expect(own[0]!.problem?.type.split('/').pop()).toBe('forbidden');
});

test('Rename board opens with the board\'s words; the picker and title follow; Cancel and Esc change nothing', async ({ page }) => {
  await open(page);
  await picker(page).selectOption('hiring-plan');
  await idle(page);
  await picker(page).selectOption(':rename-board');
  await expect(dialog(page).getByRole('heading')).toHaveText('Rename board');
  await expect(page.locator('#board-title')).toHaveValue('Hiring plan');
  await expect(page.locator('#board-summary')).toHaveValue('Who we hire next, and when.');
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
  }
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await picker(page).selectOption(':rename-board');
  await page.locator('#board-title').fill('Hiring 2027');
  await page.locator('#board-cancel').click();
  await expect(dialog(page)).toBeHidden();
  await expect(picker(page).locator('option:checked')).toHaveText('Hiring plan');

  await picker(page).selectOption(':rename-board');
  await page.locator('#board-title').fill('Hiring 2027');
  await page.locator('#board-title').press('Enter');
  await expect(dialog(page)).toBeHidden();
  await idle(page);
  await expect(picker(page)).toHaveValue('hiring-plan');
  await expect(picker(page).locator('option[value="hiring-plan"]')).toHaveText('Hiring 2027');
  await expect(page.locator('#title')).toHaveText('Hiring 2027');
});

// A dialog closed without saving leaves nothing behind: New board always opens empty, Rename always
// with the board's current title and summary (verification fix). Backdrop click closes it too.
const CLOSE = {
  Cancel: (page: Page) => page.locator('#board-cancel').click(),
  Esc: (page: Page) => page.keyboard.press('Escape'),
  'a backdrop click': (page: Page) => page.mouse.click(4, 400),
};
for (const [how, close] of Object.entries(CLOSE)) {
  test(`after ${how} without saving, New board opens empty and Rename opens with the board's words`, async ({ page }) => {
    await open(page);
    await picker(page).selectOption('hiring-plan');
    await idle(page);
    await picker(page).selectOption(':new-board');
    await expect(dialog(page)).toBeVisible();
    await page.locator('#board-title').fill('Typed and abandoned');
    await page.locator('#board-summary').fill('Never saved.');
    await close(page);
    await expect(dialog(page)).toBeHidden();
    await picker(page).selectOption(':new-board');
    await expect(dialog(page)).toBeVisible();
    await expect(page.locator('#board-title')).toHaveValue('');
    await expect(page.locator('#board-summary')).toHaveValue('');
    await page.locator('#board-title').fill('Typed again');
    await close(page);
    await expect(dialog(page)).toBeHidden();

    await picker(page).selectOption(':rename-board');
    await expect(page.locator('#board-title')).toHaveValue('Hiring 2027');
    await expect(page.locator('#board-summary')).toHaveValue('Who we hire next, and when.');
    await page.locator('#board-title').fill('Typed over the title');
    await close(page);
    await expect(dialog(page)).toBeHidden();
    await picker(page).selectOption(':rename-board');
    await expect(page.locator('#board-title')).toHaveValue('Hiring 2027');
    await close(page);
    await expect(dialog(page)).toBeHidden();
    await picker(page).selectOption(':new-board');
    await expect(page.locator('#board-title')).toHaveValue('');
    await close(page);
    await expect(dialog(page)).toBeHidden();
  });
}

// Words that reached the fields without an input event (autofill, a form-filling tool, an input
// method) are not in the dialog's state, so setting the state alone would leave them showing.
test('words put in the fields without an input event are gone when New board opens again', async ({ page }) => {
  await open(page);
  await picker(page).selectOption(':new-board');
  await page.locator('#board-title').evaluate((e: HTMLInputElement) => { e.value = 'Autofilled'; });
  await page.locator('#board-summary').evaluate((e: HTMLTextAreaElement) => { e.value = 'Also autofilled'; });
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await picker(page).selectOption(':new-board');
  await expect(page.locator('#board-title')).toHaveValue('');
  await expect(page.locator('#board-summary')).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
});

test('in a past version New board and Rename board are off', async ({ page, request }) => {
  await open(page);
  await picker(page).selectOption('hiring-plan');
  await idle(page);
  // Two runs of the agent's drawing, so the board has a past version: grant the board, draw, then
  // a person's rename ends the run before the next one.
  const agent = await join(request, 'Planning chat');
  const asked = await request.post(`${EMPTY_BASE}/api/grants`, { headers: { Authorization: `Bearer ${agent.secret}` }, data: { board: 'hiring-plan', reason: 'Drawing the roles.' } });
  expect(asked.status(), await asked.text()).toBe(201);
  const grant = await page.request.post(`${EMPTY_BASE}/api/boards/hiring-plan/act`, { data: { type: 'act', action: 'grant', request: (await asked.json() as { request: number }).request } });
  expect(grant.status(), await grant.text()).toBe(201);
  expect((await write(request, agent, 'hiring-plan', [region])).every((x) => x.ok)).toBe(true);
  const renamed = await page.request.put(`${EMPTY_BASE}/api/boards/hiring-plan`, { data: { title: 'Hiring 2027' } });
  expect(renamed.status(), await renamed.text()).toBe(200);
  const card = { type: 'node', node: { region: 'roles', kind: 'question', title: 'Which role first?' } };
  expect((await write(request, agent, 'hiring-plan', [card])).every((x) => x.ok)).toBe(true);
  await idle(page);
  const past = page.locator('#version option').nth(1);
  await page.locator('#version').selectOption(await past.getAttribute('value'));
  await expect(page.locator('.vb-banner')).toBeVisible();
  for (const id of [':new-board', ':rename-board']) await expect(picker(page).locator(`option[value="${id}"]`)).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('.vb-banner')).toBeHidden();
  for (const id of [':new-board', ':rename-board']) await expect(picker(page).locator(`option[value="${id}"]`)).toBeEnabled();
});
