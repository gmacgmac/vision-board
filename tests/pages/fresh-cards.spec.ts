// New and updated cards at board scale (new-and-updated task, freshCards flag, on by default; api.md
// 158): the "N updates" tab outlined at rest (amber with the updateSignals flag, D-088, pink without); a container holding a new or updated card the
// person has not engaged with has a teal border and a "1 new · 1 updated" pill, until they select or
// act on one of its cards (a click on the frame ends nothing); the toolbar's "N new" chip lists those
// cards and goes to each; count = list = tabs. APCA measured light and dark; axe; the flag off is
// today; a past version shows none of it; the gallery's section.
// Each test draws a board of its own through the API as a joined agent (agent-board.ts), opens it,
// waits for the person's first board seen (NEW needs it), sees every card at version 1, then the
// agent adds card 4 in "p" and changes card 3 in "q", so the changes arrive live.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test, bid } from './helpers.ts';
import type { Theme } from './helpers.ts';
import type { Drawn } from './agent-board.ts';
import { card, write } from './agent-board.ts';
import { lc, pixel, resolved } from './apca.ts';
import { frame, idle, tab } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];
let boards = 0;

const pill = (page: Page, id: string) => frame(page, id).locator('.vb-region-fresh');
/** The pill's words to the eye (its full words are for screen readers only). */
const said = (page: Page, id: string) => pill(page, id).locator('.vb-region-fresh-n');
const isNew = (page: Page, n: number) => card(page, n).locator('.vb-node-btab[data-tab="new"]');
const list = (page: Page) => page.getByLabel('Go to a new or updated card', { exact: true });
const chip = (page: Page) => page.locator(`${bid('counts')} .vb-chip[data-tone="new"]:has(${bid('fresh-cards')})`);
/** The rows' words: each option's `label` (MenuSelect). */
const texts = (page: Page) => list(page).locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).label));

const node = (region: string, title: string, body?: string) => ({ type: 'node', node: { region, kind: 'question', title, ...(body && { body }) } });

/** Board: "p" (Pricing thread) with cards 1 and 2, "q" (Quotes) with card 3, drawn by a new agent. */
async function draw(request: APIRequestContext): Promise<Drawn> {
  const r = await request.post('/api/agents', { data: { label: 'Pricing chat' } });
  expect(r.status(), await r.text()).toBe(201);
  const d = { agent: await r.json() as { secret: string }, board: `fresh-${Date.now()}-${(boards += 1)}` };
  const results = await write(request, d, [
    { type: 'board', title: 'Fresh' },
    { type: 'region', region: { id: 'p', title: 'Pricing thread', mode: 'grid' } },
    { type: 'region', region: { id: 'q', title: 'Quotes', mode: 'grid' } },
    node('p', 'Card 1'), node('p', 'Card 2'), node('q', 'Card 3'),
  ]);
  return { ...d, n: results.slice(3).map((x) => x.n!) };
}

/** Open the board, wait for its first board seen, and see every card at version 1 (the person's seen lines). */
async function openSeen(page: Page, d: Drawn, query = ''): Promise<void> {
  await page.goto(`/${query}#${d.board}`);
  await expect(page.locator('vb-node')).toHaveCount(d.n.length);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
  await expect.poll(async () => {
    const lines = (await (await page.request.get(`/api/ledger?board=${d.board}`)).json() as { events: { type: string; board?: string; n?: number }[] }).events;
    return lines.some((e) => e.type === 'seen' && e.board === d.board && e.n === undefined);
  }).toBe(true);
  for (const n of d.n) {
    const r = await page.request.post(`/api/boards/${d.board}/seen`, { data: { n, ver: 1 } });
    expect(r.status(), await r.text()).toBe(201);
  }
}

/** The agent adds card 4 in "p" and changes card 3 in "q": one new, one updated. */
async function change(request: APIRequestContext, d: Drawn): Promise<number> {
  const [added] = await write(request, d, [node('p', 'Card 4'), { type: 'node', n: d.n[2], node: { region: 'q', kind: 'question', title: 'Card 3', body: 'Changed.' } }]);
  return added!.n!;
}

