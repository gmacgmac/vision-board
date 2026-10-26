// A tile of a container's layout popover applies its layout (board-ui rail polish, point 1): a click,
// or Enter on a focused tile, sets it through the page's one click wiring, the action the rail's icon
// sends, and the popover closes. A past version and a locked board keep the tiles inert. Then the two
// small looks of the same task: the rail rests at 50% in both themes, and a container's title is one
// text step larger (--vb-text-md). On a board of its own, drawn through the API (rail-board.ts).
import type { Page } from '@playwright/test';
import { act, write } from './agent-board.ts';
import { boardLines } from './board-lines.ts';
import { expect, setTheme, test } from './helpers.ts';
import { board, frame, iconOpacity, THEMES, zoomTo } from './rail-board.ts';

const tile = (page: Page, mode: string) => frame(page).locator(`button.vb-mtile[data-tile="${mode}"]`);
const radio = (page: Page, name: string) => frame(page).getByRole('radio', { name, exact: true });
const popover = (page: Page) => frame(page).locator('.vb-mode-pop');

/** The mode acts the person has sent on `d.board`, oldest first. */
const modeActs = async (page: Page, id: string) =>
  (await boardLines(page, id)).filter((l) => l.type === 'act' && l.action === 'mode');

test('a tile click sets the layout like the rail icon: one act, the popover closes', async ({ page, request }) => {
  const d = await board(page, request);
  await zoomTo(page, 1);
  await expect(frame(page)).toHaveAttribute('data-mode', 'grid');
  const before = (await modeActs(page, d.board)).length;
  await radio(page, 'Grid').hover();
  await expect(popover(page)).toBeVisible();
  await expect(tile(page, 'row')).toHaveCount(1);
  await tile(page, 'row').click();
  await expect(frame(page)).toHaveAttribute('data-mode', 'row');
  await expect(radio(page, 'Row')).toHaveAttribute('aria-checked', 'true');
  await expect(tile(page, 'row')).toHaveAttribute('data-current', '');
  await expect(popover(page)).toBeHidden();
  const acts = await modeActs(page, d.board);
  expect(acts.length - before, 'one act').toBe(1);
  expect(acts.at(-1)).toMatchObject({ action: 'mode', region: 'p', mode: 'row' });
  // The icon sends the same act: back to grid by the rail, and the line has the same shape.
  await radio(page, 'Row').hover();
  await radio(page, 'Grid').click();
  await expect(frame(page)).toHaveAttribute('data-mode', 'grid');
  const [viaTile, viaIcon] = [acts.at(-1)!, (await modeActs(page, d.board)).at(-1)!];
  expect(Object.keys(viaIcon).sort()).toEqual(Object.keys(viaTile).sort());
});

test('Enter on a focused tile applies it, and the icon the keyboard was on keeps the focus', async ({ page, request }) => {
  const d = await board(page, request);
  await zoomTo(page, 1);
  await radio(page, 'Grid').focus();
  await expect(popover(page)).toBeVisible();
  await tile(page, 'column').focus();
  await expect(popover(page)).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(frame(page)).toHaveAttribute('data-mode', 'column');
  expect((await modeActs(page, d.board)).at(-1)).toMatchObject({ mode: 'column' });
  await expect(popover(page)).toBeHidden();
  await expect(radio(page, 'Column')).toBeFocused();
});

test('a tile is a button with its states: pointer, hover, pressed, focus, current', async ({ page, request }) => {
  await board(page, request);
  await zoomTo(page, 1);
  await radio(page, 'Grid').hover();
  const lanes = tile(page, 'lanes');
  await expect(lanes).toBeVisible();
  expect(await lanes.evaluate((e) => getComputedStyle(e).cursor)).toBe('pointer');
  const look = (l: typeof lanes) => l.evaluate((e) => { const s = getComputedStyle(e); return { bg: s.backgroundColor, border: s.borderColor, move: s.transform }; });
  const rest = await look(lanes);
  await lanes.hover();
  await expect(lanes).toHaveAttribute('data-hover', '');
  expect((await look(lanes)).bg, 'hover tints the tile').not.toBe(rest.bg);
  expect((await look(tile(page, 'grid'))).border, 'the current tile keeps its accent border').not.toBe(rest.border);
  await page.mouse.down();
  expect((await look(lanes)).move, 'pressed sinks a pixel').not.toBe('none');
  await page.mouse.move(2, 990);
  await page.mouse.up();
  await expect(frame(page)).toHaveAttribute('data-mode', 'grid');
  // Focus draws the ring.
  await radio(page, 'Grid').focus();
  await tile(page, 'radial').focus();
  expect(await tile(page, 'radial').evaluate((e) => e.matches(':focus-visible'))).toBe(true);
  expect(await tile(page, 'radial').evaluate((e) => parseFloat(getComputedStyle(e).outlineWidth))).toBeGreaterThan(0);
});

test('a past version keeps the tiles inert: no tool is visible, and a click on one sends nothing', async ({ page, request }) => {
  const d = await board(page, request);
  await zoomTo(page, 1);
  // The person's answer ends the agent's run, so the next card is a version of its own.
  await act(page, d, { action: 'ack', n: Number(await page.locator('vb-node').first().getAttribute('data-id')), ver: 1 });
  await write(request, d, [{ type: 'node', node: { region: 'p', kind: 'question', title: 'One more' } }]);
  await expect(page.locator('vb-node')).toHaveCount(5);
  const older = page.locator('#version option').last();
  const value = await older.getAttribute('value');
  await page.locator('#version').selectOption(value!);
  await expect(page.locator('.vb-banner')).toBeVisible();
  await expect(page.locator('#world .vb-region-tools:visible')).toHaveCount(0);
  const sent: string[] = [];
  page.on('request', (r) => { if (r.method() === 'POST' && /\/act$/.test(r.url())) sent.push(r.postData() ?? ''); });
  await tile(page, 'row').evaluate((e) => (e as HTMLElement).click());
  await expect(frame(page)).toHaveAttribute('data-mode', 'grid');
  expect(sent).toEqual([]);
  expect((await modeActs(page, d.board)).length).toBe(0);
});

for (const theme of THEMES) {
  test(`the rail rests at half strength in ${theme} too, as the token says`, async ({ page, request }) => {
    await setTheme(page, theme);
    await board(page, request);
    await zoomTo(page, 1);
    const token = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--vb-rail-rest').trim());
    expect(Number(token)).toBe(0.5);
    expect(await iconOpacity(frame(page))).toBeCloseTo(0.5, 2);
  });
}

test('a container\'s title is one text step larger: the handle and the title take --vb-text-md', async ({ page, request }) => {
  await board(page, request);
  await zoomTo(page, 1);
  const f = frame(page);
  const md = await page.evaluate(() => {
    const probe = document.createElement('i');
    probe.style.fontSize = 'var(--vb-text-md)';
    document.body.append(probe);
    const px = getComputedStyle(probe).fontSize;
    probe.remove();
    return px;
  });
  expect(await f.locator('.vb-region-head h2').evaluate((e) => getComputedStyle(e).fontSize)).toBe(md);
  expect(await f.locator('.vb-region-handle').evaluate((e) => getComputedStyle(e).fontSize)).toBe(md);
  // The line keeps its height (REGION_HEAD) and the title still sits on one line.
  const h = await f.locator('.vb-region-head h2').evaluate((e) => e.getBoundingClientRect().height);
  expect(h).toBeLessThanOrEqual(24);
});
