// Field report batch 2 on the board page: the person's bookmark (cardBookmark flag, ruling 3, assumption A; D-099 2:
// the flag before ledger format 20, its key B), the "N cards retired" marker (retiredMarker flag, ruling 1), the column and row modes (ruling 4) and
// board numbers on a page with more than one board (D-041 proposed). Every board here is drawn after
// the roadmap's 17 cards, so its card 1 is never the ledger's 1: a slip between a board number and
// an identity shows. Agents write through the API with a Bearer secret; the person's setup acts go
// through `page.request`, which carries the page's cookie. Then the gallery's two new sections.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test, bid } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { card, frame, head, idle, linesAfter } from './board-page.ts';
import { act, joinAgent, open } from './agent-board.ts';
import type { Agent } from './agent-board.ts';

const THEMES: Theme[] = ['dark', 'light'];
test.use({ timezoneId: 'UTC', locale: 'en-GB' });

interface Drawn { board: string; agent: Agent }
let boards = 0;

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
  const d = { board: `batch2-${Date.now()}-${(boards += 1)}`, agent: await joinAgent(request, 'Batch 2 chat') };
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

/** The bookmark: a node's number (D-099 4), aria-pressed while bookmarked. */
const bookmarkOf = (page: Page, n: number) => card(page, n).locator('[data-mark="number"]');
const chip = (page: Page) => page.locator(bid('bookmarked'));
// The page sets the person cookie: setup acts through `page.request` need it before the board opens.
test.beforeEach(async ({ page }) => { await page.goto('/?setup'); });

const focusedId = (page: Page) => page.evaluate(() => document.activeElement?.closest('vb-node')?.getAttribute('data-id') ?? null);

// ---- the bookmark --------------------------------------------------------------------------------

test('the bookmark: a click on the number of every card, B, stored by identity, kept through a redraw and a reload', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d, '?vbwork', 4);
  for (const n of [1, 2, 3, 4]) {
    await expect(bookmarkOf(page, n)).toHaveText(String(n));
    await expect(bookmarkOf(page, n)).toHaveAttribute('aria-pressed', 'false');
  }
  await expect(chip(page)).toHaveCount(0);
  const before = await head(page);
  await bookmarkOf(page, 2).click();
  await expect(bookmarkOf(page, 2)).toHaveAttribute('aria-pressed', 'true');
  await expect(card(page, 2)).toHaveAttribute('aria-label', /, bookmarked$/);
  await expect(chip(page)).toHaveText(/1\s*bookmarked/);
  // B on a focused card; F is still Fit and Shift+F, the old key, bookmarks nothing.
  await card(page, 4).focus();
  await page.keyboard.press('f');
  await card(page, 4).focus();
  await page.keyboard.press('Shift+F');
  await expect(bookmarkOf(page, 4)).toHaveAttribute('aria-pressed', 'false');
  await card(page, 4).focus();
  await page.keyboard.press('b');
  await expect(bookmarkOf(page, 4)).toHaveAttribute('aria-pressed', 'true');
  await expect(chip(page)).toHaveText(/2\s*bookmarked/);
  await idle(page);
  // The page sent board numbers 2 and 4; the ledger holds the identities, which are not those.
  const marks = (await linesAfter(page, before)).filter((e) => e.action === 'bookmark');
  expect(marks.map((e) => [e.board ?? null, 'ver' in e])).toEqual([[null, false], [null, false]]);
  expect(marks.map((e) => e.n)).not.toEqual([2, 4]);
  // The agent redraws card 2: its bookmark stays. A reload keeps both.
  await write(request, d, [{ type: 'node', n: 2, node: { region: 'p', kind: 'question', title: 'Question 2, again?' } }]);
  await expect(card(page, 2).locator('.vb-node-title')).toHaveText('Question 2, again?');
  await expect(bookmarkOf(page, 2)).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page.locator('vb-node')).toHaveCount(4);
  await expect(bookmarkOf(page, 2)).toHaveAttribute('aria-pressed', 'true');
  await expect(bookmarkOf(page, 4)).toHaveAttribute('aria-pressed', 'true');
  // A second press takes the bookmark off.
  await bookmarkOf(page, 4).click();
  await expect(bookmarkOf(page, 4)).toHaveAttribute('aria-pressed', 'false');
  await expect(chip(page)).toHaveText(/1\s*bookmarked/);
});

