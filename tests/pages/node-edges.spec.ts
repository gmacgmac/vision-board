// The node with its marks on its edges (nodeEdges flag, D-099; FE_01), in the gallery with the flag on: the element
// builds the markup the template builds (the page and a server alike), every mark is reachable by Tab in the order
// drawn and named, the ring shows only after Tab, axe finds nothing, and the section matches its screenshots, light
// and dark. With the flag off the gallery shows no such section (gallery.spec.ts keeps its own screenshots).
import type { Locator, Page } from '@playwright/test';
import type { ViewNode } from '#format';
import { nodeTemplate, SKIN_DEFS } from '#ui';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['dark', 'light'];
const section = (page: Page): Locator => page.locator('section[data-feature="nodeEdges"]');
const RING: Record<Theme, string> = { dark: 'rgb(139, 155, 184)', light: 'rgb(90, 100, 120)' };

async function open(page: Page, flags = 'nodeEdges'): Promise<void> {
  await page.goto(`/gallery.html?flags=${flags}`);
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
}

test('off, the gallery has no edges section and no node draws a mark', async ({ page }) => {
  await open(page, '-nodeEdges');
  await expect(section(page)).toHaveCount(0);
  await expect(page.locator('vb-node [data-mark]')).toHaveCount(0);
});

test('the element builds the markup the template builds, so a server and the page draw one node', async ({ page }) => {
  await open(page);
  const nodes: ViewNode[] = [
    { id: '7', region: 'r', kind: 'decision', n: 7, title: 'Switch <now>?', body: 'A **bold** body', icon: 'x-dish', tone: 300, tags: ['Uplink'] },
    { id: '8', region: 'r', kind: 'finding', n: 8, title: 'Rain fade', icon: 'signal', tone: 'teal' },
    { id: '9', region: 'r', kind: 'question', n: 9, title: 'Book the truck?' },
  ];
  const library: [string, string[]][] = [['x-dish', ['M4 20l4-9 4 9', 'M6 16h4']]];
  for (const n of nodes) {
    const expected = nodeTemplate(n, { edges: SKIN_DEFS.default, idPrefix: 'cmp-', icons: new Map(library) });
    const [drawn, parsed] = await page.evaluate(({ n, library, expected, edges }) => {
      const el = document.createElement('vb-node') as HTMLElement & { render(n: unknown, o: unknown): void };
      el.render(n, { edges, idPrefix: 'cmp-', icons: new Map(library) });
      const t = document.createElement('template');
      t.innerHTML = expected;
      return [el.innerHTML, t.innerHTML];
    }, { n, library, expected, edges: SKIN_DEFS.default });
    expect(drawn, n.title).toBe(parsed);
  }
});

test('a tone reaches the node as data-vb-tone and --vb-tone-h through CSSOM, never a style attribute in the markup', async ({ page }) => {
  await open(page);
  const toned = section(page).locator('vb-node[data-vb-tone]');
  await expect(toned.first()).toBeVisible();
  const tones = await toned.evaluateAll((els) => els.map((e) => [e.getAttribute('data-vb-tone'), (e as HTMLElement).style.getPropertyValue('--vb-tone-h')]));
  expect(tones).toContainEqual(['teal', 'var(--vb-tone-hue-teal)']);
  expect(tones).toContainEqual(['hue', '300']);
});

test('every mark is reachable by Tab in the order drawn, named by its state, with a hit area past its edge', async ({ page }) => {
  await open(page);
  const card = section(page).locator('vb-node', { hasText: 'Same encoder profile for both feeds?' }).first();
  await card.focus();
  const order: (string | null)[] = [];
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('Tab');
    order.push(await page.evaluate(() => document.activeElement?.getAttribute('data-mark') ?? null));
  }
  expect(order).toEqual(['number', 'answer', 'badge', 'notes']);
  await expect(card.locator('[data-mark="number"]')).toHaveAttribute('aria-label', /^Bookmark item \d+ \(B\)$/);
  await expect(card.locator('[data-mark="answer"]')).toHaveAttribute('aria-label', /, waiting for your answer \(A tick, X cross\)$/);
  await expect(card.locator('[data-mark="notes"]')).toHaveAttribute('aria-label', /^2 notes on item \d+, agent replied \(C\)$/);
  const num = card.locator('[data-mark="number"]');
  const box = (await num.boundingBox())!;
  const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.getAttribute('data-mark'), [box.x - 2, box.y + box.height / 2]);
  expect(hit, 'the number takes a press 2px outside it').toBe('number');
});

for (const theme of THEMES) {
  test(`the ring shows after Tab, never after a press, in the calm slate (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page);
    const card = section(page).locator('vb-node', { hasText: 'Go-ahead to install' }).first();
    const num = card.locator('[data-mark="number"]');
    await num.click();
    await expect(num).toHaveCSS('outline-style', 'none');
    await card.focus();
    await page.keyboard.press('Tab');
    await expect(num).toBeFocused();
    await expect(num).toHaveCSS('outline-style', 'solid');
    await expect(num).toHaveCSS('outline-color', RING[theme]);
  });

  test(`axe finds nothing with the edges on, and the section matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page);
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`node-edges-${theme}.png`);
  });
}
