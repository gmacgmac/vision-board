// A note on a group of cards, drawn once (group-note-once task, maintainer ruling point 103; the
// groupNoteOnce flag, on by default): one pin per group on the group's lowest-numbered card, no card
// repeating the note or the agent's reply to it; a dashed ring round each of the group's cards on
// hover, on focus and while its bubble is open, never a box; the pin selects the group and opens the
// note, to edit or remove it, with the reply shown once; the flag off draws it on every card as
// before; axe light and dark. Each test draws its own board through the API (agent-board.ts).
import type { Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { act, card, draw, open, reply } from './agent-board.ts';

const THEMES: Theme[] = ['dark', 'light'];
const pins = (page: Page) => page.locator('.vb-group-pin');
const bubble = (page: Page) => page.locator('vb-note-bubble');
const ringed = (page: Page) => page.locator('vb-node[data-group-ring]').evaluateAll((els) =>
  els.map((e) => Number((e as HTMLElement).dataset.id)).sort((a, b) => a - b));
const selected = (page: Page) => page.locator('vb-node[data-selected]').evaluateAll((els) =>
  els.map((e) => Number((e as HTMLElement).dataset.id)).sort((a, b) => a - b));
const box = async (l: Locator) => (await l.boundingBox())!;

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

test('a note on a group shows once, as one pin on its lowest-numbered card; no card repeats it', async ({ page, request }) => {
  const d = await draw(request, 4, 'group');
  const [, b, c] = d.n as [number, number, number, number];
  await open(page, d);
  await act(page, d, { action: 'comment', nodes: [c, b], text: 'Decide these two together.' });
  await expect(pins(page)).toHaveCount(1);
  await expect(pins(page)).toHaveText('1');
  await expect(pins(page)).toHaveAttribute('aria-label', `Note 1 on items ${b}, ${c}. Edit it`);
  for (const n of d.n) {
    await expect(card(page, n).locator('.vb-note-pin')).toBeHidden();
    await expect(card(page, n).locator('.vb-node-notes')).toBeHidden();
  }
  // On the right edge of card b (the lower number), just under where its own pin hangs: never meeting it.
  const [pin, onto] = [await box(pins(page)), await box(card(page, b))];
  expect(Math.abs(pin.x + pin.width / 2 - (onto.x + onto.width))).toBeLessThan(pin.width / 2);
  expect(pin.y).toBeGreaterThan(onto.y + 12 * (pin.height / 26));
  // At rest no card is ringed; never a box.
  expect(await ringed(page)).toEqual([]);
  // The card's own note keeps its own pin, numbered among its own notes alone.
  await act(page, d, { action: 'comment', n: b, ver: 1, text: 'Mine alone.' });
  await expect(card(page, b).locator('.vb-note-pin')).toHaveText('1');
  await expect(card(page, b).locator('.vb-node-notes')).toContainText('Mine alone.');
  await expect(card(page, b).locator('.vb-node-notes')).not.toContainText('Decide these two together.');
  await expect(card(page, c).locator('.vb-node-notes')).toBeHidden();
});

test('hover, focus and the open bubble ring each card of the group; the pin selects them, edits and shows the reply once', async ({ page, request }) => {
  const d = await draw(request, 4, 'group');
  const [a, , c, e] = d.n as [number, number, number, number];
  await open(page, d);
  const seq = await act(page, d, { action: 'comment', nodes: [a, c, e], text: 'One plan for three.' });
  await expect(pins(page)).toHaveCount(1);
  await pins(page).hover();
  await expect.poll(() => ringed(page)).toEqual([a, c, e]);
  await expect(card(page, a)).toHaveAttribute('data-group-ring', '');
  await page.mouse.move(2, 2);
  await expect.poll(() => ringed(page)).toEqual([]);
  await pins(page).focus();
  await expect.poll(() => ringed(page)).toEqual([a, c, e]);
  // Enter: the group is selected and its note opens to edit, beside the pin's card, rings kept.
  await page.keyboard.press('Enter');
  await expect(bubble(page)).toBeVisible();
  await expect(bubble(page)).toHaveAttribute('aria-label', `Edit note on 3 cards: ${a}, ${c}, ${e}`);
  await expect(pins(page)).toHaveAttribute('aria-expanded', 'true');
  expect(await selected(page)).toEqual([a, c, e]);
  await expect.poll(() => ringed(page)).toEqual([a, c, e]);
  await bubble(page).locator('textarea').fill('One plan for all three.');
  await page.keyboard.press('Enter');
  await expect(bubble(page)).toBeHidden();
  await expect(pins(page)).toBeFocused();
  await expect(pins(page)).toHaveAttribute('aria-expanded', 'false');
  // The agent answers it on one card: the note is history, the reply shows once, in its bubble.
  await reply(request, d, c, 'Agreed, one plan.', seq);
  await expect(pins(page)).toHaveAttribute('aria-label', `Note 1 on items ${a}, ${c}, ${e}, answered. Show it`);
  await expect(pins(page)).toHaveAttribute('data-sent', '');
  await expect(page.locator('vb-node .vb-node-reply')).toHaveCount(0);
  await pins(page).click();
  await expect(bubble(page)).toHaveAttribute('aria-label', `Note on 3 cards: ${a}, ${c}, ${e}, answered`);
  await expect(bubble(page).getByText('Agreed, one plan.')).toHaveCount(1);
  await expect(bubble(page)).toContainText('One plan for all three.');
  await expect(card(page, a)).toHaveAttribute('data-group-ring', 'sent');
  await page.keyboard.press('Escape');
  await expect(bubble(page)).toBeHidden();
  // Focus is back on the pin, so its cards stay ringed until focus and the pointer leave it.
  await expect(pins(page)).toBeFocused();
  await page.mouse.move(2, 2);
  await pins(page).blur();
  await expect.poll(() => ringed(page)).toEqual([]);
});

test('one pin per group: two groups sharing a card spread over their own cards; Remove from a pin takes only its note', async ({ page, request }) => {
  const d = await draw(request, 3, 'group');
  const [a, b, c] = d.n as [number, number, number];
  await open(page, d);
  await act(page, d, { action: 'comment', nodes: [a, b], text: 'First pair.' });
  await act(page, d, { action: 'comment', nodes: [a, c], text: 'Second pair.' });
  await expect(pins(page)).toHaveCount(2);
  // The first on a (its lowest card), the second on c, since a already has one: never on top of each other.
  const [first, second] = [await box(pins(page).first()), await box(pins(page).nth(1))];
  const [onA, onC] = [await box(card(page, a)), await box(card(page, c))];
  expect(Math.abs(first.x + first.width / 2 - (onA.x + onA.width))).toBeLessThan(first.width / 2);
  expect(Math.abs(second.x + second.width / 2 - (onC.x + onC.width))).toBeLessThan(second.width / 2);
  await page.locator(`.vb-group-pin[data-group="${a},${c}"]`).click();
  await expect(bubble(page)).toHaveAttribute('aria-label', `Edit note on 2 cards: ${a}, ${c}`);
  await bubble(page).getByRole('button', { name: 'Remove' }).click();
  await expect(bubble(page)).toBeHidden();
  await expect(pins(page)).toHaveCount(1);
  await expect(pins(page)).toHaveAttribute('data-group', `${a},${b}`);
  for (const n of d.n) await expect(card(page, n).locator('.vb-node-notes')).toBeHidden();
});

test('with the groupNoteOnce flag off, the note shows on every card of the group as before', async ({ page, request }) => {
  const d = await draw(request, 3, 'group');
  const [a, b] = d.n as [number, number, number];
  await open(page, d, '?flags=-groupNoteOnce');
  await act(page, d, { action: 'comment', nodes: [a, b], text: 'Both of these.' });
  for (const n of [a, b]) {
    await expect(card(page, n).locator('.vb-note-pin')).toBeVisible();
    await expect(card(page, n).locator('.vb-node-notes')).toContainText('Both of these.');
  }
  await expect(pins(page)).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`axe passes with a group pin, its rings and its bubble open (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    const d = await draw(request, 3, 'group');
    const [a, b] = d.n as [number, number, number];
    await open(page, d);
    await act(page, d, { action: 'comment', nodes: [a, b], text: 'Look at both.' });
    await pins(page).hover();
    await expect.poll(() => ringed(page)).toEqual([a, b]);
    await expectNoAxeViolations(page);
    await pins(page).click();
    await expect(bubble(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
  });
}
