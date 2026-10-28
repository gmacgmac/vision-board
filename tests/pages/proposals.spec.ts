// An agent's proposals on the page (proposals-seen-parking FE_01, D-018, api.md 93), behind the
// proposals flag (rule 12, on by default): the PROPOSAL tab on a card's bottom edge and its box,
// Accept and Reject, an out-of-date proposal that can't be accepted, the bar with Review and Accept
// all, the keyboard path, axe light and dark; then the gallery's Agent proposals section.
//
// Each test draws its own board through the API, as an agent would, so the bar counts only its own
// proposals: a joined agent writes the board and its cards, opens the page, then proposes, so a
// proposal arrives live. Agent calls go through `request` (no person cookie); reading the ledger
// goes through `page.request`, which carries the page's cookie.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { boardLines } from './board-lines.ts';
import { card, head, idle, panBy, scale, selected, stageBox, world } from './board-page.ts';
import { joinAgent, open, tabTo, write } from './agent-board.ts';
import type { Agent } from './agent-board.ts';

const THEMES: Theme[] = ['dark', 'light'];
// The proposal's time and the gallery's screenshot read the same in every test machine's clock.
test.use({ timezoneId: 'UTC', locale: 'en-GB' });

interface Drawn { agent: Agent; board: string; n: number[] }

let boards = 0;

/** A board of its own with `kinds.length` cards, drawn by a new agent. */
async function draw(request: APIRequestContext, kinds: string[] = ['question']): Promise<Drawn> {
  const d = { agent: await joinAgent(request), board: `proposals-${Date.now()}-${(boards += 1)}` };
  const results = await write(request, d, [
    { type: 'board', title: 'Proposals' },
    { type: 'region', region: { id: 'p', title: 'Pricing thread', mode: 'grid' } },
    ...kinds.map((kind, i) => ({ type: 'node', node: { region: 'p', kind, title: `Card ${i + 1}`, body: 'Offered on the last call.' } })),
  ]);
  return { ...d, n: results.slice(2).map((x) => x.n!) };
}

const propose = (request: APIRequestContext, d: Drawn, n: number, action: 'check' | 'cross', reason: string, ver = 1) =>
  write(request, d, [{ type: 'propose', n, ver, action, reason, source: 'Email pasted in chat' }]);

const tab = (page: Page, n: number) => card(page, n).locator('.vb-node-btab[data-tab="proposal"]');
const box = (page: Page, n: number) => card(page, n).getByRole('dialog');
const bar = (page: Page) => page.locator('.vb-proposals');
/** Review: a button, or with proposals on more than one card (reviewList flag) a list named for what it does. */
const review = (page: Page) => bar(page).getByRole('button', { name: 'Review', exact: true }).or(bar(page).getByRole('combobox', { name: /^Review/ }));

/** The board's acts after line `after`, through read_ledger, cards by board number (board-lines.ts). */
const actsAfter = async (page: Page, board: string, after: number) =>
  (await boardLines(page, board, after)).filter((e) => e.type === 'act');

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

test('a proposal arrives live: the PROPOSAL tab on its card, the bar counts it and announces it', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  await open(page, d);
  await expect(tab(page, n)).toBeHidden();
  await expect(bar(page)).toHaveCount(0);
  const height = await card(page, n).evaluate((e) => (e as HTMLElement).offsetHeight);
  await propose(request, d, n, 'cross', 'the client declined');
  await expect(tab(page, n)).toBeVisible();
  await expect(tab(page, n)).toHaveText('Proposal');
  await expect(tab(page, n)).toHaveAttribute('aria-label', `Proposal on item ${n}`);
  await expect(card(page, n)).toHaveAttribute('aria-label', new RegExp(`, Open, 1 proposal$`));
  expect(await card(page, n).evaluate((e) => (e as HTMLElement).offsetHeight), 'the card never changes size for a tab').toBe(height);
  await expect(bar(page).getByRole('heading', { level: 2 })).toHaveText('1 proposal');
  await expect(bar(page).getByRole('button', { name: 'Accept all (1)' })).toBeVisible();
  await expect(page.locator('span[aria-live="polite"]').filter({ hasText: 'proposes' }))
    .toHaveText(`Pricing chat proposes: the client declined, on item ${n}`);
  // Hover previews the box beside the card; it holds who, what, from where and when.
  await tab(page, n).hover();
  await expect(box(page, n)).toBeVisible();
  await expect(box(page, n)).toHaveAccessibleName(`Proposal on item ${n}`);
  await expect(box(page, n).locator('.vb-prop-head')).toHaveText('Pricing chat proposes');
  await expect(box(page, n).locator('.vb-prop-what')).toHaveText(`Cross ${n}: the client declined`);
  await expect(box(page, n).locator('.vb-prop-from')).toHaveText(/^Email pasted in chat · \d+ \w+, \d\d:\d\d$/);
  const c = await card(page, n).boundingBox();
  const b = await box(page, n).boundingBox();
  expect(b!.x, 'beside the card').toBeGreaterThan(c!.x + c!.width);
  await page.mouse.move(0, 500);
  await expect(box(page, n)).toBeHidden();
});

