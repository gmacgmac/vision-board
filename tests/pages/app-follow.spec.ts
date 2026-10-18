// App cards follow their files and never jump (app-cards FIX_02; VERIFY_01 findings 1, 2 and 6;
// D-047 rulings 7, 10 and 11). The page reads list_apps again when an app card's frame loads (its
// panel, or the panel route's refusal once the folder went) and when an app card is selected, never
// on a timer: a deleted folder says "not found" without a page reload and Check again brings the
// panel back once the folder is back; a changed tools.mjs asks again as soon as the card is selected,
// before the panel calls anything. The row over the panel keeps its room in every state, so Allow,
// Stop app and a code change leave the card's height as it was. On a temp project of its own
// (app-server.ts) with the example calculator and the panel-only test app.
import fs from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import type { AppServer } from './app-server.ts';
import { CALCULATOR, startAppServer } from './app-server.ts';
import { expect, expectNoAxeViolations, test } from './helpers.ts';

/** The panel route's 404 for the folder that went: the frame asks once more before the card knows. */
const GONE = [/^response 404: GET http:\/\/127\.0\.0\.1:\d+\/app-panels\/panel-only$/, /status of 404 \(Not Found\)/];

let s: AppServer;
test.beforeAll(async () => { s = await startAppServer({ fixtures: ['panel-only'] }); });
test.afterAll(async () => { await s.close(); });

async function open(page: Page, board: string, count: number): Promise<void> {
  await page.goto(`${s.base}/#${board}`);
  await expect(page.locator('vb-node')).toHaveCount(count);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
}

const cardOf = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);
/** The card's height as laid out (unscaled by the board's zoom). */
const heightOf = (card: Locator) => card.evaluate((c: HTMLElement) => c.offsetHeight);
const listApps = (page: Page, seen: string[]) =>
  page.on('request', (r) => { if (r.method() === 'GET' && r.url() === `${s.base}/api/apps`) seen.push(r.url()); });

/** Pan the board by (dx, dy) screen pixels with the wheel over its background (near the stage's
 * right edge: a wheel over a loaded panel scrolls the panel), as a person scrolls. */
async function panBy(page: Page, dx: number, dy: number): Promise<void> {
  const box = (await page.locator('#stage').boundingBox())!;
  await page.mouse.move(box.x + box.width - 80, box.y + box.height / 2);
  await page.mouse.wheel(-dx, -dy);
}

