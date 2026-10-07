// Connectors behind cards (D-032, wireLayers flag, rule 12), on by default: the connector layer
// sits behind the frames and cards, cards are 70% opaque (--vb-card-fill), and the focused card's
// connectors draw again in #wires-top above the cards. With ?flags=-wireLayers none of it applies.
// The gallery's See-through cards section is checked here too. Read-only on the board; runs after
// the other specs on the same server. The roadmap fixture has 14 links; card 7 has four (7>8, 7>9, 7>10, 7>11), card 4 one (4>5), card 1 none.
import type { Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const NODES = 17;
const THEMES: Theme[] = ['dark', 'light'];

const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);

async function openBoard(page: Page, query = ''): Promise<void> {
  await page.goto(`/${query}`);
  await expect(page.locator('vb-node')).toHaveCount(NODES);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
  await expect(page.locator('#wires')).not.toHaveClass(/settling/);
}

/** The alpha of the card fill, read from a probe so the card's own gradient doesn't hide it. */
const fillAlpha = (page: Page) => page.locator('#world').evaluate((world) => {
  const probe = document.createElement('div');
  probe.style.background = 'var(--card-surface, var(--vb-surface-card))';
  world.append(probe);
  const colour = getComputedStyle(probe).backgroundColor;
  probe.remove();
  const alpha = /\/ ([\d.]+)\)$/.exec(colour);
  return alpha ? Number(alpha[1]) : 1;
});

test('flag on by default: connectors sit behind the cards, cards are 70% opaque, the focused card\'s connectors draw above', async ({ page }) => {
  await openBoard(page);
  await expect(page.locator('#world')).toHaveAttribute('data-wire-layers', '');
  await expect(page.locator('#wires')).toHaveCSS('z-index', '-1');
  await expect(page.locator('#wires-top')).toHaveCSS('z-index', '1');
  expect(await fillAlpha(page)).toBeCloseTo(0.7, 2);
  await expect(page.locator('#wires-top path')).toHaveCount(0);
  // Card 7 has four connectors; card 4 one. The connectors are repeated, hot, in the top layer.
  await card(page, 7).focus();
  await expect(page.locator('#wires-top path.hot')).toHaveCount(4);
  await card(page, 4).focus();
  await expect(page.locator('#wires-top path.hot')).toHaveCount(1);
  await card(page, 1).focus();
  await expect(page.locator('#wires-top path')).toHaveCount(0);
  // The base layer still holds every connector.
  await expect(page.locator('#wires path.vb-wire')).toHaveCount(14);
});

test('flag off (?flags=-wireLayers): no layers, opaque cards, the top layer stays empty', async ({ page }) => {
  await openBoard(page, '?flags=-wireLayers');
  await expect(page.locator('#world')).not.toHaveAttribute('data-wire-layers', '');
  await expect(page.locator('#wires')).not.toHaveCSS('z-index', '-1');
  expect(await fillAlpha(page)).toBe(1);
  await card(page, 7).focus();
  await expect(page.locator('#wires path.vb-wire.hot')).toHaveCount(4);
  await expect(page.locator('#wires-top path')).toHaveCount(0);
});

// ---- The gallery's See-through cards section ----

const section = (page: Page) => page.locator('section[data-feature="wireLayers"]');

test('gallery: the See-through cards section shows by default and not with -wireLayers', async ({ page }) => {
  await page.goto('/gallery.html?flags=-wireLayers');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  await expect(section(page)).toBeVisible();
  const stage = section(page).locator('.g-wire-stage');
  await expect(stage.locator('.vb-wires:not(.vb-wires-top) path')).toHaveCount(2);
  await expect(stage.locator('.vb-wires-top path.hot')).toHaveCount(1);
  await expect(stage.locator('vb-node')).toHaveCount(2);
  await expect(stage.locator('.vb-wires:not(.vb-wires-top)')).toHaveCSS('z-index', '-1');
});

for (const theme of THEMES) {
  test(`gallery: See-through cards passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`see-through-${theme}.png`);
  });
}
