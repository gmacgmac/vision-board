// Every app card state on the board (app-cards FE_02, D-047 ruling 10; PLAN.md § Goal state line 6),
// light and dark, axe on each: loading (list_apps not answered yet), needs approval, code changed,
// ready, missing, invalid and broken from the real app host (app-server.ts, with the test apps of
// apps/board/tests/fixtures/apps/); zoomed out and off screen, the light placeholder over a frozen
// frame (D-050: no frame is made off screen or below FAR_K, one is made once the card is in
// view, and a loaded one stays loaded; app-alive.spec.ts proves it keeps what it holds);
// and a past version of the board, read-only, no frame. Allow and "Allowed ▾" are in the footer
// (card-polish FE_01), so every card has one size in every state.
import fs from 'node:fs';
import path from 'node:path';
import type { Page, Route } from '@playwright/test';
import type { AppServer } from './app-server.ts';
import { startAppServer } from './app-server.ts';
import { addApp } from '#board/testing';
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
/** Every card's size as laid out: one width and height, whatever each card's state. */
const sizes = (page: Page) => page.locator('vb-node').evaluateAll((els) => [...new Set(els.map((e) => `${(e as HTMLElement).offsetWidth}x${(e as HTMLElement).offsetHeight}`))]);
/** The footer's app control showing on card `i`, if any. */
const control = (page: Page, i: number) => card(page, i).locator('.vb-app-status > button:visible');

async function open(page: Page, query = ''): Promise<void> {
  await page.goto(`${s.base}/${query}#${board}`);
  await expect(page.locator('vb-node')).toHaveCount(n.length);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
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
    // The footer's control per state: Allow (with its reason) or "Allowed ▾"; none without a panel.
    await expect(control(page, 0)).toHaveAccessibleName('Allow app: Calculator. Not allowed yet');
    await expect(control(page, 1)).toHaveAccessibleName('Allow app: Good. Code changed');
    await expect(control(page, 2)).toHaveAccessibleName('App allowed: Probe');
    await expect(control(page, 2)).toHaveAttribute('aria-haspopup', 'menu');
    for (const i of [3, 4, 5]) await expect(control(page, i), STATES[i]).toHaveCount(0);
    await expect(page.locator('.vb-app-ask')).toHaveCount(0);
    // The panel runs edge to edge: its sides meet the card's border (within 1px).
    for (const i of [0, 1, 2]) {
      const [c, f] = await Promise.all([card(page, i).boundingBox(), card(page, i).locator('vb-app-frame').boundingBox()]);
      expect(Math.abs(f!.x - c!.x) - 1, STATES[i]).toBeLessThanOrEqual(1);
      expect(Math.abs(c!.x + c!.width - (f!.x + f!.width)) - 1, STATES[i]).toBeLessThanOrEqual(1);
    }
    await expect(slot(page, 3).locator('.vb-app-head')).toHaveText('App nope not found');
    await expect(card(page, 3).getByRole('button', { name: 'Check again: Nope' })).toBeVisible();
    // Every card is one size, whatever its state (finding 6).
    expect(await sizes(page)).toHaveLength(1);
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
    // Loading is the same size: no card moved when list_apps answered (finding 6).
    expect(loading).toHaveLength(1);
    expect(await heights(page)).toEqual(loading);
  });

  test(`zoomed out past FAR_K, the panels are frozen: the placeholder with the app's title; zoomed back in, the same panels show again (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page);
    await expectStates(page);
    const stage = page.locator('#stage');
    for (let i = 0; i < 12 && (await stage.getAttribute('data-zoom')) !== 'far'; i += 1) await page.keyboard.press('-');
    await expect(stage).toHaveAttribute('data-zoom', 'far');
    await expect(page.locator('vb-app-frame[data-frozen][inert] iframe')).toHaveCount(3);
    await expect(page.locator('vb-app-frame iframe').first()).toBeHidden();
    await expect(card(page, 2).locator('vb-app-frame')).toHaveAttribute('data-state', 'ready');
    await expect(card(page, 2).locator('.vb-af-title')).toHaveText('Probe');
    await expect(card(page, 2).locator('.vb-af-title')).toBeVisible();
    // The footer's controls hide as the quick actions do.
    await expect(card(page, 0).locator('[data-app-act="app-allow"]')).toBeHidden();
    await expect(card(page, 2).locator('[data-app-menu]')).toBeHidden();
    await expectNoAxeViolations(page);
    for (let i = 0; i < 12 && (await stage.getAttribute('data-zoom')) === 'far'; i += 1) await page.keyboard.press('+');
    await expectStates(page);
    await expect(page.locator('vb-app-frame[data-frozen]')).toHaveCount(0);
  });
}

/** Card `i`'s footer: its height, whether it overflows, and the spread of its controls' middles. */
const footOf = (page: Page, i: number) => card(page, i).locator('.vb-node-foot').evaluate((f) => {
  const kids = [...f.querySelectorAll<HTMLElement>(':scope > *, .vb-node-actions > *, .vb-app-status > *')].filter((k) => k.checkVisibility());
  const mids = kids.map((k) => { const b = k.getBoundingClientRect(); return b.top + b.height / 2; });
  return { h: (f as HTMLElement).offsetHeight, over: f.scrollWidth - f.clientWidth, spread: Math.max(...mids) - Math.min(...mids) };
});
/** The app's name in card `i`'s footer, and whether it is cut. */
const nameOf = (page: Page, i: number) => card(page, i).locator('.vb-app-name-text');
const cut = (page: Page, i: number) => nameOf(page, i).evaluate((e) => e.scrollWidth > e.clientWidth);

test('the window look (appTitle flag, on): no title above the panel in any state, the app\'s name in the footer, cut at the least width with the whole name in its tip, and one footer line at one height', async ({ page }) => {
  await open(page);
  await expectStates(page);
  const NAMES = ['Calculator', 'Good', 'Probe', 'Nope', 'Broken manifest', 'Crash'];
  for (const [i, name] of NAMES.entries()) {
    // No title drawn in any state, still in the card's name.
    expect(((await card(page, i).locator('.vb-node-title').boundingBox())?.width ?? 0), STATES[i]).toBeLessThanOrEqual(2);
    await expect(card(page, i)).toHaveAttribute('aria-label', new RegExp(`App: ${name}`));
    await expect(nameOf(page, i), STATES[i]).toHaveText(name);
    await expect(nameOf(page, i), STATES[i]).toBeVisible();
  }
  // The panel meets the card's top: no title's room above it.
  const [c, f] = await Promise.all([card(page, 0).boundingBox(), card(page, 0).locator('vb-app-frame').boundingBox()]);
  expect(f!.y - c!.y).toBeLessThan(16);
  // One size, one footer height, one line, nothing over the edge, whatever the state (282px cards).
  expect(await sizes(page)).toHaveLength(1);
  const feet = await Promise.all(STATES.map((_, i) => footOf(page, i)));
  expect(new Set(feet.map((x) => x.h)).size).toBe(1);
  for (const [i, x] of feet.entries()) {
    expect(x.over, STATES[i]).toBeLessThanOrEqual(0);
    expect(x.spread, STATES[i]).toBeLessThanOrEqual(6);
  }
  // The state view stays in the panel's room, scrolling when it must: Check again is above the footer, not over it.
  const retry = card(page, 4).getByRole('button', { name: 'Check again: Broken manifest' });
  await retry.scrollIntoViewIfNeeded();
  const [view, button, foot] = await Promise.all([slot(page, 4).locator('.vb-app-state').boundingBox(), retry.boundingBox(), card(page, 4).locator('.vb-node-foot').boundingBox()]);
  expect(view!.y + view!.height).toBeLessThanOrEqual(foot!.y + 0.5);
  expect(button!.y + button!.height).toBeLessThanOrEqual(foot!.y + 0.5);
  await expectNoAxeViolations(page);
  // A name that fits shows no tip.
  expect(await cut(page, 5)).toBe(false);
  await nameOf(page, 5).hover();
  await expect(card(page, 5).locator('.vb-app-name-tip')).toBeHidden();
  // A name too long for the bar at the least width (a 282px card, beside Allow): cut, one line still;
  // hover shows the whole name in its tip, so does keyboard focus in the footer, and Esc closes it.
  const LONG = 'Tries too much';
  addApp(s.project, 'fs-write');
  const other = await s.draw([{ kind: 'app', title: 'Writer', app: { id: 'fs-write', w: 280, h: 160 } }]);
  await page.goto('about:blank'); // a new hash alone keeps the open board
  await page.goto(`${s.base}/#${other.board}`);
  await expect(page.locator('vb-node')).toHaveCount(1);
  const long = page.locator('vb-node');
  await expect(long.locator('[data-app-act="app-allow"]')).toBeVisible();
  const name = long.locator('.vb-app-name-text');
  await expect(name).toHaveText(LONG); // list_apps' title, the app's name, over the card's
  expect(await long.evaluate((c: HTMLElement) => c.offsetWidth)).toBe(282);
  expect(await name.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true);
  const box = await long.locator('.vb-node-foot').evaluate((f) => [f.scrollWidth - f.clientWidth, (f as HTMLElement).offsetHeight]);
  expect(box).toEqual([0, feet[0]!.h]);
  const tip = long.locator('.vb-app-name-tip');
  await expect(tip).toBeHidden();
  await name.hover();
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText(LONG);
  await page.mouse.move(0, 0);
  await expect(tip).toBeHidden();
  // A press on a footer button opens nothing; keyboard focus there does.
  await long.locator('button.vb-history').click();
  await expect(tip).toBeHidden();
  await page.keyboard.press('Escape');
  await long.locator('[data-app-act="app-allow"]').focus();
  await page.keyboard.press('Tab');
  await expect(tip).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
});

