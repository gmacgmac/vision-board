// A card's history (card-polish FE_03, maintainer point 20; D-099 1): H on a node (or its change badge, or the
// right-click list) opens its history box beside it, listing when things happened to it, newest first, from the state
// the page already holds (no ledger read): first drawn and each update, notes sent, agent replies, ✓, ✗ and reopened,
// the app allowed or stopped. No note or reply text, no bookmark. A note or reply row closes the box and opens the
// node's conversation at it; a line that lands while it is open adds its row at the top; Esc closes it; axe light and
// dark. Each test draws its own board through the API.
import type { Page } from '@playwright/test';
import { expect, expectNoAxeOnBoard, setTheme, test, zoomToControls } from './helpers.ts';
import type { Drawn } from './agent-board.ts';
import { act, card, draw, open, reply } from './agent-board.ts';
import { CALCULATOR, startAppServer } from './app-server.ts';
import { APP_SIZE } from '#format';

const NOTE = 'Which plan do most teams pick?';
const REPLY = 'The team plan, by a wide margin.';
const box = (page: Page, n: number) => card(page, n).locator('[data-pop="history"]');
const words = (page: Page, n: number) => box(page, n).locator('.vb-history-row');

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

/** Card 1 drawn, a note sent on it, bookmarked, ✓, and the agent's reply to the note. */
async function story(page: Page, request: Parameters<typeof draw>[0], cards = 2): Promise<{ d: Drawn; n: number; note: number }> {
  const d = await draw(request, cards, 'history');
  const [n] = d.n as [number];
  const note = await act(page, d, { action: 'comment', n, ver: 1, text: NOTE });
  await act(page, d, { action: 'bookmark', n });
  await act(page, d, { action: 'ack', n, ver: 1 });
  await reply(request, d, n, REPLY, note);
  await open(page, d);
  await zoomToControls(page);
  return { d, n, note };
}

/** H on node `n`: its history box. */
async function history(page: Page, n: number): Promise<void> {
  await card(page, n).focus();
  await page.keyboard.press('h');
  await expect(box(page, n)).toHaveAttribute('data-open', '');
}

test('H opens the box: newest first, a time and one line each, no note text and no bookmark; Esc closes it', async ({ page, request }) => {
  const { n } = await story(page, request);
  await history(page, n);
  const b = page.getByRole('dialog', { name: `History of ${n}` });
  await expect(b).toBeVisible();
  await expect(b).toBeFocused();
  await expect(words(page, n)).toHaveText([/^Agent replied to note 1/, /^You marked it ✓/, /^You sent note 1/, /Agent drew v1/]);
  await expect(words(page, n).first()).toContainText('Today');
  // The rows hold no note or reply text and no bookmark (the stepper above them shows the unseen reply, as a step).
  const list = b.locator('.vb-history-list');
  await expect(list).not.toContainText(NOTE);
  await expect(list).not.toContainText(REPLY);
  await expect(b).not.toContainText(/flag|bookmark/i);
  // Only the rows that name a note or a reply are buttons (the box's × aside).
  await expect(words(page, n).and(b.getByRole('button'))).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(b).toBeHidden();
});

test('by keyboard: Down and Up move between the rows that are buttons, Esc closes it', async ({ page, request }) => {
  const { n } = await story(page, request);
  await history(page, n);
  await expect(box(page, n)).toBeFocused();
  const links = box(page, n).locator('button.vb-history-row');
  await page.keyboard.press('ArrowDown');
  await expect(links.first()).toBeFocused();
  await expect(links.first()).toHaveAccessibleName(/Agent replied to note 1/);
  await page.keyboard.press('ArrowDown');
  await expect(links.last()).toBeFocused();
  await expect(links.last()).toHaveAccessibleName(/You sent note 1/);
  await page.keyboard.press('ArrowUp');
  await expect(links.first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(box(page, n)).not.toHaveAttribute('data-open', '');
});

test('a note row or a reply row closes the box and opens the node\'s conversation box at it', async ({ page, request }) => {
  const { n } = await story(page, request);
  await history(page, n);
  await box(page, n).getByRole('button', { name: /You sent note 1/ }).click();
  await expect(box(page, n)).not.toHaveAttribute('data-open', '');
  const talk = page.locator('vb-note-bubble');
  await expect(talk).toBeVisible();
  await expect(talk).toContainText(NOTE);
  await page.keyboard.press('Escape');
  await expect(talk).toBeHidden();
  await history(page, n);
  await box(page, n).getByRole('button', { name: /Agent replied/ }).click();
  await expect(talk).toBeVisible();
  await expect(talk).toContainText(REPLY);
});

test('a line for the card while the box is open adds its row at the top, and focus stays where it was', async ({ page, request }) => {
  const { d, n, note } = await story(page, request);
  await history(page, n);
  await page.keyboard.press('ArrowDown');
  const focused = box(page, n).locator('button.vb-history-row').first();
  await expect(focused).toBeFocused();
  await reply(request, d, n, 'And the annual plan second.', note);
  await expect(words(page, n)).toHaveCount(5);
  await expect(words(page, n).first()).toHaveText(/^Agent replied to note 1/);
  await expect(words(page, n).nth(1)).toBeFocused();
  // Another card's line adds nothing here.
  await act(page, d, { action: 'ack', n: d.n[1], ver: 1 });
  await expect(card(page, d.n[1]!)).toHaveAttribute('data-status', 'acknowledged');
  await expect(words(page, n)).toHaveCount(5);
});

test('the smallest app window: Allow, then Allowed ▾; its history box says the app was allowed', async ({ page }) => {
  const s = await startAppServer();
  try {
    const { board, n: [n] } = await s.draw([{ ...CALCULATOR, app: { id: 'calculator', w: APP_SIZE.w.min, h: APP_SIZE.h.min } }]);
    await page.goto(`${s.base}/#${board}`);
    await zoomToControls(page);
    const a = card(page, n!);
    await expect(a.getByRole('button', { name: 'Allow app: Calculator' })).toBeVisible();
    await a.getByRole('button', { name: 'Allow app: Calculator' }).click();
    await page.getByRole('dialog', { name: 'Allow Calculator to run?' }).getByRole('button', { name: 'Allow', exact: true }).click();
    await expect(a.getByRole('button', { name: 'App allowed: Calculator' })).toBeVisible();
    await history(page, n!);
    await expect(words(page, n!)).toHaveText([/^You allowed the app/, /Agent drew v1/]);
  } finally {
    await s.close();
  }
});

for (const theme of ['dark', 'light'] as const) {
  test(`${theme}: axe finds nothing with the box open`, async ({ page, request }) => {
    await setTheme(page, theme);
    const { n } = await story(page, request, 1);
    await history(page, n);
    await expectNoAxeOnBoard(page);
  });
}
