// App cards on the board, end to end (app-cards FE_02, D-047; PLAN.md § Goal state line 3): on a
// temp project holding a copy of the example calculator (app-server.ts), an agent draws an app
// card, the panel shows at the agent's size in a sandboxed frame, its tools are refused until the
// person presses Allow, then `12*3=` typed in the panel comes back as 36 from the plugin's
// `evaluate` (the server call is counted) and History lists it; light and dark, axe on the board
// and in the panel, no console error and no failed request (the one refusal before Allow is named).
// Then the keyboard (Tab into the panel and out, Esc back to the card), a change to the app's code
// ("Code changed", Allow again) and the appCards flag off on the server and the page.
import fs from 'node:fs';
import path from 'node:path';
import type { Frame, Locator, Page } from '@playwright/test';
import { tabTo } from './agent-board.ts';
import type { AppServer } from './app-server.ts';
import { CALCULATOR, startAppServer } from './app-server.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['light', 'dark'];
/** The one refusal the end-to-end run makes on purpose: `=` before Allow (needs-approval, 403). */
const BEFORE_ALLOW = [/^response 403: POST http:\/\/127\.0\.0\.1:\d+\/api\/apps\/calculator\/calls$/, /status of 403 \(Forbidden\)/];

let s: AppServer;
test.beforeAll(async () => { s = await startAppServer(); });
test.afterAll(async () => { await s.close(); });

async function open(page: Page, board: string, count: number, query = ''): Promise<void> {
  await page.goto(`${s.base}/${query}#${board}`);
  await expect(page.locator('vb-node')).toHaveCount(count);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
}

/** The calculator not allowed, whatever an earlier test did (an allow is on the app, not a board). */
async function notAllowed(board: string): Promise<void> {
  if ((await s.apps()).get('calculator')?.allowed) await s.act(board, { action: 'app-revoke', app: 'calculator' });
}

const cardOf = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);
/** A card's panel, once its frame is ready. */
async function panelOf(card: Locator): Promise<Frame> {
  await expect(card.locator('vb-app-frame')).toHaveAttribute('data-state', 'ready');
  return (await (await card.locator('vb-app-frame iframe').elementHandle())!.contentFrame())!;
}

/** Allow in the card, then the confirm, as the person does. */
async function allow(page: Page, card: Locator, heading = 'Allow Calculator to run?'): Promise<void> {
  await card.getByRole('button', { name: 'Allow app: Calculator' }).click();
  const dialog = page.getByRole('dialog', { name: heading });
  await expect(dialog).toContainText('can\'t change your files');
  await dialog.getByRole('button', { name: 'Allow', exact: true }).click();
  await expect(card.locator('.vb-app-ask')).toBeHidden();
  await expect(card).toBeFocused();
}

