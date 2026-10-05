// The board page (index.html), served from a fresh copy of the roadmap fixture ledger (4 regions,
// 17 nodes, 16 of them items). The tests run in this order on one server: read-only checks and
// screenshots first, then the ones that answer items and change layouts, which change the ledger.
import type { Locator, Page } from '@playwright/test';
import { axeFindings, expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { REGION_HEAD } from '../../packages/layout/src/index.ts';

const NODES = 17;
const REGIONS = ['review', 'prove', 'decide', 'build'];
const MODES = ['Grid', 'Flow', 'Lanes', 'Radial', 'List'];
const THEMES: Theme[] = ['dark', 'light'];

const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);

/** Open the board and wait until it has drawn and stopped moving. */
async function openBoard(page: Page, query = ''): Promise<void> {
  await page.goto(`/${query}`);
  await expect(page.locator('vb-node')).toHaveCount(NODES);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
  await expect(page.locator('#wires')).not.toHaveClass(/settling/);
}

test('the board loads with every region and card', async ({ page }) => {
  await openBoard(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where Vision Board goes from here');
  await expect(page.locator('vb-region')).toHaveCount(REGIONS.length);
  for (const id of REGIONS) await expect(page.locator(`vb-region[data-region="${id}"]`)).toBeVisible();
  await expect(page.locator('vb-node:visible')).toHaveCount(NODES);
  await expect(page.locator('#counts')).toContainText('16 open');
  await expect(page.locator('#counts')).toContainText('0 decided');
});

test('Tab moves from card to card, in item number order', async ({ page }) => {
  await openBoard(page);
  const focused = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.closest('vb-node')?.getAttribute('data-id') ?? null);
  const onCard = () => page.evaluate(() => document.activeElement?.localName === 'vb-node');
  await card(page, 1).focus();
  for (const expected of ['2', '3', '4']) {
    // Each card's own buttons come first; the next Tab that lands on a card lands on the next card.
    let presses = 0;
    do {
      await page.keyboard.press('Tab');
      presses += 1;
    } while (!(await onCard()) && presses < 10);
    expect(await focused()).toBe(expected);
  }
});

