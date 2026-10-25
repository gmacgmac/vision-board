// NEW cards on the page (stage5-follow-ups FE_01, tracker U1), behind the newCards flag (rule 12, on
// by default): a card the agent adds after the person first opened the board shows a NEW tab on its
// bottom edge (a label, not a button) and its name ends ", new"; a fresh board shows none; selecting
// the card sends its seen line (`clearedBy` names select) and takes the tab away; a Send and a new
// drawing end no NEW (new-and-updated Design 2): the older card stays NEW beside the newer; axe light
// and dark; then the gallery's New card sample.
//
// Each test draws its own board through the API as a joined agent, opens the page, then the agent
// adds a card, so the card arrives live. Agent calls go through `request` (no person cookie);
// reading the ledger goes through `page.request`.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { boardLines } from './board-lines.ts';

const THEMES: Theme[] = ['dark', 'light'];
test.use({ timezoneId: 'UTC', locale: 'en-GB' });

interface Drawn { secret: string; board: string; n: number[] }

let boards = 0;

async function write(request: APIRequestContext, d: Pick<Drawn, 'secret' | 'board'>, items: object[]) {
  const r = await request.post(`/api/boards/${d.board}/write`, { headers: { Authorization: `Bearer ${d.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  const body = await r.json() as { results: { ok: boolean; n?: number }[] };
  expect(body.results.every((x) => x.ok), JSON.stringify(body.results)).toBe(true);
  return body.results;
}

const cardItem = (title: string) => ({ type: 'node', node: { region: 'p', kind: 'risk', title, body: 'Offered on the last call.' } });

/** A board of its own with `count` cards, drawn by a new agent. */
async function draw(request: APIRequestContext, count = 1): Promise<Drawn> {
  const r = await request.post('/api/agents', { data: { label: 'Pricing chat' } });
  expect(r.status(), await r.text()).toBe(201);
  const d = { secret: ((await r.json()) as { secret: string }).secret, board: `new-${Date.now()}-${(boards += 1)}` };
  const results = await write(request, d, [
    { type: 'board', title: 'New cards' },
    { type: 'region', region: { id: 'p', title: 'Pricing thread', mode: 'grid' } },
    ...Array.from({ length: count }, (_, i) => cardItem(`Card ${i + 1}`)),
  ]);
  return { ...d, n: results.slice(2).map((x) => x.n!) };
}

/** The agent adds a card after the page opened the board; returns its number. */
const add = async (request: APIRequestContext, d: Drawn, title: string) => (await write(request, d, [cardItem(title)]))[0]!.n!;

/** The ledger lines after `after`, of one board when named (the whole ledger is paged, so a long one is cut). */
const events = async (page: Page, after = 0, board?: string) =>
  (await (await page.request.get(`/api/ledger?after=${after}${board ? `&board=${board}` : ''}`)).json() as { events: { type: string; board?: string; n?: number; ver?: number }[] }).events;
const head = async (page: Page) => ((await (await page.request.get('/api/boards')).json()) as { head: number }).head;
/** The card seen lines on `board` after line `after`, as [n, ver], by board number (board-lines.ts). */
const seenAfter = async (page: Page, after: number, board: string) =>
  (await boardLines(page, board, after)).filter((e) => e.type === 'seen' && e.n !== undefined).map((e) => [e.n!, e.ver as number]);

/** Open the board and wait until it has drawn and the person's first board seen is on the ledger (NEW needs it). */
async function open(page: Page, d: Drawn, query = ''): Promise<void> {
  await page.goto(`/${query}#${d.board}`);
  await expect(page.locator('vb-node')).toHaveCount(d.n.length);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
  await expect.poll(async () => (await events(page, 0, d.board)).some((e) => e.type === 'seen' && e.board === d.board)).toBe(true);
}

const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);
const tag = (page: Page, n: number) => card(page, n).locator('.vb-node-btab[data-tab="new"]');

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

test('a fresh board shows no NEW; a card the agent adds later shows NEW live, as a label and in the name', async ({ page, request }) => {
  const d = await draw(request, 2);
  const [a, b] = d.n as [number, number];
  await open(page, d);
  await expect(tag(page, a)).toBeHidden();
  await expect(tag(page, b)).toBeHidden();
  await expect(card(page, a)).toHaveAttribute('aria-label', /Risk: Card \d+$/);
  const c = await add(request, d, 'Card 3');
  await expect(page.locator('vb-node')).toHaveCount(3);
  await expect(tag(page, c)).toBeVisible();
  await expect(tag(page, c)).toHaveText('NEW');
  await expect(card(page, c)).toHaveAttribute('aria-label', /Risk: Card \d+, new$/);
  await expect(tag(page, a)).toBeHidden();
  // Not a button: it is not in the tab order and holds nothing to press.
  expect(await tag(page, c).evaluate((e) => e.tagName)).toBe('SPAN');
  await expect(card(page, c).locator('[data-tab="updates"]')).toBeHidden();
});

test('selecting a NEW card sends its seen line and takes the tab away; a second click sends nothing', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d, '?vbwork');
  const c = await add(request, d, 'Card 2');
  await expect(tag(page, c)).toBeVisible();
  const before = await head(page);
  await card(page, c).locator('.vb-node-title').click();
  await expect(card(page, c)).toHaveAttribute('data-selected', '');
  await expect(tag(page, c)).toBeHidden();
  await expect.poll(() => seenAfter(page, before, d.board)).toEqual([[c, 1]]);
  await expect(card(page, c)).toHaveAttribute('aria-label', /Risk: Card \d+, selected$/);
  await card(page, c).locator('.vb-node-title').click();
  await page.evaluate(() => (window as unknown as { __vbWork?: { idle(): Promise<void> } }).__vbWork?.idle());
  expect(await seenAfter(page, before, d.board)).toEqual([[c, 1]]);
});