test('Accept drops the card through the proposal; the tab and the bar go', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  await propose(request, d, n, 'cross', 'the client declined');
  await open(page, d);
  const before = await head(page);
  await tab(page, n).click();
  await expect(box(page, n)).toBeVisible();
  await expect(tab(page, n)).toHaveAttribute('aria-expanded', 'true');
  await expect(box(page, n).getByRole('button', { name: `Reject: cross ${n}` })).toBeFocused();
  await box(page, n).getByRole('button', { name: `Accept: cross ${n}` }).click();
  await expect(card(page, n)).toHaveAttribute('data-status', 'dropped');
  await expect(page.locator('#toast')).toHaveText(`Accepted: cross ${n}`);
  await expect(tab(page, n)).toBeHidden();
  await expect(box(page, n)).toBeHidden();
  await expect(bar(page)).toHaveCount(0);
  await expect(card(page, n)).toBeFocused();
  const [act] = await actsAfter(page, d.board, before);
  expect(act).toMatchObject({ action: 'drop', n, ver: 1, by: 'person' });
  expect(typeof act!.proposal).toBe('number');
});

test('retiring the card ends its proposal: the tab and the bar go, and the page sends no accept without a version', async ({ page, request }) => {
  const d = await draw(request, ['question', 'question']);
  const [n, other] = d.n as [number, number];
  await open(page, d);
  await propose(request, d, n, 'cross', 'the client declined');
  await propose(request, d, other, 'check', 'settled in chat');
  await expect(bar(page).getByRole('heading', { level: 2 })).toHaveText('2 proposals');
  const sent: string[] = [];
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/act')) sent.push(r.postData() ?? ''); });
  await write(request, d, [{ type: 'retire', n }]);
  await expect(card(page, n)).toHaveCount(0);
  await expect(bar(page).getByRole('heading', { level: 2 })).toHaveText('1 proposal');
  await bar(page).getByRole('button', { name: 'Accept all (1)' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Apply 1 proposal' }).click();
  await expect(card(page, other)).toHaveAttribute('data-status', 'acknowledged');
  await expect(bar(page)).toHaveCount(0);
  expect(sent.filter((b) => !b.includes('"ver"')), 'every accept carries the card version').toEqual([]);
});

test('Reject clears the proposal and leaves the card open', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  await propose(request, d, n, 'check', 'settled in chat');
  await open(page, d);
  const before = await head(page);
  await tab(page, n).click();
  await box(page, n).getByRole('button', { name: `Reject: check ${n}` }).click();
  await expect(tab(page, n)).toBeHidden();
  await expect(page.locator('#toast')).toHaveText(`Rejected: check ${n}`);
  await expect(card(page, n)).toHaveAttribute('data-status', 'open');
  await expect(bar(page)).toHaveCount(0);
  expect((await actsAfter(page, d.board, before)).map((e) => e.action)).toEqual(['reject']);
});

test('out of date: the tab and the box say so, Accept is aria-disabled and does nothing, Reject still works', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  await propose(request, d, n, 'cross', 'the client declined');
  await open(page, d);
  await expect(tab(page, n)).toHaveText('Proposal');
  // The agent adds to the card: a new version, so the proposal made on version 1 is out of date.
  await write(request, d, [{ type: 'append', n, text: 'The credit amount is in.' }]);
  await expect(tab(page, n)).toHaveText('Out of date');
  await expect(tab(page, n)).toHaveAttribute('data-stale', '');
  await expect(bar(page)).toContainText('1 proposal');
  await expect(bar(page)).toContainText('· 1 out of date');
  await expect(bar(page).getByRole('button', { name: /^Accept all/ })).toHaveCount(0);
  const before = await head(page);
  await tab(page, n).click();
  const accept = box(page, n).getByRole('button', { name: `Accept: cross ${n} (out of date)` });
  await expect(accept).toHaveAttribute('aria-disabled', 'true');
  await expect(accept).toHaveAccessibleDescription(`${n} changed after this was proposed. Ask the agent to look again.`);
  await expect(box(page, n).getByRole('button', { name: `Reject: cross ${n}` })).toBeFocused();
  await accept.click({ force: true });
  await expect(card(page, n)).toHaveAttribute('data-status', 'open');
  expect(await actsAfter(page, d.board, before), 'no act sent').toEqual([]);
  await box(page, n).getByRole('button', { name: `Reject: cross ${n}` }).click();
  await expect(tab(page, n)).toBeHidden();
  expect((await actsAfter(page, d.board, before)).map((e) => e.action)).toEqual(['reject']);
});

