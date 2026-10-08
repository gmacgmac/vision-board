// Moving cards between containers, group move and the built-in Later container (3_FE_03, rulings
// 2-8). Runs on the shared server, on the roadmap board, after board.spec.ts and gallery.spec.ts;
// every card it moves it puts back in its own container, unpinned and open, so the files after it
// find the board as it was.
import type { Page } from '@playwright/test';
import { expect, expectNoAxeViolations, openSelectionBar, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const NODES = 17;
const THEMES: Theme[] = ['dark', 'light'];
type Point = { x: number; y: number };

const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);
const frame = (page: Page, region: string) => page.locator(`vb-region[data-region="${region}"]`);
const later = (page: Page) => frame(page, 'later');
const menu = (page: Page) => page.getByRole('menu', { name: /^Move \d+ cards? to$/ });
const selectedIds = (page: Page) => page.locator('vb-node[data-selected]').evaluateAll((els) =>
  els.map((e) => (e as HTMLElement).dataset.id!).sort((a, b) => Number(a) - Number(b)));

async function openBoard(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.locator('vb-node')).toHaveCount(NODES);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
  await expect(page.locator('#wires')).not.toHaveClass(/settling/);
}

async function clickCard(page: Page, n: number, modifiers: ('Shift' | 'Meta')[] = []): Promise<void> {
  await card(page, n).locator('.vb-node-title').click({ modifiers, position: { x: 4, y: 4 } });
}

const centre = async (page: Page, sel: ReturnType<typeof card>): Promise<Point> => {
  const b = (await sel.boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
const tabOf = (page: Page, n: number) => centre(page, card(page, n).locator('.vb-node-kind'));

/** Whether card `n`'s centre is inside the frame of `region`. */
async function inFrame(page: Page, n: number, region: string): Promise<boolean> {
  const c = await centre(page, card(page, n));
  const f = (await frame(page, region).boundingBox())!;
  return c.x > f.x && c.x < f.x + f.width && c.y > f.y && c.y < f.y + f.height;
}

/** A point inside `region`'s frame that no card covers, near its bottom right. */
async function emptyIn(page: Page, region: string): Promise<Point> {
  return frame(page, region).evaluate((f) => {
    const b = f.getBoundingClientRect();
    for (let y = b.bottom - 14; y > b.top + 40; y -= 8) {
      for (let x = b.right - 14; x > b.left + 14; x -= 8) {
        if (document.elementFromPoint(x, y)?.closest('vb-region') === f) return { x, y };
      }
    }
    throw new Error('no free point in the frame');
  });
}

/** A point on the board's own background, clear of every frame and card. */
async function background(page: Page): Promise<Point> {
  return page.evaluate(() => {
    const stage = document.getElementById('stage')!.getBoundingClientRect();
    for (let y = stage.top + 40; y < stage.bottom - 40; y += 10) {
      for (let x = stage.left + 40; x < stage.right - 40; x += 10) {
        if (document.elementFromPoint(x, y)?.id === 'stage') return { x, y };
      }
    }
    throw new Error('no background point on the stage');
  });
}

/** Press on `from`, move to `to` in steps, then run `during` before letting go. */
async function drag(page: Page, from: Point, to: Point, during?: () => Promise<void>): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 10 });
  await during?.();
  await page.mouse.up();
}

const api = (page: Page, path: string) => page.request.get(`/api${path}`).then((r) => r.json());
const head = async (page: Page) => (await api(page, '/boards/roadmap')).head as number;
const linesAfter = async (page: Page, after: number) =>
  ((await api(page, `/ledger?after=${after}&board=roadmap`)).events as Record<string, unknown>[]);
const regionOf = async (page: Page, n: number) => (await api(page, `/boards/roadmap/nodes/${n}`)).region as string;

/** Put cards back where the agent drew them, unpinned and open: the board as it was found. */
async function putBack(page: Page, home: Record<number, string>): Promise<void> {
  for (const [n, region] of Object.entries(home)) {
    const r = await page.request.post('/api/boards/roadmap/act', { data: { type: 'act', action: 'move', n: Number(n), region } });
    expect(r.status(), await r.text()).toBe(201);
  }
  await page.reload();
  await expect(page.locator('vb-node')).toHaveCount(NODES);
  for (const n of Object.keys(home)) await expect(card(page, Number(n))).not.toHaveAttribute('data-pinned', '');
}

