// The gallery page (gallery.html): every pattern in every state, drawn from the fixture ledger.
// Sections come from the patterns' own pattern.json files, so this file reads the same folder:
// a pattern added without a gallery entry fails the first test.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

/** `tag` for a pattern with an element; `selector` for one that draws markup only (markdown). */
interface PatternInfo { name: string; title: string; tag?: string; selector?: string }

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
    const drawn = p.tag ?? p.selector!;
    await expect(section.locator(drawn).first(), `${p.name}: no ${drawn} drawn`).toBeVisible();
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
  const notes = node.locator('.vb-node-notes');
  await expect(notes.filter({ has: page.locator('.vb-node-note-who:text-is("Your note")') }).filter({ hasText: 'Ship it' })).toBeVisible();
  await expect(notes.locator('.vb-node-note-who:text-is("2 notes · Your note")')).toBeVisible();
  await expect(notes.locator('.vb-node-note-who:text-is("3 notes · You asked for more context")')).toBeVisible();
  // Topics and notes are not items: no number, no status, no buttons.
  for (const kind of ['topic', 'note']) {
    const card = node.locator(`vb-node[data-kind="${kind}"]`);
    await expect(card).toHaveCount(1);
    await expect(card.locator('button')).toHaveCount(0);
    await expect(card.locator('.vb-node-num')).toHaveCount(0);
  }
});

test('region: each mode, the count, the empty message and no count', async ({ page }) => {
  const frames = page.locator('section[data-pattern="region"] vb-region');
  await expect(frames).toHaveCount(8);
  for (const mode of ['grid', 'flow', 'lanes', 'radial', 'list']) {
    const frame = frames.filter({ has: page.locator(`h2:text-is("${mode[0]!.toUpperCase()}${mode.slice(1)} mode")`) });
    await expect(frame).toHaveAttribute('data-mode', mode);
    await expect(frame.locator('.vb-region-count')).toHaveText('1 of 2 decided');
    await expect(frame.locator('[role="radio"][aria-checked="true"]')).toHaveCount(1);
    await expect(frame.locator(`[role="radio"][data-mode="${mode}"]`)).toHaveAttribute('aria-checked', 'true');
    await expect(frame.locator('.vb-mode-row [tabindex="0"]')).toHaveCount(1);
  }
  await expect(frames.locator('.vb-region-empty:visible')).toHaveCount(1);
  const bare = frames.filter({ has: page.locator('h2:text-is("No items, so no count")') });
  await expect(bare.locator('.vb-region-count')).toHaveText('');
});

test('region: the open samples: the popover wide and compact, and the settings menu enabled and disabled', async ({ page }) => {
  const frame = (id: string) => page.locator(`section[data-pattern="region"] vb-region[data-region="${id}"]`);
  const wide = frame('frame-grid').getByRole('tooltip');
  await expect(wide).toBeVisible();
  await expect(wide.locator('.vb-mtile')).toHaveCount(5);
  await expect(wide.locator('.vb-mtile[data-current]')).toHaveAttribute('data-tile', 'grid');
  await expect(wide.locator('.vb-mtile[data-hover]')).toHaveAttribute('data-tile', 'flow');
  await expect(wide.locator('.vb-mtile small')).toHaveCount(5);
  await expect(wide.locator('.vb-mtile small').first()).toBeVisible();
  await expect(wide.locator('.vb-mode-line')).toBeHidden();
  await expect(frame('frame-grid').getByRole('radio', { name: 'Flow' })).toHaveAttribute('aria-describedby', 'region-frame-grid-modes');
  // Under 600px of frame: icon and name only, and the highlighted layout's one-liner once.
  const compact = frame('frame-empty').getByRole('tooltip');
  await expect(compact).toBeVisible();
  await expect(compact.locator('.vb-mtile small').first()).toBeHidden();
  await expect(compact.locator('.vb-mode-line')).toHaveText('One subject, everything related around it');
  expect((await compact.boundingBox())!.width).toBeLessThan((await wide.boundingBox())!.width);

  const enabled = frame('frame-pinned').getByRole('menu');
  await expect(enabled).toBeVisible();
  await expect(enabled.getByRole('menuitem', { name: 'Reset places' })).toHaveAttribute('aria-disabled', 'false');
  await expect(enabled.getByText('No cards moved')).toBeHidden();
  const disabled = frame('frame-bare').getByRole('menu');
  await expect(disabled.getByRole('menuitem', { name: 'Reset places' })).toHaveAttribute('aria-disabled', 'true');
  await expect(disabled.getByText('No cards moved')).toBeVisible();
  for (const id of ['frame-pinned', 'frame-bare'])
    await expect(frame(id).getByRole('button', { name: /^Settings for / })).toHaveAttribute('aria-expanded', 'true');
});

