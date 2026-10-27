// The proposals notice (proposals-notice task, follows proposals-seen-parking FE_01), behind the
// proposals flag: a floating, see-through notice at the top left of the board, over it, so the
// stage and the chat sidebar are no longer pushed down; a hide button collapses it to a pill in the
// same place, kept per viewer across a reload; new proposals update the pill and are still
// announced; Esc hides it; it is three stacked rows; it sits below the requests strip; axe light and dark, notice and pill.
// Page polish (ruling A): a wider step between Review and Accept all, the accent border on the notice and
// the pill, and the number in the same place in both.
//
// Each test draws its own board through the API, as an agent would (as proposals.spec.ts does).
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { joinAgent } from './agent-board.ts';
import type { Agent } from './agent-board.ts';

const THEMES: Theme[] = ['dark', 'light'];

interface Drawn { agent: Agent; board: string; n: number[] }

let boards = 0;

async function write(request: APIRequestContext, d: { agent: Agent; board: string }, items: object[]) {
  const r = await request.post(`/api/boards/${d.board}/write`, { headers: { Authorization: `Bearer ${d.agent.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  const body = await r.json() as { results: { ok: boolean; n?: number }[] };
  expect(body.results.every((x) => x.ok), JSON.stringify(body.results)).toBe(true);
  return body.results;
}

/** A board of its own with two cards, drawn by a new agent. */
async function draw(request: APIRequestContext): Promise<Drawn> {
  const d = { agent: await joinAgent(request), board: `notice-${Date.now()}-${(boards += 1)}` };
  const results = await write(request, d, [
    { type: 'board', title: 'Notice' },
    { type: 'region', region: { id: 'p', title: 'Pricing thread', mode: 'grid' } },
    ...[1, 2].map((i) => ({ type: 'node', node: { region: 'p', kind: 'question', title: `Card ${i}`, body: 'Offered on the last call.' } })),
  ]);
  return { ...d, n: results.slice(2).map((x) => x.n!) };
}

const propose = (request: APIRequestContext, d: Drawn, n: number, reason: string) =>
  write(request, d, [{ type: 'propose', n, ver: 1, action: 'cross', reason, source: 'Email pasted in chat' }]);

async function open(page: Page, d: Drawn): Promise<void> {
  await page.goto(`/#${d.board}`);
  await expect(page.locator('vb-node')).toHaveCount(d.n.length);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
}

const notice = (page: Page) => page.locator('.vb-proposals');
const hide = (page: Page) => notice(page).getByRole('button', { name: 'Hide the proposals notice' });
const pill = (page: Page) => notice(page).locator('.vb-proposals-pill');
const top = async (page: Page, selector: string) => (await page.locator(selector).boundingBox())!.y;

test.beforeEach(async ({ page }) => {
  await page.goto('/?setup');
});

test('the notice floats over the top left of the board: the stage is not pushed down, and it is see-through', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d);
  const stage = await page.locator('#stage').boundingBox();
  await propose(request, d, d.n[0]!, 'the client declined');
  await expect(notice(page).getByRole('heading', { level: 2 })).toHaveText('1 proposal');
  expect(await page.locator('#stage').boundingBox(), 'the stage stays where it was').toEqual(stage);
  expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--vb-proposals-h'))).toBe('');
  const box = (await notice(page).boundingBox())!;
  expect(box.y, 'under the toolbar, over the board').toBeGreaterThan(stage!.y);
  expect(box.x - stage!.x, 'at the left').toBeLessThan(24);
  expect(box.width, 'narrow, set by its content').toBeLessThanOrEqual(240);
  const look = await notice(page).evaluate((e) => {
    const s = getComputedStyle(e);
    return { position: s.position, background: s.backgroundColor, blur: s.backdropFilter, radius: parseFloat(s.borderTopLeftRadius) };
  });
  expect(look.position).toBe('fixed');
  const alpha = Number(/[,/]\s*([\d.]+)\)$/.exec(look.background)?.[1] ?? 1);
  expect(alpha, `about half opaque: ${look.background}`).toBeGreaterThanOrEqual(0.4);
  expect(alpha).toBeLessThanOrEqual(0.65);
  expect(look.blur).toMatch(/blur\(/);
  expect(look.radius).toBeGreaterThanOrEqual(4);
  expect(look.radius).toBeLessThanOrEqual(6);
});

test('three stacked rows: the count and Hide, a full-width Review, a full-width Accept all; stale words stay on the first row', async ({ page, request }) => {
  const d = await draw(request);
  const [a, b] = d.n as [number, number];
  await propose(request, d, a, 'the client declined');
  await propose(request, d, b, 'not needed');
  await open(page, d);
  const box = async (l: ReturnType<Page['locator']>) => (await l.boundingBox())!;
  const rows = async () => {
    const n = await box(notice(page));
    return { n, title: await box(notice(page).locator('h2')), hide: await box(hide(page)),
      review: await box(notice(page).getByRole('button', { name: 'Review' })), all: await box(notice(page).getByRole('button', { name: /^Accept all/ })) };
  };
  const r = await rows();
  expect(r.n.width, 'a small fixed width').toBeGreaterThanOrEqual(160);
  expect(r.n.width).toBeLessThanOrEqual(240);
  expect(r.hide.y + r.hide.height, 'Hide shares the count row').toBeLessThanOrEqual(r.review.y);
  expect(Math.abs(r.hide.y + r.hide.height / 2 - (r.title.y + r.title.height / 2))).toBeLessThan(r.hide.height);
  expect(r.hide.x, 'at the end of the row').toBeGreaterThan(r.title.x + r.title.width - 1);
  expect(r.review.y, 'Review under the count').toBeGreaterThanOrEqual(r.title.y + r.title.height);
  expect(r.all.y, 'Accept all under Review').toBeGreaterThanOrEqual(r.review.y + r.review.height);
  for (const b of [r.review, r.all]) {
    expect(b.height, 'target size').toBeGreaterThanOrEqual(24);
    expect(Math.abs(b.width - r.review.width), 'same width').toBeLessThan(1);
    expect(r.n.width - b.width, 'full width: only the notice\'s padding and border remain').toBeLessThanOrEqual(2 * 12 + 2);
    expect(b.x).toBeGreaterThanOrEqual(r.n.x);
  }
  await expect(notice(page).locator('h2')).toHaveText('2 proposals');
  // Out of date: the card changes after the proposals; the words stay on the first row and the box does not widen.
  await write(request, d, [{ type: 'append', n: a, text: 'The credit amount is in.' }]);
  await expect(notice(page)).toContainText('· 1 out of date');
  const s = await rows();
  expect(s.n.width, 'wraps rather than widening').toBeCloseTo(r.n.width, 0);
  const stale = await box(notice(page).locator('.vb-proposals-stale'));
  expect(stale.y, 'on the count row').toBeLessThan(s.review.y);
  expect(s.review.y, 'Review stays under').toBeGreaterThanOrEqual(stale.y + stale.height);
  await expect(notice(page).getByRole('button', { name: /^Accept all \(1\)/ })).toBeVisible();
});

test('hide collapses it to a pill in the same place, kept after a reload; new proposals update the pill and are announced', async ({ page, request }) => {
  const d = await draw(request);
  const [a, b] = d.n as [number, number];
  await propose(request, d, a, 'the client declined');
  await open(page, d);
  const at = (await notice(page).boundingBox())!;
  await hide(page).click();
  await expect(notice(page).getByRole('heading')).toHaveCount(0);
  await expect(pill(page)).toHaveText('1');
  await expect(pill(page)).toHaveAccessibleName('1 proposal, show the notice');
  await expect(pill(page)).toBeFocused();
  const p = (await pill(page).boundingBox())!;
  expect(Math.abs(p.x - at.x)).toBeLessThan(8);
  expect(Math.abs(p.y - at.y)).toBeLessThan(8);
  await page.reload();
  await expect(page.locator('vb-node')).toHaveCount(2);
  await expect(pill(page)).toHaveText('1');
  await propose(request, d, b, 'not needed');
  await expect(pill(page)).toHaveText('2');
  await expect(pill(page)).toHaveAccessibleName('2 proposals, show the notice');
  await expect(page.locator('span[aria-live="polite"]').filter({ hasText: 'proposes' }))
    .toHaveText(`Pricing chat proposes: not needed, on item ${b}`);
  await pill(page).click();
  await expect(notice(page).getByRole('heading', { level: 2 })).toHaveText('2 proposals');
  await expect(notice(page).getByRole('button', { name: 'Review' })).toBeFocused();
  await page.reload();
  await expect(notice(page).getByRole('heading', { level: 2 })).toHaveText('2 proposals');
});

test('keyboard: Esc on the notice hides it with focus on the pill; Enter on the pill brings it back; Review and Accept all unchanged', async ({ page, request }) => {
  const d = await draw(request);
  const [a] = d.n as [number];
  await propose(request, d, a, 'the client declined');
  await open(page, d);
  const review = notice(page).getByRole('button', { name: 'Review' });
  await review.focus();
  await page.keyboard.press('Escape');
  await expect(pill(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(review).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(notice(page).getByRole('button', { name: 'Accept all (1)' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(hide(page), 'Hide is first in the tab order, as it is first on screen').toBeFocused();
  await page.keyboard.press('Enter');
  await expect(pill(page)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(review).toBeFocused();
  await review.click();
  await expect(page.locator(`vb-node[data-id="${a}"]`).getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await notice(page).getByRole('button', { name: 'Accept all (1)' }).click();
  await expect(page.getByRole('dialog', { name: 'Accept this proposal?' })).toBeVisible();
});

test('with the requests strip showing, the notice sits below it', async ({ page, request }) => {
  const d = await draw(request);
  await propose(request, d, d.n[0]!, 'the client declined');
  const other = await joinAgent(request, 'Support chat');
  const asked = await request.post('/api/grants', { headers: { Authorization: `Bearer ${other.secret}` }, data: { board: d.board, reason: 'I add the support items.' } });
  expect(asked.status(), await asked.text()).toBe(201);
  await open(page, d);
  await expect(page.locator('.vb-access-row')).toHaveCount(1);
  const strip = (await page.locator('.vb-access').boundingBox())!;
  expect(await top(page, '.vb-proposals')).toBeGreaterThanOrEqual(strip.y + strip.height);
});

for (const theme of THEMES) {
  test(`axe passes with the notice and with the pill (${theme})`, async ({ page, request }) => {
    const d = await draw(request);
    await propose(request, d, d.n[0]!, 'the client declined');
    await setTheme(page, theme);
    await open(page, d);
    await expect(notice(page).getByRole('heading', { level: 2 })).toBeVisible();
    await expectNoAxeViolations(page);
    await hide(page).click();
    await expect(pill(page)).toBeVisible();
    await expectNoAxeViolations(page);
  });
}

test('gallery: the notice and its pill over a card, in the Agent proposals section', async ({ page }) => {
  await page.goto('/gallery.html');
  const s = page.locator('section[data-feature="proposals"]');
  await expect(s.locator('.vb-proposals')).toHaveCount(2);
  await expect(s.locator('.vb-proposals h2')).toHaveText('5 proposals');
  await expect(s.locator('.vb-proposals-pill')).toHaveText('5');
  await expect(s.locator('.g-notice-stage vb-node')).toHaveCount(2);
});

// Page polish ruling A: a wider step between Review and Accept all; the notice and the pill both
// outlined in the page's accent; the number does not move when the pill opens into the notice.
const number = (page: Page) => notice(page).locator('.vb-proposals-n');
/** The page's accent, resolved the way the browser resolves the token (light-dark()). */
const accent = (page: Page) => page.evaluate(() => {
  const probe = document.createElement('span');
  probe.style.color = 'var(--vb-accent)';
  document.body.append(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return c;
});
const borders = (page: Page) => notice(page).evaluate((e) => {
  const s = getComputedStyle(e);
  return [s.borderTopColor, s.borderRightColor, s.borderBottomColor, s.borderLeftColor];
});

test('page polish: Review and Accept all a clear step apart; Review does not touch the count row', async ({ page, request }) => {
  const d = await draw(request);
  await propose(request, d, d.n[0]!, 'the client declined');
  await open(page, d);
  const review = (await notice(page).getByRole('button', { name: 'Review' }).boundingBox())!;
  const all = (await notice(page).getByRole('button', { name: 'Accept all (1)' }).boundingBox())!;
  const head = (await notice(page).locator('.vb-proposals-head').boundingBox())!;
  const step = all.y - (review.y + review.height);
  expect(step, 'wider than the rows\' 4px gap').toBeGreaterThanOrEqual(8);
  expect(step, 'wider than the gap above Review').toBeGreaterThan(review.y - (head.y + head.height));
});

for (const theme of THEMES) {
  test(`page polish: the notice and the pill have the accent border; the number stays put when it opens (${theme})`, async ({ page, request }) => {
    const d = await draw(request);
    await propose(request, d, d.n[0]!, 'the client declined');
    await setTheme(page, theme);
    await open(page, d);
    const pink = await accent(page);
    expect(await borders(page), 'the open notice').toEqual([pink, pink, pink, pink]);
    const opened = (await number(page).boundingBox())!;
    const box = (await notice(page).boundingBox())!;
    await hide(page).click();
    await expect(pill(page)).toBeVisible();
    expect(await borders(page), 'the pill').toEqual([pink, pink, pink, pink]);
    const closed = (await number(page).boundingBox())!;
    const pillBox = (await notice(page).boundingBox())!;
    for (const k of ['x', 'y', 'width', 'height'] as const) expect(Math.abs(closed[k] - opened[k]), `the number's ${k}`).toBeLessThanOrEqual(1);
    expect(Math.abs(pillBox.x - box.x), 'the same top left').toBeLessThanOrEqual(1);
    expect(Math.abs(pillBox.y - box.y)).toBeLessThanOrEqual(1);
    expect(pillBox.height, 'a target size').toBeGreaterThanOrEqual(24);
    await pill(page).click();
    const again = (await number(page).boundingBox())!;
    for (const k of ['x', 'y'] as const) expect(Math.abs(again[k] - closed[k]), `opening: the number's ${k}`).toBeLessThanOrEqual(1);
  });
}
