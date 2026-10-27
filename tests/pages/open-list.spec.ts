// The open cards list (open-list FE_01, openList flag, on by default): the toolbar's "N open" chip is
// a menu dropdown (shell/MenuSelect.svelte, the Containers finder's pattern) listing the open cards
// as "number · title" in board order; choosing one goes to it as Go to card does (selected,
// focused, panned in only when off screen). The chip keeps its look; with nothing open, or the flag
// off, it is the plain chip. Reading, not acting: it works in a past version and sends nothing.
// Each test draws a board of its own (agent-board.ts).
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import type { Drawn } from './agent-board.ts';
import { act, card, draw, open, tabTo, write } from './agent-board.ts';
import { idle, selected, stageBox } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];
const list = (page: Page) => page.getByLabel('Go to an open card', { exact: true });
const chip = (page: Page) => page.locator('#counts .vb-chip[data-tone="open"]');
/** The rows' words: each option's `label` (MenuSelect puts its words there, so the counts' live region keeps its text). */
const texts = (page: Page) => list(page).locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).label));

/** A board of its own with `count` cards, open in a 1000 by 600 window unless `wide` (the 1600 by 1000 default). */
async function drawOpen(page: Page, request: APIRequestContext, count: number, query = '?vbwork', wide = false): Promise<Drawn> {
  const d = await draw(request, count, 'open');
  if (!wide) await page.setViewportSize({ width: 1000, height: 600 });
  await open(page, d, query);
  return d;
}

/** Pan the board by (dx, dy) screen pixels with the wheel, as a person scrolls. */
async function panBy(page: Page, dx: number, dy: number): Promise<void> {
  const s = await stageBox(page);
  await page.mouse.move(s.x + s.width / 2, s.y + s.height / 2);
  await page.mouse.wheel(-dx, -dy);
}

/** Whether any of card `n` shows on the stage. */
async function shows(page: Page, n: number): Promise<boolean> {
  const [s, b] = [await stageBox(page), (await card(page, n).boundingBox())!];
  return b.y < s.y + s.height && b.y + b.height > s.y && b.x < s.x + s.width && b.x + b.width > s.x;
}

test('the chip lists the open cards by number and title in board order, keeps its look, and is reachable by Tab', async ({ page, request }) => {
  const d = await drawOpen(page, request, 6, '?vbwork', true);
  await act(page, d, { action: 'ack', n: d.n[1], ver: 1 });
  await act(page, d, { action: 'later', n: d.n[2], ver: 1 });
  await expect.poll(() => texts(page)).toEqual(['4 open', '1 · Card 1', '4 · Card 4', '5 · Card 5', '6 · Card 6']);
  await expect(chip(page)).toContainText('4 open');
  // The counts' live region says the counts only: the list adds no words to it.
  await expect(page.locator('#counts')).toHaveText(/(^|\s)4 open\s+1 answered\s+1 later\s*$/);
  // The select lies unseen over the chip: what shows is the chip.
  expect(await list(page).evaluate((e) => getComputedStyle(e).opacity)).toBe('0');
  const [c, l] = [(await chip(page).boundingBox())!, (await list(page).boundingBox())!];
  expect([l.x, l.y, l.width, l.height]).toEqual([c.x, c.y, c.width, c.height]);
  await tabTo(page, list(page));
  // The focus ring is the chip's (the select draws none of its own).
  expect(await chip(page).evaluate((e) => getComputedStyle(e).outlineStyle)).toBe('solid');
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
  }
});

test('choosing a card off screen selects and focuses it and pans it in; the list shows its name again', async ({ page, request }) => {
  await drawOpen(page, request, 14);
  for (let i = 0; i < 2; i += 1) await page.keyboard.press('+');
  const s = await stageBox(page);
  await panBy(page, 0, s.y + s.height + 40 - (await card(page, 12).boundingBox())!.y);
  await expect.poll(() => shows(page, 12)).toBe(false);
  await list(page).selectOption('12');
  await expect(card(page, 12)).toBeFocused();
  expect(await selected(page)).toEqual(['12']);
  await expect.poll(() => shows(page, 12)).toBe(true);
  await expect(list(page)).toHaveValue('');
});

