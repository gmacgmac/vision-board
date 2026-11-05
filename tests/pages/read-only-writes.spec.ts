// A ledger open read-only on the page (D-085 3; READONLY_01 step 7): the board learns it from its reads, and every
// path that would write stops cleanly, saying why (`#actions` READ_ONLY_PERSON): an answer button, a key, a note,
// a layout, the flag (which a lock lets through, but read-only does not); selecting a changed card and looking at the
// board write no seen line (seen stays in the page). Edit from another tab, as the header will press it, writes again.
// The header's own control is READONLY_UI_01's. On the worker's empty project (EMPTY_BASE), fresh for this file.
import type { APIRequestContext, Page } from '@playwright/test';
import { READ_ONLY_PERSON as REASON } from '#actions';
import { expect, test, bid } from './helpers.ts';
import { EMPTY_BASE } from './ports.ts';
import { card, idle, toast } from './board-page.ts';

const PLANS = 'plans';

async function open(page: Page): Promise<void> {
  await page.goto(`${EMPTY_BASE}/?vbwork#${PLANS}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: unknown }).__vbWork !== undefined);
  await idle(page);
  await expect(page.locator(bid('board'))).toHaveValue(PLANS);
}

let agent = '';
/** A board an agent drew: one container with a question and a decision; then a newer version of the question. */
async function setUp(request: APIRequestContext): Promise<void> {
  if (agent) return;
  agent = ((await (await request.post(`${EMPTY_BASE}/api/agents`, { data: { label: 'Plans chat' } })).json()) as { secret: string }).secret;
  await write(request, [
    { type: 'board', title: 'Plans' },
    { type: 'region', region: { id: 'ideas', title: 'Ideas', mode: 'grid' } },
    { type: 'node', node: { region: 'ideas', kind: 'question', title: 'Which idea first?' } },
    { type: 'node', node: { region: 'ideas', kind: 'decision', title: 'Ship on Friday?' } },
  ]);
}
async function write(request: APIRequestContext, items: unknown[]): Promise<void> {
  const r = await request.post(`${EMPTY_BASE}/api/boards/${PLANS}/write`, { headers: { Authorization: `Bearer ${agent}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
}

/** Edit or Stop editing as the person, through the API, as the header (or another tab) will. */
async function editing(page: Page, on: boolean): Promise<void> {
  const r = on ? await page.request.post(`${EMPTY_BASE}/api/project/edit`) : await page.request.delete(`${EMPTY_BASE}/api/project/edit`);
  expect(r.status(), await r.text()).toBe(200);
}
const head = async (page: Page) => ((await (await page.request.get(`${EMPTY_BASE}/api/boards`)).json()) as { head: number }).head;

test.afterEach(async ({ page }) => { if (agent) await editing(page, true); });

test('read-only, every press that would write says why and writes nothing; Edit, and it writes again', async ({ page, request }) => {
  await setUp(request);
  await open(page);
  await editing(page, false);
  await expect.poll(async () => (await page.request.get(`${EMPTY_BASE}/api/ledger?after=0&limit=1`)).json().then((x: { readOnly?: true }) => x.readOnly)).toBe(true);
  await page.waitForTimeout(300); // the stream's `editing` reaches the page, which reads again
  await idle(page);
  const before = await head(page);
  await card(page, 1).locator('button[data-act="ack"]').click({ force: true });
  await expect(toast(page)).toHaveText(REASON);
  await expect(card(page, 1).locator('button[data-act="ack"]')).toHaveAttribute('aria-pressed', 'false');
  await card(page, 2).focus();
  await page.keyboard.press('x');
  await expect(toast(page)).toHaveText(REASON);
  await page.keyboard.press('c');
  await expect(page.locator('vb-note-bubble')).toBeHidden(); // no note can be written
  await card(page, 1).locator('button[data-flag]').click({ force: true });
  await expect(toast(page)).toHaveText(REASON);
  await idle(page);
  expect(await head(page), 'nothing written').toBe(before);
  await editing(page, true);
  await page.waitForTimeout(300);
  await idle(page);
  await card(page, 1).locator('button[data-act="ack"]').click();
  await idle(page);
  await expect(card(page, 1).locator('button[data-act="ack"]')).toHaveAttribute('aria-pressed', 'true');
  expect(await head(page)).toBe(before + 1);
});

test('read-only, a changed card selected and the board looked at write no seen line; the tab still goes, in the page', async ({ page, request }) => {
  await setUp(request);
  await open(page);
  await write(request, [{ type: 'node', n: 2, node: { region: 'ideas', kind: 'decision', title: 'Ship on Monday?' } }]);
  await idle(page);
  await expect(card(page, 2)).toContainText('Ship on Monday?');
  await editing(page, false);
  await page.waitForTimeout(300);
  await idle(page);
  const before = await head(page);
  const tab = card(page, 2).locator('[data-tab="updates"]');
  await expect(tab).toBeVisible();
  await card(page, 2).click();
  await idle(page);
  await page.waitForTimeout(300);
  expect(await head(page), 'no seen line, no board seen').toBe(before);
  await expect(tab).toBeHidden(); // seen, in the page's memory
  await expect(toast(page)).not.toHaveText(REASON); // nothing was tried and refused
});
