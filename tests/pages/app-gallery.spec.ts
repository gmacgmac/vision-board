// App cards in the gallery (app-cards FE_01, FE_02; PLAN.md § Goal state line 6): the app-frame
// pattern's section has a sample of every app card state of ruling 10 and the flag off, and the
// app cards section (appCards flag) runs the example calculator's panel live in its card, served by
// the page tests' own board (playwright.config.ts copies the example into its project). Light and
// dark, axe on the page and in the panel, and the live section's screenshot. Beside gallery.spec.ts
// (the gallery's other checks), which is at its length limit.
import type { Frame, Page } from '@playwright/test';
import { APP_CARD_STATES } from '../../packages/ui/src/node/node-app.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['light', 'dark'];

/** The live section's card and its panel, once the panel is ready. */
async function livePanel(page: Page): Promise<Frame> {
  const frame = page.locator('section[data-feature="appCards"] vb-app-frame');
  await expect(frame).toHaveAttribute('data-state', 'ready');
  return (await (await frame.locator('iframe').elementHandle())!.contentFrame())!;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/gallery.html');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
});

test('app frame: the frame before it loads, an app card in every state of ruling 10, and the flag off', async ({ page }) => {
  const section = page.locator('section[data-pattern="app-frame"]');
  await expect(section.locator('vb-app-frame[data-state="loading"]')).toHaveCount(1);
  const states = await section.getByRole('list', { name: 'App card states' }).locator('.vb-app').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.appState));
  expect(states).toEqual(['checking', 'needs-approval', 'changed', 'ready', 'missing', 'invalid', 'broken', 'past']);
  expect(new Set(states)).toEqual(new Set(APP_CARD_STATES));
  await expect(section.getByRole('list', { name: 'App cards off' }).locator('.vb-node-body')).toHaveText('App cards are off.');
  // The node section's app cards draw their app's placeholder, not a "Loading…" that never ends.
  const kinds = page.locator('section[data-pattern="node"] vb-node[data-kind="app"] .vb-app');
  await expect(kinds.first()).toHaveAttribute('data-app-state', 'ready');
  await expect(page.locator('section[data-pattern="node"] vb-node[data-kind="app"] .vb-app[data-app-state="checking"]')).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`app cards: the example calculator runs live in its card, and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    const section = page.locator('section[data-feature="appCards"]');
    const panel = await livePanel(page);
    await expect(section.locator('.vb-app')).toHaveAttribute('data-app-state', 'needs-approval');
    await expect(section.locator('.vb-app-ask-text')).toHaveText('Allow this app to run?');
    await expect.poll(() => panel.evaluate(() => document.documentElement.style.colorScheme)).toBe(theme);
    await expect(panel.getByRole('button', { name: 'Equals' })).toBeVisible();
    await expectNoAxeViolations(page);
    await expectNoAxeViolations(panel);
    await expect(section).toHaveScreenshot(`app-cards-${theme}.png`);
  });
}

test('app cards: the gallery\'s theme button reaches the live panel', async ({ page }) => {
  await setTheme(page, 'light');
  const panel = await livePanel(page);
  await expect.poll(() => panel.evaluate(() => document.documentElement.style.colorScheme)).toBe('light');
  await page.getByRole('button', { name: 'Theme: system' }).click(); // to light
  await page.getByRole('button', { name: 'Theme: light' }).click(); // to dark
  await expect.poll(() => panel.evaluate(() => document.documentElement.style.colorScheme)).toBe('dark');
  await page.getByRole('button', { name: 'Theme: dark' }).click(); // back to the system's
  await expect.poll(() => panel.evaluate(() => document.documentElement.style.colorScheme)).toBe('light');
});
