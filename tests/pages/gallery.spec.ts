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
  // 3_FE_01 ruling 2: 05's selected look, named in the card's label too.
  await expect(node.locator('vb-node[data-selected]')).toHaveCount(1);
  await expect(node.locator('vb-node[data-selected]')).toHaveAttribute('aria-label', /, selected$/);
  await expect(node.locator('.vb-node-tags li')).toHaveCount(3);
  const notes = node.locator('.vb-node-notes');
  await expect(notes.filter({ has: page.locator('.vb-node-note-who:text-is("Your note 1")') }).filter({ hasText: 'Ship it' })).toBeVisible();
  await expect(notes.filter({ hasText: 'Second thought, which replaces the first' })).toBeVisible();
  await expect(notes.locator('.vb-node-note-who:text-is("More context 1")').first()).toBeVisible();
  // The notes board: a pin per noted card, sent notes grey and marked, the count over several.
  await expect(notes.locator('.vb-node-notes-count:text-is("3 notes")')).toBeVisible();
  await expect(notes.locator('.vb-node-note[data-sent] .vb-node-note-who:text-is("Your note 2 · Sent")')).toBeVisible();
  await expect(node.locator('.vb-note-pin[data-sent]')).toHaveCount(1);
  // Topics and notes are not items: no number, no status, no buttons.
  for (const kind of ['topic', 'note']) {
    const card = node.locator(`vb-node[data-kind="${kind}"]`);
    await expect(card).toHaveCount(1);
    await expect(card.locator('button')).toHaveCount(0);
    await expect(card.locator('.vb-node-num')).toHaveCount(0);
  }
});

