// A host's colours and mode (docs/specification/plugin.md § Theme and host styling): with none set, every colour token is
// the board's own; each `--host-*` the spec's table names reaches the tokens its row lists, on the mount root alone,
// live, per mount; `--host-color-scheme` sets light or dark against the system; the flag off lets none of it through.
// Tokens are read as a probe in the board's root resolves them (`var(--token)` as a colour), so a value compares as the
// browser draws it, not as written.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { lc, pixel } from '../pages/apca.ts';
import type { FakeHost } from './fake-host/server.ts';
import { FOLDER, manifest } from './fake-host/server.ts';
import { palette, PALETTE_NAMES } from './fake-host/palettes.js';
import { drawPlans, drawn, drive, expect, openHost, test } from './harness.ts';

const ROOT = path.resolve(import.meta.dirname, '../..');
const read = (rel: string) => readFileSync(path.join(ROOT, rel), 'utf8');

/** The spec's colour table: each host property with the `--vb-*` tokens its Feeds cell names (`--host-color-scheme`,
 *  which feeds the root's mode, has none). */
const FEEDS: Record<string, string[]> = Object.fromEntries(
  [...read('docs/specification/plugin.md').matchAll(/^\| `(--host-[a-z-]+)` \| [^|]+ \| ([^|]+) \|/gm)]
    .map((m) => [m[1]!, [...m[2]!.matchAll(/`(--vb-[a-z-]+)`/g)].map((x) => x[1]!)] as const)
    .filter(([, feeds]) => feeds.length > 0),
);

/** The palette tokens (tokens.css, the block on `:root, .vb-board`), each with its own value: the expression after a
 *  `--vb-host-*` it fronts, or the whole value. Numbers (the select lift and chroma) left out. */
const OWN: Record<string, string> = (() => {
  const css = read('packages/tokens/src/tokens.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const block = /:root, \.vb-board \{([^}]*)\}/.exec(css)![1]!;
  const decls = block.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const [name, ...value] = d.split(':');
    const v = value.join(':').trim().replace(/\s+/g, ' ');
    return [name!.trim(), /^var\(--vb-host-[a-z-]+, ([\s\S]*)\)$/.exec(v)?.[1] ?? v] as const;
  });
  return Object.fromEntries(decls.filter(([n]) => !/^--vb-select-/.test(n)));
})();
const NAMES = Object.keys(OWN);

/** Colours the board keeps whatever a host sets (the spec's "The board's own"). */
const BOARDS_OWN = ['--vb-kind-question', '--vb-kind-finding', '--vb-kind-decision', '--vb-kind-risk', '--vb-kind-action',
  '--vb-kind-topic', '--vb-kind-app', '--vb-state-ack', '--vb-state-drop', '--vb-state-comment', '--vb-state-comment-soft',
  '--vb-state-later', '--vb-state-flag', '--vb-state-fresh', '--vb-state-updated', '--vb-scrim', '--vb-dot', '--vb-wire', '--vb-lane-band'];

/** What each CSS expression resolves to on a probe inside `root` (a shadow as a `box-shadow`, else as a `color`). */
const resolve = (page: Page, root: string, exprs: Record<string, string>): Promise<Record<string, string>> =>
  page.evaluate(([sel, items]) => {
    const probe = document.createElement('i');
    document.querySelector(sel)!.append(probe);
    const out: Record<string, string> = {};
    for (const [key, css] of Object.entries(items)) {
      const prop = key.startsWith('--vb-shadow') ? 'box-shadow' : 'color';
      probe.style.setProperty(prop, css);
      out[key] = getComputedStyle(probe).getPropertyValue(prop);
      probe.style.removeProperty(prop);
    }
    probe.remove();
    return out;
  }, [root, exprs] as const);

/** Each token as the board resolves it in `root`. */
const tokensIn = (page: Page, root: string, names: string[] = NAMES) => resolve(page, root, Object.fromEntries(names.map((n) => [n, `var(${n})`])));

