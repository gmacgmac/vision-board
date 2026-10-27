// App panels stay loaded and keep their state (app-state-kept FE_01 and FE_02, D-050,
// superseding D-047 ruling 14): a panel that has loaded keeps running, with what it holds in memory,
// through a zoom far out and back, a pan two screens away and back, a new version of its card, a
// relayout, a selection and a new size; its document never loads again. Off screen or zoomed far it
// is frozen: inert (no click, no Tab), not painted, the placeholder with the app's title in its
// place. Only the cap of live panels (`LIVE_PANELS`, app-cards.ts) unloads one, the least recently
// used frozen one first. A panel that starts again (a reload, the cap) gets back what it saved
// (`vision-board/save-state`, apps.md § Saving the panel's state). On a temp project of its own
// (app-server.ts) with the example calculator and the panel-only test app.
import type { Frame, Locator, Page } from '@playwright/test';
import { tabTo } from './agent-board.ts';
import type { AppServer } from './app-server.ts';
import { CALCULATOR, startAppServer } from './app-server.ts';
import { LIVE_PANELS } from '../../apps/board/src/board/app-cards.ts';
import { APP_LIMITS, PANEL_ERRORS, PANEL_SAVE_STATE } from '#format';
import { expect, expectNoAxeViolations, test } from './helpers.ts';

let s: AppServer;
test.beforeAll(async () => { s = await startAppServer({ fixtures: ['panel-only'] }); });
test.afterAll(async () => { await s.close(); });

async function open(page: Page, board: string, count: number): Promise<void> {
  await page.goto(`${s.base}/#${board}`);
  await expect(page.locator('vb-node')).toHaveCount(count);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
}

const cardOf = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);

/** A card's panel, once its frame is ready. */
async function panelOf(card: Locator): Promise<Frame> {
  await expect(card.locator('vb-app-frame')).toHaveAttribute('data-state', 'ready');
  return (await (await card.locator('vb-app-frame iframe').elementHandle())!.contentFrame())!;
}

/** Every time a panel's document loads (its first load included), by the frame's URL. */
function countLoads(page: Page): string[] {
  const loads: string[] = [];
  page.on('framenavigated', (f) => { if (f !== page.mainFrame() && f.url().includes('/app-panels/')) loads.push(f.url()); });
  return loads;
}

/** Pan the board by (dx, dy) screen pixels with the wheel over its background (near the stage's
 * right edge: a wheel over a loaded panel scrolls the panel), as a person scrolls. */
async function panBy(page: Page, dx: number, dy: number): Promise<void> {
  const box = (await page.locator('#stage').boundingBox())!;
  await page.mouse.move(box.x + box.width - 40, box.y + box.height / 2);
  await page.mouse.wheel(-dx, -dy);
}

/** Zoom out with "-" until the stage is far, or back in with "+" until it is not. */
async function zoomFar(page: Page, far: boolean): Promise<void> {
  const stage = page.locator('#stage');
  const key = far ? '-' : '+';
  for (let i = 0; i < 12 && ((await stage.getAttribute('data-zoom')) === 'far') !== far; i += 1) await page.keyboard.press(key);
  if (far) await expect(stage).toHaveAttribute('data-zoom', 'far');
  else await expect(stage).not.toHaveAttribute('data-zoom', 'far');
}

/** What the calculator holds in memory: the sum typed, and a mark the test left in its window. */
const held = (panel: Frame) => panel.evaluate(() => [document.getElementById('sum-text')?.textContent, (window as { kept?: string }).kept]);
const KEPT = ['12', 'yes'];