/** A fresh board: opened, seen, then changed. Returns the new card's number. */
async function fresh(page: Page, request: APIRequestContext, query = ''): Promise<{ d: Drawn; added: number }> {
  const d = await draw(request);
  await openSeen(page, d, query);
  const added = await change(request, d);
  await expect(page.locator('vb-node')).toHaveCount(4);
  return { d, added };
}

/** A colour of `l` as the pixel drawn. */
const colour = async (page: Page, l: Locator, prop: 'color' | 'borderTopColor' | 'backgroundColor') =>
  pixel(page, await l.evaluate((e, p) => getComputedStyle(e)[p], prop));
const token = async (page: Page, name: string) => pixel(page, await resolved(page, `var(${name})`));

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

test('the updates tab: the updated amber outline and words at rest, the changed amber edge and the ink on hover; NEW unchanged', async ({ page, request }) => {
  const { d, added } = await fresh(page, request);
  const t = tab(page, d.n[2]!);
  await expect(t).toHaveText('1 update');
  expect(await colour(page, t, 'borderTopColor')).toEqual(await token(page, '--vb-state-updated'));
  expect(await colour(page, t, 'color')).toEqual(await token(page, '--vb-state-updated'));
  expect(await colour(page, t, 'backgroundColor')).toEqual(await token(page, '--vb-surface-card'));
  await t.hover();
  expect(await colour(page, t, 'borderTopColor')).toEqual(await token(page, '--vb-state-context'));
  expect(await colour(page, t, 'color')).toEqual(await token(page, '--vb-ink'));
  const nw = isNew(page, added);
  await expect(nw).toHaveText('NEW');
  expect(await colour(page, nw, 'backgroundColor')).toEqual(await token(page, '--vb-accent-soft'));
  expect(await colour(page, nw, 'color')).toEqual(await token(page, '--vb-accent'));
});

test('a fresh container: teal border and "1 new" / "1 updated" pills; count = list = tabs', async ({ page, request }) => {
  const { d, added } = await fresh(page, request);
  await expect(frame(page, 'p')).toHaveAttribute('data-fresh', '');
  await expect(frame(page, 'q')).toHaveAttribute('data-fresh', '');
  expect(await colour(page, frame(page, 'p'), 'borderTopColor')).toEqual(await token(page, '--vb-state-fresh'));
  await expect(said(page, 'p')).toHaveText('1 new');
  await expect(pill(page, 'p')).toHaveAttribute('title', '1 new card in this container');
  await expect(said(page, 'q')).toHaveText('1 updated');
  // One colour per meaning (updateSignals): "new" teal, "updated" amber; a container holding only an
  // updated card keeps its teal border (point 432).
  expect(await colour(page, said(page, 'p').locator('.vb-region-fresh-new'), 'color')).toEqual(await token(page, '--vb-state-fresh'));
  expect(await colour(page, said(page, 'q').locator('.vb-region-fresh-updated'), 'color')).toEqual(await token(page, '--vb-state-updated'));
  expect(await colour(page, frame(page, 'q'), 'borderTopColor')).toEqual(await token(page, '--vb-state-fresh'));
  await expect(chip(page)).toContainText('2 new');
  await expect.poll(() => texts(page)).toEqual(['2 new', `${d.n[2]} · Card 3 · updated`, `${added} · Card 4`]);
  // One definition: the tabs the board shows are the list's rows.
  await expect(page.locator('.vb-node-btab:is([data-tab="new"], [data-tab="updates"]):visible')).toHaveCount(2);
  // Another update in "p": its pill counts both.
  await write(request, d, [{ type: 'node', n: d.n[0], node: { region: 'p', kind: 'question', title: 'Card 1', body: 'Changed too.' } }]);
  await expect(said(page, 'p')).toHaveText('1 new · 1 updated');
  await expect(said(page, 'p').locator('span')).toHaveText(['1 new', '1 updated']);
  await expect(chip(page)).toContainText('3 new');
});

