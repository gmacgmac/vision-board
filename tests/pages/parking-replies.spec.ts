// Parking and replies on the page (proposals-seen-parking FE_03, D-020, api.md 36 and 73), behind the
// handover and cardReplies flags (rule 12, on by default): a card moved to Later says "Awaiting" until
// the agent writes its handover, then carries a HANDOVER tab that opens it; an agent's reply shows
// under the note it answers, on a card and in a container's note block, live; the keyboard path; axe
// light and dark; then the gallery's Parking and replies section.
//
// Each test draws its own board through the API, as an agent would (agent-board.ts).
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import type { Drawn } from './agent-board.ts';
import { act, card, draw, open, reply, tabTo, write } from './agent-board.ts';

const THEMES: Theme[] = ['dark', 'light'];
test.use({ timezoneId: 'UTC', locale: 'en-GB' });

const BUNDLE = {
  situation: 'The trial **starts** without a card.', background: 'Support asked twice.\n\n- March\n- April',
  assessment: 'Low risk.', recommendation: 'Ship it.', sources: ['Support thread', 'Pricing sheet'],
};
const park = (request: APIRequestContext, d: Drawn, n: number) => write(request, d, [{ type: 'park', n, bundle: BUNDLE }]);
const status = (page: Page, n: number) => card(page, n).locator('.vb-node-status');
const tab = (page: Page, n: number) => card(page, n).locator('.vb-node-btab[data-tab="handover"]');
const box = (page: Page, n: number) => card(page, n).locator('.vb-card-pop[data-pop="handover"]');
const notes = (page: Page, n: number) => card(page, n).locator('.vb-node-notes');
const replies = (page: Page, n: number) => card(page, n).locator('.vb-node-reply');

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

test('moving a card to Later shows Awaiting with its tip; the agent\'s handover turns it into a HANDOVER tab that opens it', async ({ page, request }) => {
  const d = await draw(request, 2);
  const [n, other] = d.n as [number, number];
  await open(page, d);
  await expect(status(page, n)).toHaveText('Open');
  await expect(tab(page, n)).toBeHidden();
  await card(page, n).locator('button[data-act="later"]').click();
  await expect(card(page, n)).toHaveAttribute('data-status', 'later');
  await expect(status(page, n)).toHaveText('Awaiting');
  await expect(card(page, n)).toHaveAttribute('aria-label', 'Item ' + n + ', Question: Card 1, Saved for later, awaiting context');
  await expect(tab(page, n)).toBeHidden();
  await card(page, n).locator('.vb-node-state').hover();
  await expect(card(page, n).locator('.vb-status-tip')).toBeVisible();
  await expect(card(page, n).locator('.vb-status-tip')).toHaveText('Awaiting context');
  await expect(status(page, other)).toHaveText('Open');
  // The handover arrives live.
  await park(request, d, n);
  await expect(status(page, n)).toHaveText('Saved for later');
  await expect(tab(page, n)).toBeVisible();
  await expect(tab(page, n)).toHaveText('Handover');
  await expect(tab(page, n)).toHaveAttribute('aria-label', `Handover on item ${n}`);
  await expect(card(page, n)).toHaveAttribute('aria-label', /, Saved for later, handover ready$/);
  await expect(box(page, n)).toBeHidden();
  await tab(page, n).click();
  await expect(box(page, n)).toBeVisible();
  await expect(box(page, n).locator('.vb-hand-head')).toHaveText(['Situation', 'Background', 'Assessment', 'Recommendation', 'Sources']);
  await expect(box(page, n).locator('.vb-hand-text').first().locator('strong')).toHaveText('starts');
  await expect(box(page, n).locator('.vb-hand-text').nth(1).locator('li')).toHaveText(['March', 'April']);
  await expect(box(page, n).locator('.vb-hand-sources li')).toHaveText(['Support thread', 'Pricing sheet']);
  await page.keyboard.press('Escape');
  await expect(box(page, n)).toBeHidden();
});

test('moving the card out of Later and back asks for a new handover: Awaiting again, no tab', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  await park(request, d, n);
  await open(page, d);
  await card(page, n).locator('button[data-act="later"]').click();
  await expect(status(page, n)).toHaveText('Awaiting');
  await expect(tab(page, n)).toBeHidden();
  await park(request, d, n);
  await expect(status(page, n)).toHaveText('Saved for later');
  await expect(tab(page, n)).toBeVisible();
});

test('a reply shows under the note it answers, live; one naming no note comes after the notes', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  const note = await act(page, d, { action: 'comment', n, ver: 1, text: 'Do any accounts still pay quarterly?' });
  await open(page, d);
  await expect(notes(page, n).locator('.vb-node-note')).toHaveCount(1);
  await expect(replies(page, n)).toHaveCount(0);
  await reply(request, d, n, 'Yes: **three** accounts.', note);
  await expect(replies(page, n)).toHaveCount(1);
  await expect(replies(page, n).locator('.vb-node-note-who')).toHaveText('Agent reply · Pricing chat');
  await expect(replies(page, n).locator('.vb-node-note-text strong')).toHaveText('three');
  // Under its note: the reply follows the note, in the same block; a click on it opens the exchange
  // (popover-thread.spec.ts has the rest).
  const order = await notes(page, n).locator('.vb-node-note, .vb-node-reply').evaluateAll((els) => els.map((e) => e.className));
  expect(order).toEqual(['vb-node-note', 'vb-node-reply']);
  await replies(page, n).click();
  // The reply answered the note (not yet sent), so it is history and opens read-only (ruling 5).
  await expect(page.getByRole('dialog', { name: `Note 1 on ${n}, answered` })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('vb-note-bubble')).toBeHidden();
  await reply(request, d, n, 'Also: the sheet is updated.');
  await expect(replies(page, n)).toHaveCount(2);
  await expect(replies(page, n).last()).toContainText('the sheet is updated');
});

