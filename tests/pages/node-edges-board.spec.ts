// The node's edges on a real board (D-099; FE_02): each mark does what it shows, by pointer and by key.
// The number bookmarks at once and, held, opens its menu instead; the disc opens Tick and Cross over it, Tick on the
// disc, on a click, Enter or Space, or the pointer resting on it, so a click without moving ticks (D-112); tips show
// after a deliberate hover and at once on keyboard focus; the badge and H open history; the notes mark opens the conversation; right-click and
// Shift+F10 list a node's actions. Menus are one at a time, keep one size and stay attached while the board zooms or
// pans. On a board of its own, light and dark. The container seen, the icon library, the skin and the moments are in
// node-edges-seen.spec.ts.
import { bid, expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { card, open, write } from './agent-board.ts';
import { drawEdges, mark, menuOf } from './edge-board.ts';
import type { Page } from '@playwright/test';
import { head, idle, linesAfter, menuButton, stageBox } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];
const FLAGS = '?vbwork';
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

/** The centre of a box. */
const mid = (b: { x: number; y: number; width: number; height: number }) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

test('the disc: a click opens Tick and Cross over it, Tick on the disc, so a click without moving ticks (D-112)', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q] = d.n as [number];
  const disc = mark(page, q, 'answer');
  const picker = menuOf(page, `Answer item ${q}`);
  const tick = picker.getByRole('menuitem', { name: 'Tick (A)' });
  const cross = picker.getByRole('menuitem', { name: 'Cross (X)' });
  const before = await head(page);
  const at = mid((await disc.boundingBox())!);
  await page.mouse.click(at.x, at.y);
  await expect(picker).toBeVisible();
  await expect(disc).toHaveAttribute('aria-expanded', 'true');
  // Tick centred on the disc, Cross on its left.
  const [tb, cb] = [(await tick.boundingBox())!, (await cross.boundingBox())!];
  expect(Math.abs(mid(tb).x - at.x)).toBeLessThan(1.5);
  expect(Math.abs(mid(tb).y - at.y)).toBeLessThan(1.5);
  expect(cb.x + cb.width).toBeLessThanOrEqual(tb.x);
  await expect(tick).toBeFocused();
  // Left and Right move as drawn: Cross is on the left, wrapping.
  await page.keyboard.press('ArrowLeft');
  await expect(cross).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(tick).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(cross).toBeFocused();
  // Esc closes it, focus back on the disc; nothing was answered.
  await page.keyboard.press('Escape');
  await expect(picker).toHaveCount(0);
  await expect(disc).toBeFocused();
  expect(await lines(page, before, 'ack')).toEqual([]);
  // Two clicks in one place: the second lands on Tick, the same act the footer's button wrote, and the disc fills.
  await page.mouse.click(at.x, at.y);
  await expect(picker).toBeVisible();
  await page.mouse.click(at.x, at.y);
  await expect(disc).toHaveAttribute('data-answer', 'ticked');
  await expect(picker).toHaveCount(0);
  expect(await lines(page, before, 'ack')).toHaveLength(1);
  // Resting on the disc after the choice opens nothing until the pointer leaves it and comes back.
  await page.waitForTimeout(700);
  await expect(picker).toHaveCount(0);
  // On an answered node the picker changes the answer; a click elsewhere closes it.
  await disc.click();
  await cross.click();
  await expect(disc).toHaveAttribute('data-answer', 'crossed');
  await disc.click();
  await expect(picker).toBeVisible();
  const s = await stageBox(page);
  await page.mouse.click(s.x + s.width - 30, s.y + s.height - 30);
  await expect(picker).toHaveCount(0);
});

