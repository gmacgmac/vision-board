// Every app card state on the board (app-cards FE_02, D-047 ruling 10; PLAN.md § Goal state line 6),
// light and dark, axe on each: loading (list_apps not answered yet), needs approval, code changed,
// ready, missing, invalid and broken from the real app host (app-server.ts, with the test apps of
// apps/board/tests/fixtures/apps/); zoomed out and off screen, the light placeholder and no frame
// (ruling 14: no frame is made off screen or below FAR_K, and one is made once the card is in view);
// and a past version of the board, read-only, no frame.
import fs from 'node:fs';
import path from 'node:path';
import type { Page, Route } from '@playwright/test';
import type { AppServer } from './app-server.ts';
import { startAppServer } from './app-server.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['light', 'dark'];
/** Each card at the least panel size, so the whole board fits at a zoom the panels load at. */
const app = (id: string, title: string) => ({ kind: 'app', title, app: { id, w: 280, h: 160 } });
/** The board: one app card per state the app host gives, in this order. */
const STATES = ['needs-approval', 'changed', 'ready', 'missing', 'invalid', 'broken'] as const;

let s: AppServer;
let board = '';
let n: number[] = [];

test.beforeAll(async () => {
  s = await startAppServer({ fixtures: ['good', 'probe', 'invalid-manifest', 'crash'] });
  ({ board, n } = await s.draw([app('calculator', 'Calculator'), app('good', 'Good'), app('probe', 'Probe'), app('nope', 'Nope'),
    app('invalid-manifest', 'Broken manifest'), app('crash', 'Crash')]));
  const allow = async (id: string) => s.act(board, { action: 'app-allow', app: id, hash: (await s.apps()).get(id)!.hash });
  for (const id of ['good', 'probe', 'crash']) await allow(id);
  // Good's code changes after its Allow; Crash crashes three times, which marks it broken.
  fs.appendFileSync(path.join(s.dir('good'), 'tools.mjs'), '\n// changed\n');
  for (let i = 0; i < 3; i += 1) expect(await s.call('crash', 'boom')).toBe(502);
  expect([...(await s.apps()).values()].map((a) => [a.id, a.state])).toEqual([
    ['calculator', 'needs-approval'], ['crash', 'broken'], ['good', 'needs-approval'], ['invalid-manifest', 'invalid'], ['nope', 'missing'], ['probe', 'ready']]);
});
test.afterAll(async () => { await s.close(); });

const card = (page: Page, i: number) => page.locator(`vb-node[data-id="${n[i]}"]`);
const slot = (page: Page, i: number) => card(page, i).locator('.vb-app');
/** Every card's height as laid out: one height, whatever each card's state (finding 6). */
const heights = (page: Page) => page.locator('vb-node').evaluateAll((els) => [...new Set(els.map((e) => (e as HTMLElement).offsetHeight))]);

async function open(page: Page, query = ''): Promise<void> {
  await page.goto(`${s.base}/${query}#${board}`);
  await expect(page.locator('vb-node')).toHaveCount(n.length);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
}

/** Every card in its state, and the frame loaded in each state that shows the panel. */
async function expectStates(page: Page): Promise<void> {
  for (const [i, state] of STATES.entries()) await expect(slot(page, i), state).toHaveAttribute('data-app-state', state);
  for (const i of [0, 1, 2]) await expect(card(page, i).locator('vb-app-frame'), STATES[i]).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('vb-app-frame iframe')).toHaveCount(3);
}

