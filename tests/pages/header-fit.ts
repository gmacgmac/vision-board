// The header's fit, as the header specs check it (header-tiers.spec.ts, ledgers.spec.ts): nothing in the bar is cut
// off, outside it or over another part, the bar and the page do not scroll sideways, and no id is on the page twice;
// and axe passes on the page outside the board's stage.
import type { Page } from '@playwright/test';
import { axeFindings, bid, expect } from './helpers.ts';

/** The bar's visible parts, flattened through the path, the page's parts (`.vb-part`, which take no box of their own) and
 *  the groups, with their boxes. */
const parts = (page: Page) => page.evaluate((counts) => {
  const bar = document.querySelector('.vb-toolbar') as HTMLElement;
  const shown = [...bar.querySelectorAll<HTMLElement>(`.vb-brand, .vb-path > *, .vb-path > .vb-part > *, :scope > *, :scope > .vb-part > *, ${counts} > *, .vb-toolbar-end > *`)]
    .filter((e) => !e.matches(`.vb-visually-hidden, .vb-path, .vb-toolbar-end, ${counts}, [hidden]`) && e.getClientRects().length > 0 && getComputedStyle(e).position !== 'absolute')
    .map((e) => { const r = e.getBoundingClientRect(); return { name: e.id || (e.getAttribute('class') ?? e.tagName), left: r.left, right: r.right, width: r.width, top: r.top, bottom: r.bottom }; });
  return { scroll: bar.scrollWidth - bar.clientWidth, page: document.documentElement.scrollWidth - innerWidth, width: bar.getBoundingClientRect().width, height: bar.getBoundingClientRect().height, shown };
}, bid('counts'));

export async function expectWhole(page: Page, what: string) {
  const fit = await parts(page);
  expect(fit.scroll, `${what}: the bar scrolls`).toBeLessThanOrEqual(0);
  expect(fit.page, `${what}: the page scrolls sideways`).toBeLessThanOrEqual(0);
  for (const e of fit.shown) {
    expect(e.left, `${what}: ${e.name} starts inside`).toBeGreaterThanOrEqual(0);
    expect(e.right, `${what}: ${e.name} ends inside`).toBeLessThanOrEqual(fit.width);
    expect(e.top, `${what}: ${e.name} inside the bar's height`).toBeGreaterThanOrEqual(0);
    expect(e.bottom, `${what}: ${e.name} inside the bar's height`).toBeLessThanOrEqual(fit.height);
  }
  const sorted = [...fit.shown].sort((a, b) => a.left - b.left);
  for (let i = 1; i < sorted.length; i++) expect(sorted[i]!.left, `${what}: ${sorted[i]!.name} after ${sorted[i - 1]!.name}`).toBeGreaterThanOrEqual(sorted[i - 1]!.right - 0.5);
  // No id twice: the page and the tests reach a control by its id.
  const ids = await page.evaluate(() => [...document.querySelectorAll('[id]')].map((e) => e.id));
  expect(ids.filter((id, i) => ids.indexOf(id) !== i), `${what}: an id twice`).toEqual([]);
}

/** Axe, whole page; a card's small parts at this zoom (under 24px on the canvas, which zooms) are the cards' own tests'. */
export async function expectBarPasses(page: Page) {
  const found = await axeFindings(page);
  const bar = await page.evaluate(([all, stage]) => (all as typeof found).flatMap((f) => {
    const outside = f.id === 'target-size' ? f.targets.filter((t) => !document.querySelector(t)?.closest(stage as string)) : f.targets;
    return outside.length ? [`${f.id}: ${outside.join(', ')}`] : [];
  }), [found, bid('stage')] as const);
  expect(bar).toEqual([]);
}
