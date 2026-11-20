// The node with its marks on its edges (D-099; FE_01), in the gallery: the element
// builds the markup the template builds (the page and a server alike), every mark is reachable by Tab in the order
// drawn and named, the ring shows only after Tab, axe finds nothing, and the section matches its screenshots, light
// and dark.
import type { Locator, Page } from '@playwright/test';
import type { ViewNode } from '#format';
import { nodeTemplate, SKIN_DEFS } from '#ui';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['dark', 'light'];
const section = (page: Page): Locator => page.locator('section[data-feature="node-edges"]');
const RING: Record<Theme, string> = { dark: 'rgb(96, 165, 250)', light: 'rgb(37, 99, 235)' };

async function open(page: Page): Promise<void> {
  await page.goto('/gallery.html');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
}

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

test('the built CSS keeps the kind tab centred on the node\'s top at any mark growth (translate, not a merged transform)', async ({ page }) => {
  await open(page);
  const card = section(page).locator('vb-node', { hasText: 'Same encoder profile for both feeds?' }).first();
  const tab = card.locator('.vb-node-kind, .vb-node-grip').first();
  for (const grow of ['1', '2.5']) {
    await card.evaluate((n, g) => n.parentElement!.style.setProperty('--vb-mark-grow', g), grow);
    const [c, t] = [(await card.boundingBox())!, (await tab.boundingBox())!];
    expect(Math.abs(t.x + t.width / 2 - (c.x + c.width / 2)), `centred at growth ${grow}`).toBeLessThanOrEqual(1);
  }
  expect(await tab.evaluate((e) => getComputedStyle(e).transform)).toBe('none');
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

test('the disc is 24px on the marks\' line with a tick and cross while waiting; the body is 15px under the 16px title (D-112, point 668)', async ({ page }) => {
  await open(page);
  const card = section(page).locator('vb-node', { hasText: 'Go-ahead to install' }).first();
  const disc = card.locator('[data-mark="answer"]');
  const [d, c, n] = [(await disc.boundingBox())!, (await card.boundingBox())!, (await card.locator('[data-mark="notes"]').boundingBox())!];
  expect([Math.round(d.width), Math.round(d.height)]).toEqual([24, 24]);
  // 34px in from the right, inside the node's 1px border.
  expect(Math.abs(c.x + c.width - 1 - (d.x + d.width / 2) - 34)).toBeLessThanOrEqual(0.5);
  expect(Math.abs(d.x + d.width / 2 - (n.x + n.width / 2))).toBeLessThanOrEqual(0.5);
  await expect(disc.locator('.vb-mark-wait')).toBeVisible();
  const size = (sel: string) => card.locator(sel).first().evaluate((el) => getComputedStyle(el).fontSize);
  expect(await size('.vb-node-title')).toBe('16px');
  expect(await size('.vb-node-body')).toBe('15px');
  expect(await size('.vb-node-body > *')).toBe('15px');
});

for (const theme of THEMES) {
  test(`the ring shows after Tab, never after a press, in the one focus colour (${theme})`, async ({ page }) => {
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
