// A container's frame, corners only (point 672; was FIX_06's open corners): one rule round the frame on its ::before,
// masked to its four corners (arms --vb-region-corner, 64px), in the frame's colour at 55%; ::after draws nothing; the
// element's own border stays transparent (the box and the rail's geometry are as before). A short rule each side of
// the title in the frame's colour (point 673), dropped on a frame under 640px on screen. In use the corners step up a
// little with the rail; selected is the reading ink and 2px, still corners only; hover, selected and dragging fainter
// than before (point 674); a drop target closes the frame (dashed, ink, soft fill). Fresh is fresh-cards.spec.ts.
// Board: rail-board.ts (p and q side by side), with the railOnHover flag as the app has it.
import type { Locator, Page } from '@playwright/test';
import { lc, pixel, resolved } from './apca.ts';
import { expect, setTheme, test } from './helpers.ts';
import { board, boxOf, frame, THEMES, zoomTo } from './rail-board.ts';

type Pseudo = { colour: string; style: string; top: number; bottom: number; left: number; right: number; inset: number[]; content: string; mask: string; size: string; position: string };
/** A frame's ::before or ::after as drawn: the rule's colour, its widths, its box inside the frame's padding box, its mask. */
const rules = (f: Locator, which: '::before' | '::after') => f.evaluate((e, w) => {
  const c = getComputedStyle(e, w);
  return { colour: c.borderTopColor, style: c.borderTopStyle,
    top: parseFloat(c.borderTopWidth), bottom: parseFloat(c.borderBottomWidth), left: parseFloat(c.borderLeftWidth), right: parseFloat(c.borderRightWidth),
    inset: [c.top, c.right, c.bottom, c.left].map(parseFloat), content: c.content, mask: c.maskImage, size: c.maskSize, position: c.maskPosition };
}, which) as Promise<Pseudo>;
const AWAY = { x: 2, y: 990 };
/** `colour` (it may be translucent) as the screen draws it over `back`. */
const over = (page: Page, colour: string, back: string) => page.evaluate(([c, b]) => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = b!; ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = c!; ctx.fillRect(0, 0, 1, 1);
  return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)] as [number, number, number];
}, [colour, back]);
const CORNER = 64;
const FOUR = (v: string) => [v, v, v, v].join(', ');

test('corners only: the border is transparent, one rule round the frame is masked to its four 64px corners, at 55% of its colour', async ({ page, request }) => {
  await board(page, request);
  await zoomTo(page, 1);
  const f = frame(page, 'p');
  expect(await f.evaluate((e) => getComputedStyle(e).borderTopColor), 'no border drawn on the element').toBe('rgba(0, 0, 0, 0)');
  const [rule, after] = [await rules(f, '::before'), await rules(f, '::after')];
  const w = rule.top; // 1.5px as the screen draws it (a border snaps to device pixels: 1px at 1x)
  expect(w).toBeGreaterThan(0);
  expect([rule.top, rule.bottom, rule.left, rule.right], 'one rule, all four sides').toEqual([w, w, w, w]);
  expect(rule.style).toBe('solid');
  // Round the frame: the border (1.5px) is outside the padding box the insets are measured in.
  expect(rule.inset).toEqual([-1.5, -1.5, -1.5, -1.5]);
  // The mask keeps four squares, one at each corner, and nothing between them.
  expect(rule.mask.match(/linear-gradient/g), 'four mask layers').toHaveLength(4);
  expect(rule.size).toBe(FOUR(`${CORNER}px ${CORNER}px`));
  expect(rule.position).toBe('0% 0%, 100% 0%, 0% 100%, 100% 100%');
  expect(after.content, '::after draws nothing').toBe('none');
  expect(rule.colour, 'the frame colour at 55%').toBe(await resolved(page, 'color-mix(in srgb, var(--vb-line-contrast) 55%, transparent)'));
  const b = await boxOf(f);
  expect(b.width, 'room between the top corners').toBeGreaterThan(2 * CORNER);
});

