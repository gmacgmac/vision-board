// The conversation (review polish rulings 6 and 7, decisions 8 and 9; D-099 3): a node's conversation box lists every
// note and reply on it oldest first, the orphan reply in its place by time; a container's note block and its replies
// open the container's whole conversation in the note bubble, beside what was pressed; an × and Esc close it, focus
// goes back to what was pressed, and the board never moves; the person's note still editable has Edit, which turns it
// into the edit bubble. Each test draws its own board through the API (agent-board.ts).
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { act, card, draw, open, reply } from './agent-board.ts';
import { bubble, world } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];
const list = (page: Page) => bubble(page).locator('.vb-nb-thread');
const LONG = (what: string) => Array.from({ length: 4 }, (_, i) => `${what}, line ${i + 1}.`).join('\n\n');

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

/** Card with notes 1-3 and replies: note 1 (sent) and its reply, a reply to no note, note 2 (sent)
 *  and its reply, note 3 not yet sent. Long enough that the box scrolls. */
async function talk(page: Page, request: APIRequestContext): Promise<number> {
  const d = await draw(request, 1, 'talk');
  const [n] = d.n as [number];
  const one = await act(page, d, { action: 'comment', n, ver: 1, text: 'Note one.' });
  await act(page, d, { action: 'send', board: d.board });
  await reply(request, d, n, LONG('Reply to note one'), one);
  await reply(request, d, n, LONG('A reply to no note'));
  const two = await act(page, d, { action: 'comment', n, ver: 1, text: 'Note two.' });
  await act(page, d, { action: 'send', board: d.board });
  await reply(request, d, n, LONG('Reply to note two'), two);
  await act(page, d, { action: 'comment', n, ver: 1, text: 'Note three.' });
  await open(page, d);
  return n;
}

const ORDER = ['Note one.', 'Reply to note one', 'A reply to no note', 'Note two.', 'Reply to note two', 'Note three.'];

test('a node\'s conversation box lists every note and reply oldest first, the reply to no note in its place', async ({ page, request }) => {
  const n = await talk(page, request);
  await card(page, n).focus();
  await page.keyboard.press('c');
  const items = list(page).locator('[data-seq]');
  await expect(items).toHaveCount(6);
  const texts = await items.evaluateAll((els) => els.map((e) => e.textContent ?? ''));
  ORDER.forEach((s, i) => expect(texts[i]).toContain(s));
  await expect(bubble(page).getByRole('button', { name: 'Edit note 3' })).toBeVisible();
  await expect(bubble(page).getByRole('button', { name: /^Edit note [12]$/ })).toHaveCount(0);
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
    await expect(list(page).locator('.vb-nb-who')).toHaveText(['User', `Agent · Pricing chat ${(d.agent as { agent?: string }).agent}`, 'User · Not sent']);
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
