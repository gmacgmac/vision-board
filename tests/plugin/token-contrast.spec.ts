// The node overhaul's colours, as the browser draws them (packages/tokens/src/tokens.css, skins.css; D-009 tiers, APCA-W3
// 0.0.98G-4g): every new pair at its tier, and every tone, all 360 hues and each palette name, in each skin, light and
// dark, against the text and marks drawn on its tints. A tint is an `oklch()` the tokens build from the hue: each is drawn
// as the arithmetic says (so the browser maps nothing into gamut), which `npm run test:plugin:webkit` holds in WebKit, a
// host's webview, too. A skin's values reach the board's root; a host's colours and faces win over them (D-094).
import type { Page } from '@playwright/test';
import { drawPlans, drawn, expect, openHost, test } from './harness.ts';
import type { FakeHost } from './fake-host/server.ts';

const SKINS = ['default', 'command-lens'] as const;
const NAMES = ['teal', 'blue', 'violet', 'magenta', 'amber', 'orange', 'green', 'slate'];
const KINDS = ['question', 'finding', 'decision', 'risk', 'action', 'topic', 'app', 'note'].map((k) => `var(--vb-kind-${k})`);
const INKS = ['var(--vb-ink-strong)', 'var(--vb-ink)', 'var(--vb-ink-subtle)'];
const GROUNDS = ['var(--vb-surface-canvas)', 'var(--vb-surface-card)', 'var(--vb-surface-sunken)', 'var(--vb-surface-deep)'];

/** [text, ground, tier]: the new marks on what they sit on. A kind's word and its tile, the answer, the bookmark, the
 *  notes mark, the change badge, the plate. Muted text is the reading tier wherever it is text (README § Ink tiers). */
const PAIRS: [string, string, number][] = [
  ...INKS.flatMap((i) => GROUNDS.map((g) => [i, g, 60] as [string, string, number])),
  ...KINDS.flatMap((k) => [[k, 'var(--vb-surface-card)', 45], [k, 'var(--vb-surface-canvas)', 45],
    [k, `color-mix(in srgb, ${k} var(--vb-tile-tint), var(--vb-surface-card))`, 45], ['var(--vb-answer-wait)', k, 30]] as [string, string, number][]),
  ['var(--vb-answer-mark)', 'var(--vb-answer-tick)', 45], ['var(--vb-answer-mark)', 'var(--vb-answer-cross)', 45],
  ...['tick', 'cross'].flatMap((a) => ['card', 'canvas'].map((g) => [`var(--vb-answer-${a})`, `var(--vb-surface-${g})`, 30] as [string, string, number])),
  ['var(--vb-bookmark-ink)', 'var(--vb-bookmark)', 45],
  ['var(--vb-notes-quiet)', 'var(--vb-surface-card)', 60], ['var(--vb-notes-count)', 'var(--vb-surface-card)', 45],
  ['var(--vb-notes-unread-ink)', 'var(--vb-notes-unread)', 45],
  ['var(--vb-badge-new)', 'var(--vb-surface-card)', 45], ['var(--vb-badge-updated)', 'var(--vb-surface-card)', 45],
  ['var(--vb-badge-settled)', 'var(--vb-surface-card)', 60],
  ['var(--vb-plate-ink)', 'var(--vb-plate)', 60], ['var(--vb-plate-muted)', 'var(--vb-plate)', 60],
];

/** Put in the page once: `vbPx(el, css)`, the pixel a colour expression draws as on a probe in `el`; `vbLc(text, ground)`,
 *  APCA's lightness contrast as tests/pages/apca.ts `lc`, magnitude. */