test('a short rule each side of the title in the frame\'s colour; none on a frame under 640px on screen', async ({ page, request }) => {
  await board(page, request);
  await zoomTo(page, 2.5);
  const f = frame(page, 'p');
  const side = (which: '::before' | '::after') => f.locator('.vb-region-label').evaluate((e, w) => {
    const c = getComputedStyle(e, w);
    return { display: c.display, width: parseFloat(c.width), height: parseFloat(c.height), colour: c.backgroundColor };
  }, which);
  const line = async () => (await boxOf(f.locator('.vb-region-head'))).width;
  expect(await line(), 'p is wide on screen at 250%').toBeGreaterThan(640);
  // The corners' colour and weight (a border snaps to device pixels, a box's height does not: read the weight's token).
  const corner = await rules(f, '::before');
  const weight = await f.evaluate((e) => parseFloat(getComputedStyle(e).getPropertyValue('--vb-region-ln-w')));
  for (const which of ['::before', '::after'] as const) {
    const r = await side(which);
    expect(r.display, which).not.toBe('none');
    expect([r.width, r.height, r.colour], which).toEqual([32, weight, corner.colour]);
  }
  // At 100% the same one-card frame's line is under 640px on screen: the rules go.
  await zoomTo(page, 1);
  expect(await line()).toBeLessThan(640);
  for (const which of ['::before', '::after'] as const) expect((await side(which)).display, which).toBe('none');
});

for (const theme of THEMES) {
  test(`${theme}: in use steps the corners up, selected is ink and 2px still corners only, a drop target closes the frame`, async ({ page, request }) => {
    await setTheme(page, theme);
    await board(page, request);
    await zoomTo(page, 1);
    const f = frame(page, 'p');
    const canvasCss = await resolved(page, 'var(--vb-surface-canvas)');
    const canvas = await pixel(page, canvasCss);
    const lcOf = async (l: Locator) => lc(await over(page, (await rules(l, '::before')).colour, canvasCss), canvas);
    const rest = await lcOf(f);
    const wRest = (await rules(f, '::before')).top;
    // In use: the pointer on its card (the board marks the frame data-use).
    await page.locator('vb-node').first().hover();
    await expect(f).toHaveAttribute('data-use', '');
    const use = await lcOf(f);
    expect(use, 'a step brighter in use').toBeGreaterThan(rest);
    expect((await rules(f, '::before')).top, 'not thicker').toBe(wRest);
    await page.mouse.move(AWAY.x, AWAY.y);
    await expect(f).not.toHaveAttribute('data-use');
    expect(await lcOf(f), 'back to rest').toBeCloseTo(rest, 3);
    // Selected: ink, 2px, still corners only.
    await f.evaluate((e) => e.setAttribute('data-selected', ''));
    const sel = await rules(f, '::before');
    expect([sel.top, sel.bottom, sel.left, sel.right], 'heavier').toEqual([2, 2, 2, 2]);
    expect(sel.size, 'corners only').toBe(FOUR(`${CORNER}px ${CORNER}px`));
    const selected = await lcOf(f);
    expect(selected, 'brighter than in use').toBeGreaterThan(use);
    // Fainter than the whole ink it was before point 674, and still over the decoration tier.
    const ink = lc(await pixel(page, await resolved(page, 'var(--vb-ink)')), canvas);
    expect(selected).toBeLessThan(ink);
    expect(selected).toBeGreaterThanOrEqual(30);
    test.info().annotations.push({ type: `${theme} corners on canvas`, description: `Lc rest ${rest.toFixed(1)}, in use ${use.toFixed(1)}, selected ${selected.toFixed(1)}` });
    await f.evaluate((e) => e.removeAttribute('data-selected'));
    // Drop target: one dashed rounded line round the whole frame, no mask, a soft fill.
    await f.evaluate((e) => e.setAttribute('data-drop', ''));
    const drop = await rules(f, '::before');
    expect([drop.top, drop.bottom, drop.left, drop.right], 'all four sides').toEqual([wRest, wRest, wRest, wRest]);
    expect(drop.style).toBe('dashed');
    expect(drop.inset, 'round the frame').toEqual([-1.5, -1.5, -1.5, -1.5]);
    expect(drop.mask, 'the whole frame, not its corners').toBe('none');
    expect(await lcOf(f), 'in ink').toBeGreaterThanOrEqual(45);
    expect(await f.evaluate((e) => getComputedStyle(e).backgroundColor), 'a soft fill').not.toBe('rgba(0, 0, 0, 0)');
  });
}
