// The page follows the project (found-in-use FE_02): it listens to `watch_project` from the moment
// it opens, so the first board drawn into an empty project opens by itself (ruling 4), a board drawn
// later joins the picker as "new" with a chip while the open board stays (ruling 3), the picker's
// labels follow every append (ruling 2), and a reload keeps the board's zoom and position unless
// keepView is off (ruling 5). Agents write through the API with a Bearer secret, as in
// send-access.spec.ts; the empty project has its own server (EMPTY_BASE, no seed).
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { EMPTY_BASE } from './perf-server.ts';

const THEMES: Theme[] = ['dark', 'light'];
const REGION = 'ideas';

interface Agent { secret: string }

async function join(request: APIRequestContext, base: string, label: string): Promise<Agent> {
  const r = await request.post(`${base}/api/agents`, { data: { label } });
  expect(r.status(), await r.text()).toBe(201);
  return await r.json() as Agent;
}

async function write(request: APIRequestContext, base: string, a: Agent, board: string, items: unknown[]): Promise<void> {
  const r = await request.post(`${base}/api/boards/${board}/write`, { headers: { Authorization: `Bearer ${a.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  expect((await r.json() as { results: { ok: boolean }[] }).results.every((x) => x.ok)).toBe(true);
}

const card = (title: string) => ({ type: 'node', node: { region: REGION, kind: 'question', title, item: true } });
/** A new board with one container and one card. */
const drawn = (title: string) => [
  { type: 'board', title },
  { type: 'region', region: { id: REGION, title: 'Ideas', mode: 'grid' } },
  card('Which idea goes first?'),
];

const option = (page: Page, board: string) => page.locator(`#board option[value="${board}"]`);

/** The view's pan and zoom, read from the world layer's transform. */
async function viewOf(page: Page): Promise<{ x: number; y: number; k: number }> {
  const t = await page.locator('#world').evaluate((e) => (e as HTMLElement).style.transform);
  const m = /translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+)\)/.exec(t);
  expect(m, t).not.toBeNull();
  return { x: Number(m![1]), y: Number(m![2]), k: Number(m![3]) };
}

/** Open the page and wait for its first draw. */
async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
}

test('an empty project waits, then opens the first board drawn, with no reload', async ({ page, request }) => {
  await page.goto(`${EMPTY_BASE}/`);
  await expect(page.locator('#message')).toContainText('No boards yet. Waiting for an agent to draw.');
  await expect(page.locator('#message')).toContainText('npm run board');
  // A mark on the window: it survives only if the page never reloads.
  await page.evaluate(() => { (window as unknown as { vbMark: number }).vbMark = 1; });
  await write(request, EMPTY_BASE, await join(request, EMPTY_BASE, 'First chat'), 'first', drawn('The first board'));
  await expect(page.locator('#title')).toHaveText('The first board');
  await expect(page.locator('#message')).toBeHidden();
  await expect(page.locator('#cards vb-node')).toHaveCount(1);
  await expect(page.locator('#board')).toHaveValue('first');
  await expect(page.locator('#new-boards')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { vbMark?: number }).vbMark)).toBe(1);
});

test('a board drawn later joins the picker as new, with a chip, and the open board stays', async ({ page, request }) => {
  await open(page, '/?vbwork#roadmap');
  const title = await page.locator('#title').textContent();
  await write(request, '', await join(request, '', 'Later chat'), 'live-new', drawn('Drawn later'));
  await expect(option(page, 'live-new')).toHaveText(/^Drawn later · v\d+ · new$/);
  await expect(page.locator('#new-boards')).toHaveText('1 new board');
  await expect(page.locator('#board')).toHaveValue('roadmap');
  await expect(page.locator('#title')).toHaveText(title!);
  await expect(option(page, 'roadmap')).not.toContainText('new');
  // The chip passes axe in both themes; at the opening zoom only target-size is excused (N13).
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expectNoAxeViolations(page, ['target-size']);
  }
  await page.locator('#board').selectOption('live-new');
  await expect(page.locator('#title')).toHaveText('Drawn later');
  await expect(option(page, 'live-new')).toHaveText(/^Drawn later · v\d+$/);
  await expect(page.locator('#new-boards')).toHaveCount(0);
});

test('a picker label follows an append to its board', async ({ page, request }) => {
  const a = await join(request, '', 'Label chat');
  await write(request, '', a, 'live-label', drawn('Label board'));
  await open(page, '/?vbwork#roadmap');
  const label = option(page, 'live-label');
  await expect(label).toHaveText(/^Label board · v\d+$/);
  const before = Number(/v(\d+)/.exec((await label.textContent())!)![1]);
  await write(request, '', a, 'live-label', [card('And which one waits?')]);
  await expect(label).not.toHaveText(`Label board · v${before}`);
  expect(Number(/v(\d+)/.exec((await label.textContent())!)![1])).toBeGreaterThan(before);
  await expect(label).not.toContainText('new');
  await expect(page.locator('#board')).toHaveValue('roadmap');
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