const HELPERS = `(() => {
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  window.vbPx = (el, css) => {
    const probe = document.createElement('i');
    el.append(probe);
    probe.style.color = css;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = getComputedStyle(probe).color;
    ctx.fillRect(0, 0, 1, 1);
    probe.remove();
    return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)];
  };
  const Y = ([r, g, b]) => { const y = 0.2126729 * (r / 255) ** 2.4 + 0.7151522 * (g / 255) ** 2.4 + 0.072175 * (b / 255) ** 2.4; return y < 0.022 ? y + (0.022 - y) ** 1.414 : y; };
  window.vbLc = (t, b) => {
    const [ty, by] = [Y(t), Y(b)];
    if (Math.abs(by - ty) < 0.0005) return 0;
    const s = by > ty ? (by ** 0.56 - ty ** 0.57) * 1.14 : (by ** 0.65 - ty ** 0.62) * 1.14;
    return Math.abs(s) < 0.1 ? 0 : (Math.abs(s) - 0.027) * 100;
  };
})()`;
type Measure = { vbPx: (el: Element, css: string) => number[]; vbLc: (t: number[], b: number[]) => number };

async function open(page: Page, host: FakeHost) {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  await page.evaluate(HELPERS);
}

/** On the board's root: the skin, and the new node's attribute (Decision's new colour). */
const dress = (page: Page, skin: string) => page.locator('.host-root').evaluate((root, s) => {
  if (s === 'default') delete (root as HTMLElement).dataset.vbSkin; else (root as HTMLElement).dataset.vbSkin = s;
  (root as HTMLElement).dataset.vbEdges = '';
}, skin);

/** In the page: what each pair measures, below its tier, as `text on ground: Lc`. */
const short = (page: Page, pairs: [string, string, number][]) => page.locator('.host-root vb-node').first().evaluate((node, list) => {
  const { vbPx, vbLc } = window as unknown as Measure;
  return list.map(([t, g, tier]) => [t, g, vbLc(vbPx(node, t), vbPx(node, g)), tier] as const)
    .filter(([, , v, tier]) => v < tier).map(([t, g, v]) => `${t} on ${g}: ${v.toFixed(1)}`);
}, pairs);

