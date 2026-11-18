// The selection bar (D-099 9, FE_06): Bookmark all, Save for later and Width each write
// one act per selected node; Comment on the selection opens the conversation box with Ask now; the bar steps aside for a
// node's open menu; Z fits the selection. On a board of its own (edge-board.ts).
import type { Page } from '@playwright/test';
import { expect, openSelectionBar, setTheme, test } from './helpers.ts';
import { bar } from './board-page.ts';
import { card, open } from './agent-board.ts';
import { drawEdges, menuOf } from './edge-board.ts';
import { head, linesAfter } from './board-page.ts';

const FLAGS = '?vbwork';
const buttons = (page: Page) => bar(page).getByRole('button').allInnerTexts();
const lines = async (page: Page, after: number, action: string) => (await linesAfter(page, after)).filter((e) => e.action === action);

async function selectThree(page: Page, n: number[]): Promise<void> {
  await card(page, n[0]!).locator('.vb-node-title').click({ position: { x: 4, y: 4 } });
  for (const i of [1, 2]) await card(page, n[i]!).locator('.vb-node-title').click({ modifiers: ['Shift'], position: { x: 4, y: 4 } });
  await openSelectionBar(page);
}

test('the bar offers Bookmark all, Save for later and Width before Zoom', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  await selectThree(page, d.n);
  const b = await buttons(page);
  expect(b.slice(-4)).toEqual(['Bookmark all', 'Save for later', 'Width', 'Zoom']);
});

test('Bookmark all writes one bookmark per node, then reads Remove bookmarks and writes one unbookmark per node', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  await selectThree(page, d.n);
  const before = await head(page);
  await bar(page).getByRole('button', { name: /Bookmark the selected/ }).click();
  await expect.poll(async () => (await lines(page, before, 'bookmark')).length).toBe(3);
  await openSelectionBar(page);
  // The button says "Remove bookmarks"; its accessible name is its tooltip, which says the whole.
  await expect(bar(page).getByText('Remove bookmarks', { exact: true })).toBeVisible();
  const mid = await head(page);
  await bar(page).getByRole('button', { name: /Remove the bookmarks/ }).click();
  await expect.poll(async () => (await lines(page, mid, 'unbookmark')).length).toBe(3);
});

test('Width lists S, M, L and Auto; a pick writes one size act per node', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  await selectThree(page, d.n);
  const before = await head(page);
  await bar(page).getByRole('button', { name: 'Width' }).click();
  const menu = page.getByRole('menu', { name: 'Width of 3 nodes' });
  await expect(menu.getByRole('menuitem')).toHaveText(['S', 'M', 'L', 'Auto']);
  await menu.getByRole('menuitem', { name: 'Large' }).click();
  await expect.poll(async () => (await lines(page, before, 'size')).length).toBe(3);
  expect((await lines(page, before, 'size')).every((e) => e.size === 'l')).toBe(true);
});

test('Save for later writes one later act per node', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  await selectThree(page, d.n);
  const before = await head(page);
  await bar(page).getByRole('button', { name: /Save the selected/ }).click();
  await expect.poll(async () => (await lines(page, before, 'later')).length).toBe(3);
});

test('Comment on the selection opens the conversation box beside it with Ask now; Add note writes one note on the group', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  await selectThree(page, d.n);
  await bar(page).getByRole('button', { name: 'Comment' }).click();
  const box = page.locator('vb-note-bubble[data-mode="conversation"]');
  await expect(box).toBeVisible();
  await expect(box.getByRole('button', { name: 'Ask now' })).toBeVisible();
  const [bb, first] = [(await box.boundingBox())!, (await card(page, d.n[0]!).boundingBox())!];
  expect(bb.x >= first.x + first.width - 1 || bb.y >= first.y + first.height - 1).toBe(true);
  const before = await head(page);
  await box.getByRole('textbox').fill('Check all three');
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await lines(page, before, 'comment')).length).toBe(1);
  expect((await lines(page, before, 'comment'))[0]!.nodes).toHaveLength(3);
});

test('the bar steps aside while a node\'s right-click list is open, and comes back', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  await selectThree(page, d.n);
  await expect(bar(page)).toBeVisible();
  const b = (await card(page, d.n[1]!).boundingBox())!;
  await page.mouse.click(b.x + 60, b.y + b.height - 20, { button: 'right' });
  await expect(menuOf(page, /Actions on item/)).toBeVisible();
  await expect(bar(page)).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(bar(page)).toBeVisible();
});

test('Z fits the selection with the edges on', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  await selectThree(page, d.n);
  await page.keyboard.press('z');
  await expect.poll(async () => {
    const s = (await page.locator('.vb-stage').boundingBox())!;
    const bs = await Promise.all(d.n.slice(0, 3).map(async (n) => (await card(page, n).boundingBox())!));
    const [x, r] = [Math.min(...bs.map((c) => c.x)), Math.max(...bs.map((c) => c.x + c.width))];
    return Math.abs((x + r) / 2 - (s.x + s.width / 2)) < 3 && r - x > s.width * 0.3;
  }).toBe(true);
});

// Looks for the task's review: set VB_FE06_SHOTS to a folder and the bar, its Width list and the conversation box are saved there, light and dark.
const SHOTS = process.env.VB_FE06_SHOTS;
for (const theme of ['dark', 'light'] as const) {
  test(`looks (${theme})`, async ({ page, request }) => {
    test.skip(!SHOTS, 'only when VB_FE06_SHOTS names a folder');
    const d = await drawEdges(request);
    await setTheme(page, theme);
    await open(page, d, FLAGS);
    const stage = page.locator('.vb-stage');
    await card(page, d.n[0]!).locator('.vb-node-title').click({ position: { x: 4, y: 4 } });
    await openSelectionBar(page);
    await stage.screenshot({ path: `${SHOTS}/one-node-${theme}.png` });
    await card(page, d.n[1]!).locator('.vb-node-title').click({ modifiers: ['Shift'], position: { x: 4, y: 4 } });
    await card(page, d.n[2]!).locator('.vb-node-title').click({ modifiers: ['Shift'], position: { x: 4, y: 4 } });
    await openSelectionBar(page);
    await stage.screenshot({ path: `${SHOTS}/three-nodes-${theme}.png` });
    await bar(page).getByRole('button', { name: 'Width' }).click();
    await stage.screenshot({ path: `${SHOTS}/width-list-${theme}.png` });
    await page.keyboard.press('Escape');
    await bar(page).getByRole('button', { name: 'Comment' }).click();
    await stage.screenshot({ path: `${SHOTS}/ask-box-${theme}.png` });
  });
}