test('selecting a new card ends its container\'s border and pill; a click on the frame\'s empty space ends nothing', async ({ page, request }) => {
  const { d, added } = await fresh(page, request, '?vbwork');
  const box = (await frame(page, 'q').boundingBox())!;
  await page.mouse.click(box.x + box.width - 8, box.y + box.height - 8);
  await idle(page);
  await expect(frame(page, 'q'), 'a click on the frame').toHaveAttribute('data-fresh', '');
  await card(page, added).locator('.vb-node-title').click();
  await expect(isNew(page, added)).toBeHidden();
  await expect(frame(page, 'p')).not.toHaveAttribute('data-fresh', '');
  await expect(pill(page, 'p')).toBeHidden();
  await expect(frame(page, 'q'), 'another container stays fresh').toHaveAttribute('data-fresh', '');
  await expect(chip(page)).toContainText('1 new');
  // An act on any card in "q" (a pin) ends it, though its updated card keeps its tab.
  const r = await page.request.post(`/api/boards/${d.board}/act`, { data: { type: 'act', action: 'pin', n: d.n[2], x: 40, y: 40 } });
  expect(r.status(), await r.text()).toBe(201);
  await expect(frame(page, 'q')).not.toHaveAttribute('data-fresh', '');
  // The agent changes a card in "p" again: fresh again.
  await write(request, d, [{ type: 'node', n: d.n[1], node: { region: 'p', kind: 'question', title: 'Card 2', body: 'Again.' } }]);
  await expect(frame(page, 'p')).toHaveAttribute('data-fresh', '');
  await expect(said(page, 'p')).toHaveText('1 updated');
});

test('"N new": choosing a card goes to it, selected and focused, and keeps its mark (ruling 322); hidden with none', async ({ page, request }) => {
  const { added } = await fresh(page, request, '?vbwork');
  await list(page).selectOption(String(added));
  await expect(card(page, added)).toBeFocused();
  await expect(card(page, added)).toHaveAttribute('data-selected', '');
  await expect(list(page)).toHaveValue('');
  // Finding is no engagement: the list, the chip and the tab are as they were (find-keeps-marks.spec.ts).
  await expect(chip(page)).toContainText('2 new');
  await expect(isNew(page, added)).toHaveText('NEW');
  await expect.poll(() => texts(page)).toEqual(['2 new', expect.stringMatching(/ · Card 3 · updated$/), `${added} · Card 4`]);
  // The person's own click on each ends it.
  await card(page, added).locator('.vb-node-title').click();
  await expect(chip(page)).toContainText('1 new');
  const [n] = (await texts(page)).slice(1).map((x) => Number(x.split(' ')[0]));
  await list(page).selectOption(String(n));
  await expect(card(page, n!)).toBeFocused();
  await card(page, n!).locator('.vb-node-title').click();
  await expect(page.locator(bid('fresh-cards'))).toHaveCount(0);
  await expect(page.locator('vb-region[data-fresh]')).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`APCA (${theme}): the border Lc 30, the pill's words and the updates tab's Lc 45, its outline Lc 30; axe passes`, async ({ page, request }) => {
    await setTheme(page, theme);
    const { d } = await fresh(page, request);
    const canvas = await token(page, '--vb-surface-canvas');
    const cardBg = await token(page, '--vb-surface-card');
    const border = lc(await colour(page, frame(page, 'p'), 'borderTopColor'), canvas);
    const plain = lc(await token(page, '--vb-line-contrast'), canvas);
    const words = lc(await colour(page, pill(page, 'p'), 'color'), await colour(page, pill(page, 'p'), 'backgroundColor'));
    const t = tab(page, d.n[2]!);
    const tabWords = lc(await colour(page, t, 'color'), cardBg);
    const outline = lc(await colour(page, t, 'borderTopColor'), cardBg);
    console.log(`APCA ${theme}: fresh border ${border.toFixed(1)} (plain line ${plain.toFixed(1)}), pill words ${words.toFixed(1)}, updates tab words ${tabWords.toFixed(1)}, outline ${outline.toFixed(1)}`);
    expect(border).toBeGreaterThanOrEqual(30);
    expect(border, 'brighter than the plain frame line').toBeGreaterThan(plain);
    expect(words).toBeGreaterThanOrEqual(45);
    expect(tabWords).toBeGreaterThanOrEqual(45);
    expect(outline).toBeGreaterThanOrEqual(30);
    await expectNoAxeViolations(page);
  });
}

