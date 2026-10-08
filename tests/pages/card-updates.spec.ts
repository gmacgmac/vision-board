// Changed cards and seen on the page (proposals-seen-parking FE_02, D-018, api.md 94), behind the
// cardUpdates flag (rule 12, on by default): the "N updates" tab on a card the agent changed past
// version 1, the stepper it opens in the card (change chips, what the text gained, "You're up to
// date"), seen on select (click, keyboard, lasso), Send leaving the tabs, keyboard only, axe light
// and dark; then the gallery's Changed cards section.
//
// Each test draws its own board through the API, as an agent would: a joined agent writes the board
// and its cards, the page opens, then the agent changes a card, so the change arrives live. Agent
// calls go through `request` (no person cookie); reading the ledger goes through `page.request`.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['dark', 'light'];
// The step's time and the gallery's screenshot read the same in every test machine's clock.
test.use({ timezoneId: 'UTC', locale: 'en-GB' });

interface Agent { secret: string }
interface Drawn { agent: Agent; board: string; n: number[] }

let boards = 0;

async function join(request: APIRequestContext): Promise<Agent> {
  const r = await request.post('/api/agents', { data: { label: 'Pricing chat' } });
  expect(r.status(), await r.text()).toBe(201);
  return await r.json() as Agent;
}

