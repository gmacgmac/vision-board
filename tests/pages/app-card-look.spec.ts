// The app card's look (FIX_02; design/mockups/app-node/app-node-states.html, states 1-4): one border in every state and
// no selection ring or outline; a line along the top inside the border, an overlay with the frame's own radius, gentle on
// hover, the full accent when selected or active (the app clicked into), the title at full ink then; the bottom corners
// 2px, the top ones the skin's node radius. Keyboard focus keeps its own look. Both skins, light and dark.
import type { Locator, Page } from '@playwright/test';
import type { AppServer } from './app-server.ts';
import { CALCULATOR, startAppServer } from './app-server.ts';
import { expect, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const FLAGS = '-appFit';
let s: AppServer;
let boards = 0;

test.beforeAll(async () => { s = await startAppServer(); });
test.afterAll(async () => { await s.close(); });

const win = (page: Page) => page.locator('vb-node[data-window]');
const frame = (page: Page) => win(page).locator('vb-app-frame');

async function open(page: Page, skin?: string): Promise<void> {
  const board = `look-${(boards += 1)}`;
  await s.write(board, [{ type: 'board', title: 'Tools', ...(skin && { skin }) }, { type: 'region', region: { id: 't', title: 'Tools', mode: 'row' } },
    { type: 'node', node: { region: 't', ...CALCULATOR } }]);
  await page.goto(`${s.base}/?flags=${FLAGS}#${board}`);
  await expect(frame(page)).toHaveAttribute('data-state', 'ready');
}

/** What the person sees of the card's edge: its border, outline and shadow, and the overlay's line. */
const edge = (node: Locator) => node.evaluate((e) => {
  const c = getComputedStyle(e);
  const o = getComputedStyle(e, '::before');
  const probe = document.createElement('i');
  probe.style.color = 'var(--vb-accent)';
  e.append(probe);
  const accent = getComputedStyle(probe).color;
  probe.remove();
  const name = getComputedStyle(e.querySelector('.vb-win-name')!).color;
  return {
    border: [c.borderTopWidth, c.borderRightWidth, c.borderBottomWidth, c.borderLeftWidth], borderStyle: c.borderTopStyle, outline: c.outlineStyle,
    shadow: c.boxShadow, radius: [c.borderTopLeftRadius, c.borderTopRightRadius, c.borderBottomRightRadius, c.borderBottomLeftRadius],
    line: o.boxShadow, lineContent: o.content, lineRadius: o.borderTopLeftRadius, accent, name,
  };
});

for (const [skin, theme] of [[undefined, 'light'], [undefined, 'dark'], ['command-lens', 'light'], ['command-lens', 'dark']] as const) {
  test(`the app card: one border, no ring, a top line by state, bottom corners 2px (${skin ?? 'default'}, ${theme})`, async ({ page }) => {
    await setTheme(page, theme as Theme);
    await open(page, skin);
    await page.mouse.move(5, page.viewportSize()!.height - 5);
    const idle = await edge(win(page));
    expect(idle.border, 'one 1px border').toEqual(['1px', '1px', '1px', '1px']);
    expect(idle.radius.slice(0, 2).every((r) => r === idle.radius[0]) && idle.radius[0] !== '0px').toBe(true);
    expect(idle.radius.slice(2), 'bottom corners 2px').toEqual(['2px', '2px']);
    expect(idle.lineRadius, 'the line follows the frame\'s radius').toBe(idle.radius[0]);
    expect(idle.line, 'a transparent line at rest').toContain('rgba(0, 0, 0, 0)');
    expect(idle.line.includes(idle.accent) && idle.line.includes('inset'), 'no accent line at rest').toBe(false);

    // Hover: a gentle line, not the full accent.
    await win(page).locator('.vb-win-bar').hover();
    const hover = await edge(win(page));
    expect(hover.line).toContain('inset');
    expect(hover.line).not.toContain(hover.accent);
    expect(hover.border).toEqual(idle.border);

    // Selected: the full accent line, the same border, no ring, no outline.
    await win(page).locator('.vb-win-bar .vb-win-name').click();
    await expect(win(page)).toHaveAttribute('data-selected', '');
    await page.mouse.move(5, page.viewportSize()!.height - 5);
    const sel = await edge(win(page));
    expect(sel.line).toContain(sel.accent);
    expect(sel.line).toMatch(/0px 2px 0px 0px inset/);
    expect(sel.border).toEqual(idle.border);
    expect(sel.radius).toEqual(idle.radius);
    expect(sel.outline, 'no outline').toBe('none');
    expect(sel.shadow, 'no ring: the shadow is the resting one').toBe(idle.shadow);

    // Active: the same line, the title at full ink.
    await frame(page).click();
    await expect(frame(page)).toHaveAttribute('data-active', '');
    await expect(win(page)).toHaveAttribute('data-selected', '');
    await page.mouse.move(5, page.viewportSize()!.height - 5);
    const act = await edge(win(page));
    expect(act.line).toContain(act.accent);
    expect(act.outline, 'no outline').toBe('none');
    expect(act.shadow).toBe(idle.shadow);
    expect(act.border).toEqual(idle.border);
    const ink = await page.evaluate(() => { const p = document.createElement('i'); p.style.color = 'var(--vb-ink-strong)'; document.querySelector('vb-node[data-window]')!.append(p); const c = getComputedStyle(p).color; p.remove(); return c; });
    expect(act.name).toBe(ink);
    await win(page).locator('.vb-win-bar').hover();
    expect((await edge(win(page))).line, 'hovering keeps the full line').toContain(act.accent);
  });
}

test('the gallery shows the app card selected and active, in both skins, with the same border and no ring', async ({ page }) => {
  await page.goto('/gallery.html?flags=appCards');
  for (const skin of ['default', 'command-lens']) {
    const list = page.getByRole('list', { name: `App window, selected and active, ${skin}` });
    await expect(list.locator('vb-node[data-window][data-selected]')).toHaveCount(2);
    await expect(list.locator('vb-app-frame[data-active]')).toHaveCount(1);
    for (const node of await list.locator('vb-node[data-window]').all()) {
      const e = await edge(node);
      expect(e.border).toEqual(['1px', '1px', '1px', '1px']);
      expect(e.radius.slice(2)).toEqual(['2px', '2px']);
      expect(e.line).toContain(e.accent);
      expect(e.outline).toBe('none');
    }
  }
});
