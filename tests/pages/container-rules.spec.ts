// A container's frame, corners only (point 672; was FIX_06's open corners): one rule round the frame on its ::before,
// clipped to its four corners (arms --vb-region-corner, 64px) by a clip-path polygon, never a mask (D-115: a WebKit PDF
// paints a mask solid), in the frame's colour at 55%; ::after draws nothing; the
// element's own border stays transparent (the box and the rail's geometry are as before). A short rule each side of
// the title in the frame's colour (point 673), dropped on a frame under 640px on screen. In use the corners step up a
// little with the rail; selected is the reading ink and 2px, still corners only; hover, selected and dragging fainter
// than before (point 674); a drop target closes the frame (dashed, ink, soft fill). Fresh is fresh-cards.spec.ts.
// Board: rail-board.ts (p and q side by side), with the railOnHover flag as the app has it.
import type { Locator, Page } from '@playwright/test';
import { lc, pixel, resolved } from './apca.ts';
import { expect, setTheme, test } from './helpers.ts';
import { board, boxOf, frame, THEMES, zoomTo } from './rail-board.ts';

type Pseudo = { colour: string; style: string; top: number; bottom: number; left: number; right: number; inset: number[]; content: string; mask: string; clip: string; w: number; h: number };
/** A frame's ::before or ::after as drawn: the rule's colour, its widths, its box inside the frame's padding box, its clip and size. */
const rules = (f: Locator, which: '::before' | '::after') => f.evaluate((e, w) => {
  const c = getComputedStyle(e, w);
  return { colour: c.borderTopColor, style: c.borderTopStyle,
    top: parseFloat(c.borderTopWidth), bottom: parseFloat(c.borderBottomWidth), left: parseFloat(c.borderLeftWidth), right: parseFloat(c.borderRightWidth),
    inset: [c.top, c.right, c.bottom, c.left].map(parseFloat), content: c.content, mask: c.maskImage, clip: c.clipPath, w: parseFloat(c.width), h: parseFloat(c.height) };
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
/** A computed `polygon(…)` as points in px on a w × h box (its lengths, `100%` and `calc(100% - Npx)`). */
const polygon = (clip: string, w: number, h: number) => {
  const len = (v: string, size: number) => {
    const calc = /^calc\(100% - ([\d.]+)px\)$/.exec(v);
    return calc ? size - parseFloat(calc[1]!) : v.endsWith('%') ? (parseFloat(v) / 100) * size : parseFloat(v);
  };
  const body = /^polygon\((.*)\)$/.exec(clip)?.[1] ?? '';
  return body.split(/,(?![^(]*\))/).map((p) => p.trim().split(/ (?![^(]*\))/)).map(([x, y]) => [len(x!, w), len(y!, h)] as const);
};
/** Inside the polygon, by the nonzero rule (clip-path's default). */
const inside = (pts: (readonly [number, number])[], [x, y]: [number, number]) => {
  let wind = 0;
  pts.forEach(([x1, y1], i) => {
    const [x2, y2] = pts[(i + 1) % pts.length]!;
    const side = (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1);
    if (y1 <= y && y2 > y && side > 0) wind++;
    else if (y1 > y && y2 <= y && side < 0) wind--;
  });
  return wind !== 0;
};
/** The rule's clip keeps a square of CORNER at each corner and nothing between them, nor in the middle. */
const cornersOnly = (r: Pseudo) => {
  const pts = polygon(r.clip, r.w, r.h);
  const [w, h, c] = [r.w, r.h, CORNER];
  const kept: [number, number][] = [[1, 1], [c - 1, c - 1], [w - 1, 1], [w - c + 1, c - 1], [1, h - 1], [c - 1, h - c + 1], [w - 1, h - 1], [w - c + 1, h - c + 1]];
  const cut: [number, number][] = [[c + 1, 1], [w / 2, 1], [w - c - 1, 1], [1, c + 1], [1, h / 2], [w - 1, h / 2], [w / 2, h - 1], [c + 1, h - 1], [w / 2, h / 2]];
  return { kept: kept.map((p) => inside(pts, p)), cut: cut.map((p) => inside(pts, p)) };
};
const KEPT = { kept: Array(8).fill(true), cut: Array(9).fill(false) };

test('corners only: the border is transparent, one rule round the frame is clipped to its four 64px corners, at 55% of its colour', async ({ page, request }) => {
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
  // The clip keeps four squares, one at each corner, and nothing between them; no mask (a WebKit PDF paints it solid, D-115).
  expect(rule.mask, 'no mask').toBe('none');
  expect(cornersOnly(rule), 'four 64px corners, nothing between').toEqual(KEPT);
  // On a frame under two corners tall or wide the corners overlap and keep the whole side, as the mask did: the same
  // clip on a 300 × 100 and a 100 × 300 box keeps each side's middle.
  const short = polygon(rule.clip, 300, 100);
  const narrow = polygon(rule.clip, 100, 300);
  expect([inside(short, [1, 50]), inside(short, [299, 50]), inside(narrow, [50, 1]), inside(narrow, [50, 299])], 'overlapping corners add up').toEqual([true, true, true, true]);
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
    expect(cornersOnly(sel), 'corners only').toEqual(KEPT);
    const selected = await lcOf(f);
    expect(selected, 'brighter than in use').toBeGreaterThan(use);
    // Fainter than the whole ink it was before point 674, and still over the decoration tier.
    const ink = lc(await pixel(page, await resolved(page, 'var(--vb-ink)')), canvas);
    expect(selected).toBeLessThan(ink);
    expect(selected).toBeGreaterThanOrEqual(30);
    test.info().annotations.push({ type: `${theme} corners on canvas`, description: `Lc rest ${rest.toFixed(1)}, in use ${use.toFixed(1)}, selected ${selected.toFixed(1)}` });
    await f.evaluate((e) => e.removeAttribute('data-selected'));
    // Drop target: one dashed rounded line round the whole frame, no clip, a soft fill.
    await f.evaluate((e) => e.setAttribute('data-drop', ''));
    const drop = await rules(f, '::before');
    expect([drop.top, drop.bottom, drop.left, drop.right], 'all four sides').toEqual([wRest, wRest, wRest, wRest]);
    expect(drop.style).toBe('dashed');
    expect(drop.inset, 'round the frame').toEqual([-1.5, -1.5, -1.5, -1.5]);
    expect(drop.clip, 'the whole frame, not its corners').toBe('none');
    expect(await lcOf(f), 'in ink').toBeGreaterThanOrEqual(45);
    expect(await f.evaluate((e) => getComputedStyle(e).backgroundColor), 'a soft fill').not.toBe('rgba(0, 0, 0, 0)');
  });
}
