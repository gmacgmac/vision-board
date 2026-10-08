// The lasso, the selection bar, notes on a group of cards and the zoom commands (3_FE_02, rulings
// 1-7). Runs last on the shared server, on the roadmap board; the group notes it writes it takes
// back (note-remove), so every card is left as it was found.
import type { Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const NODES = 17;
const THEMES: Theme[] = ['dark', 'light'];
type Point = { x: number; y: number };

const card = (page: Page, n: number | string) => page.locator(`vb-node[data-id="${n}"]`);
const bar = (page: Page) => page.locator('vb-selection-bar');
const bubble = (page: Page) => page.locator('vb-note-bubble');
const lasso = (page: Page) => page.locator('.vb-lasso');
const frame = (page: Page, region: string) => page.locator(`vb-region[data-region="${region}"]`);
const selectedIds = (page: Page) => page.locator('vb-node[data-selected]').evaluateAll((els) =>
  els.map((e) => (e as HTMLElement).dataset.id!).sort((a, b) => Number(a) - Number(b)));
const view = (page: Page) => page.locator('#world').evaluate((e) => {
  const m = new DOMMatrix(getComputedStyle(e).transform);
  return { x: m.e, y: m.f, k: m.a };
});

async function openBoard(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('vb-node')).toHaveCount(NODES);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
  await expect(page.locator('#wires')).not.toHaveClass(/settling/);
}

async function clickCard(page: Page, n: number | string, modifiers: ('Shift' | 'Meta')[] = []): Promise<void> {
  await card(page, n).locator('.vb-node-title').click({ modifiers, position: { x: 4, y: 4 } });
}

/** Press, move in steps, release, with `keys` held throughout. */
async function drag(page: Page, from: Point, to: Point, keys: string[] = []): Promise<void> {
  for (const k of keys) await page.keyboard.down(k);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  for (const k of [...keys].reverse()) await page.keyboard.up(k);
}

/** A Shift+drag from just inside one corner of a container to just inside the opposite one:
 *  it starts on the container's background and touches every card in it, and nothing else. */
async function lassoContainer(page: Page, region: string, keys = ['Shift']): Promise<void> {
  const f = (await frame(page, region).boundingBox())!;
  await drag(page, { x: f.x + 2, y: f.y + f.height - 2 }, { x: f.x + f.width - 2, y: f.y + 2 }, keys);
}

/** A point on the board's own background, clear of every frame and card, with room around it. */
async function emptyPoint(page: Page): Promise<Point> {
  return page.evaluate(() => {
    const stage = document.getElementById('stage')!.getBoundingClientRect();
    const clear = (x: number, y: number) => [[0, 0], [30, 0], [0, 30], [30, 30]]
      .every(([dx, dy]) => document.elementFromPoint(x + dx!, y + dy!)?.id === 'stage');
    for (let y = stage.top + 40; y < stage.bottom - 80; y += 10) {
      for (let x = stage.left + 40; x < stage.right - 80; x += 10) if (clear(x, y)) return { x, y };
    }
    throw new Error('no empty background on the stage');
  });
}

/** The screen box around the given cards. */
async function boxOf(page: Page, ids: (number | string)[]): Promise<{ x: number; y: number; r: number; b: number }> {
  const boxes = await Promise.all(ids.map(async (n) => (await card(page, n).boundingBox())!));
  return {
    x: Math.min(...boxes.map((b) => b.x)), y: Math.min(...boxes.map((b) => b.y)),
    r: Math.max(...boxes.map((b) => b.x + b.width)), b: Math.max(...boxes.map((b) => b.y + b.height)),
  };
}

/** The bar's buttons, by their visible words. */
const barButtons = (page: Page) => bar(page).locator('button').allInnerTexts();

test('Shift+drag on a background draws the dashed lasso; the cards it touches replace the selection', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 12);
  const f = (await frame(page, 'review').boundingBox())!;
  await page.keyboard.down('Shift');
  await page.mouse.move(f.x + 2, f.y + f.height - 2);
  await page.mouse.down();
  await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2, { steps: 6 });
  await expect(lasso(page)).toBeVisible();
  expect(await lasso(page).evaluate((e) => getComputedStyle(e).borderTopStyle)).toBe('dashed');
  await page.mouse.move(f.x + f.width - 2, f.y + 2, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(lasso(page)).toBeHidden();
  expect(await selectedIds(page)).toEqual(['1', '2', '3']);
  await expect(page.locator('#selection-status')).toHaveText('3 cards selected');
  expect(await page.evaluate(() => document.getSelection()?.toString() ?? '')).toBe('');
});

test('Shift+Cmd+drag adds the cards it touches to the selection', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 12);
  await lassoContainer(page, 'review', ['Shift', 'Meta']);
  expect(await selectedIds(page)).toEqual(['1', '2', '3', '12']);
});

