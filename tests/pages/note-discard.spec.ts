// Unsaved words in a note bubble are never lost silently (3_FE_04 step 4G ruling 4), on a card
// and on a container alike: Esc, Cancel or opening another bubble with changed text asks
// "Discard your changes?" through the confirm dialog; Cancel keeps the words, Discard drops them,
// and unchanged text closes without asking. Nothing is written. Runs on the containers board
// (frames-board.ts), on cards and containers with no note.
import { expect, test } from './helpers.ts';
import { bubble, card, comment, discard, ensureBoard, head, openFrames, text } from './frames-board.ts';

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