/** Sets (a value) or clears (null) host properties on the element `sel`. */
const setOn = (page: Page, sel: string, props: Record<string, string | null>) => page.evaluate(([s, p]) => {
  const el = document.querySelector<HTMLElement>(s)!;
  for (const [k, v] of Object.entries(p)) { if (v === null) el.style.removeProperty(k); else el.style.setProperty(k, v); }
}, [sel, props] as const);

const schemeOf = (page: Page, sel: string) => page.locator(sel).evaluate((e) => getComputedStyle(e).colorScheme);
const groundOf = (page: Page, sel: string) => page.locator(`${sel} .vb-stage`).evaluate((e) => getComputedStyle(e).backgroundColor);

/** A distinct colour for the n-th host property. */
const shade = (n: number) => `rgb(${20 + n * 19} ${200 - n * 11} ${60 + n * 13})`;

async function open(page: Page, host: FakeHost, options: Record<string, unknown> = {}) {
  await drawPlans(host);
  await openHost(page, host, options);
  await drawn(page);
}

test('no host property: every colour token and the mode as before', async ({ page, host }) => {
  expect(NAMES.length).toBeGreaterThan(40);
  await open(page, host);
  const canvas: string[] = [];
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    const own = await resolve(page, '.host-root', OWN);
    expect(await tokensIn(page, '.host-root')).toEqual(own);
    canvas.push(own['--vb-surface-canvas']!);
  }
  expect(canvas[0], 'light and dark follow the system').not.toBe(canvas[1]);
  expect(await schemeOf(page, '.host-root')).toBe('light dark');
});

test('each host property reaches the tokens its row names, and the board\'s own colours stay', async ({ page, host }) => {
  expect(Object.keys(FEEDS)).toHaveLength(11);
  await open(page, host);
  const before = await tokensIn(page, '.host-root', BOARDS_OWN);
  const given = Object.fromEntries(Object.keys(FEEDS).map((p, i) => [p, shade(i)]));
  await setOn(page, '.host-root', given);
  const want = await resolve(page, '.host-root', given);
  const got = await tokensIn(page, '.host-root');
  for (const [prop, feeds] of Object.entries(FEEDS)) for (const token of feeds) expect(got[token], `${prop} → ${token}`).toBe(want[prop]);
  expect(await tokensIn(page, '.host-root', BOARDS_OWN)).toEqual(before);
  // What the person sees: the ground behind the containers is the host's canvas.
  expect(await groundOf(page, '.host-root')).toBe(want['--host-canvas']);
});