async function write(request: APIRequestContext, d: { agent: Agent; board: string }, items: object[]) {
  const r = await request.post(`/api/boards/${d.board}/write`, { headers: { Authorization: `Bearer ${d.agent.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  const body = await r.json() as { results: { ok: boolean; n?: number; problem?: unknown }[] };
  expect(body.results.every((x) => x.ok), JSON.stringify(body.results)).toBe(true);
  return body.results;
}

/** A board of its own with `count` cards, drawn by a new agent. */
async function draw(request: APIRequestContext, count = 1): Promise<Drawn> {
  const d = { agent: await join(request), board: `updates-${Date.now()}-${(boards += 1)}` };
  const results = await write(request, d, [
    { type: 'board', title: 'Updates' },
    { type: 'region', region: { id: 'p', title: 'Pricing thread', mode: 'grid' } },
    ...Array.from({ length: count }, (_, i) => ({ type: 'node', node: { region: 'p', kind: 'risk', title: `Card ${i + 1}`, body: 'Offered on the last call.', item: true } })),
  ]);
  return { ...d, n: results.slice(2).map((x) => x.n!) };
}

const append = (request: APIRequestContext, d: Drawn, n: number, text: string) => write(request, d, [{ type: 'append', n, text }]);
const APPENDED = 'The credit amount is in.';
/** A new version with a new title and the body as it is after one append of `APPENDED`. */
const retitle = (request: APIRequestContext, d: Drawn, n: number, title: string) =>
  write(request, d, [{ type: 'node', n, node: { region: 'p', kind: 'risk', title, body: `Offered on the last call.\n\n${APPENDED}`, item: true } }]);

/** Open the board and wait until it has drawn. */
async function open(page: Page, d: Drawn, query = ''): Promise<void> {
  await page.goto(`/${query}#${d.board}`);
  await expect(page.locator('vb-node')).toHaveCount(d.n.length);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
}

const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);
const tab = (page: Page, n: number) => card(page, n).locator('.vb-node-btab[data-tab="updates"]');
const steps = (page: Page, n: number) => card(page, n).locator('.vb-node-steps');
const nav = (page: Page, n: number) => card(page, n).locator('.vb-node-stepnav');
const next = (page: Page, n: number) => nav(page, n).getByRole('button', { name: 'Next' });

/** The card seen lines on the board after line `after`, as [n, ver]. */
async function seenAfter(page: Page, board: string, after: number): Promise<number[][]> {
  const r = await page.request.get(`/api/ledger?board=${board}&after=${after}`);
  return (await r.json() as { events: { type: string; n?: number; ver?: number }[] }).events
    .filter((e) => e.type === 'seen' && e.n !== undefined).map((e) => [e.n!, e.ver!]);
}
const head = async (page: Page) => ((await (await page.request.get('/api/boards')).json()) as { head: number }).head;

/** Press Tab until `target` has focus, as a keyboard user would; fails after `max` presses. */
async function tabTo(page: Page, target: Locator, max = 60): Promise<void> {
  for (let i = 0; i < max; i += 1) {
    if (await target.evaluate((e) => e === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached ${String(target)}`);
}

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

test('an agent append makes "1 update" appear live; a version-1 card has none', async ({ page, request }) => {
  const d = await draw(request, 2);
  const [a, b] = d.n as [number, number];
  await open(page, d);
  await expect(tab(page, a)).toBeHidden();
  await append(request, d, a, APPENDED);
  await expect(tab(page, a)).toBeVisible();
  await expect(tab(page, a)).toHaveText('1 update');
  await expect(tab(page, a)).toHaveAttribute('aria-label', '1 update since you last looked. Show them');
  await expect(tab(page, a)).toHaveAttribute('aria-expanded', 'false');
  await expect(card(page, a)).toHaveAttribute('aria-label', /, Open, 1 unseen update$/);
  await expect(tab(page, b)).toBeHidden();
  await retitle(request, d, a, 'Card 1, at 35+ seats');
  await expect(tab(page, a)).toHaveText('2 updates');
});

test('the tab steps through each unseen version in the card, marking each seen; then up to date and the tab goes', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  await open(page, d);
  await append(request, d, n, APPENDED);
  await retitle(request, d, n, 'Card 1, at 35+ seats');
  await expect(tab(page, n)).toHaveText('2 updates');
  const height = () => card(page, n).evaluate((e) => (e as HTMLElement).offsetHeight);
  const folded = await height();
  const before = await head(page);
  await tab(page, n).click();
  await expect(tab(page, n)).toHaveAttribute('aria-expanded', 'true');
  await expect(tab(page, n)).toHaveAttribute('aria-label', '2 updates since you last looked. Hide them');
  await expect(steps(page, n)).toBeVisible();
  await expect(steps(page, n)).toHaveAttribute('aria-label', 'Update 1 of 2, v2');
  await expect(steps(page, n).locator('.vb-step-head')).toHaveText(/^v2 · \d+ \w+, \d\d:\d\d · Pricing chat$/);
  await expect(steps(page, n).locator('.vb-step-chips li')).toHaveText(['+ body']);
  await expect(steps(page, n).locator('.vb-step-line')).toHaveText([APPENDED]);
  await expect(nav(page, n).locator('.vb-node-stepcount')).toHaveText('Update 1 of 2');
  await expect(card(page, n).locator('.vb-node-actions')).toBeHidden();
  await expect(next(page, n)).toBeFocused();
  await expect(card(page, n)).toHaveAttribute('aria-label', /, Open, showing update 1 of 2$/);
  expect(await height(), 'the card grows in place').toBeGreaterThan(folded);
  await expect.poll(() => seenAfter(page, d.board, before)).toEqual([[n, 2]]);
  await next(page, n).click();
  await expect(steps(page, n)).toHaveAttribute('aria-label', 'Update 2 of 2, v3');
  await expect(steps(page, n).locator('.vb-step-chips li')).toHaveText(['~ title']);
  await expect(steps(page, n).locator('.vb-step-line')).toHaveText(['Title: Card 1, at 35+ seats']);
  await expect(tab(page, n), 'the count holds while stepping').toHaveText('2 updates');
  await expect.poll(() => seenAfter(page, d.board, before)).toEqual([[n, 2], [n, 3]]);
  // Back shows a step already seen: nothing more is sent.
  await nav(page, n).getByRole('button', { name: 'Back' }).click();
  await expect(nav(page, n).locator('.vb-node-stepcount')).toHaveText('Update 1 of 2');
  await expect(nav(page, n).getByRole('button', { name: 'Back' })).toHaveAttribute('aria-disabled', 'true');
  await next(page, n).click();
  await next(page, n).click();
  await expect(steps(page, n)).toHaveText("You're up to date");
  await expect(tab(page, n)).toBeHidden();
  await expect(nav(page, n)).toBeHidden();
  await expect(card(page, n)).toBeFocused();
  await expect(steps(page, n)).toBeHidden();
  expect(await height(), 'it folds back').toBe(folded);
  await expect(card(page, n)).toHaveAttribute('aria-label', /, Open$/);
  expect(await seenAfter(page, d.board, before)).toEqual([[n, 2], [n, 3]]);
});

test('selecting a changed card marks its latest version seen and the tab goes; a second click sends nothing', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  await append(request, d, n, APPENDED);
  await append(request, d, n, 'And the renewal date.');
  await open(page, d, '?vbwork');
  await expect(tab(page, n)).toHaveText('2 updates');
  const before = await head(page);
  await card(page, n).locator('.vb-node-title').click();
  await expect(card(page, n)).toHaveAttribute('data-selected', '');
  await expect(tab(page, n)).toBeHidden();
  await expect.poll(() => seenAfter(page, d.board, before)).toEqual([[n, 3]]);
  await card(page, n).locator('.vb-node-title').click();
  await page.evaluate(() => (window as unknown as { __vbWork?: { idle(): Promise<void> } }).__vbWork?.idle());
  expect(await seenAfter(page, d.board, before)).toEqual([[n, 3]]);
});

test('a lasso marks each unseen card it selects, one line per card', async ({ page, request }) => {
  const d = await draw(request, 3);
  const [a, b, c] = d.n as [number, number, number];
  await append(request, d, a, APPENDED);
  await append(request, d, c, APPENDED);
  await open(page, d);
  const before = await head(page);
  const f = (await page.locator('vb-region').first().boundingBox())!;
  await page.keyboard.down('Shift');
  await page.mouse.move(f.x + 2, f.y + f.height - 2);
  await page.mouse.down();
  await page.mouse.move(f.x + f.width - 2, f.y + 2, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(3);
  await expect(tab(page, a)).toBeHidden();
  await expect(tab(page, c)).toBeHidden();
  // Every item the person had not seen at its latest version, the version-1 card included (item.unseen).
  await expect.poll(async () => (await seenAfter(page, d.board, before)).sort((x, y) => x[0]! - y[0]!)).toEqual([[a, 2], [b, 1], [c, 2]]);
});

test('Send leaves the tabs; tabbing past and hovering send nothing', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  await append(request, d, n, APPENDED);
  await open(page, d);
  const before = await head(page);
  await card(page, n).hover();
  await page.locator('#stage').focus();
  await tabTo(page, tab(page, n));
  await page.getByRole('button', { name: 'Send to agent' }).click();
  await expect(page.locator('#send')).toHaveAttribute('data-state', 'sent');
  await expect(tab(page, n)).toHaveText('1 update');
  expect(await seenAfter(page, d.board, before)).toEqual([]);
});

test('keyboard only: Enter on the tab opens with focus on Next, Esc folds back to the tab, Space on a card marks it seen', async ({ page, request }) => {
  const d = await draw(request, 2);
  const [a, b] = d.n as [number, number];
  await append(request, d, a, APPENDED);
  await retitle(request, d, a, 'Card 1, at 35+ seats');
  await append(request, d, b, APPENDED);
  await open(page, d);
  const before = await head(page);
  await page.locator('#stage').focus();
  await tabTo(page, tab(page, a));
  await page.keyboard.press('Enter');
  await expect(next(page, a)).toBeFocused();
  await expect(steps(page, a)).toHaveAttribute('aria-label', 'Update 1 of 2, v2');
  await page.keyboard.press('Escape');
  await expect(steps(page, a)).toBeHidden();
  await expect(tab(page, a)).toHaveText('1 update');
  await expect(tab(page, a)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(steps(page, a)).toHaveAttribute('aria-label', 'Update 1 of 1, v3');
  await page.keyboard.press('Enter');
  await expect(steps(page, a)).toHaveText("You're up to date");
  await expect(card(page, a)).toBeFocused();
  await expect(steps(page, a)).toBeHidden();
  await tabTo(page, card(page, b));
  await page.keyboard.press(' ');
  await expect(card(page, b)).toHaveAttribute('data-selected', '');
  await expect(tab(page, b)).toBeHidden();
  await expect.poll(() => seenAfter(page, d.board, before)).toEqual([[a, 2], [a, 3], [b, 2]]);
});

test('a past version shows no tab and selecting there sends nothing', async ({ page, request }) => {
  const d = await draw(request, 2);
  const [a, b] = d.n as [number, number];
  await append(request, d, a, APPENDED);
  await open(page, d);
  // A person line between the agent's two runs, so the first is a version of its own.
  await card(page, b).locator('.vb-node-title').click();
  await expect.poll(async () => (await seenAfter(page, d.board, 0)).length).toBe(1);
  await append(request, d, a, 'And the renewal date.');
  await expect(tab(page, a)).toHaveText('2 updates');
  await page.locator('#version').selectOption({ index: 1 });
  await expect(page.locator('.vb-banner')).toBeVisible();
  await expect(tab(page, a)).toBeHidden();
  const before = await head(page);
  await card(page, a).locator('.vb-node-title').click();
  await expect(card(page, a)).toHaveAttribute('data-selected', '');
  expect(await seenAfter(page, d.board, before)).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.locator('.vb-banner')).toBeHidden();
  await expect(tab(page, a)).toHaveText('2 updates');
});

test('flag off: no tab, and selecting sends nothing', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  await append(request, d, n, APPENDED);
  await open(page, d, '?flags=-cardUpdates');
  const before = await head(page);
  await expect(tab(page, n)).toBeHidden();
  await card(page, n).locator('.vb-node-title').click();
  await expect(card(page, n)).toHaveAttribute('data-selected', '');
  await expect(card(page, n)).toHaveAttribute('aria-label', /, Open, selected$/);
  expect(await seenAfter(page, d.board, before)).toEqual([]);
});

for (const theme of THEMES) {
  test(`axe passes with a tab and a card mid-step (${theme})`, async ({ page, request }) => {
    const d = await draw(request, 2);
    const [a, b] = d.n as [number, number];
    await append(request, d, a, APPENDED);
    await retitle(request, d, a, 'Card 1, at 35+ seats');
    await append(request, d, b, APPENDED);
    await setTheme(page, theme);
    await open(page, d);
    await tab(page, a).click();
    await next(page, a).click();
    await expect(steps(page, a)).toHaveAttribute('aria-label', 'Update 2 of 2, v3');
    await expect(tab(page, b)).toBeVisible();
    await expectNoAxeViolations(page);
  });
}

// ---- The gallery's Changed cards section ----

const section = (page: Page) => page.locator('section[data-feature="card-updates"]');

test('gallery: the Changed cards section shows by default and not with -cardUpdates', async ({ page }) => {
  await page.goto('/gallery.html?flags=-cardUpdates');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  const s = section(page);
  await expect(s.locator('vb-node')).toHaveCount(4);
  await expect(s.locator('.vb-node-btab[data-tab="updates"]:visible')).toHaveText(['3 updates', '3 updates']);
  await expect(s.locator('.vb-node-btab[data-tab="proposal"]:visible')).toHaveText('Out of date');
  await expect(s.locator('.vb-node-steps:visible')).toHaveCount(2);
  await expect(s.locator('.vb-node-stepcount:visible')).toHaveText('Update 3 of 3');
  await expect(s.locator('.vb-step-chips:visible li')).toHaveText(['~ body', '+ tags', '- size']);
  await expect(s.locator('.vb-step-done')).toHaveText("You're up to date");
  // The new card (stage5-follow-ups FE_01): NEW only, a label, and its name ends ", new".
  await expect(s.locator('.vb-node-btab[data-tab="new"]:visible')).toHaveText('NEW');
  await expect(s.locator('vb-node[aria-label$=", new"]')).toHaveCount(1);
  await expect(s.locator('vb-node[aria-label$=", new"] [data-tab="updates"]')).toBeHidden();
});

for (const theme of THEMES) {
  test(`gallery: Changed cards passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`card-updates-${theme}.png`);
  });
}