for (const theme of THEMES) {
  // N8: below FAR_K the stage is "far" and both the cards' buttons (node.css) and the regions' mode
  // rows (region.css) hide, so nothing on the opening view draws under the 24px target size.
  test(`axe passes with nothing excused (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page);
    await expect(page.locator('#stage')).toHaveAttribute('data-zoom', 'far');
    await expect(page.locator('vb-region .vb-mode-row:visible')).toHaveCount(0);
    await expectNoAxeViolations(page);
  });

  test(`no card button draws under the target size at the fit-to-view zoom (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page);
    await expect(page.locator('#stage')).toHaveAttribute('data-zoom', 'far');
    await expect(page.locator('vb-node .vb-act:visible')).toHaveCount(0);
    const small = (await axeFindings(page)).filter((f) => f.id === 'target-size').flatMap((f) => f.targets);
    expect(small.filter((t) => t.includes('vb-act')), small.join('\n')).toEqual([]);
  });

  // With the agentAccess flag off (on by default), as every screenshot taken before a flag must be
  // (components.md § Feature flags); send-access.spec.ts covers the board with it on.
  test(`screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page, '?flags=-agentAccess');
    await expect(page).toHaveScreenshot(`board-${theme}.png`);
  });
}

// ---- From here on the tests change the ledger. ----

/** Zoom in with the + key until the stage is no longer "far", so the cards' buttons show (N8). */
async function zoomToButtons(page: Page): Promise<void> {
  for (let i = 0; i < 8 && (await page.locator('#stage[data-zoom="far"]').count()); i += 1) await page.keyboard.press('+');
  await expect(page.locator('#stage')).not.toHaveAttribute('data-zoom', 'far');
}

/** Zoom in until the world draws at 1:1 or larger, where every control is its full CSS size. */
async function zoomToFull(page: Page): Promise<void> {
  const scale = () => page.locator('#world').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a);
  for (let i = 0; i < 12 && (await scale()) < 1; i += 1) await page.keyboard.press('+');
  expect(await scale()).toBeGreaterThanOrEqual(1);
}

/** Pan with the wheel (scroll pans the board) until `target` sits in the middle of the stage. */
async function panTo(page: Page, target: Locator): Promise<void> {
  const b = (await target.boundingBox())!;
  const mid = { x: 800, y: 520 };
  await page.mouse.move(mid.x, mid.y);
  await page.mouse.wheel(b.x + b.width / 2 - mid.x, b.y + b.height / 2 - mid.y);
  await expect.poll(async () => {
    const now = (await target.boundingBox())!;
    return Math.abs(now.y + now.height / 2 - mid.y) < 4;
  }).toBe(true);
}

const row = (page: Page, region: string) => page.locator(`vb-region[data-region="${region}"] .vb-mode-row`);
const active = (page: Page) => page.evaluate(() => {
  const a = document.activeElement as HTMLElement | null;
  return { region: a?.closest('vb-region')?.getAttribute('data-region') ?? null, label: a?.getAttribute('aria-label') ?? null };
});

/** Focus the card first: focusing pans it into view, so its button can be clicked. */
async function clickOn(page: Page, n: number, name: string): Promise<void> {
  await card(page, n).focus();
  await card(page, n).getByRole('button', { name }).click();
}

test('ok, drop and comment work and survive a reload', async ({ page }) => {
  await openBoard(page);
  await zoomToButtons(page);
  await clickOn(page, 1, 'Acknowledge item 1 (A)');
  await expect(card(page, 1)).toHaveAttribute('data-status', 'acknowledged');
  await clickOn(page, 2, 'Drop item 2 (X)');
  await expect(card(page, 2)).toHaveAttribute('data-status', 'dropped');
  await clickOn(page, 3, 'Comment item 3 (C)');
  const dialog = page.getByRole('dialog', { name: 'Comment' });
  await dialog.getByLabel('Your note').fill('Check the wording.');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();

  const expectAnswers = async () => {
    await expect(card(page, 1)).toHaveAttribute('data-status', 'acknowledged');
    await expect(card(page, 1).getByRole('button', { name: /^Acknowledge item 1/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(card(page, 2)).toHaveAttribute('data-status', 'dropped');
    await expect(card(page, 3)).toHaveAttribute('data-status', 'commented');
    await expect(card(page, 3).locator('.vb-node-note-who')).toHaveText('Your note');
    await expect(card(page, 3).locator('.vb-node-note-text')).toHaveText('Check the wording.');
    await expect(page.locator('#counts')).toContainText('2 decided');
    await expect(page.getByRole('button', { name: 'Reply (3)' })).toBeVisible();
  };
  await expectAnswers();
  await page.reload();
  await expect(page.locator('vb-node')).toHaveCount(NODES);
  await zoomToButtons(page);
  await expectAnswers();
});

/** Where each card of a region sits and how big the region's frame is, in screen pixels. */
async function placement(page: Page, region: string, ids: string[]) {
  return page.evaluate(({ region, ids }) => {
    const rect = (e: Element) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    const frame = rect(document.querySelector(`vb-region[data-region="${region}"]`)!);
    const head = rect(document.querySelector(`vb-region[data-region="${region}"] .vb-region-head`)!);
    const cards = ids.map((id) => ({ id, hidden: (document.querySelector(`vb-node[data-id="${id}"]`) as HTMLElement).hidden,
      ...rect(document.querySelector(`vb-node[data-id="${id}"]`)!) }));
    return { frame, head, cards };
  }, { region, ids });
}

/** A mode "draws" when every card of the region is shown inside its frame and none covers another. */
function problemsOf(p: Awaited<ReturnType<typeof placement>>): string[] {
  const out: string[] = [];
  const slack = 1;
  for (const c of p.cards) {
    if (c.hidden || c.w === 0 || c.h === 0) out.push(`card ${c.id} is not shown`);
    const inside = c.x >= p.frame.x - slack && c.y >= p.frame.y - slack
      && c.x + c.w <= p.frame.x + p.frame.w + slack && c.y + c.h <= p.frame.y + p.frame.h + slack;
    if (!inside) out.push(`card ${c.id} is outside its region`);
  }
  // The top line straddles the frame's border; no card may reach up into it.
  for (const c of p.cards) {
    if (c.y < p.head.y + p.head.h) out.push(`card ${c.id} overlaps the frame's top line`);
  }
  for (const [i, a] of p.cards.entries()) {
    for (const b of p.cards.slice(i + 1)) {
      const apart = a.x + a.w <= b.x + slack || b.x + b.w <= a.x + slack || a.y + a.h <= b.y + slack || b.y + b.h <= a.y + slack;
      if (!apart) out.push(`cards ${a.id} and ${b.id} overlap`);
    }
  }
  return out;
}

