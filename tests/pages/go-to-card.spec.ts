// Go to a card by typing its number (cortex-tasks/board/2026-10-15_board-app_go-to-card-number.md,
// goToCard flag): a digit typed on the board opens the "Go to card" box at the bottom right; Enter
// selects and focuses the card, panning only when it is off screen (FE_05's `revealPan`), the zoom
// kept; "No card 99" keeps the box open; a retired card offers its last version; Esc closes and
// Backspace edits; digits in a note's text field are text. Nothing goes by itself unless the
// goAfterPause flag is on. Each test draws a board of its own (agent-board.ts).
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import type { Drawn } from './agent-board.ts';
import { act, card, draw, open, write } from './agent-board.ts';

const THEMES: Theme[] = ['dark', 'light'];
const field = (page: Page) => page.getByRole('textbox', { name: 'Go to card' });
const goBox = (page: Page) => page.locator('.vb-go');
const said = (page: Page) => goBox(page).getByRole('status');
const scale = (page: Page) => page.locator('.vb-world').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a);
const world = (page: Page) => page.locator('.vb-world').evaluate((e) => getComputedStyle(e).transform);
const stageBox = async (page: Page) => (await page.locator('#stage').boundingBox())!;

/** A board of its own with `count` cards, open in a 1000 by 600 window. */
async function drawOpen(page: Page, request: APIRequestContext, count: number, query = ''): Promise<Drawn> {
  const d = await draw(request, count, 'go');
  await page.setViewportSize({ width: 1000, height: 600 });
  await open(page, d, query);
  return d;
}

/** Pan the board by (dx, dy) screen pixels with the wheel, as a person scrolls. */
async function panBy(page: Page, dx: number, dy: number): Promise<void> {
  const s = await stageBox(page);
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  const before = await world(page);
  await page.mouse.wheel(-dx, -dy);
  await expect.poll(() => world(page)).not.toBe(before);
}

/** Whether card `n` shows whole on the stage, or any of it. */
async function shows(page: Page, n: number, whole = true): Promise<boolean> {
  const [s, b] = [await stageBox(page), (await card(page, n).boundingBox())!];
  return whole ? b.y >= s.y && b.y + b.height <= s.y + s.height && b.x >= s.x && b.x + b.width <= s.x + s.width
    : b.y < s.y + s.height && b.y + b.height > s.y && b.x < s.x + s.width && b.x + b.width > s.x;
}