test('derived accents: one accent gives the soft ground and its line', async ({ page, host }) => {
  await open(page, host);
  const own = await tokensIn(page, '.host-root', ['--vb-accent-soft', '--vb-accent-line', '--vb-surface-card']);
  const ownLook = await tokensIn(page, '.host-root', ['--vb-kind-decision', '--vb-state-comment-soft']);
  await setOn(page, '.host-root', { '--host-accent': 'rgb(0 120 60)' });
  const got = await tokensIn(page, '.host-root', ['--vb-accent', '--vb-accent-soft', '--vb-accent-line', '--vb-focus', '--vb-wire-hot', '--vb-kind-decision', '--vb-state-comment-soft']);
  expect(got['--vb-accent-soft']).not.toBe(own['--vb-accent-soft']);
  expect(got['--vb-accent-line']).not.toBe(own['--vb-accent-line']);
  const [accent, soft, line, surface] = await Promise.all([got['--vb-accent']!, got['--vb-accent-soft']!, got['--vb-accent-line']!, own['--vb-surface-card']!].map((c) => pixel(page, c)));
  const far = (a: number[], b: number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
  // Each mixes the accent into the surface: the soft ground near the surface, its line further toward the accent.
  expect(far(soft!, surface!)).toBeLessThan(far(soft!, accent!));
  expect(far(line!, surface!)).toBeGreaterThan(far(soft!, surface!));
  expect(far(line!, accent!)).toBeLessThan(far(soft!, accent!));
  // A token the board defines from the accent follows it; a card's kind and state keep the board's (point 455).
  expect([got['--vb-focus'], got['--vb-wire-hot']]).toEqual([got['--vb-accent'], got['--vb-accent']]);
  expect(got['--vb-kind-decision']).toBe(ownLook['--vb-kind-decision']);
  expect(got['--vb-state-comment-soft']).toBe(ownLook['--vb-state-comment-soft']);
  // With the host's surface too, the mix is into that.
  await setOn(page, '.host-root', { '--host-surface': 'rgb(20 20 20)' });
  const onDark = await pixel(page, (await tokensIn(page, '.host-root', ['--vb-accent-soft']))['--vb-accent-soft']!);
  expect(far(onDark, [20, 20, 20])).toBeLessThan(far(onDark, surface!));
});

test('mode: --host-color-scheme forces dark on a light system, and light on a dark one', async ({ page, host }) => {
  await open(page, host);
  const kind = async () => (await tokensIn(page, '.host-root', ['--vb-kind-question']))['--vb-kind-question'];
  await page.emulateMedia({ colorScheme: 'light' });
  const light = { ground: await groundOf(page, '.host-root'), kind: await kind() };
  await page.emulateMedia({ colorScheme: 'dark' });
  const dark = { ground: await groundOf(page, '.host-root'), kind: await kind() };
  expect(dark).not.toEqual(light);
  await page.emulateMedia({ colorScheme: 'light' });
  await setOn(page, '.host-root', { '--host-color-scheme': 'dark' });
  expect(await schemeOf(page, '.host-root')).toBe('dark');
  // The defaults and the board's own colours alike follow it.
  expect({ ground: await groundOf(page, '.host-root'), kind: await kind() }).toEqual(dark);
  await page.emulateMedia({ colorScheme: 'dark' });
  await setOn(page, '.host-root', { '--host-color-scheme': 'light' });
  expect({ ground: await groundOf(page, '.host-root'), kind: await kind() }).toEqual(light);
  // It wins over `data-theme` on the page's root; `light dark` is the system's.
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  expect(await groundOf(page, '.host-root')).toBe(light.ground);
  await page.evaluate(() => { delete document.documentElement.dataset.theme; });
  await setOn(page, '.host-root', { '--host-color-scheme': 'light dark' });
  expect(await groundOf(page, '.host-root')).toBe(dark.ground);
  // The host's page keeps its own.
  expect(await schemeOf(page, 'html')).toBe('normal');
});

test('scope: on the mount root alone, every property applies, the type\'s too', async ({ page, host }) => {
  await open(page, host);
  await page.emulateMedia({ colorScheme: 'light' });
  const given = Object.fromEntries(Object.keys(FEEDS).map((p, i) => [p, shade(i)]));
  await setOn(page, '.host-root', { ...given, '--host-color-scheme': 'dark', '--host-font': 'Georgia', '--host-font-mono': 'Courier', '--host-text-scale': '1' });
  expect(await page.evaluate(() => document.documentElement.getAttribute('style'))).toBeNull();
  const want = await resolve(page, '.host-root', given);
  const got = await tokensIn(page, '.host-root');
  for (const [prop, feeds] of Object.entries(FEEDS)) for (const token of feeds) expect(got[token], `${prop} → ${token}`).toBe(want[prop]);
  expect(await schemeOf(page, '.host-root')).toBe('dark');
  const type = await page.locator('.host-root').evaluate((root) => {
    const probe = document.createElement('i');
    probe.style.setProperty('font-size', 'var(--vb-ui-text-md)');
    probe.style.setProperty('font-family', 'var(--vb-font-mono)');
    root.append(probe);
    const s = getComputedStyle(probe);
    const out = { font: getComputedStyle(root).fontFamily, mono: s.fontFamily, size: s.fontSize, unscaled: '' };
    probe.style.setProperty('font-size', 'var(--vb-text-md)');
    out.unscaled = getComputedStyle(probe).fontSize;
    probe.remove();
    return out;
  });
  // The text size around the cards is --vb-text-md times the host's scale, 1.
  expect(type).toEqual({ font: 'Georgia', mono: 'Courier', size: type.unscaled, unscaled: expect.stringMatching(/px$/) });
});

/** The harness's palette `name` in `mode`, as `--host-*` properties, `--host-color-scheme` too. */
const dressed = (name: string, mode: 'light' | 'dark') => ({
  ...Object.fromEntries(Object.entries(palette(name, mode) as Record<string, string>).map(([k, v]) => [`--host-${k}`, v])), '--host-color-scheme': mode,
});

test('scope: two mounts in one page wear different colours and modes', async ({ page, host }) => {
  await open(page, host);
  await drive(page, 'mountPlain');
  await expect(page.locator('#plain vb-node')).toHaveCount(3);
  const [one, two] = [dressed('green', 'light'), dressed('violet', 'dark')];
  await setOn(page, '.host-root', one);
  await setOn(page, '#plain', two);
  expect([await schemeOf(page, '.host-root'), await schemeOf(page, '#plain')]).toEqual(['light', 'dark']);
  const want = [await resolve(page, '.host-root', one), await resolve(page, '#plain', two)];
  expect(await groundOf(page, '.host-root')).toBe(want[0]!['--host-canvas']);
  expect(await groundOf(page, '#plain')).toBe(want[1]!['--host-canvas']);
  expect((await tokensIn(page, '.host-root', ['--vb-accent']))['--vb-accent']).toBe(want[0]!['--host-accent']);
  expect((await tokensIn(page, '#plain', ['--vb-accent']))['--vb-accent']).toBe(want[1]!['--host-accent']);
  await drive(page, 'unmountSecond');
});

test('live: a property or the mode changed while mounted applies without a remount', async ({ page, host }) => {
  await open(page, host);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.locator('.host-root .vb-stage').evaluate((e) => { (e as HTMLElement & { heldBy?: string }).heldBy = 'this mount'; });
  const accent = async () => (await tokensIn(page, '.host-root', ['--vb-accent']))['--vb-accent'];
  await setOn(page, '.host-root', { '--host-accent': 'rgb(0 90 200)' });
  expect(await accent()).toBe('rgb(0, 90, 200)');
  await setOn(page, '.host-root', { '--host-accent': 'rgb(200 90 0)' });
  expect(await accent()).toBe('rgb(200, 90, 0)');
  const light = await groundOf(page, '.host-root');
  await setOn(page, '.host-root', { '--host-color-scheme': 'dark' });
  expect(await schemeOf(page, '.host-root')).toBe('dark');
  expect(await groundOf(page, '.host-root')).not.toBe(light);
  await setOn(page, '.host-root', { '--host-accent': null, '--host-color-scheme': null });
  expect(await groundOf(page, '.host-root')).toBe(light);
  expect(await page.locator('.host-root .vb-stage').evaluate((e) => (e as HTMLElement & { heldBy?: string }).heldBy)).toBe('this mount');
});

/** The spec's contrast table, in the board's tokens: each host property as the tokens it feeds, each ground as the
 *  surfaces it feeds. `--host-line-strong` is measured and logged, not held: the board's own lines are "faint by
 *  design; not a contrast tier" (tokens.css § Lines), under Lc 30 on its surfaces (FE_01 notes, a request on plugin.md). */
const PAIRS: { text: string[]; on: string[]; tier: number }[] = [
  { text: ['--vb-ink-strong', '--vb-ink', '--vb-ink-subtle'], on: ['--vb-surface-card', '--vb-surface-canvas', '--vb-surface-sunken', '--vb-surface-deep'], tier: 60 },
  { text: ['--vb-ink-on-fill'], on: ['--vb-accent-fill', '--vb-accent-fill-hover'], tier: 60 },
  { text: ['--vb-accent-text'], on: ['--vb-surface-card', '--vb-surface-canvas'], tier: 45 },
  { text: ['--vb-focus'], on: ['--vb-surface-card', '--vb-surface-canvas'], tier: 30 },
];

test('contrast: the board\'s own defaults meet every pair of the host\'s table, light and dark', async ({ page, host }) => {
  await open(page, host);
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    const t = await tokensIn(page, '.host-root');
    const px = async (name: string) => pixel(page, t[name]!);
    for (const { text, on, tier } of PAIRS) for (const fg of text) for (const bg of on) {
      expect(lc(await px(fg), await px(bg)), `${colorScheme}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(tier);
    }
    const lines = [];
    for (const fg of ['--vb-line-strong', '--vb-line-contrast']) for (const bg of ['--vb-surface-card', '--vb-surface-canvas']) lines.push(`${fg} on ${bg} Lc ${lc(await px(fg), await px(bg)).toFixed(1)}`);
    console.log(`${colorScheme}, lines (not held): ${lines.join(', ')}`);
  }
});

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

test('the harness palettes: every pair of the host\'s table meets its tier, light and dark', () => {
  for (const name of PALETTE_NAMES) for (const mode of ['light', 'dark'] as const) {
    const p = palette(name, mode) as Record<string, string>;
    const focus = p.focus ?? p.accent!;
    const pairs: [string, string, number][] = [
      ...['ink', 'ink-muted'].flatMap((fg) => ['surface', 'canvas', 'surface-sunken'].map((bg) => [p[fg]!, p[bg]!, 60] as [string, string, number])),
      [p['on-accent']!, p.accent!, 60], [p['on-accent']!, p['accent-strong']!, 60],
      ...['surface', 'canvas'].flatMap((bg) => [[p['accent-strong']!, p[bg]!, 45], [p['line-strong']!, p[bg]!, 30], [focus, p[bg]!, 30]] as [string, string, number][]),
    ];
    for (const [fg, bg, tier] of pairs) expect(lc(rgb(fg), rgb(bg)), `${name} ${mode}: ${fg} on ${bg}`).toBeGreaterThanOrEqual(tier);
  }
});

test('flag off: a host\'s colours and mode reach nothing; the type\'s three still apply', async ({ page, host }) => {
  await open(page, host, { settings: { hostStyling: false } });
  await page.emulateMedia({ colorScheme: 'light' });
  expect(await page.locator('.host-root').evaluate((e) => e.getAttributeNames().filter((n) => n.startsWith('data-vb-')))).toEqual([]);
  const own = await resolve(page, '.host-root', OWN);
  const given = Object.fromEntries(Object.keys(FEEDS).map((p, i) => [p, shade(i)]));
  await setOn(page, '.host-root', { ...given, '--host-color-scheme': 'dark', '--host-font': 'Georgia' });
  await page.evaluate((g) => { for (const [k, v] of Object.entries(g)) document.documentElement.style.setProperty(k, v); }, given);
  expect(await tokensIn(page, '.host-root')).toEqual(own);
  expect(await schemeOf(page, '.host-root')).toBe('light dark');
  expect(await page.locator('.host-root').evaluate((e) => getComputedStyle(e).fontFamily)).toBe('Georgia');
});

test('the sheet: light-dark() stays native (no --lightningcss-*), and the tokens sit on the board\'s root too', () => {
  const css = (manifest().view.styles as string[]).map((s) => readFileSync(path.join(FOLDER, s), 'utf8')).join('\n');
  expect(css).not.toContain('--lightningcss-');
  expect(css).toContain('light-dark(');
  expect(css).toMatch(/(?:^|\}):root,\.vb-board\{[^}]*--vb-board-accent:light-dark\([^}]*--vb-accent:var\(--vb-host-accent,var\(--vb-board-accent\)\)/);
  // The tokens' color-scheme is the standalone page's: none on `:root` or `[data-theme]`.
  expect(css).not.toMatch(/(?:^|[}\s])(?::root|\[data-theme=(?:light|dark)\])\{[^}]*color-scheme/);
});
