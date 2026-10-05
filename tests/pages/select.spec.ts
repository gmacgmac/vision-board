// Selecting cards, moving them by the kind tab and panning on backgrounds (3_FE_01, rulings 1-9).
// Runs after notes.spec.ts and same-picture.spec.ts on the same server, on the roadmap board. It
// leaves the ledger as it found it: the one card it moves it puts back (R).
import type { Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const NODES = 17;
const THEMES: Theme[] = ['dark', 'light'];

const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);
const live = (page: Page) => page.locator('#selection-status');
const selectedIds = (page: Page) => page.locator('vb-node[data-selected]').evaluateAll((els) =>
  els.map((e) => (e as HTMLElement).dataset.id!).sort((a, b) => Number(a) - Number(b)));
const docSelection = (page: Page) => page.evaluate(() => document.getSelection()?.toString() ?? '');
const worldAt = (page: Page) => page.locator('#world').evaluate((e) => {
  const m = new DOMMatrix(getComputedStyle(e).transform);
  return { x: Math.round(m.e), y: Math.round(m.f) };
});

async function openBoard(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('vb-node')).toHaveCount(NODES);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
  await expect(page.locator('#wires')).not.toHaveClass(/settling/);
}

/** Zoom in until the world draws at 1:1, so every control is its full size. */
async function zoomToFull(page: Page): Promise<void> {
  const scale = () => page.locator('#world').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a);
  for (let i = 0; i < 12 && (await scale()) < 1; i += 1) await page.keyboard.press('+');
}

/** A point inside `el`, as fractions of its box. */
async function at(el: Locator, fx = 0.5, fy = 0.5): Promise<{ x: number; y: number }> {
  const b = (await el.boundingBox())!;
  return { x: b.x + b.width * fx, y: b.y + b.height * fy };
}

/** Click a card's title (its content, not a control), with modifiers held. */
async function clickCard(page: Page, n: number, modifiers: ('Shift' | 'Meta' | 'Control')[] = []): Promise<void> {
  await card(page, n).locator('.vb-node-title').click({ modifiers, position: { x: 4, y: 4 } });
}

/** Press, move in steps, release: a real drag, so the page sees every pointermove. */
async function drag(page: Page, from: { x: number; y: number }, dx: number, dy: number, button: 'left' | 'middle' = 'left'): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button });
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 8 });
  await page.mouse.up({ button });
}

/** A point on the board's own background, clear of every frame and card. */
async function backgroundPoint(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const stage = document.getElementById('stage')!.getBoundingClientRect();
    for (let y = stage.top + 20; y < stage.bottom - 20; y += 10) {
      for (let x = stage.left + 20; x < stage.right - 20; x += 10) {
        if (document.elementFromPoint(x, y)?.id === 'stage') return { x, y };
      }
    }
    throw new Error('no background point on the stage');
  });
}

test('click selects a card alone; Shift, Cmd and Ctrl-click add and remove; the name and live region say so', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 1);
  expect(await selectedIds(page)).toEqual(['1']);
  await expect(card(page, 1)).toHaveAttribute('aria-label', /, selected$/);
  await expect(card(page, 2)).not.toHaveAttribute('aria-label', /selected/);
  await expect(live(page)).toHaveText('1 card selected');
  await expect(live(page)).toHaveAttribute('role', 'status');
  await clickCard(page, 2, ['Shift']);
  await clickCard(page, 3, ['Meta']);
  await clickCard(page, 4, ['Control']);
  expect(await selectedIds(page)).toEqual(['1', '2', '3', '4']);
  await expect(live(page)).toHaveText('4 cards selected');
  await clickCard(page, 2, ['Shift']);
  await clickCard(page, 3, ['Meta']);
  expect(await selectedIds(page)).toEqual(['1', '4']);
  await expect(live(page)).toHaveText('2 cards selected');
  // A plain click starts again from that card alone.
  await clickCard(page, 5);
  expect(await selectedIds(page)).toEqual(['5']);
  // A Shift-click selects no text (it would extend the text selection in a plain page).
  await clickCard(page, 6, ['Shift']);
  expect(await docSelection(page)).toBe('');
  // The card's controls act on their own and leave the selection alone.
  await card(page, 7).focus();
  await card(page, 7).locator('.vb-size-trig').click();
  expect(await selectedIds(page)).toEqual(['5', '6']);
});