test('a card dropped in another container joins it at the drop point; the container under the pointer lights up', async ({ page }) => {
  await openBoard(page);
  const label = await card(page, 4).getAttribute('aria-label');
  const to = await emptyIn(page, 'review');
  await drag(page, await tabOf(page, 4), to, async () => {
    await expect(frame(page, 'review')).toHaveAttribute('data-drop', '');
    await expect(page.locator('vb-region[data-drop]')).toHaveCount(1);
  });
  await expect(page.locator('vb-region[data-drop]')).toHaveCount(0);
  await expect.poll(() => inFrame(page, 4, 'review')).toBe(true);
  await expect(card(page, 4)).toHaveAttribute('data-pinned', '');
  expect(await regionOf(page, 4)).toBe('review');
  // Its id, number and name never change (rule 10).
  await expect(card(page, 4)).toHaveAttribute('aria-label', label!);
  await expect(card(page, 4).locator('.vb-node-num')).toHaveText('4');
  await putBack(page, { 4: 'prove' });
});

test('a drop outside every container snaps back and writes nothing; a drop in its own container is a pin', async ({ page }) => {
  await openBoard(page);
  const before = { box: await card(page, 4).boundingBox(), head: await head(page) };
  await drag(page, await tabOf(page, 4), await background(page));
  await expect(page.locator('#wires')).not.toHaveClass(/settling/);
  expect(await card(page, 4).boundingBox()).toEqual(before.box);
  expect(await head(page)).toBe(before.head);
  await drag(page, await tabOf(page, 4), await emptyIn(page, 'prove'));
  await expect(card(page, 4)).toHaveAttribute('data-pinned', '');
  expect((await linesAfter(page, before.head)).map((e) => e.action)).toEqual(['pin']);
  await putBack(page, { 4: 'prove' });
});

test('dragging a selected card moves the whole selection, keeping offsets: one move with nodes, then the pins', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 1);
  await clickCard(page, 2, ['Shift']);
  const [b1, b2] = [(await card(page, 1).boundingBox())!, (await card(page, 2).boundingBox())!];
  const h0 = await head(page);
  await drag(page, await tabOf(page, 1), await emptyIn(page, 'decide'));
  await expect.poll(() => inFrame(page, 1, 'decide')).toBe(true);
  expect(await inFrame(page, 2, 'decide')).toBe(true);
  const [a1, a2] = [(await card(page, 1).boundingBox())!, (await card(page, 2).boundingBox())!];
  expect(Math.round(a2.x - a1.x)).toBe(Math.round(b2.x - b1.x));
  expect(Math.round(a2.y - a1.y)).toBe(Math.round(b2.y - b1.y));
  const lines = await linesAfter(page, h0);
  expect(lines[0]).toMatchObject({ action: 'move', nodes: [1, 2], region: 'decide' });
  expect(lines.slice(1).map((e) => [e.action, e.n]).sort()).toEqual([['pin', 1], ['pin', 2]]);
  expect(await selectedIds(page)).toEqual(['1', '2']);
  // An unselected card's tab moves only that card and leaves the selection as it is.
  await drag(page, await tabOf(page, 3), await emptyIn(page, 'decide'));
  await expect.poll(() => inFrame(page, 3, 'decide')).toBe(true);
  expect(await selectedIds(page)).toEqual(['1', '2']);
  expect(await regionOf(page, 2)).toBe('decide');
  await putBack(page, { 1: 'review', 2: 'review', 3: 'review' });
});

