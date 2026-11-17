// A node's marks and their pointer targets (nodeEdges and skins flags; FIX_01, VERIFY_01 finding 2). Every mark's hit
// area is 28px (viewport.ts MARK_HIT): at 100% each is at least 24px in both skins and axe excuses nothing. Zoomed out
// where that draws under 24px (about 86%) the stage carries data-marks="small": a press on a mark is its node's (it
// selects the node; nothing is answered or bookmarked) and the keyboard still presses it. Only there do page specs
// excuse axe's target-size (helpers.ts `smallMarksExcused`).
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, smallMarksExcused, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { card, joinAgent, open, write } from './agent-board.ts';
import { mark, menuOf } from './edge-board.ts';
import { zoomTo } from './rail-board.ts';
import { MARK_HIT, TARGET_MIN } from '../../apps/board/src/board/canvas/viewport.ts';

const FLAGS = '?vbwork&flags=nodeEdges,skins';
const SKINS = ['default', 'command-lens'] as const;
const THEMES: Theme[] = ['dark', 'light'];
/** Just under and just over the zoom where a 28px hit area draws at 24px (6/7). */
const UNDER = 0.85;
const OVER = 0.87;
let boards = 0;

/** A board in `skin`: a question, a finding with an icon, a decision with a newer version (its change badge), a note. */
async function draw(request: APIRequestContext, skin: string) {
  const d = { agent: await joinAgent(request, 'Small marks chat'), board: `small-${Date.now()}-${(boards += 1)}` };
  const r = await write(request, d, [
    { type: 'board', title: 'Marks', skin },
    { type: 'region', region: { id: 'p', title: 'Uplink plan', mode: 'grid' } },
    { type: 'node', node: { region: 'p', kind: 'question', title: 'Book the second truck?' } },
    { type: 'node', node: { region: 'p', kind: 'finding', title: 'Rain fade on the link', icon: 'signal' } },
    { type: 'node', node: { region: 'p', kind: 'decision', title: 'Switch to the backup?' } },
    { type: 'node', node: { region: 'p', kind: 'note', title: 'Crew call at six' } },
  ]);
  const n = [r[2]!.n!, r[3]!.n!, r[4]!.n!, r[5]!.n!];
  await write(request, d, [{ type: 'node', n: n[2], node: { region: 'p', kind: 'decision', title: 'Switch to the backup now?' } }]);
  return { ...d, n };
}

/** Each drawn mark's hit area on screen: its box grown by its transparent edge (::before), scaled with the node. */
const hitAreas = (page: Page) => page.locator('vb-node[data-edges] button[data-mark]').evaluateAll((els) => els.flatMap((el) => {
  const r = el.getBoundingClientRect();
  if (!r.width) return [];
  const b = getComputedStyle(el, '::before');
  const s = r.height / (el as HTMLElement).offsetHeight;
  const out = b.content !== 'none' && b.position === 'absolute' ? [b.top, b.right, b.bottom, b.left].map((v) => Math.max(0, -parseFloat(v) || 0) * s) : [0, 0, 0, 0];
  return [{ name: el.getAttribute('aria-label') ?? el.dataset.mark, w: r.width + out[1]! + out[3]!, h: r.height + out[0]! + out[2]! }];
}));

test('MARK_HIT is a 22px mark with 3px of edge each side, and it draws at 24px at 6/7', () => {
  expect(MARK_HIT * (6 / 7)).toBeCloseTo(TARGET_MIN, 6);
});

for (const skin of SKINS) for (const theme of THEMES) {
  test(`at 100% every mark's hit area is at least 24px and axe excuses nothing (${skin}, ${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    await page.setViewportSize({ width: 1600, height: 1000 });
    const d = await draw(request, skin);
    await open(page, d, FLAGS, 4);
    await zoomTo(page, 1);
    await expect(page.locator('[data-marks="small"]')).toHaveCount(0);
    const areas = await hitAreas(page);
    expect(areas.length).toBeGreaterThan(8);
    for (const a of areas) {
      expect(a.w, `${a.name} width`).toBeGreaterThanOrEqual(TARGET_MIN);
      expect(a.h, `${a.name} height`).toBeGreaterThanOrEqual(TARGET_MIN);
    }
    expect(await smallMarksExcused(page)).toEqual([]);
    await expectNoAxeViolations(page);
  });
}

for (const skin of SKINS) {
  test(`zoomed out a press on a mark is its node's; the keyboard still presses it; axe excuses only target-size (${skin})`, async ({ page, request }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    const d = await draw(request, skin);
    await open(page, d, FLAGS, 4);
    const [q] = d.n as [number];
    const answer = skin === 'default' ? 'answer' : 'tick';
    // Just over the zoom: the marks take their press.
    await zoomTo(page, OVER);
    await expect(page.locator('[data-marks="small"]')).toHaveCount(0);
    await mark(page, q, answer).click();
    if (skin === 'default') {
      await expect(menuOf(page, `Answer item ${q}`)).toBeVisible();
      await page.keyboard.press('Escape');
    } else {
      await expect(mark(page, q, 'tick')).toHaveAttribute('aria-pressed', 'true');
      await page.waitForTimeout(450); // past the 400 ms guard on a second press (decision 7)
      await mark(page, q, 'tick').click(); // the lit half clears
      await expect(mark(page, q, 'tick')).toHaveAttribute('aria-pressed', 'false');
    }
    // Just under it: a press selects the node, as on its body, and does nothing else.
    for (const k of [UNDER, 0.3]) {
      await zoomTo(page, k);
      await expect(page.locator('.vb-stage[data-marks="small"]')).toHaveCount(1);
      await page.locator('.vb-stage').click({ position: { x: 4, y: 4 } }); // nothing selected
      await mark(page, q, answer).click();
      await expect(card(page, q)).toHaveAttribute('data-selected', '');
      await expect(page.locator('.vb-mark-menu')).toHaveCount(0);
      await mark(page, q, 'number').click();
      if (k === UNDER) await mark(page, q, 'notes').click(); // at 30% an empty notes mark gives way (crowded, zoom-groups.spec.ts)
      await expect(page.locator('vb-note-bubble.vb-node-box')).toBeHidden();
      await expect(card(page, q)).not.toHaveAttribute('data-bookmarked', '');
      if (skin !== 'default') await expect(mark(page, q, 'tick')).toHaveAttribute('aria-pressed', 'false');
      await expect(mark(page, q, 'number')).toHaveCSS('cursor', skin === 'default' ? 'default' : 'grab'); // the node's, or its plate's
      expect(await smallMarksExcused(page)).toEqual(['target-size']);
      await expectNoAxeViolations(page, await smallMarksExcused(page));
    }
    // The keyboard reaches and presses the marks as ever.
    await mark(page, q, 'number').focus();
    await page.keyboard.press('Enter');
    await expect(card(page, q)).toHaveAttribute('data-bookmarked', '');
    await mark(page, q, answer).focus();
    await page.keyboard.press('Enter');
    if (skin === 'default') await expect(menuOf(page, `Answer item ${q}`)).toBeVisible();
    else await expect(mark(page, q, 'tick')).toHaveAttribute('aria-pressed', 'true');
  });
}