test('a lasso that touches no card offers only "Zoom to this area", which zooms there', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 1);
  const p = await emptyPoint(page);
  const before = await view(page);
  await drag(page, p, { x: p.x + 24, y: p.y + 24 }, ['Shift']);
  expect(await selectedIds(page)).toEqual([]);
  await expect(bar(page)).toBeVisible();
  expect(await barButtons(page)).toEqual(['Zoom to this area']);
  await bar(page).getByRole('button', { name: 'Zoom to this area' }).click();
  await expect(bar(page)).toBeHidden();
  await expect.poll(async () => (await view(page)).k).toBeGreaterThan(before.k);
});

test('the selection bar: N selected, Comment, Move to, Reset places, Zoom to selection, Clear; centred above the selection; follows a pan', async ({ page }) => {
  await openBoard(page);
  await expect(bar(page)).toBeHidden();
  await clickCard(page, 13);
  await clickCard(page, 14, ['Shift']);
  await expect(bar(page)).toBeVisible();
  await expect(bar(page)).toContainText('2 selected');
  expect(await barButtons(page)).toEqual(['Comment', 'Move to', 'Reset places', 'Zoom to selection', 'Clear']);
  const sel = await boxOf(page, [13, 14]);
  const b = (await bar(page).boundingBox())!;
  expect(b.y + b.height).toBeLessThanOrEqual(sel.y);
  expect(Math.abs(b.x + b.width / 2 - (sel.x + sel.r) / 2)).toBeLessThan(2);
  // A pan carries it along; it draws above the cards and moves none of them.
  const p = await emptyPoint(page);
  await drag(page, p, { x: p.x + 60, y: p.y + 40 });
  const moved = (await bar(page).boundingBox())!;
  expect([Math.round(moved.x - b.x), Math.round(moved.y - b.y)]).toEqual([60, 40]);
  await bar(page).getByRole('button', { name: 'Clear' }).click();
  expect(await selectedIds(page)).toEqual([]);
  await expect(bar(page)).toBeHidden();
});

test('the bar goes below the selection when there is no room above it', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 1);
  await clickCard(page, 2, ['Shift']);
  // Pan the cards up to the stage's top edge.
  const sel = await boxOf(page, [1, 2]);
  const stage = (await page.locator('#stage').boundingBox())!;
  const p = await emptyPoint(page);
  await drag(page, p, { x: p.x, y: p.y - (sel.y - stage.y) + 4 });
  const after = await boxOf(page, [1, 2]);
  const b = (await bar(page).boundingBox())!;
  expect(b.y).toBeGreaterThanOrEqual(after.b);
});

test('Zoom to selection fits the selected cards; Z does the same', async ({ page }) => {
  await openBoard(page);
  const fit = await view(page);
  await clickCard(page, 12);
  await clickCard(page, 17, ['Shift']);
  await bar(page).getByRole('button', { name: 'Zoom to selection' }).click();
  await expect.poll(async () => (await view(page)).k).toBeGreaterThan(fit.k);
  const stage = (await page.locator('#stage').boundingBox())!;
  const sel = await boxOf(page, [12, 17]);
  expect(sel.x).toBeGreaterThanOrEqual(stage.x);
  expect(sel.r).toBeLessThanOrEqual(stage.x + stage.width);
  // F fits the board again; Z zooms back to the selection.
  await page.keyboard.press('f');
  await expect.poll(async () => (await view(page)).k).toBeCloseTo(fit.k, 3);
  await page.keyboard.press('z');
  await expect.poll(async () => (await view(page)).k).toBeGreaterThan(fit.k);
});

test('the header zoom buttons: zoom out, Fit and zoom in, as one group', async ({ page }) => {
  await openBoard(page);
  const fit = await view(page);
  const zoom = page.getByRole('group', { name: 'Zoom' });
  const names = await zoom.getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? e.textContent?.trim()));
  expect(names).toEqual(['Zoom out', 'Fit', 'Zoom in']);
  await zoom.getByRole('button', { name: 'Zoom in' }).click();
  await expect.poll(async () => (await view(page)).k).toBeGreaterThan(fit.k);
  await zoom.getByRole('button', { name: 'Fit' }).click();
  await expect.poll(async () => (await view(page)).k).toBeCloseTo(fit.k, 3);
  await zoom.getByRole('button', { name: 'Zoom out' }).click();
  await expect.poll(async () => (await view(page)).k).toBeLessThan(fit.k);
});

