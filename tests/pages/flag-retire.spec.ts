// Field report batch 2 on the board page: the person's flag (cardFlag flag, ruling 3, assumption A),
// the "N cards retired" marker (retiredMarker flag, ruling 1), the column and row modes (ruling 4) and
// board numbers on a page with more than one board (D-041 proposed). Every board here is drawn after
// the roadmap's 17 cards, so its card 1 is never the ledger's 1: a slip between a board number and
// an identity shows. Agents write through the API with a Bearer secret; the person's setup acts go
// through `page.request`, which carries the page's cookie. Then the gallery's two new sections.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['dark', 'light'];
test.use({ timezoneId: 'UTC', locale: 'en-GB' });

interface Agent { secret: string }
interface Drawn { board: string; agent: Agent }
let boards = 0;

async function join(request: APIRequestContext): Promise<Agent> {
  const r = await request.post('/api/agents', { data: { label: 'Batch 2 chat' } });
  expect(r.status(), await r.text()).toBe(201);
  return await r.json() as Agent;
}

/** Write `items`; each result's card number (`n`) or undefined. */
async function write(request: APIRequestContext, d: Drawn, items: unknown[]): Promise<(number | undefined)[]> {
  const r = await request.post(`/api/boards/${d.board}/write`, { headers: { Authorization: `Bearer ${d.agent.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  const out = await r.json() as { results: { ok: boolean; n?: number; problem?: unknown }[] };
  expect(out.results.every((x) => x.ok), JSON.stringify(out.results)).toBe(true);
  return out.results.map((x) => x.n);
}

/** A board of its own: container `p` with `cards` questions, and container `q` with one finding. */
async function draw(request: APIRequestContext, cards = 3): Promise<Drawn> {
  const d = { board: `batch2-${Date.now()}-${(boards += 1)}`, agent: await join(request) };
  const items = [
    { type: 'board', title: 'Batch two' },
    { type: 'region', region: { id: 'p', title: 'Pricing thread', mode: 'grid' } },
    ...Array.from({ length: cards }, (_, i) => ({ type: 'node', node: { region: 'p', kind: 'question', title: `Question ${i + 1}?` } })),
    { type: 'region', region: { id: 'q', title: 'Findings', mode: 'grid' } },
    { type: 'node', node: { region: 'q', kind: 'finding', title: 'Churn is flat' } },
  ];
  expect((await write(request, d, items)).filter((n) => n !== undefined)).toEqual([...Array.from({ length: cards }, (_, i) => i + 1), cards + 1]);
  return d;
}

/** The person acts on the board (setup), through the page's cookie. */
async function act(page: Page, d: Drawn, fields: object): Promise<number> {
  const r = await page.request.post(`/api/boards/${d.board}/act`, { data: { type: 'act', ...fields } });
  expect(r.status(), await r.text()).toBe(201);
  return (await r.json() as { seq: number }).seq;
}

/** The ledger lines after `after` as the page reads them: the file's, cards by identity. */
async function linesAfter(page: Page, after: number): Promise<Record<string, unknown>[]> {
  return (await (await page.request.get(`/api/ledger?after=${after}`)).json() as { events: Record<string, unknown>[] }).events;
}
const head = async (page: Page) => ((await (await page.request.get('/api/boards')).json()) as { head: number }).head;

/** Open the board and wait until it has drawn `cards` cards and settled. */
async function open(page: Page, d: Drawn, cards: number, flags = ''): Promise<void> {
  await page.goto(`/?vbwork${flags}#${d.board}`);
  await expect(page.locator('vb-node')).toHaveCount(cards);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
}
const idle = (page: Page) => page.evaluate(() => (window as unknown as { __vbWork: { idle(): Promise<void> } }).__vbWork.idle());
const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);
const flagOf = (page: Page, n: number) => card(page, n).locator('button[data-flag]');
const chip = (page: Page) => page.locator('#flagged');
// The page sets the person cookie: setup acts through `page.request` need it before the board opens.
test.beforeEach(async ({ page }) => { await page.goto('/gallery.html'); });

const focusedId = (page: Page) => page.evaluate(() => document.activeElement?.closest('vb-node')?.getAttribute('data-id') ?? null);

// ---- the flag ---------------------------------------------------------------------------------

test('the flag: a button beside Later on every card, Shift+F, stored by identity, kept through a redraw and a reload', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d, 4);
  for (const n of [1, 2, 3, 4]) {
    const buttons = card(page, n).locator('.vb-node-actions button');
    await expect(buttons.last()).toHaveAttribute('data-flag', '');
    await expect(buttons.nth(-2)).toHaveAttribute('data-act', 'later');
    await expect(flagOf(page, n)).toHaveAttribute('aria-pressed', 'false');
  }
  await expect(chip(page)).toHaveCount(0);
  const before = await head(page);
  await flagOf(page, 2).click();
  await expect(flagOf(page, 2)).toHaveAttribute('aria-pressed', 'true');
  await expect(card(page, 2)).toHaveAttribute('aria-label', /, flagged$/);
  await expect(chip(page)).toHaveText(/1\s*flagged/);
  // Shift+F on a focused card; F alone is still Fit and flags nothing.
  await card(page, 4).focus();
  await page.keyboard.press('f');
  await expect(flagOf(page, 4)).toHaveAttribute('aria-pressed', 'false');
  await card(page, 4).focus();
  await page.keyboard.press('Shift+F');
  await expect(flagOf(page, 4)).toHaveAttribute('aria-pressed', 'true');
  await expect(chip(page)).toHaveText(/2\s*flagged/);
  await idle(page);
  // The page sent board numbers 2 and 4; the ledger holds the identities, which are not those.
  const flags = (await linesAfter(page, before)).filter((e) => e.action === 'flag');
  expect(flags.map((e) => [e.board ?? null, 'ver' in e])).toEqual([[null, false], [null, false]]);
  expect(flags.map((e) => e.n)).not.toEqual([2, 4]);
  // The agent redraws card 2: its flag stays. A reload keeps both.
  await write(request, d, [{ type: 'node', n: 2, node: { region: 'p', kind: 'question', title: 'Question 2, again?' } }]);
  await expect(card(page, 2).locator('.vb-node-title')).toHaveText('Question 2, again?');
  await expect(flagOf(page, 2)).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('vb-node')).toHaveCount(4);
  await expect(flagOf(page, 2)).toHaveAttribute('aria-pressed', 'true');
  await expect(flagOf(page, 4)).toHaveAttribute('aria-pressed', 'true');
  // A second press takes the flag off.
  await flagOf(page, 4).click();
  await expect(flagOf(page, 4)).toHaveAttribute('aria-pressed', 'false');
  await expect(chip(page)).toHaveText(/1\s*flagged/);
});

