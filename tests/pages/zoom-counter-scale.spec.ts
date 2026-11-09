// The container's top line and tool rail keep one on-screen size at every zoom (review polish ruling 2; the tool rail):
// they counter-scale by --vb-zoom, which the viewport writes on the regions layer and which inherits from there to each
// frame, its top line and its rail. macOS 15's WebKit (the nclite desktop window, 2026-11-09) never passed a new value
// down an `inherit` chain of a non-inherited registered property, so the rail kept the first zoom it saw and grew with
// every zoom after: no rule hands --vb-zoom down by `inherit` now. The cards layer never takes it, so a zoom step
// restyles no card (perf.spec.ts).
import { expect, test } from './helpers.ts';
import { board, boxOf, frame, zoomTo } from './rail-board.ts';

test('at every zoom from 60% to 145%, the rail\'s buttons are 24px and the top line its own size; cards never take the zoom', async ({ page, request }) => {
  await board(page, request);
  const sizes: string[] = [];
  for (const k of [0.6, 1, 1.45, 0.8, 1.45]) {
    await zoomTo(page, k);
    await frame(page).locator('.vb-region-tools').hover();
    const button = await boxOf(frame(page).locator('.vb-mseg[role="radio"][aria-checked="true"]'));
    const title = await boxOf(frame(page).locator('.vb-region-head h2'));
    sizes.push(`${k}: ${button.width.toFixed(1)}x${button.height.toFixed(1)} title ${title.height.toFixed(1)}`);
    expect(button.width, sizes.at(-1)).toBeCloseTo(24, 0);
    expect(button.height, sizes.at(-1)).toBeCloseTo(24, 0);
    const read = await frame(page).evaluate((f) => ({
      rail: getComputedStyle(f.querySelector('.vb-region-rail')!).getPropertyValue('--vb-zoom'),
      card: getComputedStyle(document.querySelector('.vb-cards vb-node')!).getPropertyValue('--vb-zoom'),
    }));
    expect(Number(read.rail), 'the rail reads the zoom now').toBeCloseTo(k, 2);
    expect(Number(read.card), 'a card never takes the zoom').toBe(1);
    await page.mouse.move(2, 990);
  }
  const titles = sizes.map((s) => Number(s.split('title ')[1]));
  expect(Math.max(...titles) - Math.min(...titles), sizes.join('; ')).toBeLessThan(1);
});

test('no rule hands --vb-zoom down by `inherit`: the fault macOS 15\'s WebKit has', async ({ page, request }) => {
  await board(page, request);
  const inheriting = await page.evaluate(() => [...document.styleSheets].flatMap((s) => {
    try { return [...s.cssRules].map((r) => r.cssText); } catch { return []; }
  }).filter((t) => /--vb-zoom:\s*inherit/.test(t) || /@property --vb-zoom[^}]*inherits:\s*false/.test(t)));
  expect(inheriting).toEqual([]);
});
