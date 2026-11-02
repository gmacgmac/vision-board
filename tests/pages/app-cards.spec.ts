// App cards on the board, end to end (app-cards FE_02, D-047; PLAN.md § Goal state line 3): on a
// temp project holding a copy of the example calculator (app-server.ts), an agent draws an app
// card, the panel shows at the agent's size in a sandboxed frame, its tools are refused until the
// person presses Allow, then `12*3=` typed in the panel comes back as 36 from the plugin's
// `evaluate` (the server call is counted) and History lists it; light and dark, axe on the board
// and in the panel, no console error and no failed request (the one refusal before Allow is named).
// Then the keyboard (Tab into the panel and out, Esc back to the card), a change to the app's code
// ("Code changed", Allow again) and the appCards flag off on the server and the page. Allow, and
// "Allowed ▾" with its one item Stop app, are in the card's footer (card-polish FE_01): the person
// can stop an app and allow it again; the panel runs edge to edge inside the border; Z on the one
// app card fills 95% of the stage.
import fs from 'node:fs';
import path from 'node:path';
import type { Frame, Locator, Page } from '@playwright/test';
import { tabTo } from './agent-board.ts';
import type { AppServer } from './app-server.ts';
import { CALCULATOR, startAppServer } from './app-server.ts';
import { expect, expectNoAxeViolations, setTheme, test, bid } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { card as cardOf, control, panelOf } from './board-page.ts';

const THEMES: Theme[] = ['light', 'dark'];
/** The one refusal the end-to-end run makes on purpose: `=` before Allow (needs-approval, 403). */
const BEFORE_ALLOW = [/^response 403: POST http:\/\/127\.0\.0\.1:\d+\/api\/apps\/calculator\/calls$/, /status of 403 \(Forbidden\)/];

let s: AppServer;
test.beforeAll(async () => { s = await startAppServer(); });
test.afterAll(async () => { await s.close(); });

async function open(page: Page, board: string, count: number, query = ''): Promise<void> {
  await page.goto(`${s.base}/${query}#${board}`);
  await expect(page.locator('vb-node')).toHaveCount(count);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
}

/** The calculator not allowed, whatever an earlier test did (an allow is on the app, not a board). */
async function notAllowed(board: string): Promise<void> {
  if ((await s.apps()).get('calculator')?.allowed) await s.act(board, { action: 'app-revoke', app: 'calculator' });
}

/** Allow in the card, then the confirm, as the person does. */
async function allow(page: Page, card: Locator, heading = 'Allow Calculator to run?'): Promise<void> {
  await card.getByRole('button', { name: 'Allow app: Calculator' }).click();
  const dialog = page.getByRole('dialog', { name: heading });
  await expect(dialog).toContainText('can\'t change your files');
  await dialog.getByRole('button', { name: 'Allow', exact: true }).click();
  await expect(card.getByRole('button', { name: 'Allow app: Calculator' })).toBeHidden();
  await expect(card).toBeFocused();
}