test('the pill leaves a narrow title line whole, and stays zoomed out', async ({ page, request }) => {
  await fresh(page, request);
  const p = pill(page, 'p');
  // Whole: it shows at its full width or not at all (its slot clips a second line).
  const whole = () => p.evaluate((e) => {
    const slot = e.parentElement!.getBoundingClientRect();
    const r = e.getBoundingClientRect();
    return r.top >= slot.bottom - 1 || (r.left >= slot.left - 1 && r.right <= slot.right + 1);
  });
  const stage = page.locator(bid('stage'));
  for (let i = 0; i < 12 && (await stage.getAttribute('data-zoom')) !== 'far'; i += 1) {
    await page.keyboard.press('-');
    expect(await whole(), `zoom step ${i + 1}`).toBe(true);
  }
  await expect(stage).toHaveAttribute('data-zoom', 'far');
  await expect(p).toBeVisible();
});

test('flag off: the tab is grey at rest, no container is fresh and no "N new" chip', async ({ page, request }) => {
  const { d } = await fresh(page, request, '?flags=-freshCards');
  await expect(tab(page, d.n[2]!)).toHaveText('1 update');
  expect(await colour(page, tab(page, d.n[2]!), 'borderTopColor')).toEqual(await token(page, '--vb-line-strong'));
  expect(await colour(page, tab(page, d.n[2]!), 'color')).toEqual(await token(page, '--vb-ink-subtle'));
  await expect(page.locator('vb-region[data-fresh]')).toHaveCount(0);
  await expect(page.locator('.vb-region-fresh:visible')).toHaveCount(0);
  await expect(page.locator(bid('fresh-cards'))).toHaveCount(0);
});

test('a past version shows no fresh container and no "N new" chip', async ({ page, request }) => {
  await fresh(page, request);
  await expect(page.locator('vb-region[data-fresh]')).toHaveCount(2);
  await page.locator(bid('version')).selectOption({ index: 1 });
  await expect(page.locator('.vb-banner')).toBeVisible();
  await expect(page.locator('vb-region[data-fresh]')).toHaveCount(0);
  await expect(page.locator(bid('fresh-cards'))).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.vb-banner')).toBeHidden();
  await expect(page.locator('vb-region[data-fresh]')).toHaveCount(2);
  await expect(page.locator(bid('fresh-cards'))).toHaveCount(1);
});

// ---- The gallery's section ----

for (const theme of THEMES) {
  test(`gallery: the New and updated cards section (${theme}): axe, and its look`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    const section = page.locator('section[data-feature="freshCards"]');
    await expect(section.locator('vb-region[data-fresh]')).toHaveCount(4);
    await expect(section.locator('.vb-region-fresh-n').first()).toHaveText('1 new · 3 updated');
    await expect(section.locator('#g-fresh-rest')).toHaveCount(1);
    await expectNoAxeViolations(page);
    await section.scrollIntoViewIfNeeded();
    await expect(section).toHaveScreenshot(`fresh-section-${theme}.png`);
  });
}

test('gallery: no New and updated cards section with -freshCards', async ({ page }) => {
  await page.goto('/gallery.html?flags=-freshCards');
  await expect(page.locator('section[data-feature="card-updates"]')).toHaveCount(1);
  await expect(page.locator('section[data-feature="freshCards"]')).toHaveCount(0);
});