// The list's own keys (open, arrows, Enter, Esc) are the browser's native select: Playwright can't
// drive a native popup, so this checks what a keyboard and screen reader user meets, and a choice.
test('by keyboard: Tab reaches a named combobox whose options are the open cards; a choice goes and focus moves to the card', async ({ page, request }) => {
  await drawOpen(page, request, 4);
  await tabTo(page, list(page));
  const box = page.getByRole('combobox', { name: 'Go to an open card' });
  await expect(box).toBeFocused();
  await expect(box.getByRole('option')).toHaveCount(5);
  expect(await texts(page)).toEqual(['4 open', '1 · Card 1', '2 · Card 2', '3 · Card 3', '4 · Card 4']);
  await box.selectOption('3');
  await expect(card(page, 3)).toBeFocused();
  expect(await selected(page)).toEqual(['3']);
  await expect(box).toHaveValue('');
});

test('a long title is cut with "…", and the option holds it whole in its tooltip', async ({ page, request }) => {
  const d = await drawOpen(page, request, 1);
  const long = `A title that runs on ${'and on '.repeat(14)}to its end`;
  await write(request, d, [{ type: 'node', node: { region: 'p', kind: 'question', title: long } }]);
  const option = list(page).locator('option').nth(2);
  await expect(option).toHaveAttribute('title', `2 · ${long}`);
  const text = await option.evaluate((o) => (o as HTMLOptionElement).label);
  expect(text!.endsWith('…')).toBe(true);
  expect(text!.length).toBeLessThan(long.length);
});

test('nothing open: the plain chip, no list; a card opening again brings the list back', async ({ page, request }) => {
  const d = await drawOpen(page, request, 1);
  await act(page, d, { action: 'ack', n: d.n[0], ver: 1 });
  await expect(chip(page)).toContainText('0 open');
  await expect(list(page)).toHaveCount(0);
  await act(page, d, { action: 'reopen', n: d.n[0], ver: 1 });
  await expect.poll(() => texts(page)).toEqual(['1 open', '1 · Card 1']);
});

test('in a past version it lists that version\'s open cards, goes to one and sends nothing', async ({ page, request }) => {
  const d = await drawOpen(page, request, 2);
  // A person's act ends the agent's run, so the next drawing is a version of its own.
  await act(page, d, { action: 'ack', n: d.n[0], ver: 1 });
  await write(request, d, [{ type: 'node', node: { region: 'p', kind: 'question', title: 'Card 3' } }]);
  await idle(page);
  await expect.poll(() => texts(page)).toEqual(['2 open', '2 · Card 2', '3 · Card 3']);
  const sent: string[] = [];
  page.on('request', (r) => { if (r.method() === 'POST') sent.push(r.url()); });
  await page.locator('#version').selectOption({ index: 1 });
  await expect(page.locator('.vb-banner')).toBeVisible();
  await expect.poll(() => texts(page)).toEqual(['2 open', '1 · Card 1', '2 · Card 2']);
  await list(page).selectOption('1');
  await expect(card(page, 1)).toBeFocused();
  await idle(page);
  expect(sent).toEqual([]);
});

test('with openList off the chip is plain', async ({ page, request }) => {
  await drawOpen(page, request, 2, '?vbwork&flags=-openList');
  await expect(chip(page)).toContainText('2 open');
  await expect(list(page)).toHaveCount(0);
});

// ---- The gallery's samples, in the toolbar section (openList flag) ----
const samples = (page: Page) => page.locator('section[data-feature="toolbarMenu"] [data-sample="openList"]');

test('gallery: the open list samples show by default and not with -openList', async ({ page }) => {
  await page.goto('/gallery.html?flags=-openList');
  await expect(page.locator('section[data-feature="toolbarMenu"]')).toBeVisible();
  await expect(samples(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  await expect(samples(page).locator('select')).toHaveCount(5);
  await expect(samples(page).locator('.vb-chip:not(.vb-menu-face)')).toHaveCount(1);
});

for (const theme of THEMES) {
  test(`gallery: the open list samples pass axe and match their screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(samples(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(samples(page)).toHaveScreenshot(`open-list-${theme}.png`);
  });
}