test('a click on the background or a container clears the selection; Esc closes the bubble first, then clears', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 1);
  await clickCard(page, 2, ['Shift']);
  const bg = await backgroundPoint(page);
  await page.mouse.click(bg.x, bg.y);
  expect(await selectedIds(page)).toEqual([]);
  await expect(live(page)).toHaveText('Selection cleared');
  // Inside a container, away from its cards.
  await clickCard(page, 1);
  const frame = page.locator('vb-region[data-region="review"]');
  const f = (await frame.boundingBox())!;
  await page.mouse.click(f.x + 6, f.y + f.height - 6);
  expect(await selectedIds(page)).toEqual([]);
  // Esc: the open bubble first, keeping the selection; then the selection.
  await clickCard(page, 3);
  await clickCard(page, 1, ['Shift']);
  await card(page, 3).focus();
  await page.keyboard.press('c');
  await expect(page.locator('vb-note-bubble')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('vb-note-bubble')).toBeHidden();
  expect(await selectedIds(page)).toEqual(['1', '3']);
  await page.keyboard.press('Escape');
  expect(await selectedIds(page)).toEqual([]);
  await expect(live(page)).toHaveText('Selection cleared');
});

test('Space toggles the focused card in the selection; the focus ring still shows (selection is not focus)', async ({ page }) => {
  await openBoard(page);
  await card(page, 2).focus();
  await page.keyboard.press('Space');
  expect(await selectedIds(page)).toEqual(['2']);
  await page.keyboard.press('j');
  await page.keyboard.press('Space');
  expect(await selectedIds(page)).toEqual(['2', '3']);
  await expect(card(page, 3)).toBeFocused();
  const ring = await card(page, 3).evaluate((e) => getComputedStyle(e).outlineStyle);
  expect(ring).toBe('solid');
  await page.keyboard.press('Space');
  expect(await selectedIds(page)).toEqual(['2']);
  // Space on a card's button presses the button, not the selection.
  await card(page, 2).locator('.vb-size-trig').focus();
  await page.keyboard.press('Space');
  expect(await selectedIds(page)).toEqual(['2']);
  await page.keyboard.press('Escape');
});

test('only the kind tab moves a card: dragging it moves and pins that card alone, R puts it back', async ({ page }) => {
  await openBoard(page);
  await zoomToFull(page);
  await card(page, 1).focus();
  await clickCard(page, 1);
  await clickCard(page, 2, ['Shift']);
  const [b1, b2] = [(await card(page, 1).boundingBox())!, (await card(page, 2).boundingBox())!];
  await drag(page, await at(card(page, 1).locator('.vb-node-kind')), 90, 60);
  await expect(card(page, 1)).toHaveAttribute('data-pinned', '');
  await expect(page.locator('#wires')).not.toHaveClass(/settling/);
  const a1 = (await card(page, 1).boundingBox())!;
  expect(Math.hypot(a1.x - b1.x, a1.y - b1.y)).toBeGreaterThan(40);
  // The other selected card stays where it was (group move is 3_FE_03), and both stay selected.
  await expect(card(page, 2)).not.toHaveAttribute('data-pinned', '');
  expect(await selectedIds(page)).toEqual(['1', '2']);
  const a2 = (await card(page, 2).boundingBox())!;
  expect([Math.round(a2.width), Math.round(a2.height)]).toEqual([Math.round(b2.width), Math.round(b2.height)]);
  await card(page, 1).focus();
  await page.keyboard.press('r');
  await expect(card(page, 1)).not.toHaveAttribute('data-pinned', '');
});

