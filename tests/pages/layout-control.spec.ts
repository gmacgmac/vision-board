// The one layout control (layoutControl flag, node-overhaul FE_07, PLAN decision 20): a container shows one button naming the
// active layout, its popover offers every layout (pointer and keyboard) and, with flowDirection, a flow's Across, Down and Auto
// (the container's `direction` act; Auto gives back the agent's). Off, the six icons as before. Light and dark.
import type { APIRequestContext, Page } from '@playwright/test';
import { READ_ONLY_PERSON as REASON } from '#actions';
import { startFolderServer } from './folder-server.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { joinAgent, open, write } from './agent-board.ts';
import { card, head, idle, linesAfter, scale, zoomToFull } from './board-page.ts';

let boards = 0;
const THEMES: Theme[] = ['dark', 'light'];
const ON = '?vbwork&flags=layoutControl,flowDirection,flowBranches';
const LINKS = [[1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [6, 7], [7, 4]];

async function drawLine(request: APIRequestContext, mode: string, direction?: string) {
  const d = { agent: await joinAgent(request, 'Layout chat'), board: `lc-${Date.now()}-${(boards += 1)}` };
  const r = await write(request, d, [
    { type: 'board', title: 'Layouts' },
    { type: 'region', region: { id: 'line', title: 'Production line', mode, ...(direction && { direction }) } },
    ...[1, 2, 3, 4, 5, 6, 7].map((i) => ({ type: 'node', node: { region: 'line', kind: 'topic', title: `Step ${i}` } })),
  ]);
  const n = r.slice(2, 9).map((x) => x.n!);
  await write(request, d, LINKS.map(([a, b]) => ({ type: 'link', from: n[a! - 1], to: n[b! - 1] })));
  return { ...d, n };
}

const frame = (page: Page) => page.locator('vb-region[data-region="line"]');
const button = (page: Page) => frame(page).locator('.vb-layout-btn');
const pop = (page: Page) => frame(page).locator('.vb-mode-pop');
const tile = (page: Page, m: string) => frame(page).locator(`.vb-mtile[data-tile="${m}"]`);
const dir = (page: Page, d: string) => frame(page).locator(`.vb-dir[data-dir="${d}"]`);

/** The second card sits below the first (a flow running down) rather than beside it. */
async function runsDown(page: Page, n: number[]): Promise<boolean> {
  await idle(page);
  const [a, b] = await Promise.all([card(page, n[0]!).boundingBox(), card(page, n[1]!).boundingBox()]);
  return b!.y > a!.y && Math.abs(b!.x - a!.x) < 2;
}

test('off, six layout icons; on, exactly one button named for the layout, at every zoom', async ({ page, request }) => {
  const d = await drawLine(request, 'flow');
  await open(page, d, '?vbwork');
  await expect(frame(page).getByRole('radio')).toHaveCount(6);
  await expect(button(page)).toHaveCount(0);
  await open(page, d, ON);
  await expect(frame(page).getByRole('radio')).toHaveCount(0);
  await expect(button(page)).toHaveCount(1);
  await expect(button(page)).toHaveAccessibleName('Layout: Flow, across');
  await expect(button(page)).toHaveAttribute('aria-haspopup', 'menu');
  await expect(button(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(pop(page)).toBeHidden();
  const k = await scale(page);
  await zoomToFull(page);
  expect(await scale(page)).not.toBe(k);
  await expect(button(page)).toBeVisible();
});

test('a press opens the popover; a tile records one mode act and closes it; every mode can be chosen', async ({ page, request }) => {
  const d = await drawLine(request, 'flow');
  await open(page, d, ON);
  for (const m of ['grid', 'lanes', 'radial', 'column', 'row', 'flow']) {
    const before = await head(page);
    await button(page).click();
    await expect(pop(page)).toBeVisible();
    await expect(button(page)).toHaveAttribute('aria-expanded', 'true');
    await tile(page, m).click();
    await expect(pop(page)).toBeHidden();
    await expect(frame(page)).toHaveAttribute('data-mode', m);
    const acts = (await linesAfter(page, before)).filter((e) => e.action === 'mode');
    expect(acts.map((e) => [e.region, e.mode])).toEqual([['line', m]]);
    await expect(tile(page, m)).toHaveAttribute('aria-checked', 'true');
  }
});

test('a pointer resting on the button opens it after a moment, never at once', async ({ page, request }) => {
  const d = await drawLine(request, 'grid');
  await open(page, d, ON);
  await button(page).hover();
  await expect(pop(page)).toBeHidden();
  await expect(pop(page)).toBeVisible();
  await page.mouse.move(2, 900);
  await expect(pop(page)).toBeHidden();
});

test('keyboard: Down (Right in the rail) opens onto the current layout, arrows move, Enter chooses, Esc closes and returns focus', async ({ page, request }) => {
  const d = await drawLine(request, 'flow');
  await open(page, d, ON);
  await button(page).focus();
  await page.keyboard.press((await frame(page).getAttribute('data-rail')) === null ? 'ArrowDown' : 'ArrowRight'); // towards the popover
  await expect(pop(page)).toBeVisible();
  await expect(tile(page, 'flow')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(tile(page, 'grid')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(pop(page)).toBeHidden();
  await expect(button(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(tile(page, 'flow')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(frame(page)).toHaveAttribute('data-mode', 'lanes');
  await expect(pop(page)).toBeHidden();
  await expect(button(page)).toBeFocused();
  await expect(button(page)).toHaveAccessibleName('Layout: Lanes');
});

test('a flow\'s Down writes one direction act naming its container and redraws it down; Auto gives back the agent\'s', async ({ page, request }) => {
  const d = await drawLine(request, 'flow');
  await open(page, d, ON);
  expect(await runsDown(page, d.n), 'drawn across').toBe(false);
  await button(page).click();
  await expect(dir(page, 'across')).toHaveAttribute('aria-checked', 'true');
  const before = await head(page);
  await dir(page, 'down').click();
  await expect.poll(() => runsDown(page, d.n)).toBe(true);
  const acts = (await linesAfter(page, before)).filter((e) => e.action === 'direction');
  expect(acts.map((e) => [e.board, e.region, e.direction])).toEqual([[d.board, 'line', 'down']]);
  await expect(button(page)).toHaveAccessibleName('Layout: Flow, down');
  await button(page).click();
  await expect(dir(page, 'down')).toHaveAttribute('aria-checked', 'true');
  await dir(page, 'auto').click();
  await expect.poll(() => runsDown(page, d.n)).toBe(false);
  await expect(button(page)).toHaveAccessibleName('Layout: Flow, across');
});

test('Auto returns the agent\'s own direction; the direction row shows only on a flow and only with flowDirection', async ({ page, request }) => {
  const d = await drawLine(request, 'flow', 'down');
  await open(page, d, ON);
  expect(await runsDown(page, d.n)).toBe(true);
  await button(page).click();
  await dir(page, 'across').click();
  await expect.poll(() => runsDown(page, d.n)).toBe(false);
  await button(page).click();
  await dir(page, 'auto').click();
  await expect.poll(() => runsDown(page, d.n)).toBe(true);
  await button(page).click();
  await tile(page, 'grid').click();
  await button(page).click();
  await expect(frame(page).locator('.vb-dir-row')).toBeHidden();
  await open(page, d, '?vbwork&flags=layoutControl');
  await button(page).click();
  await expect(frame(page).locator('.vb-dir')).toHaveCount(0);
});

test('on a read-only ledger the choices say why they are off and a press writes nothing', async ({ page }) => {
  const srv = await startFolderServer({ ledgers: true, readOnly: true });
  try {
    await page.goto(`${srv.base}/?vbwork&flags=readOnlyStart,ledgerFolders,-readOnlyToggle,layoutControl,flowDirection`);
    await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
    await idle(page);
    const f = page.locator('vb-region').first();
    await f.locator('.vb-layout-btn').click();
    const tiles = f.locator('.vb-mtile');
    await expect(tiles.first()).toHaveAttribute('aria-disabled', 'true');
    await expect(tiles.first()).toHaveAttribute('title', REASON);
    const before = await head(page, srv.base);
    await tiles.nth(1).click({ force: true });
    await idle(page);
    expect(await head(page, srv.base)).toBe(before);
  } finally { await srv.close(); }
});

for (const theme of THEMES) {
  test(`the open control passes axe and is seen (${theme})`, async ({ page, request }) => {
    const d = await drawLine(request, 'flow');
    await setTheme(page, theme);
    await open(page, d, ON);
      await button(page).click();
    await expect(dir(page, 'across')).toBeVisible();
    await expectNoAxeViolations(page, ['target-size']); // the cards' own marks at this zoom are the board's, not this control's
    await page.screenshot({ path: `temp/fe07/board-${theme}.png` });
  });

  test(`the gallery entry draws the control and the six layouts side by side (${theme}); off, no entry`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(page.locator('[data-feature="layoutControl"]')).toHaveCount(0);
    await page.goto('/gallery.html?flags=layoutControl,flowDirection,flowBranches');
    const section = page.locator('[data-feature="layoutControl"]');
    await expect(section.locator('.g-mini')).toHaveCount(9);
    await expect(section.locator('.vb-layout-btn')).toHaveCount(3);
    await section.scrollIntoViewIfNeeded();
    await expectNoAxeViolations(page, ['target-size']); // the comparison draws the cards at 60%, where their own marks are small
    await section.screenshot({ path: `temp/fe07/gallery-${theme}.png` });
  });
}