test('Accept all lists what it applies and what it skips, then applies it in order', async ({ page, request }) => {
  // A proposal stands only on a card that needs an answer (every-node, api.md 120): the third a decision, not a risk.
  const d = await draw(request, ['question', 'action', 'decision']);
  const [a, b, c] = d.n as [number, number, number];
  await propose(request, d, a, 'cross', 'the client declined');
  await propose(request, d, b, 'check', 'the draft is done');
  await write(request, d, [{ type: 'append', n: b, text: 'The credit amount is in.' }]);
  await propose(request, d, c, 'check', 'the sheet confirms it');
  await propose(request, d, c, 'cross', 'the new prices remove it');
  await open(page, d);
  await expect(bar(page).getByRole('heading', { level: 2 })).toHaveText('4 proposals');
  await expect(bar(page)).toContainText('· 1 out of date');
  // Two proposals on one card: the box lists both, newest first.
  await tab(page, c).click();
  await expect(box(page, c).locator('.vb-prop-what')).toHaveText([`Cross ${c}: the new prices remove it`, `Check ${c}: the sheet confirms it`]);
  await page.keyboard.press('Escape');
  await expect(tab(page, c)).toBeFocused();
  const before = await head(page);
  await bar(page).getByRole('button', { name: 'Accept all (2)' }).click();
  const dialog = page.getByRole('dialog', { name: 'Accept these 2 proposals?' });
  await expect(dialog.locator('ol.vb-confirm-list li')).toHaveText([`${a}Item ${a}: Cross: the client declined`, `${c}Item ${c}: Cross: the new prices remove it`]);
  await expect(dialog.locator('.vb-confirm-skip-title')).toHaveText('Not included');
  await expect(dialog.locator('.vb-confirm-skip li')).toHaveText([
    `${b}Item ${b}: Check: the draft is done (${b} changed after this was proposed)`,
    `${c}Item ${c}: Check: the sheet confirms it (a newer proposal on ${c} is applied)`,
  ]);
  await dialog.getByRole('button', { name: 'Apply 2 proposals' }).click();
  await expect(page.locator('#toast')).toHaveText('Accepted 2 proposals');
  await expect(card(page, a)).toHaveAttribute('data-status', 'dropped');
  await expect(card(page, c)).toHaveAttribute('data-status', 'dropped');
  await expect(card(page, b)).toHaveAttribute('data-status', 'open');
  await expect(tab(page, b)).toHaveText('Out of date');
  await expect(bar(page).getByRole('heading', { level: 2 })).toHaveText('1 proposal');
  expect((await actsAfter(page, d.board, before)).map((e) => [e.action, e.n])).toEqual([['drop', a], ['drop', c]]);
});

