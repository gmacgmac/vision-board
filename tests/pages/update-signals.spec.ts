// Updated in amber and the agent's reply edge (updateSignals flag, on by default; insert-markdown-signals
// FE_01, PLAN decision 10, D-088): the card's "N updates" tab and the "updated" count in a container's pill
// take --vb-state-updated, "new" stays teal; the agent's reply carries that amber on its left edge, bright
// while its card is unseen (D-054), muted once the person has looked, on the card and in the note bubble;
// the person's own note edge is unchanged. FIX_01: the tab hovered or open keeps the amber; new is teal on
// the card's NEW tab and the toolbar's "N new" chip too; a container's note replies take the muted amber; the
// amber reads apart (ΔE76 20) from the action and changed ambers, the flag and risk in both themes; the
// narrowest bar's "new" dot is teal and the "N boards updated" chip amber (Run 2). APCA
// light and dark; axe; the flag off is the old look; the gallery's sample. Each test draws its own board
// through the API (agent-board.ts).
import type { Locator, Page } from '@playwright/test';
import { bid, expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import type { Rgb } from './apca.ts';
import type { Drawn } from './agent-board.ts';
import { act, card, draw, open, reply, write } from './agent-board.ts';
import { lc, pixel, resolved } from './apca.ts';
import { bubble, replies, tab } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];

const colour = async (page: Page, l: Locator, prop: 'color' | 'borderTopColor' | 'borderLeftColor' | 'backgroundColor') =>
  pixel(page, await l.evaluate((e, p) => getComputedStyle(e)[p], prop));
const token = async (page: Page, css: string) => pixel(page, await resolved(page, css.startsWith('var(') || css.startsWith('color-mix(') ? css : `var(${css})`));
/** The muted amber of a seen reply's edge, as node-parking.css mixes it. */
const MUTED = 'color-mix(in srgb, var(--vb-state-updated) 50%, var(--vb-line-strong))';
const note = (page: Page, n: number) => card(page, n).locator('.vb-node-note');
/** The toolbar's "N new" chip, whatever its tone. */
const newChip = (page: Page) => page.locator(`${bid('counts')} .vb-chip:has(${bid('fresh-cards')})`);

/** CIE76 ΔE between two sRGB pixels (D65). */
function deltaE(a: Rgb, b: Rgb): number {
  const lab = (c: Rgb) => {
    const [r, g, bl] = c.map((v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }) as Rgb;
    const xyz = [(0.4124 * r + 0.3576 * g + 0.1805 * bl) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * bl, (0.0193 * r + 0.1192 * g + 0.9505 * bl) / 1.08883];
    const [fx, fy, fz] = xyz.map((t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)) as Rgb;
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  };
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!);
}

/** A board with one card; the person's note on it, then the agent's reply to it, arriving live. */
async function answered(page: Page, request: Parameters<typeof draw>[0], query = ''): Promise<{ d: Drawn; n: number }> {
  const d = await draw(request, 1, 'signals');
  const n = d.n[0]!;
  await open(page, d, query);
  const seq = await act(page, d, { action: 'comment', n, ver: 1, text: 'Do any accounts still pay quarterly?' });
  await reply(request, d, n, 'Two do, both on **legacy** plans.', seq);
  await expect(replies(page, n)).toHaveCount(1);
  return { d, n };
}

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

test('the agent\'s reply: the bright amber edge while its card is unseen, muted once seen; the note keeps its own edge', async ({ page, request }) => {
  const { n } = await answered(page, request);
  const r = replies(page, n).first();
  await expect(tab(page, n)).toHaveText('1 update');
  await expect(r).toHaveAttribute('data-unseen', '');
  expect(await colour(page, r, 'borderLeftColor')).toEqual(await token(page, '--vb-state-updated'));
  // The person's note: answered, so history, its edge the strong line as before.
  expect(await colour(page, note(page, n), 'borderLeftColor')).toEqual(await token(page, '--vb-line-strong'));
  // The person looks at the card: its tab goes, and the reply steps back to the muted amber.
  await card(page, n).locator('.vb-node-title').click();
  await expect(tab(page, n)).toBeHidden();
  await expect(r).not.toHaveAttribute('data-unseen');
  expect(await colour(page, r, 'borderLeftColor')).toEqual(await token(page, MUTED));
  expect(await colour(page, r, 'borderLeftColor'), 'still apart from the note').not.toEqual(await colour(page, note(page, n), 'borderLeftColor'));
});

