// Parking and replies on the page (proposals-seen-parking FE_03, D-020, api.md 36 and 73), behind the
// handover and cardReplies flags (rule 12, on by default): a card moved to Later shows the quiet Awaiting tab on its
// bottom edge until the agent writes its handover, which then is a "Handover" section of the node's body (DESIGN_01
// review); an agent's reply shows under the note it answers, in the node's conversation box and in a container's note
// block, live; axe light and dark; then the gallery's Parking and replies section.
//
// Each test draws its own board through the API, as an agent would (agent-board.ts).
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import type { Drawn } from './agent-board.ts';
import { act, card, draw, open, reply, write } from './agent-board.ts';

const THEMES: Theme[] = ['dark', 'light'];
test.use({ timezoneId: 'UTC', locale: 'en-GB' });

const BUNDLE = {
  situation: 'The trial **starts** without a card.', background: 'Support asked twice.\n\n- March\n- April',
  assessment: 'Low risk.', recommendation: 'Ship it.', sources: ['Support thread', 'Pricing sheet'],
};
const park = (request: APIRequestContext, d: Drawn, n: number) => write(request, d, [{ type: 'park', n, bundle: BUNDLE }]);
const awaiting = (page: Page, n: number) => card(page, n).locator('.vb-mark-awaiting');
const handover = (page: Page, n: number) => card(page, n).locator('.vb-node-handover');
const box = (page: Page) => page.locator('vb-note-bubble[data-mode="conversation"]');
const boxReplies = (page: Page) => box(page).locator('.vb-nb-reply');

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

test('moving a card to Later shows Awaiting with its tip; the agent\'s handover becomes a Handover section of its body', async ({ page, request }) => {
  const d = await draw(request, 2);
  const [n, other] = d.n as [number, number];
  await open(page, d);
  await expect(awaiting(page, n)).toBeHidden();
  await expect(handover(page, n)).toBeHidden();
  await card(page, n).focus();
  await page.keyboard.press('l');
  await expect(card(page, n)).toHaveAttribute('data-status', 'later');
  await expect(awaiting(page, n)).toBeVisible();
  await expect(awaiting(page, n)).toHaveText('Awaiting');
  await expect(awaiting(page, n)).toHaveAttribute('title', 'The handover is still owed');
  await expect(card(page, n)).toHaveAttribute('aria-label', 'Item ' + n + ', Question: Card 1, Saved for later, awaiting context');
  await expect(awaiting(page, other)).toBeHidden();
  // The handover arrives live.
  await park(request, d, n);
  await expect(awaiting(page, n)).toBeHidden();
  await expect(handover(page, n)).toBeVisible();
  await expect(handover(page, n).locator('.vb-node-handover-head')).toHaveText('Handover');
  await expect(card(page, n)).toHaveAttribute('aria-label', /, Saved for later, handover ready$/);
  await expect(handover(page, n).locator('.vb-hand-head')).toHaveText(['Situation', 'Background', 'Assessment', 'Recommendation', 'Sources']);
  await expect(handover(page, n).locator('.vb-hand-text').first().locator('strong')).toHaveText('starts');
  await expect(handover(page, n).locator('.vb-hand-text').nth(1).locator('li')).toHaveText(['March', 'April']);
  await expect(handover(page, n).locator('.vb-hand-sources li')).toHaveText(['Support thread', 'Pricing sheet']);
});

test('moving the card out of Later and back asks for a new handover: Awaiting again, no section', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  await park(request, d, n);
  await open(page, d);
  await card(page, n).focus();
  await page.keyboard.press('l');
  await expect(awaiting(page, n)).toBeVisible();
  await expect(handover(page, n)).toBeHidden();
  await park(request, d, n);
  await expect(awaiting(page, n)).toBeHidden();
  await expect(handover(page, n)).toBeVisible();
});

test('a reply shows under the note it answers in the conversation box, live; one naming no note comes after the notes', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  const note = await act(page, d, { action: 'comment', n, ver: 1, text: 'Do any accounts still pay quarterly?' });
  await open(page, d);
  await reply(request, d, n, 'Yes: **three** accounts.', note);
  // An unread reply fills the notes mark.
  await expect(card(page, n).locator('[data-mark="notes"]')).toHaveAttribute('data-notes-mark', 'unread');
  await card(page, n).locator('[data-mark="notes"]').click();
  await expect(box(page)).toBeVisible();
  await expect(boxReplies(page)).toHaveCount(1);
  await expect(boxReplies(page).locator('strong')).toHaveText('three');
  // Under its note: the reply follows the note.
  const order = await box(page).locator('.vb-nb-note, .vb-nb-reply').evaluateAll((els) => els.map((e) => e.className.split(' ')[0]));
  expect(order).toEqual(['vb-nb-note', 'vb-nb-reply']);
  await reply(request, d, n, 'Also: the sheet is updated.');
  await expect(boxReplies(page)).toHaveCount(2);
  await expect(boxReplies(page).last()).toContainText('the sheet is updated');
});

test('a reply to a container note shows under it in the note block, on no node', async ({ page, request }) => {
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
  // It is on no node.
  await expect(card(page, n).locator('[data-mark="notes"] .vb-mark-text')).toHaveText('');
});

test('flags off: no Awaiting, no handover section, no reply', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  const note = await act(page, d, { action: 'comment', n, ver: 1, text: 'Why?' });
  await act(page, d, { action: 'later', n, ver: 1 });
  await open(page, d, '?flags=-handover,-cardReplies');
  await reply(request, d, n, 'Because.', note);
  await park(request, d, n);
  await expect(card(page, n)).toHaveAttribute('data-status', 'later');
  await expect(awaiting(page, n)).toBeHidden();
  await expect(handover(page, n)).toBeHidden();
  // Later came after the note, so the reply clears nothing; it is still an update the person has not seen (D-045).
  await expect(card(page, n)).toHaveAttribute('aria-label', /, Saved for later, 1 unseen update$/);
  await card(page, n).locator('[data-mark="notes"]').click();
  await expect(box(page).locator('.vb-nb-note')).toHaveCount(1);
  await expect(boxReplies(page)).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`axe passes with Awaiting, a handover section and replies in the box (${theme})`, async ({ page, request }) => {
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
    await expect(awaiting(page, b)).toBeVisible();
    await expect(handover(page, a)).toBeVisible();
    await card(page, a).locator('[data-mark="notes"]').click();
    await expect(boxReplies(page)).toHaveCount(2);
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
  await expect(s.locator('vb-node')).toHaveCount(4);
  // Awaiting: the quiet tab on the bottom edge, on the card that waits only.
  await expect(s.locator('.vb-mark-awaiting:visible')).toHaveCount(1);
  await expect(s.locator('.vb-mark-awaiting:visible')).toHaveText('Awaiting');
  // The handover is a section of the node's body (DESIGN_01 review).
  await expect(s.locator('.vb-node-handover:visible .vb-hand-head')).toHaveText(['Situation', 'Background', 'Assessment', 'Recommendation', 'Sources']);
  // The replies are read in the conversation box: on the node, its notes mark counts them.
  await expect(s.locator('.vb-node-reply, .vb-node-btab')).toHaveCount(0);
  await expect(s.locator('vb-node [data-mark="notes"]:not([data-notes-mark="none"])')).toHaveCount(2);
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
