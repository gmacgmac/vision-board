// Flow branching and direction on the page (BE_01; flowDirection and flowBranches flags, D-100 5, PLAN decisions 19
// and 25). The header's Flows menu sets the person's board-wide direction with one `direction` act naming no
// container (Auto clears it) and the board redraws in place; a flow the agent drew down draws down until the person's
// Across, and Auto gives it back; a row whose links branch draws as rows with flowBranches; with nodeEdges the gap
// under a node leaves room for its marks. Off, no Flows menu and nothing moves. Axe in light and dark.
import type { APIRequestContext, Page } from '@playwright/test';
import { READ_ONLY_PERSON as REASON } from '#actions';
import { startFolderServer } from './folder-server.ts';
import { bid, expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { joinAgent, open, write } from './agent-board.ts';
import { card, head, idle, linesAfter, scale, zoomToFull } from './board-page.ts';

let boards = 0;
const THEMES: Theme[] = ['dark', 'light'];
const LINKS = [[1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [6, 7], [7, 4]];

/** A board with the maintainer's example in container `line` (`mode`, the agent's `direction` if given): seven
 *  cards, 1>2>3>4 and a branch 2>5>6>7 rejoining 4. `n` is the cards' board numbers in that order. */
async function drawLine(request: APIRequestContext, mode: string, direction?: string) {
  const d = { agent: await joinAgent(request, 'Line chat'), board: `line-${Date.now()}-${(boards += 1)}` };
  const r = await write(request, d, [
    { type: 'board', title: 'Line' },
    { type: 'region', region: { id: 'line', title: 'From idea to production line', mode, ...(direction && { direction }) } },
    ...[1, 2, 3, 4, 5, 6, 7].map((i) => ({ type: 'node', node: { region: 'line', kind: 'topic', title: `Step ${i}` } })),
  ]);
  const n = r.slice(2, 9).map((x) => x.n!);
  await write(request, d, LINKS.map(([a, b]) => ({ type: 'link', from: n[a! - 1], to: n[b! - 1] })));
  return { ...d, n };
}

/** Each card's top-left on the board (world px), by its place in the example (1 to 7). */
async function places(page: Page, n: number[]): Promise<{ x: number; y: number }[]> {
  await idle(page);
  const k = await scale(page);
  const at = await Promise.all(n.map(async (id) => (await card(page, id).boundingBox())!));
  return at.map((b) => ({ x: Math.round((b.x - at[0]!.x) / k), y: Math.round((b.y - at[0]!.y) / k) }));
}
const runsDown = (p: { x: number; y: number }[]) => p[1]!.y > p[0]!.y && p[1]!.x === p[0]!.x;
const flowButton = (page: Page) => page.locator(bid('flow-menu'));
const rows = (page: Page) => page.getByRole('menu', { name: 'Flows' }).getByRole('menuitemradio');

test('off, no Flows menu; on, Across, Down and Auto with Auto ticked; a choice writes one direction act for the board and redraws in place', async ({ page, request }) => {
  const d = await drawLine(request, 'flow', 'down');
  await open(page, d, '?vbwork');
  await expect(flowButton(page)).toHaveCount(0);
  await open(page, d, '?vbwork&flags=flowDirection');
  expect(runsDown(await places(page, d.n)), 'the agent drew it down').toBe(true);
  await flowButton(page).click();
  await expect(rows(page)).toHaveText([/Flows across/, /Flows down/, /Flows: Auto/]);
  await expect(rows(page).nth(2)).toHaveAttribute('aria-checked', 'true');
  const before = await head(page);
  await rows(page).first().click();
  await expect.poll(async () => runsDown(await places(page, d.n))).toBe(false);
  const lines = (await linesAfter(page, before)).filter((e) => e.action === 'direction');
  expect(lines.map((e) => [e.board, e.region, e.direction])).toEqual([[d.board, undefined, 'across']]);
  await flowButton(page).click();
  await expect(rows(page).first()).toHaveAttribute('aria-checked', 'true');
  await rows(page).nth(2).click();
  await expect.poll(async () => runsDown(await places(page, d.n)), 'Auto gives back the agent\'s').toBe(true);
  // Another page reading the same ledger draws the same.
  const other = await page.context().newPage();
  await open(other, d, '?vbwork&flags=flowDirection', 7);
  expect(await places(other, d.n)).toEqual(await places(page, d.n));
  await other.close();
});

test('with flowBranches a row whose links branch draws the main line on one row and the branch on its own; off, one line', async ({ page, request }) => {
  const d = await drawLine(request, 'row');
  await open(page, d, '?vbwork');
  expect(new Set((await places(page, d.n)).map((p) => p.y)).size, 'off: one line in card order').toBe(1);
  await open(page, d, '?vbwork&flags=flowBranches');
  const p = await places(page, d.n);
  expect(new Set([0, 1, 2, 3].map((i) => p[i]!.y)).size, 'the main line').toBe(1);
  expect(new Set([4, 5, 6].map((i) => p[i]!.y)).size, 'the branch').toBe(1);
  expect(p[4]!.y).toBeGreaterThan(p[0]!.y);
});

test('with nodeEdges the gap under a node clears its marks (40px); off, as before', async ({ page, request }) => {
  const d = await drawLine(request, 'column');
  const gap = async () => {
    const k = await scale(page);
    const [a, b] = await Promise.all([card(page, d.n[0]!).boundingBox(), card(page, d.n[1]!).boundingBox()]);
    return Math.round((b!.y - (a!.y + a!.height)) / k);
  };
  await open(page, d, '?vbwork&flags=-updateSignals');
  expect(await gap()).toBe(24);
  await open(page, d, '?vbwork&flags=-updateSignals,nodeEdges');
  expect(await gap()).toBe(40);
});

for (const theme of THEMES) {
  test(`the Flows menu passes axe (${theme})`, async ({ page, request }) => {
    const d = await drawLine(request, 'flow');
    await setTheme(page, theme);
    await open(page, d, '?vbwork&flags=flowDirection');
    await zoomToFull(page); // the cards' own controls at their full size, as the board's other axe checks
    await flowButton(page).click();
    await expect(rows(page)).toHaveCount(3);
    await expectNoAxeViolations(page);
    await page.screenshot({ path: `temp/be01/flows-menu-${theme}.png` });
  });
}

test('on a read-only ledger the Flows items are off, saying why, and a press writes nothing', async ({ page }) => {
  const srv = await startFolderServer({ ledgers: true, readOnly: true });
  try {
    await page.goto(`${srv.base}/?vbwork&flags=readOnlyStart,ledgerFolders,-readOnlyToggle,flowDirection`);
    await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
    await idle(page);
    await flowButton(page).click();
    for (const d of ['across', 'down', 'auto']) {
      await expect(page.locator(bid(`direction-${d}`))).toHaveAttribute('aria-disabled', 'true');
      await expect(page.locator(bid(`direction-${d}`))).toHaveAttribute('title', REASON);
    }
    const before = await head(page, srv.base);
    await page.locator(bid('direction-down')).click({ force: true });
    await idle(page);
    expect(await head(page, srv.base)).toBe(before);
  } finally { await srv.close(); }
});

for (const theme of THEMES) {
  test(`the gallery's section draws every sample and passes axe (${theme}); off, no section`, async ({ page, request }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(page.locator('[data-feature="flowBranches"]')).toHaveCount(0);
    await page.goto('/gallery.html?flags=flowBranches,flowDirection');
    const section = page.locator('[data-feature="flowBranches"]');
    await expect(section.locator('.g-mini')).toHaveCount(4);
    await expect(section.getByRole('menuitemradio')).toHaveCount(3);
    await section.scrollIntoViewIfNeeded();
    await expectNoAxeViolations(page);
    await section.screenshot({ path: `temp/be01/gallery-${theme}.png` });
    // The board as the person sees it: the example on rows, across and down.
    const d = await drawLine(request, 'flow');
    await open(page, d, '?vbwork&flags=flowBranches,flowDirection');
    await expect(page.locator('svg.vb-wires').first()).not.toHaveClass(/settling/);
    await page.screenshot({ path: `temp/be01/board-across-${theme}.png` });
    await flowButton(page).click();
    await rows(page).nth(1).click();
    await expect.poll(async () => runsDown(await places(page, d.n))).toBe(true);
    await page.keyboard.press('f');
    await idle(page);
    await expect(page.locator('svg.vb-wires').first()).not.toHaveClass(/settling/);
    await page.screenshot({ path: `temp/be01/board-down-${theme}.png` });
  });
}
