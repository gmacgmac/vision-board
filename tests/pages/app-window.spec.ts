// The app window (D-099 5; appWindow flag, FE_08; design/mockups/node-states/default-app-* and command-lens-app-*), with
// ?flags=nodeEdges,skins,appWindow,appStage: an app node is one title bar (number, name, Allow or "Allowed ▾", the
// drawer arrow, Open) and the app under it, no footer and no notes under the app; the drawer docks the node's
// conversation on its right and pushes its neighbours aside, and never reloads the panel; Open puts the whole window on
// the page, focus held inside until Back or Esc and given back to the node; the panel's note and the agent's reply show
// in the drawer's thread. The example mission-control app (the skill's one source) runs in it. Light and dark, axe on
// each. A panel stuck in a loop: app-window-stuck.spec.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import type { AppServer } from './app-server.ts';
import { startAppServer } from './app-server.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const MISSION = fileURLToPath(new URL('../../skills/vision-board/examples/apps/mission-control', import.meta.url));
const FLAGS = 'nodeEdges,skins,appWindow,appStage,-appFit';
const THEMES: Theme[] = ['light', 'dark'];

let s: AppServer;
let n: number[] = [];
let boards = 0;

test.beforeAll(async () => {
  s = await startAppServer();
  fs.cpSync(MISSION, s.dir('mission-control'), { recursive: true });
});
test.afterAll(async () => { await s.close(); });

/** A board of its own: a row holding the window, then a neighbour on its right. */
async function draw(skin?: string): Promise<string> {
  const board = `window-${(boards += 1)}`;
  const r = await s.write(board, [
    { type: 'board', title: 'Mission control', ...(skin && { skin }) }, { type: 'region', region: { id: 'live', title: 'Live', mode: 'row' } },
    { type: 'node', node: { region: 'live', kind: 'app', title: 'Mission control', app: { id: 'mission-control', w: 560, h: 300 } } },
    { type: 'node', node: { region: 'live', kind: 'topic', title: 'Run of show', body: 'Kick-off 20:00.' } },
  ]);
  n = r.slice(2).map((x) => x.n!);
  return board;
}

const win = (page: Page) => page.locator('vb-node[data-window]');
const neighbour = (page: Page) => page.locator(`vb-node[data-id="${n[1]}"]`);
const arrow = (page: Page) => win(page).locator('[data-drawer]');
const drawer = (page: Page) => win(page).locator('.vb-win-drawer-pane');
const panel = (page: Page) => page.frameLocator('vb-node[data-window] vb-app-frame iframe');

async function open(page: Page, board: string): Promise<void> {
  await page.goto(`${s.base}/?flags=${FLAGS}#${board}`);
  await expect(win(page).locator('vb-app-frame')).toHaveAttribute('data-state', 'ready');
  await expect(panel(page).locator('.feed').first()).toBeVisible();
}

/** Mark the panel's document, to show later that it never reloaded. */
const markPanel = async (page: Page) => {
  const f = page.frames().find((x) => x.url().includes('/app-panels/'))!;
  await f.evaluate(() => { (window as unknown as { kept: number }).kept = 7; });
  return async () => f.evaluate(() => (window as unknown as { kept?: number }).kept);
};