test('with the appTitle flag off, the title shows above the panel and the footer names nothing', async ({ page }) => {
  await open(page, '?flags=-appTitle');
  await expectStates(page);
  expect(((await card(page, 0).locator('.vb-node-title').boundingBox())?.width ?? 0)).toBeGreaterThan(2);
  await expect(nameOf(page, 0)).toBeHidden();
  expect(await sizes(page)).toHaveLength(1);
});

/** Pan the board by (dx, dy) screen pixels with the wheel, as a person scrolls. */
async function panBy(page: Page, dx: number, dy: number): Promise<void> {
  const box = (await page.locator('#stage').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(-dx, -dy);
}

for (const theme of THEMES) {
  test(`off screen, no panel starts: a loaded one is frozen, none is made for a card off screen on opening, and one is made once it comes into view (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page);
    await expectStates(page);
    // Well past a screen away, the frames stay loaded, frozen.
    const { width } = (await page.locator('#stage').boundingBox())!;
    await panBy(page, -3 * width, 0);
    await expect(page.locator('vb-app-frame[data-frozen] iframe')).toHaveCount(3);
    // Opened again where the person left it (the view is kept): nothing off screen loads.
    const panels: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/app-panels/')) panels.push(r.url()); });
    await page.waitForTimeout(400); // the kept view is saved a moment after the board stops moving
    await page.reload();
    await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
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
    await expect(calc.locator('vb-app-frame iframe, .vb-app-status > button:visible')).toHaveCount(0);
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
  await expect(control(page, 5)).toHaveAccessibleName('Allow app: Crash. Code changed');
  await expect(card(page, 5)).toBeFocused();
});
