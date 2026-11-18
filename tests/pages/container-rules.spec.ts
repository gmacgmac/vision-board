// A container's rules, open corners (FIX_06; design/mockups/containers): the frame is a top rule broken by the
// title, a bottom rule and side rules that stop REGION_PAD (28px) short of each corner, drawn on the frame's
// ::before (top and bottom) and ::after (sides); its own border stays transparent (the box and the rail's
// geometry are as before). In use the rules step up a little with the rail; selected is the reading ink and 2px,
// corners still open; a drop target closes the corners (dashed, ink, soft fill). Fresh is fresh-cards.spec.ts.
// Board: rail-board.ts (p and q side by side), with the railOnHover flag as the app has it.
import type { Locator, Page } from '@playwright/test';
import { lc, pixel, resolved } from './apca.ts';
import { expect, setTheme, test } from './helpers.ts';
import { board, boxOf, frame, THEMES, zoomTo } from './rail-board.ts';
import { REGION_PAD } from '#layout';

type Pseudo = { colour: string; style: string; top: number; bottom: number; left: number; right: number; inset: number[]; display: string };
/** A frame's ::before or ::after as drawn: the rule's colour, its widths and its box inside the frame's padding box. */
const rules = (f: Locator, which: '::before' | '::after') => f.evaluate((e, w) => {
  const c = getComputedStyle(e, w);
  return { colour: c.borderTopColor === 'rgb(0, 0, 0)' || c.borderTopWidth === '0px' ? c.borderLeftColor : c.borderTopColor, style: c.borderTopStyle,
    top: parseFloat(c.borderTopWidth), bottom: parseFloat(c.borderBottomWidth), left: parseFloat(c.borderLeftWidth), right: parseFloat(c.borderRightWidth),
    inset: [c.top, c.right, c.bottom, c.left].map(parseFloat), display: c.display };
}, which) as Promise<Pseudo>;
const AWAY = { x: 2, y: 990 };
const px = (page: Page, css: string) => pixel(page, css);

test('open corners: the border is transparent and the rules stop 28px short of each corner', async ({ page, request }) => {
  await board(page, request);
  await zoomTo(page, 1);
  const f = frame(page, 'p');
  expect(await f.evaluate((e) => getComputedStyle(e).borderTopColor), 'no border drawn on the element').toBe('rgba(0, 0, 0, 0)');
  const [top, side] = [await rules(f, '::before'), await rules(f, '::after')];
  const w = top.top; // 1.5px as the screen draws it (a border snaps to device pixels: 1px at 1x)
  expect(w).toBeGreaterThan(0);
  expect([top.top, top.bottom, top.left, top.right], 'top and bottom rules only').toEqual([w, w, 0, 0]);
  expect([side.left, side.right, side.top, side.bottom], 'side rules only').toEqual([w, w, 0, 0]);
  // Insets are inside the padding box, the border (1.5px) outside it: the rules start REGION_PAD in from the border box's corner.
  expect(top.inset).toEqual([-1.5, REGION_PAD - 1.5, -1.5, REGION_PAD - 1.5]);
  expect(side.inset).toEqual([REGION_PAD - 1.5, -1.5, REGION_PAD - 1.5, -1.5]);
  const b = await boxOf(f);
  expect(b.width).toBeGreaterThan(2 * REGION_PAD);
});

for (const theme of THEMES) {
  test(`${theme}: in use steps the rules up, selected is ink and 2px with open corners, a drop target closes them`, async ({ page, request }) => {
    await setTheme(page, theme);
    await board(page, request);
    await zoomTo(page, 1);
    const f = frame(page, 'p');
    const canvas = await px(page, await resolved(page, 'var(--vb-surface-canvas)'));
    const lcOf = async (l: Locator) => lc(await px(page, (await rules(l, '::before')).colour), canvas);
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
    // Selected: ink, 2px, the side rules still there and still short of the corners.
    await f.evaluate((e) => e.setAttribute('data-selected', ''));
    const [top, side] = [await rules(f, '::before'), await rules(f, '::after')];
    expect([top.top, top.bottom, side.left, side.right], 'heavier').toEqual([2, 2, 2, 2]);
    expect(side.display).not.toBe('none');
    expect(side.inset[0], 'corners stay open').toBeGreaterThan(20);
    expect(await lcOf(f), 'selected: the decoration tier and over, brighter than in use').toBeGreaterThan(use);
    expect(await lcOf(f)).toBeGreaterThanOrEqual(45);
    await f.evaluate((e) => e.removeAttribute('data-selected'));
    // Drop target: one dashed rounded line round the whole frame, a soft fill.
    await f.evaluate((e) => e.setAttribute('data-drop', ''));
    const drop = await rules(f, '::before');
    expect([drop.top, drop.bottom, drop.left, drop.right], 'all four sides').toEqual([wRest, wRest, wRest, wRest]);
    expect(drop.style).toBe('dashed');
    expect(drop.inset, 'round the frame').toEqual([-1.5, -1.5, -1.5, -1.5]);
    expect((await rules(f, '::after')).display, 'no side rules').toBe('none');
    expect(await lcOf(f), 'in ink').toBeGreaterThanOrEqual(45);
    expect(await f.evaluate((e) => getComputedStyle(e).backgroundColor), 'a soft fill').not.toBe('rgba(0, 0, 0, 0)');
  });
}