test('region: each mode, the count, the empty message and no count; Later and a drop target (3_FE_03)', async ({ page }) => {
  const frames = page.locator('section[data-pattern="region"] vb-region');
  // Ten frames, the three long titles (FE_03), then the eight container samples (3_FE_04) and the three container note states (step 4G).
  await expect(frames).toHaveCount(24);
  for (const mode of ['grid', 'flow', 'lanes', 'radial', 'list']) {
    const frame = frames.filter({ has: page.locator(`h2:text-is("${mode[0]!.toUpperCase()}${mode.slice(1)} mode")`) });
    await expect(frame).toHaveAttribute('data-mode', mode);
    await expect(frame.locator('.vb-region-count')).toHaveText('1 of 2 decided');
    await expect(frame.locator('[role="radio"][aria-checked="true"]')).toHaveCount(1);
    await expect(frame.locator(`[role="radio"][data-mode="${mode}"]`)).toHaveAttribute('aria-checked', 'true');
    await expect(frame.locator('.vb-mode-row [tabindex="0"]')).toHaveCount(1);
  }
  await expect(frames.locator('.vb-region-empty:visible')).toHaveCount(2);
  const bare = frames.filter({ has: page.locator('h2:text-is("No items, so no count")') });
  await expect(bare.locator('.vb-region-count')).toHaveText('');
  // Later: fixed (no layout icons, the cog its one stop), holding the fixture's two moved cards;
  // an empty one lit as the drop target, with its own empty message.
  const later = frames.filter({ has: page.locator('h2:text-is("Later")') });
  await expect(later).toHaveCount(2);
  for (const f of await later.all()) {
    await expect(f).toHaveAttribute('data-fixed', '');
    await expect(f.locator('[role="radio"]')).toHaveCount(0);
    await expect(f.locator('.vb-cog')).toHaveAttribute('tabindex', '0');
  }
  await expect(page.locator('vb-region[data-region="later"] .vb-region-count')).toHaveText(/of 2 decided$/);
  const drop = page.locator('vb-region[data-drop]');
  await expect(drop).toHaveCount(1);
  await expect(drop.locator('.vb-region-empty')).toHaveText('Drop a card here to save it for later.');
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

test('region: a narrow frame collapses the row to the checked icon, Comment and the cog, expanding on hover', async ({ page }) => {
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
    // Collapsed: the checked layout, Comment and the cog only (3), not 7.
    expect(await visible(row), `${id}: collapsed count`).toBe(3);
    const cut = (sel: string) => frame.locator(sel).evaluate((e) => e.scrollWidth > e.clientWidth);
    expect(await cut('h2'), `${id}: title ellipsized at ${narrowest}px`).toBe(false);
    // Hovering (or focusing) the row expands it to all five icons plus Comment and the cog, as an overlay.
    await row.hover();
    expect(await visible(row), `${id}: expanded count`).toBe(7);
    await page.mouse.move(0, 0);
    expect(await visible(row), `${id}: collapses again on leave`).toBe(3);
  }
});

test('region: the container samples (3_FE_04): grip and Comment in each look, the badge, the note preview and block, Put container back', async ({ page }) => {
  const frame = (id: string) => page.locator(`section[data-pattern="region"] vb-region[data-region="${id}"]`);
  for (const look of ['hover', 'focus', 'pressed'])
    await expect(frame(`c-${look}`).locator('.vb-region-grip'), look).toHaveAttribute('data-look', look);
  await expect(frame('c-hover').locator('.vb-region-comment')).toHaveAttribute('data-hover', '');
  for (const look of ['focus', 'pressed']) await expect(frame(`c-${look}`).locator('.vb-region-comment')).toHaveAttribute('data-look', look);
  // No pin or "Your note" line on the title line: Comment's badge "1", none with no note, bright
  // while unsent, quiet once sent (step 4G ruling 1).
  await expect(page.locator('section[data-pattern="region"] .vb-region-note-pin')).toHaveCount(0);
  await expect(frame('c-rest').locator('.vb-region-badge')).toBeHidden();
  await expect(frame('c-open')).toHaveAttribute('data-badge', 'unsent');
  await expect(frame('c-open')).toHaveAttribute('data-note-open', '');
  const sent = frame('c-sent');
  await expect(sent).toHaveAttribute('data-badge', 'sent');
  await expect(sent.locator('.vb-region-badge')).toBeVisible();
  // The preview open on "Hover"; the note block shown on "Note sent", read-only.
  await expect(frame('c-hover').locator('.vb-note-pop-text')).toHaveText('Is this group in the right order?');
  await expect(frame('c-hover').locator('.vb-note-pop')).toBeVisible();
  await expect(sent.locator('.vb-region-note-block .vb-nblock-text')).toHaveText('Should this wait for the next release?');
  await expect(sent.locator('.vb-region-note-block')).toBeVisible();
  await expect(sent.locator('.vb-region-note-block').getByRole('button', { name: /^(Edit|Remove)/ })).toHaveCount(0);
  await expect(frame('c-dragging')).toHaveAttribute('data-dragging', '');
  const back = (id: string) => frame(id).getByRole('menuitem', { name: 'Put container back' });
  await expect(back('c-rest')).toHaveAttribute('aria-disabled', 'true');
  await expect(frame('c-rest').getByText('Not moved')).toBeVisible();
  await expect(back('c-moved')).toHaveAttribute('aria-disabled', 'false');
  // Step 4G's other states: the preview by keyboard focus; answered (no badge); a long note cut at
  // 3 lines with Show all and Edit / Remove (unsent); a narrow frame whose badge still shows.
  await expect(frame('c-focus').locator('.vb-note-pop')).toBeVisible();
  await expect(frame('n-answered')).toHaveAttribute('data-note-stage', 'answered');
  await expect(frame('n-answered')).toHaveAttribute('data-badge', 'none');
  await expect(frame('n-answered').locator('.vb-region-badge')).toBeHidden();
  const long = frame('n-long').locator('.vb-region-note-block');
  await expect(long).toBeVisible();
  await expect(long.getByRole('button', { name: 'Show all' })).toBeVisible();
  await expect(long.getByRole('button', { name: /^(Edit|Remove) note on container Long note$/ })).toHaveCount(2);
  await expect(frame('n-narrow')).toHaveAttribute('data-badge', 'unsent');
  await expect(frame('n-narrow').locator('.vb-region-badge')).toBeVisible();
  // The note bubble's container state, beside a frame's title line, with no number chip.
  const bubble = page.locator('section[data-pattern="note-bubble"] vb-note-bubble[data-on="container"]');
  await expect(bubble).toHaveAttribute('aria-label', 'Edit note on container Note open');
  await expect(bubble.locator('.vb-nb-num')).toHaveCount(0);
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

  // With the agentAccess, wireLayers, versionView, keyBubble, proposals, cardUpdates, handover, cardReplies,
  // selectionPill, chatPanel and toolbarMenu flags off (on by default), so their sections are not in the full page
  // (components.md § Feature flags); send-access.spec.ts, wires.spec.ts, versions.spec.ts, key-bubble.spec.ts,
  // proposals.spec.ts, card-updates.spec.ts, parking-replies.spec.ts, selection-pill.spec.ts and toolbar.spec.ts
  // have those sections' own screenshots.
  test(`screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html?flags=-agentAccess,-wireLayers,-versionView,-keyBubble,-proposals,-cardUpdates,-handover,-cardReplies,-selectionPill,-chatPanel,-toolbarMenu');
    await expect(page.locator('section[data-pattern]').first()).toBeVisible();
    await expect(page).toHaveScreenshot(`gallery-${theme}.png`, { fullPage: true });
  });
}
