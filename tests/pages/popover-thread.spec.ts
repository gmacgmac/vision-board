// Larger popovers and the exchange (popovers-larger-thread, rulings 1-4): the comment box is one
// step bigger and every popover reads the shared popover tokens; a click, Enter or Space on a note
// or an agent's reply opens one window with the conversation beside what was pressed (review polish
// ruling 6 replaced the one-note exchange; conversation.spec.ts has the rest); a note not yet sent
// opens to edit from its Edit; a container's note and its replies do the same; the hover tip stays;
// Esc closes and focus goes back; axe light and dark. Each test draws its own board through the API.
import type { Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test, bid } from './helpers.ts';
import type { Theme } from './helpers.ts';
import type { Drawn } from './agent-board.ts';
import { act, card, draw, open, reply, tabTo } from './agent-board.ts';
import { bubble, replies } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];
const shown = (page: Page) => bubble(page).locator('.vb-nb-reply');
const css = (l: Locator, prop: string) => l.evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), prop);

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

/** A card whose note was sent, with the agent's replies to it (oldest first). */
async function exchange(page: Page, request: Parameters<typeof draw>[0], texts: string[]): Promise<{ d: Drawn; n: number; note: number }> {
  const d = await draw(request, 1, 'thread');
  const [n] = d.n as [number];
  const note = await act(page, d, { action: 'comment', n, ver: 1, text: 'Do any accounts still pay quarterly?' });
  await act(page, d, { action: 'send', board: d.board });
  for (const t of texts) await reply(request, d, n, t, note);
  return { d, n, note };
}

/** The bubble's arrow points at the middle of `part` (it opened beside it), to the pixel. */
async function pointsAt(page: Page, part: Locator): Promise<void> {
  await expect(bubble(page)).not.toHaveAttribute('data-side', 'below');
  const [b, p] = [(await bubble(page).boundingBox())!, (await part.boundingBox())!];
  const arrow = parseFloat(await css(bubble(page), '--vb-arrow'));
  expect(Math.abs(b.y + arrow - (p.y + p.height / 2))).toBeLessThanOrEqual(2);
}

// The popover tokens: one text size, 15px, for everything in a popover (rulings 1 and 4, then the
// maintainer's changes, chats 698 and 701), labels and chips 13px, 360px wide.
const TEXT = '15px';

test('the comment box is bigger and one size: 15px for the text typed, heads, hint and buttons, 360px wide, 32px buttons', async ({ page, request }) => {
  const d = await draw(request, 1, 'thread');
  const [n] = d.n as [number];
  await open(page, d);
  await card(page, n).focus();
  await page.keyboard.press('c');
  const b = bubble(page);
  await expect(b).toBeVisible();
  expect(await css(b, 'width')).toBe('360px');
  expect(await css(b, 'font-size')).toBe(TEXT);
  expect(await css(b.getByLabel('Note text'), 'font-size')).toBe(TEXT);
  expect(await css(b.locator('.vb-nb-head'), 'font-size')).toBe(TEXT);
  expect(await css(b.locator('.vb-nb-hint'), 'font-size')).toBe(TEXT);
  expect(await css(b.locator('.vb-nb-btn').first(), 'font-size')).toBe(TEXT);
  expect(await css(b.locator('.vb-nb-num'), 'font-size')).toBe('13px');
  for (const btn of await b.locator('.vb-nb-btn').all()) expect((await btn.boundingBox())!.height).toBeGreaterThanOrEqual(32);
  // Three lines tall at rest, in proportion to the text.
  expect((await b.getByLabel('Note text').boundingBox())!.height).toBeGreaterThanOrEqual(15 * 1.45 * 3);
  await page.keyboard.press('Escape');
  await expect(b).toBeHidden();
});

