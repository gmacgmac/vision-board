// Access requests grouped by bot (accessByBot flag, search-and-finding ACCESS_01, rulings 320/321):
// the requests strip shows one group per bot, headed by its label, with each container's row and
// reason and one Allow all for a bot with more than one request; the strip's heading counts bots.
// Allow, Allow all and Refuse are the person's acts, one `grant` or `deny` line per request.
//
// Each test draws its own board (one creator agent, three containers), so the open requests of one
// test never reach the next. Agent calls go through `request` (no person cookie); the page's own
// cookie sends the person's acts.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { head } from './board-page.ts';
import { joinAgent } from './agent-board.ts';

const THEMES: Theme[] = ['dark', 'light'];
const CONTAINERS = [['pricing', 'Pricing thread'], ['launch', 'Launch plan'], ['support', 'Support questions']] as const;

interface Agent { agent: string; secret: string; label: string }
const bearer = (a: Agent) => ({ Authorization: `Bearer ${a.secret}` });
const joined = async (request: APIRequestContext, label: string): Promise<Agent> => ({ ...await joinAgent(request, label), label });

/** A board of three containers with one card each, made by its own creator agent. */
async function makeBoard(request: APIRequestContext, board: string): Promise<void> {
  const creator = await joined(request, 'Board maker');
  const r = await request.post(`/api/boards/${board}/write`, {
    headers: bearer(creator),
    data: { items: [
      { type: 'board', title: 'Requests by bot' },
      ...CONTAINERS.map(([id, title]) => ({ type: 'region', region: { id, title, mode: 'grid' } })),
      ...CONTAINERS.map(([id], i) => ({ type: 'node', node: { region: id, kind: 'question', title: `Question ${i + 1}?` } })),
    ] },
  });
  expect(r.status(), await r.text()).toBe(200);
}

/** The agent asks for a container (`region`), or for the whole board with none; returns its `seq`. */
async function ask(request: APIRequestContext, a: Agent, board: string, region?: string): Promise<number> {
  const reason = `${a.label} needs ${region ?? 'the board'}.`;
  const r = await request.post('/api/grants', { headers: bearer(a), data: { board, ...(region && { region }), reason } });
  expect(r.status(), await r.text()).toBe(201);
  return (await r.json() as { request: number }).request;
}

const openRequests = async (page: Page, board: string): Promise<number[]> =>
  (((await (await page.request.get(`/api/boards/${board}`)).json()) as { requests?: { seq: number }[] }).requests ?? []).map((r) => r.seq);

async function ledgerAfter(page: Page, board: string, after: number) {
  const r = await page.request.get(`/api/ledger?board=${board}&after=${after}`);
  return (await r.json() as { events: Record<string, unknown>[] }).events;
}

const strip = (page: Page) => page.getByRole('region', { name: /asks? for access/ });
const group = (page: Page, heading: string) => page.locator('.vb-access-group').filter({ has: page.locator('.vb-access-bot-name', { hasText: heading }) });

async function openBoard(page: Page, board: string, query = ''): Promise<void> {
  await page.goto(`/${query}#${board}`);
  await expect(page.locator('vb-node')).toHaveCount(CONTAINERS.length);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?setup'); // the page first, so page.request carries the person cookie; a query of its own so the later goto is a real load
});

test('two bots: two groups headed by label, the heading counts bots, one Allow all grants only that bot\'s requests', async ({ page, request }) => {
  const board = 'by-bot-all';
  await makeBoard(request, board);
  const build = await joined(request, 'build');
  const docs = await joined(request, 'docs');
  const mine = [await ask(request, build, board, 'pricing'), await ask(request, build, board, 'launch'), await ask(request, build, board, 'support')];
  const theirs = await ask(request, docs, board);
  const before = await head(page);
  await openBoard(page, board);
  await expect(strip(page)).toHaveAccessibleName('2 agents ask for access');
  await expect(page.locator('.vb-access-group')).toHaveCount(2);
  await expect(page.locator('.vb-access-bot-name')).toHaveText(['build asks for access to 3 containers', 'docs asks for access to draw on this board']);
  // The bot's rows: each container and its reason.
  const rows = group(page, 'build asks for access to 3 containers').locator('.vb-access-row');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('Pricing thread');
  await expect(rows.nth(0)).toContainText('build needs pricing.');
  await expect(rows.nth(2)).toContainText('Support questions');
  // Only a bot with more than one request has Allow all.
  await expect(page.getByRole('button', { name: /^Allow all/ })).toHaveCount(1);
  await group(page, 'build asks for access to 3 containers').getByRole('button', { name: 'Allow all 3 requests from build' }).click();
  await expect(page.locator('.vb-access-group')).toHaveCount(1);
  await expect(strip(page)).toHaveAccessibleName('An agent asks for access');
  // One toast for the whole bot, not the last request's: "build can now write in Support questions".
  await expect(page.locator('#toast')).toHaveText('build can now write in 3 containers');
  const acts = (await ledgerAfter(page, board, before)).filter((e) => e.type === 'act');
  expect(acts.map((e) => [e.by, e.action, e.request])).toEqual(mine.map((seq) => ['person', 'grant', seq]));
  expect(await openRequests(page, board)).toEqual([theirs]);
});

