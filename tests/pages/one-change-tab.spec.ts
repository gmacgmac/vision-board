// One tab for updates and a proposal (oneChangeTab flag, on by default; point 444,
// cortex-tasks/board/2026-11-05_board-ui_one-change-tab.md): a card the agent changed and proposed on in the
// same round shows one bottom tab, "1 update · proposal", in the updated amber, named for both; opening it shows
// the proposal first, Accept and Reject as from the proposal tab, and the update steps beneath, Back and Next in
// the box; closing it folds them. Accepting marks the card and leaves the updates tab alone, or none. Out of
// date as today. A proposal alone and updates alone keep their own tabs; the flag off shows two tabs. Keyboard,
// focus and Esc; light and dark, axe, APCA (labels Lc 45). Each test draws its own board through the API.
import type { Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { act, card, open, tabTo, write } from './agent-board.ts';
import { tab as updatesTab } from './board-page.ts';
import { box, draw, propose, tab } from './proposals-board.ts';
import type { Drawn } from './proposals-board.ts';
import { lc, pixel, resolved } from './apca.ts';

const THEMES: Theme[] = ['light', 'dark'];

/** What card 1 carries: the change and a proposal on it ('fresh'), a proposal from before the change
 *  ('stale'), a proposal alone, or the change alone. */
type Has = 'fresh' | 'stale' | 'proposal' | 'update';

/** A board of one card and the agent's round, then the page opened on it (with `query`): a proposal at
 *  version 2 arriving live right after the change sometimes never shows (tracker N50), so it is not live here. */
async function board(page: Page, request: Parameters<typeof draw>[0], has: Has, query = ''): Promise<{ d: Drawn; n: number }> {
  const d = await draw(request);
  const n = d.n[0]!;
  if (has === 'stale' || has === 'proposal') await propose(request, d, n, 'check', 'both agreed in the email');
  if (has !== 'proposal') await write(request, d, [{ type: 'node', n, node: { region: 'p', kind: 'question', title: 'Card 1', body: 'Both agreed to move in March.' } }]);
  if (has === 'fresh') await propose(request, d, n, 'check', 'both agreed in the email', 2);
  await open(page, d, query);
  return { d, n };
}

/** The bottom tabs that show, by name and words. */
const shown = (page: Page, n: number) => card(page, n).locator('.vb-node-btab:not([hidden])').evaluateAll((ts) => ts.map((t) => `${(t as HTMLElement).dataset.tab}: ${t.textContent}`));
const steps = (page: Page, n: number) => box(page, n).locator('.vb-node-steps');
const next = (page: Page, n: number) => box(page, n).getByRole('button', { name: 'Next' });

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

test('both: one tab, "1 update · proposal", named for both, and the card\'s name says both', async ({ page, request }) => {
  const { n } = await board(page, request, 'fresh');
  await expect.poll(() => shown(page, n)).toEqual(['proposal: 1 update · proposal']);
  await expect(tab(page, n)).toHaveAttribute('aria-label', `1 update and a proposal on item ${n}`);
  await expect(tab(page, n)).toHaveAttribute('data-updated', '');
  await expect(updatesTab(page, n)).toBeHidden();
  await expect(card(page, n)).toHaveAttribute('aria-label', /, 1 proposal, 1 unseen update$/);
});

test('opened: the proposal first, then the step and its stepper in the box; the card keeps its footer and size', async ({ page, request }) => {
  const { n } = await board(page, request, 'fresh');
  await expect(tab(page, n)).toBeVisible();
  const height = await card(page, n).evaluate((e) => (e as HTMLElement).offsetHeight);
  await tab(page, n).click();
  await expect(box(page, n)).toBeVisible();
  await expect(box(page, n)).toHaveAccessibleName(`1 update and a proposal on item ${n}`);
  await expect(box(page, n).getByRole('button', { name: `Reject: check ${n}` })).toBeFocused();
  // In order of what to do: the proposal, then the step under it.
  const order = await box(page, n).evaluate((b) => [...b.children].filter((c) => !(c as HTMLElement).hidden).map((c) => c.className));
  expect(order).toEqual(['vb-prop', 'vb-node-steps', 'vb-node-stepnav']);
  await expect(steps(page, n)).toContainText('v2');
  await expect(box(page, n).locator('.vb-node-stepcount')).toHaveText('Update 1 of 1');
  // The card itself: no step section, no stepper in the footer, the same height.
  await expect(card(page, n)).not.toHaveAttribute('data-stepping');
  await expect(card(page, n).locator('.vb-node-actions')).toBeVisible();
  expect(await card(page, n).evaluate((e) => (e as HTMLElement).offsetHeight)).toBe(height);
  // Next past the last step: "You're up to date", focus back on the proposal; the tab is the proposal's own.
  await next(page, n).click();
  await expect(steps(page, n)).toHaveText('You\'re up to date');
  await expect(box(page, n).getByRole('button', { name: `Reject: check ${n}` })).toBeFocused();
  await expect.poll(() => shown(page, n)).toEqual(['proposal: Proposal']);
  // It folds away; the box stays open on the proposal.
  await expect(steps(page, n)).toHaveCount(0);
  await expect(box(page, n)).toBeVisible();
});

test('Accept from it marks the card as from the proposal tab; the tab then is "1 update" alone, or none', async ({ page, request }) => {
  const { n } = await board(page, request, 'fresh');
  await tab(page, n).click();
  await box(page, n).getByRole('button', { name: `Accept: check ${n}` }).click();
  await expect(card(page, n)).toHaveAttribute('data-status', 'acknowledged');
  await expect(page.locator('#toast')).toHaveText(`Accepted: check ${n}`);
  await expect(box(page, n)).toBeHidden();
  await expect(card(page, n)).not.toHaveAttribute('data-stepping');
  // The step shown was seen, so the update has gone too; nothing is left open in the card.
  await expect.poll(() => shown(page, n)).toEqual([]);
  await expect(card(page, n).locator('.vb-node-steps')).toBeHidden();
  await expect(card(page, n).locator('.vb-node-content > .vb-node-steps')).toHaveCount(1);
});

test('Accept from the preview, the step never shown: the card is marked, and the act clears the update too (D-054)', async ({ page, request }) => {
  const { n } = await board(page, request, 'fresh');
  await tab(page, n).hover();
  await expect(box(page, n)).toBeVisible();
  await expect(steps(page, n)).toBeHidden();
  await box(page, n).getByRole('button', { name: `Accept: check ${n}` }).click();
  await expect(card(page, n)).toHaveAttribute('data-status', 'acknowledged');
  await expect.poll(() => shown(page, n)).toEqual([]);
  await expect(card(page, n).locator('.vb-node-content > .vb-node-steps')).toHaveCount(1);
});

test('out of date: "1 update · out of date"; the box says why and Accept can\'t be pressed', async ({ page, request }) => {
  const { n } = await board(page, request, 'stale');
  await expect.poll(() => shown(page, n)).toEqual(['proposal: 1 update · out of date']);
  await expect(tab(page, n)).toHaveAttribute('aria-label', `1 update and a proposal on item ${n}, out of date`);
  await tab(page, n).click();
  await expect(box(page, n).locator('.vb-prop-why')).toHaveText(`${n} changed after this was proposed. Ask the agent to look again.`);
  await expect(box(page, n).getByRole('button', { name: `Accept: check ${n} (out of date)` })).toHaveAttribute('aria-disabled', 'true');
  await expect(steps(page, n)).toContainText('v2');
});

test('a proposal alone keeps its own tab', async ({ page, request }) => {
  const p = await board(page, request, 'proposal');
  await expect.poll(() => shown(page, p.n)).toEqual(['proposal: Proposal']);
  await expect(tab(page, p.n)).not.toHaveAttribute('data-updated');
});

test('updates alone keep their own tab, the steps in the card', async ({ page, request }) => {
  const u = await board(page, request, 'update');
  await expect.poll(() => shown(page, u.n)).toEqual(['updates: 1 update']);
  await updatesTab(page, u.n).click();
  await expect(card(page, u.n)).toHaveAttribute('data-stepping', '');
  await expect(card(page, u.n).locator('.vb-node-content > .vb-node-steps')).toBeVisible();
});

test('flag off: two tabs, the steps in the card as before', async ({ page, request }) => {
  const { n } = await board(page, request, 'fresh', '?flags=-oneChangeTab');
  await expect.poll(() => shown(page, n)).toEqual(['proposal: Proposal', 'updates: 1 update']);
  await tab(page, n).click();
  await expect(box(page, n).locator('.vb-node-steps')).toHaveCount(0);
});

test('keyboard only: focus previews, Enter opens on Reject, Tab reaches Next, Esc closes, folds and returns to the tab', async ({ page, request }) => {
  const { n } = await board(page, request, 'fresh');
  await expect(tab(page, n)).toBeVisible();
  await card(page, n).focus();
  await tabTo(page, tab(page, n));
  await expect(box(page, n)).toBeVisible();
  await expect(steps(page, n)).toBeHidden();
  await page.keyboard.press('Enter');
  await expect(tab(page, n)).toHaveAttribute('aria-expanded', 'true');
  await expect(box(page, n).getByRole('button', { name: `Reject: check ${n}` })).toBeFocused();
  await expect(steps(page, n)).toBeVisible();
  await tabTo(page, next(page, n), 5);
  await page.keyboard.press('Escape');
  await expect(box(page, n)).toBeHidden();
  await expect(tab(page, n)).toBeFocused();
  await expect(tab(page, n)).toHaveAttribute('aria-expanded', 'false');
  await expect(card(page, n).locator('.vb-node-steps')).toBeHidden();
  // The step was shown, so it was seen: the tab is the proposal's own now.
  await expect.poll(() => shown(page, n)).toEqual(['proposal: Proposal']);
});

test('the one tab sits as D-091 places a tab: on S clear of the icon, the word and the buttons; on M centred at a third', async ({ page, request }) => {
  const { d, n } = await board(page, request, 'fresh');
  await expect(tab(page, n)).toBeVisible();
  const place = () => card(page, n).evaluate((el) => {
    const r = (s: string) => [...el.querySelectorAll(s)].map((e) => e.getBoundingClientRect());
    const [t] = r('.vb-node-btab:not([hidden])');
    const c = el.getBoundingClientRect();
    const k = c.width / (el as HTMLElement).offsetWidth;
    // As tab-place.spec.ts: the tab never over the kind icon or the state word, its 24px target never over a button.
    const hit = (a: DOMRect, b: DOMRect, x: number, y: number) => a.left - x * k < b.right && b.left < a.right + x * k && a.top - y * k < b.bottom && b.top < a.bottom + y * k;
    const crowds = r('.vb-node-kico, .vb-node-status').some((b) => hit(t!, b, 0, 0)) || r('.vb-node-foot .vb-act, .vb-history').some((b) => hit(t!, b, 2, 3));
    return { mid: (t!.left + t!.right) / 2 - c.left, third: c.width / 3, crowds };
  });
  expect((await place()).crowds, 'S').toBe(false);
  await act(page, d, { action: 'size', n, size: 'm' });
  await expect(card(page, n)).toHaveAttribute('data-size', 'm');
  const f = await place();
  expect(Math.abs(f.mid - f.third), `M: centre ${f.mid.toFixed(1)}, a third ${f.third.toFixed(1)}`).toBeLessThanOrEqual(2);
  expect(f.crowds, 'M').toBe(false);
});

for (const theme of THEMES) {
  test(`${theme}: the tab's words read on the card and hovered (Lc 45), the open box passes axe`, async ({ page, request }) => {
    await setTheme(page, theme);
    const { n } = await board(page, request, 'fresh');
    await expect(tab(page, n)).toBeVisible();
    const colours = () => tab(page, n).evaluate((t) => {
      const s = getComputedStyle(t);
      return { words: s.color, edge: s.borderTopColor, back: s.backgroundColor };
    });
    const amber = await pixel(page, await resolved(page, 'var(--vb-state-updated)'));
    const rest = await colours();
    expect(await pixel(page, rest.words)).toEqual(amber);
    expect(await pixel(page, rest.edge)).toEqual(amber);
    expect(Math.abs(lc(amber, await pixel(page, rest.back))), 'words on the card').toBeGreaterThanOrEqual(45);
    await tab(page, n).hover();
    await expect.poll(async () => (await colours()).back).not.toBe(rest.back);
    expect(Math.abs(lc(amber, await pixel(page, (await colours()).back))), 'words on the soft fill').toBeGreaterThanOrEqual(45);
    await expectNoAxeViolations(page);
    await tab(page, n).click();
    await expect(steps(page, n)).toBeVisible();
    await expectNoAxeViolations(page);
  });
}

for (const theme of THEMES) {
  test(`gallery (${theme}): the one tab at rest and out of date, the box open on the proposal then the step; axe`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    const section = page.locator('section[data-feature="oneChangeTab"]');
    await expect(section.locator('.vb-node-btab:not([hidden])')).toHaveText(['3 updates · proposal', '3 updates · out of date', '3 updates · proposal']);
    const open = section.getByRole('dialog');
    await expect(open).toBeVisible();
    await expect(open.locator(':scope > :not([hidden])')).toHaveClass(['vb-prop', 'vb-node-steps', 'vb-node-stepnav']);
    await expectNoAxeViolations(page);
  });
}

test('gallery, flag off: no section of its own', async ({ page }) => {
  await page.goto('/gallery.html?flags=-oneChangeTab');
  await expect(page.locator('section[data-feature="card-updates"]')).toBeVisible();
  await expect(page.locator('section[data-feature="oneChangeTab"]')).toHaveCount(0);
});
