// The person removes cards and containers on the board page (personRemove flag, N24 rulings 1-5,
// api.md 141): Remove on the selection bar (one card or several), Delete or
// Backspace, and Remove container in a container's settings; each asks first in the confirm dialog,
// naming what goes and warning of anything still owed an answer, then writes the person's `retire`
// line. The cards leave, the container shows "N cards retired", numbers are never given again. A
// locked board pauses both; the keyboard reaches both; axe passes light and dark with the confirm
// open. Every board here is drawn after the roadmap's cards, so its card 1 is never the ledger's 1.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, openSelectionBar, setTheme, test, zoomToControls } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['light', 'dark'];

interface Drawn { board: string; secret: string }
let boards = 0;

/** Write `items` as the board's agent; each result's card number. */
async function write(request: APIRequestContext, d: Drawn, items: unknown[]): Promise<(number | undefined)[]> {
  const r = await request.post(`/api/boards/${d.board}/write`, { headers: { Authorization: `Bearer ${d.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  const out = await r.json() as { results: { ok: boolean; n?: number }[] };
  expect(out.results.every((x) => x.ok), JSON.stringify(out.results)).toBe(true);
  return out.results.map((x) => x.n);
}

/** A board of its own: container `p` with three questions, container `q` with one finding. */
async function draw(request: APIRequestContext): Promise<Drawn> {
  const joined = await request.post('/api/agents', { data: { label: 'Remove chat' } });
  const d = { board: `remove-${Date.now()}-${(boards += 1)}`, secret: (await joined.json() as { secret: string }).secret };
  await write(request, d, [
    { type: 'board', title: 'Remove' },
    { type: 'region', region: { id: 'p', title: 'Venue', mode: 'grid' } },
    ...['Venue lead time', 'Catering', 'Budget'].map((title) => ({ type: 'node', node: { region: 'p', kind: 'question', title } })),
    { type: 'region', region: { id: 'q', title: 'Findings', mode: 'grid' } },
    { type: 'node', node: { region: 'q', kind: 'finding', title: 'Churn is flat' } },
  ]);
  return d;
}

/** The person acts on the board (setup), through the page's cookie. */
async function act(page: Page, d: Drawn, fields: object): Promise<void> {
  const r = await page.request.post(`/api/boards/${d.board}/act`, { data: { type: 'act', ...fields } });
  expect(r.status(), await r.text()).toBe(201);
}

async function open(page: Page, d: Drawn, cards: number, flags = ''): Promise<void> {
  await page.goto(`/?vbwork${flags}#${d.board}`);
  await expect(page.locator('vb-node')).toHaveCount(cards);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
}

const idle = (page: Page) => page.evaluate(() => (window as unknown as { __vbWork: { idle(): Promise<void> } }).__vbWork.idle());
const head = async (page: Page) => ((await (await page.request.get('/api/boards')).json()) as { head: number }).head;
/** The ledger lines after `after`, as the file holds them. */
async function linesAfter(page: Page, after: number): Promise<Record<string, unknown>[]> {
  return (await (await page.request.get(`/api/ledger?after=${after}`)).json() as { events: Record<string, unknown>[] }).events;
}
const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);
const frame = (page: Page, region: string) => page.locator(`vb-region[data-region="${region}"]`);
const dialog = (page: Page) => page.locator('#confirm-dialog');
const bar = (page: Page) => page.locator('vb-selection-bar');
const removeButton = (page: Page) => bar(page).locator('button[data-command="remove"]');
const toast = (page: Page) => page.locator('#toast');
const removeRow = (f: Locator) => f.getByRole('menuitem', { name: 'Remove container' });

// The page sets the person cookie: setup acts through `page.request` need it before the board opens.
test.beforeEach(async ({ page }) => { await page.goto('/gallery.html'); });

test('Remove card on the selection bar: the confirm names the card; it leaves, the container says "1 card retired"', async ({ page, request }) => {
  const d = await draw(request);
  await act(page, d, { action: 'ack', n: 3, ver: 1 }); // a past version shows card 1 after it goes
  await open(page, d, 4);
  const before = await head(page);
  await card(page, 1).locator('.vb-node-title').click();
  await openSelectionBar(page);
  await expect(removeButton(page)).toHaveText('Remove');
  await removeButton(page).click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).locator('#confirm-title')).toHaveText('Remove card 1 \'Venue lead time\'?');
  await expect(dialog(page).locator('#confirm-body')).toHaveText('It leaves the board and stays in the board\'s history; its number isn\'t given again.');
  await expect(page.locator('#confirm-cancel')).toBeFocused();
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
  }
  await page.locator('#confirm-ok').click();
  await idle(page);
  await expect(card(page, 1)).toHaveCount(0);
  await expect(page.locator('vb-node')).toHaveCount(3);
  await expect(toast(page)).toHaveText('Removed card 1');
  await expect(bar(page)).toBeHidden();
  await expect(frame(page, 'p').locator('.vb-region-retired')).toHaveText('1 card retired');
  const lines = (await linesAfter(page, before)).filter((e) => e.type === 'retire');
  expect(lines.map((e) => [e.by, e.board, (e.cards as number[]).length, e.region])).toEqual([['person', d.board, 1, undefined]]);
  expect((lines[0]!.cards as number[])[0]).toBeGreaterThan(1); // the identity, not the board number
  // The marker opens the version where it last appeared, read-only: no Remove there, and Delete does nothing.
  await frame(page, 'p').locator('.vb-region-retired').click();
  await expect(page.locator('.vb-banner')).toBeVisible();
  await expect(card(page, 1)).toHaveCount(1);
  await card(page, 1).locator('.vb-node-title').click();
  await openSelectionBar(page);
  await expect(bar(page).locator('button[data-command="zoom-selection"]')).toBeVisible();
  await expect(removeButton(page)).toHaveCount(0);
  await page.keyboard.press('Delete');
  await expect(dialog(page)).toBeHidden();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(page.locator('.vb-banner')).toHaveCount(0);
  // Numbers are never given again: the next card drawn is 5.
  expect(await write(request, d, [{ type: 'node', node: { region: 'p', kind: 'question', title: 'Dates' } }])).toEqual([5]);
});