test('keyboard only: focus on the tab previews, Enter opens with focus in the box, Esc returns to the tab, Enter on Accept acts', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  await propose(request, d, n, 'check', 'settled in chat');
  await open(page, d);
  await page.locator('#stage').focus();
  await tabTo(page, tab(page, n));
  await expect(box(page, n)).toBeVisible();
  await expect(tab(page, n)).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(box(page, n)).toBeHidden();
  await expect(tab(page, n)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(box(page, n).getByRole('button', { name: `Reject: check ${n}` })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(tab(page, n)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  const accept = box(page, n).getByRole('button', { name: `Accept: check ${n}` });
  await expect(accept).toBeFocused();
  // Card shortcuts don't fire in the box: X here is not Cross.
  await page.keyboard.press('x');
  await expect(card(page, n)).toHaveAttribute('data-status', 'open');
  await page.keyboard.press('Enter');
  await expect(card(page, n)).toHaveAttribute('data-status', 'acknowledged');
  await expect(card(page, n)).toBeFocused();
});

test('Review with one card with proposals goes straight to it: its box opens with focus in it', async ({ page, request }) => {
  const d = await draw(request, ['question', 'question']);
  const [a, b] = d.n as [number, number];
  await propose(request, d, a, 'cross', 'the client declined');
  await propose(request, d, a, 'check', 'it is done');
  await open(page, d);
  await expect(bar(page).getByRole('heading', { level: 2 })).toHaveText('2 proposals');
  await expect(review(page), 'one card, so no list').toHaveRole('button');
  await review(page).click();
  await expect(box(page, a)).toBeVisible();
  await expect(card(page, a)).toHaveAttribute('data-selected', '');
  await expect(box(page, b)).toBeHidden();
});

// ---- Review opens a list (reviewList flag, search-and-finding REVIEW_01, ruling 319) ----

const reviewList = (page: Page) => bar(page).getByRole('combobox', { name: 'Review a card with a proposal' });
const rowsOf = (list: Locator) => list.evaluate((e) => [...(e as HTMLSelectElement).options].map((o) => o.label));
const isNew = (page: Page, n: number) => card(page, n).locator('.vb-node-btab[data-tab="new"]');

/** Whether any of card `n` shows on the stage. */
async function shows(page: Page, n: number): Promise<boolean> {
  const [s, b] = [await stageBox(page), (await card(page, n).boundingBox())!];
  return b.y < s.y + s.height && b.y + b.height > s.y && b.x < s.x + s.width && b.x + b.width > s.x;
}

/** A board bigger than the stage with three cards with proposals, drawn on a page zoomed out to where
 * a card's controls are hidden, the last of them (a NEW card) off screen. */
async function farBoard(page: Page, request: APIRequestContext, query = '') {
  const d = await draw(request, Array.from({ length: 36 }, () => 'question'));
  await open(page, d, `?vbwork${query && `&${query}`}`);
  await expect.poll(async () => (await boardLines(page, d.board)).some((e) => e.type === 'seen' && e.n === undefined)).toBe(true);
  const [added] = await write(request, d, [{ type: 'node', node: { region: 'p', kind: 'question', title: 'Card 37', body: 'Added later.' } }]);
  const last = added!.n!;
  await expect(page.locator('vb-node')).toHaveCount(37);
  await expect(isNew(page, last)).toHaveText('NEW');
  const first = d.n[0]!;
  const mid = d.n[17]!;
  await propose(request, d, mid, 'cross', 'not needed');
  await propose(request, d, last, 'cross', 'it was a mistake');
  await propose(request, d, first, 'check', 'the draft is done');
  await expect(bar(page).getByRole('heading', { level: 2 })).toHaveText('3 proposals');
  await page.locator('#stage').focus();
  for (let i = 0; i < 12 && (await scale(page)) > 0.45; i += 1) await page.keyboard.press('-');
  expect(await scale(page), 'zoomed out past where controls show').toBeLessThan(0.55);
  // Pan until the last card is off the stage.
  for (let i = 0; i < 8 && (await shows(page, last)); i += 1) await panBy(page, -400, -400);
  expect(await shows(page, last), 'the last card is off screen').toBe(false);
  return { d, first, mid, last };
}

test('Review lists the cards with proposals in card order; choosing the off-screen one shows it at a readable zoom, opens its box, and its NEW mark stays', async ({ page, request }) => {
  const { d, first, mid, last } = await farBoard(page, request);
  const was = (await boardLines(page, d.board)).filter((e) => e.type === 'seen' && e.n !== undefined).length;
  await expect(review(page)).toHaveRole('combobox');
  expect(await rowsOf(reviewList(page))).toEqual(['Review',
    `${first} · Card 1 · Check: the draft is done`, `${mid} · Card 18 · Cross: not needed`, `${last} · Card 37 · Cross: it was a mistake`]);
  await reviewList(page).selectOption(String(last));
  await expect(box(page, last)).toBeVisible();
  await expect(box(page, last).getByRole('button', { name: `Reject: cross ${last}` })).toBeFocused();
  expect(await shows(page, last), 'brought into view').toBe(true);
  expect(await scale(page), 'at a readable zoom: the controls show again').toBeGreaterThanOrEqual(0.55);
  expect(await selected(page)).toEqual([String(last)]);
  await expect(isNew(page, last), 'looking is not reading: NEW stays').toHaveText('NEW');
  await expect(page.locator('#counts')).toContainText('1 new');
  await idle(page);
  expect((await boardLines(page, d.board)).filter((e) => e.type === 'seen' && e.n !== undefined).length, 'no card seen line').toBe(was);
  // The list is whole again, ready for the next choice.
  await expect(reviewList(page)).toHaveValue('');
});

test('Review: Esc on the list chooses nothing; the board stays where it was', async ({ page, request }) => {
  const { last } = await farBoard(page, request);
  const before = await world(page);
  await reviewList(page).focus();
  await page.keyboard.press('Escape');
  expect(await world(page)).toBe(before);
  await expect(box(page, last)).toBeHidden();
  expect(await shows(page, last)).toBe(false);
});

test('flag off (-reviewList): Review is a button that opens the first card\'s box where the card is, the board does not move', async ({ page, request }) => {
  const { first } = await farBoard(page, request, 'flags=-reviewList');
  await expect(review(page)).toHaveRole('button');
  const before = await world(page);
  await review(page).click();
  await expect(tab(page, first)).toHaveAttribute('aria-expanded', 'true');
  expect(await world(page), 'nothing moves the board').toBe(before);
  expect(await selected(page)).toEqual([]);
});

test('flag off: no tab and no bar', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  await propose(request, d, n, 'cross', 'the client declined');
  await open(page, d, '?flags=-proposals');
  await expect(tab(page, n)).toBeHidden();
  await expect(bar(page)).toHaveCount(0);
  await expect(card(page, n)).toHaveAttribute('aria-label', /, Open$/);
});

for (const theme of THEMES) {
  test(`axe passes with the bar and an open box, open and out of date (${theme})`, async ({ page, request }) => {
    const d = await draw(request, ['question', 'action']);
    const [a, b] = d.n as [number, number];
    await propose(request, d, a, 'cross', 'the client declined');
    await propose(request, d, b, 'check', 'the draft is done');
    await write(request, d, [{ type: 'append', n: b, text: 'The credit amount is in.' }]);
    await setTheme(page, theme);
    await open(page, d);
    await expect(tab(page, b)).toHaveText('Out of date');
    await tab(page, a).click();
    await expect(box(page, a)).toBeVisible();
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
    await tab(page, b).click();
    await expect(box(page, b)).toBeVisible();
    await expectNoAxeViolations(page);
  });
}

// ---- The gallery's Agent proposals section ----

const section = (page: Page) => page.locator('section[data-feature="proposals"]');

test('gallery: the Agent proposals section shows by default and not with -proposals', async ({ page }) => {
  await page.goto('/gallery.html?flags=-proposals');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  const s = section(page);
  await expect(s.locator('vb-node')).toHaveCount(6);
  await expect(s.locator('.vb-card-pop[data-open]')).toHaveCount(3);
  await expect(s.locator('.vb-node-btab[data-stale]')).toHaveText('Out of date');
  await expect(s.locator('.vb-card-pop[data-open] .vb-prop')).toHaveCount(4);
  await expect(s.locator('.vb-pop-btn[aria-disabled="true"]')).toHaveCount(1);
  await expect(s.locator('.vb-proposals h2')).toHaveText('5 proposals');
  await expect(s.locator('.vb-confirm-list:not(.vb-confirm-skip) li')).toHaveCount(3);
  await expect(s.locator('.vb-confirm-skip li')).toHaveCount(2);
});

for (const theme of THEMES) {
  test(`gallery: Agent proposals passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`proposals-${theme}.png`);
  });
}

// ---- The gallery's Review list section (reviewList flag, REVIEW_01) ----

const reviewSection = (page: Page) => page.locator('section[data-feature="reviewList"]');

test('gallery: the Review list section shows by default and not with -reviewList', async ({ page }) => {
  await page.goto('/gallery.html?flags=-reviewList');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(reviewSection(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  const s = reviewSection(page);
  await expect(s.locator('.vb-proposals')).toHaveCount(2);
  await expect(s.locator('.vb-proposals .vb-menu-face').first()).toHaveText('Review');
  await expect(s.locator('select[size] option')).toHaveCount(4);
  await expect(s.locator('select[size] option').first()).toHaveText(/^\d+ · .+ · (Check|Cross): /);
});

for (const theme of THEMES) {
  test(`gallery: the Review list passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(reviewSection(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(reviewSection(page)).toHaveScreenshot(`review-list-${theme}.png`);
  });
}
