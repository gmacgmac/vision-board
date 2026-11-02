// The proposals notice's Review as a list (reviewList flag, search-and-finding REVIEW_01, ruling 319):
// with proposals on two or more cards, Review lists them in card order; a row brings its card into
// view at a readable zoom and opens its box, keeping its NEW mark; Esc chooses nothing; the flag off
// is the old button. Then the gallery's Review list section. Moved from proposals.spec.ts unchanged
// (VERIFY_01 F11); the board and its helpers are proposals-board.ts.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test, bid } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { boardLines } from './board-lines.ts';
import { card, idle, panBy, scale, selected, stageBox, world } from './board-page.ts';
import { open, write } from './agent-board.ts';
import { bar, box, draw, propose, review, tab } from './proposals-board.ts';

const THEMES: Theme[] = ['dark', 'light'];
// The proposal's time and the gallery's screenshot read the same in every test machine's clock.
test.use({ timezoneId: 'UTC', locale: 'en-GB' });

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

// ---- Review opens a list (reviewList flag, search-and-finding REVIEW_01, ruling 319) ----

const reviewList = (page: Page) => bar(page).getByRole('combobox', { name: 'Review a card with a proposal' });
const rowsOf = (list: Locator) => list.evaluate((e) => [...(e as HTMLSelectElement).options].map((o) => o.label));
const isNew = (page: Page, n: number) => card(page, n).locator('.vb-node-btab[data-tab="new"]');

/** Whether any of card `n` shows on the stage. */
async function shows(page: Page, n: number): Promise<boolean> {
  const [s, b] = [await stageBox(page), (await card(page, n).boundingBox())!];
  return b.y < s.y + s.height && b.y + b.height > s.y && b.x < s.x + s.width && b.x + b.width > s.x;
}

/** A board bigger than the stage with three cards with proposals, drawn on a page zoomed out to where
 * a card's controls are hidden, the last of them (a NEW card) off screen. */
async function farBoard(page: Page, request: APIRequestContext, query = '') {
  const d = await draw(request, Array.from({ length: 36 }, () => 'question'));
  await open(page, d, `?vbwork${query && `&${query}`}`);
  await expect.poll(async () => (await boardLines(page, d.board)).some((e) => e.type === 'seen' && e.n === undefined)).toBe(true);
  const [added] = await write(request, d, [{ type: 'node', node: { region: 'p', kind: 'question', title: 'Card 37', body: 'Added later.' } }]);
  const last = added!.n!;
  await expect(page.locator('vb-node')).toHaveCount(37);
  await expect(isNew(page, last)).toHaveText('NEW');
  const first = d.n[0]!;
  const mid = d.n[17]!;
  await propose(request, d, mid, 'cross', 'not needed');
  await propose(request, d, last, 'cross', 'it was a mistake');
  await propose(request, d, first, 'check', 'the draft is done');
  await expect(bar(page).getByRole('heading', { level: 2 })).toHaveText('3 proposals');
  await page.locator(bid('stage')).focus();
  for (let i = 0; i < 12 && (await scale(page)) > 0.45; i += 1) await page.keyboard.press('-');
  expect(await scale(page), 'zoomed out past where controls show').toBeLessThan(0.55);
  // Pan until the last card is off the stage.
  for (let i = 0; i < 8 && (await shows(page, last)); i += 1) await panBy(page, -400, -400);
  expect(await shows(page, last), 'the last card is off screen').toBe(false);
  return { d, first, mid, last };
}

test('Review lists the cards with proposals in card order; choosing the off-screen one shows it at a readable zoom, opens its box, and its NEW mark stays', async ({ page, request }) => {
  const { d, first, mid, last } = await farBoard(page, request);
  const was = (await boardLines(page, d.board)).filter((e) => e.type === 'seen' && e.n !== undefined).length;
  await expect(review(page)).toHaveRole('combobox');
  expect(await rowsOf(reviewList(page))).toEqual(['Review',
    `${first} · Card 1 · Check: the draft is done`, `${mid} · Card 18 · Cross: not needed`, `${last} · Card 37 · Cross: it was a mistake`]);
  await reviewList(page).selectOption(String(last));
  await expect(box(page, last)).toBeVisible();
  await expect(box(page, last).getByRole('button', { name: `Reject: cross ${last}` })).toBeFocused();
  expect(await shows(page, last), 'brought into view').toBe(true);
  expect(await scale(page), 'at a readable zoom: the controls show again').toBeGreaterThanOrEqual(0.55);
  expect(await selected(page)).toEqual([String(last)]);
  await expect(isNew(page, last), 'looking is not reading: NEW stays').toHaveText('NEW');
  await expect(page.locator(bid('counts'))).toContainText('1 new');
  await idle(page);
  expect((await boardLines(page, d.board)).filter((e) => e.type === 'seen' && e.n !== undefined).length, 'no card seen line').toBe(was);
  // The list is whole again, ready for the next choice.
  await expect(reviewList(page)).toHaveValue('');
});

test('Review: Esc on the list chooses nothing; the board stays where it was', async ({ page, request }) => {
  const { last } = await farBoard(page, request);
  const before = await world(page);
  await reviewList(page).focus();
  await page.keyboard.press('Escape');
  expect(await world(page)).toBe(before);
  await expect(box(page, last)).toBeHidden();
  expect(await shows(page, last)).toBe(false);
});

test('flag off (-reviewList): Review is a button that opens the first card\'s box where the card is, the board does not move', async ({ page, request }) => {
  const { first } = await farBoard(page, request, 'flags=-reviewList');
  await expect(review(page)).toHaveRole('button');
  const before = await world(page);
  await review(page).click();
  await expect(tab(page, first)).toHaveAttribute('aria-expanded', 'true');
  expect(await world(page), 'nothing moves the board').toBe(before);
  expect(await selected(page)).toEqual([]);
});

// ---- The gallery's Review list section (reviewList flag, REVIEW_01) ----

const reviewSection = (page: Page) => page.locator('section[data-feature="reviewList"]');

test('gallery: the Review list section shows by default and not with -reviewList', async ({ page }) => {
  await page.goto('/gallery.html?flags=-reviewList');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(reviewSection(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  const s = reviewSection(page);
  await expect(s.locator('.vb-proposals')).toHaveCount(2);
  await expect(s.locator('.vb-proposals .vb-menu-face').first()).toHaveText('Review');
  await expect(s.locator('select[size] option')).toHaveCount(4);
  await expect(s.locator('select[size] option').first()).toHaveText(/^\d+ · .+ · (Check|Cross): /);
});

for (const theme of THEMES) {
  test(`gallery: the Review list passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(reviewSection(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(reviewSection(page)).toHaveScreenshot(`review-list-${theme}.png`);
  });
}