test('each layout mode draws every region', async ({ page }) => {
  await openBoard(page);
  await zoomToButtons(page);
  const view = await (await page.request.get('/api/boards/roadmap')).json() as { view: { nodes: { id: string; region: string }[]; regions: { id: string; mode: string }[] } };
  for (const id of REGIONS) {
    const ids = view.view.nodes.filter((n) => n.region === id).map((n) => n.id);
    const region: Locator = page.locator(`vb-region[data-region="${id}"]`);
    const original = view.view.regions.find((r) => r.id === id)!.mode;
    for (const mode of [...MODES, original[0]!.toUpperCase() + original.slice(1)]) {
      // Each pick reveals the region, which can move its row out of the view: bring it back first.
      await panTo(page, region.locator('.vb-mode-row'));
      const icon = region.getByRole('radio', { name: mode, exact: true });
      await icon.click();
      await expect(region).toHaveAttribute('data-mode', mode.toLowerCase());
      await expect(icon).toHaveAttribute('aria-checked', 'true');
      await expect(region.locator('[role="radio"][aria-checked="true"]')).toHaveCount(1);
      await expect(page.locator('#wires')).not.toHaveClass(/settling/);
      await expect.poll(async () => problemsOf(await placement(page, id, ids)), { message: `${id} in ${mode}` }).toEqual([]);
    }
  }
});

test('the mode row by keyboard: one Tab stop, arrows move, Enter applies, Esc closes the popover', async ({ page }) => {
  await openBoard(page);
  await zoomToButtons(page);
  await panTo(page, row(page, 'review'));
  const review = page.locator('vb-region[data-region="review"]');
  const pop = review.locator('[role="tooltip"]');
  await expect(pop).toBeHidden();
  // Tab from the top of the page: the first region's row is one stop, on its checked layout.
  await page.locator('body').focus();
  for (let i = 0; i < 30 && (await active(page)).region !== 'review'; i += 1) await page.keyboard.press('Tab');
  expect(await active(page)).toEqual({ region: 'review', label: 'Grid' });
  await expect(review.locator('.vb-mode-row [tabindex="0"]')).toHaveCount(1);
  await expect(pop).toBeVisible();
  await expect(pop.locator('.vb-mtile[data-current]')).toHaveAttribute('data-tile', 'grid');
  await expect(pop).toContainText('The agent chose Grid for this container.');

  await page.keyboard.press('ArrowRight');
  expect(await active(page)).toEqual({ region: 'review', label: 'Flow' });
  const flow = review.getByRole('radio', { name: 'Flow', exact: true });
  await expect(flow).toHaveAttribute('aria-describedby', 'region-review-modes');
  await expect(pop.locator('.vb-mtile[data-hover]')).toHaveAttribute('data-tile', 'flow');
  await expect(review).toHaveAttribute('data-mode', 'grid');
  await page.keyboard.press('Enter');
  await expect(review).toHaveAttribute('data-mode', 'flow');
  await expect(flow).toHaveAttribute('aria-checked', 'true');
  await expect(pop).toBeHidden();
  expect((await active(page)).label).toBe('Flow');

  // Left wraps through the layouts; the cog is the row's last stop.
  await page.keyboard.press('ArrowLeft');
  expect((await active(page)).label).toBe('Grid');
  await expect(pop).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(pop).toBeHidden();
  expect((await active(page)).label).toBe('Grid');
  await page.keyboard.press('End');
  expect((await active(page)).label).toBe('Settings for Review');
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(review).toHaveAttribute('data-mode', 'grid');
  // Tab leaves the row in one press, and the checked layout is the stop again.
  await page.keyboard.press('Tab');
  expect((await active(page)).region).not.toBe('review');
  await expect(review.getByRole('radio', { name: 'Grid', exact: true })).toHaveAttribute('tabindex', '0');
});

