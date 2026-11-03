// The write controls a read-only ledger leaves (FE_01, tracker N44, VERIFY_01 F10): the requests strip's Allow all /
// Allow / Refuse, the Agents panel's remove, an app card's Allow and Stop app, and the card toolbar's tooltips are
// paused, each saying why ("Read-only: press Edit to change it") before anyone presses it; a press writes nothing.
// Edit gives them back. On the app server (app-server.ts), drawn while it is editable, then given up with Stop editing.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { lc, pixel } from './apca.ts';
import { joinAgent } from './agent-board.ts';
import type { AppServer } from './app-server.ts';
import { CALCULATOR, startAppServer } from './app-server.ts';
import { card as cardOf, panelOf } from './board-page.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

test.describe.configure({ mode: 'serial' });

const THEMES: Theme[] = ['light', 'dark'];
const REASON = 'Read-only: press Edit to change it';
let s: AppServer;
let board = '';
let cards: number[] = [];
test.beforeAll(async () => { s = await startAppServer(); });
test.afterAll(async () => { await s.close(); });

const bearer = (secret: string) => ({ Authorization: `Bearer ${secret}` });
async function ask(secret: string, region?: string): Promise<number> {
  const r = await fetch(`${s.base}/api/grants`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...bearer(secret) }, body: JSON.stringify({ board, ...(region && { region }), reason: 'Needs it.' }) });
  const body = await r.text();
  expect(r.status, body).toBe(201);
  return (JSON.parse(body) as { request: number }).request;
}

/** A board with a question and the calculator; one helper agent already allowed (so Agents lists it), another asking twice. */
async function setUp(request$: APIRequestContext): Promise<void> {
  if (board) return;
  const drawn = await s.draw([{ kind: 'question', title: 'Which idea first?' }, CALCULATOR]);
  board = drawn.board;
  cards = drawn.n;
  const holder = await joinAgent(request$, 'Helper chat', s.base);
  await s.act(board, { action: 'grant', request: await ask(holder.secret) });
  const asker = await joinAgent(request$, 'Asking chat', s.base);
  await ask(asker.secret);
  await ask(asker.secret, 'tools');
}

async function open(page: Page): Promise<void> {
  await page.goto(`${s.base}/#${board}`);
  await expect(page.locator('vb-node')).toHaveCount(cards.length);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
  await panelOf(cardOf(page, cards[1]!)); // the app's panel loaded, so nothing is cut off at the end
}
async function editing(page: Page, on: boolean): Promise<void> {
  const r = on ? await page.request.post(`${s.base}/api/project/edit`) : await page.request.delete(`${s.base}/api/project/edit`);
  expect(r.status(), await r.text()).toBe(200);
  await page.waitForTimeout(300); // the stream's `editing` reaches the page, which reads again
}
const head = async (page: Page) => ((await (await page.request.get(`${s.base}/api/boards`)).json()) as { head: number }).head;

/** Paused: aria-disabled and the reason as its tooltip. */
async function expectPaused(el: Locator): Promise<void> {
  await expect(el).toHaveAttribute('aria-disabled', 'true');
  await expect(el).toHaveAttribute('title', REASON);
}

test('read-only: Allow all, Allow, Refuse, remove, Allow app and the card tooltips are paused with the reason, and a press writes nothing', async ({ page, request }) => {
  await page.goto(`${s.base}/?setup`);
  await setUp(request);
  await open(page);
  await editing(page, false);
  const strip = page.locator('.vb-access');
  await expectPaused(strip.locator('.vb-access-allow-all'));
  for (const el of await strip.locator('.vb-access-allow').all()) await expectPaused(el);
  for (const el of await strip.getByRole('button', { name: /^Refuse/ }).all()) await expectPaused(el);
  await page.locator('.vb-agents summary').first().click();
  await expectPaused(page.getByRole('button', { name: /^Remove Helper chat/ }));
  const app = cardOf(page, cards[1]!);
  await expectPaused(app.locator('[data-app-act="app-allow"]'));
  const ask = cardOf(page, cards[0]!);
  for (const act of ['ack', 'drop']) await expect(ask.locator(`button[data-act="${act}"]`)).toHaveAttribute('title', new RegExp(`^${REASON}`));
  await expect(ask.locator('button[data-flag]')).toHaveAttribute('title', new RegExp(`^${REASON}`));
  // A press changes nothing.
  const before = await head(page);
  await strip.locator('.vb-access-allow-all').click({ force: true });
  await strip.locator('.vb-access-allow').first().click({ force: true });
  await strip.getByRole('button', { name: /^Refuse/ }).first().click({ force: true });
  await expect(strip.locator('.vb-access-note')).toHaveCount(0);
  await page.getByRole('button', { name: /^Remove Helper chat/ }).click({ force: true });
  await app.locator('[data-app-act="app-allow"]').click({ force: true });
  await expect(page.locator('#toast')).toHaveText(REASON);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await head(page)).toBe(before);
});