for (const [skin, theme] of [[undefined, 'light'], [undefined, 'dark'], ['command-lens', 'light'], ['command-lens', 'dark']] as const) {
  test(`the window: a title bar and the app, nothing else of the board's (${skin ?? 'default'}, ${theme})`, async ({ page }) => {
    await setTheme(page, theme as Theme);
    await open(page, await draw(skin));
    const bar = win(page).locator('.vb-win-bar');
    await expect(bar.locator('[data-mark="number"]')).toHaveAccessibleName(`Bookmark item ${n[0]} (B)`);
    await expect(bar.locator('.vb-win-name')).toContainText('Live event mission control');
    await expect(arrow(page)).toHaveAccessibleName(`No notes on item ${n[0]} (C). Show conversation`);
    await expect(arrow(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(bar.locator('[data-app-act="stage"]')).toHaveAccessibleName('Open Live event mission control');
    for (const gone of ['.vb-node-foot', '.vb-node-kind', '[data-mark="notes"]', '[data-mark="answer"]', '.vb-mark-switch']) await expect(win(page).locator(gone)).toHaveCount(0);
    await expectNoAxeViolations(page);
  });
}

test('the drawer pushes the neighbours aside and back, never reloads the panel, and stays open through a redraw', async ({ page }) => {
  const board = await draw();
  await open(page, board);
  const kept = await markPanel(page);
  const [w0, x0] = [(await win(page).boundingBox())!.width, (await neighbour(page).boundingBox())!.x];
  await arrow(page).click();
  await expect(arrow(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(drawer(page)).toBeVisible();
  await expect(drawer(page).locator('textarea')).toBeFocused();
  const grew = (await win(page).boundingBox())!.width - w0;
  expect(grew).toBeGreaterThan(200);
  await expect.poll(async () => (await neighbour(page).boundingBox())!.x - x0).toBeGreaterThan(grew - 2);
  expect(await kept()).toBe(7);
  // An agent's write draws the board again: the drawer stays open, the panel loaded.
  await s.write(board, [{ type: 'node', node: { region: 'live', kind: 'topic', title: 'Later item' } }]);
  await expect(page.locator('vb-node')).toHaveCount(3);
  await expect(drawer(page)).toBeVisible();
  await arrow(page).click();
  await expect(drawer(page)).toBeHidden();
  await expect.poll(async () => Math.round((await neighbour(page).boundingBox())!.x - x0)).toBe(0);
  expect(await kept()).toBe(7);
});

test('the drawer is the node\'s conversation: Add note, the agent\'s reply, and the panel\'s own note, in one thread', async ({ page }) => {
  const board = await draw();
  await open(page, board);
  await page.keyboard.press('Escape');
  await win(page).focus();
  await page.keyboard.press('c'); // C on the window shows its drawer
  const field = drawer(page).locator('textarea');
  await expect(field).toBeFocused();
  await field.fill('Why is CAM-3 above 2%?');
  await page.keyboard.press('Enter');
  await expect(drawer(page).locator('.vb-nb-thread')).toContainText('Why is CAM-3 above 2%?');
  await expect(arrow(page).locator('.vb-mark-text')).toHaveText('1');
  await s.write(board, [{ type: 'reply', n: n[0], text: 'Two bursts since 21:02.' }]);
  await expect(drawer(page).locator('.vb-nb-thread')).toContainText('Two bursts since 21:02.');
  await expect(panel(page).locator('#replies')).toContainText('Two bursts since 21:02.'); // the spike's channel, kept
  // A pick raised in the panel is the person's note too.
  await win(page).locator('[data-app-act="stage"]').click();
  await panel(page).locator('.feed').nth(2).click();
  await panel(page).locator('#raise').click();
  await page.keyboard.press('Escape');
  await expect(drawer(page).locator('.vb-nb-thread')).toContainText('From mission control.');
});

test('Open: the whole window fills the page, focus is held inside until Esc, and goes back to the node', async ({ page }) => {
  await open(page, await draw());
  const kept = await markPanel(page);
  await arrow(page).click();
  const openBtn = win(page).locator('[data-app-act="stage"]');
  await openBtn.click();
  await expect(win(page)).toHaveAttribute('data-stage', '');
  await expect(openBtn).toHaveAttribute('aria-pressed', 'true');
  const box = (await win(page).boundingBox())!;
  const view = page.viewportSize()!;
  expect(box.width).toBeGreaterThan(view.width - 40);
  await expect(drawer(page)).toBeVisible(); // the drawer comes along
  for (let i = 0; i < 16; i += 1) {
    await page.keyboard.press(i % 5 === 4 ? 'Shift+Tab' : 'Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('vb-node[data-stage]')), `Tab ${i}`).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(win(page)).not.toHaveAttribute('data-stage', '');
  await expect(win(page)).toBeFocused();
  await expect(openBtn).toHaveAttribute('aria-pressed', 'false');
  expect(await kept()).toBe(7);
  // Open again, then Open as Back.
  await openBtn.click();
  await expect(win(page)).toHaveAttribute('data-stage', '');
  await openBtn.click();
  await expect(win(page)).not.toHaveAttribute('data-stage', '');
});

test('no Save for later on an app window: not in the number\'s menu, not in the right-click list', async ({ page }) => {
  await open(page, await draw());
  await win(page).locator('.vb-win-name').click({ button: 'right' });
  const menu = page.locator('.vb-mark-menu');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /Save for later/ })).toHaveCount(0);
  await expect(menu.getByRole('menuitem', { name: /Bookmark/ })).toHaveCount(1);
});
