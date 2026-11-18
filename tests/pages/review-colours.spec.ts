// Review polish FE_01 (rulings 1, 3 and 5): the container frame and the hover box's border take the
// next step up the Lines scale (--vb-line-contrast), and a selected card of every kind is lifted
// toward the strong ink, about two-thirds of a step (--vb-select-lift 35%) with a little more
// saturation (--vb-select-chroma 1.25; review polish round 2 ruling 5, from FE_01's full step, 50%,
// in srgb). The maintainer chose these by eye, so the
// APCA scores are measured and written to the test report, not gated; the only bar is that each pair
// is clearer than the value it replaces. The container has no fill (ruling 1 answer, chat 126).
import { expect, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { lc, pixel, resolved } from './apca.ts';

const KINDS = ['question', 'finding', 'decision', 'risk', 'action', 'topic', 'note', 'app'];

const THEMES: Theme[] = ['light', 'dark'];

test.beforeEach(async ({ page }) => {
  await page.goto('/gallery.html');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
});

for (const theme of THEMES) {
  test(`${theme}: the container frame is drawn in the Lines scale's next step, with no fill`, async ({ page }) => {
    await setTheme(page, theme);
    const frame = page.locator('section[data-pattern="region"] vb-region').first();
    // FIX_06: the lines are drawn by ::before (top and bottom) and ::after (sides), the frame's own border is transparent.
    const [top, side] = await frame.evaluate((e) => [getComputedStyle(e, '::before').borderTopColor, getComputedStyle(e, '::after').borderLeftColor]);
    const border = top;
    expect(await pixel(page, side)).toEqual(await pixel(page, top));
    expect(await pixel(page, border)).toEqual(await pixel(page, await resolved(page, 'var(--vb-line-contrast)')));
    // Ruling answer 126: the inside is left as it is, and the fill and grey-lift tokens are not added.
    expect(await frame.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
    const names = await page.evaluate(() => ['--vb-region-fill', '--vb-select-lift-grey']
      .filter((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim() !== ''));
    expect(names).toEqual([]);
    // Clearer than the step it replaces (reported, not gated: chosen by eye, D-009).
    const canvas = await pixel(page, await resolved(page, 'var(--vb-surface-canvas)'));
    const now = lc(await pixel(page, await resolved(page, 'var(--vb-line-strong)')), canvas);
    const next = lc(await pixel(page, border), canvas);
    test.info().annotations.push({ type: `${theme} frame on canvas`, description: `Lc ${next.toFixed(1)} (was ${now.toFixed(1)})` });
    expect(next).toBeGreaterThan(now);
  });

  test(`${theme}: every hover box has the same visible border`, async ({ page }) => {
    await setTheme(page, theme);
    // A .vb-tip is in the document while closed; its border colour is computed either way. The boxes beside a node
    // (the proposal and history boxes) wear the box's own look (node-box.css, FE_03 run 2), a mark's tip the marks'
    // (node-edges.css, FE_02), and a skin's tips its own tokens (a Command Lens root in the gallery): not a hover box's.
    const tips = page.locator('.vb-tip:not(.vb-node-box, .vb-mark-tip, .g-skin .vb-tip)');
    expect(await tips.count()).toBeGreaterThan(0);
    const want = await pixel(page, await resolved(page, 'var(--vb-line-contrast)'));
    // Each distinct colour once: the gallery holds hundreds of tips, and a pixel read per tip took the test
    // to the edge of its 30s (27s light, 30s dark under load).
    const borders = new Set(await tips.evaluateAll((all) => all.map((e) => getComputedStyle(e).borderTopColor)));
    for (const border of borders) {
      expect(await pixel(page, border)).toEqual(want);
    }
    const raised = await pixel(page, await resolved(page, 'var(--vb-surface-raised)'));
    const now = lc(await pixel(page, await resolved(page, 'var(--vb-line-strong)')), raised);
    const next = lc(want, raised);
    test.info().annotations.push({ type: `${theme} tip border on its box`, description: `Lc ${next.toFixed(1)} (was ${now.toFixed(1)})` });
    expect(next).toBeGreaterThan(now);
  });

  test(`${theme}: a selected card of every kind wears its own selected edge, thicker, and no outer ring (DD-09)`, async ({ page }) => {
    await setTheme(page, theme);
    const token = (name: string) => page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);
    expect([await token('--vb-select-lift'), await token('--vb-select-chroma')]).toEqual(['35%', '1.25']);
    const canvas = await pixel(page, await resolved(page, 'var(--vb-surface-canvas)'));
    const selected = page.locator('section[data-pattern="node"] vb-node[data-selected]');
    await expect(selected).toHaveCount(KINDS.length + 1); // the old "Selected" risk, and one of each kind
    for (const kind of KINDS) {
      const card = page.locator(`section[data-pattern="node"] [data-selected-kinds] vb-node[data-kind="${kind}"]`);
      await expect(card, kind).toHaveCount(1);
      const border = await card.evaluate((e) => getComputedStyle(e).borderTopColor);
      // The node's own border, its selected edge (node-edges.css `--vb-select-edge`, read in the node's own scope); no outer ring.
      const edge = await card.evaluate((e) => {
        const probe = document.createElement('i');
        probe.style.setProperty('color', 'var(--vb-select-edge)');
        e.append(probe);
        const c = getComputedStyle(probe).color;
        probe.remove();
        return c;
      });
      const lifted = await pixel(page, edge);
      expect(await pixel(page, border), `${kind} border`).toEqual(lifted);
      expect(await card.evaluate((e) => getComputedStyle(e).outlineStyle), `${kind} no outer ring`).toBe('none');
      expect(await card.evaluate((e) => getComputedStyle(e).boxShadow), `${kind} thicker`).toMatch(/inset/);
      const plain = await pixel(page, await resolved(page, `var(--vb-kind-${kind})`));
      const [was, now] = [lc(plain, canvas), lc(lifted, canvas)];
      test.info().annotations.push({ type: `${theme} selected ${kind} on canvas`, description: `Lc ${now.toFixed(1)} (was ${was.toFixed(1)})` });
      expect(now, kind).toBeGreaterThanOrEqual(was);
    }
  });
}