/** Allow in the card, then the confirm, as the person does. */
async function allow(page: Page, card: Locator, heading: string): Promise<void> {
  await card.getByRole('button', { name: 'Allow app: Calculator' }).click();
  await page.getByRole('dialog', { name: heading }).getByRole('button', { name: 'Allow', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Allow app: Calculator' })).toBeHidden();
  await expect(card).toBeFocused();
}

// First in the file: the calculator has never been allowed on this server yet.
test('Allow, a code change and Stop app leave the card\'s height as it was, so nothing under it moves (finding 6)', async ({ page }) => {
  const { board, n: [n] } = await s.draw([CALCULATOR]);
  await open(page, board, 1);
  const card = cardOf(page, n!);
  const row = card.locator('.vb-app-ask-text');
  await expect(row).toHaveText('Allow this app to run?');
  const height = await heightOf(card);
  // Allowed: the row says so and holds Stop app, where Allow was.
  await allow(page, card, 'Allow Calculator to run?');
  await expect(row).toHaveText('Allowed to run');
  await expect(card.getByRole('button', { name: 'Stop app: Calculator' })).toBeVisible();
  expect(await heightOf(card)).toBe(height);
  // The agent changes its code; selected, the card asks again.
  fs.appendFileSync(path.join(s.dir('calculator'), 'tools.mjs'), `\n// changed by the page test ${Date.now()}\n`);
  await card.locator('.vb-node-title').click();
  await expect(row).toHaveText('Code changed. Allow it again?');
  expect(await heightOf(card)).toBe(height);
  await allow(page, card, 'Allow Calculator again?');
  expect(await heightOf(card)).toBe(height);
  // Stopped: asking again.
  await card.getByRole('button', { name: 'Stop app: Calculator' }).click();
  await page.getByRole('dialog', { name: 'Stop Calculator?' }).getByRole('button', { name: 'Stop app' }).click();
  await expect(row).toHaveText('Allow this app to run?');
  expect(await heightOf(card)).toBe(height);
});

test('a changed tools.mjs asks again as soon as the card is selected, before the panel calls anything, and nothing asks on a timer (finding 2)', async ({ page }) => {
  const { board, n: [n] } = await s.draw([CALCULATOR]);
  await s.act(board, { action: 'app-allow', app: 'calculator', hash: (await s.apps()).get('calculator')!.hash });
  const calls: string[] = [];
  page.on('request', (r) => { if (r.method() === 'POST' && r.url() === `${s.base}/api/apps/calculator/calls`) calls.push(r.url()); });
  await open(page, board, 1);
  const card = cardOf(page, n!);
  await expect(card.locator('vb-app-frame')).toHaveAttribute('data-state', 'ready');
  await expect(card.locator('.vb-app-ask-text')).toHaveText('Allowed to run');
  await page.waitForTimeout(300); // the reads the page made on its way in have answered
  const reads: string[] = [];
  listApps(page, reads);
  fs.appendFileSync(path.join(s.dir('calculator'), 'tools.mjs'), `\n// changed by the page test ${Date.now()}\n`);
  // Nothing reads by itself: the card still shows what it knew.
  await page.waitForTimeout(1500);
  expect(reads).toEqual([]);
  await expect(card.locator('.vb-app')).toHaveAttribute('data-app-state', 'ready');
  // Selected: one read, and the card asks again before any call.
  await card.locator('.vb-node-title').click();
  await expect(card).toHaveAttribute('data-selected', '');
  await expect(card.locator('.vb-app-ask-text')).toHaveText('Code changed. Allow it again?');
  await expect(card).toHaveAttribute('aria-label', /, code changed, not allowed yet, selected$/);
  await expect(card.getByRole('button', { name: 'Stop app: Calculator' })).toBeHidden();
  expect(reads).toHaveLength(1);
  expect(calls).toEqual([]);
});

test.describe('a deleted app folder', () => {
  test.use({ expected: { problems: GONE } });

  test('says "not found" once its panel loads again, without a page reload, at the same height; put back, Check again brings the panel back (finding 1)', async ({ page }) => {
    const { board, n: [n] } = await s.draw([{ kind: 'app', title: 'Notice', app: { id: 'panel-only' } }]);
    await open(page, board, 1);
    const card = cardOf(page, n!);
    await expect(card.locator('vb-app-frame')).toHaveAttribute('data-state', 'ready');
    await expect(card.locator('.vb-app-ask-text')).toHaveText('Nothing to allow');
    const height = await heightOf(card);
    const folder = s.dir('panel-only');
    fs.renameSync(folder, `${folder}-away`);
    try {
      // Panned well away and back, as in the finding: the frame goes, loads again, and the route refuses it.
      const { width } = (await page.locator('#stage').boundingBox())!;
      await panBy(page, -3 * width, 0);
      await expect(page.locator('vb-app-frame iframe')).toHaveCount(0);
      await page.keyboard.press('f');
      await expect(card.locator('.vb-app')).toHaveAttribute('data-app-state', 'missing');
      await expect(card.locator('.vb-app-head')).toHaveText('App panel-only not found');
      await expect(card.locator('vb-app-frame iframe')).toHaveCount(0);
      await expect(card).toHaveAttribute('aria-label', /, app not found$/);
      expect(await heightOf(card)).toBe(height);
      await expectNoAxeViolations(page);
      // Still gone: Check again says so.
      await card.getByRole('button', { name: 'Check again: Notice' }).click();
      await expect(page.locator('#toast')).toHaveText('Notice still not found.');
    } finally {
      fs.renameSync(`${folder}-away`, folder);
    }
    // Put back: Check again finds it, the panel comes back, and focus stays on the card.
    await card.getByRole('button', { name: 'Check again: Notice' }).click();
    await expect(page.locator('#toast')).toHaveText('Notice found');
    await expect(card.locator('vb-app-frame')).toHaveAttribute('data-state', 'ready');
    await expect(card).toBeFocused();
    expect(await heightOf(card)).toBe(height);
  });
});

test('a state change that takes the focused button away leaves focus on the card', async ({ page }) => {
  const { board, n: [n] } = await s.draw([CALCULATOR]);
  await s.act(board, { action: 'app-allow', app: 'calculator', hash: (await s.apps()).get('calculator')!.hash });
  await open(page, board, 1);
  const card = cardOf(page, n!);
  const stop = card.getByRole('button', { name: 'Stop app: Calculator' });
  await stop.focus();
  // The code changes, and the agent's next line about the app has the page read list_apps again.
  fs.appendFileSync(path.join(s.dir('calculator'), 'tools.mjs'), `\n// changed by the page test ${Date.now()}\n`);
  await s.write(board, [{ type: 'node', node: { region: 'tools', ...CALCULATOR, title: 'A second calculator' } }]);
  await expect(card.locator('.vb-app-ask-text')).toHaveText('Code changed. Allow it again?');
  await expect(stop).toBeHidden();
  await expect(card).toBeFocused();
});
