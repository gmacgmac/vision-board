// The container finder (navigation FE_02, containerFinder flag, on by default): a toolbar dropdown
// lists every container in board order with its card count, Later always last; choosing one zooms
// to its frame and focuses its title. Later with no card is listed and greyed (it has no frame
// then); with a card it can be chosen. Zooming is no act, so it works in a past version too.
// Boards of its own, written by an agent through the API on the shared test server.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['dark', 'light'];
const region = (id: string, title: string) => ({ type: 'region', region: { id, title, mode: 'grid' } });
const card = (r: string, title: string) => ({ type: 'node', node: { region: r, kind: 'question', title } });

async function join(request: APIRequestContext): Promise<string> {
  const r = await request.post('/api/agents', { data: { label: 'Finder chat' } });
  return (await r.json() as { secret: string }).secret;
}

/** Write `items` on `board`; the seq of the last line written. */
async function write(request: APIRequestContext, secret: string, board: string, items: unknown[]): Promise<number> {
  const r = await request.post(`/api/boards/${board}/write`, { headers: { Authorization: `Bearer ${secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  const out = await r.json() as { results: { ok: boolean; seq?: number }[] };
  expect(out.results.every((x) => x.ok)).toBe(true);
  return Math.max(...out.results.map((x) => x.seq ?? 0));
}

async function open(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
}

const idle = (page: Page) => page.evaluate(() => (window as unknown as { __vbWork: { idle(): Promise<void> } }).__vbWork.idle());
const finder = (page: Page) => page.getByLabel('Containers', { exact: true });
const frame = (page: Page, id: string) => page.locator(`vb-region[data-region="${id}"]`);
const texts = (page: Page) => finder(page).locator('option').allTextContents();

/** Whether the frame is inside the stage and its centre is the stage's centre (to a few pixels). */
async function centred(page: Page, id: string): Promise<boolean> {
  const f = (await frame(page, id).boundingBox())!;
  const s = (await page.locator('#stage').boundingBox())!;
  const inside = f.x >= s.x && f.y >= s.y && f.x + f.width <= s.x + s.width && f.y + f.height <= s.y + s.height;
  return inside && Math.abs(f.x + f.width / 2 - (s.x + s.width / 2)) < 4 && Math.abs(f.y + f.height / 2 - (s.y + s.height / 2)) < 4;
}

test('the dropdown lists the containers in board order with counts, Later last and greyed while empty', async ({ page, request }) => {
  const secret = await join(request);
  await write(request, secret, 'fin-list', [
    { type: 'board', title: 'Finder board' }, region('ideas', 'Ideas'), region('plan', 'Plan'),
    card('ideas', 'First idea'), card('ideas', 'Second idea'), card('plan', 'One step'),
  ]);
  await open(page, '/?vbwork#fin-list');
  await expect.poll(() => texts(page)).toEqual(['Containers', 'Ideas · 2 items', 'Plan · 1 item', 'Later · 0 items']);
  const options = finder(page).locator('option');
  await expect(options.nth(1)).toBeEnabled();
  await expect(options.nth(3)).toBeDisabled();
  // Reachable by Tab, after the version dropdown.
  await page.locator('#version').focus();
  await page.keyboard.press('Tab');
  await expect(finder(page)).toBeFocused();
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expectNoAxeViolations(page, ['target-size']);
  }
});

test('choosing a container puts its frame in view, centred, and focuses its title; Later is chosen once it holds a card', async ({ page, request }) => {
  const secret = await join(request);
  await write(request, secret, 'fin-go', [
    { type: 'board', title: 'Finder board' }, region('ideas', 'Ideas'), region('plan', 'Plan'),
    card('ideas', 'First idea'), card('plan', 'One step'),
  ]);
  await open(page, '/?vbwork#fin-go');
  await expect(frame(page, 'plan')).toBeVisible();
  await finder(page).selectOption('plan');
  await expect.poll(() => centred(page, 'plan')).toBe(true);
  await expect(frame(page, 'plan').getByRole('heading', { name: 'Plan' })).toBeFocused();
  await expect(finder(page)).toHaveValue(''); // the dropdown is a menu: it shows its name again
  await finder(page).selectOption('ideas');
  await expect.poll(() => centred(page, 'ideas')).toBe(true);
  await expect(frame(page, 'ideas').getByRole('heading', { name: 'Ideas' })).toBeFocused();

  // Saving the first card for later moves it into the built-in Later container.
  const n = Number(await page.locator('vb-node').first().getAttribute('data-id'));
  for (const f of [{ action: 'move', n, region: 'later' }, { action: 'later', n, ver: 1 }]) {
    const r = await page.request.post('/api/boards/fin-go/act', { data: { type: 'act', ...f } });
    expect(r.status(), await r.text()).toBe(201);
  }
  await idle(page);
  await expect.poll(() => texts(page)).toEqual(['Containers', 'Ideas · 0 items', 'Plan · 1 item', 'Later · 1 item']);
  await expect(finder(page).locator('option').last()).toBeEnabled();
  await finder(page).selectOption('later');
  await expect.poll(() => centred(page, 'later')).toBe(true);
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expectNoAxeViolations(page, ['target-size']);
  }
});

test('it works in a past version, which lists that version\'s containers, and sends nothing', async ({ page, request }) => {
  const secret = await join(request);
  const first = await write(request, secret, 'fin-past', [{ type: 'board', title: 'Finder board' }, region('ideas', 'Ideas'), card('ideas', 'First idea')]);
  await open(page, '/?vbwork#fin-past');
  // A person's act ends the agent's run, so the next drawing is a version of its own.
  const ack = await page.request.post('/api/boards/fin-past/act', { data: { type: 'act', action: 'ack', n: Number(await page.locator('vb-node').first().getAttribute('data-id')), ver: 1 } });
  expect(ack.status(), await ack.text()).toBe(201);
  await write(request, secret, 'fin-past', [region('plan', 'Plan'), card('plan', 'One step')]);
  await idle(page);
  await expect.poll(() => texts(page)).toEqual(['Containers', 'Ideas · 1 item', 'Plan · 1 item', 'Later · 0 items']);
  const sent: string[] = [];
  page.on('request', (r) => { if (r.method() === 'POST') sent.push(r.url()); });
  await page.locator('#version').selectOption(String(first));
  await expect(page.locator('.vb-banner')).toBeVisible();
  await expect.poll(() => texts(page)).toEqual(['Containers', 'Ideas · 1 item', 'Later · 0 items']);
  await finder(page).selectOption('ideas');
  await expect.poll(() => centred(page, 'ideas')).toBe(true);
  await idle(page);
  expect(sent).toEqual([]);
});

test('with containerFinder off there is no dropdown', async ({ page }) => {
  await open(page, '/?vbwork&flags=-containerFinder#fin-list');
  await expect(page.locator('#board')).toBeVisible();
  await expect(finder(page)).toHaveCount(0);
});
