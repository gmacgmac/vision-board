// A card's history (card-polish FE_03, maintainer point 20): the ⓘ at the far right of every card's
// footer opens a box beside the card, by click or keyboard, listing when things happened to it,
// newest first, from the state the page already holds (no ledger read): first drawn and each update,
// notes sent, agent replies, ✓, ✗ and reopened, the app allowed or stopped. No note or reply text, no
// flag. A note or reply row closes the box and rings that note on the card; a line that lands while it
// is open adds its row at the top; Esc gives focus back to the ⓘ; the footer never wraps on an S card
// or the smallest app card; axe light and dark. Each test draws its own board through the API.
import type { Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test, zoomToControls } from './helpers.ts';
import type { Drawn } from './agent-board.ts';
import { act, card, draw, open, reply } from './agent-board.ts';
import { CALCULATOR, startAppServer } from './app-server.ts';
import { APP_SIZE } from '../../packages/format/src/index.ts';

const NOTE = 'Which plan do most teams pick?';
const REPLY = 'The team plan, by a wide margin.';
const info = (page: Page, n: number) => card(page, n).locator('button.vb-history');
const box = (page: Page, n: number) => card(page, n).locator('[data-pop="history"]');
const words = (page: Page, n: number) => box(page, n).locator('.vb-history-row');

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

/** Card 1 drawn, a note sent on it, flagged, ✓, and the agent's reply to the note. */
async function story(page: Page, request: Parameters<typeof draw>[0]): Promise<{ d: Drawn; n: number; note: number }> {
  const d = await draw(request, 2, 'history');
  const [n] = d.n as [number];
  const note = await act(page, d, { action: 'comment', n, ver: 1, text: NOTE });
  await act(page, d, { action: 'flag', n });
  await act(page, d, { action: 'ack', n, ver: 1 });
  await reply(request, d, n, REPLY, note);
  await open(page, d);
  await zoomToControls(page);
  return { d, n, note };
}

/** Every control in `l`'s footer sits on one line, and the footer does not overflow. */
async function oneLine(l: Locator): Promise<void> {
  const r = await l.locator('.vb-node-foot').evaluate((f) => {
    const kids = [...f.querySelectorAll<HTMLElement>(':scope > *, .vb-node-actions > *, .vb-app-status > *')].filter((k) => k.checkVisibility());
    const mids = kids.map((k) => { const b = k.getBoundingClientRect(); return b.top + b.height / 2; });
    return { spread: Math.max(...mids) - Math.min(...mids), over: f.scrollWidth - f.clientWidth };
  });
  expect(r.over).toBeLessThanOrEqual(0);
  expect(r.spread).toBeLessThanOrEqual(6);
}

/** The ⓘ is the footer's last control, at its right edge. */
async function farRight(l: Locator): Promise<void> {
  const [i, foot] = [(await l.locator('button.vb-history').boundingBox())!, (await l.locator('.vb-node-foot').boundingBox())!];
  expect(foot.x + foot.width - (i.x + i.width)).toBeLessThan(12);
}

