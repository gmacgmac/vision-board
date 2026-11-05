// Heading sizes, tables and breaks (markdownMore flag, PLAN decisions 7-9, insert-markdown-signals MD_01),
// on the gallery's Markdown section: the three heading sizes differ and grow with --vb-md-text (a
// popover's text), a 4-column table with long words never overflows at the card's widest (L, where a
// table puts it) and narrowest (S, the person's pick) tier, a break draws a line, and heading and cell
// text pass APCA's reading tier (Lc 60) in light and dark. Also: the page's two table rules (the
// renderer's and the card size's, packages/ui and packages/layout, which may not import each other)
// agree on the same inputs.
import type { Locator, Page } from '@playwright/test';
import { measureBody } from '#layout';
import { renderMarkdown } from '#ui';
import { draw, open, write } from './agent-board.ts';
import { lc, pixel, resolved } from './apca.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['dark', 'light'];

const group = (page: Page) => page.locator('.g-group').filter({ has: page.locator('vb-node[data-sample="markdown-more"]') });
const sample = (page: Page, title: string) => page.locator('vb-node[data-sample="markdown-more"]').filter({ has: page.locator(`h3:text-is("${title}")`) });
const px = (l: Locator, prop: 'fontSize' | 'borderTopWidth' | 'height') => l.evaluate((e, p) => parseFloat(getComputedStyle(e)[p]), prop);

/** Nothing in the card is wider than the box that holds it: the body, the table, each cell. */
const overflows = (card: Locator) => card.evaluate((n) => [...n.querySelectorAll('.vb-node-body, table, th, td')]
  .filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => `${e.tagName} ${e.textContent?.slice(0, 20)}`));

test('the renderer and the card size agree on what is a table', () => {
  const inputs = [
    '| a | b |\n|---|---|', 'a | b\n--|--', '| a |\n|:-:|', 'Intro:\n| a | b |\n|---|---|\n| 1 | 2 |',
    '> | a | b |\n> |---|---|', '| a | b | c | d |\n|---|---|---|---|', '| a | b | c | d | e |\n|---|---|---|---|---|',
    'a\n---', '| a | b |\n|---|', '| a |\n\n|---|', '```\n| a |\n|---|\n```', '# a | b\n|-|-|', 'a | b\n- | -',
    '| a\\|b |\n|---|', 'a\n:-:',
  ];
  for (const src of inputs) expect(measureBody(src).table, src).toBe(renderMarkdown(src, { more: true }).includes('<table'));
});

