// The page's memory per folder and ledger (M52, PLAN decision 4; VERIFY_01 F15): a board's zoom and the proposals
// notice hidden are kept in this browser (shell/kept.ts `pageStore`) under keys of the open ledger's own, so two
// ledgers' boards of the same id never share them; `main` keeps the keys it always had (`vb.view.<board>`,
// `vb.proposals-hidden`), so nothing set before is lost. Runs on the folder server with two ledgers
// (folder-server.ts `ledgers`), where each ledger gets a board `plan` with one card and a proposal on it.
import type { APIRequestContext, Page } from '@playwright/test';
import { ledgerFolder } from '#format';
import { world } from './board-page.ts';
import type { FolderServer } from './folder-server.ts';
import { startFolderServer } from './folder-server.ts';
import { expect, test } from './helpers.ts';

test.describe.configure({ mode: 'serial' });

let srv: FolderServer;
const BOARD = 'plan';

/** Ledger `ledger` of `start` open, with board `plan`: one card titled `title`, and a proposal on it. */
async function drawPlan(request: APIRequestContext, ledger: string, title: string) {
  await srv.open(srv.start, false, ledger);
  const r = await request.post(`${srv.base}/api/agents`, { data: { label: 'Memory chat' } });
  expect(r.status(), await r.text()).toBe(201);
  const { secret } = await r.json() as { secret: string };
  const write = async (items: object[]) => {
    const w = await request.post(`${srv.base}/api/boards/${BOARD}/write`, { headers: { Authorization: `Bearer ${secret}` }, data: { items } });
    expect(w.status(), await w.text()).toBe(200);
    return (await w.json() as { results: { n?: number }[] }).results;
  };
  const n = (await write([{ type: 'board', title: `${title} board` }, { type: 'region', region: { id: 'p', title: 'Plan', mode: 'grid' } },
    { type: 'node', node: { region: 'p', kind: 'question', title } }]))[2]!.n!;
  await write([{ type: 'propose', n, ver: 1, action: 'cross', reason: 'Said no on the call', source: 'Email pasted in chat' }]);
}

test.beforeAll(async ({ request }) => {
  srv = await startFolderServer({ ledgers: true });
  await drawPlan(request, 'ui', 'UI plan card');
  await drawPlan(request, 'main', 'Main plan card'); // main open again, as every test leaves it
});
test.afterAll(async () => { await srv.close(); });

/** Ledger `ledger` open, and the page on its board `plan`, drawn and settled (the same tab: its sessionStorage kept). */
async function openPlan(page: Page, ledger: string, title: string) {
  await srv.open(srv.start, false, ledger);
  await page.setViewportSize({ width: 1470, height: 900 });
  await page.goto('about:blank');
  await page.goto(`${srv.base}/?vbwork#${BOARD}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
  await page.evaluate(() => (window as unknown as { __vbWork: { idle(): Promise<void> } }).__vbWork.idle());
  await expect(page.locator('vb-node .vb-node-title')).toHaveText([title]);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
}
const stored = (page: Page, area: 'sessionStorage' | 'localStorage') =>
  page.evaluate((a) => Object.fromEntries(Object.entries(window[a]).filter(([k]) => k.startsWith('vb.') && !k.startsWith('vb.lastBoard'))), area);
const notice = (page: Page) => page.locator('.vb-proposals');
const hide = (page: Page) => notice(page).getByRole('button', { name: 'Hide the proposals notice' });
const pill = (page: Page) => notice(page).locator('.vb-proposals-pill');

test('a board\'s zoom is its ledger\'s own: set on main/plan, it is not on ui/plan, and each comes back to its own', async ({ page }) => {
  await openPlan(page, 'main', 'Main plan card');
  const fitted = await world(page);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  const zoomed = await world(page);
  expect(zoomed).not.toEqual(fitted);
  // main keeps the key it always had.
  await expect.poll(() => stored(page, 'sessionStorage')).toEqual({ [`vb.view.${BOARD}`]: expect.any(String) });
  await openPlan(page, 'ui', 'UI plan card');
  expect(await world(page), 'ui/plan fits: main\'s zoom is not its').not.toEqual(zoomed);
  await page.getByRole('button', { name: 'Zoom out' }).click();
  const uiView = await world(page);
  await expect.poll(() => stored(page, 'sessionStorage')).toEqual({
    [`vb.view.${BOARD}`]: expect.any(String), [`vb.view.${BOARD}:${ledgerFolder(srv.start, 'ui')}`]: expect.any(String),
  });
  await openPlan(page, 'main', 'Main plan card');
  expect(await world(page)).toEqual(zoomed);
  await openPlan(page, 'ui', 'UI plan card');
  expect(await world(page)).toEqual(uiView);
  await srv.open(srv.start, false, 'main');
});

test('the proposals notice hidden on main/plan still shows on ui/plan, and stays hidden on main', async ({ page }) => {
  await openPlan(page, 'main', 'Main plan card');
  await hide(page).click();
  await expect(pill(page)).toBeVisible();
  expect(await stored(page, 'localStorage')).toMatchObject({ 'vb.proposals-hidden': '1' });
  await openPlan(page, 'ui', 'UI plan card');
  await expect(hide(page)).toBeVisible();
  await expect(pill(page)).toHaveCount(0);
  await openPlan(page, 'main', 'Main plan card');
  await expect(pill(page)).toBeVisible();
  await srv.open(srv.start, false, 'main');
});