test('a loaded panel keeps what it holds through a far zoom, a pan two screens away, a new version, a relayout, a selection and a new size; it loads once', async ({ page }) => {
  const { board, n: [first, n, q] } = await s.draw([{ kind: 'finding', title: 'A card before it' }, CALCULATOR, { kind: 'question', title: 'Is the sum right?' }]);
  const loads = countLoads(page);
  await open(page, board, 3);
  const card = cardOf(page, n!);
  const frame = card.locator('vb-app-frame');
  const iframe = frame.locator('iframe');
  const panel = await panelOf(card);
  for (const key of ['1', '2']) await panel.getByRole('button', { name: key, exact: true }).click();
  await panel.evaluate(() => { (window as { kept?: string }).kept = 'yes'; });
  expect(await held(panel)).toEqual(KEPT);
  expect(loads).toHaveLength(1);
  const live = async (why: string) => {
    await expect(frame, why).not.toHaveAttribute('data-frozen');
    await expect(iframe, why).toBeVisible();
    expect(await held(panel), why).toEqual(KEPT);
    expect(loads, why).toHaveLength(1);
  };

  // Zoomed far: frozen, still loaded, the placeholder with the app's title in its place.
  await card.focus();
  await zoomFar(page, true);
  await expect(frame).toHaveAttribute('data-frozen', '');
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toBeHidden();
  await expect(frame.locator('.vb-af-title')).toBeVisible();
  await zoomFar(page, false);
  await live('back from the far zoom');

  // Two screens away and back: frozen while away, never unloaded.
  const { width } = (await page.locator('#stage').boundingBox())!;
  await panBy(page, -3 * width, 0);
  await expect(frame).toHaveAttribute('data-frozen', '');
  await expect(iframe).toHaveCount(1);
  await panBy(page, 3 * width, 0);
  await live('back from two screens away');

  // A new version of the card, then a relayout: the card before it retired, so it moves up.
  await s.write(board, [{ type: 'node', n, node: { region: 'tools', ...CALCULATOR, title: 'Calculator, again' } }]);
  await expect(card.locator('.vb-node-title')).toHaveText('Calculator, again');
  await live('a new version');
  const before = await card.boundingBox();
  await s.write(board, [{ type: 'retire', n: first }]);
  await expect(page.locator('vb-node')).toHaveCount(2);
  await expect.poll(async () => JSON.stringify(await card.boundingBox())).not.toBe(JSON.stringify(before));
  await live('a relayout');

  // Selected, with the other card, then a new size from the agent.
  await card.locator('.vb-app-name-text').click();
  await expect(card).toHaveAttribute('data-selected', '');
  await cardOf(page, q!).locator('.vb-node-title').click({ modifiers: ['Shift'], position: { x: 4, y: 4 } });
  await expect(cardOf(page, q!)).toHaveAttribute('data-selected', '');
  await live('a selection');
  await s.write(board, [{ type: 'node', n, node: { region: 'tools', ...CALCULATOR, title: 'Calculator, again', app: { id: 'calculator', w: 400, h: 460 } } }]);
  await expect.poll(() => iframe.evaluate((f: HTMLIFrameElement) => [f.offsetWidth, f.offsetHeight])).toEqual([400, 460]);
  await live('a new size');
});

test('a frozen panel takes no click and no Tab: it is inert while zoomed far, and takes both again zoomed back in', async ({ page }) => {
  const { board, n: [n] } = await s.draw([CALCULATOR]);
  await open(page, board, 1);
  const card = cardOf(page, n!);
  const frame = card.locator('vb-app-frame');
  const iframe = frame.locator('iframe');
  await panelOf(card);
  await card.focus();
  await zoomFar(page, true);
  await expect(frame).toHaveAttribute('inert', '');
  // A click where the panel is lands on the card, never in the panel.
  const box = (await frame.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(iframe).not.toBeFocused();
  // Tab from the card never reaches the panel.
  await card.focus();
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press('Tab');
    await expect(iframe).not.toBeFocused();
  }
  await expectNoAxeViolations(page);
  await card.focus();
  await zoomFar(page, false);
  await expect(frame).not.toHaveAttribute('inert');
  await card.focus();
  await tabTo(page, iframe);
});

/** Go to card `n` by its number (the goToCard flag), then Z: the card fills the stage. */
async function visit(page: Page, n: number): Promise<void> {
  await page.keyboard.type(String(n));
  await page.keyboard.press('Enter');
  await expect(cardOf(page, n)).toBeFocused();
  await page.keyboard.press('z');
  await expect(cardOf(page, n).locator('vb-app-frame')).toHaveAttribute('data-state', /loading|ready/);
  await expect(cardOf(page, n).locator('vb-app-frame')).not.toHaveAttribute('data-frozen');
}

test(`at most ${LIVE_PANELS} panels stay loaded: the next one unloads the least recently used frozen one; a zoom step on 12 app cards is under 50 ms`, async ({ page }) => {
  const COUNT = 12;
  const big = Array.from({ length: COUNT }, (_, i) => ({ kind: 'app', title: `Panel ${i + 1}`, app: { id: 'panel-only', w: 960, h: 800 } }));
  const { board, n } = await s.draw(big);
  await open(page, board, COUNT);
  const loaded = page.locator('vb-app-frame iframe');
  // The whole board shows zoomed far: nothing loads yet.
  await expect(page.locator('#stage')).toHaveAttribute('data-zoom', 'far');
  await expect(loaded).toHaveCount(0);
  for (const id of n) await visit(page, id);
  await expect(loaded).toHaveCount(LIVE_PANELS);
  // The first visited is the least recently used: unloaded, its placeholder back; the last is live.
  const first = cardOf(page, n[0]!).locator('vb-app-frame');
  await expect(first).toHaveAttribute('data-state', 'idle');
  await expect(first).not.toHaveAttribute('data-frozen');
  await expect(first).not.toHaveAttribute('inert');
  await expect(cardOf(page, n.at(-1)!).locator('vb-app-frame iframe')).toHaveCount(1);
  // Every frozen panel is still loaded; only the cap unloaded any.
  expect(await page.locator('vb-app-frame[data-frozen]').count()).toBeGreaterThan(0);
  await expect(page.locator('vb-app-frame[data-frozen]:not(:has(iframe))')).toHaveCount(0);
  // Back to the first: it loads again, and the count stays at the cap.
  await visit(page, n[0]!);
  await expect(loaded).toHaveCount(LIVE_PANELS);
  // A zoom step with the panels loaded and frozen stays in the one-change budget (performance.md).
  const times = await page.evaluate(() => {
    const step = (key: string) => {
      const t = performance.now();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      document.querySelector('vb-app-frame')!.getBoundingClientRect(); // the style and layout the next frame needs
      return performance.now() - t;
    };
    return ['-', '-', '-', '-', '+', '+', '+', '+', '-'].map(step);
  });
  const median = [...times].sort((x, y) => x - y)[Math.floor(times.length / 2)]!;
  console.log(`[FE_01] zoom step, 12 app cards: ${times.map((t) => t.toFixed(1)).join(', ')} ms (median ${median.toFixed(1)})`);
  expect(median).toBeLessThan(50);
  await expect(loaded).toHaveCount(LIVE_PANELS);
});