test('after a Send and a new drawing, the older card stays NEW beside the newer one until it is engaged', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d);
  const older = await add(request, d, 'Card 2');
  await expect(tag(page, older)).toBeVisible();
  // Something to send that names no card, so it ends no NEW (Send waits for an answer: field report batch 1, ruling 1).
  const note = await page.request.post(`/api/boards/${d.board}/act`, { data: { type: 'act', action: 'comment', board: d.board, region: 'p', text: 'All of these?' } });
  expect(note.status(), await note.text()).toBe(201);
  await page.getByRole('button', { name: 'Send to agent' }).click();
  await expect(page.locator('#send')).toHaveAttribute('data-state', 'sent');
  await expect(tag(page, older), 'a Send alone ends nothing').toBeVisible();
  const newer = await add(request, d, 'Card 3');
  await expect(tag(page, newer)).toBeVisible();
  await expect(tag(page, older), 'the agent drawing again ends nothing').toBeVisible();
  await expect(card(page, older)).toHaveAttribute('aria-label', /Risk: Card \d+, new$/);
});

test('flag off: no NEW tab and the name does not say new', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d, '?flags=-newCards');
  const c = await add(request, d, 'Card 2');
  await expect(page.locator('vb-node')).toHaveCount(2);
  await expect(tag(page, c)).toBeHidden();
  await expect(card(page, c)).toHaveAttribute('aria-label', /Risk: Card \d+$/);
});

test('a past version shows no NEW tab', async ({ page, request }) => {
  const d = await draw(request);
  const [first] = d.n as [number];
  await open(page, d);
  const c = await add(request, d, 'Card 2');
  await expect(tag(page, c)).toBeVisible();
  // A person line between the agent's runs, so the earlier run is a version of its own.
  await card(page, first).locator('.vb-node-title').click();
  await expect.poll(async () => (await seenAfter(page, 0, d.board)).length).toBeGreaterThan(0);
  await add(request, d, 'Card 3');
  await expect(page.locator('vb-node')).toHaveCount(3);
  await page.locator('#version').selectOption({ index: 1 });
  await expect(page.locator('.vb-banner')).toBeVisible();
  await expect(page.locator('.vb-node-btab[data-tab="new"]:visible')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.vb-banner')).toBeHidden();
  await expect(tag(page, c)).toHaveCount(1);
});

for (const theme of THEMES) {
  test(`axe passes with a NEW tab (${theme})`, async ({ page, request }) => {
    const d = await draw(request, 2);
    await setTheme(page, theme);
    await open(page, d);
    const c = await add(request, d, 'Card 3');
    await expect(tag(page, c)).toBeVisible();
    await expectNoAxeViolations(page);
  });
}

// ---- The gallery's New card sample (in the Changed cards section) ----

test('gallery: the New card sample shows by default and not with -newCards', async ({ page }) => {
  const section = page.locator('section[data-feature="card-updates"]');
  await page.goto('/gallery.html?flags=-newCards');
  await expect(section.locator('vb-node')).toHaveCount(3);
  await expect(section.locator('[data-tab="new"]:visible')).toHaveCount(0);
  await page.goto('/gallery.html');
  await expect(section.locator('vb-node')).toHaveCount(4);
  await expect(section.locator('[data-tab="new"]:visible')).toHaveText('NEW');
});
