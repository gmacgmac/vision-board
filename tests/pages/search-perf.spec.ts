// Search on the 1,000-card performance board (cardSearch flag, SEARCH_02; docs/specification/performance.md
// "One change shown"): each keystroke in the box, the first one building the index, is searched,
// marked and styled in under 50 ms (median of the keystrokes), and costs the board no draw: no card
// updated, measured or placed, no container laid out, no fetch (`window.__vbWork`, work.ts). Timing
// in the page: from the field's input event to the style and layout it forces, done.
import { expect, test } from './helpers.ts';
import { BIG } from '#format/testing';
import { PERF_BASE } from './ports.ts';

interface Work { cardsUpdated: number; cardsMeasured: number; cardsPlaced: number; containersLaidOut: number; fullFetches: number }

test('typing a search on the 1,000-card board: each keystroke under 50 ms, and nothing drawn again', async ({ page }) => {
  await page.goto(`${PERF_BASE}/?vbwork#${BIG.board}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
  await page.evaluate(async () => {
    const hook = (window as unknown as { __vbWork: { idle(): Promise<void>; reset(): void } }).__vbWork;
    await hook.idle();
    hook.reset();
  });
  await page.keyboard.press('/');
  const field = page.getByRole('textbox', { name: 'Find a card' });
  await expect(field).toBeFocused();
  const times = await page.evaluate(async (query) => {
    const input = document.querySelector<HTMLInputElement>('.vb-go-field')!;
    const out: number[] = [];
    for (let i = 1; i <= query.length; i += 1) {
      const t = performance.now();
      input.value = query.slice(0, i);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await Promise.resolve(); // the box's own update (Svelte, a microtask)
      void document.body.offsetHeight; // the style and layout the marks cost
      out.push(performance.now() - t);
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    }
    return out;
  }, 'the sta');
  await expect(page.locator('.vb-world[data-search]')).toHaveCount(1);
  const marked = await page.locator('vb-node[data-found]').count();
  const work = await page.evaluate(async () => {
    const hook = (window as unknown as { __vbWork: { idle(): Promise<void>; work: Work } }).__vbWork;
    await hook.idle();
    return structuredClone(hook.work);
  });
  const sorted = [...times].sort((x, y) => x - y);
  console.log(`[SEARCH_02] keystrokes on ${BIG.regions * BIG.perRegion} cards, ${marked} marked: ${times.map((t) => t.toFixed(1)).join(', ')} ms (median ${sorted[Math.floor(sorted.length / 2)]!.toFixed(1)}, first ${times[0]!.toFixed(1)})`);
  expect([work.cardsUpdated, work.cardsMeasured, work.cardsPlaced, work.containersLaidOut, work.fullFetches]).toEqual([0, 0, 0, 0, 0]);
  expect(sorted[Math.floor(sorted.length / 2)]!).toBeLessThan(50);
  expect(Math.max(...times), 'the first keystroke builds the index').toBeLessThan(100);
});