for (const skin of SKINS) {
  test(`${skin}: every new pair meets its tier, light and dark`, async ({ page, host }) => {
    await open(page, host);
    await dress(page, skin);
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      expect(await short(page, PAIRS), `${skin}, ${colorScheme}`).toEqual([]);
    }
  });

  test(`${skin}: every hue and name tints as built, and its text and marks meet their tiers, light and dark`, async ({ page, host }) => {
    await open(page, host);
    await dress(page, skin);
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme });
      const found = await page.locator('.host-root vb-node').first().evaluate((node, { names, inks, kinds, theme }) => {
        const el = node as HTMLElement;
        const { vbPx, vbLc: lc } = window as unknown as Measure;
        const px = (css: string) => vbPx(el, css);
        /** OKLCH to the sRGB pixel, by the arithmetic (CSS Color 4), unclipped: out of 0..255 is out of gamut. */
        const oklch = (L: number, C: number, h: number) => {
          const [a, b] = [C * Math.cos((h * Math.PI) / 180), C * Math.sin((h * Math.PI) / 180)];
          const [l, m, s] = [L + 0.3963377774 * a + 0.2158037573 * b, L - 0.1055613458 * a - 0.0638541728 * b, L - 0.0894841775 * a - 1.291485548 * b].map((v) => v ** 3) as [number, number, number];
          return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
            .map((v) => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
        };
        const num = (name: string) => Number(getComputedStyle(el).getPropertyValue(name));
        const fixed = { card: px('var(--vb-surface-card)'), canvas: px('var(--vb-surface-canvas)'), inks: inks.map(px), kinds: kinds.map(px) };
        const fill = parseFloat(getComputedStyle(el).getPropertyValue('--vb-card-fill')) / 100;
        const problems: string[] = [];
        const tones = [...Array.from({ length: 360 }, (_, h) => ({ attr: 'hue', h: String(h) })), ...names.map((n) => ({ attr: n, h: `var(--vb-tone-hue-${n})` }))];
        for (const { attr, h } of tones) {
          el.dataset.vbTone = attr;
          el.style.setProperty('--vb-tone-h', h);
          const hue = num('--vb-tone-h');
          const strength = num('--vb-tone-strength');
          const at = (part: string) => px(`var(--vb-tone-${part})`);
          const tint = { body: at('body'), tile: at('tile'), line: at('line'), ink: at('ink'), edge: at('edge') };
          const say = (what: string, v: number, tier: number) => { if (v < tier) problems.push(`${attr === 'hue' ? hue : attr}: ${what} ${v.toFixed(1)} < ${tier}`); };
          for (const [part, got] of Object.entries(tint)) {
            const want = oklch(num(`--vb-tone-${part}-l-${theme}`), num(`--vb-tone-${part}-c-${theme}`) * strength, hue);
            if (want.some((v) => v < -0.5 || v > 255.5)) problems.push(`${hue}: ${part} is out of sRGB`);
            if (want.some((v, i) => Math.abs(v - got[i]!) > 1.5)) problems.push(`${hue}: ${part} drawn ${got} not ${want.map(Math.round)}`);
          }
          // A see-through card shows the canvas behind its fill (D-032): the body is measured both ways.
          for (const ground of [tint.body, tint.body.map((v, i) => v * fill + fixed.canvas[i]! * (1 - fill))]) {
            fixed.inks.forEach((ink, i) => say(`ink ${i} on the body`, lc(ink, ground), 60));
            fixed.kinds.forEach((kind, i) => say(`kind ${i} on the body`, lc(kind, ground), 45));
          }
          say('the icon on its tile', lc(tint.ink, tint.tile), 45);
          for (const [g, ground] of [['card', fixed.card], ['canvas', fixed.canvas], ['body', tint.body]] as const) say(`the line on the ${g}`, lc(tint.line, ground), 30);
        }
        delete el.dataset.vbTone;
        el.style.removeProperty('--vb-tone-h');
        return problems;
      }, { names: NAMES, inks: INKS, kinds: KINDS, theme: colorScheme });
      expect(found, `${skin}, ${colorScheme}`).toEqual([]);
    }
  });
}

test('a skin\'s values reach the board\'s root, and a host\'s colours and faces win over them', async ({ page, host }) => {
  await open(page, host);
  await page.emulateMedia({ colorScheme: 'light' });
  const read = () => page.locator('.host-root').evaluate((root) => {
    const probe = document.createElement('i');
    root.append(probe);
    const get = (prop: string, css: string) => { probe.style.setProperty(prop, css); const v = getComputedStyle(probe).getPropertyValue(prop); probe.style.removeProperty(prop); return v; };
    const out = { canvas: get('color', 'var(--vb-surface-canvas)'), ink: get('color', 'var(--vb-ink-subtle)'), display: get('font-family', 'var(--vb-font-display)'), label: get('font-family', 'var(--vb-font-label)') };
    probe.remove();
    return out;
  });
  const plain = await read();
  await page.locator('.host-root').evaluate((root) => { (root as HTMLElement).dataset.vbSkin = 'command-lens'; });
  const skinned = await read();
  expect(skinned.canvas).not.toBe(plain.canvas);
  expect(skinned.display).toMatch(/^"?vb-space-grotesk"?,/);
  expect(skinned.label).toMatch(/^"?vb-jetbrains-mono"?,/);
  await page.locator('.host-root').evaluate((root) => {
    for (const [k, v] of Object.entries({ '--host-canvas': 'rgb(1, 2, 3)', '--host-ink-muted': 'rgb(4, 5, 6)', '--host-font': 'Georgia', '--host-font-mono': 'Courier' })) (root as HTMLElement).style.setProperty(k, v);
  });
  expect(await read()).toEqual({ canvas: 'rgb(1, 2, 3)', ink: 'rgb(4, 5, 6)', display: 'Georgia', label: 'Courier' });
});
