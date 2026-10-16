// Notes beside cards on the board (2e_FE_01, rulings 1-7): C, M and the footer buttons open the
// note bubble beside the card; a second press edits the one note not yet sent; Remove takes it
// back; Esc cancels; the bubble flips left at the board's right edge; after Send the note is
// read-only. Runs after board.spec.ts on the same server, on cards that file leaves alone.
import type { Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test, zoomToControls } from './helpers.ts';
import type { Theme } from './helpers.ts';

const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);
const bubble = (page: Page) => page.locator('vb-note-bubble');
const text = (page: Page) => bubble(page).getByLabel('Note text');

async function openBoard(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('vb-node')).toHaveCount(17);
  await expect(page.locator('#wires')).not.toHaveClass(/settling/);
}

/** Zoom in until the world draws at 1:1, so every control is its full size. */
async function zoomToFull(page: Page): Promise<void> {
  const scale = () => page.locator('#world').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a);
  for (let i = 0; i < 12 && (await scale()) < 1; i += 1) await page.keyboard.press('+');
}

/** Focus a card (which pans it into view) and press a key on it. */
async function press(page: Page, n: number, key: string): Promise<void> {
  await card(page, n).focus();
  await page.keyboard.press(key);
}

const box = async (page: Page, sel: ReturnType<Page['locator']>) => (await sel.boundingBox())!;

test('C opens the bubble beside the card with focus in the text; Enter adds the note, focus returns', async ({ page }) => {
  await openBoard(page);
  await press(page, 4, 'c');
  const b = bubble(page);
  await expect(b).toHaveAttribute('role', 'dialog');
  await expect(page.getByRole('dialog', { name: 'Note on 4' })).toBeVisible();
  // Its right, unless that would cover card 5's footer buttons (field report batch 3 FE_01): here,
  // zoomed out to fit, it has no clear place there and opens on the left.
  await expect(b).toHaveAttribute('data-side', 'left');
  await expect(text(page)).toBeFocused();
  const [c, o] = [await box(page, card(page, 4)), await box(page, b)];
  expect(o.x + o.width).toBeLessThan(c.x);
  await page.keyboard.type('First line');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('second line');
  await expect(text(page)).toHaveValue('First line\nsecond line');
  await page.keyboard.press('Enter');
  await expect(b).toBeHidden();
  await expect(card(page, 4)).toBeFocused();
  await expect(card(page, 4).locator('.vb-note-pin')).toHaveText('1');
  await expect(card(page, 4).locator('.vb-node-note-who')).toHaveText('Your note 1');
  await expect(card(page, 4)).toHaveAttribute('data-status', 'commented');
});

test('a second press edits the note rather than adding one; M opens nothing (D-045)', async ({ page }) => {
  await openBoard(page);
  await press(page, 4, 'm');
  await expect(bubble(page)).toBeHidden();
  await press(page, 4, 'c');
  await expect(page.getByRole('dialog', { name: 'Edit note on 4' })).toBeVisible();
  await expect(text(page)).toHaveValue('First line\nsecond line');
  await expect(bubble(page).getByRole('button', { name: 'Remove' })).toBeVisible();
  await text(page).fill('Explain the paper prototype in plain terms.');
  await bubble(page).getByRole('button', { name: 'Save' }).click();
  await expect(bubble(page)).toBeHidden();
  await expect(card(page, 4).locator('.vb-node-note')).toHaveCount(1);
  await expect(card(page, 4).locator('.vb-node-note-who')).toHaveText('Your note 1');
  await expect(card(page, 4).locator('.vb-node-note-text')).toHaveText('Explain the paper prototype in plain terms.');
  await expect(card(page, 4)).toHaveAttribute('data-status', 'commented');
});

test('the footer button opens it too; Esc cancels (typed words after Discard), writes nothing and gives focus back to the card', async ({ page }) => {
  await openBoard(page);
  await zoomToControls(page); // the footer button is not drawn zoomed out (N13)
  await card(page, 5).focus();
  await card(page, 5).getByRole('button', { name: 'Comment item 5 (C)' }).click();
  await expect(page.getByRole('dialog', { name: 'Note on 5' })).toBeVisible();
  await page.keyboard.type('Never saved');
  await page.keyboard.press('Escape');
  // Typed words are never lost silently (3_FE_04 step 4G ruling 4).
  await page.getByRole('dialog', { name: 'Discard your changes?' }).getByRole('button', { name: 'Discard' }).click();
  await expect(bubble(page)).toBeHidden();
  await expect(card(page, 5)).toBeFocused();
  await expect(card(page, 5).locator('.vb-note-pin')).toBeHidden();
  await expect(card(page, 5)).toHaveAttribute('data-status', 'open');
  // Empty text on Add note writes nothing either.
  await press(page, 5, 'c');
  await bubble(page).getByRole('button', { name: 'Add note' }).click();
  await expect(bubble(page)).toBeHidden();
  await expect(card(page, 5).locator('.vb-node-note')).toHaveCount(0);
});