test('the note bubble: the same two edges as the card, bright while unseen, muted once seen', async ({ page, request }) => {
  const { n } = await answered(page, request);
  const inBubble = bubble(page).locator('.vb-nb-reply').first();
  const edge = async () => JSON.stringify(await colour(page, inBubble, 'borderLeftColor'));
  // Opening the exchange from the reply is no engagement (D-054): the reply is still unseen, bright in both.
  await replies(page, n).first().click();
  await expect(inBubble).toBeVisible();
  await expect(inBubble).toHaveAttribute('data-unseen', '');
  await expect.poll(edge).toBe(JSON.stringify(await token(page, '--vb-state-updated')));
  await page.keyboard.press('Escape');
  await expect(bubble(page)).toBeHidden();
  // The person looks at the card; opened again, the reply is muted there too.
  await card(page, n).locator('.vb-node-title').click();
  await expect(replies(page, n).first()).not.toHaveAttribute('data-unseen');
  await replies(page, n).first().click();
  await expect(inBubble).toBeVisible();
  await expect(inBubble).not.toHaveAttribute('data-unseen');
  await expect.poll(edge).toBe(JSON.stringify(await token(page, MUTED)));
});

for (const theme of THEMES) {
  test(`APCA (${theme}): the amber as words Lc 45 and as edges Lc 30 on the card, sunken and deep; brighter than the action amber; axe`, async ({ page, request }) => {
    await setTheme(page, theme);
    const { n } = await answered(page, request);
    const amber = await token(page, '--vb-state-updated');
    const muted = await token(page, MUTED);
    const on = async (name: string) => token(page, name);
    const [cardBg, sunken, deep, soft] = [await on('--vb-surface-card'), await on('--vb-surface-sunken'), await on('--vb-surface-deep'), await on('--vb-state-fresh-soft')];
    const words = { card: lc(amber, cardBg), sunken: lc(amber, sunken), deep: lc(amber, deep), pill: lc(amber, soft) };
    const edges = { muted: lc(muted, sunken), mutedOnCard: lc(muted, cardBg) };
    console.log(`APCA ${theme}: updated words card ${words.card.toFixed(1)}, sunken ${words.sunken.toFixed(1)}, deep ${words.deep.toFixed(1)}, on the pill ${words.pill.toFixed(1)}; muted edge sunken ${edges.muted.toFixed(1)}, card ${edges.mutedOnCard.toFixed(1)}`);
    for (const [where, v] of Object.entries(words)) expect(v, `words on ${where}`).toBeGreaterThanOrEqual(45);
    for (const [where, v] of Object.entries(edges)) expect(v, `the muted edge, ${where}`).toBeGreaterThanOrEqual(30);
    // It must not read as the action colour: in dark it is lighter than both ambers on the card.
    if (theme === 'dark') {
      for (const other of ['--vb-kind-action', '--vb-state-context']) expect(words.card - lc(await on(other), cardBg), `brighter than ${other}`).toBeGreaterThanOrEqual(8);
    }
    // In both themes it reads apart from the other ambers and oranges (in light by hue and chroma: FIX_01).
    for (const other of ['--vb-kind-action', '--vb-state-context', '--vb-state-flag', '--vb-kind-risk']) {
      const d = deltaE(amber, await on(other));
      console.log(`ΔE76 ${theme}: updated vs ${other} ${d.toFixed(1)}`);
      expect(d, `apart from ${other}`).toBeGreaterThanOrEqual(20);
    }
    // Hovered, the tab keeps the amber words on its soft fill; the "N new" chip's teal words on its own.
    const hovered = lc(amber, await on('--vb-state-updated-soft'));
    const chipWords = lc(await on('--vb-state-fresh'), soft);
    for (const [where, v] of Object.entries({ hovered, chipWords })) expect(v, where).toBeGreaterThanOrEqual(45);
    expect(await colour(page, replies(page, n).first(), 'borderLeftColor')).toEqual(amber);
    await expectNoAxeViolations(page);
  });
}