test('a single row\'s Allow and Refuse still work alone, and a group of one has no Allow all', async ({ page, request }) => {
  const board = 'by-bot-alone';
  await makeBoard(request, board);
  const build = await joined(request, 'build');
  const first = await ask(request, build, board, 'pricing');
  const second = await ask(request, build, board, 'launch');
  const before = await head(page);
  await openBoard(page, board);
  const bot = group(page, 'build asks for access to 2 containers');
  await bot.getByRole('button', { name: 'Allow build to write in Pricing thread' }).click();
  await expect(page.locator('.vb-access-row')).toHaveCount(1);
  await expect(page.locator('#toast')).toHaveText('build can now write in Pricing thread');
  // One request left: the heading counts it, and Allow all is gone.
  await expect(group(page, 'build asks for access to 1 container')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Allow all/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Refuse build to write in Launch plan' }).click();
  const note = page.getByLabel('Note for build (optional)');
  await expect(note).toBeFocused();
  await note.fill('Not this one.');
  await page.getByRole('button', { name: 'Refuse build to write in Launch plan' }).click();
  await expect(page.locator('.vb-access')).toHaveCount(0);
  const acts = (await ledgerAfter(page, board, before)).filter((e) => e.type === 'act');
  expect(acts.map((e) => [e.action, e.request, e.text])).toEqual([['grant', first, undefined], ['deny', second, 'Not this one.']]);
});

test('two bots with one label are numbered in the order they asked; no id is shown', async ({ page, request }) => {
  const board = 'by-bot-twins';
  await makeBoard(request, board);
  const one = await joined(request, 'pricing-site');
  const two = await joined(request, 'pricing-site');
  await ask(request, one, board, 'pricing');
  await ask(request, two, board, 'launch');
  await openBoard(page, board);
  await expect(strip(page)).toHaveAccessibleName('2 agents ask for access');
  await expect(page.locator('.vb-access-bot-name')).toHaveText(['pricing-site (1) asks for access to 1 container', 'pricing-site (2) asks for access to 1 container']);
  const text = await strip(page).innerText();
  expect(text).not.toContain(one.agent);
  expect(text).not.toContain(two.agent);
  await group(page, 'pricing-site (2) asks for access to 1 container').getByRole('button', { name: 'Allow pricing-site (2) to write in Launch plan' }).click();
  await expect(page.locator('.vb-access-group')).toHaveCount(1);
  // The other bot is now the only one with the label: its number goes.
  await expect(page.locator('.vb-access-bot-name')).toHaveText(['pricing-site asks for access to 1 container']);
});

test('flag off: one row per request under a count of requests, no groups, no Allow all', async ({ page, request }) => {
  const board = 'by-bot-off';
  await makeBoard(request, board);
  const build = await joined(request, 'build');
  const docs = await joined(request, 'docs');
  await ask(request, build, board, 'pricing');
  await ask(request, build, board, 'launch');
  await ask(request, docs, board);
  await openBoard(page, board, '?flags=-accessByBot');
  await expect(strip(page)).toHaveAccessibleName('3 agents ask for access');
  await expect(page.locator('.vb-access-row')).toHaveCount(3);
  await expect(page.locator('.vb-access-group')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Allow all/ })).toHaveCount(0);
  await expect(page.locator('.vb-access-row').first()).toContainText('build asks to write in Pricing thread');
});

test('keyboard: Tab reaches Allow all and Enter allows the bot\'s requests; focus lands on the next Allow', async ({ page, request }) => {
  const board = 'by-bot-keys';
  await makeBoard(request, board);
  const build = await joined(request, 'build');
  const docs = await joined(request, 'docs');
  await ask(request, build, board, 'pricing');
  await ask(request, build, board, 'launch');
  await ask(request, docs, board, 'support');
  await openBoard(page, board);
  const all = page.getByRole('button', { name: 'Allow all 2 requests from build' });
  for (let i = 0; i < 80 && !(await all.evaluate((e) => e === document.activeElement)); i += 1) await page.keyboard.press('Tab');
  await expect(all).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.vb-access-group')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Allow docs to write in Support questions' })).toBeFocused();
});

for (const theme of THEMES) {
  test(`axe passes on the board with grouped requests and a refusing note (${theme})`, async ({ page, request }) => {
    const board = `by-bot-axe-${theme}`;
    await makeBoard(request, board);
    const build = await joined(request, 'build');
    const docs = await joined(request, 'docs');
    await ask(request, build, board, 'pricing');
    await ask(request, build, board, 'launch');
    await ask(request, docs, board);
    await setTheme(page, theme);
    await openBoard(page, board);
    await expectNoAxeViolations(page);
    await page.getByRole('button', { name: 'Refuse build to write in Launch plan' }).click();
    await expectNoAxeViolations(page);
  });
}

// ---- The gallery's entry ----

const entry = (page: Page) => page.locator('section[data-feature="accessByBot"]');

test('gallery: the entry shows by default and not with -accessByBot', async ({ page }) => {
  await page.goto('/gallery.html?flags=-accessByBot');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(entry(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  await expect(entry(page)).toBeVisible();
});

test('gallery: three bots, two with one label, one Allow all', async ({ page }) => {
  await page.goto('/gallery.html');
  const s = entry(page);
  await expect(s.getByRole('region', { name: '3 agents ask for access' })).toBeVisible();
  await expect(s.locator('.vb-access-bot-name')).toHaveText([
    'pricing-site (1) asks for access to 3 containers', 'pricing-site (2) asks for access to draw on this board', 'docs asks for access to 1 container',
  ]);
  await expect(s.locator('.vb-access-row')).toHaveCount(5);
  await expect(s.getByRole('button', { name: /^Allow all/ })).toHaveCount(1);
  await expect(s.getByRole('button', { name: 'Allow all 3 requests from pricing-site (1)' })).toBeVisible();
});

for (const theme of THEMES) {
  test(`gallery: Access requests by bot passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(entry(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(entry(page)).toHaveScreenshot(`access-by-bot-${theme}.png`);
  });
}