test.describe('on the gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/gallery.html');
    await expect(group(page)).toBeVisible();
  });

  test('# is large, ## medium, ### the label; all headings at the caller\'s level, and they grow with the popover text', async ({ page }) => {
    const card = sample(page, 'Heading sizes');
    const [h1, h2, h3] = [card.locator('.vb-md-h1'), card.locator('.vb-md-h2'), card.locator('.vb-md-label')];
    for (const h of [h1, h2, h3]) {
      await expect(h).toHaveAttribute('role', 'heading');
      await expect(h).toHaveAttribute('aria-level', '4');
    }
    const sizes = [await px(h1, 'fontSize'), await px(h2, 'fontSize'), await px(h3, 'fontSize')];
    const body = await px(card.locator('.vb-md-p').first(), 'fontSize');
    expect(sizes[0]).toBeGreaterThan(sizes[1]!);
    expect(sizes[1]).toBeGreaterThan(body);
    expect(sizes[2]).toBeLessThan(body);
    // A popover sets --vb-md-text to its own size: the large and medium headings keep their steps above it.
    await card.locator('.vb-node-body').evaluate((b) => (b as HTMLElement).style.setProperty('--vb-md-text', '15px'));
    expect(await px(h1, 'fontSize') - 15).toBe(sizes[0]! - body);
    expect(await px(h2, 'fontSize') - 15).toBe(sizes[1]! - body);
  });

  test('a 4-column table with long words never overflows, at L (where a table puts the card) and at S', async ({ page }) => {
    const wide = sample(page, 'A table');
    const narrow = sample(page, 'A table at S, with long words');
    await expect(wide).toHaveAttribute('data-size', 'l');
    await expect(narrow).toHaveAttribute('data-size', 's');
    for (const card of [wide, narrow]) {
      await expect(card.locator('table.vb-md-table th[scope="col"]')).toHaveCount(4);
      expect(await overflows(card)).toEqual([]);
      // The table is the body's width.
      const [table, body] = await card.evaluate((n) => [n.querySelector('table')!.offsetWidth, n.querySelector<HTMLElement>('.vb-node-body')!.clientWidth]);
      expect(table).toBe(body);
    }
    // Alignment from the delimiter row, and inline Markdown in a cell.
    await expect(wide.locator('th').nth(1)).toHaveClass('vb-md-right');
    await expect(wide.locator('th').nth(3)).toHaveClass('vb-md-center');
    expect(await wide.locator('td').nth(1).evaluate((e) => getComputedStyle(e).textAlign)).toBe('right');
    await expect(wide.locator('td strong')).toHaveText('Starter');
    // Five columns are not a table.
    await expect(sample(page, 'Five columns stay text').locator('table')).toHaveCount(0);
  });

  test('a thematic break draws one line, also straight under a paragraph line', async ({ page }) => {
    const rules = sample(page, 'Breaks').locator('hr.vb-md-rule');
    await expect(rules).toHaveCount(2);
    for (const r of await rules.all()) {
      await expect(r).toBeVisible();
      expect(await px(r, 'borderTopWidth')).toBe(1);
    }
  });

  for (const theme of THEMES) {
    test(`heading and cell text pass Lc 60, axe passes, and the samples match their screenshot (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      const card = await pixel(page, await resolved(page, 'var(--vb-surface-card)'));
      const colour = async (l: Locator, p: 'color' | 'backgroundColor') => pixel(page, await l.evaluate((e, q) => getComputedStyle(e)[q], p));
      const headings = sample(page, 'Heading sizes');
      const table = sample(page, 'A table');
      const th = table.locator('th').first();
      const found = {
        h1: lc(await colour(headings.locator('.vb-md-h1'), 'color'), card),
        h2: lc(await colour(headings.locator('.vb-md-h2'), 'color'), card),
        th: lc(await colour(th, 'color'), await colour(th, 'backgroundColor')),
        td: lc(await colour(table.locator('td').first(), 'color'), card),
      };
      for (const [name, value] of Object.entries(found)) expect(value, `${name} Lc ${value.toFixed(1)}`).toBeGreaterThanOrEqual(60);
      await expectNoAxeViolations(page);
      await expect(group(page)).toHaveScreenshot(`markdown-more-${theme}.png`);
    });
  }
});

test('flag off: the gallery draws no heading-size, table or break samples', async ({ page }) => {
  await page.goto('/gallery.html?flags=-markdownMore');
  await expect(page.locator('section[data-pattern="markdown"] vb-node').first()).toBeVisible();
  await expect(page.locator('vb-node[data-sample="markdown-more"]')).toHaveCount(0);
});

test('on the board: the flag on draws the heading size, the table and the line; ?flags=-markdownMore draws D-023\'s text', async ({ page, request }) => {
  const d = await draw(request, 1, 'markdown-more');
  await write(request, d, [{ type: 'node', n: d.n[0], node: { region: 'p', kind: 'question', title: 'Card 1',
    body: '# Plans\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n---\n\nAfter.' } }]);
  const body = page.locator('vb-node .vb-node-body');
  await open(page, d);
  await expect(body.locator('.vb-md-h1')).toHaveText('Plans');
  await expect(body.locator('table.vb-md-table td')).toHaveCount(2);
  await expect(body.locator('hr.vb-md-rule')).toHaveCount(1);
  await open(page, d, '?flags=-markdownMore');
  await expect(body.locator('.vb-md-label')).toHaveText('Plans');
  await expect(body.locator('.vb-md-h1, table, hr')).toHaveCount(0);
  await expect(body).toContainText('| a | b |');
});