/** A second card the agent adds while the page is open: NEW. */
async function added(page: Page, request: Parameters<typeof draw>[0], d: Drawn): Promise<number> {
  const [r] = await write(request, d, [{ type: 'node', node: { region: 'p', kind: 'question', title: 'Card 2' } }]);
  const n = r!.n!;
  await expect(card(page, n).locator('.vb-node-btab[data-tab="new"]')).toBeVisible();
  return n;
}

test('one colour per meaning: the tab hovered keeps the amber; the NEW tab and the "N new" chip are teal', async ({ page, request }) => {
  const { d, n } = await answered(page, request);
  const fresh = await token(page, '--vb-state-fresh');
  const amber = await token(page, '--vb-state-updated');
  await tab(page, n).hover();
  expect(await colour(page, tab(page, n), 'borderTopColor')).toEqual(amber);
  expect(await colour(page, tab(page, n), 'color')).toEqual(amber);
  expect(await colour(page, tab(page, n), 'backgroundColor')).toEqual(await token(page, '--vb-state-updated-soft'));
  await page.mouse.move(0, 0);
  const m = await added(page, request, d);
  const newTab = card(page, m).locator('.vb-node-btab[data-tab="new"]');
  expect(await colour(page, newTab, 'color')).toEqual(fresh);
  expect(await colour(page, newTab, 'backgroundColor')).toEqual(await token(page, '--vb-state-fresh-soft'));
  await expect(newChip(page)).toContainText('2 new');
  await expect(newChip(page)).toHaveAttribute('data-tone', 'fresh');
  expect(await colour(page, newChip(page).locator('.vb-chip-word'), 'color')).toEqual(fresh);
});

test('flag off: replies are grey, the tab hovered the changed amber, NEW and "N new" pink, as before', async ({ page, request }) => {
  const { d, n } = await answered(page, request, '?flags=-updateSignals');
  await expect(tab(page, n)).toHaveText('1 update');
  expect(await colour(page, tab(page, n), 'borderTopColor')).toEqual(await token(page, '--vb-accent'));
  expect(await colour(page, replies(page, n).first(), 'borderLeftColor')).toEqual(await token(page, '--vb-line-strong'));
  await tab(page, n).hover();
  expect(await colour(page, tab(page, n), 'borderTopColor')).toEqual(await token(page, '--vb-state-context'));
  await page.mouse.move(0, 0);
  const m = await added(page, request, d);
  expect(await colour(page, card(page, m).locator('.vb-node-btab[data-tab="new"]'), 'color')).toEqual(await token(page, '--vb-accent'));
  await expect(newChip(page)).toHaveAttribute('data-tone', 'new');
  expect(await colour(page, newChip(page).locator('.vb-chip-word'), 'color')).toEqual(await token(page, '--vb-accent'));
  // "N boards updated" and the narrowest bar's dot: pink, as before.
  await draw(request, 1, 'other');
  await expect(page.locator(bid('boards-updated'))).toHaveAttribute('data-tone', 'new');
  expect(await colour(page, page.locator(`${bid('boards-updated')} .vb-chip-word`), 'color')).toEqual(await token(page, '--vb-accent'));
  await page.setViewportSize({ width: 490, height: 900 });
  await expect(page.locator(`${bid('counts')} .vb-count-dot`)).toHaveAttribute('data-tone', 'new');
  expect(await colour(page, page.locator(`${bid('counts')} .vb-count-dot`), 'backgroundColor')).toEqual(await token(page, '--vb-accent'));
});

// ---- The bar (FIX_01 Run 2): the narrowest bar's "new" dot teal, the "N boards updated" chip amber ----