/** `count` item cards among `ids` that carry no note yet, so their pins start from 1. */
async function freeCards(page: Page, ids: number[], count: number): Promise<string[]> {
  const free: string[] = [];
  for (const n of ids) {
    if (free.length < count && (await card(page, n).getAttribute('data-noted')) === null) free.push(String(n));
  }
  expect(free.length, 'cards without notes').toBe(count);
  return free;
}
const head = async (page: Page) => (await (await page.request.get('/api/boards/roadmap')).json() as { head: number }).head;
const responsesAfter = async (page: Page, after: number) =>
  (await (await page.request.get(`/api/boards/roadmap/responses?after=${after}`)).json() as { responses: Record<string, unknown>[] }).responses;
const pinOf = (page: Page, n: string) => card(page, n).locator('.vb-note-pin');

test('Comment on a group: one note, saved once, the same pin on every card, edited and removed from any pin', async ({ page }) => {
  await openBoard(page);
  const ids = await freeCards(page, [12, 13, 14, 15, 16, 17], 3);
  const [a, b, c] = ids as [string, string, string];
  await clickCard(page, a);
  await clickCard(page, b, ['Shift']);
  await clickCard(page, c, ['Shift']);
  const before = await head(page);
  await bar(page).getByRole('button', { name: 'Comment' }).click();
  await expect(bubble(page)).toBeVisible();
  await expect(bubble(page)).toHaveAttribute('aria-label', `Note on 3 cards: ${a}, ${b}, ${c}`);
  await expect(bubble(page).locator('textarea')).toBeFocused();
  await expect(bar(page)).toBeHidden();
  await bubble(page).locator('textarea').fill('Same order for all three.');
  await page.keyboard.press('Enter');
  await expect(bubble(page)).toBeHidden();
  await expect(bar(page)).toBeVisible();
  for (const n of ids) {
    await expect(pinOf(page, n)).toBeVisible();
    await expect(pinOf(page, n)).toHaveText('1');
    await expect(card(page, n).locator('.vb-node-notes')).toContainText('Same order for all three.');
  }
  const acts = await responsesAfter(page, before);
  expect(acts.map((e) => [e.action, e.nodes, e.n])).toEqual([['comment', ids.map(Number), undefined]]);
  // Edit from the last card's pin; every card shows the new words. `dispatchEvent` rather than a
  // coordinate click: the pin's hover-scale transition and the stage's own zoom transform leave a
  // synthetic mouse click an unreliable hit test on this small, offset-corner target.
  await pinOf(page, c).dispatchEvent('click');
  await expect(bubble(page)).toHaveAttribute('aria-label', `Edit note on 3 cards: ${a}, ${b}, ${c}`);
  await bubble(page).locator('textarea').fill('Same order, please.');
  await page.keyboard.press('Enter');
  await expect(bubble(page)).toBeHidden();
  for (const n of ids) await expect(card(page, n).locator('.vb-node-notes')).toContainText('Same order, please.');
  // Remove it from the middle card's pin: gone from every card.
  await pinOf(page, b).dispatchEvent('click');
  await bubble(page).getByRole('button', { name: 'Remove' }).click();
  await expect(bubble(page)).toBeHidden();
  for (const n of ids) await expect(pinOf(page, n)).toBeHidden();
});

test('Comment with one card selected is that card\'s own note', async ({ page }) => {
  await openBoard(page);
  const [a] = await freeCards(page, [12, 13, 14, 15, 16, 17], 1);
  await clickCard(page, a!);
  await bar(page).getByRole('button', { name: 'Comment' }).click();
  await expect(bubble(page)).toHaveAttribute('aria-label', `Note on ${a}`);
  await page.keyboard.press('Escape');
  await expect(bubble(page)).toBeHidden();
});

test('keys: N or C with two or more selected open the group note; Esc closes it, then clears', async ({ page }) => {
  await openBoard(page);
  await card(page, 1).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('j');
  await page.keyboard.press('Space');
  expect(await selectedIds(page)).toEqual(['1', '2']);
  for (const key of ['n', 'c']) {
    await page.keyboard.press(key);
    await expect(bubble(page)).toBeVisible();
    await expect(bubble(page)).toHaveAttribute('aria-label', 'Note on 2 cards: 1, 2');
    await page.keyboard.press('Escape');
    await expect(bubble(page)).toBeHidden();
    expect(await selectedIds(page)).toEqual(['1', '2']);
    await expect(bar(page)).toBeVisible();
  }
  await page.keyboard.press('Escape');
  expect(await selectedIds(page)).toEqual([]);
  await expect(bar(page)).toBeHidden();
});

for (const theme of THEMES) {
  test(`axe passes with the selection bar and a group note open (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page);
    await clickCard(page, 1);
    await clickCard(page, 2, ['Shift']);
    // Zoom to the two cards: every control at full size (the fit zoom's excuse, N13, is not needed).
    await page.keyboard.press('z');
    await expect.poll(async () => (await view(page)).k).toBeGreaterThanOrEqual(1);
    await expect(bar(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await page.keyboard.press('n');
    await expect(bubble(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
  });
}
