// The node's edges on a real board (nodeEdges flag, D-099; FE_02): each mark does what it shows, by pointer and by key.
// The number bookmarks at once and, held, opens its menu instead; the disc opens Tick and Cross beside it, a second
// click closes them and a double click never answers; nothing opens on hover; tips show after a deliberate hover and
// at once on keyboard focus; the badge and H open history; the notes mark opens the conversation; right-click and
// Shift+F10 list a node's actions. Menus are one at a time, keep one size and stay attached while the board zooms or
// pans. On a board of its own, light and dark. The container seen, the icon library, the skin and the moments are in
// node-edges-seen.spec.ts.
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { card, open, write } from './agent-board.ts';
import { drawEdges, mark, menuOf } from './edge-board.ts';
import type { Page } from '@playwright/test';
import { head, idle, linesAfter, stageBox } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];
const FLAGS = '?vbwork&flags=nodeEdges';
const lines = async (page: Page, after: number, action: string) => (await linesAfter(page, after)).filter((e) => e.action === action);

test('the number: a click bookmarks at once; held, it opens its menu and bookmarks nothing; Shift+F10 opens it too', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q] = d.n as [number];
  const before = await head(page);
  await mark(page, q, 'number').click();
  await expect(mark(page, q, 'number')).toHaveAttribute('aria-pressed', 'true');
  expect(await lines(page, before, 'bookmark')).toHaveLength(1);
  // Held past 400 ms: the menu, and the release bookmarks nothing.
  const b = (await mark(page, q, 'number').boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await expect(menuOf(page, `Item ${q}`)).toBeVisible();
  await page.mouse.up();
  await idle(page);
  await expect(mark(page, q, 'number')).toHaveAttribute('aria-pressed', 'true');
  expect(await lines(page, before, 'unbookmark')).toEqual([]);
  await expect(menuOf(page, `Item ${q}`).getByRole('menuitem')).toHaveText([/Remove bookmark/, /Save for later/]);
  await page.keyboard.press('Escape');
  await expect(page.locator('.vb-mark-menu')).toHaveCount(0);
  await expect(mark(page, q, 'number')).toBeFocused();
  // From the keyboard: Shift+F10 on the number, then a row by Enter.
  await page.keyboard.press('Shift+F10');
  await expect(menuOf(page, `Item ${q}`)).toBeVisible();
  await expect(menuOf(page, `Item ${q}`).getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(mark(page, q, 'number')).toHaveAttribute('aria-pressed', 'false');
  // B on the node does the same.
  await card(page, q).focus();
  await page.keyboard.press('b');
  await expect(mark(page, q, 'number')).toHaveAttribute('aria-pressed', 'true');
});

test('the disc: a click opens Tick and Cross beside it, never on it; a second click closes them; a double click never answers', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q] = d.n as [number];
  const disc = mark(page, q, 'answer');
  const picker = menuOf(page, `Answer item ${q}`);
  const before = await head(page);
  await disc.click();
  await expect(picker).toBeVisible();
  await expect(disc).toHaveAttribute('aria-expanded', 'true');
  const [db, pb] = [(await disc.boundingBox())!, (await picker.boundingBox())!];
  expect(pb.x).toBeGreaterThanOrEqual(db.x + db.width);
  await expect(picker.getByRole('menuitem', { name: 'Tick (A)' })).toBeFocused();
  // Left and Right move along the picker, wrapping.
  await page.keyboard.press('ArrowRight');
  await expect(picker.getByRole('menuitem', { name: 'Cross (X)' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(picker.getByRole('menuitem', { name: 'Tick (A)' })).toBeFocused();
  await disc.click();
  await expect(picker).toHaveCount(0);
  await disc.dblclick();
  await idle(page);
  await expect(picker).toHaveCount(0);
  expect(await lines(page, before, 'ack')).toEqual([]);
  // Tick: the same act the footer's button wrote, and the disc fills.
  await disc.click();
  await picker.getByRole('menuitem', { name: 'Tick (A)' }).click();
  await expect(disc).toHaveAttribute('data-answer', 'ticked');
  expect(await lines(page, before, 'ack')).toHaveLength(1);
  // On an answered node the picker changes the answer.
  await disc.click();
  await picker.getByRole('menuitem', { name: 'Cross (X)' }).click();
  await expect(disc).toHaveAttribute('data-answer', 'crossed');
});

test('nothing opens on hover; a tip shows after a deliberate hover, and at once on keyboard focus', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q] = d.n as [number];
  const tip = page.locator('.vb-mark-tip');
  await mark(page, q, 'answer').hover();
  await page.waitForTimeout(800);
  await expect(page.locator('.vb-mark-menu')).toHaveCount(0);
  await expect(tip).toBeHidden();
  await expect(tip).toHaveText('Tick · A  Cross · X', { timeout: 3000 });
  await expect(tip).toBeVisible();
  await page.mouse.move(5, 5);
  await expect(tip).toBeHidden();
  // A click focuses the mark without its tip; Tab brings it at once.
  await card(page, q).focus();
  await page.keyboard.press('Tab');
  await expect(mark(page, q, 'number')).toBeFocused();
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText(`Bookmark · B`);
});

