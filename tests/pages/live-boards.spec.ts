// The page follows the project (found-in-use FE_02): it listens to `watch_project` from the moment
// it opens, so the first board drawn into an empty project opens by itself (ruling 4), a board drawn
// later joins the picker as "new" with a chip while the open board stays (ruling 3), the picker's
// labels follow every append (ruling 2; titles only since navigation FE_01, the versions are the
// version dropdown's, versions.spec.ts), and a reload keeps the board's zoom and position unless
// keepView is off (ruling 5). The marks come from the conditions table and the person's board seen
// (awareness tables FE_01): " · changed" when an agent wrote on a board since the person last looked,
// after a reload and in another browser too, never for the person's own acts; the "agent drew" toast
// reads `board.drawn`. Agents write through the API with a Bearer secret, as in
// send-access.spec.ts; the empty project has its own server (EMPTY_BASE, no seed).
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test, bid } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { EMPTY_BASE } from './ports.ts';
import { idle, openDrawn as open } from './board-page.ts';
import { joinAgent } from './agent-board.ts';
import type { Agent } from './agent-board.ts';

const THEMES: Theme[] = ['dark', 'light'];
const REGION = 'ideas';


async function write(request: APIRequestContext, base: string, a: Agent, board: string, items: unknown[]): Promise<void> {
  const r = await request.post(`${base}/api/boards/${board}/write`, { headers: { Authorization: `Bearer ${a.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  expect((await r.json() as { results: { ok: boolean }[] }).results.every((x) => x.ok)).toBe(true);
}

const card = (title: string) => ({ type: 'node', node: { region: REGION, kind: 'question', title } });
/** A new board with one container and one card. */
const drawn = (title: string) => [
  { type: 'board', title },
  { type: 'region', region: { id: REGION, title: 'Ideas', mode: 'grid' } },
  card('Which idea goes first?'),
];

const option = (page: Page, board: string) => page.locator(`${bid('board')} option[value="${board}"]`);
const chip = (page: Page) => page.locator(bid('boards-updated'));

/** The person has looked at every board (a board seen at each one's head), so no mark is left over
 * from the tests before; `page` must have loaded once, for the person cookie. */
async function seeAll(page: Page): Promise<void> {
  const { boards } = await (await page.request.get('/api/boards')).json() as { boards: { board: string; seq: number }[] };
  for (const b of boards) {
    const r = await page.request.post(`/api/boards/${b.board}/seen`, { data: { board: b.board, head: b.seq } });
    expect(r.status(), await r.text()).toBe(201);
  }
  await expect(chip(page)).toHaveCount(0);
}

/** The view's pan and zoom, read from the world layer's transform. */
async function viewOf(page: Page): Promise<{ x: number; y: number; k: number }> {
  const t = await page.locator('.vb-world').evaluate((e) => (e as HTMLElement).style.transform);
  const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/.exec(t);
  expect(m, t).not.toBeNull();
  return { x: Number(m![1]), y: Number(m![2]), k: Number(m![3]) };
}

/** The number of the first item on `board`, for a person act the test sends itself. */
async function firstItem(page: Page, board: string): Promise<number> {
  const b = await (await page.request.get(`/api/boards/${board}`)).json() as { view: { nodes: { n?: number }[] } };
  return b.view.nodes.find((x) => x.n !== undefined)!.n!;
}

test('an empty project waits, then opens the first board drawn, with no reload', async ({ page, request }) => {
  await page.goto(`${EMPTY_BASE}/`);
  await expect(page.locator('.vb-message')).toContainText('No boards yet. Waiting for an agent to draw.');
  await expect(page.locator('.vb-message')).toContainText('npm run board');
  // A mark on the window: it survives only if the page never reloads.
  await page.evaluate(() => { (window as unknown as { vbMark: number }).vbMark = 1; });
  await write(request, EMPTY_BASE, await joinAgent(request, 'First chat', EMPTY_BASE), 'first', drawn('The first board'));
  await expect(page.locator(bid('title'))).toHaveText('The first board');
  await expect(page.locator('.vb-message')).toBeHidden();
  await expect(page.locator('.vb-cards vb-node')).toHaveCount(1);
  await expect(page.locator(bid('board'))).toHaveValue('first');
  await expect(chip(page)).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { vbMark?: number }).vbMark)).toBe(1);
});

test('a board drawn later joins the picker as new, with a chip, and the open board stays', async ({ page, request }) => {
  await open(page, '/?vbwork#roadmap');
  await seeAll(page);
  const title = await page.locator(bid('title')).textContent();
  await write(request, '', await joinAgent(request, 'Later chat'), 'live-new', drawn('Drawn later'));
  await expect(option(page, 'live-new')).toHaveText('Drawn later · new');
  await expect(chip(page)).toHaveText('1 board updated');
  await expect(page.locator(bid('board'))).toHaveValue('roadmap');
  await expect(page.locator(bid('title'))).toHaveText(title!);
  await expect(option(page, 'roadmap')).not.toContainText('new');
  // The chip passes axe in both themes, with nothing excused (the controls are not drawn zoomed out, N13).
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
  }
  await page.locator(bid('board')).selectOption('live-new');
  await expect(page.locator(bid('title'))).toHaveText('Drawn later');
  await expect(option(page, 'live-new')).toHaveText('Drawn later');
  await expect(chip(page)).toHaveCount(0);
});

test('a picker label is its board\'s title, and an append marks it changed', async ({ page, request }) => {
  const a = await joinAgent(request, 'Label chat');
  await write(request, '', a, 'live-label', drawn('Label board'));
  await open(page, '/?vbwork#roadmap');
  await seeAll(page);
  const label = option(page, 'live-label');
  await expect(label).toHaveText('Label board');
  await write(request, '', a, 'live-label', [card('And which one waits?')]);
  await expect(label).toHaveText('Label board · changed');
  await expect(page.locator(bid('board'))).toHaveValue('roadmap');
});

test('zoom and pan survive a reload; with keepView off the board fits again', async ({ page }) => {
  await open(page, '/?vbwork#roadmap');
  const fitted = await viewOf(page);
  await page.mouse.move(700, 500);
  await page.mouse.wheel(120, 80);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  const moved = await viewOf(page);
  expect(moved).not.toEqual(fitted);
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
  expect(await viewOf(page)).toEqual(moved);
  await open(page, '/?vbwork&flags=-keepView#roadmap');
  expect(await viewOf(page)).toEqual(fitted);
});

test('a board an agent changed is marked "changed", after a reload and in another browser; opening it clears the mark', async ({ page, request, browser }) => {
  const a = await joinAgent(request, 'Other chat');
  await write(request, '', a, 'live-changed', drawn('Changed elsewhere'));
  await open(page, '/?vbwork#roadmap');
  await seeAll(page);
  const mark = option(page, 'live-changed');
  await expect(mark).toHaveText('Changed elsewhere');
  // The person's own act on it is not news.
  const ack = await page.request.post('/api/boards/live-changed/act', { data: { type: 'act', action: 'ack', n: await firstItem(page, 'live-changed'), ver: 1 } });
  expect(ack.status(), await ack.text()).toBe(201);
  await idle(page);
  await expect(mark).toHaveText('Changed elsewhere');
  // An agent's line is.
  await write(request, '', a, 'live-changed', [card('And this one?')]);
  await expect(mark).toHaveText('Changed elsewhere · changed');
  await expect(chip(page)).toHaveText('1 board updated');
  await page.reload();
  await expect(mark).toHaveText('Changed elsewhere · changed');
  const other = await browser.newPage();
  await other.goto(`${new URL(page.url()).origin}/#roadmap`);
  await expect(option(other, 'live-changed')).toHaveText(/ · changed$/);
  await other.close();
  // The chip passes axe in both themes, with nothing excused (the controls are not drawn zoomed out, N13).
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
  }
  await page.locator(bid('board')).selectOption('live-changed');
  await expect(page.locator(bid('title'))).toHaveText('Changed elsewhere');
  await page.locator(bid('board')).selectOption('roadmap');
  await expect(mark).toHaveText('Changed elsewhere');
  await page.reload();
  await expect(mark).toHaveText('Changed elsewhere');
});

test('the agent drawing on the open board shows the toast; the person acting does not', async ({ page, request }) => {
  const a = await joinAgent(request, 'Toast chat');
  await write(request, '', a, 'live-toast', drawn('Toast board'));
  await open(page, '/?vbwork#live-toast');
  await expect(page.locator('#toast')).toBeHidden();
  await write(request, '', a, 'live-toast', [card('A second question')]);
  await expect(page.locator('#toast')).toHaveText(/^The agent drew v\d+$/);
  await expect(page.locator('#toast')).toBeHidden({ timeout: 5000 });
  const ack = await page.request.post('/api/boards/live-toast/act', { data: { type: 'act', action: 'ack', n: await firstItem(page, 'live-toast'), ver: 1 } });
  expect(ack.status(), await ack.text()).toBe(201);
  await idle(page);
  await expect(page.locator('#toast')).toBeHidden();
});

// Bug found in VERIFY_01 (awareness tables, 2026-10-07): a board opened while the page had no room
// (a hidden pane or a background tab) fitted to the minimum zoom off to one side, and keepView then
// kept that view, so the board stayed out of sight after the window gained room and after reloads.
test('a board opened with no room fits once the window has room, and keeps no cramped view', async ({ page }) => {
  await page.setViewportSize({ width: 40, height: 40 });
  await page.goto('/?vbwork#roadmap');
  await page.waitForTimeout(600);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await expect.poll(async () => (await viewOf(page)).k).toBeGreaterThan(0.3);
  const fitted = await viewOf(page);
  await page.reload();
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
  expect((await viewOf(page)).k).toBeCloseTo(fitted.k, 3);
});