test('the chip steps through the bookmarked cards in number order from the focused one, wrapping', async ({ page, request }) => {
  const d = await draw(request);
  for (const n of [3, 1]) await act(page, d, { action: 'bookmark', n });
  await open(page, d, '?vbwork', 4);
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

test('a bookmark is nothing new to send, and an agent never reads it', async ({ page, request }) => {
  const d = await draw(request);
  await act(page, d, { action: 'send', board: d.board });
  const after = await head(page);
  await open(page, d, '?vbwork', 4);
  await bookmarkOf(page, 1).click();
  await expect(bookmarkOf(page, 1)).toHaveAttribute('aria-pressed', 'true');
  await idle(page);
  await expect(page.locator(bid('send'))).toHaveAttribute('aria-disabled', 'true');
  const r = await request.get(`/api/boards/${d.board}/responses?after=${after}`, { headers: { Authorization: `Bearer ${d.agent.secret}` } });
  expect(r.status(), await r.text()).toBe(200);
  expect((await r.json() as { responses: unknown[] }).responses).toEqual([]);
  const node = await (await request.get(`/api/boards/${d.board}/nodes/1`, { headers: { Authorization: `Bearer ${d.agent.secret}` } })).json();
  expect(JSON.stringify(node)).not.toMatch(/flag|bookmark/);
});

test('with the cardBookmark flag off: the number bookmarks nothing, B does nothing, no chip', async ({ page, request }) => {
  const d = await draw(request);
  await act(page, d, { action: 'bookmark', n: 1 });
  await open(page, d, '?vbwork&flags=-cardBookmark', 4);
  await expect(chip(page)).toHaveCount(0);
  await expect(card(page, 1)).not.toHaveAttribute('aria-label', /bookmarked/);
  const before = await head(page);
  await card(page, 2).focus();
  await page.keyboard.press('b');
  await bookmarkOf(page, 3).click();
  await idle(page);
  expect((await linesAfter(page, before)).filter((e) => e.action === 'bookmark')).toEqual([]);
});

for (const theme of THEMES) {
  test(`axe passes with bookmarked cards and the chip (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    const d = await draw(request);
    await act(page, d, { action: 'bookmark', n: 2 });
    await open(page, d, '?vbwork', 4);
    await expect(chip(page)).toBeVisible();
    await expectNoAxeViolations(page);
  });
}

// ---- retired cards ----------------------------------------------------------------------------

const marker = (page: Page, region: string) => frame(page, region).locator('.vb-region-retired');

test('a card retired: gone from the board, "1 retired" on its container, opening the version where it last appeared', async ({ page, request }) => {
  const d = await draw(request);
  await act(page, d, { action: 'ack', n: 1, ver: 1 }); // the agent's next write is a new version of the board
  await open(page, d, '?vbwork', 4);
  await expect(marker(page, 'p')).toBeHidden();
  await write(request, d, [{ type: 'retire', n: 2 }]);
  await expect(page.locator('vb-node')).toHaveCount(3);
  await expect(card(page, 2)).toHaveCount(0);
  await expect(card(page, 3).locator('.vb-node-num')).toHaveText('3', { useInnerText: true });
  await expect(marker(page, 'p')).toBeVisible();
  await expect(marker(page, 'p')).toHaveText('1 retired');
  await expect(marker(page, 'p')).toHaveAccessibleName(/^1 card retired from this container\. Show v\d+, where it last appeared$/);
  await expect(marker(page, 'p')).toHaveAttribute('data-until', /^\d+$/); // the retire line its answers run to
  await expect(marker(page, 'q')).toBeHidden();
  await expectNoAxeViolations(page);
  // A press opens that version, read-only, where card 2 is still on the board.
  await marker(page, 'p').click();
  await expect(page.locator('.vb-banner')).toBeVisible();
  await expect(page.locator('vb-node')).toHaveCount(4);
  await expect(card(page, 2).locator('.vb-node-title')).toHaveText('Question 2?');
  await expect(card(page, 1)).toHaveAttribute('data-status', 'acknowledged'); // the ✓ after that version, before the retire (ruling 10)
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
  await open(page, d, '?vbwork', 4);
  await write(request, d, [{ type: 'retire', region: 'q' }]);
  await expect(frame(page, 'q')).toHaveCount(0);
  await expect(page.locator('vb-node')).toHaveCount(3);
  await expect(page.locator('.vb-region-retired:visible')).toHaveCount(0);
});

test('with the retiredMarker flag off, a retired card still leaves, with no marker', async ({ page, request }) => {
  const d = await draw(request);
  await act(page, d, { action: 'ack', n: 1, ver: 1 });
  await write(request, d, [{ type: 'retire', n: 3 }]);
  await open(page, d, '?vbwork&flags=-retiredMarker', 3);
  await expect(marker(page, 'p')).toBeHidden();
});

// ---- column and row; board numbers on a second board --------------------------------------------

test('the container offers Column and Row, and no List; a sent list is refused', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d, '?vbwork', 4);
  const pick = async (mode: string) => {
    await frame(page, 'p').locator('.vb-layout-btn').click();
    await frame(page, 'p').locator(`.vb-mtile[data-tile="${mode}"]`).click();
  };
  const names = await frame(page, 'p').locator('.vb-mtile .vb-mtile-name').allTextContents();
  expect(names).toEqual(['Grid', 'Flow', 'Lanes', 'Radial', 'Column', 'Row']);
  for (const mode of ['row', 'column']) {
    await pick(mode);
    await expect(frame(page, 'p')).toHaveAttribute('data-mode', mode);
  }
  // In a row the cards sit left to right in number order, tops aligned.
  await pick('row');
  await idle(page);
  const boxes = await Promise.all([1, 2, 3].map(async (n) => (await card(page, n).boundingBox())!));
  expect(boxes[0]!.x).toBeLessThan(boxes[1]!.x);
  expect(boxes[1]!.x).toBeLessThan(boxes[2]!.x);
  expect(new Set(boxes.map((b) => Math.round(b.y))).size).toBe(1);
  const r = await page.request.post(`/api/boards/${d.board}/act`, { data: { type: 'act', action: 'mode', board: d.board, region: 'p', mode: 'list' } });
  expect(r.status()).toBe(422);
});

test('on a second board the page names every card by its own number: answers, seen, updates', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d, '?vbwork', 4);
  const before = await head(page);
  await card(page, 2).focus();
  await page.keyboard.press('a');
  await expect(card(page, 2)).toHaveAttribute('data-status', 'acknowledged');
  await expect(card(page, 1)).toHaveAttribute('data-status', 'open');
  // The agent changes card 3: "1 update" on its badge, and no other card's.
  await write(request, d, [{ type: 'node', n: 3, node: { region: 'p', kind: 'question', title: 'Question 3, sharper?' } }]);
  const updates = '[data-mark="badge"][data-badge="updates"]';
  await expect(card(page, 3).locator(updates)).toBeVisible();
  await expect(page.locator(`${updates}:visible`)).toHaveCount(1);
  await card(page, 3).locator('.vb-node-title').click();
  await expect(card(page, 3).locator(updates)).toBeHidden();
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

test('gallery: the bookmark section shows a card at rest, bookmarked, and bookmarked before a redraw, then the chip', async ({ page }) => {
  await page.goto('/gallery.html');
  const s = section(page, 'cardBookmark');
  await expect(s.getByRole('heading', { level: 2, name: 'The bookmark' })).toBeVisible();
  // The number is the bookmark (DD-04): pressed and filled on the bookmarked nodes.
  await expect(s.locator('[data-mark="number"]')).toHaveCount(3);
  expect(await s.locator('[data-mark="number"]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-pressed')))).toEqual(['false', 'true', 'true']);
  await expect(s.locator('vb-node[data-bookmarked]')).toHaveCount(2);
  await expect(s.locator('vb-node').nth(2).locator('.vb-node-body')).toContainText('the flag stays');
  await expect(s.getByRole('button', { name: /^2 bookmarked$/ })).toBeVisible();
  await expect(page.goto('/gallery.html?flags=-cardBookmark').then(() => section(page, 'cardBookmark').count())).resolves.toBe(0);
});

test('gallery: the retired section shows a container with "2 retired"', async ({ page }) => {
  await page.goto('/gallery.html');
  const s = section(page, 'retiredMarker');
  const f = s.locator('vb-region[data-region="retired-here"]');
  await expect(f.locator('.vb-region-retired')).toHaveText('2 retired');
  await expect(f.locator('.vb-region-retired')).toHaveAttribute('aria-disabled', 'false');
  await expect(f.locator('.vb-region-count')).toHaveAttribute('title', '1 of 2 answered');
  // Beside it, the narrowest frame (review polish ruling 9): one card left of seven.
  await expect(s.locator('vb-region[data-region="retired-narrow"] .vb-region-retired')).toHaveText('6 retired');
});

for (const theme of THEMES) {
  test(`gallery: axe passes and the bookmark and retired sections match their screenshots (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(section(page, 'cardBookmark')).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page, 'cardBookmark')).toHaveScreenshot(`bookmark-${theme}.png`);
    await expect(section(page, 'retiredMarker')).toHaveScreenshot(`retired-${theme}.png`);
  });
}