/** "Allowed ▾" in the footer, its menu's Stop app, then the confirm, as the person does. */
async function stopApp(page: Page, card: Locator): Promise<void> {
  await card.getByRole('button', { name: 'App allowed: Calculator' }).click();
  await expect(card.getByRole('button', { name: 'App allowed: Calculator' })).toHaveAttribute('aria-expanded', 'true');
  const item = card.getByRole('menuitem', { name: 'Stop app: Calculator' });
  await expect(item).toBeFocused();
  await item.click();
  await page.getByRole('dialog', { name: 'Stop Calculator?' }).getByRole('button', { name: 'Stop app' }).click();
  await expect(page.locator('#toast')).toHaveText('Calculator stopped');
  await expect(card.getByRole('button', { name: 'App allowed: Calculator' })).toBeHidden();
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
      // The card is as wide as its panel plus its border: no size word, no size control; the panel's
      // edges meet the border's on both sides (within 1px).
      await expect(card).not.toHaveAttribute('data-size');
      await expect(card.locator('.vb-size')).toHaveCount(0);
      expect(await card.evaluate((c: HTMLElement) => c.offsetWidth)).toBe(362);
      const [c, f] = await Promise.all([card.boundingBox(), card.locator('vb-app-frame').boundingBox()]);
      expect(Math.abs(f!.x - (c!.x + 1))).toBeLessThanOrEqual(1);
      expect(Math.abs(f!.x + f!.width - (c!.x + c!.width - 1))).toBeLessThanOrEqual(1);
      await expect.poll(() => panel.evaluate(() => document.documentElement.style.colorScheme)).toBe(theme);
      // Needs approval: Allow in the footer, why as its tip and in its name, and the board refuses the
      // panel's tools until Allow. No row over the panel.
      await expect(control(card)).toHaveText('Allow');
      await expect(control(card)).toHaveAttribute('title', 'Not allowed yet');
      await expect(control(card)).toHaveAccessibleName('Allow app: Calculator. Not allowed yet');
      await expect(card.locator('.vb-app-ask')).toHaveCount(0);
      await expect(card).not.toContainText('Nothing to allow');
      await expect(card).toHaveAttribute('aria-label', /, not allowed yet$/);
      await card.focus();
      await tabTo(page, iframe);
      await page.keyboard.type('12*3=');
      await expect(panel.locator('#result')).toHaveText('Problem: Press Allow on the card to calculate');
      expect(calls).toHaveLength(1);
      await allow(page, card);
      await expect(page.locator('#toast')).toHaveText('Calculator allowed');
      await expect(control(card)).toHaveText('Allowed▾');
      await expect(control(card)).toHaveAccessibleName('App allowed: Calculator');
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

/** The frame's box-shadow as drawn: the focus ring is `0 0 0 <focus width> <focus colour>`. */
const ringOf = (frame: Locator) => frame.evaluate((e) => getComputedStyle(e).boxShadow);
const RING = / 0px 0px 0px \d+px$/;

test('the panel\'s focus ring (card-polish FIX_01): a click inside the app draws none; Tab into it does, and again after a click', async ({ page }) => {
  const { board, n: [n] } = await s.draw([CALCULATOR]);
  await open(page, board, 1);
  const card = cardOf(page, n!);
  const panel = await panelOf(card);
  const frame = card.locator('vb-app-frame');
  const iframe = frame.locator('iframe');
  const idle = await ringOf(frame);
  expect(idle).not.toMatch(RING);
  // A click inside the app (below the top border's tabs, which draw over the panel's top, card-polish FE_04): it has focus, and the frame draws no ring (as a clicked card draws none).
  await panel.locator('body').click({ position: { x: 3, y: 30 } });
  await expect(iframe).toBeFocused();
  expect(await ringOf(frame)).toBe(idle);
  // Out to the card's controls, and Tab back in: keys moved focus, so the ring shows (WCAG 2.4.7).
  await tabTo(page, card.locator('button[data-act="comment"]'), 40);
  await expect(iframe).not.toBeFocused();
  await card.focus();
  await tabTo(page, iframe);
  await expect(frame).toHaveAttribute('data-focus-in', '');
  expect(await ringOf(frame)).toMatch(RING);
  // Esc puts focus back on the card: no ring.
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  expect(await ringOf(frame)).toBe(idle);
  // Back in by a click after keys were used: no ring.
  await panel.locator('body').click({ position: { x: 3, y: 30 } });
  await expect(iframe).toBeFocused();
  expect(await ringOf(frame)).toBe(idle);
});

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
    await expect(control(card)).toHaveAttribute('title', 'Code changed');
    await expect(control(card)).toHaveAccessibleName('Allow app: Calculator. Code changed');
    await expect(card).toHaveAttribute('aria-label', /, code changed, not allowed yet$/);
    await expect(card.getByRole('button', { name: 'App allowed: Calculator' })).toBeHidden();
    await expectNoAxeViolations(page);
    await allow(page, card, 'Allow Calculator again?');
    for (const key of ['7', 'Times', '6', 'Equals']) await panel.getByRole('button', { name: key, exact: true }).click();
    await expect(panel.locator('#result')).toHaveText('Answer: 42');
  });
});

