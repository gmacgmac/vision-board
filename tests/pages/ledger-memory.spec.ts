// The page's memory per folder and ledger (M52, PLAN decisions 4 and 11; VERIFY_01 F15; point 418): a board's zoom
// and the proposals notice hidden are kept in this browser (shell/kept.ts `pageStore`) under keys of the open folder's
// and ledger's own, `main` too, so two ledgers' or two folders' boards of the same id never share them; a value under
// a key from before (`vb.view.<board>`, `vb.proposals-hidden`) is read once by `main` of the folder open and kept under
// its key from then on, so nothing set before is lost. Runs on the folder server with two ledgers (folder-server.ts
// `ledgers`): `start`'s `main` and `ui`, and `other` (opened once, so moved into its `main/`), each get a board `plan`
// with one card and a proposal on it.
import type { APIRequestContext, Page } from '@playwright/test';
import { ledgerFolder } from '#format';
import { scale, world } from './board-page.ts';
import type { FolderServer } from './folder-server.ts';
import { startFolderServer } from './folder-server.ts';
import { expect, test } from './helpers.ts';

test.describe.configure({ mode: 'serial' });

let srv: FolderServer;
const BOARD = 'plan';

/** Ledger `ledger` of `folder` open, with board `plan`: one card titled `title`, and a proposal on it. */
async function drawPlan(request: APIRequestContext, folder: string, ledger: string, title: string) {
  await srv.open(folder, false, ledger);
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
  await drawPlan(request, srv.other, 'main', 'Other plan card');
  await drawPlan(request, srv.start, 'ui', 'UI plan card');
  await drawPlan(request, srv.start, 'main', 'Main plan card'); // start's main open again, as every test leaves it
});
test.afterAll(async () => { await srv.close(); });

/** Ledger `ledger` (of `start`, or of `folder`) open, and the page on its board `plan`, drawn and settled (the same tab:
 *  its sessionStorage kept). */
async function openPlan(page: Page, ledger: string, title: string, folder = srv.start) {
  await srv.open(folder, false, ledger);
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
  // main's key carries its folder.
  await expect.poll(() => stored(page, 'sessionStorage')).toEqual({ [`vb.view.${BOARD}:${srv.start}`]: expect.any(String) });
  await openPlan(page, 'ui', 'UI plan card');
  expect(await world(page), 'ui/plan fits: main\'s zoom is not its').not.toEqual(zoomed);
  await page.getByRole('button', { name: 'Zoom out' }).click();
  const uiView = await world(page);
  await expect.poll(() => stored(page, 'sessionStorage')).toEqual({
    [`vb.view.${BOARD}:${srv.start}`]: expect.any(String), [`vb.view.${BOARD}:${ledgerFolder(srv.start, 'ui')}`]: expect.any(String),
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
  expect(await stored(page, 'localStorage')).toMatchObject({ [`vb.proposals-hidden:${srv.start}`]: '1' });
  await openPlan(page, 'ui', 'UI plan card');
  await expect(hide(page)).toBeVisible();
  await expect(pill(page)).toHaveCount(0);
  await openPlan(page, 'main', 'Main plan card');
  await expect(pill(page)).toBeVisible();
  await srv.open(srv.start, false, 'main');
});

test('main/plan of two folders: each keeps its own zoom and its own proposals notice hidden (point 418)', async ({ page }) => {
  await openPlan(page, 'main', 'Main plan card');
  await page.getByRole('button', { name: 'Zoom in' }).click();
  const startView = await world(page);
  await hide(page).click();
  await expect.poll(() => stored(page, 'sessionStorage')).toMatchObject({ [`vb.view.${BOARD}:${srv.start}`]: expect.any(String) });
  await openPlan(page, 'main', 'Other plan card', srv.other);
  expect(await world(page), 'other/main/plan fits: start\'s zoom is not its').not.toEqual(startView);
  await expect(hide(page)).toBeVisible();
  await page.getByRole('button', { name: 'Zoom out' }).click();
  const otherView = await world(page);
  await expect.poll(() => stored(page, 'sessionStorage')).toMatchObject({ [`vb.view.${BOARD}:${srv.other}`]: expect.any(String) });
  await openPlan(page, 'main', 'Main plan card');
  expect(await world(page)).toEqual(startView);
  await expect(pill(page)).toBeVisible();
  await openPlan(page, 'main', 'Other plan card', srv.other);
  expect(await world(page)).toEqual(otherView);
  await expect(hide(page)).toBeVisible();
  await srv.open(srv.start, false, 'main');
});

test('a value kept before (the old keys) is seen once, by main of the folder open, and kept under its key; nothing lost', async ({ page }) => {
  // This browser holds only what a page from before kept (set on the origin, on a page that reads none of it).
  await page.goto(`${srv.base}/api/boards`);
  const before = JSON.stringify({ x: 40, y: 30, k: 1.5 });
  await page.evaluate((v) => { sessionStorage.setItem('vb.view.plan', v); localStorage.setItem('vb.proposals-hidden', '1'); }, before);
  await openPlan(page, 'main', 'Other plan card', srv.other);
  expect(await scale(page)).toBeCloseTo(1.5);
  await expect(pill(page)).toBeVisible();
  expect(await stored(page, 'sessionStorage')).toEqual({ [`vb.view.${BOARD}:${srv.other}`]: before });
  const local = await stored(page, 'localStorage');
  expect(local).toMatchObject({ [`vb.proposals-hidden:${srv.other}`]: '1' });
  expect(local).not.toHaveProperty(['vb.proposals-hidden']);
  // Read once: start's main, opened after, does not see it; other's main keeps it under its own key.
  await openPlan(page, 'main', 'Main plan card');
  expect(await scale(page)).not.toBeCloseTo(1.5);
  await expect(hide(page)).toBeVisible();
  await openPlan(page, 'main', 'Other plan card', srv.other);
  expect(await scale(page)).toBeCloseTo(1.5);
  await expect(pill(page)).toBeVisible();
  await srv.open(srv.start, false, 'main');
});
