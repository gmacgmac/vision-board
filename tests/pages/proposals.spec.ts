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

const THEMES: Theme[] = ['dark', 'light'];
// The proposal's time and the gallery's screenshot read the same in every test machine's clock.
test.use({ timezoneId: 'UTC', locale: 'en-GB' });

interface Agent { secret: string }
interface Drawn { agent: Agent; board: string; n: number[] }

let boards = 0;

async function join(request: APIRequestContext): Promise<Agent> {
  const r = await request.post('/api/agents', { data: { label: 'Pricing chat' } });
  expect(r.status(), await r.text()).toBe(201);
  return await r.json() as Agent;
}

async function write(request: APIRequestContext, d: { agent: Agent; board: string }, items: object[]) {
  const r = await request.post(`/api/boards/${d.board}/write`, { headers: { Authorization: `Bearer ${d.agent.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  const body = await r.json() as { results: { ok: boolean; n?: number; problem?: unknown }[] };
  expect(body.results.every((x) => x.ok), JSON.stringify(body.results)).toBe(true);
  return body.results;
}

/** A board of its own with `kinds.length` cards, drawn by a new agent. */
async function draw(request: APIRequestContext, kinds: string[] = ['question']): Promise<Drawn> {
  const d = { agent: await join(request), board: `proposals-${Date.now()}-${(boards += 1)}` };
  const results = await write(request, d, [
    { type: 'board', title: 'Proposals' },
    { type: 'region', region: { id: 'p', title: 'Pricing thread', mode: 'grid' } },
    ...kinds.map((kind, i) => ({ type: 'node', node: { region: 'p', kind, title: `Card ${i + 1}`, body: 'Offered on the last call.', item: true } })),
  ]);
  return { ...d, n: results.slice(2).map((x) => x.n!) };
}

const propose = (request: APIRequestContext, d: Drawn, n: number, action: 'ack' | 'drop', reason: string, ver = 1) =>
  write(request, d, [{ type: 'propose', n, ver, action, reason, source: 'Email pasted in chat' }]);

/** Open the board and wait until it has drawn. */
async function open(page: Page, d: Drawn, query = ''): Promise<void> {
  await page.goto(`/${query}#${d.board}`);
  await expect(page.locator('vb-node')).toHaveCount(d.n.length);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
}

const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);
const tab = (page: Page, n: number) => card(page, n).locator('.vb-node-btab[data-tab="proposal"]');
const box = (page: Page, n: number) => card(page, n).getByRole('dialog');
const bar = (page: Page) => page.locator('.vb-proposals');

/** The board's acts after line `after`, through read_ledger. */
async function actsAfter(page: Page, board: string, after: number) {
  const r = await page.request.get(`/api/ledger?board=${board}&after=${after}`);
  return (await r.json() as { events: Record<string, unknown>[] }).events.filter((e) => e.type === 'act');
}
const head = async (page: Page) => ((await (await page.request.get('/api/boards')).json()) as { head: number }).head;

/** Press Tab until `target` has focus, as a keyboard user would; fails after `max` presses. */
async function tabTo(page: Page, target: Locator, max = 60): Promise<void> {
  for (let i = 0; i < max; i += 1) {
    if (await target.evaluate((e) => e === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached ${String(target)}`);
}

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
  await propose(request, d, n, 'drop', 'the client declined');
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
  await expect(box(page, n).locator('.vb-prop-what')).toHaveText(`Drop ${n}: the client declined`);
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
  await propose(request, d, n, 'drop', 'the client declined');
  await open(page, d);
  const before = await head(page);
  await tab(page, n).click();
  await expect(box(page, n)).toBeVisible();
  await expect(tab(page, n)).toHaveAttribute('aria-expanded', 'true');
  await expect(box(page, n).getByRole('button', { name: `Reject: drop ${n}` })).toBeFocused();
  await box(page, n).getByRole('button', { name: `Accept: drop ${n}` }).click();
  await expect(card(page, n)).toHaveAttribute('data-status', 'dropped');
  await expect(page.locator('#toast')).toHaveText(`Accepted: drop ${n}`);
  await expect(tab(page, n)).toBeHidden();
  await expect(box(page, n)).toBeHidden();
  await expect(bar(page)).toHaveCount(0);
  await expect(card(page, n)).toBeFocused();
  const [act] = await actsAfter(page, d.board, before);
  expect(act).toMatchObject({ action: 'drop', n, ver: 1, by: 'person' });
  expect(typeof act!.proposal).toBe('number');
});

test('Reject clears the proposal and leaves the card open', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  await propose(request, d, n, 'ack', 'settled in chat');
  await open(page, d);
  const before = await head(page);
  await tab(page, n).click();
  await box(page, n).getByRole('button', { name: `Reject: acknowledge ${n}` }).click();
  await expect(tab(page, n)).toBeHidden();
  await expect(page.locator('#toast')).toHaveText(`Rejected: acknowledge ${n}`);
  await expect(card(page, n)).toHaveAttribute('data-status', 'open');
  await expect(bar(page)).toHaveCount(0);
  expect((await actsAfter(page, d.board, before)).map((e) => e.action)).toEqual(['reject']);
});

test('out of date: the tab and the box say so, Accept is aria-disabled and does nothing, Reject still works', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  await propose(request, d, n, 'drop', 'the client declined');
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
  const accept = box(page, n).getByRole('button', { name: `Accept: drop ${n} (out of date)` });
  await expect(accept).toHaveAttribute('aria-disabled', 'true');
  await expect(accept).toHaveAccessibleDescription(`${n} changed after this was proposed. Ask the agent to look again.`);
  await expect(box(page, n).getByRole('button', { name: `Reject: drop ${n}` })).toBeFocused();
  await accept.click({ force: true });
  await expect(card(page, n)).toHaveAttribute('data-status', 'open');
  expect(await actsAfter(page, d.board, before), 'no act sent').toEqual([]);
  await box(page, n).getByRole('button', { name: `Reject: drop ${n}` }).click();
  await expect(tab(page, n)).toBeHidden();
  expect((await actsAfter(page, d.board, before)).map((e) => e.action)).toEqual(['reject']);
});

test('Accept all lists what it applies and what it skips, then applies it in order', async ({ page, request }) => {
  const d = await draw(request, ['question', 'action', 'risk']);
  const [a, b, c] = d.n as [number, number, number];
  await propose(request, d, a, 'drop', 'the client declined');
  await propose(request, d, b, 'ack', 'the draft is done');
  await write(request, d, [{ type: 'append', n: b, text: 'The credit amount is in.' }]);
  await propose(request, d, c, 'ack', 'the sheet confirms it');
  await propose(request, d, c, 'drop', 'the new prices remove it');
  await open(page, d);
  await expect(bar(page).getByRole('heading', { level: 2 })).toHaveText('4 proposals');
  await expect(bar(page)).toContainText('· 1 out of date');
  // Two proposals on one card: the box lists both, newest first.
  await tab(page, c).click();
  await expect(box(page, c).locator('.vb-prop-what')).toHaveText([`Drop ${c}: the new prices remove it`, `Acknowledge ${c}: the sheet confirms it`]);
  await page.keyboard.press('Escape');
  await expect(tab(page, c)).toBeFocused();
  const before = await head(page);
  await bar(page).getByRole('button', { name: 'Accept all (2)' }).click();
  const dialog = page.getByRole('dialog', { name: 'Accept these 2 proposals?' });
  await expect(dialog.locator('ol.vb-confirm-list li')).toHaveText([`${a}Item ${a}: Drop: the client declined`, `${c}Item ${c}: Drop: the new prices remove it`]);
  await expect(dialog.locator('.vb-confirm-skip-title')).toHaveText('Not included');
  await expect(dialog.locator('.vb-confirm-skip li')).toHaveText([
    `${b}Item ${b}: Acknowledge: the draft is done (${b} changed after this was proposed)`,
    `${c}Item ${c}: Acknowledge: the sheet confirms it (a newer proposal on ${c} is applied)`,
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
  await propose(request, d, n, 'ack', 'settled in chat');
  await open(page, d);
  await page.locator('#stage').focus();
  await tabTo(page, tab(page, n));
  await expect(box(page, n)).toBeVisible();
  await expect(tab(page, n)).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(box(page, n)).toBeHidden();
  await expect(tab(page, n)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(box(page, n).getByRole('button', { name: `Reject: acknowledge ${n}` })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(tab(page, n)).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  const accept = box(page, n).getByRole('button', { name: `Accept: acknowledge ${n}` });
  await expect(accept).toBeFocused();
  // Card shortcuts don't fire in the box: X here is not Drop.
  await page.keyboard.press('x');
  await expect(card(page, n)).toHaveAttribute('data-status', 'open');
  await page.keyboard.press('Enter');
  await expect(card(page, n)).toHaveAttribute('data-status', 'acknowledged');
  await expect(card(page, n)).toBeFocused();
});

test('Review opens the first card\'s box with focus in it', async ({ page, request }) => {
  const d = await draw(request, ['question', 'question']);
  const [a, b] = d.n as [number, number];
  await propose(request, d, b, 'drop', 'not needed');
  await propose(request, d, a, 'drop', 'the client declined');
  await open(page, d);
  await bar(page).getByRole('button', { name: 'Review' }).click();
  await expect(box(page, a)).toBeVisible();
  await expect(box(page, a).getByRole('button', { name: `Reject: drop ${a}` })).toBeFocused();
  await expect(box(page, b)).toBeHidden();
});

test('flag off: no tab and no bar', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  await propose(request, d, n, 'drop', 'the client declined');
  await open(page, d, '?flags=-proposals');
  await expect(tab(page, n)).toBeHidden();
  await expect(bar(page)).toHaveCount(0);
  await expect(card(page, n)).toHaveAttribute('aria-label', /, Open$/);
});

for (const theme of THEMES) {
  test(`axe passes with the bar and an open box, open and out of date (${theme})`, async ({ page, request }) => {
    const d = await draw(request, ['question', 'action']);
    const [a, b] = d.n as [number, number];
    await propose(request, d, a, 'drop', 'the client declined');
    await propose(request, d, b, 'ack', 'the draft is done');
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
