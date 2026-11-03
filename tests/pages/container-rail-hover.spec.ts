// Rail icons only on the container in use (railOnHover flag; read-only follow-ups FE_03, PLAN decision 9,
// point 416): a container's rail icons and divider are hidden (opacity 0, still focusable) unless the
// container is hovered or holds focus, then at the rest strength (--vb-rail-rest), full on the rail itself.
// Comment's badge still shows; a touch screen keeps them shown; flag off (?flags=-railOnHover) is the
// dimmed-at-rest look as before. Board: rail-board.ts (p and q side by side).
import { act } from './agent-board.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import { board, boxOf, frame, iconOpacity, rail, THEMES, zoomTo } from './rail-board.ts';

const AWAY = { x: 2, y: 990 };
const away = (page: import('@playwright/test').Page) => page.mouse.move(AWAY.x, AWAY.y);

test('the pointer on a container shows its icons at rest strength and hides the others', async ({ page, request }) => {
  await board(page, request);
  await zoomTo(page, 1);
  const [p, q] = [frame(page, 'p'), frame(page, 'q')];
  await expect.poll(() => iconOpacity(p), 'no pointer: hidden').toBe(0);
  expect(await iconOpacity(q)).toBe(0);
  // Over p's card (the cards are a layer of their own, above the frames): p shows at rest strength.
  await p.page().locator('vb-node').first().hover();
  await expect.poll(() => iconOpacity(p)).toBeCloseTo(0.5, 2);
  expect(await iconOpacity(q)).toBe(0);
  // Over p's empty frame area too, and the divider follows the icons.
  const b = await boxOf(p);
  await page.mouse.move(b.x + b.width - 6, b.y + b.height - 6);
  await expect.poll(() => iconOpacity(p)).toBeCloseTo(0.5, 2);
  // Over q's rail: q's at full strength (as today), p's hidden again.
  await rail(page, 'q').hover();
  await expect.poll(() => iconOpacity(q)).toBe(1);
  expect(await iconOpacity(p)).toBe(0);
  await away(page);
  await expect.poll(() => iconOpacity(q)).toBe(0);
});

test('focus inside a container shows its icons; a hidden icon is still reachable by the keyboard', async ({ page, request }) => {
  await board(page, request);
  await zoomTo(page, 1);
  const [p, q] = [frame(page, 'p'), frame(page, 'q')];
  await p.page().locator('vb-node').nth(1).focus();
  await away(page);
  await expect.poll(() => iconOpacity(q), 'focus on q\'s card').toBeCloseTo(0.5, 2);
  expect(await iconOpacity(p)).toBe(0);
  await q.page().locator('vb-node').nth(1).blur();
  await expect.poll(() => iconOpacity(q)).toBe(0);
  // Hidden, not removed: the rail's checked layout takes focus, and then the rail is lit.
  const checked = p.locator('.vb-mseg[role="radio"][aria-checked="true"]');
  await expect(checked).toBeVisible();
  await checked.focus();
  await expect(checked).toBeFocused();
  await expect.poll(() => iconOpacity(p)).toBe(1);
  expect((await boxOf(checked)).width, 'no layout change').toBeGreaterThan(20);
});

test('Comment\'s badge still shows on a container not in use', async ({ page, request }) => {
  const d = await board(page, request);
  await zoomTo(page, 1);
  const f = frame(page, 'p');
  await act(page, d, { action: 'comment', board: d.board, region: 'p', text: 'Is the order right?' });
  await expect(f).toHaveAttribute('data-badge', 'unsent');
  await away(page);
  expect(await iconOpacity(f)).toBe(0);
  await expect(f.locator('.vb-region-badge')).toBeVisible();
  const o = await f.locator('.vb-region-badge').evaluate((e) => {
    let v = 1;
    for (let n: Element | null = e; n; n = n.parentElement) v *= Number(getComputedStyle(n).opacity);
    return v;
  });
  expect(o).toBe(1);
});

test('flag off (?flags=-railOnHover): every container shows its icons dimmed at rest, as before', async ({ page, request }) => {
  await board(page, request, '?flags=-railOnHover');
  await zoomTo(page, 1);
  await expect(frame(page, 'p')).not.toHaveAttribute('data-rail-hover');
  for (const id of ['p', 'q']) expect(await iconOpacity(frame(page, id)), id).toBeCloseTo(0.5, 2);
});

test('the flag on marks each frame data-rail-hover', async ({ page, request }) => {
  await board(page, request);
  for (const id of ['p', 'q', 'l']) await expect(frame(page, id)).toHaveAttribute('data-rail-hover', '');
});

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true, isMobile: true });
  test('the icons stay shown on every container (no hover to find the one in use)', async ({ page, request }) => {
    await board(page, request);
    for (const id of ['p', 'q']) await expect.poll(() => iconOpacity(frame(page, id)), id).toBe(1);
  });
});

for (const theme of THEMES) {
  test(`axe passes with a hidden and an in-use rail (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    await board(page, request);
    await zoomTo(page, 1);
    await expectNoAxeViolations(page);
    await page.locator('vb-node').first().hover();
    await expect.poll(() => iconOpacity(frame(page, 'p'))).toBeCloseTo(0.5, 2);
    await expectNoAxeViolations(page);
  });

  test(`the gallery draws hidden (not in use), in use and lit side by side (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    const section = page.locator('section[data-feature="toolRail"]');
    const op = (id: string) => iconOpacity(section.locator(`vb-region[data-region="rail-${id}"]`));
    expect(await op('hidden')).toBe(0);
    expect(await op('inuse')).toBeCloseTo(0.5, 2);
    expect(await op('inuse-lit')).toBe(1);
    await expectNoAxeViolations(page);
  });
}