test('Edit gives them back: enabled, with their usual tooltips', async ({ page, request }) => {
  await page.goto(`${s.base}/?setup`);
  await setUp(request);
  await editing(page, true);
  await open(page);
  const strip = page.locator('.vb-access');
  await expect(strip.locator('.vb-access-allow-all')).not.toHaveAttribute('aria-disabled', 'true');
  await expect(strip.locator('.vb-access-allow').first()).not.toHaveAttribute('aria-disabled', 'true');
  await expect(cardOf(page, cards[1]!).locator('[data-app-act="app-allow"]')).not.toHaveAttribute('aria-disabled', 'true');
  await expect(cardOf(page, cards[0]!).locator('button[data-act="ack"]')).toHaveAttribute('title', /^Check/);
  await expect(cardOf(page, cards[1]!).locator('[data-app-act="app-allow"]')).not.toHaveAttribute('title', REASON);
});

for (const theme of THEMES) {
  test(`read-only (${theme}): axe finds nothing on the page with the controls paused`, async ({ page, request }) => {
    await page.goto(`${s.base}/?setup`);
    await setUp(request);
    await setTheme(page, theme);
    await editing(page, false);
    await open(page);
    await expectNoAxeViolations(page);
    // The paused buttons' words read at the short-label tier (Lc 45) on their own ground.
    await page.locator('.vb-agents summary').first().click();
    const found: [string, number][] = [];
    for (const [name, sel] of [['Allow all', '.vb-access-allow-all'], ['Allow', '.vb-access-allow'], ['Remove access', '.vb-agents-row .vb-btn']] as const) {
      const [ink, ground] = await page.locator(sel).first().evaluate((e) => { const c = getComputedStyle(e); return [c.color, c.backgroundColor]; });
      found.push([name, lc(await pixel(page, ink!), await pixel(page, ground!))]);
    }
    for (const [name, value] of found) expect(Math.abs(value), `${theme} ${name}: Lc ${value.toFixed(1)}`).toBeGreaterThanOrEqual(45);
    await editing(page, true);
  });
}

test('read-only: Stop app, in an allowed app\'s menu, is paused with the reason too, and a press writes nothing', async ({ page, request }) => {
  await page.goto(`${s.base}/?setup`);
  await setUp(request);
  await editing(page, true);
  const info = (await s.apps()).get('calculator');
  if (!info?.allowed) await s.act(board, { action: 'app-allow', app: 'calculator', hash: info!.hash! });
  await open(page);
  await editing(page, false);
  const app = cardOf(page, cards[1]!);
  await expect(app.getByRole('button', { name: 'App allowed: Calculator' })).toBeVisible();
  await app.getByRole('button', { name: 'App allowed: Calculator' }).click();
  const stop = app.getByRole('menuitem', { name: 'Stop app: Calculator' });
  await expectPaused(stop);
  const before = await head(page);
  await stop.click({ force: true });
  await expect(page.locator('#toast')).toHaveText(REASON);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await head(page)).toBe(before);
  await editing(page, true);
  await s.act(board, { action: 'app-revoke', app: 'calculator' });
});

for (const theme of THEMES) {
  test(`gallery (${theme}): the section draws every paused control with the reason, last, and passes axe`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    const section = page.locator('section[data-feature="readOnlyControls"]');
    await expect(section).toBeVisible();
    await expect(page.locator('main > section').last()).toHaveAttribute('data-feature', 'readOnlyControls');
    for (const sel of ['.vb-access-allow-all', '.vb-access-allow', '.vb-agents-row .vb-btn', '[data-app-act="app-allow"]', '[data-app-act="app-revoke"]'])
      for (const el of await section.locator(sel).all()) await expectPaused(el);
    await expectNoAxeViolations(page);
  });
}