test('hovering a layout icon shows the tiles, and leaving the row closes them', async ({ page }) => {
  await openBoard(page);
  await zoomToButtons(page);
  await panTo(page, row(page, 'review'));
  const review = page.locator('vb-region[data-region="review"]');
  const pop = review.getByRole('tooltip');
  await review.getByRole('radio', { name: 'Lanes', exact: true }).hover();
  await expect(pop).toBeVisible();
  await expect(pop.locator('.vb-mtile')).toHaveCount(5);
  await expect(pop.locator('.vb-mtile[data-hover]')).toHaveAttribute('data-tile', 'lanes');
  await expect(pop.locator('.vb-mtile[data-tile="lanes"] small')).toHaveText('Several flows side by side, one per lane');
  await expect(pop.locator('.vb-mtile[data-tile="lanes"] small')).toBeVisible();
  // The popover is an overlay: it reaches over the cards and moves nothing.
  const before = await card(page, 1).boundingBox();
  await pop.hover();
  await expect(pop).toBeVisible();
  expect(await card(page, 1).boundingBox()).toEqual(before);
  await page.mouse.move(800, 980);
  await expect(pop).toBeHidden();
});

test('the cog opens the settings menu; Reset places puts a moved card back, then shows disabled', async ({ page }) => {
  await openBoard(page);
  await zoomToButtons(page);
  await card(page, 1).focus();
  await page.keyboard.press('Alt+ArrowRight');
  await expect(card(page, 1)).toHaveAttribute('data-pinned', '');
  await panTo(page, row(page, 'review'));
  const review = page.locator('vb-region[data-region="review"]');
  const cog = review.getByRole('button', { name: 'Settings for Review' });
  const menu = review.getByRole('menu', { name: 'Settings for Review' });
  const reset = menu.getByRole('menuitem', { name: 'Reset places' });
  await expect(menu).toBeHidden();
  await cog.click();
  await expect(menu).toBeVisible();
  await expect(cog).toHaveAttribute('aria-expanded', 'true');
  await expect(reset).toBeFocused();
  await expect(reset).toHaveAttribute('aria-disabled', 'false');
  await expect(menu.getByText('No cards moved')).toBeHidden();
  await reset.click();
  await expect(card(page, 1)).not.toHaveAttribute('data-pinned', '');
  await expect(menu).toBeHidden();
  await expect(cog).toBeFocused();
  await expect(cog).toHaveAttribute('aria-expanded', 'false');

  // Nothing moved now: the item stays, disabled, and says why; a click on it does nothing.
  await page.keyboard.press('ArrowDown');
  await expect(menu).toBeVisible();
  await expect(reset).toHaveAttribute('aria-disabled', 'true');
  await expect(menu.getByText('No cards moved')).toBeVisible();
  // aria-disabled keeps it focusable, so Playwright calls it not enabled: force the real click.
  await reset.click({ force: true });
  await expect(menu).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(cog).toBeFocused();
  // An outside click closes it too.
  await cog.click();
  await expect(menu).toBeVisible();
  await page.mouse.click(800, 980);
  await expect(menu).toBeHidden();
});

for (const theme of THEMES) {
  test(`axe passes with the popover and the settings menu open, at full size (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page);
    await zoomToFull(page);
    await panTo(page, row(page, 'review'));
    const review = page.locator('vb-region[data-region="review"]');
    await review.getByRole('radio', { name: 'Radial', exact: true }).hover();
    await expect(review.getByRole('tooltip')).toBeVisible();
    await expectNoAxeViolations(page);
    await review.getByRole('button', { name: 'Settings for Review' }).click();
    await expect(review.getByRole('menu')).toBeVisible();
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
  });
}

test('a region frame keeps REGION_HEAD of room under its top line, and the top line straddles the border', async ({ page }) => {
  await openBoard(page);
  for (const id of REGIONS) {
    const region = page.locator(`vb-region[data-region="${id}"]`);
    expect(await region.evaluate((e) => parseFloat(getComputedStyle(e).paddingTop)), id).toBe(REGION_HEAD);
    const { frame, head } = await region.evaluate((e) => {
      const f = e.getBoundingClientRect(), h = e.querySelector('.vb-region-head')!.getBoundingClientRect();
      return { frame: { top: f.top }, head: { top: h.top, bottom: h.bottom } };
    });
    expect(head.top, `${id}: the top line starts above the frame's top edge`).toBeLessThan(frame.top);
    expect(head.bottom, `${id}: the top line ends below the frame's top edge`).toBeGreaterThan(frame.top);
  }
});
