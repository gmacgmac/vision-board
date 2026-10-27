// The conversation window (review polish rulings 6 and 7, decisions 8 and 9): a click, Enter or Space
// on a note or a reply opens the card's whole conversation, every note and reply oldest first, in one
// read-only window beside what was pressed, scrolled to the bottom (the latest) or to the one pressed
// when it is older, focus on it. An × in the top corner, Esc and a click outside close it, focus goes
// back to what was pressed, and the board never moves. The person's note still editable has Edit,
// which turns the window into today's edit mode; the pin and C still open the latest note. A
// container's note block and its replies open the container's conversation. Each test draws its
// own board through the API (agent-board.ts).
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import type { Drawn } from './agent-board.ts';
import { act, card, draw, open, reply } from './agent-board.ts';
import { bubble, world } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];
const list = (page: Page) => bubble(page).locator('.vb-nb-thread');
const entry = (page: Page, seq: number | string) => bubble(page).locator(`[data-seq="${seq}"]`);
const LONG = (what: string) => Array.from({ length: 4 }, (_, i) => `${what}, line ${i + 1}.`).join('\n\n');

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

interface Talk { d: Drawn; n: number; notes: [number, number, number]; replies: string[] }

/** Card with notes 1-3 and replies: note 1 (sent) and its reply, a reply to no note, note 2 (sent)
 *  and its reply, note 3 not yet sent. Long enough that the window scrolls. */
async function talk(page: Page, request: APIRequestContext): Promise<Talk> {
  const d = await draw(request, 1, 'talk');
  const [n] = d.n as [number];
  const one = await act(page, d, { action: 'comment', n, ver: 1, text: 'Note one.' });
  await act(page, d, { action: 'send', board: d.board });
  await reply(request, d, n, LONG('Reply to note one'), one);
  await reply(request, d, n, LONG('A reply to no note'));
  const two = await act(page, d, { action: 'comment', n, ver: 1, text: 'Note two.' });
  await act(page, d, { action: 'send', board: d.board });
  await reply(request, d, n, LONG('Reply to note two'), two);
  const three = await act(page, d, { action: 'comment', n, ver: 1, text: 'Note three.' });
  await open(page, d);
  const replies = await card(page, n).locator('.vb-node-reply').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.reply!));
  expect(replies).toHaveLength(3);
  return { d, n, notes: [one, two, three], replies };
}

const ORDER = ['Note one.', 'Reply to note one', 'A reply to no note', 'Note two.', 'Reply to note two', 'Note three.'];

/** The window lists every note and reply oldest first, each with who wrote it. */
async function listsAll(page: Page, t: Talk): Promise<void> {
  const items = list(page).locator('[data-seq]');
  await expect(items).toHaveCount(6);
  const texts = await items.evaluateAll((els) => els.map((e) => e.textContent ?? ''));
  ORDER.forEach((s, i) => expect(texts[i]).toContain(s));
  await expect(list(page).locator('.vb-nb-who')).toHaveText(['Your note 1 · Sent', 'Agent reply · Pricing chat', 'Agent reply · Pricing chat',
    'Your note 2 · Sent', 'Agent reply · Pricing chat', 'Your note 3']);
  expect(await items.evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.seq)))).toEqual([t.notes[0], Number(t.replies[0]), Number(t.replies[1]), t.notes[1], Number(t.replies[2]), t.notes[2]]);
}

/** `part` shows inside the window's scrolling list. */
async function inView(page: Page, part: Locator): Promise<void> {
  const [l, p] = [(await list(page).boundingBox())!, (await part.boundingBox())!];
  expect(p.y).toBeGreaterThanOrEqual(l.y - 1);
  expect(p.y).toBeLessThan(l.y + l.height - 20);
}

/** The bubble's arrow points at the middle of `part` on the card. */
async function pointsAt(page: Page, part: Locator): Promise<void> {
  const [b, p] = [(await bubble(page).boundingBox())!, (await part.boundingBox())!];
  const arrow = parseFloat(await bubble(page).evaluate((e) => getComputedStyle(e).getPropertyValue('--arrow')));
  expect(Math.abs(b.y + arrow - (p.y + p.height / 2))).toBeLessThanOrEqual(2);
}