for (const theme of THEMES) {
  test(`the bar (${theme}): "N boards updated" amber, its words Lc 45; the narrowest bar's "new" dot teal, Lc 30; axe`, async ({ page, request }) => {
    await setTheme(page, theme);
    const { d } = await answered(page, request);
    await draw(request, 1, 'other');
    const updated = page.locator(bid('boards-updated'));
    await expect(updated).toHaveAttribute('data-tone', 'updated');
    const [amber, amberSoft] = [await token(page, '--vb-state-updated'), await token(page, '--vb-state-updated-soft')];
    expect(await colour(page, updated.locator('.vb-chip-word'), 'color')).toEqual(amber);
    expect(await colour(page, updated, 'backgroundColor')).toEqual(amberSoft);
    await added(page, request, d);
    await page.setViewportSize({ width: 490, height: 900 });
    const dot = page.locator(`${bid('counts')} .vb-count-dot`);
    await expect(dot).toHaveAttribute('data-tone', 'fresh');
    const teal = await colour(page, dot, 'backgroundColor');
    expect(teal).toEqual(await token(page, '--vb-state-fresh'));
    const found = { 'updated words': [lc(amber, amberSoft), 45], dot: [lc(teal, await colour(page, page.locator(`${bid('counts')} .vb-count`), 'backgroundColor')), 30] } as const;
    console.log(`APCA ${theme}: ${Object.entries(found).map(([w, [v]]) => `${w} ${v.toFixed(1)}`).join(', ')}`);
    for (const [what, [v, bar]] of Object.entries(found)) expect(Math.abs(v), what).toBeGreaterThanOrEqual(bar);
    await expectNoAxeViolations(page);
  });
}

// ---- The gallery ----

for (const theme of THEMES) {
  test(`gallery (${theme}): the agent's reply unseen and seen, the amber tab and the two-colour pill; axe`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    const sample = page.getByRole('list', { name: 'The agent\'s reply, unseen and seen' });
    const [bright, seen] = [sample.locator('vb-node').first().locator('.vb-node-reply').first(), sample.locator('vb-node').nth(1).locator('.vb-node-reply').first()];
    await expect(bright).toHaveAttribute('data-unseen', '');
    await expect(seen).not.toHaveAttribute('data-unseen');
    expect(await colour(page, bright, 'borderLeftColor')).toEqual(await token(page, '--vb-state-updated'));
    expect(await colour(page, seen, 'borderLeftColor')).toEqual(await token(page, MUTED));
    const fresh = page.locator('section[data-feature="freshCards"]');
    expect(await colour(page, fresh.locator('.vb-region-fresh-updated').first(), 'color')).toEqual(await token(page, '--vb-state-updated'));
    expect(await colour(page, fresh.locator('.vb-region-fresh-new').first(), 'color')).toEqual(await token(page, '--vb-state-fresh'));
    expect(await colour(page, fresh.locator('.vb-node-btab[data-tab="updates"]').first(), 'color')).toEqual(await token(page, '--vb-state-updated'));
    // New is teal: the NEW tab and the "N new" chip; a container's note reply on its frame, the muted amber.
    expect(await colour(page, fresh.locator('.vb-node-btab[data-tab="new"]').first(), 'color')).toEqual(await token(page, '--vb-state-fresh'));
    expect(await colour(page, fresh.locator('.vb-chip[data-tone="fresh"] .vb-chip-word').first(), 'color')).toEqual(await token(page, '--vb-state-fresh'));
    expect(await colour(page, page.locator('vb-region .vb-nblock-reply').first(), 'borderLeftColor')).toEqual(await token(page, MUTED));
    await expectNoAxeViolations(page);
    await sample.scrollIntoViewIfNeeded();
    await expect(sample).toHaveScreenshot(`update-signals-replies-${theme}.png`);
  });
}

test('gallery, flag off: no section of its own, the reply edges are grey and the pill one colour', async ({ page }) => {
  await page.goto('/gallery.html?flags=-updateSignals');
  await expect(page.locator('section[data-feature="updateSignals"]')).toHaveCount(0);
  const reply = page.locator('section[data-pattern="node"] .vb-node-reply').first();
  expect(await colour(page, reply, 'borderLeftColor')).toEqual(await token(page, '--vb-line-strong'));
  const fresh = page.locator('section[data-feature="freshCards"]');
  expect(await colour(page, fresh.locator('.vb-region-fresh-updated').first(), 'color')).toEqual(await token(page, '--vb-state-fresh'));
  expect(await colour(page, fresh.locator('.vb-node-btab[data-tab="new"]').first(), 'color')).toEqual(await token(page, '--vb-accent'));
  expect(await colour(page, fresh.locator('.vb-chip[data-tone="new"] .vb-chip-word').first(), 'color')).toEqual(await token(page, '--vb-accent'));
  expect(await colour(page, page.locator('vb-region .vb-nblock-reply').first(), 'borderLeftColor')).toEqual(await token(page, '--vb-line-strong'));
});
