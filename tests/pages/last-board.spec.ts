// The last board (page-polish ruling B, board/boards/start-board.ts): the board a viewer last looked at is
// kept in this browser (localStorage, per folder and ledger: `vb.lastBoard:<folder>`, shell/kept.ts `pageStore`);
// opening the page with no board in its hash opens it again if it still exists, and a board in the hash always wins.
// Another folder never opens on it, even with a board of the same id; one kept before folders (`vb.lastBoard`) is
// read once, by the folder open, and kept under its key (PLAN decision 11). Each test draws its own boards through
// the API, as an agent would.
import type { APIRequestContext, Page } from '@playwright/test';
import { startFolderServer } from './folder-server.ts';
import { expect, test } from './helpers.ts';

let boards = 0;

/** A board of its own with one card titled `title`, drawn by a new agent. */
async function draw(request: APIRequestContext, title: string): Promise<string> {
  const r = await request.post('/api/agents', { data: { label: 'Last board chat' } });
  const secret = (await r.json() as { secret: string }).secret;
  const board = `last-${Date.now()}-${(boards += 1)}`;
  const items = [
    { type: 'board', title },
    { type: 'region', region: { id: 'r', title: 'Ideas', mode: 'grid' } },
    { type: 'node', node: { region: 'r', kind: 'question', title } },
  ];
  const w = await request.post(`/api/boards/${board}/write`, { headers: { Authorization: `Bearer ${secret}` }, data: { items } });
  expect(w.status(), await w.text()).toBe(200);
  return board;
}

/** Load the page afresh at `path` (a blank page first, so a hash-only change is a real load). */
async function load(page: Page, path: string): Promise<void> {
  await page.goto('about:blank');
  await page.goto(path);
}

/** The last board kept in this browser, by key: the worker's board has one folder open. */
const lastKept = (page: Page) => page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('vb.lastBoard'))));
/** The open folder's own key (one folder in these tests). */
async function folderKey(page: Page): Promise<string> {
  const keys = Object.keys(await lastKept(page)).filter((k) => k.startsWith('vb.lastBoard:'));
  expect(keys).toHaveLength(1);
  return keys[0]!;
}

async function showing(page: Page, board: string, title: string): Promise<void> {
  await expect.poll(() => page.evaluate(() => decodeURIComponent(location.hash.slice(1)))).toBe(board);
  await expect(page.locator('vb-node .vb-node-title')).toHaveText([title]);
}

test('with no board in the hash, the page reopens the board last looked at, after a reload too', async ({ page, request }) => {
  const a = await draw(request, 'Board A card');
  const b = await draw(request, 'Board B card');
  await load(page, `/#${a}`);
  await showing(page, a, 'Board A card');
  await load(page, `/#${b}`);
  await showing(page, b, 'Board B card');
  expect(await lastKept(page)).toEqual({ [await folderKey(page)]: b });
  await load(page, '/');
  await showing(page, b, 'Board B card');
  await page.evaluate(() => history.replaceState(null, '', location.pathname));
  await page.reload();
  await showing(page, b, 'Board B card');
});

test('a board in the hash wins over the one last looked at', async ({ page, request }) => {
  const a = await draw(request, 'Board A card');
  const b = await draw(request, 'Board B card');
  await load(page, `/#${b}`);
  await showing(page, b, 'Board B card');
  await load(page, `/#${a}`);
  await showing(page, a, 'Board A card');
  expect(await lastKept(page), 'the board opened is now the last').toEqual({ [await folderKey(page)]: a });
});

test('a last board that no longer exists opens a board that does', async ({ page, request }) => {
  const a = await draw(request, 'Board A card');
  await load(page, `/#${a}`);
  await showing(page, a, 'Board A card');
  const key = await folderKey(page);
  await page.evaluate((k) => localStorage.setItem(k, 'no-such-board'), key);
  await load(page, '/');
  await expect(page.locator('vb-node').first()).toBeVisible();
  expect(await page.evaluate(() => location.hash.slice(1))).not.toBe('no-such-board');
});

test('one kept before folders is read once, by the folder open, then kept under its key', async ({ page, request }) => {
  const a = await draw(request, 'Board A card');
  await page.goto('/api/boards'); // the origin, on a page that reads nothing kept
  await page.evaluate((id) => localStorage.setItem('vb.lastBoard', id), a);
  await load(page, '/');
  await showing(page, a, 'Board A card');
  expect(await lastKept(page)).toEqual({ [await folderKey(page)]: a });
});

// Folder A's last board is `plan`; folder B has a board `plan` too, and never opens on A's (FE_02-R3).
test('another folder never opens on this folder\'s last board, even with a board of the same id', async ({ page, request }) => {
  const srv = await startFolderServer();
  try {
    for (const [dir, title] of [[srv.start, 'Start plan card'], [srv.other, 'Other plan card']] as const) {
      await srv.open(dir);
      const r = await request.post(`${srv.base}/api/agents`, { data: { label: 'Last board chat' } }); // an agent: no person cookie
      const secret = (await r.json() as { secret: string }).secret;
      const items = [{ type: 'board', title }, { type: 'region', region: { id: 'r', title: 'Ideas', mode: 'grid' } }, { type: 'node', node: { region: 'r', kind: 'question', title } }];
      const w = await request.post(`${srv.base}/api/boards/plan/write`, { headers: { Authorization: `Bearer ${secret}` }, data: { items } });
      expect(w.status(), await w.text()).toBe(200);
    }
    await srv.open(srv.start);
    await load(page, `${srv.base}/#plan`);
    await showing(page, 'plan', 'Start plan card');
    await srv.open(srv.other); // the page reloads onto it, with no board in its hash
    await expect(page.locator('vb-node .vb-node-title')).toHaveText(['Other card'], { timeout: 10_000 });
    await load(page, `${srv.base}/`);
    await expect(page.locator('vb-node .vb-node-title')).toHaveText(['Other card']);
    await srv.open(srv.start);
    await load(page, `${srv.base}/`);
    await showing(page, 'plan', 'Start plan card');
  } finally {
    await page.goto('about:blank'); // the live stream closed before its server
    await srv.close();
  }
});
