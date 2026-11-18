// A node's notes on the board (2e_FE_01, D-099 3): C opens the node's conversation box with focus in its field; Add
// note writes the one note not yet sent and a second joins it (one per node); M opens nothing (D-045); Edit on that
// note turns the box into the edit bubble, where Remove takes it back, and the box comes back; after Send the note is
// history, read-only in the box, and C starts a new one. The box itself: conversation-box.spec.ts. Each test draws its
// own board through the API.
import type { Page } from '@playwright/test';
import { expect, test } from './helpers.ts';
import { act, card, draw, open } from './agent-board.ts';
import { bubble } from './board-page.ts';

const box = (page: Page) => page.locator('vb-note-bubble[data-mode="conversation"]');
const field = (page: Page) => box(page).getByRole('textbox');
const count = (page: Page, n: number) => card(page, n).locator('[data-mark="notes"] .vb-mark-text');

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

/** Focus node `n` and press a key on it. */
async function press(page: Page, n: number, key: string): Promise<void> {
  await card(page, n).focus();
  await page.keyboard.press(key);
}

test('C opens the box with focus in its field; Add note writes the note, a second joins it; M opens nothing', async ({ page, request }) => {
  const d = await draw(request, 1, 'notes');
  const [n] = d.n as [number];
  await open(page, d);
  await press(page, n, 'm');
  await expect(bubble(page)).toBeHidden();
  await press(page, n, 'c');
  await expect(page.getByRole('dialog', { name: `Conversation on ${n}` })).toBeVisible();
  await expect(field(page)).toBeFocused();
  await page.keyboard.type('First line');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('second line');
  await page.keyboard.press('Enter');
  await expect(box(page).locator('.vb-nb-queued')).toContainText('First line');
  await expect(count(page, n)).toHaveText('1');
  await expect(card(page, n)).toHaveAttribute('data-status', 'commented');
  await field(page).fill('and a third');
  await page.keyboard.press('Enter');
  await expect(box(page).locator('.vb-nb-note')).toHaveCount(1);
  await expect(box(page).locator('.vb-nb-queued')).toContainText('and a third');
  await expect(count(page, n)).toHaveText('1');
  await page.keyboard.press('Escape');
  await expect(box(page)).toBeHidden();
  await expect(card(page, n)).toBeFocused();
});

test('Edit on the note not yet sent opens the edit bubble; Remove takes the note back and the box comes back', async ({ page, request }) => {
  const d = await draw(request, 1, 'notes');
  const [n] = d.n as [number];
  await act(page, d, { action: 'comment', n, ver: 1, text: 'Take this back.' });
  await open(page, d);
  await press(page, n, 'c');
  await box(page).getByRole('button', { name: 'Edit note 1' }).click();
  const edit = page.getByRole('dialog', { name: `Edit note on ${n}` });
  await expect(edit).toBeVisible();
  await expect(edit.getByLabel('Note text')).toHaveValue('Take this back.');
  await edit.getByRole('button', { name: 'Remove' }).click();
  await expect(box(page)).toBeVisible();
  await expect(box(page).locator('.vb-nb-note')).toHaveCount(0);
  await expect(count(page, n)).toHaveText('');
  await expect(card(page, n)).toHaveAttribute('data-status', 'open');
});

test('after Send the note is history: read-only in the box, nothing edits it, and C starts a new note', async ({ page, request }) => {
  const d = await draw(request, 1, 'notes');
  const [n] = d.n as [number];
  await act(page, d, { action: 'comment', n, ver: 1, text: 'Sent already.' });
  await act(page, d, { action: 'send', board: d.board });
  await open(page, d);
  await press(page, n, 'c');
  await expect(box(page).locator('.vb-nb-note')).toHaveCount(1);
  await expect(box(page).locator('.vb-nb-queued')).toHaveCount(0);
  await expect(box(page).getByRole('button', { name: /^Edit note/ })).toHaveCount(0);
  await expect(field(page)).toHaveValue('');
  await field(page).fill('A new one.');
  await page.keyboard.press('Enter');
  await expect(box(page).locator('.vb-nb-note')).toHaveCount(2);
  await expect(count(page, n)).toHaveText('2');
});