test('the chip steps through the flagged cards in number order from the focused one, wrapping', async ({ page, request }) => {
  const d = await draw(request);
  for (const n of [3, 1]) await act(page, d, { action: 'flag', n });
  await open(page, d, 4);
  await chip(page).click();
  expect(await focusedId(page)).toBe('1');
  await chip(page).click();
  expect(await focusedId(page)).toBe('3');
  await chip(page).click();
  expect(await focusedId(page)).toBe('1');
  // Keyboard: the chip is a button in the toolbar.
  await chip(page).focus();
  await page.keyboard.press('Enter');
  expect(await focusedId(page)).toBe('3');
});

test('a flag is nothing new to send, and an agent never reads it', async ({ page, request }) => {
  const d = await draw(request);
  await act(page, d, { action: 'send', board: d.board });
  const after = await head(page);
  await open(page, d, 4);
  await flagOf(page, 1).click();
  await expect(flagOf(page, 1)).toHaveAttribute('aria-pressed', 'true');
  await idle(page);
  await expect(page.locator('#send')).toHaveAttribute('aria-disabled', 'true');
  const r = await request.get(`/api/boards/${d.board}/responses?after=${after}`, { headers: { Authorization: `Bearer ${d.agent.secret}` } });
  expect(r.status(), await r.text()).toBe(200);
  expect((await r.json() as { responses: unknown[] }).responses).toEqual([]);
  const node = await (await request.get(`/api/boards/${d.board}/nodes/1`, { headers: { Authorization: `Bearer ${d.agent.secret}` } })).json();
  expect(JSON.stringify(node)).not.toMatch(/flag/);
});