const selected = (page: Page) => page.locator('vb-node[data-selected]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id));

test('type 1 2 Enter: card 12, off screen, is selected and focused, panned in, the zoom unchanged', async ({ page, request }) => {
  await drawOpen(page, request, 14);
  for (let i = 0; i < 2; i += 1) await page.keyboard.press('+');
  await card(page, 1).focus();
  const s = await stageBox(page);
  await panBy(page, 0, s.y + s.height + 40 - (await card(page, 12).boundingBox())!.y);
  expect(await shows(page, 12, false)).toBe(false);
  const k = await scale(page);
  await page.keyboard.press('1');
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveValue('1');
  await page.keyboard.press('2');
  await expect(field(page)).toHaveValue('12');
  // At the board's bottom right.
  const b = (await goBox(page).boundingBox())!;
  expect(b.x + b.width).toBeGreaterThan(s.x + s.width * 0.75);
  expect(b.y + b.height).toBeGreaterThan(s.y + s.height * 0.75);
  await page.keyboard.press('Enter');
  await expect(goBox(page)).toHaveCount(0);
  await expect(card(page, 12)).toBeFocused();
  expect(await selected(page)).toEqual(['12']);
  await expect.poll(() => shows(page, 12)).toBe(true);
  expect(await scale(page)).toBeCloseTo(k, 6);
  // Z then zooms to it.
  await page.keyboard.press('z');
  await expect.poll(() => scale(page)).toBeGreaterThan(k);
});

test('a card already on screen: no pan, with or without a card focused first', async ({ page, request }) => {
  await drawOpen(page, request, 6);
  // Zoomed out, every card sits well inside the stage.
  for (let i = 0; i < 2; i += 1) await page.keyboard.press('-');
  const before = await world(page);
  await page.keyboard.press('3');
  await page.keyboard.press('Enter');
  await expect(card(page, 3)).toBeFocused();
  expect(await selected(page)).toEqual(['3']);
  await page.keyboard.press('5');
  await page.keyboard.press('Enter');
  await expect(card(page, 5)).toBeFocused();
  expect(await selected(page)).toEqual(['5']);
  await page.waitForTimeout(100);
  expect(await world(page)).toBe(before);
});

test('No card 99 keeps the box open; Backspace edits; Esc closes with focus back where it was', async ({ page, request }) => {
  await drawOpen(page, request, 6);
  await card(page, 2).focus();
  await page.keyboard.type('99');
  await page.keyboard.press('Enter');
  await expect(said(page)).toHaveText('No card 99');
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveValue('99');
  await expect(card(page, 2)).not.toHaveAttribute('data-selected');
  // Letters never show; Backspace takes digits off; typing again clears what it said.
  await page.keyboard.type('x');
  await expect(field(page)).toHaveValue('99');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await expect(field(page)).toHaveValue('');
  await page.keyboard.press('4');
  await expect(said(page)).toHaveText('');
  // Esc: closed, nothing went, focus back on card 2.
  await page.keyboard.press('Escape');
  await expect(goBox(page)).toHaveCount(0);
  await expect(card(page, 2)).toBeFocused();
  expect(await selected(page)).toEqual([]);
  // A click elsewhere closes it too.
  await page.keyboard.press('6');
  await expect(field(page)).toBeFocused();
  await card(page, 1).locator('.vb-node-title').click({ position: { x: 4, y: 4 } });
  await expect(goBox(page)).toHaveCount(0);
});

test('inside a note\'s text field digits are text; the box does not open', async ({ page, request }) => {
  await drawOpen(page, request, 3);
  await card(page, 1).focus();
  await page.keyboard.press('c');
  const text = page.locator('textarea:visible').first();
  await expect(text).toBeFocused();
  await page.keyboard.type('12');
  await expect(text).toHaveValue('12');
  await expect(goBox(page)).toHaveCount(0);
});

test('a retired card says it was removed and offers its last version; the offer, by keyboard, opens it and goes there', async ({ page, request }) => {
  const d = await draw(request, 4, 'go');
  await page.goto('/?setup');
  await act(page, d, { action: 'ack', n: 1, ver: 1 }); // the agent's next write is a new version of the board
  await page.setViewportSize({ width: 1000, height: 600 });
  await open(page, d);
  await write(request, d, [{ type: 'retire', n: 2 }]);
  await expect(page.locator('vb-node')).toHaveCount(3);
  await page.keyboard.press('2');
  await page.keyboard.press('Enter');
  await expect(said(page)).toHaveText('Card 2 was removed');
  const offer = goBox(page).getByRole('button', { name: /^Show v\d+, where it last appeared$/ });
  await expect(offer).toHaveText(/^Show v\d+$/);
  await page.keyboard.press('Tab');
  await expect(offer).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.vb-banner')).toBeVisible();
  await expect(page.locator('vb-node')).toHaveCount(4);
  await expect(goBox(page)).toHaveCount(0);
  await expect(card(page, 2)).toBeFocused();
  expect(await selected(page)).toEqual(['2']);
});

test('nothing goes by itself; with the goAfterPause flag a pause after the last digit goes', async ({ page, request }) => {
  await drawOpen(page, request, 4);
  await page.keyboard.press('3');
  await page.waitForTimeout(1500);
  await expect(field(page)).toHaveValue('3');
  await expect(card(page, 3)).not.toBeFocused();
  await page.keyboard.press('Escape');
  const d = await draw(request, 4, 'go');
  await open(page, d, '?flags=goAfterPause');
  await page.keyboard.press('3');
  await expect(card(page, 3)).toBeFocused({ timeout: 3000 });
  await expect(goBox(page)).toHaveCount(0);
});

test('with the goToCard flag off a digit does nothing, and the key list leaves it out', async ({ page, request }) => {
  const d = await draw(request, 3, 'go');
  await open(page, d, '?flags=-goToCard');
  await page.keyboard.press('2');
  await page.waitForTimeout(100);
  await expect(goBox(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Key commands' }).hover();
  await expect(page.locator('.vb-keys-tip [data-row="command:go-to-card"]')).toHaveCount(0);
});

test('the key list names it under Board, 0–9', async ({ page, request }) => {
  await drawOpen(page, request, 2);
  await page.getByRole('button', { name: 'Key commands' }).hover();
  const row = page.locator('.vb-keys-tip [data-row="command:go-to-card"]');
  await expect(row).toHaveText(/^Go to a card by its number\s*0–9$/);
});

for (const theme of THEMES) {
  test(`axe passes with the box open, after No card 99 and on a retired card (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    const d = await draw(request, 4, 'go');
    await page.goto('/?setup');
    await act(page, d, { action: 'ack', n: 1, ver: 1 });
    await open(page, d);
    await write(request, d, [{ type: 'retire', n: 2 }]);
    await expect(page.locator('vb-node')).toHaveCount(3);
    await page.keyboard.press('1');
    await expectNoAxeViolations(page);
    await page.keyboard.press('9');
    await page.keyboard.press('Enter');
    await expect(said(page)).toHaveText('No card 19');
    await expectNoAxeViolations(page);
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('2');
    await page.keyboard.press('Enter');
    await expect(said(page)).toHaveText('Card 2 was removed');
    await expectNoAxeViolations(page);
  });

  test(`the gallery's Go to card section: axe passes and it matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    const section = page.locator('section[data-feature="goToCard"]');
    await expect(section.locator('.vb-go')).toHaveCount(3);
    await expect(section.getByRole('status')).toHaveText(['', 'No card 99', 'Card 7 was removed']);
    await expectNoAxeViolations(page);
    await expect(section).toHaveScreenshot(`go-to-card-${theme}.png`);
  });
}
