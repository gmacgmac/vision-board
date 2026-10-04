// The gallery page (gallery.html): every pattern in every state, drawn from the fixture ledger.
// Sections come from the patterns' own pattern.json files, so this file reads the same folder:
// a pattern added without a gallery entry fails the first test.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

interface PatternInfo { name: string; title: string; tag: string }

const UI = fileURLToPath(new URL('../../packages/ui/src/', import.meta.url));
const PATTERNS: PatternInfo[] = readdirSync(UI, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`${UI}${d.name}/pattern.json`))
  .map((d) => JSON.parse(readFileSync(`${UI}${d.name}/pattern.json`, 'utf8')) as PatternInfo);

const THEMES: Theme[] = ['dark', 'light'];
const KINDS = ['question', 'finding', 'decision', 'risk', 'action'];
const STATUSES = ['open', 'acknowledged', 'dropped', 'commented', 'context', 'later'];

test.beforeEach(async ({ page }) => {
  await page.goto('/gallery.html');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
});

test('every pattern has a section with samples of its own element', async ({ page }) => {
  expect(PATTERNS.length).toBeGreaterThan(0);
  await expect(page.locator('section[data-pattern]')).toHaveCount(PATTERNS.length);
  for (const p of PATTERNS) {
    const section = page.locator(`section[data-pattern="${p.name}"]`);
    await expect(section.getByRole('heading', { level: 2, name: p.title })).toBeVisible();
    await expect(section.locator(p.tag).first(), `${p.name}: no <${p.tag}> drawn`).toBeVisible();
    await expect(section.locator('.g-missing')).toHaveCount(0);
  }
});

test('node: every kind in every status it can reach', async ({ page }) => {
  const matrix = page.locator('section[data-pattern="node"] .g-matrix');
  for (const kind of KINDS) {
    for (const status of STATUSES) {
      // A finding offers no Drop, so there is no dropped finding.
      const count = kind === 'finding' && status === 'dropped' ? 0 : 1;
      await expect(matrix.locator(`vb-node[data-kind="${kind}"][data-status="${status}"]`), `${kind} / ${status}`).toHaveCount(count);
    }
  }
  await expect(matrix.locator('vb-node')).toHaveCount(29);
});

test('node: the other states are drawn', async ({ page }) => {
  const node = page.locator('section[data-pattern="node"]');
  await expect(node.locator('vb-node[data-pinned]')).toHaveCount(1);
  await expect(node.locator('vb-node[data-emphasis]')).toHaveCount(1);
  await expect(node.locator('vb-node.dragging')).toHaveCount(1);
  await expect(node.locator('.vb-node-tags li')).toHaveCount(3);
  await expect(node.locator('.vb-node-notes').filter({ hasText: 'You: Ship it' })).toBeVisible();
  await expect(node.locator('.vb-node-notes').filter({ hasText: '2 notes ·' })).toBeVisible();
  await expect(node.locator('.vb-node-notes').filter({ hasText: '3 notes · Asked for context:' })).toBeVisible();
  // Topics and notes are not items: no number, no status, no buttons.
  for (const kind of ['topic', 'note']) {
    const card = node.locator(`vb-node[data-kind="${kind}"]`);
    await expect(card).toHaveCount(1);
    await expect(card.locator('button')).toHaveCount(0);
    await expect(card.locator('.vb-node-num')).toHaveCount(0);
  }
});

test('region: each mode, Reset places, the empty message and no count', async ({ page }) => {
  const frames = page.locator('section[data-pattern="region"] vb-region');
  await expect(frames).toHaveCount(8);
  for (const mode of ['grid', 'flow', 'lanes', 'radial', 'list']) {
    const frame = frames.filter({ has: page.locator(`h2:text-is("${mode[0]!.toUpperCase()}${mode.slice(1)} mode")`) });
    await expect(frame).toHaveAttribute('data-mode', mode);
    await expect(frame.locator('.vb-region-count')).toHaveText('1/2 decided');
    await expect(frame.locator('button[data-mode][aria-pressed="true"]')).toHaveCount(1);
  }
  await expect(frames.locator('button[data-reset]:visible')).toHaveCount(1);
  await expect(frames.locator('.vb-region-empty:visible')).toHaveCount(1);
  const bare = frames.filter({ has: page.locator('h2:text-is("No items, so no count")') });
  await expect(bare.locator('.vb-region-count')).toHaveText('');
});

test('theme button cycles system, light, dark', async ({ page }) => {
  const html = page.locator('html');
  const bodyColour = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await setTheme(page, 'light');
  const system = await bodyColour();
  await page.getByRole('button', { name: 'Theme: system' }).click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Theme: light' }).click();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  expect(await bodyColour()).not.toBe(system);
  await page.getByRole('button', { name: 'Theme: dark' }).click();
  await expect(html).not.toHaveAttribute('data-theme');
  expect(await bodyColour()).toBe(system);
});

for (const theme of THEMES) {
  test(`axe passes (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
  });

  test(`screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await expect(page).toHaveScreenshot(`gallery-${theme}.png`, { fullPage: true });
  });
}