test('a selection: Delete asks "Remove 2 cards?", warns of the owed one, Cancel keeps both, then both go in one line', async ({ page, request }) => {
  const d = await draw(request);
  await act(page, d, { action: 'comment', n: 2, ver: 1, text: 'Which caterer?' });
  await open(page, d, 4);
  const before = await head(page);
  await card(page, 2).locator('.vb-node-title').click();
  await card(page, 3).locator('.vb-node-title').click({ modifiers: ['Shift'] });
  await openSelectionBar(page);
  await expect(removeButton(page)).toHaveText('Remove');
  await expect(removeButton(page)).toHaveAttribute('title', 'Remove the selected cards · Delete');
  await page.keyboard.press('Delete');
  await expect(dialog(page).locator('#confirm-title')).toHaveText('Remove 2 cards?');
  await expect(dialog(page).locator('#confirm-body')).toHaveText(
    'They leave the board and stay in the board\'s history; their numbers aren\'t given again. Card 2 still has an unanswered comment.');
  await expect(dialog(page).locator('.vb-confirm-list li')).toHaveCount(2);
  await expect(dialog(page).locator('.vb-confirm-list li').first()).toContainText('Catering');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(page.locator('vb-node')).toHaveCount(4);
  await page.keyboard.press('Backspace');
  await expect(dialog(page)).toBeVisible();
  await page.locator('#confirm-ok').click();
  await idle(page);
  await expect(page.locator('vb-node')).toHaveCount(2);
  await expect(toast(page)).toHaveText('Removed 2 cards');
  const lines = (await linesAfter(page, before)).filter((e) => e.type === 'retire');
  expect(lines.map((e) => (e.cards as number[]).length)).toEqual([2]);
  // The comment was owed an answer; nothing is now, and Send has nothing new to carry.
  const listed = await (await page.request.get(`/api/boards/${d.board}/open`)).json() as { items: { n: number }[] };
  expect(listed.items.map((x) => x.n)).toEqual([1]);
  await expect(page.locator('#send')).toHaveAttribute('aria-disabled', 'true');
});