for (const theme of THEMES) {
  test(`a click on note 2 opens the whole conversation, oldest first, scrolled to note 2, its arrow on it, focus on it; × closes; axe (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    const t = await talk(page, request);
    const note2 = card(page, t.n).locator(`.vb-node-note[data-note="${t.notes[1]}"]`);
    const before = await world(page);
    await note2.click();
    const dialog = page.getByRole('dialog', { name: `Conversation on ${t.n}` });
    await expect(dialog).toBeVisible();
    await expect(dialog).not.toHaveAttribute('aria-modal', 'true');
    await listsAll(page, t);
    await expect(entry(page, t.notes[1])).toBeFocused();
    await inView(page, entry(page, t.notes[1]));
    await pointsAt(page, note2);
    // Read-only: no text box, no bottom row; the room goes to the list, which scrolls as one group.
    await expect(bubble(page).locator('textarea, .vb-nb-row')).toHaveCount(0);
    await expect(list(page)).toHaveAttribute('role', 'group');
    expect((await list(page).boundingBox())!.height).toBeGreaterThan(320);
    // The × in the top corner, named Close, a 24px target.
    const x = bubble(page).getByRole('button', { name: 'Close' });
    const [b, xb] = [(await bubble(page).boundingBox())!, (await x.boundingBox())!];
    expect(Math.min(xb.width, xb.height)).toBeGreaterThanOrEqual(24);
    expect(b.x + b.width - (xb.x + xb.width)).toBeLessThanOrEqual(20);
    expect(xb.y - b.y).toBeLessThanOrEqual(20);
    await expectNoAxeViolations(page);
    await x.click();
    await expect(bubble(page)).toBeHidden();
    await expect(note2).toBeFocused();
    expect(await world(page)).toBe(before);
  });
}

test('opened from the latest it is scrolled to the bottom; from a reply or the orphan, to that one', async ({ page, request }) => {
  const t = await talk(page, request);
  const c = card(page, t.n);
  await c.locator(`.vb-node-note[data-note="${t.notes[2]}"]`).click();
  await expect(entry(page, t.notes[2])).toBeFocused();
  expect(await list(page).evaluate((e) => Math.abs(e.scrollHeight - e.clientHeight - e.scrollTop))).toBeLessThanOrEqual(1);
  expect(await list(page).evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(c.locator(`.vb-node-note[data-note="${t.notes[2]}"]`)).toBeFocused();
  for (const seq of [t.replies[0]!, t.replies[1]!]) {
    const r = c.locator(`.vb-node-reply[data-reply="${seq}"]`);
    await r.click();
    await expect(page.getByRole('dialog', { name: `Conversation on ${t.n}` })).toBeVisible();
    await listsAll(page, t);
    await expect(entry(page, seq)).toBeFocused();
    await inView(page, entry(page, seq));
    await pointsAt(page, r);
    await page.keyboard.press('Escape');
    await expect(bubble(page)).toBeHidden();
    await expect(r).toBeFocused();
  }
});

test('keyboard: Enter on a note and Space on a reply open it, focus on the one pressed; Esc closes, focus goes back', async ({ page, request }) => {
  const t = await talk(page, request);
  const c = card(page, t.n);
  const note2 = c.locator(`.vb-node-note[data-note="${t.notes[1]}"]`);
  await note2.focus();
  await page.keyboard.press('Enter');
  await expect(entry(page, t.notes[1])).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(bubble(page)).toBeHidden();
  await expect(note2).toBeFocused();
  const orphan = c.locator(`.vb-node-reply[data-reply="${t.replies[1]}"]`);
  await orphan.focus();
  await page.keyboard.press(' ');
  await expect(entry(page, t.replies[1]!)).toBeFocused();
  await expect(c).not.toHaveAttribute('data-selected');
  // Tab goes on inside the window, to Edit on note 3.
  await page.keyboard.press('Tab');
  await expect(bubble(page).getByRole('button', { name: 'Edit note 3' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(orphan).toBeFocused();
});

test('a click outside closes it, focus back to what was pressed; a drag outside (a pan) leaves it open', async ({ page, request }) => {
  const t = await talk(page, request);
  const note1 = card(page, t.n).locator(`.vb-node-note[data-note="${t.notes[0]}"]`);
  await note1.click();
  await expect(bubble(page)).toBeVisible();
  const stage = (await page.locator('#stage').boundingBox())!;
  const free = { x: stage.x + stage.width / 4, y: stage.y + stage.height - 30 };
  // A drag on the background pans the board and keeps the window, which follows its card.
  await page.mouse.move(free.x, free.y);
  await page.mouse.down();
  await page.mouse.move(free.x + 30, free.y - 20, { steps: 4 });
  await page.mouse.up();
  await expect(bubble(page)).toBeVisible();
  await page.mouse.click(free.x, free.y);
  await expect(bubble(page)).toBeHidden();
  await expect(note1).toBeFocused();
});

test('Edit on the person\'s note not yet sent turns the window into today\'s edit mode; the pin and C still open the latest note', async ({ page, request }) => {
  const t = await talk(page, request);
  const c = card(page, t.n);
  await c.locator(`.vb-node-note[data-note="${t.notes[0]}"]`).click();
  // Only note 3 can still be edited.
  await expect(bubble(page).getByRole('button', { name: /^Edit note/ })).toHaveCount(1);
  await bubble(page).getByRole('button', { name: 'Edit note 3' }).click();
  await expect(page.getByRole('dialog', { name: `Edit note on ${t.n}` })).toBeVisible();
  await expect(bubble(page).getByLabel('Note text')).toHaveValue('Note three.');
  await expect(bubble(page).getByLabel('Note text')).toBeFocused();
  await expect(bubble(page).getByRole('button', { name: 'Close' })).toHaveCount(0);
  await expect(bubble(page).getByRole('button')).toContainText(['Remove', 'Cancel', 'Save']);
  await page.keyboard.type(' Edited.');
  await page.keyboard.press('Enter');
  await expect(bubble(page)).toBeHidden();
  await expect(c.locator(`.vb-node-note[data-note="${t.notes[2]}"] .vb-node-note-text`)).toHaveText('Note three. Edited.');
  // The pin opens the latest note, as before; C edits the card's note not yet sent.
  await c.locator('.vb-note-pin').click();
  await expect(page.getByRole('dialog', { name: `Edit note on ${t.n}` })).toBeVisible();
  await page.keyboard.press('Escape');
  await c.focus();
  await page.keyboard.press('c');
  await expect(page.getByRole('dialog', { name: `Edit note on ${t.n}` })).toBeVisible();
  await page.keyboard.press('Escape');
});

for (const theme of THEMES) {
  test(`container: the block's note and a reply open the container's whole conversation; × and Esc close it; axe (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    const d = await draw(request, 1, 'talk');
    const one = await act(page, d, { action: 'comment', board: d.board, region: 'p', text: 'Is the order right?' });
    await act(page, d, { action: 'send', board: d.board });
    await reply(request, d, d.n[0]!, 'Yes, in **price** order.', one);
    await act(page, d, { action: 'comment', board: d.board, region: 'p', text: 'And the last one?' });
    await open(page, d);
    const frame = page.locator('vb-region[data-region="p"]');
    await frame.locator('.vb-region-comment').focus();
    await frame.getByRole('button', { name: 'Show in container' }).click();
    await page.keyboard.press('Escape');
    const block = frame.locator('.vb-region-note-block');
    const before = await world(page);
    await block.locator('.vb-nblock-text').click();
    await expect(page.getByRole('dialog', { name: 'Conversation on container Pricing thread' })).toBeVisible();
    await expect(bubble(page)).toHaveAttribute('data-on', 'container');
    await expect(list(page).locator('.vb-nb-who')).toHaveText(['Your note 1 · Sent', 'Agent reply · Pricing chat', 'Your note 2']);
    await expect(list(page).locator('[data-seq]').last()).toBeFocused();
    await expect(bubble(page).getByRole('button', { name: 'Edit note 2' })).toBeVisible();
    await expectNoAxeViolations(page);
    await bubble(page).getByRole('button', { name: 'Close' }).click();
    await expect(bubble(page)).toBeHidden();
    await expect(block.locator('.vb-nblock-text')).toBeFocused();
    expect(await world(page)).toBe(before);
    // Edit turns it into the container note's edit mode.
    await block.locator('.vb-nblock-text').click();
    await bubble(page).getByRole('button', { name: 'Edit note 2' }).click();
    await expect(page.getByRole('dialog', { name: 'Edit note on container Pricing thread' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(bubble(page)).toBeHidden();
  });
}