// ---- Saved state (FE_02) ------------------------------------------------------------------------

const sumOf = (panel: Frame) => panel.locator('#sum-text');
const stateUrl = (url: string, n: number) => url.endsWith(`/nodes/${n}/panel-state`);

/** The page's write of card `n`'s state holding `sum`, answered by the server. */
const savedSum = (page: Page, n: number, sum: string) => page.waitForResponse((r) =>
  r.request().method() === 'PUT' && stateUrl(r.url(), n) && r.ok() && (r.request().postData() ?? '').includes(`"sum":"${sum}"`));

test('a panel gets back what it saved after a page reload: the calculator still shows the sum typed', async ({ page }) => {
  const { board, n: [n] } = await s.draw([CALCULATOR]);
  await open(page, board, 1);
  const panel = await panelOf(cardOf(page, n!));
  const saved = savedSum(page, n!, '12');
  for (const key of ['1', '2']) await panel.getByRole('button', { name: key, exact: true }).click();
  await saved;
  await page.reload();
  await expect(page.locator('vb-node')).toHaveCount(1);
  await expect(sumOf(await panelOf(cardOf(page, n!)))).toHaveText('12');
});

test('the panel the cap unloaded starts again with what it saved, from the page\'s memory', async ({ page }) => {
  const { board, n } = await s.draw(Array.from({ length: LIVE_PANELS + 1 }, (_, i) => ({ ...CALCULATOR, title: `Calculator ${i + 1}` })));
  const first = n[0]!;
  const reads: string[] = [];
  page.on('request', (r) => { if (r.method() === 'GET' && stateUrl(r.url(), first)) reads.push(r.url()); });
  await open(page, board, n.length);
  await visit(page, first);
  const saved = savedSum(page, first, '7');
  await (await panelOf(cardOf(page, first))).getByRole('button', { name: '7', exact: true }).click();
  await saved;
  await cardOf(page, first).focus(); // out of the panel, so the board takes the keys again
  for (const id of n.slice(1)) await visit(page, id);
  await expect(cardOf(page, first).locator('vb-app-frame')).toHaveAttribute('data-state', 'idle');
  await visit(page, first);
  await expect(sumOf(await panelOf(cardOf(page, first)))).toHaveText('7');
  expect(reads, 'read once, when it first started').toHaveLength(1);
});

test.describe('a save the server refuses', () => {
  test.use({ expected: { problems: [/response 413: PUT .*\/panel-state/, /console error: Failed to load resource.*413/] } });

  test('shows the person nothing; the panel\'s request gets the error', async ({ page }) => {
    const { board, n: [n] } = await s.draw([CALCULATOR]);
    // Every save reaches the server over the limit, so the server itself refuses it.
    await page.route(`**/nodes/${n}/panel-state`, (r) => (r.request().method() === 'PUT'
      ? r.continue({ postData: JSON.stringify({ state: 'x'.repeat(APP_LIMITS.stateBytes) }) }) : r.continue()));
    await open(page, board, 1);
    const panel = await panelOf(cardOf(page, n!));
    const back = await panel.evaluate((method) => new Promise((resolve) => {
      addEventListener('message', (e) => { if (e.data?.id === 'probe') resolve(e.data); });
      parent.postMessage({ jsonrpc: '2.0', id: 'probe', method, params: { state: { sum: '1', answer: '' } } }, '*');
    }), PANEL_SAVE_STATE);
    expect(back).toMatchObject({ id: 'probe', error: { code: PANEL_ERRORS.failed, data: { problem: 'too-large' } } });
    await expect(page.locator('#toast')).toBeHidden();
  });
});
