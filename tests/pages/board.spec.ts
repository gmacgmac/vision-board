// The board page (index.html), served from a fresh copy of the roadmap fixture ledger (4 regions,
// 17 nodes, 16 of them items). The tests run in this order on one server: read-only checks and
// screenshots first, then the ones that answer items and change layouts, which change the ledger.
import type { Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const NODES = 17;
const REGIONS = ['review', 'prove', 'decide', 'build'];
const MODES = ['Grid', 'Flow', 'Lanes', 'Radial', 'List'];
const THEMES: Theme[] = ['dark', 'light'];

const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);

/** Open the board and wait until it has drawn and stopped moving. */
async function openBoard(page: Page): Promise<void> {
  await page.goto('/');
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

/**
 * Known failure: axe `target-size` (WCAG 2.2 AA, 2.5.8). On the board's opening view the world is
 * zoomed out to fit, so the layout-mode buttons (.vb-mode) and the item buttons (.vb-act) are
 * drawn under 24 CSS pixels. The same buttons pass on the gallery at full size. Fixing it is a
 * UI change, not this task's. Remove the test.fail when it is fixed.
 */
const KNOWN_AXE = ['target-size'];

for (const theme of THEMES) {
  test(`axe passes apart from the known failure (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page);
    await expectNoAxeViolations(page, KNOWN_AXE);
  });

  test(`axe passes with nothing excused (${theme})`, async ({ page }) => {
    test.fail(true, 'Known failure: axe target-size, buttons under 24px at the fit-to-view zoom');
    await setTheme(page, theme);
    await openBoard(page);
    await expectNoAxeViolations(page);
  });

  test(`screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page);
    await expect(page).toHaveScreenshot(`board-${theme}.png`);
  });
}

// ---- From here on the tests change the ledger. ----

test('ok, drop and comment work and survive a reload', async ({ page }) => {
  await openBoard(page);
  await page.getByRole('button', { name: 'Acknowledge item 1 (A)' }).click();
  await expect(card(page, 1)).toHaveAttribute('data-status', 'acknowledged');
  await page.getByRole('button', { name: 'Drop item 2 (X)' }).click();
  await expect(card(page, 2)).toHaveAttribute('data-status', 'dropped');
  await page.getByRole('button', { name: 'Comment item 3 (C)' }).click();
  const dialog = page.getByRole('dialog', { name: 'Comment' });
  await dialog.getByLabel('Your note').fill('Check the wording.');
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expect(dialog).toBeHidden();

  const expectAnswers = async () => {
    await expect(card(page, 1)).toHaveAttribute('data-status', 'acknowledged');
    await expect(card(page, 1).getByRole('button', { name: /^Acknowledge item 1/ })).toHaveAttribute('aria-pressed', 'true');
    await expect(card(page, 2)).toHaveAttribute('data-status', 'dropped');
    await expect(card(page, 3)).toHaveAttribute('data-status', 'commented');
    await expect(card(page, 3).locator('.vb-node-notes')).toHaveText('You: Check the wording.');
    await expect(page.locator('#counts')).toContainText('2 decided');
    await expect(page.getByRole('button', { name: 'Reply (3)' })).toBeVisible();
  };
  await expectAnswers();
  await page.reload();
  await expect(page.locator('vb-node')).toHaveCount(NODES);
  await expectAnswers();
});

/** Where each card of a region sits and how big the region's frame is, in screen pixels. */
async function placement(page: Page, region: string, ids: string[]) {
  return page.evaluate(({ region, ids }) => {
    const rect = (e: Element) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
    const frame = rect(document.querySelector(`vb-region[data-region="${region}"]`)!);
    const cards = ids.map((id) => ({ id, hidden: (document.querySelector(`vb-node[data-id="${id}"]`) as HTMLElement).hidden,
      ...rect(document.querySelector(`vb-node[data-id="${id}"]`)!) }));
    return { frame, cards };
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
  const view = await (await page.request.get('/api/boards/roadmap')).json() as { view: { nodes: { id: string; region: string }[]; regions: { id: string; mode: string }[] } };
  for (const id of REGIONS) {
    const ids = view.view.nodes.filter((n) => n.region === id).map((n) => n.id);
    const region: Locator = page.locator(`vb-region[data-region="${id}"]`);
    const original = view.view.regions.find((r) => r.id === id)!.mode;
    for (const mode of [...MODES, original[0]!.toUpperCase() + original.slice(1)]) {
      const button = region.getByRole('button', { name: mode, exact: true });
      await button.click();
      await expect(region).toHaveAttribute('data-mode', mode.toLowerCase());
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#wires')).not.toHaveClass(/settling/);
      await expect.poll(async () => problemsOf(await placement(page, id, ids)), { message: `${id} in ${mode}` }).toEqual([]);
    }
  }
});
