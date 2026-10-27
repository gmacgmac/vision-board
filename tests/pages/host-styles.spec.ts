// The board in a host's page (UI_01; nclite's plugin contract, docs/plugins.md § The view and its
// host: the host's element rules reach in). A host's stylesheet restyles h1-h3 (small, in capitals),
// p, button, input, select, textarea and dialog for the whole page; the board draws exactly as on its
// own page, at the full window and at a pane's width (550px), and so do the gallery's samples of the
// shared base and the patterns. The board sets every property it relies on (#ui base/root.css).
// Pixels are compared before and after the host's sheet goes in, on one page: no new baseline.
import type { Locator, Page } from '@playwright/test';
import { expect, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { startRoadmapServer } from './roadmap-server.ts';

const THEMES: Theme[] = ['light', 'dark'];

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

/** Open the board and wait until it has drawn and stopped moving. */
async function openBoard(page: Page, base: string): Promise<void> {
  await page.goto(`${base}/?flags=-chatPanel`);
  await expect(page.locator('vb-node').first()).toBeVisible();
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
  await expect(page.locator('#wires')).not.toHaveClass(/settling/);
}

/** Each target's pixels on the page as it is, then under the host's sheet: they must not change. */
async function sameUnderHost(page: Page, targets: Locator[]): Promise<void> {
  const own = [];
  for (const t of targets) own.push(await t.screenshot({ animations: 'disabled' }));
  await page.addStyleTag({ content: HOST });
  for (const [i, t] of targets.entries()) {
    const hosted = await t.screenshot({ animations: 'disabled' });
    expect(Buffer.compare(own[i]!, hosted), `target ${i} changed under the host's element rules`).toBe(0);
  }
}

for (const theme of THEMES) {
  for (const width of [1600, 550]) {
    test(`the board draws the same under a host's element rules, ${width}px wide (${theme})`, async ({ page }) => {
      const roadmap = await startRoadmapServer();
      try {
        await page.setViewportSize({ width, height: 1000 });
        await setTheme(page, theme);
        await openBoard(page, roadmap.base);
        await sameUnderHost(page, [page.locator('body')]);
      } finally {
        await roadmap.close();
      }
    });
  }

  test(`the gallery's samples of the base and the patterns draw the same under a host's element rules (${theme})`, async ({ page }) => {
    // About 250 samples, each shot twice.
    test.setTimeout(180_000);
    await setTheme(page, theme);
    // Without the chat panel's samples: the chat is the standalone page's (nclite brings its own).
    await page.goto('/gallery.html?flags=-openList,-chatPanel');
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