test('the disc by key: Enter or Space opens the picker with focus on Tick; Enter ticks', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q] = d.n as [number];
  const disc = mark(page, q, 'answer');
  const picker = menuOf(page, `Answer item ${q}`);
  await disc.focus();
  await page.keyboard.press('Space');
  await expect(picker.getByRole('menuitem', { name: 'Tick (A)' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(disc).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(picker.getByRole('menuitem', { name: 'Tick (A)' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(disc).toHaveAttribute('data-answer', 'ticked');
});

test('resting on the disc opens the picker with Tick under the pointer; focus stays; leaving closes it; other marks keep their tips', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q] = d.n as [number];
  const disc = mark(page, q, 'answer');
  const picker = menuOf(page, `Answer item ${q}`);
  const tip = page.locator('.vb-mark-tip');
  // A pointer crossing the disc opens nothing.
  const at = mid((await disc.boundingBox())!);
  await page.mouse.move(at.x - 60, at.y + 40);
  await page.mouse.move(at.x + 60, at.y - 40, { steps: 4 });
  await page.waitForTimeout(600);
  await expect(picker).toHaveCount(0);
  // Resting opens it after the shared wait, Tick centred under the pointer; focus does not move.
  await card(page, q).focus();
  await page.mouse.move(at.x, at.y);
  await expect(picker).toBeVisible();
  const tb = (await picker.getByRole('menuitem', { name: 'Tick (A)' }).boundingBox())!;
  expect(Math.abs(mid(tb).x - at.x)).toBeLessThan(1.5);
  expect(Math.abs(mid(tb).y - at.y)).toBeLessThan(1.5);
  await expect(card(page, q)).toBeFocused();
  // The pointer leaving it closes it, after the close grace; Esc does too.
  await page.mouse.move(5, 5);
  await expect(picker).toHaveCount(0);
  await page.mouse.move(at.x, at.y);
  await expect(picker).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(picker).toHaveCount(0);
  // The number's tip still shows after a deliberate hover, and at once on keyboard focus.
  await page.mouse.move(5, 5);
  await mark(page, q, 'number').hover();
  await expect(tip).toHaveText('Bookmark · B', { timeout: 3000 });
  await page.mouse.move(5, 5);
  await expect(tip).toBeHidden();
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
  // H is the history of the one selected node too, with the focus off it, and never Hide answered; that is Shift+H (FIX_01).
  await card(page, q).locator('.vb-node-title').click();
  await expect(card(page, q)).toHaveAttribute('data-selected', '');
  await page.locator('.vb-stage').focus();
  await page.keyboard.press('h');
  await expect(box).toHaveAttribute('data-open', '');
  await page.keyboard.press('Escape');
  await expect(page.locator(bid('hide'))).toBeHidden(); // the "⋯" row, closed
  await page.keyboard.press('Shift+H');
  await menuButton(page).click();
  await expect(page.locator(bid('hide'))).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator(bid('hide')).locator('kbd')).toHaveText('Shift+H');
  await page.keyboard.press('Shift+H'); // in the menu too
  await expect(page.locator(bid('hide'))).toBeHidden();
  // The notes mark: the conversation (today's thread, until FE_03).
  await mark(page, q, 'notes').click();
  await expect(page.locator('vb-note-bubble')).toBeVisible();
  // Esc gives the focus back to the mark that opened the box or the menu (FIX_01), by pointer or by keys; C on the node, to the node.
  await page.keyboard.press('Escape');
  await expect(page.locator('vb-note-bubble')).toBeHidden();
  await expect(mark(page, q, 'notes')).toBeFocused();
  for (const name of ['notes', 'answer', 'badge']) {
    await mark(page, q, name).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Escape');
    await expect(mark(page, q, name)).toBeFocused();
  }
  await mark(page, q, 'number').focus();
  await page.keyboard.press('Shift+F10');
  await expect(menuOf(page, `Item ${q}`)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(mark(page, q, 'number')).toBeFocused();
  await card(page, q).focus();
  await page.keyboard.press('c');
  await expect(page.locator('vb-note-bubble')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card(page, q)).toBeFocused();
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
  await expect(list.getByRole('menuitem')).toHaveText([/Tick\s*A/, /Cross\s*X/, /Comment\s*C/, /Bookmark\s*B/, /Save for later\s*L/, /History\s*H/, /Width/]);
  await page.keyboard.press('Escape');
  // A node that only tells: no Tick or Cross.
  await card(page, f).focus();
  await page.keyboard.press('Shift+F10');
  await expect(menuOf(page, `Actions on item ${f}`).getByRole('menuitem')).toHaveText([/Comment/, /Bookmark/, /Save for later/, /History/, /Width/]);
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
  // Opened from the keyboard, so the pointer zooming and panning elsewhere leaves it open.
  await disc.focus();
  await page.keyboard.press('Enter');
  const size = (await picker.boundingBox())!;
  const s = await stageBox(page);
  // Zoom in at the stage's middle: the picker keeps its size and Tick stays on the disc.
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -300);
  await page.keyboard.up('Control');
  await expect.poll(async () => (await disc.boundingBox())!.width).toBeGreaterThan(26);
  await expect(picker).toBeVisible();
  const tick = picker.getByRole('menuitem', { name: 'Tick (A)' });
  const [db, pb] = [(await disc.boundingBox())!, (await picker.boundingBox())!];
  expect([Math.round(pb.width), Math.round(pb.height)]).toEqual([Math.round(size.width), Math.round(size.height)]);
  expect(Math.abs(mid((await tick.boundingBox())!).x - mid(db).x)).toBeLessThan(2);
  // A pan (a drag on the background) leaves it open and it follows.
  await page.mouse.move(s.x + 20, s.y + s.height - 20);
  await page.mouse.down();
  await page.mouse.move(s.x + 120, s.y + s.height - 60, { steps: 5 });
  await page.mouse.up();
  await expect(picker).toBeVisible();
  expect(Math.abs(mid((await tick.boundingBox())!).x - mid((await disc.boundingBox())!).x)).toBeLessThan(2);
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
