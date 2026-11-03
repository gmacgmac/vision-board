// The board in a host's page (UI_01; nclite's plugin contract, docs/plugins.md § The view and its
// host: the host's element rules reach in). A host's stylesheet restyles h1-h3 (small, in capitals),
// p, button, input, select, textarea and dialog for the whole page; the board draws exactly as on its
// own page, at the full window and at a pane's width (550px), and so do the gallery's samples of the
// shared base and the patterns. The board sets every property it relies on (#ui base/root.css). The
// board sizes by its own root (`vb-board`, board/mount.ts), not the window: in a 550px pane of a
// 1600px page it draws exactly as in a 550px window.
// Pixels are compared before and after the host's sheet goes in, on one page: no new baseline. A
// channel may move by the rasteriser's step (`RASTER`), never more.
import type { Locator, Page } from '@playwright/test';
import { expect, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { startRoadmapServer } from './roadmap-server.ts';
import { openBoard } from './board-page.ts';

const THEMES: Theme[] = ['light', 'dark'];
/** A pane's width, and the page it sits in. */
const [PANE, WIDE] = [550, 1600];

/** A host at its worst: every element rule a page might set, in loud values. `:where(…)` adds nothing to
 * a rule's weight; it keeps the gallery's own notes (g- classes, the host's page there) as they are, so
 * nothing moves under the samples by a fraction of a pixel. */
const PAGE = ":where(:not([class^='g-']))";
const HOST = `
h1${PAGE}, h2${PAGE}, h3${PAGE} { font: 300 11px/2 serif; text-transform: uppercase; letter-spacing: .08em; font-variant: small-caps;
  margin: 20px 0; padding: 3px; color: rgb(200 0 0); text-align: center; border-bottom: 2px solid rgb(255 0 0); }
p${PAGE} { margin: 1.5em 0; padding: 4px; line-height: 2; font-size: 17px; font-family: serif; color: rgb(0 120 0);
  text-align: justify; text-indent: 1em; }
button${PAGE} { background: rgb(255 200 0); border: 3px solid rgb(0 0 255); border-radius: 0; padding: 12px 24px;
  font: 800 18px/2 serif; text-transform: uppercase; letter-spacing: .1em; color: rgb(0 0 255);
  box-shadow: 0 0 0 4px rgb(255 0 255); min-height: 44px; min-width: 44px; margin: 4px; text-decoration: underline; }
input, select, textarea { background: rgb(255 255 200); border: 3px solid rgb(0 0 255); border-radius: 12px; padding: 10px;
  font: 18px/2 serif; color: rgb(0 0 255); height: 48px; margin: 4px; box-shadow: inset 0 0 0 2px rgb(255 0 0); }
dialog { padding: 40px; border: 5px solid rgb(0 0 255); background: rgb(255 255 200); color: rgb(0 0 255);
  border-radius: 0; font-family: serif; max-width: 200px; }
`;

// The host's sheet goes in as a <style>; the board's own page refuses inline styles (its CSP).
test.use({ bypassCSP: true });

/** The most any colour channel of any pixel differs between two pictures (0: the same bytes), or
 * Infinity when their sizes differ. Decoded in the page, only when the bytes differ. */
async function mostApart(page: Page, a: Buffer, b: Buffer): Promise<number> {
  if (Buffer.compare(a, b) === 0) return 0;
  return page.evaluate(async (urls) => {
    const pics = await Promise.all(urls.map((src) => new Promise<HTMLImageElement>((done) => {
      const img = new Image();
      img.onload = () => done(img);
      img.src = src;
    })));
    const [x, y] = pics.map((img) => {
      const c = new OffscreenCanvas(img.width, img.height).getContext('2d')!;
      c.drawImage(img, 0, 0);
      return c.getImageData(0, 0, img.width, img.height).data;
    });
    if (pics[0]!.width !== pics[1]!.width || pics[0]!.height !== pics[1]!.height) return Infinity;
    let most = 0;
    for (let i = 0; i < x!.length; i += 1) most = Math.max(most, Math.abs(x![i]! - y![i]!));
    return most;
  }, [a, b].map((png) => `data:image/png;base64,${png.toString('base64')}`));
}

/** Every element of the board, as drawn: where it is in the board's root, its size, and the looks
 * that a width rule would change. Two boards of one width lay out alike wherever their root sits
 * (pixels would not do: a scaled board's edges rasterise a step apart at another place on the page). */
function layoutOf(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const root = document.querySelector('.vb-board')!;
    const at = root.getBoundingClientRect();
    const r = (n: number) => Math.round(n * 100) / 100;
    return [root, ...root.querySelectorAll('*')].map((e) => {
      const b = e.getBoundingClientRect();
      const c = getComputedStyle(e);
      return [e.localName, e.getAttribute('class') ?? '', r(b.x - at.x), r(b.y - at.y), r(b.width), r(b.height),
        c.display, c.visibility, c.fontSize, c.color, c.backgroundColor, (e as HTMLElement).innerText?.length ?? 0].join(' ');
    });
  });
}

/** What the rasteriser alone may move a channel by between two draws of the same picture: a control's
 * edge a step lighter (seen on the toolbar's selects after a sheet goes in). A rule that reaches the
 * board moves far more. */