test('the change badge and H open the history box; Esc closes it and gives focus back; the notes mark opens the conversation', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q] = d.n as [number];
  await write(request, d, [{ type: 'node', n: q, node: { region: 'p', kind: 'question', title: 'Book the second truck today?' } }]);
  const badge = mark(page, q, 'badge');
  await expect(badge).toBeVisible();
  const box = card(page, q).locator('.vb-card-pop[data-pop="history"]');
  await badge.click();
  await expect(box).toHaveAttribute('data-open', '');
  await expect(box.locator('.vb-history-row').first()).toBeVisible();
  await expect(box).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(box).not.toHaveAttribute('data-open', '');
  await expect(badge).toBeFocused();
  await card(page, q).focus();
  await page.keyboard.press('h');
  await expect(box).toHaveAttribute('data-open', '');
  await page.keyboard.press('Escape');
  // The notes mark: the conversation (today's thread, until FE_03).
  await mark(page, q, 'notes').click();
  await expect(page.locator('vb-note-bubble')).toBeVisible();
});

test('right-click lists a node\'s actions at the pointer, never on the background; Shift+F10 on the node does too', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q, f] = d.n as [number, number];
  const b = (await card(page, q).boundingBox())!;
  await page.mouse.click(b.x + 60, b.y + b.height - 20, { button: 'right' });
  const list = menuOf(page, `Actions on item ${q}`);
  await expect(list).toBeVisible();
  const lb = (await list.boundingBox())!;
  expect(Math.abs(lb.x - (b.x + 60))).toBeLessThan(2);
  await expect(list.getByRole('menuitem')).toHaveText([/Tick\s*A/, /Cross\s*X/, /Comment\s*C/, /Bookmark\s*B/, /Save for later\s*L/, /History\s*H/]);
  await page.keyboard.press('Escape');
  // A node that only tells: no Tick or Cross.
  await card(page, f).focus();
  await page.keyboard.press('Shift+F10');
  await expect(menuOf(page, `Actions on item ${f}`).getByRole('menuitem')).toHaveText([/Comment/, /Bookmark/, /Save for later/, /History/]);
  await page.keyboard.press('Escape');
  await expect(card(page, f)).toBeFocused();
  // The background keeps the browser's own menu: the board opens none.
  const s = await stageBox(page);
  await page.mouse.click(s.x + s.width - 30, s.y + s.height - 30, { button: 'right' });
  await expect(page.locator('.vb-mark-menu')).toHaveCount(0);
  // A row acts: History opens the box.
  await page.mouse.click(b.x + 60, b.y + b.height - 20, { button: 'right' });
  await list.getByRole('menuitem', { name: /History/ }).click();
  await expect(card(page, q).locator('.vb-card-pop[data-pop="history"]')).toHaveAttribute('data-open', '');
});

test('one menu at a time; it keeps one size and stays attached while the board zooms and pans', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q] = d.n as [number];
  const disc = mark(page, q, 'answer');
  const picker = menuOf(page, `Answer item ${q}`);
  await disc.click();
  const size = (await picker.boundingBox())!;
  const s = await stageBox(page);
  // Zoom in at the stage's middle: the picker keeps its size and its place beside the disc.
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -300);
  await page.keyboard.up('Control');
  await expect.poll(async () => (await disc.boundingBox())!.width).toBeGreaterThan(26);
  await expect(picker).toBeVisible();
  const [db, pb] = [(await disc.boundingBox())!, (await picker.boundingBox())!];
  expect([Math.round(pb.width), Math.round(pb.height)]).toEqual([Math.round(size.width), Math.round(size.height)]);
  expect(Math.abs(pb.x - (db.x + db.width + 6))).toBeLessThan(2);
  // A pan (a drag on the background) leaves it open and it follows.
  await page.mouse.move(s.x + 20, s.y + s.height - 20);
  await page.mouse.down();
  await page.mouse.move(s.x + 120, s.y + s.height - 60, { steps: 5 });
  await page.mouse.up();
  await expect(picker).toBeVisible();
  const [db2, pb2] = [(await disc.boundingBox())!, (await picker.boundingBox())!];
  expect(Math.abs(pb2.x - (db2.x + db2.width + 6))).toBeLessThan(2);
  // Another menu closes it (the node's actions, from the keyboard); a click outside closes that.
  await card(page, q).focus();
  await page.keyboard.press('Shift+F10');
  await expect(page.locator('.vb-mark-menu')).toHaveCount(1);
  await expect(picker).toHaveCount(0);
  await page.mouse.click(s.x + s.width - 30, s.y + s.height - 30);
  await expect(page.locator('.vb-mark-menu')).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`axe passes with the picker open and a tip shown (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    const d = await drawEdges(request);
    await open(page, d, FLAGS);
    const [q] = d.n as [number];
    await mark(page, q, 'answer').click();
    await expect(menuOf(page, `Answer item ${q}`)).toBeVisible();
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
    await card(page, q).focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('.vb-mark-tip')).toBeVisible();
    await expectNoAxeViolations(page);
  });
}