test('a click on a reply opens the conversation: the note, then every reply in order, beside the reply; Esc closes, focus goes back', async ({ page, request }) => {
  const { d, n } = await exchange(page, request, ['Yes: **three** accounts.', 'Also: the sheet is updated.']);
  await open(page, d);
  await expect(replies(page, n)).toHaveCount(2);
  await replies(page, n).last().click();
  await expect(page.getByRole('dialog', { name: `Conversation on ${n}` })).toBeVisible();
  await expect(bubble(page).locator('.vb-nb-note-text')).toHaveText('Do any accounts still pay quarterly?');
  await expect(shown(page).locator('.vb-nb-who')).toHaveText(['Agent reply · Pricing chat', 'Agent reply · Pricing chat']);
  await expect(shown(page).locator('.vb-nb-reply-text')).toHaveText(['Yes: three accounts.', 'Also: the sheet is updated.']);
  await expect(shown(page).first().locator('strong')).toHaveText('three');
  // One size in the box: the note and the replies (the maintainer's change, chat 701).
  for (const l of [bubble(page).locator('.vb-nb-note-text .vb-md-p'), shown(page).first().locator('.vb-md-p')]) {
    expect(await css(l, 'font-size')).toBe(TEXT);
  }
  await expect(bubble(page).locator('textarea')).toHaveCount(0);
  await expect(bubble(page).getByRole('button')).toHaveCount(1);
  await expect(bubble(page).getByRole('button', { name: 'Close' })).toBeVisible();
  await pointsAt(page, replies(page, n).last());
  await page.keyboard.press('Escape');
  await expect(bubble(page)).toBeHidden();
  await expect(replies(page, n).last()).toBeFocused();
  // The note itself opens the same exchange, beside the note.
  await card(page, n).locator('.vb-node-note').click();
  await expect(shown(page)).toHaveCount(2);
  await pointsAt(page, card(page, n).locator('.vb-node-note'));
  await bubble(page).getByRole('button', { name: 'Close' }).click();
  await expect(bubble(page)).toBeHidden();
});

test('keyboard: Enter and Space on a reply open the exchange; the hover tip still shows a long reply', async ({ page, request }) => {
  const long = Array.from({ length: 12 }, (_, i) => `Line ${i + 1} of the answer.`).join('\n\n');
  const { d, n } = await exchange(page, request, [long]);
  await open(page, d);
  const r = replies(page, n);
  await r.hover();
  await expect(r.locator('.vb-note-tip')).toBeVisible();
  expect(await css(r.locator('.vb-note-tip'), 'width')).toBe('360px');
  expect(await css(r.locator('.vb-note-tip .vb-md-p').first(), 'font-size')).toBe(TEXT);
  await page.locator(bid('stage')).focus();
  await tabTo(page, r);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: `Conversation on ${n}` })).toBeVisible();
  await expect(shown(page)).toContainText('Line 12 of the answer.');
  await page.keyboard.press('Escape');
  await expect(bubble(page)).toBeHidden();
  await expect(r).toBeFocused();
  await page.keyboard.press(' ');
  await expect(bubble(page)).toBeVisible();
  // The card took no Space: it is not selected.
  await expect(card(page, n)).not.toHaveAttribute('data-selected');
  await page.keyboard.press('Escape');
  await expect(r).toBeFocused();
});