test('a click on the ⓘ opens the box: newest first, a time and one line each, no note text and no flag; Esc gives focus back', async ({ page, request }) => {
  const { n } = await story(page, request);
  await expect(info(page, n)).toHaveAccessibleName(`History of card ${n}`);
  await expect(info(page, n)).toHaveAttribute('aria-expanded', 'false');
  await info(page, n).click();
  const b = page.getByRole('dialog', { name: `Card ${n} history` });
  await expect(b).toBeVisible();
  await expect(info(page, n)).toHaveAttribute('aria-expanded', 'true');
  await expect(b).toBeFocused();
  // Level with the card's bottom, where the ⓘ is (maintainer, 2026-10-19), not its top.
  const [box, c] = [(await b.boundingBox())!, (await card(page, n).boundingBox())!];
  expect(Math.abs(box.y + box.height - (c.y + c.height))).toBeLessThan(2);
  await expect(words(page, n)).toHaveText([
    /Agent replied to note 1 · Pricing chat$/, /You marked it ✓$/, /You sent note 1$/, /Agent drew v1 · Pricing chat$/,
  ]);
  await expect(words(page, n).first().locator('time')).toHaveText(/^Today /);
  await expect(b).not.toContainText(NOTE);
  await expect(b).not.toContainText(REPLY);
  await expect(b).not.toContainText(/flag/i);
  // Only the rows that name a note or a reply are buttons.
  await expect(b.getByRole('button')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(b).toBeHidden();
  await expect(info(page, n)).toBeFocused();
});

test('by keyboard: Enter on the ⓘ opens it, Down and Up move between the rows that are buttons, Esc closes it', async ({ page, request }) => {
  const { n } = await story(page, request);
  await info(page, n).focus();
  await page.keyboard.press('Enter');
  await expect(box(page, n)).toBeFocused();
  const links = box(page, n).getByRole('button');
  await page.keyboard.press('ArrowDown');
  await expect(links.first()).toBeFocused();
  await expect(links.first()).toHaveAccessibleName(/Agent replied to note 1/);
  await page.keyboard.press('ArrowDown');
  await expect(links.last()).toBeFocused();
  await expect(links.last()).toHaveAccessibleName(/You sent note 1/);
  await page.keyboard.press('ArrowUp');
  await expect(links.first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(box(page, n)).toBeHidden();
  await expect(info(page, n)).toBeFocused();
});

test('a note row closes the box, shows the notes if put away, and rings that note; a reply row rings the reply', async ({ page, request }) => {
  const { d, n, note } = await story(page, request);
  await act(page, d, { action: 'notes-hide', n });
  await expect(card(page, n).locator('.vb-node-note')).toHaveCount(0);
  await info(page, n).click();
  await box(page, n).getByRole('button', { name: /You sent note 1/ }).click();
  await expect(box(page, n)).toBeHidden();
  const shown = card(page, n).locator(`.vb-node-note[data-note="${note}"]`);
  await expect(shown).toBeFocused();
  await expect(shown).toHaveAttribute('data-flash', '');
  await info(page, n).click();
  await box(page, n).getByRole('button', { name: /Agent replied/ }).click();
  await expect(box(page, n)).toBeHidden();
  await expect(card(page, n).locator('.vb-node-reply')).toBeFocused();
  await expect(card(page, n).locator('.vb-node-reply')).toHaveAttribute('data-flash', '');
});

test('a line for the card while the box is open adds its row at the top, and focus stays where it was', async ({ page, request }) => {
  const { d, n, note } = await story(page, request);
  await info(page, n).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  const focused = box(page, n).getByRole('button').first();
  await expect(focused).toBeFocused();
  await reply(request, d, n, 'And the annual plan second.', note);
  await expect(words(page, n)).toHaveCount(5);
  await expect(words(page, n).first()).toHaveText(/Agent replied to note 1 · Pricing chat$/);
  await expect(words(page, n).nth(1)).toBeFocused();
  // Another card's line adds nothing here.
  await act(page, d, { action: 'ack', n: d.n[1], ver: 1 });
  await expect(card(page, d.n[1]!)).toHaveAttribute('data-status', 'acknowledged');
  await expect(words(page, n)).toHaveCount(5);
});

test('the footer never wraps on an S card, the ⓘ at its far right', async ({ page, request }) => {
  const { d, n } = await story(page, request);
  await act(page, d, { action: 'size', n, size: 's' });
  await expect(card(page, n)).toHaveAttribute('data-size', 's');
  await oneLine(card(page, n));
  await farRight(card(page, n));
});

test('the smallest app card: Allow, then Allowed ▾, each on one line with the ⓘ; the box says the app was allowed', async ({ page }) => {
  const s = await startAppServer();
  try {
    const { board, n: [n] } = await s.draw([{ ...CALCULATOR, app: { id: 'calculator', w: APP_SIZE.w.min, h: APP_SIZE.h.min } }]);
    await page.goto(`${s.base}/#${board}`);
    await zoomToControls(page);
    const a = card(page, n!);
    await expect(a.getByRole('button', { name: 'Allow app: Calculator' })).toBeVisible();
    await oneLine(a);
    await farRight(a);
    await a.getByRole('button', { name: 'Allow app: Calculator' }).click();
    await page.getByRole('dialog', { name: 'Allow Calculator to run?' }).getByRole('button', { name: 'Allow', exact: true }).click();
    await expect(a.getByRole('button', { name: 'App allowed: Calculator' })).toBeVisible();
    await oneLine(a);
    await info(page, n!).click();
    await expect(words(page, n!)).toHaveText([/You allowed the app$/, /Agent drew v1 · App cards build$/]);
  } finally {
    await s.close();
  }
});

for (const theme of ['dark', 'light'] as const) {
  test(`${theme}: axe finds nothing with the box open`, async ({ page, request }) => {
    await setTheme(page, theme);
    const { n } = await story(page, request);
    await info(page, n).click();
    await expect(box(page, n)).toBeVisible();
    await expectNoAxeViolations(page);
  });
}