for (const theme of THEMES) {
  test(`every state the app host gives, each drawn in its card (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page);
    await expectStates(page);
    await expect(card(page, 0).locator('.vb-app-ask-text')).toHaveText('Allow this app to run?');
    await expect(card(page, 1).locator('.vb-app-ask-text')).toHaveText('Code changed. Allow it again?');
    await expect(card(page, 2).locator('.vb-app-ask-text')).toHaveText('Allowed to run');
    await expect(card(page, 2).getByRole('button', { name: 'Allow app: Probe' })).toBeHidden();
    await expect(card(page, 2).getByRole('button', { name: 'Stop app: Probe' })).toBeVisible();
    await expect(slot(page, 3).locator('.vb-app-head')).toHaveText('App nope not found');
    await expect(card(page, 3).getByRole('button', { name: 'Check again: Nope' })).toBeVisible();
    // The row over the panel keeps its room in every state, so every card is one height (finding 6).
    expect(await heights(page)).toHaveLength(1);
    await expect(slot(page, 4).locator('.vb-app-head')).toHaveText('This app has problems');
    await expect(slot(page, 4).locator('.vb-app-problems li').first()).toContainText('app.json');
    await expect(slot(page, 5).locator('.vb-app-head')).toHaveText('This app stopped');
    await expect(card(page, 5).getByRole('button', { name: 'Restart: Crash' })).toBeVisible();
    await expectNoAxeViolations(page);
    // Check again reads list_apps once more; nothing changed, so the card says so and keeps focus.
    await card(page, 4).getByRole('button', { name: 'Check again: Broken manifest' }).click();
    await expect(page.locator('#toast')).toHaveText('Broken manifest still has problems.');
  });

  test(`loading: until list_apps answers, each app card says so (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    let release = () => {};
    const held = new Promise<void>((resolve) => { release = resolve; });
    await page.route(`${s.base}/api/apps`, async (route: Route) => { await held; await route.continue(); });
    await open(page);
    for (const i of STATES.keys()) await expect(slot(page, i)).toHaveAttribute('data-app-state', 'checking');
    await expect(slot(page, 0)).toHaveAttribute('aria-busy', 'true');
    await expect(slot(page, 0).locator('.vb-app-text')).toHaveText('Loading…');
    await expect(page.locator('vb-app-frame iframe')).toHaveCount(0);
    await expect(card(page, 0)).toHaveAttribute('aria-label', /, loading$/);
    await expectNoAxeViolations(page);
    const loading = await heights(page);
    release();
    await expectStates(page);
    // Loading took the row's room too: no card moved when list_apps answered (finding 6).
    expect(loading).toHaveLength(1);
    expect(await heights(page)).toEqual(loading);
  });

  test(`zoomed out past FAR_K, no panel runs: the placeholder with the app's title; zoomed back in, the panels start again (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page);
    await expectStates(page);
    const stage = page.locator('#stage');
    for (let i = 0; i < 12 && (await stage.getAttribute('data-zoom')) !== 'far'; i += 1) await page.keyboard.press('-');
    await expect(stage).toHaveAttribute('data-zoom', 'far');
    await expect(page.locator('vb-app-frame iframe')).toHaveCount(0);
    await expect(card(page, 2).locator('vb-app-frame')).toHaveAttribute('data-state', 'idle');
    await expect(card(page, 2).locator('.vb-af-title')).toHaveText('Probe');
    await expectNoAxeViolations(page);
    for (let i = 0; i < 12 && (await stage.getAttribute('data-zoom')) === 'far'; i += 1) await page.keyboard.press('+');
    await expectStates(page);
  });
}

/** Pan the board by (dx, dy) screen pixels with the wheel, as a person scrolls. */
async function panBy(page: Page, dx: number, dy: number): Promise<void> {
  const box = (await page.locator('#stage').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(-dx, -dy);
}

for (const theme of THEMES) {
  test(`off screen, no panel runs: none is made for a card well off screen, and one is made once it comes into view (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page);
    await expectStates(page);
    // Well past a screen away, the frames go.
    const { width } = (await page.locator('#stage').boundingBox())!;
    await panBy(page, -3 * width, 0);
    await expect(page.locator('vb-app-frame iframe')).toHaveCount(0);
    await expect(card(page, 0).locator('vb-app-frame')).toHaveAttribute('data-state', 'idle');
    // Opened again where the person left it (the view is kept): nothing off screen loads.
    const panels: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/app-panels/')) panels.push(r.url()); });
    await page.waitForTimeout(400); // the kept view is saved a moment after the board stops moving
    await page.reload();
    await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
    await expect(slot(page, 0)).toHaveAttribute('data-app-state', 'needs-approval');
    await page.waitForTimeout(300);
    await expect(page.locator('vb-app-frame iframe')).toHaveCount(0);
    expect(panels).toEqual([]);
    await expectNoAxeViolations(page);
    // Back into view: the panels start.
    await page.keyboard.press('f');
    await expectStates(page);
    expect(panels.map((u) => new URL(u).pathname).sort()).toEqual(['/app-panels/calculator', '/app-panels/good', '/app-panels/probe']);
  });

  test(`a past version: app cards are placeholders, read-only, with no panel, at the size the manifest gives (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    // Two versions: the agent's next drawing starts a new one once the person has answered. The card
    // gives no size, so the panel's is the manifest's (360×440), now and in the past version (finding 3).
    const past = await s.draw([{ kind: 'app', title: 'Calculator', app: { id: 'calculator' } }, { kind: 'question', title: 'Is the calculator right?' }]);
    await s.act(past.board, { action: 'ack', n: past.n[1], ver: 1 });
    await s.write(past.board, [{ type: 'node', node: { region: 'tools', kind: 'note', title: 'A later card' } }]);
    await page.goto(`${s.base}/#${past.board}`);
    const calc = page.locator(`vb-node[data-id="${past.n[0]}"]`);
    await expect(calc.locator('vb-app-frame')).toHaveAttribute('data-state', 'ready');
    const box = () => calc.evaluate((c: HTMLElement) => [c.offsetWidth, c.offsetHeight]);
    const now = await box();
    const version = page.locator('#version');
    await expect(version.locator('option')).toHaveCount(2);
    await version.selectOption({ index: 1 });
    await expect(calc.locator('.vb-app')).toHaveAttribute('data-app-state', 'past');
    await expect(calc.locator('.vb-app-head')).toHaveText('Calculator');
    await expect(calc.locator('.vb-app-text')).toHaveText('Apps don\'t run in past versions.');
    await expect(calc.locator('vb-app-frame iframe, .vb-app-ask:visible')).toHaveCount(0);
    await expect(calc).toHaveAttribute('aria-label', /, not running in a past version$/);
    await expect(calc.locator('vb-app-frame')).toHaveAttribute('data-w', '360');
    await expect(calc.locator('vb-app-frame')).toHaveAttribute('data-h', '440');
    expect(await box()).toEqual(now);
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
    await expect(calc.locator('vb-app-frame')).toHaveAttribute('data-state', 'ready');
  });
}

// Last in the file: it changes Crash's code, so Crash is no longer broken after it.
test('Restart, once the agent fixed the code: the card asks to allow the new code, and focus stays on the card', async ({ page }) => {
  await open(page);
  await expect(slot(page, 5)).toHaveAttribute('data-app-state', 'broken');
  fs.appendFileSync(path.join(s.dir('crash'), 'tools.mjs'), '\n// fixed\n');
  await card(page, 5).getByRole('button', { name: 'Restart: Crash' }).click();
  await expect(page.locator('#toast')).toHaveText('Crash updated');
  await expect(slot(page, 5)).toHaveAttribute('data-app-state', 'changed');
  await expect(card(page, 5).locator('.vb-app-ask-text')).toHaveText('Code changed. Allow it again?');
  await expect(card(page, 5)).toBeFocused();
});