test('Stop app (in "Allowed ▾"\'s menu) asks first, then the tools stop until the person allows them again, and Allow works again', async ({ page }) => {
  const { board, n: [n] } = await s.draw([CALCULATOR]);
  await notAllowed(board);
  await open(page, board, 1);
  const card = cardOf(page, n!);
  await panelOf(card);
  await allow(page, card);
  // The menu: the board's menu keys, Esc gives focus back to its button.
  const opener = card.getByRole('button', { name: 'App allowed: Calculator' });
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(card.getByRole('menu')).toBeVisible();
  await expect(card.getByRole('menuitem', { name: 'Stop app: Calculator' })).toBeFocused();
  await expectNoAxeViolations(page);
  await page.keyboard.press('Escape');
  await expect(card.getByRole('menu')).toBeHidden();
  await expect(opener).toBeFocused();
  await expect(opener).toHaveAttribute('aria-expanded', 'false');
  await stopApp(page, card);
  await expect(control(card)).toHaveText('Allow');
  await expect(card).toBeFocused();
  expect((await s.apps()).get('calculator')!.allowed).toBe(false);
  // The person changes their mind again: Allow, and the app is allowed.
  await allow(page, card);
  await expect(control(card)).toHaveText('Allowed▾');
  expect((await s.apps()).get('calculator')!.allowed).toBe(true);
});

test('Z on the one app card fills 95% of the stage on its binding side (±1%), centred; on two cards, 75%', async ({ page }) => {
  const { board, n: [n, q] } = await s.draw([CALCULATOR, { kind: 'question', title: 'Is the calculator right?' }]);
  await open(page, board, 2);
  const card = cardOf(page, n!);
  await panelOf(card);
  const fill = async (ids: number[]) => {
    const stage = (await page.locator(bid('stage')).boundingBox())!;
    const boxes = await Promise.all(ids.map(async (id) => (await cardOf(page, id).boundingBox())!));
    const [x, y] = [Math.min(...boxes.map((b) => b.x)), Math.min(...boxes.map((b) => b.y))];
    const [r, b] = [Math.max(...boxes.map((v) => v.x + v.width)), Math.max(...boxes.map((v) => v.y + v.height))];
    return { fill: Math.max((r - x) / stage.width, (b - y) / stage.height), dx: (x + r) / 2 - (stage.x + stage.width / 2), dy: (y + b) / 2 - (stage.y + stage.height / 2) };
  };
  await card.locator('.vb-app-name-text').click({ position: { x: 4, y: 4 } });
  await page.keyboard.press('z');
  await expect.poll(async () => (await fill([n!])).fill).toBeGreaterThan(0.94);
  const one = await fill([n!]);
  expect(Math.abs(one.fill - 0.95)).toBeLessThanOrEqual(0.01);
  expect(Math.abs(one.dx)).toBeLessThan(2);
  expect(Math.abs(one.dy)).toBeLessThan(2);
  // Two cards, one of them an app: the selection's 75%, as before.
  await page.keyboard.press('f');
  await cardOf(page, q!).locator('.vb-node-title').click({ modifiers: ['Shift'], position: { x: 4, y: 4 } });
  await page.keyboard.press('z');
  await expect.poll(async () => (await fill([n!, q!])).fill).toBeLessThan(0.8);
  expect(Math.abs((await fill([n!, q!])).fill - 0.75)).toBeLessThanOrEqual(0.01);
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
      await expect(card.locator('vb-app-frame, .vb-app-status, [data-app-act]')).toHaveCount(0);
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