test('a long reply is cut at three lines and its full text shows on hover', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  const note = await act(page, d, { action: 'comment', n, ver: 1, text: 'Why?' });
  await open(page, d);
  await reply(request, d, n, Array.from({ length: 12 }, (_, i) => `Line ${i + 1} of the answer.`).join('\n\n'), note);
  await expect(replies(page, n)).toHaveCount(1);
  const tip = replies(page, n).locator('.vb-note-tip');
  await expect(tip).toBeHidden();
  await replies(page, n).hover();
  await expect(tip).toBeVisible();
  await expect(tip).toContainText('Line 12 of the answer.');
});

test('a reply to a container note shows under it in the note block', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  const note = await act(page, d, { action: 'comment', board: d.board, region: 'p', text: 'Is the order right?' });
  await act(page, d, { action: 'send', board: d.board });
  await open(page, d);
  const frame = page.locator('vb-region[data-region="p"]');
  await frame.locator('.vb-region-comment').focus();
  await frame.getByRole('button', { name: 'Show in container' }).click();
  const block = frame.locator('.vb-region-note-block');
  await expect(block).toBeVisible();
  await expect(block.locator('.vb-nblock-reply')).toHaveCount(0);
  await reply(request, d, n, 'Yes, in **price** order.', note);
  await expect(block.locator('.vb-nblock-reply')).toHaveCount(1);
  await expect(block.locator('.vb-nblock-reply .vb-nblock-who')).toHaveText('Agent reply · Pricing chat');
  await expect(block.locator('.vb-nblock-reply strong')).toHaveText('price');
  // It is on no card.
  await expect(replies(page, n)).toHaveCount(0);
});

test('keyboard only: Tab to the HANDOVER tab previews, Enter opens it with focus in the box, Esc goes back to the tab; a reply is a tab stop', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  const note = await act(page, d, { action: 'comment', n, ver: 1, text: 'Why?' });
  await act(page, d, { action: 'later', n, ver: 1 });
  await park(request, d, n);
  await reply(request, d, n, 'Because.', note);
  await open(page, d);
  await page.locator('#stage').focus();
  await tabTo(page, tab(page, n));
  await expect(box(page, n)).toBeVisible();
  await expect(tab(page, n)).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(box(page, n)).toBeHidden();
  await expect(tab(page, n)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(box(page, n)).toBeFocused();
  await expect(box(page, n)).toHaveAttribute('aria-label', `Handover on item ${n}`);
  await page.keyboard.press('Escape');
  await expect(tab(page, n)).toBeFocused();
  await tabTo(page, replies(page, n));
  await expect(replies(page, n)).toBeFocused();
});

test('flags off: no Awaiting, no tab, no reply', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  const note = await act(page, d, { action: 'comment', n, ver: 1, text: 'Why?' });
  await act(page, d, { action: 'later', n, ver: 1 });
  await open(page, d, '?flags=-handover,-cardReplies');
  await reply(request, d, n, 'Because.', note);
  await park(request, d, n);
  await expect(card(page, n)).toHaveAttribute('data-status', 'later');
  await expect(notes(page, n).locator('.vb-node-note')).toHaveCount(1);
  await expect(status(page, n)).toHaveText('Saved for later');
  await expect(tab(page, n)).toBeHidden();
  await expect(replies(page, n)).toHaveCount(0);
  // Later came after the note, so the reply clears nothing; it is still an update the person has not seen (D-045).
  await expect(card(page, n)).toHaveAttribute('aria-label', /, Saved for later, 1 unseen update$/);
});

for (const theme of THEMES) {
  test(`axe passes with Awaiting, an open handover and replies (${theme})`, async ({ page, request }) => {
    const d = await draw(request, 2);
    const [a, b] = d.n as [number, number];
    const note = await act(page, d, { action: 'comment', n: a, ver: 1, text: 'Why?' });
    await act(page, d, { action: 'later', n: a, ver: 1 });
    await act(page, d, { action: 'later', n: b, ver: 1 });
    await park(request, d, a);
    await reply(request, d, a, 'Because.', note);
    await reply(request, d, a, 'And one more thing.');
    await setTheme(page, theme);
    await open(page, d);
    await expect(status(page, b)).toHaveText('Awaiting');
    await tab(page, a).click();
    await expect(box(page, a)).toBeVisible();
    await expectNoAxeViolations(page);
  });
}

// ---- The gallery's Parking and replies section ----

const section = (page: Page) => page.locator('section[data-feature="parking"]');

test('gallery: the Parking and replies section shows by default and not with both flags off', async ({ page }) => {
  await page.goto('/gallery.html?flags=-handover,-cardReplies');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  const s = section(page);
  await expect(s.locator('vb-node')).toHaveCount(5);
  await expect(s.locator('.vb-node-status:visible')).toHaveText(['Awaiting', 'Awaiting', 'Open']);
  await expect(s.locator('.vb-node-btab[data-tab="handover"]:visible')).toHaveText('Handover');
  await expect(s.locator('.vb-card-pop[data-open] .vb-hand-head')).toHaveText(['Situation', 'Background', 'Assessment', 'Recommendation', 'Sources']);
  await expect(s.locator('.vb-node-reply')).toHaveCount(2);
  await expect(s.locator('.vb-nblock-reply')).toHaveCount(1);
});

for (const theme of THEMES) {
  test(`gallery: Parking and replies passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`parking-replies-${theme}.png`);
  });
}