test('Remove container in the settings: "Remove container \'Findings\' and its card?"; the frame and its card leave', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d, 4);
  await zoomToControls(page);
  const f = frame(page, 'q');
  await f.locator('button.vb-cog').click();
  await expect(removeRow(f)).toBeVisible();
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
  }
  await removeRow(f).click();
  await expect(dialog(page).locator('#confirm-title')).toHaveText('Remove container \'Findings\' and its card?');
  await expect(page.locator('#confirm-ok')).toHaveText('Remove container');
  for (const theme of THEMES) {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
  }
  await page.locator('#confirm-ok').click();
  await idle(page);
  await expect(frame(page, 'q')).toHaveCount(0);
  await expect(page.locator('vb-node')).toHaveCount(3);
  await expect(toast(page)).toHaveText('Removed container \'Findings\'');
  await expect(page.locator('#stage')).toBeFocused();
});

test('by keyboard: Space selects a focused card, Delete asks, Tab and Enter confirm; the cog\'s menu reaches Remove container', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d, 4);
  await zoomToControls(page);
  await card(page, 3).focus();
  await page.keyboard.press(' ');
  await page.keyboard.press('Delete');
  await expect(page.locator('#confirm-cancel')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#confirm-ok')).toBeFocused();
  await page.keyboard.press('Enter');
  await idle(page);
  await expect(card(page, 3)).toHaveCount(0);
  // The cog: Down opens its menu on the first row; Down twice more reaches Remove container; Enter asks.
  const f = frame(page, 'p');
  await f.locator('button.vb-cog').focus();
  await page.keyboard.press('ArrowDown');
  await expect(f.getByRole('menuitem', { name: 'Reset places' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(removeRow(f)).toBeFocused();
  await page.keyboard.press('End');
  await expect(removeRow(f)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dialog(page).locator('#confirm-title')).toHaveText('Remove container \'Venue\' and its 2 cards?');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
  await expect(frame(page, 'p')).toHaveCount(1);
});

test('a locked board pauses both and says why; nothing is written (D-043)', async ({ page, request }) => {
  const d = await draw(request);
  await act(page, d, { action: 'lock', board: d.board });
  await open(page, d, 4);
  await zoomToControls(page);
  const before = await head(page);
  await card(page, 1).locator('.vb-node-title').click();
  await openSelectionBar(page);
  await expect(removeButton(page)).toBeDisabled();
  await page.keyboard.press('Delete');
  await expect(dialog(page)).toBeHidden();
  const f = frame(page, 'q');
  await f.locator('button.vb-cog').click();
  await expect(removeRow(f)).toHaveAttribute('aria-disabled', 'true');
  await removeRow(f).click({ force: true });
  await expect(toast(page)).toHaveText('Locked: unlock to change it');
  await expect(dialog(page)).toBeHidden();
  await idle(page);
  expect((await linesAfter(page, before)).map((e) => e.type).filter((t) => t !== 'seen')).toEqual([]);
  await act(page, d, { action: 'unlock', board: d.board });
});

test('with the personRemove flag off: no Remove on the bar or in the settings, and Delete does nothing', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d, 4, '&flags=-personRemove');
  await zoomToControls(page);
  await card(page, 1).locator('.vb-node-title').click();
  await openSelectionBar(page);
  await expect(bar(page).locator('button[data-command="comment"]')).toBeVisible();
  await expect(removeButton(page)).toHaveCount(0);
  await page.keyboard.press('Delete');
  await expect(dialog(page)).toBeHidden();
  await frame(page, 'q').locator('button.vb-cog').click();
  await expect(removeRow(frame(page, 'q'))).toHaveCount(0);
});

test.describe('gallery', () => {
  const section = (page: Page) => page.locator('section[data-feature="personRemove"]');
  test('the Remove section: the settings menu open with Remove container, paused when locked, and three confirms', async ({ page }) => {
    await page.goto('/gallery.html');
    await expect(section(page).locator('vb-region [role="menuitem"]', { hasText: 'Remove container' })).toHaveCount(2);
    await expect(section(page).locator('vb-region [data-remove-region][aria-disabled="true"]')).toHaveCount(1);
    await expect(section(page).locator('.g-confirm-head')).toHaveText([
      /^Remove card 33 '.+'\?$/, 'Remove 3 cards?', /^Remove container 'Other node states' and its \d+ cards\?$/,
    ]);
  });
  for (const theme of THEMES) {
    test(`gallery: axe passes and the Remove section matches its screenshot (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      await page.goto('/gallery.html');
      await expect(section(page)).toBeVisible();
      await expectNoAxeViolations(page);
      await expect(section(page)).toHaveScreenshot(`remove-${theme}.png`);
    });
  }
});
