// Z fills the stage with every selected node, however the selection was made (node-overhaul FE_06, tracker U17).
// On the worker's roadmap board, fresh for this file (servers.ts); nothing here writes to the ledger.
import type { Page } from '@playwright/test';
import { expect, openSelectionBar, test, bid } from './helpers.ts';
import { bar, card, frame, openBoard, selectedIds } from './board-page.ts';

type Point = { x: number; y: number };
const SET = [1, 2, 3];

async function clickCard(page: Page, n: number, modifiers: ('Shift' | 'Meta' | 'Control')[] = []): Promise<void> {
  await card(page, n).locator('.vb-node-title').click({ modifiers, position: { x: 4, y: 4 } });
}

async function drag(page: Page, from: Point, to: Point, keys: string[] = []): Promise<void> {
  for (const k of keys) await page.keyboard.down(k);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  for (const k of [...keys].reverse()) await page.keyboard.up(k);
}

/** Shift+drag across a whole container: it selects every card in it. */
async function lassoReview(page: Page): Promise<void> {
  const f = (await frame(page, 'review').boundingBox())!;
  await drag(page, { x: f.x + 2, y: f.y + f.height - 2 }, { x: f.x + f.width - 2, y: f.y + 2 }, ['Shift']);
}

/** The cards' union box against the stage: the share of the stage's longer-binding side it fills, and
 *  how far its centre is from the stage's centre. A fit fills 75% (SELECTION_FIT), centred. */
async function fitted(page: Page, ids: number[]): Promise<{ fill: number; dx: number; dy: number; inside: boolean }> {
  const s = (await page.locator(bid('stage')).boundingBox())!;
  const bs = await Promise.all(ids.map(async (n) => (await card(page, n).boundingBox())!));
  const [x, y] = [Math.min(...bs.map((b) => b.x)), Math.min(...bs.map((b) => b.y))];
  const [r, b] = [Math.max(...bs.map((c) => c.x + c.width)), Math.max(...bs.map((c) => c.y + c.height))];
  return {
    fill: Math.max((r - x) / s.width, (b - y) / s.height),
    dx: Math.abs((x + r) / 2 - (s.x + s.width / 2)), dy: Math.abs((y + b) / 2 - (s.y + s.height / 2)),
    inside: x >= s.x && y >= s.y && r <= s.x + s.width && b <= s.y + s.height,
  };
}

async function expectFilled(page: Page, ids: number[], fills = true): Promise<void> {
  await expect.poll(async () => (await fitted(page, ids)).dx, { timeout: 4000 }).toBeLessThan(3);
  const f = await fitted(page, ids);
  expect(f.dy).toBeLessThan(3);
  // One small node stops at the top zoom before it fills 75%.
  if (fills) expect(f.fill).toBeGreaterThan(0.7);
  expect(f.fill).toBeLessThan(0.8);
  expect(f.inside).toBe(true);
}

const WAYS: [string, (page: Page) => Promise<void>][] = [
  ['Shift-click', async (page) => { await clickCard(page, 1); await clickCard(page, 2, ['Shift']); await clickCard(page, 3, ['Shift']); }],
  ['Cmd-click', async (page) => { await clickCard(page, 1); await clickCard(page, 2, ['Meta']); await clickCard(page, 3, ['Meta']); }],
  ['Ctrl-click', async (page) => { await clickCard(page, 1); await clickCard(page, 2, ['Control']); await clickCard(page, 3, ['Control']); }],
  ['lasso', lassoReview],
];

for (const [name, select] of WAYS) {
  test(`Z fits every node selected by ${name}`, async ({ page }) => {
    await openBoard(page);
    await select(page);
    expect(await selectedIds(page)).toEqual(SET.map(String));
    await page.keyboard.press('z');
    await expectFilled(page, SET);
  });

  test(`Z fits every node selected by ${name}, with focus on one of them`, async ({ page }) => {
    await openBoard(page);
    await select(page);
    await card(page, 2).focus();
    await page.keyboard.press('z');
    await expectFilled(page, SET);
  });

  test(`Z fits every node selected by ${name}, with focus on a mark`, async ({ page }) => {
    await openBoard(page);
    await select(page);
    await card(page, 2).locator('button').first().focus();
    await page.keyboard.press('z');
    await expectFilled(page, SET);
  });

  test(`Z fits every node selected by ${name}, with focus on a container's title line`, async ({ page }) => {
    await openBoard(page);
    await select(page);
    await frame(page, 'review').locator('.vb-region-head h2').evaluate((e: HTMLElement) => { e.tabIndex = -1; e.focus(); });
    await page.keyboard.press('z');
    await expectFilled(page, SET);
  });

  test(`Z fits every node selected by ${name}, with focus in the selection bar`, async ({ page }) => {
    await openBoard(page);
    await select(page);
    await openSelectionBar(page);
    await bar(page).getByRole('button', { name: 'Comment' }).focus();
    await page.keyboard.press('z');
    await expectFilled(page, SET);
  });
}

test('Z fits a selection across containers, and one node', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 1);
  await clickCard(page, 13, ['Shift']);
  await page.keyboard.press('z');
  await expectFilled(page, [1, 13]);
  await clickCard(page, 2);
  await page.keyboard.press('z');
  await expectFilled(page, [2], false);
});

test('a container zoomed by Z with its title line focused, nothing selected, fits the container', async ({ page }) => {
  await openBoard(page);
  await frame(page, 'review').locator('.vb-region-head h2').click();
  await page.keyboard.press('z');
  await expect.poll(async () => {
    const [s, f] = [(await page.locator(bid('stage')).boundingBox())!, (await frame(page, 'review').boundingBox())!];
    return Math.abs(f.x + f.width / 2 - (s.x + s.width / 2));
  }).toBeLessThan(3);
});