test('a reply that names no note opens the card\'s conversation, read-only, with no note in it', async ({ page, request }) => {
  const d = await draw(request, 1, 'thread');
  const [n] = d.n as [number];
  await reply(request, d, n, 'The enterprise floor.');
  await open(page, d);
  await replies(page, n).click();
  await expect(page.getByRole('dialog', { name: `Conversation on ${n}` })).toBeVisible();
  await expect(shown(page)).toHaveCount(1);
  await expect(shown(page)).toContainText('The enterprise floor.');
  await expect(bubble(page).locator('textarea, .vb-nb-note')).toHaveCount(0);
  await expect(bubble(page).getByRole('button')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(replies(page, n)).toBeFocused();
});

// review-polish ruling 8 and decision 8: the card's notes and replies read oldest first, top to bottom,
// like a chat: note 1, its replies, note 2; a reply naming no note sits by time among the notes; a
// new note goes at the bottom; the pin still opens the latest note.
test('a card\'s notes and replies read oldest first, like a chat; an orphan reply sits by time; the pin opens the latest', async ({ page, request }) => {
  const d = await draw(request, 1, 'thread');
  const [n] = d.n as [number];
  const first = await act(page, d, { action: 'comment', n, ver: 1, text: 'Note one.' });
  await act(page, d, { action: 'send', board: d.board });
  await reply(request, d, n, 'Reply one to note one.', first);
  await reply(request, d, n, 'A reply to no note.');
  await act(page, d, { action: 'comment', n, ver: 1, text: 'Note two.' });
  await reply(request, d, n, 'Reply two to note one.', first);
  await open(page, d);
  const rows = card(page, n).locator('.vb-node-note, .vb-node-reply').locator('.vb-node-note-text');
  await expect(rows).toHaveText(['Note one.', 'Reply one to note one.', 'Reply two to note one.', 'A reply to no note.', 'Note two.']);
  await expect(card(page, n).locator('.vb-note-pin')).toHaveText('2');
  await card(page, n).locator('.vb-note-pin').click();
  await expect(page.getByRole('dialog', { name: `Edit note on ${n}` })).toBeVisible();
  await expect(bubble(page).getByLabel('Note text')).toHaveValue('Note two.');
  await page.keyboard.press('Escape');
  await expect(bubble(page)).toBeHidden();
  // A new note goes at the bottom, and the pin moves to it.
  await act(page, d, { action: 'send', board: d.board });
  await act(page, d, { action: 'comment', n, ver: 1, text: 'Note three.' });
  await expect(rows.last()).toHaveText('Note three.');
  await expect(card(page, n).locator('.vb-note-pin')).toHaveText('3');
});

test('the writer\'s note not yet answered still opens to edit from Edit in the conversation, and saves', async ({ page, request }) => {
  const d = await draw(request, 1, 'thread');
  const [n] = d.n as [number];
  await act(page, d, { action: 'comment', n, ver: 1, text: 'Why?' });
  await open(page, d);
  await card(page, n).locator('.vb-node-note').click();
  await bubble(page).getByRole('button', { name: 'Edit note 1' }).click();
  await expect(page.getByRole('dialog', { name: `Edit note on ${n}` })).toBeVisible();
  const text = bubble(page).getByLabel('Note text');
  await expect(text).toBeFocused();
  await page.keyboard.type(' And when?');
  await page.keyboard.press('Enter');
  await expect(bubble(page)).toBeHidden();
  await expect(card(page, n).locator('.vb-node-note .vb-node-note-text')).toHaveText('Why? And when?');
});

// Ruling 5 (found live): the agent's reply to a note not yet sent locks it. A click or the keyboard
// on the reply opens the conversation, the note read-only with the reply under it: no text box, no
// Edit, no Remove.
for (const theme of THEMES) {
  test(`a note the agent answered before a Send opens read-only from its reply, by click and keyboard; C starts a new note; axe (${theme})`, async ({ page, request }) => {
    const d = await draw(request, 1, 'thread');
    const [n] = d.n as [number];
    const note = await act(page, d, { action: 'comment', n, ver: 1, text: 'Why?' });
    await reply(request, d, n, 'Because.', note);
    await setTheme(page, theme);
    await open(page, d);
    await expect(card(page, n).locator('.vb-node-note .vb-node-note-who')).toHaveText('Your note 1 · Answered');
    await replies(page, n).click();
    const dialog = page.getByRole('dialog', { name: `Conversation on ${n}` });
    await expect(dialog).toBeVisible();
    await expect(bubble(page).locator('.vb-nb-note .vb-nb-who')).toHaveText('Your note 1 · Answered');
    await expect(bubble(page).locator('.vb-nb-note-text')).toHaveText('Why?');
    await expect(shown(page)).toContainText('Because.');
    await expect(bubble(page).locator('textarea')).toHaveCount(0);
    await expect(bubble(page).getByRole('button')).toHaveCount(1);
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
    await expect(replies(page, n)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(bubble(page).getByRole('button', { name: /Remove|Save|Edit/ })).toHaveCount(0);
    await page.keyboard.press('Escape');
    // The answered note is no longer the card's note to edit: C starts a new one.
    await card(page, n).focus();
    await page.keyboard.press('c');
    await expect(page.getByRole('dialog', { name: `Note on ${n}` })).toBeVisible();
    await page.keyboard.press('Escape');
  });
}

test('container: a click on a reply in the note block, or Enter on its note, opens the conversation beside it', async ({ page, request }) => {
  const d = await draw(request, 1, 'thread');
  const note = await act(page, d, { action: 'comment', board: d.board, region: 'p', text: 'Is the order right?' });
  await act(page, d, { action: 'send', board: d.board });
  await reply(request, d, d.n[0]!, 'Yes, in **price** order.', note);
  await open(page, d);
  const frame = page.locator('vb-region[data-region="p"]');
  await frame.locator('.vb-region-comment').focus();
  await frame.getByRole('button', { name: 'Show in container' }).click();
  // The preview under Comment closes first (it hangs over the block while focus is in it).
  await page.keyboard.press('Escape');
  await expect(frame.locator('.vb-note-pop')).toBeHidden();
  const block = frame.locator('.vb-region-note-block');
  await expect(block.locator('.vb-nblock-reply')).toHaveCount(1);
  await block.locator('.vb-nblock-reply').click();
  await expect(page.getByRole('dialog', { name: 'Conversation on container Pricing thread' })).toBeVisible();
  await expect(bubble(page)).toHaveAttribute('data-on', 'container');
  await expect(bubble(page).locator('.vb-nb-note-text')).toHaveText('Is the order right?');
  await expect(shown(page)).toHaveCount(1);
  await expect(shown(page).locator('strong')).toHaveText('price');
  await pointsAt(page, block.locator('.vb-nblock-reply'));
  await page.keyboard.press('Escape');
  await expect(bubble(page)).toBeHidden();
  await expect(block.locator('.vb-nblock-reply')).toBeFocused();
  await block.locator('.vb-nblock-text').focus();
  await page.keyboard.press('Enter');
  await expect(shown(page)).toHaveCount(1);
  await pointsAt(page, block.locator('.vb-nblock-text'));
  await page.keyboard.press('Escape');
  await expect(block.locator('.vb-nblock-text')).toBeFocused();
});

for (const theme of THEMES) {
  test(`axe passes with the exchange open on a card, its replies in Markdown (${theme})`, async ({ page, request }) => {
    const { d, n } = await exchange(page, request, ['Yes: **three** accounts.', 'Also: `the sheet` is updated.']);
    await setTheme(page, theme);
    await open(page, d);
    await replies(page, n).first().click();
    await expect(shown(page)).toHaveCount(2);
    await expectNoAxeViolations(page);
  });
}

test('gallery: every popover reads the shared tokens: the bubble, the card popover, the container preview and the note tip', async ({ page }) => {
  await page.goto('/gallery.html');
  const bubbles = page.locator('section[data-pattern="note-bubble"] vb-note-bubble');
  await expect(bubbles.first()).toBeVisible();
  for (const b of await bubbles.all()) {
    expect(await css(b, 'width')).toBe('360px');
    expect(await css(b, 'font-size')).toBe(TEXT);
  }
  // The conversation samples (review polish ruling 6): a card's, opened at the latest and at note 1,
  // with Edit on its note not yet sent, and a container's; each with the × and no bottom row.
  const talks = page.locator('section[data-pattern="note-bubble"] vb-note-bubble[data-mode="thread"]');
  await expect(talks).toHaveCount(3);
  await expect(talks.nth(0).locator('.vb-nb-note')).toHaveCount(3);
  await expect(talks.nth(0).locator('.vb-nb-reply')).toHaveCount(3);
  await expect(talks.nth(0).locator('.vb-nb-orphan')).toHaveCount(1);
  await expect(talks.nth(0).getByRole('button', { name: 'Edit note 3' })).toHaveCount(1);
  await expect(talks.locator('.vb-nb-x')).toHaveCount(3);
  await expect(talks.locator('.vb-nb-row')).toHaveCount(0);
  await expect(talks.nth(2)).toHaveAttribute('data-on', 'container');
  const pop = page.locator('section[data-feature="parking"] .vb-card-pop[data-open]');
  expect(await css(pop, 'width')).toBe('360px');
  expect(await css(pop.locator('.vb-hand-text .vb-md-p').first(), 'font-size')).toBe(TEXT);
  for (const sel of ['vb-region .vb-note-pop', 'vb-node .vb-note-tip']) {
    const l = page.locator(sel).first();
    expect(await css(l, 'width')).toBe('360px');
    expect(await css(l, 'font-size')).toBe(TEXT);
  }
});