test('with the cardFlag flag off: no button, Shift+F is Fit, no chip', async ({ page, request }) => {
  const d = await draw(request);
  await act(page, d, { action: 'flag', n: 1 });
  await open(page, d, 4, '&flags=-cardFlag');
  await expect(page.locator('button[data-flag]')).toHaveCount(0);
  await expect(chip(page)).toHaveCount(0);
  await expect(card(page, 1)).not.toHaveAttribute('aria-label', /flagged/);
  const before = await head(page);
  await card(page, 2).focus();
  await page.keyboard.press('Shift+F');
  await idle(page);
  expect((await linesAfter(page, before)).filter((e) => e.action === 'flag')).toEqual([]);
});

for (const theme of THEMES) {
  test(`axe passes with flagged cards and the chip (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    const d = await draw(request);
    await act(page, d, { action: 'flag', n: 2 });
    await open(page, d, 4);
    await expect(chip(page)).toBeVisible();
    await expectNoAxeViolations(page);
  });
}

// ---- retired cards ----------------------------------------------------------------------------

const frame = (page: Page, region: string) => page.locator(`vb-region[data-region="${region}"]`);
const marker = (page: Page, region: string) => frame(page, region).locator('.vb-region-retired');

test('a card retired: gone from the board, "1 card retired" on its container, opening the version where it last appeared', async ({ page, request }) => {
  const d = await draw(request);
  await act(page, d, { action: 'ack', n: 1, ver: 1 }); // the agent's next write is a new version of the board
  await open(page, d, 4);
  await expect(marker(page, 'p')).toBeHidden();
  await write(request, d, [{ type: 'retire', n: 2 }]);
  await expect(page.locator('vb-node')).toHaveCount(3);
  await expect(card(page, 2)).toHaveCount(0);
  await expect(card(page, 3).locator('.vb-node-num')).toHaveText('3', { useInnerText: true });
  await expect(marker(page, 'p')).toBeVisible();
  await expect(marker(page, 'p')).toHaveText('1 card retired');
  await expect(marker(page, 'p')).toHaveAccessibleName(/^1 card retired from this container\. Show v\d+, where it last appeared$/);
  await expect(marker(page, 'q')).toBeHidden();
  await expectNoAxeViolations(page);
  // A press opens that version, read-only, where card 2 is still on the board.
  await marker(page, 'p').click();
  await expect(page.locator('.vb-banner')).toBeVisible();
  await expect(page.locator('vb-node')).toHaveCount(4);
  await expect(card(page, 2).locator('.vb-node-title')).toHaveText('Question 2?');
  await expect(marker(page, 'p')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('.vb-banner')).toHaveCount(0);
  await expect(page.locator('vb-node')).toHaveCount(3);
  // The number is never given again: the next card drawn is 5.
  expect(await write(request, d, [{ type: 'node', node: { region: 'p', kind: 'question', title: 'Question 5?' } }])).toEqual([5]);
  await expect(card(page, 5)).toBeVisible();
});

test('a whole container retired: its frame and its cards leave, with no marker', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d, 4);
  await write(request, d, [{ type: 'retire', region: 'q' }]);
  await expect(frame(page, 'q')).toHaveCount(0);
  await expect(page.locator('vb-node')).toHaveCount(3);
  await expect(page.locator('.vb-region-retired:visible')).toHaveCount(0);
});

test('with the retiredMarker flag off, a retired card still leaves, with no marker', async ({ page, request }) => {
  const d = await draw(request);
  await act(page, d, { action: 'ack', n: 1, ver: 1 });
  await write(request, d, [{ type: 'retire', n: 3 }]);
  await open(page, d, 3, '&flags=-retiredMarker');
  await expect(marker(page, 'p')).toBeHidden();
});

// ---- column and row; board numbers on a second board --------------------------------------------

test('the container offers Column and Row, and no List; a sent list is refused', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d, 4);
  const names = await frame(page, 'p').getByRole('radio').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(names).toEqual(['Grid', 'Flow', 'Lanes', 'Radial', 'Column', 'Row']);
  for (const mode of ['Row', 'Column']) {
    await frame(page, 'p').getByRole('radio', { name: mode, exact: true }).click();
    await expect(frame(page, 'p')).toHaveAttribute('data-mode', mode.toLowerCase());
  }
  // In a row the cards sit left to right in number order, tops aligned.
  await frame(page, 'p').getByRole('radio', { name: 'Row', exact: true }).click();
  await idle(page);
  const boxes = await Promise.all([1, 2, 3].map(async (n) => (await card(page, n).boundingBox())!));
  expect(boxes[0]!.x).toBeLessThan(boxes[1]!.x);
  expect(boxes[1]!.x).toBeLessThan(boxes[2]!.x);
  expect(new Set(boxes.map((b) => Math.round(b.y))).size).toBe(1);
  const r = await page.request.post(`/api/boards/${d.board}/act`, { data: { type: 'act', action: 'mode', board: d.board, region: 'p', mode: 'list' } });
  expect(r.status()).toBe(422);
});

test('on a second board the page names every card by its own number: buttons, seen, updates', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d, 4);
  const before = await head(page);
  await card(page, 2).locator('button[data-act="ack"]').click();
  await expect(card(page, 2)).toHaveAttribute('data-status', 'acknowledged');
  await expect(card(page, 1)).toHaveAttribute('data-status', 'open');
  // The agent changes card 3: its "1 update" tab, and no other card's.
  await write(request, d, [{ type: 'node', n: 3, node: { region: 'p', kind: 'question', title: 'Question 3, sharper?' } }]);
  await expect(card(page, 3).locator('[data-tab="updates"]')).toBeVisible();
  await expect(page.locator('[data-tab="updates"]:visible')).toHaveCount(1);
  await card(page, 3).click();
  await expect(card(page, 3).locator('[data-tab="updates"]')).toBeHidden();
  await idle(page);
  const lines = await linesAfter(page, before);
  const ack = lines.find((e) => e.action === 'ack')!;
  const seen = lines.find((e) => e.type === 'seen' && e.ver === 2)!;
  const node3 = lines.find((e) => e.type === 'node' && e.ver === 2)!;
  expect(ack.n).not.toBe(2);
  expect(seen.n).toBe(node3.n);
  expect(node3.n).not.toBe(3);
});

// ---- the gallery ------------------------------------------------------------------------------

const section = (page: Page, feature: string): Locator => page.locator(`section[data-feature="${feature}"]`);

test('gallery: the flag section shows a card at rest, flagged, and flagged before a redraw, then the chip', async ({ page }) => {
  await page.goto('/gallery.html');
  const s = section(page, 'cardFlag');
  await expect(s.getByRole('heading', { level: 2, name: 'The flag' })).toBeVisible();
  await expect(s.locator('button[data-flag]')).toHaveCount(3);
  expect(await s.locator('button[data-flag]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-pressed')))).toEqual(['false', 'true', 'true']);
  await expect(s.locator('vb-node').nth(2).locator('.vb-node-body')).toContainText('the flag stays');
  await expect(s.getByRole('button', { name: /^2 flagged$/ })).toBeVisible();
  await expect(page.goto('/gallery.html?flags=-cardFlag').then(() => section(page, 'cardFlag').count())).resolves.toBe(0);
});

test('gallery: the retired section shows a container with "2 cards retired"', async ({ page }) => {
  await page.goto('/gallery.html');
  const s = section(page, 'retiredMarker');
  await expect(s.locator('vb-region .vb-region-retired')).toHaveText('2 cards retired');
  await expect(s.locator('vb-region .vb-region-retired')).toHaveAttribute('aria-disabled', 'false');
  await expect(s.locator('vb-region .vb-region-count')).toHaveText('1 of 2 decided');
});

for (const theme of THEMES) {
  test(`gallery: axe passes and the flag and retired sections match their screenshots (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(section(page, 'cardFlag')).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page, 'cardFlag')).toHaveScreenshot(`flag-${theme}.png`);
    await expect(section(page, 'retiredMarker')).toHaveScreenshot(`retired-${theme}.png`);
  });
}