const RASTER = 2;

/** Each target's pixels on the page as it is, then under the host's sheet: they must not change. A
 * target that differs is shot again, the host's look between its own (the sheet off, on, off), and
 * judged on the closer pair: a rule that reaches the board differs from both, while what a first
 * pass ~30 s earlier can catch and `animations: 'disabled'` can't stop (an svg image's own animation,
 * a tile the rasteriser drew again) does not (SVG_01 Run 3). The tile can settle between any two of the
 * three, once: a card's size glyph, a few levels on a few pixels, some shots after it scrolled in, with
 * no sheet at all (FIX_01 Run 2, F19). What this can't catch: a rule whose effect outlives the sheet,
 * such as a size the board measured under it and kept, since the look after then matches the host's. */
async function sameUnderHost(page: Page, targets: Locator[]): Promise<void> {
  const shot = (t: Locator) => t.screenshot({ animations: 'disabled' });
  const own = [];
  for (const t of targets) own.push(await shot(t));
  const sheet = await page.addStyleTag({ content: HOST });
  const hostOn = (on: boolean) => sheet.evaluate((e, v) => { (e as HTMLStyleElement).disabled = !v; }, on);
  for (const [i, t] of targets.entries()) {
    const first = await mostApart(page, own[i]!, await shot(t));
    if (first <= RASTER) continue;
    await hostOn(false);
    const before = await shot(t);
    await hostOn(true);
    const under = await shot(t);
    await hostOn(false);
    const after = await shot(t);
    await hostOn(true);
    const what = await t.evaluate((e) => [e.localName, e.getAttribute('data-id') ?? e.getAttribute('class') ?? '', e.closest('[data-pattern]')?.getAttribute('data-pattern') ?? ''].join(' '));
    expect(Math.min(await mostApart(page, before, under), await mostApart(page, under, after)), `target ${i} (${what}) changed under the host's element rules (first pass: ${first})`).toBeLessThanOrEqual(RASTER);
  }
}

for (const theme of THEMES) {
  for (const width of [1600, 550]) {
    test(`the board draws the same under a host's element rules, ${width}px wide (${theme})`, async ({ page }) => {
      const roadmap = await startRoadmapServer();
      try {
        await page.setViewportSize({ width, height: 1000 });
        await setTheme(page, theme);
        await openBoard(page, { base: roadmap.base, query: '?flags=-chatPanel' });
        await sameUnderHost(page, [page.locator('body')]);
      } finally {
        await roadmap.close();
      }
    });
  }

  test(`the board in a 550px pane inside a 1600px page draws as in a 550px window, under the host's rules too (${theme})`, async ({ page }) => {
    const roadmap = await startRoadmapServer();
    try {
      const board = page.locator('.vb-board');
      await setTheme(page, theme);
      await page.setViewportSize({ width: PANE, height: 1000 });
      await openBoard(page, { base: roadmap.base, query: '?flags=-chatPanel' });
      const own = await layoutOf(page);
      // The same board as a pane at the left of a wide page: the page puts it there before it draws.
      await page.addInitScript((css) => {
        addEventListener('DOMContentLoaded', () => document.head.append(Object.assign(document.createElement('style'), { textContent: css })));
      }, `body > .vb-board { right: ${WIDE - PANE}px; }`);
      await page.setViewportSize({ width: WIDE, height: 1000 });
      await openBoard(page, { base: roadmap.base, query: '?flags=-chatPanel' });
      expect((await board.boundingBox())?.width).toBe(PANE);
      expect(await layoutOf(page), 'the pane lays out as the window did').toEqual(own);
      await sameUnderHost(page, [board]);
    } finally {
      await roadmap.close();
    }
  });

  test(`the gallery's samples of the base and the patterns draw the same under a host's element rules (${theme})`, async ({ page }) => {
    // About 250 samples, each shot twice.
    test.setTimeout(180_000);
    await setTheme(page, theme);
    // Without the chat panel's samples: the chat is the standalone page's (nclite brings its own). Without the ledger
    // section's either: the ledger chip, its list and the New ledger dialog are the standalone page's parts, and a host
    // never chooses a ledger (it passes one folder per bot: D-084 4, plugin.md). Named, so it holds whatever the
    // flag's default is (FIX_01 Run 2, F16).
    await page.goto('/gallery.html?flags=-openList,-chatPanel,-ledgerFolders');
    await expect(page.locator('vb-node').first()).toBeVisible();
    // Each sample's outermost board element (a vb- element or class with none above it): the page's
    // own notes around them are the gallery's, which a host replaces.
    const n = await page.evaluate(() => {
      const isBoard = (e: Element) => e.localName.startsWith('vb-') || [...e.classList].some((c) => c.startsWith('vb-'));
      const tops = [...document.querySelectorAll('main *')].filter((e) => {
        if (!isBoard(e)) return false;
        for (let a = e.parentElement; a; a = a.parentElement) if (isBoard(a)) return false;
        const r = e.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
      tops.forEach((e, i) => e.setAttribute('data-host-sample', String(i)));
      return tops.length;
    });
    expect(n).toBeGreaterThan(100);
    await sameUnderHost(page, Array.from({ length: n }, (_, i) => page.locator(`[data-host-sample="${i}"]`)));
  });
}