test('a drag inside a card selects its text and neither moves the card nor pans', async ({ page }) => {
  await openBoard(page);
  await zoomToFull(page);
  await card(page, 1).focus();
  const title = card(page, 1).locator('.vb-node-title');
  const before = { card: (await card(page, 1).boundingBox())!, world: await worldAt(page) };
  const t = (await title.boundingBox())!;
  await drag(page, { x: t.x + 2, y: t.y + 8 }, t.width - 6, 0);
  const picked = await docSelection(page);
  expect(picked.length).toBeGreaterThan(3);
  expect((await title.textContent())!).toContain(picked.trim().split('\n')[0]!);
  expect(await worldAt(page)).toEqual(before.world);
  expect(await card(page, 1).boundingBox()).toEqual(before.card);
  await expect(card(page, 1)).not.toHaveAttribute('data-pinned', '');
  // The body is text too; the footer, the tabs and the size control are not.
  const styles = await card(page, 1).evaluate((e) => Object.fromEntries(
    ['.vb-node-title', '.vb-node-body', '.vb-node-foot', '.vb-node-kind', '.vb-node-num', '.vb-size']
      .map((s) => [s, e.querySelector(s) ? getComputedStyle(e.querySelector(s)!).userSelect : 'none'])));
  expect(styles).toEqual({ '.vb-node-title': 'text', '.vb-node-body': 'text', '.vb-node-foot': 'none',
    '.vb-node-kind': 'none', '.vb-node-num': 'none', '.vb-size': 'none' });
});

test('a drag on the board\'s background pans and selects nothing', async ({ page }) => {
  await openBoard(page);
  const before = await worldAt(page);
  await drag(page, await backgroundPoint(page), 120, 70);
  expect(await worldAt(page)).toEqual({ x: before.x + 120, y: before.y + 70 });
  expect(await docSelection(page)).toBe('');
});

test('U5: a drag across a container\'s title pans and leaves no text selected', async ({ page }) => {
  await openBoard(page);
  const h2 = page.locator('vb-region[data-region="review"] h2');
  const before = await worldAt(page);
  const start = await at(h2, 0.1, 0.5);
  await drag(page, start, 260, 30);
  expect(await docSelection(page)).toBe('');
  expect(await worldAt(page)).toEqual({ x: before.x + 260, y: before.y + 30 });
  // From inside the frame, across the title and a card, too.
  const frame = (await page.locator('vb-region[data-region="review"]').boundingBox())!;
  await drag(page, { x: frame.x + 8, y: frame.y + frame.height - 8 }, 300, -frame.height + 20);
  expect(await docSelection(page)).toBe('');
});

test('Shift+drag on a background is reserved for the lasso: it neither pans nor selects', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 1);
  const before = await worldAt(page);
  await page.keyboard.down('Shift');
  await drag(page, await backgroundPoint(page), 150, 90);
  const h2 = page.locator('vb-region[data-region="review"] h2');
  await drag(page, await at(h2, 0.1, 0.5), 150, 40);
  await page.keyboard.up('Shift');
  expect(await worldAt(page)).toEqual(before);
  expect(await docSelection(page)).toBe('');
  expect(await selectedIds(page)).toEqual(['1']);
});

test('a middle-button drag pans anywhere, a card included', async ({ page }) => {
  await openBoard(page);
  const before = await worldAt(page);
  await drag(page, await at(card(page, 2).locator('.vb-node-title')), 80, 50, 'middle');
  expect(await worldAt(page)).toEqual({ x: before.x + 80, y: before.y + 50 });
  await expect(card(page, 2)).not.toHaveAttribute('data-pinned', '');
  expect(await docSelection(page)).toBe('');
});

test('the selection survives a redraw', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 1);
  await clickCard(page, 4, ['Shift']);
  // H hides decided cards and draws again; again shows them.
  await page.keyboard.press('h');
  await page.keyboard.press('h');
  await expect(page.locator('vb-node:visible')).toHaveCount(NODES);
  expect(await selectedIds(page)).toEqual(['1', '4']);
});

for (const theme of THEMES) {
  test(`axe passes with cards selected, at full size (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page);
    await zoomToFull(page);
    await card(page, 1).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('j');
    await page.keyboard.press('Space');
    expect(await selectedIds(page)).toEqual(['1', '2']);
    await expectNoAxeViolations(page);
  });
}