for (const theme of THEMES) {
  test.describe(`end to end (${theme})`, () => {
    test.use({ expected: { problems: BEFORE_ALLOW } });

    test(`end to end: an agent draws the calculator, the person allows it, 12*3 comes back as 36 from its tool (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      const { board, n: [n] } = await s.draw([CALCULATOR]);
      await notAllowed(board);
      const calls: string[] = [];
      page.on('request', (r) => { if (r.method() === 'POST' && r.url() === `${s.base}/api/apps/calculator/calls`) calls.push(r.postData() ?? ''); });
      await open(page, board, 1);
      const card = cardOf(page, n!);
      // The panel, at the size the agent drew, in a frame that runs scripts and nothing else.
      const panel = await panelOf(card);
      const iframe = card.locator('vb-app-frame iframe');
      await expect(iframe).toHaveAttribute('sandbox', 'allow-scripts');
      await expect(iframe).toHaveAttribute('title', 'Calculator');
      expect(await iframe.evaluate((f: HTMLIFrameElement) => [f.offsetWidth, f.offsetHeight])).toEqual([360, 440]);
      // The card is as wide as its panel plus its padding: no size word, no size control.
      await expect(card).not.toHaveAttribute('data-size');
      await expect(card.locator('.vb-size')).toHaveCount(0);
      expect(await card.evaluate((c: HTMLElement) => c.offsetWidth - 360)).toBeLessThan(60);
      await expect.poll(() => panel.evaluate(() => document.documentElement.style.colorScheme)).toBe(theme);
      // Needs approval: the card asks, and the board refuses the panel's tools until Allow.
      await expect(card.locator('.vb-app-ask-text')).toHaveText('Allow this app to run?');
      await expect(card).toHaveAttribute('aria-label', /, not allowed yet$/);
      await card.focus();
      await tabTo(page, iframe);
      await page.keyboard.type('12*3=');
      await expect(panel.locator('#result')).toHaveText('Problem: Press Allow on the card to calculate');
      expect(calls).toHaveLength(1);
      await allow(page, card);
      await expect(page.locator('#toast')).toHaveText('Calculator allowed');
      await expect(card.getByRole('button', { name: 'Stop app: Calculator' })).toBeVisible();
      // Allowed: the same keys, and the plugin works the sum out.
      await tabTo(page, iframe);
      await page.keyboard.type('c12*3=');
      await expect(panel.locator('#result')).toHaveText('Answer: 36');
      expect(calls).toHaveLength(2);
      expect(JSON.parse(calls[1]!)).toEqual({ tool: 'evaluate', arguments: { expression: '12×3' } });
      await panel.getByRole('button', { name: 'History' }).click();
      await expect(panel.getByRole('button', { name: 'Use 36 from 12×3' })).toBeVisible();
      expect(JSON.parse(calls[2]!)).toEqual({ tool: 'history', arguments: {} });
      await expectNoAxeViolations(page);
      await expectNoAxeViolations(panel);
    });
  });
}

test('the keyboard: Tab goes from the card into the panel and on out of it; Esc in the panel puts focus back on the card', async ({ page }) => {
  const { board, n: [n] } = await s.draw([CALCULATOR]);
  await open(page, board, 1);
  const card = cardOf(page, n!);
  const panel = await panelOf(card);
  const iframe = card.locator('vb-app-frame iframe');
  await card.focus();
  await tabTo(page, iframe);
  // In the panel: its first control, with the frame's ring saying keys now go to the app.
  await expect(panel.getByRole('button', { name: 'History' })).toBeFocused();
  await expect(card.locator('vb-app-frame')).toHaveAttribute('data-focus-in', '');
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  await expect(card.locator('vb-app-frame')).not.toHaveAttribute('data-focus-in');
  // Out the other side: past every key in the panel to the card's own buttons.
  await tabTo(page, iframe);
  await tabTo(page, card.locator('button[data-act="comment"]'), 40);
  expect(await panel.evaluate(() => document.hasFocus())).toBe(false);
});

test.describe('a change to the app\'s code', () => {
  test.use({ expected: { problems: BEFORE_ALLOW } });

  test('editing tools.mjs asks again: "Code changed", Allow again, and the tool runs', async ({ page }) => {
    const { board, n: [n] } = await s.draw([CALCULATOR]);
    await notAllowed(board);
    await open(page, board, 1);
    const card = cardOf(page, n!);
    const panel = await panelOf(card);
    await allow(page, card);
    // The agent changes its tools: the next call is refused, and the card asks again.
    fs.appendFileSync(path.join(s.dir('calculator'), 'tools.mjs'), `\n// changed by the page test ${Date.now()}\n`);
    await panel.getByRole('button', { name: 'Equals' }).click();
    await expect(panel.locator('#result')).toHaveText('Problem: Press Allow on the card to calculate');
    await expect(card.locator('.vb-app-ask-text')).toHaveText('Code changed. Allow it again?');
    await expect(card).toHaveAttribute('aria-label', /, code changed, not allowed yet$/);
    await expect(card.getByRole('button', { name: 'Stop app: Calculator' })).toBeHidden();
    await expectNoAxeViolations(page);
    await allow(page, card, 'Allow Calculator again?');
    for (const key of ['7', 'Times', '6', 'Equals']) await panel.getByRole('button', { name: key, exact: true }).click();
    await expect(panel.locator('#result')).toHaveText('Answer: 42');
  });
});

test('Stop app asks first, then the tools stop until the person allows them again', async ({ page }) => {
  const { board, n: [n] } = await s.draw([CALCULATOR]);
  await notAllowed(board);
  await open(page, board, 1);
  const card = cardOf(page, n!);
  await panelOf(card);
  await allow(page, card);
  await card.getByRole('button', { name: 'Stop app: Calculator' }).click();
  const dialog = page.getByRole('dialog', { name: 'Stop Calculator?' });
  await dialog.getByRole('button', { name: 'Stop app' }).click();
  await expect(page.locator('#toast')).toHaveText('Calculator stopped');
  await expect(card.locator('.vb-app-ask-text')).toHaveText('Allow this app to run?');
  await expect(card).toBeFocused();
  expect((await s.apps()).get('calculator')!.allowed).toBe(false);
});

// Ruling 13: off on the server (VB_FLAGS=-appCards) and on the page (?flags=-appCards).
for (const theme of THEMES) {
  test(`with app cards off, an app card is a plain card that says so, and nothing loads (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    const off = await startAppServer({ flags: '-appCards' });
    try {
      const { board, n: [n] } = await off.draw([CALCULATOR]);
      const asked: string[] = [];
      page.on('request', (r) => { if (/\/api\/apps|\/app-panels\//.test(r.url())) asked.push(r.url()); });
      await page.goto(`${off.base}/?flags=-appCards#${board}`);
      const card = cardOf(page, n!);
      await expect(card.locator('.vb-node-body')).toHaveText('App cards are off.');
      await expect(card.locator('vb-app-frame, .vb-app-ask, .vb-app-stop')).toHaveCount(0);
      await expect(card).toHaveAttribute('aria-label', `Item ${n}, App: Calculator`);
      await expectNoAxeViolations(page);
      expect(asked).toEqual([]);
      // The server's side: no panel, and no tool call.
      expect((await fetch(`${off.base}/app-panels/calculator`)).status).toBe(404);
      expect(await off.call('calculator', 'evaluate', { expression: '1+1' })).toBe(404);
    } finally {
      await off.close();
    }
  });
}
