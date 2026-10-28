// Search on the board (cardSearch flag, on by default; SEARCH_02, tracker M7, rulings 317 and 322):
// `/` opens the Go to card box empty; words typed ring the matching cards, dim the rest, and the box
// says "1 of 3" and which part of the current match matched (a polite status); ↓/↑ step through the
// matches, wrapping, each brought into view; Enter goes (selects and focuses, keeping NEW and updated);
// Esc, or an empty box, clears; digits alone still go by number; "No matches" when none. Each test
// draws a board of its own through the API (agent-board.ts).
import type { APIRequestContext, Page } from '@playwright/test';
import { axeFindings, expect, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import type { Drawn } from './agent-board.ts';
import { act, card, joinAgent, open, write } from './agent-board.ts';
import { boardLines } from './board-lines.ts';
import { idle, selected, stageBox } from './board-page.ts';
import { lc, pixel, resolved } from './apca.ts';

const THEMES: Theme[] = ['dark', 'light'];
const field = (page: Page) => page.getByRole('textbox', { name: 'Find a card' });
const goBox = (page: Page) => page.locator('.vb-go');
const said = (page: Page) => goBox(page).getByRole('status');
const found = (page: Page) => page.locator('vb-node[data-found]').evaluateAll((els) => els.map((e) => `${(e as HTMLElement).dataset.id} ${(e as HTMLElement).dataset.found}`));
const searching = (page: Page) => page.locator('.vb-world[data-search]');
const opacity = (page: Page, css: string) => page.locator(css).first().evaluate((e) => Number(getComputedStyle(e).opacity));

let boards = 0;
/** Card titles, and the matches for "pric ann": 2 by its title, 9 by its text, 13 by the person's note. */
const TITLES = ['Hiring', 'Annual pricing', 'Roadmap', 'Office move', 'Budget review', 'Team offsite', 'Security audit', 'Vendor list',
  'Launch plan', 'Support rota', 'Data retention', 'Onboarding', 'Renewals', 'Design system'];
const BODY: Record<number, string> = { 9: 'Pricing for the annual tier goes out with the launch.' };
const NOTE = 'Check the annual pricing again';

/** A board of its own with the 14 cards above in container "Plans", the person's note on card 13, open in a 1000 by 600
 *  window (`small`), or the suite's 1600 by 1000, where every card's buttons are their full size. */
async function drawOpen(page: Page, request: APIRequestContext, query = '', small = true): Promise<Drawn> {
  const d = { agent: await joinAgent(request), board: `search-${Date.now()}-${(boards += 1)}` };
  const results = await write(request, d, [
    { type: 'board', title: 'Search' },
    { type: 'region', region: { id: 'p', title: 'Plans', mode: 'grid' } },
    ...TITLES.map((title, i) => ({ type: 'node', node: { region: 'p', kind: 'question', title, ...(BODY[i + 1] && { body: BODY[i + 1] }) } })),
  ]);
  const drawn = { ...d, n: results.slice(2).map((x) => x.n!) };
  if (small) await page.setViewportSize({ width: 1000, height: 600 });
  await page.goto('/?setup');
  await act(page, drawn, { action: 'comment', n: 13, ver: 1, text: NOTE });
  await open(page, drawn, query);
  return drawn;
}

/** Whether card `n` shows whole on the stage. */
async function shows(page: Page, n: number): Promise<boolean> {
  const [s, b] = [await stageBox(page), (await card(page, n).boundingBox())!];
  return b.y >= s.y && b.y + b.height <= s.y + s.height && b.x >= s.x && b.x + b.width <= s.x + s.width;
}

/** axe's findings but the contrast of what a search dims: dimmed cards, containers and connectors are
 *  decoration while it shows (the brief), so their text's contrast is not read. */
async function undimmedFindings(page: Page) {
  const dimmed = (target: string) => page.locator(target).first().evaluate((e) => !!e.closest('.vb-world[data-search]') && !e.closest('vb-node[data-found]'));
  const out = [];
  for (const f of await axeFindings(page)) {
    const targets = f.id !== 'color-contrast' ? f.targets : (await Promise.all(f.targets.map(async (t) => (await dimmed(t) ? null : t)))).filter((t) => t !== null);
    if (targets.length) out.push({ ...f, targets });
  }
  return out;
}

/** Zoom in until card 13 is off the stage (the board's own keys, no card focused). */
async function zoomedIn(page: Page): Promise<void> {
  for (let i = 0; i < 6 && await shows(page, 13); i += 1) await page.keyboard.press('+');
  expect(await shows(page, 13), 'card 13 starts off screen').toBe(false);
}

test('/ opens the box empty, focused, without typing a slash; it says what it takes', async ({ page, request }) => {
  await drawOpen(page, request);
  await page.keyboard.press('/');
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveValue('');
  await expect(field(page)).toHaveAttribute('placeholder', 'Card number or words');
  await expect(goBox(page).locator('.vb-go-hint')).toHaveText(/↑↓\s*step · Enter\s*go · Esc\s*close/);
  await expect(searching(page)).toHaveCount(0);
});

test('words ring the matches and dim the rest; "1 of 3" and the part; ↓/↑ step, wrapping, into view; Enter goes', async ({ page, request }) => {
  await drawOpen(page, request);
  await zoomedIn(page);
  await page.keyboard.press('/');
  await page.keyboard.type('pric ann');
  await expect(searching(page)).toHaveCount(1);
  expect((await found(page)).sort()).toEqual(['13 match', '2 current', '9 match']);
  await expect(said(page)).toHaveText('1 of 3 · card 2, in the title');
  await expect.poll(() => opacity(page, 'vb-node[data-id="1"]')).toBeLessThan(0.5);
  await expect.poll(() => opacity(page, '.vb-regions')).toBeLessThan(0.5);
  expect(await opacity(page, 'vb-node[data-id="2"]')).toBe(1);
  await page.keyboard.press('ArrowDown');
  await expect(said(page)).toHaveText('2 of 3 · card 9, in the text');
  await expect(card(page, 9)).toHaveAttribute('data-found', 'current');
  await expect.poll(() => shows(page, 9)).toBe(true);
  await page.keyboard.press('ArrowDown');
  await expect(said(page)).toHaveText('3 of 3 · card 13, in a note');
  await expect.poll(() => shows(page, 13)).toBe(true);
  await page.keyboard.press('ArrowDown');
  await expect(said(page)).toHaveText(/^1 of 3/);
  await page.keyboard.press('ArrowUp');
  await expect(said(page)).toHaveText(/^3 of 3/);
  await expect(field(page)).toBeFocused();
  expect(await selected(page), 'stepping selects nothing').toEqual([]);
  await page.keyboard.press('Enter');
  await expect(goBox(page)).toHaveCount(0);
  await expect(card(page, 13)).toBeFocused();
  expect(await selected(page)).toEqual(['13']);
  await expect(searching(page)).toHaveCount(0);
  await expect(page.locator('vb-node[data-found]')).toHaveCount(0);
});

test('Esc clears the rings and the dim and closes; an empty box clears them and stays open', async ({ page, request }) => {
  await drawOpen(page, request);
  await page.keyboard.press('/');
  await page.keyboard.type('annual');
  await expect(searching(page)).toHaveCount(1);
  for (let i = 0; i < 'annual'.length; i += 1) await page.keyboard.press('Backspace');
  await expect(searching(page)).toHaveCount(0);
  await expect(page.locator('vb-node[data-found]')).toHaveCount(0);
  await expect(field(page)).toBeFocused();
  await page.keyboard.type('hiring');
  expect(await found(page)).toEqual(['1 current']);
  await page.keyboard.press('Escape');
  await expect(goBox(page)).toHaveCount(0);
  await expect(searching(page)).toHaveCount(0);
  await expect(page.locator('vb-node[data-found]')).toHaveCount(0);
  expect(await selected(page)).toEqual([]);
});

test('digits alone still go by number; "No matches" says so and dims nothing', async ({ page, request }) => {
  await drawOpen(page, request);
  await page.keyboard.press('/');
  await page.keyboard.type('zebra');
  await expect(said(page)).toHaveText('No matches');
  await expect(searching(page)).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(goBox(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.keyboard.type('12');
  await expect(field(page)).toHaveValue('12');
  await expect(searching(page)).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(card(page, 12)).toBeFocused();
  expect(await selected(page)).toEqual(['12']);
});

test('stepping and Enter keep NEW and updated (finding keeps marks); no card seen line', async ({ page, request }) => {
  const d = await drawOpen(page, request);
  await expect.poll(async () => (await boardLines(page, d.board)).some((e) => e.type === 'seen' && e.n === undefined)).toBe(true);
  for (const n of d.n) expect((await page.request.post(`/api/boards/${d.board}/seen`, { data: { n, ver: 1 } })).status()).toBe(201);
  const [added] = await write(request, d, [
    { type: 'node', node: { region: 'p', kind: 'question', title: 'Annual review' } },
    { type: 'node', n: 2, node: { region: 'p', kind: 'question', title: 'Annual pricing', body: 'Changed.' } },
  ]);
  const isNew = card(page, added!.n!).locator('.vb-node-btab[data-tab="new"]');
  const updates = card(page, 2).locator('.vb-node-btab[data-tab="updates"]');
  await expect(isNew).toHaveText('NEW');
  await expect(updates).toHaveText('1 update');
  const seen = async () => (await boardLines(page, d.board)).filter((e) => e.type === 'seen' && e.n !== undefined).length;
  const was = await seen();
  await page.keyboard.press('/');
  await page.keyboard.type('annual');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(goBox(page)).toHaveCount(0);
  await idle(page);
  await expect(isNew).toHaveText('NEW');
  await expect(updates).toHaveText('1 update');
  expect(await seen()).toBe(was);
});

test('a screen reader hears the count: the box\'s status is polite and described by the field', async ({ page, request }) => {
  await drawOpen(page, request);
  await page.keyboard.press('/');
  await page.keyboard.type('annual');
  const status = said(page);
  await expect(status).toHaveText(/^1 of 3 · card /);
  expect(await status.getAttribute('aria-live') ?? 'polite').toBe('polite');
  const id = await status.getAttribute('id');
  expect((await field(page).getAttribute('aria-describedby'))?.split(' ')).toContain(id);
});

test('the board redrawn while a search shows: the marks follow, the current match kept', async ({ page, request }) => {
  const d = await drawOpen(page, request);
  await page.keyboard.press('/');
  await page.keyboard.type('annual');
  await page.keyboard.press('ArrowDown');
  await expect(card(page, 9)).toHaveAttribute('data-found', 'current');
  const [added] = await write(request, d, [{ type: 'node', node: { region: 'p', kind: 'question', title: 'Annual review' } }]);
  await expect(card(page, added!.n!)).toHaveAttribute('data-found', 'match');
  await expect(card(page, 9)).toHaveAttribute('data-found', 'current');
  await expect(said(page)).toHaveText(/ of 4 · /);
});

test('with the cardSearch flag off, / does nothing and the box takes digits only', async ({ page, request }) => {
  await drawOpen(page, request, '?flags=-cardSearch');
  await page.keyboard.press('/');
  await page.waitForTimeout(100);
  await expect(goBox(page)).toHaveCount(0);
  await page.keyboard.press('1');
  await page.keyboard.type('x');
  const digits = page.getByRole('textbox', { name: 'Go to card' });
  await expect(digits).toHaveValue('1');
  await expect(digits).not.toHaveAttribute('placeholder');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Key commands' }).hover();
  await expect(page.locator('.vb-keys-tip [data-row="other:search"]')).toHaveCount(0);
});

test('the key list names / under Board, after Go to a card by its number', async ({ page, request }) => {
  await drawOpen(page, request);
  await page.getByRole('button', { name: 'Key commands' }).hover();
  const row = page.locator('.vb-keys-tip [data-row="other:search"]');
  await expect(row).toHaveText(/^Find a card by its words\s*\/$/);
  expect(await page.locator('.vb-keys-tip [data-row="command:go-to-card"] + [data-row="other:search"]').count()).toBe(1);
});

test('reduced motion: stepping brings a card in with no animated pan', async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await drawOpen(page, request);
  await zoomedIn(page);
  await page.keyboard.press('/');
  await page.keyboard.type('pric ann');
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(500);
  const transform = () => page.locator('.vb-world').evaluate((e) => getComputedStyle(e).transform);
  const before = await transform();
  await page.keyboard.press('ArrowDown');
  await expect(said(page)).toHaveText(/^3 of 3/);
  const at = await transform();
  await page.waitForTimeout(60);
  expect(at, 'it panned').not.toBe(before);
  expect(await transform(), 'at once, not over a glide').toBe(at);
  expect(await shows(page, 13)).toBe(true);
});

for (const theme of THEMES) {
  test(`APCA (${theme}): the rings Lc 30 on the canvas; axe passes with the box open, matching and with none`, async ({ page, request }) => {
    await setTheme(page, theme);
    await drawOpen(page, request, '', false);
    await page.keyboard.press('/');
    await page.keyboard.type('pric ann');
    await expect(card(page, 2)).toHaveAttribute('data-found', 'current');
    const canvas = await pixel(page, await resolved(page, 'var(--vb-surface-canvas)'));
    const ring = async (n: number) => lc(await pixel(page, await card(page, n).evaluate((e) => getComputedStyle(e).outlineColor)), canvas);
    const [current, match] = [await ring(2), await ring(9)];
    console.log(`APCA ${theme}: search ring current ${current.toFixed(1)}, match ${match.toFixed(1)}`);
    expect(current).toBeGreaterThanOrEqual(30);
    expect(match).toBeGreaterThanOrEqual(30);
    // The current match is told apart (VERIFY_01 F3): a thicker ring, and a second ring outside it.
    const look = (n: number) => card(page, n).evaluate((e) => { const c = getComputedStyle(e); return { width: parseFloat(c.outlineWidth), shadow: c.boxShadow }; });
    const [cur, other] = [await look(2), await look(9)];
    expect(cur.width).toBeGreaterThanOrEqual(other.width * 1.5);
    expect(cur.shadow).not.toBe(other.shadow);
    expect(lc(await pixel(page, await resolved(page, 'var(--vb-state-context)')), canvas), 'the outer ring').toBeGreaterThanOrEqual(30);
    expect(await undimmedFindings(page)).toEqual([]);
    await field(page).fill('zebra');
    await expect(said(page)).toHaveText('No matches');
    expect(await axeFindings(page)).toEqual([]);
  });

  test(`the gallery's search section: axe passes and it matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    const section = page.locator('section[data-feature="cardSearch"]');
    await expect(section.locator('vb-node[data-found="current"]')).toHaveCount(1);
    await expect(section.locator('.vb-go')).toHaveCount(4);
    expect(await undimmedFindings(page)).toEqual([]);
    await expect(section).toHaveScreenshot(`search-${theme}.png`);
  });
}