test('Later shows while a card is dragged; a drop there saves it for later, and dragging it out reopens it', async ({ page }) => {
  await openBoard(page);
  await expect(later(page)).toHaveCount(0);
  const from = await tabOf(page, 5);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 30, from.y + 30, { steps: 4 });
  await expect(later(page)).toBeVisible();
  await expect(later(page).getByRole('heading', { name: 'Later' })).toBeVisible();
  await expect(later(page).locator('.vb-region-empty')).toHaveText('Drop a card here to save it for later.');
  await page.mouse.move(...Object.values(await centre(page, later(page))) as [number, number], { steps: 6 });
  await expect(later(page)).toHaveAttribute('data-drop', '');
  await page.mouse.up();
  await expect.poll(() => inFrame(page, 5, 'later')).toBe(true);
  await expect(card(page, 5)).toHaveAttribute('data-status', 'later');
  await expect(page.locator('#counts [data-tone="later"] b')).toHaveText('1');
  expect(await regionOf(page, 5)).toBe('later');
  // Out of Later, into another container: moved there and reopened.
  await drag(page, await tabOf(page, 5), await emptyIn(page, 'review'));
  await expect.poll(() => inFrame(page, 5, 'review')).toBe(true);
  await expect(card(page, 5)).toHaveAttribute('data-status', 'open');
  await expect(later(page)).toHaveCount(0);
  await putBack(page, { 5: 'prove' });
});

test('L saves a card for later in the Later container; Reopen returns it to the container it came from', async ({ page }) => {
  await openBoard(page);
  await card(page, 6).focus();
  await page.keyboard.press('l');
  await expect(later(page)).toBeVisible();
  await expect.poll(() => inFrame(page, 6, 'later')).toBe(true);
  await expect(card(page, 6)).toHaveAttribute('data-status', 'later');
  await card(page, 6).focus();
  await page.keyboard.press('o');
  await expect(card(page, 6)).toHaveAttribute('data-status', 'open');
  await expect.poll(() => inFrame(page, 6, 'prove')).toBe(true);
  await expect(later(page)).toHaveCount(0);
  // The card's Later button does the same.
  await card(page, 6).getByRole('button', { name: /later/i }).click();
  await expect.poll(() => inFrame(page, 6, 'later')).toBe(true);
  await card(page, 6).getByRole('button', { name: /later/i }).click();
  await expect.poll(() => inFrame(page, 6, 'prove')).toBe(true);
  expect(await regionOf(page, 6)).toBe('prove');
});

test('Shift+M lists the containers, Later last; Enter moves the selection, Esc closes; the bar\'s Move to opens it too', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 1);
  await clickCard(page, 2, ['Shift']);
  await page.keyboard.press('Shift+M');
  await expect(menu(page)).toBeVisible();
  const items = menu(page).getByRole('menuitem');
  await expect(items).toHaveText(['Review', 'Prove the idea before code', 'Formats and decisions', 'Build in thin slices', 'Later']);
  await expect(items.first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(menu(page)).toHaveCount(0);
  await expect.poll(() => inFrame(page, 1, 'prove')).toBe(true);
  expect(await inFrame(page, 2, 'prove')).toBe(true);
  await page.keyboard.press('Shift+M');
  await expect(menu(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu(page)).toHaveCount(0);
  expect(await selectedIds(page)).toEqual(['1', '2']);
  await openSelectionBar(page);
  await page.locator('vb-selection-bar').getByRole('button', { name: 'Move to' }).click();
  await menu(page).getByRole('menuitem', { name: 'Review' }).click();
  await expect.poll(() => inFrame(page, 1, 'review')).toBe(true);
  expect(await regionOf(page, 2)).toBe('review');
});

for (const theme of THEMES) {
  test(`axe: the move list open and Later holding a card, ${theme}`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page);
    await card(page, 6).focus();
    await page.keyboard.press('l');
    await expect(later(page)).toBeVisible();
    // Every control at full size (the fit zoom's excuse, N13, is not needed).
    const scale = () => page.locator('#world').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a);
    for (let i = 0; i < 12 && (await scale()) < 1; i += 1) await page.keyboard.press('+');
    await card(page, 1).focus();
    await page.keyboard.press(' ');
    await page.keyboard.press('Shift+M');
    await expect(menu(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
    await card(page, 6).focus();
    await page.keyboard.press('o');
    await expect(later(page)).toHaveCount(0);
  });
}
