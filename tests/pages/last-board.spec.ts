// The last board (page-polish ruling B, board/boards/start-board.ts): the board a viewer last looked at is
// kept in this browser (localStorage `vb.lastBoard`, board/kept.ts); opening the page with no board
// in its hash opens it again if it still exists, and a board in the hash always wins.
// Each test draws its own boards through the API, as an agent would.
import type { APIRequestContext, Page } from '@playwright/test';
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
  expect(await page.evaluate(() => localStorage.getItem('vb.lastBoard'))).toBe(b);
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
  expect(await page.evaluate(() => localStorage.getItem('vb.lastBoard')), 'the board opened is now the last').toBe(a);
});

test('a last board that no longer exists opens a board that does', async ({ page, request }) => {
  const a = await draw(request, 'Board A card');
  await load(page, `/#${a}`);
  await showing(page, a, 'Board A card');
  await page.evaluate(() => localStorage.setItem('vb.lastBoard', 'no-such-board'));
  await load(page, '/');
  await expect(page.locator('vb-node').first()).toBeVisible();
  expect(await page.evaluate(() => location.hash.slice(1))).not.toBe('no-such-board');
});
