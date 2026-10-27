// The selection pill clear of the card's tabs (page-polish ruling C, selection-bar-core.ts
// `pillGap`): the pill does not scale with zoom but the card's top tabs (number, kind) do, so the
// space from the pill's bottom to the tab row grows with zoom, from a small minimum zoomed out to a
// larger value zoomed in, and the pill never overlaps the tabs. Measured at three zooms: zoomed out
// (0.3), 1 and zoomed in (2.5, the board's most). A board of its own, written by an agent.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from './helpers.ts';

let boards = 0;
/** Three rows: the card measured is in the last, so no container title line is under its pill even
 *  zoomed out, where the pill is taller than a row (a pill that would cover the title line rises over
 *  it, point 283). */
const TITLES = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'].map((n) => `${n} idea`);

async function draw(request: APIRequestContext): Promise<string> {
  const r = await request.post('/api/agents', { data: { label: 'Gap chat' } });
  const secret = (await r.json() as { secret: string }).secret;
  const board = `gap-${Date.now()}-${(boards += 1)}`;
  const items = [
    { type: 'board', title: 'Gap board' },
    { type: 'region', region: { id: 'ideas', title: 'Ideas', mode: 'grid' } },
    ...TITLES.map((title) => ({ type: 'node', node: { region: 'ideas', kind: 'question', title } })),
  ];
  const w = await request.post(`/api/boards/${board}/write`, { headers: { Authorization: `Bearer ${secret}` }, data: { items } });
  expect(w.status(), await w.text()).toBe(200);
  return board;
}

const card = (page: Page) => page.locator('vb-node').last();
const view = (page: Page) => page.locator('.vb-world').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a);

/** Zoom with Ctrl+wheel at the card's centre (pointer.ts: factor exp(-deltaY * 0.0015)) to `k`. */
async function zoomTo(page: Page, k: number): Promise<void> {
  const b = (await card(page).boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -Math.log(k / await view(page)) / 0.0015);
  await page.keyboard.up('Control');
  await expect.poll(() => view(page)).toBeCloseTo(k, 2);
}

/** Screen pixels from the pill's bottom to the top of the selected card's tabs (negative: overlap). */
const clear = (page: Page) => page.evaluate(() => {
  const bar = document.querySelector('vb-selection-bar')!.getBoundingClientRect();
  const tabs = [...document.querySelectorAll('vb-node[data-selected] :is(.vb-node-num, .vb-node-kind)')];
  return Math.min(...tabs.map((t) => t.getBoundingClientRect().top)) - bar.bottom;
});

test('the pill sits clear of the selected card\'s tabs at three zooms, the space growing with zoom', async ({ page, request }) => {
  await page.goto(`/#${await draw(request)}`);
  await expect(page.locator('vb-node')).toHaveCount(TITLES.length);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
  await card(page).locator('.vb-node-title').click({ position: { x: 4, y: 4 } });
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(1);
  await expect(page.locator('vb-selection-bar')).toBeVisible();
  // pillGap(k) - TAB_RISE * k: 8k, kept within 4 and 16 (selection-bar-core.ts).
  const want: [number, number][] = [[0.3, 4], [1, 8], [2.5, 16]];
  const got: number[] = [];
  for (const [k, space] of want) {
    await zoomTo(page, k);
    await expect(page.locator('vb-selection-bar')).toHaveAttribute('data-side', 'above');
    await expect.poll(() => clear(page), `zoom ${k}`).toBeGreaterThan(space - 1.5);
    const c = await clear(page);
    expect(c, `zoom ${k}: about ${space}px clear`).toBeLessThan(space + 1.5);
    got.push(c);
  }
  expect(got[0]!, 'it grows with zoom').toBeLessThan(got[1]!);
  expect(got[1]!).toBeLessThan(got[2]!);
});