test('the pin and the note block open the note; Remove takes it back', async ({ page }) => {
  await openBoard(page);
  await press(page, 5, 'c');
  await text(page).fill('Take this back.');
  await page.keyboard.press('Enter');
  await card(page, 5).locator('.vb-note-pin').click();
  await expect(page.getByRole('dialog', { name: 'Edit note on 5' })).toBeVisible();
  await expect(card(page, 5).locator('.vb-note-pin')).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  // The note is a tab stop too (FE_04): Enter on it opens the card's conversation, as a click does
  // (review polish ruling 6); its Edit opens the note to edit (decision 8).
  await card(page, 5).locator('.vb-node-note').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Conversation on 5' })).toBeVisible();
  await page.keyboard.press('Escape');
  await card(page, 5).locator('.vb-node-note').click();
  await bubble(page).getByRole('button', { name: 'Edit note 1' }).click();
  await expect(page.getByRole('dialog', { name: 'Edit note on 5' })).toBeVisible();
  // Empty text on Save keeps the note: only Remove removes it (ruling 6).
  await text(page).fill('');
  await bubble(page).getByRole('button', { name: 'Save' }).click();
  await expect(card(page, 5).locator('.vb-node-note-text')).toHaveText('Take this back.');
  await card(page, 5).locator('.vb-note-pin').click();
  await bubble(page).getByRole('button', { name: 'Remove' }).click();
  await expect(bubble(page)).toBeHidden();
  await expect(card(page, 5).locator('.vb-note-pin')).toBeHidden();
  await expect(card(page, 5).locator('.vb-node-notes')).toBeHidden();
  await expect(card(page, 5)).toHaveAttribute('data-status', 'open');
});

test('at the board\'s right edge the bubble flips to the left, and it follows the card when the board pans', async ({ page }) => {
  await openBoard(page);
  await card(page, 6).focus();
  const c = await box(page, card(page, 6));
  await page.mouse.move(800, 500);
  await page.mouse.wheel(-(1600 - 60 - (c.x + c.width)), 0);
  await expect.poll(async () => (await box(page, card(page, 6))).x).toBeGreaterThan(c.x);
  await page.keyboard.press('c');
  await expect(bubble(page)).toHaveAttribute('data-side', 'left');
  const [cc, o] = [await box(page, card(page, 6)), await box(page, bubble(page))];
  expect(o.x + o.width).toBeLessThan(cc.x);
  // Panning moves card and bubble together; the bubble keeps its size (it is not zoomed).
  await page.mouse.move(400, 900);
  await page.mouse.wheel(0, 40);
  await expect.poll(async () => (await box(page, bubble(page))).y).toBeLessThan(o.y);
  const [c2, o2] = [await box(page, card(page, 6)), await box(page, bubble(page))];
  expect(Math.round(o2.y - c2.y)).toBe(Math.round(o.y - cc.y));
  expect(o2.width).toBe(o.width);
  await page.keyboard.press('Escape');
});

test('after Send the note is history: the pin reads it, nothing edits it, and C starts a new note', async ({ page }) => {
  await openBoard(page);
  await press(page, 6, 'c');
  await text(page).fill('Which kinds need a drop button?');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Send to agent' }).click();
  await expect(card(page, 6).locator('.vb-note-pin')).toHaveAttribute('data-sent', '');
  await expect(card(page, 6).locator('.vb-node-note-who')).toHaveText('Your note 1 · Sent');
  await card(page, 6).locator('.vb-note-pin').click();
  const read = page.getByRole('dialog', { name: 'Note 1 on 6, sent' });
  await expect(read).toBeVisible();
  await expect(read.locator('textarea')).toHaveCount(0);
  await expect(read.getByRole('button', { name: /Save|Remove/ })).toHaveCount(0);
  await expect(read).toContainText('Which kinds need a drop button?');
  await read.getByRole('button', { name: 'Close' }).click();
  await expect(read).toBeHidden();
  await press(page, 6, 'c');
  await expect(page.getByRole('dialog', { name: 'Note on 6' })).toBeVisible();
  await text(page).fill('A second note, after Send.');
  await page.keyboard.press('Enter');
  await expect(card(page, 6).locator('.vb-node-notes-count')).toHaveText('2 notes');
  await expect(card(page, 6).locator('.vb-note-pin')).toHaveText('2');
  await expect(card(page, 6).locator('.vb-note-pin')).not.toHaveAttribute('data-sent', '');
});

const THEMES: Theme[] = ['dark', 'light'];
for (const theme of THEMES) {
  test(`axe passes with the bubble open, at full size (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page);
    await zoomToFull(page);
    // Beside card 4 the bubble covers card 5; it opens clear of card 5's footer buttons (field
    // report batch 3 FE_01), so none of them sits at its edge as a target too small.
    await press(page, 4, 'c');
    // The Send above made 4's note history, so C starts a new one.
    await expect(page.getByRole('dialog', { name: 'Note on 4' })).toBeVisible();
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
  });
}