test('region: a narrow frame collapses the row to the checked icon and the cog, expanding on hover', async ({ page }) => {
  const frames = page.locator('section[data-pattern="region"] vb-region');
  const widths = await frames.evaluateAll((els) => els.map((e) => [(e as HTMLElement).dataset.region!, (e as HTMLElement).offsetWidth] as const));
  const narrowest = Math.min(...widths.map(([, w]) => w));
  const ids = widths.filter(([, w]) => w === narrowest).map(([id]) => id);
  expect(narrowest).toBeLessThan(440);
  const visible = (row: ReturnType<typeof frames.locator>) =>
    row.locator('.vb-mseg').evaluateAll((els) => els.filter((e) => (e as HTMLElement).getBoundingClientRect().width > 1).length);
  for (const id of ids) {
    const frame = page.locator(`section[data-pattern="region"] vb-region[data-region="${id}"]`);
    const row = frame.locator('.vb-mode-row');
    // Collapsed: the checked layout and the cog only (2), not 6.
    expect(await visible(row), `${id}: collapsed count`).toBe(2);
    const cut = (sel: string) => frame.locator(sel).evaluate((e) => e.scrollWidth > e.clientWidth);
    expect(await cut('h2'), `${id}: title ellipsized at ${narrowest}px`).toBe(false);
    // Hovering (or focusing) the row expands it to all five icons plus the cog, as an overlay.
    await row.hover();
    expect(await visible(row), `${id}: expanded count`).toBe(6);
    await page.mouse.move(0, 0);
    expect(await visible(row), `${id}: collapses again on leave`).toBe(2);
  }
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

test('markdown: one card per construct, one with everything, and a Markdown note', async ({ page }) => {
  const md = page.locator('section[data-pattern="markdown"]');
  for (const sel of ['p.vb-md-p', 'span.vb-md-label[role="heading"][aria-level="4"]', 'ul.vb-md-list', 'ol.vb-md-list',
    'blockquote.vb-md-quote', 'pre.vb-md-code > code', 'code.vb-md-icode', 'a.vb-md-link', 'strong', 'em', 'del']) {
    await expect(md.locator(`.vb-node-body ${sel}`).first(), sel).toBeVisible();
  }
  const everything = md.locator('vb-node').filter({ has: page.locator('h3:text-is("Everything at once")') });
  for (const sel of ['p.vb-md-p', '.vb-md-label', 'ul.vb-md-list', 'ol.vb-md-list', '.vb-md-quote', '.vb-md-code', '.vb-md-icode', '.vb-md-link']) {
    await expect(everything.locator(sel).first(), `everything: ${sel}`).toBeVisible();
  }
  // Raw HTML and a refused link stay text; every kept link has the fixed rel and target.
  await expect(md.locator('.vb-node-body b, .vb-node-body script, .vb-node-body img')).toHaveCount(0);
  await expect(md.getByText('<b>not bold</b>', { exact: false })).toBeVisible();
  await expect(md.getByRole('link', { name: 'relative link' })).toHaveCount(0);
  await expect(md.getByRole('link', { name: 'script link' })).toHaveCount(0);
  await expect(md.locator('a.vb-md-link')).toHaveCount(3);
  for (const a of await md.locator('a.vb-md-link').all()) {
    await expect(a).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(a).toHaveAttribute('target', '_blank');
  }
  // The note renders Markdown too and keeps its three-line clamp.
  const note = md.locator('.vb-node-note-text').filter({ has: page.locator('strong') });
  await expect(note).toBeVisible();
  expect(await note.evaluate((e) => getComputedStyle(e).webkitLineClamp)).toBe('3');
  // A long code block scrolls inside its cap and can be reached by keyboard.
  const code = md.locator('pre.vb-md-code').filter({ hasText: 'line 30' });
  expect(await code.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true);
  await expect(code).toHaveAttribute('tabindex', '0');
});

for (const theme of THEMES) {
  test(`markdown: axe passes and the section matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
    await expect(page.locator('section[data-pattern="markdown"]')).toHaveScreenshot(`markdown-${theme}.png`);
  });
}

for (const theme of THEMES) {
  test(`axe passes (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
  });

  // With the agentAccess flag off (on by default), so its section is not in the full page
  // (components.md § Feature flags); send-access.spec.ts has that section's own screenshots.
  test(`screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html?flags=-agentAccess');
    await expect(page.locator('section[data-pattern]').first()).toBeVisible();
    await expect(page).toHaveScreenshot(`gallery-${theme}.png`, { fullPage: true });
  });
}
