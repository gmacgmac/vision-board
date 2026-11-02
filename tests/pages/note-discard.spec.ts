// Unsaved words in a note bubble are never lost silently (3_FE_04 step 4G ruling 4), on a card
// and on a container alike: Esc, Cancel or opening another bubble with changed text asks
// "Discard your changes?" through the confirm dialog; Cancel keeps the words, Discard drops them,
// and unchanged text closes without asking. Nothing is written. Runs on the containers board
// (frames-board.ts), on cards and containers with no note. With the leavePrompt flag the page's tab
// asks too (M11, page-host.ts `guardLeave`): a close with changed words gets the browser's own
// "Leave site?" prompt; unchanged, discarded, or with the flag off, it closes without asking.
import type { Page } from '@playwright/test';
import { expect, test, bid } from './helpers.ts';
import { agentWrite, bubble, card, comment, discard, ensureBoard, fx, head, linesAfter, openFrames, text } from './frames-board.ts';
import { menuButton } from './board-page.ts';

test.beforeEach(async ({ page, request }, info) => {
  await page.goto('/?setup');
  await ensureBoard(request, info.workerIndex);
});

test('a card bubble with changed words asks before it closes: Cancel keeps them, Discard drops them; unchanged closes at once', async ({ page }) => {
  await openFrames(page);
  const before = await head(page);
  await card(page, 'p2').focus();
  await page.keyboard.press('c');
  await expect(text(page)).toBeFocused();
  await page.keyboard.type('Half a thought');
  await page.keyboard.press('Escape');
  await expect(discard(page)).toBeVisible();
  await expect(discard(page)).toContainText('Changes will be lost.');
  await discard(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(discard(page)).toBeHidden();
  await expect(text(page)).toBeFocused();
  await expect(text(page)).toHaveValue('Half a thought');
  await page.keyboard.press('Escape');
  await discard(page).getByRole('button', { name: 'Discard' }).click();
  await expect(bubble(page)).toBeHidden();
  // Unchanged words close without asking.
  await card(page, 'p2').focus();
  await page.keyboard.press('c');
  await expect(text(page)).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(bubble(page)).toBeHidden();
  await expect(discard(page)).toBeHidden();
  expect(await head(page)).toBe(before);
});

test('a container bubble with changed words asks on Cancel and before another bubble opens over it', async ({ page }) => {
  await openFrames(page);
  const before = await head(page);
  await comment(page, 'Risks').click();
  await text(page).fill('Draft');
  await bubble(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(discard(page)).toBeVisible();
  await discard(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(text(page)).toBeFocused();
  await expect(text(page)).toHaveValue('Draft');
  // Opening another bubble asks first: Cancel keeps this one, Discard opens the other.
  await comment(page, 'Plan').click();
  await expect(discard(page)).toBeVisible();
  await discard(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(bubble(page)).toHaveAttribute('aria-label', 'Note on container Risks');
  await expect(text(page)).toHaveValue('Draft');
  await comment(page, 'Plan').click();
  await discard(page).getByRole('button', { name: 'Discard' }).click();
  await expect(bubble(page)).toHaveAttribute('aria-label', 'Note on container Plan');
  await expect(text(page)).toHaveValue('');
  await page.keyboard.press('Escape');
  await expect(bubble(page)).toBeHidden();
  expect(await head(page)).toBe(before);
});

/** Close the tab as a person does (`beforeunload` runs); the dialogs it raised, each dismissed (the tab stays). */
async function closeTab(page: Page): Promise<string[]> {
  const asked: string[] = [];
  page.on('dialog', (d) => { asked.push(d.type()); void d.dismiss(); });
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => asked.length > 0 || page.isClosed()).toBe(true);
  return asked;
}

test('a tab close asks while a note holds changed words (leavePrompt flag); unchanged, discarded or with the flag off it closes', async ({ page, context }) => {
  await openFrames(page);
  const before = await head(page);
  await card(page, 'p2').focus();
  await page.keyboard.press('c');
  await page.keyboard.type('Half a thought');
  expect(await closeTab(page)).toEqual(['beforeunload']);
  expect(page.isClosed()).toBe(false);
  await expect(text(page)).toHaveValue('Half a thought');
  // Discarded: the guard goes with the words, and the tab closes without asking.
  await text(page).focus();
  await page.keyboard.press('Escape');
  await discard(page).getByRole('button', { name: 'Discard' }).click();
  await expect(bubble(page)).toBeHidden();
  expect(await head(page)).toBe(before);
  expect(await closeTab(page)).toEqual([]);
  expect(page.isClosed()).toBe(true);

  // An open note with nothing typed, and changed words with the flag off: no prompt.
  for (const [flags, words] of [['', ''], ['&flags=-leavePrompt', 'Half a thought']] as const) {
    const tab = await context.newPage();
    await tab.goto(`/?frames${flags}#${fx.board}`);
    await card(tab, 'p2').focus();
    await tab.keyboard.press('c');
    await expect(text(tab)).toBeFocused();
    if (words) await tab.keyboard.type(words);
    expect(await closeTab(tab), flags || 'unchanged').toEqual([]);
  }
});

test('choosing another board with changed words asks first: Cancel keeps this board and the words, Discard switches', async ({ page }) => {
  await openFrames(page);
  const before = await head(page);
  await card(page, 'p2').focus();
  await page.keyboard.press('c');
  await page.keyboard.type('Half a thought');
  await page.locator(bid('board')).selectOption('roadmap');
  await expect(discard(page)).toBeVisible();
  await discard(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(text(page)).toBeFocused();
  await expect(text(page)).toHaveValue('Half a thought');
  await expect(page.locator(bid('board')), 'the picker shows the board still open').toHaveValue(fx.board);
  await expect(page.locator('vb-node')).toHaveCount(7);
  await page.keyboard.type('!');
  await expect(text(page)).toHaveValue('Half a thought!');
  await page.locator(bid('board')).selectOption('roadmap');
  await discard(page).getByRole('button', { name: 'Discard' }).click();
  await expect(page.locator(bid('board'))).toHaveValue('roadmap');
  await expect(bubble(page)).toBeHidden();
  // Unchanged words never ask: back to the first board at once.
  await page.locator('vb-node').first().focus();
  await page.keyboard.press('c');
  await expect(text(page)).toBeFocused();
  await page.locator(bid('board')).selectOption(fx.board);
  await expect(page.locator('vb-node')).toHaveCount(7);
  await expect(discard(page)).toBeHidden();
  expect(await head(page)).toBe(before);
});

// The person's own act that would take the note's card away asks first (point 309): Hide answered,
// Remove card and Archive board. A hide that leaves the note's card, or unchanged words, never asks.
const confirmOk = (page: Page) => page.locator('#confirm-dialog #confirm-ok');
const hideRow = async (page: Page) => { await menuButton(page).click(); await page.locator(bid('hide')).click(); };

test('Hide answered over a note being written on an answered card asks: Cancel hides nothing, Discard hides it; on an open card it never asks', async ({ page }) => {
  await openFrames(page);
  await card(page, 'p1').focus();
  await page.keyboard.press('a');
  await expect(card(page, 'p1')).toHaveAttribute('data-status', /acknowledged|answered/);
  await card(page, 'p1').focus();
  await page.keyboard.press('c');
  await page.keyboard.type('Half a thought');
  await hideRow(page);
  await expect(discard(page)).toBeVisible();
  await discard(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(text(page)).toBeFocused();
  await expect(text(page)).toHaveValue('Half a thought');
  await expect(page.locator('vb-node:visible')).toHaveCount(7);
  await hideRow(page);
  await discard(page).getByRole('button', { name: 'Discard' }).click();
  await expect(page.locator('vb-node:visible')).toHaveCount(6);
  await expect(bubble(page)).toBeHidden();
  await hideRow(page);
  await expect(page.locator('vb-node:visible')).toHaveCount(7);
  // Words on a card the hide leaves: no question, the note stays open.
  await card(page, 'p2').focus();
  await page.keyboard.press('c');
  await page.keyboard.type('Still here');
  await hideRow(page);
  await expect(page.locator('vb-node:visible')).toHaveCount(6);
  await expect(discard(page)).toBeHidden();
  await expect(text(page)).toHaveValue('Still here');
});

test('Remove card and Archive board with a note being written on it ask about the words too: Cancel keeps card, board and words', async ({ page }) => {
  await openFrames(page);
  const before = await head(page);
  await card(page, 'p2').focus();
  await page.keyboard.press('c');
  await page.keyboard.type('Half a thought');
  await card(page, 'p2').locator('.vb-node-title').click();
  await page.keyboard.press('Delete');
  await confirmOk(page).click();
  await expect(discard(page)).toBeVisible();
  await discard(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(text(page)).toBeFocused();
  await expect(text(page)).toHaveValue('Half a thought');
  await expect(page.locator('vb-node:visible')).toHaveCount(7);
  const wrote = async () => (await linesAfter(page, before)).filter((l) => l.type !== 'seen').map((l) => l.type);
  expect(await wrote(), 'nothing removed').toEqual([]);

  await menuButton(page).click();
  await page.locator(bid('archive-board')).click();
  await confirmOk(page).click();
  await expect(discard(page)).toBeVisible();
  await discard(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(text(page)).toHaveValue('Half a thought');
  await expect(page.locator(bid('board'))).toHaveValue(fx.board);
  expect(await wrote(), 'nothing archived').toEqual([]);

  await card(page, 'p2').locator('.vb-node-title').click();
  await page.keyboard.press('Delete');
  await confirmOk(page).click();
  await discard(page).getByRole('button', { name: 'Discard' }).click();
  await expect(page.locator('vb-node:visible')).toHaveCount(6);
  await expect(bubble(page)).toBeHidden();
});

test('a past version chosen with a note being written asks first: Cancel stays on now with the words, Discard shows it', async ({ page, request }) => {
  await agentWrite(request, [{ type: 'node', key: 'v2', node: { region: 'plan', kind: 'question', title: 'One more?' } }]);
  await page.goto(`/?frames#${fx.board}`);
  const version = page.locator(bid('version'));
  await expect(version.locator('option')).not.toHaveCount(1);
  await card(page, 'p1').focus();
  await page.keyboard.press('c');
  await page.keyboard.type('Half a thought');
  await version.selectOption({ index: 1 });
  await expect(discard(page)).toBeVisible();
  await discard(page).getByRole('button', { name: 'Cancel' }).click();
  await expect(text(page)).toBeFocused();
  await expect(text(page)).toHaveValue('Half a thought');
  await expect(page.locator('.vb-banner')).toBeHidden();
  await expect(version).toHaveValue('now');
  await version.selectOption({ index: 1 });
  await discard(page).getByRole('button', { name: 'Discard' }).click();
  await expect(page.locator('.vb-banner')).toBeVisible();
  await expect(bubble(page)).toBeHidden();
});
