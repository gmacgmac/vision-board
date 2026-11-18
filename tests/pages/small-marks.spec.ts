// A node's marks and their pointer targets (FIX_02, the maintainer's points 430 to 438,
// replacing FIX_01's 86% rule). Every mark's hit area is 28px: at 100% each is at least 24px in both skins and axe excuses
// nothing. Down to the far breakpoint (viewport.ts MARK_FAR_K, about 37%) every mark takes its press, with the hand
// cursor (at 83% and at 45%). Below it the stage carries data-marks="small": a press on a mark selects its node only, no
// hand, and the keyboard still presses it. Below 100% axe's target-size is excused only for a mark drawing under 24px
// (helpers.ts `expectNoAxeOnBoard`).
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeOnBoard, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { card, joinAgent, open, write } from './agent-board.ts';
import { mark, menuOf } from './edge-board.ts';
import { zoomTo } from './rail-board.ts';

const FLAGS = '?vbwork';
const SKINS = ['default', 'command-lens'] as const;
const THEMES: Theme[] = ['dark', 'light'];
/** Above the far breakpoint (the maintainer's 83% and 45%), and below it. */
const PRESSED = [0.83, 0.45];
const FAR = 0.3;
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
      expect(a.w, `${a.name} width`).toBeGreaterThanOrEqual(24);
      expect(a.h, `${a.name} height`).toBeGreaterThanOrEqual(24);
    }
    await expectNoAxeViolations(page);
  });
}

for (const skin of SKINS) {
  test(`marks take their press, with the hand, down to the far breakpoint; past it a press selects the node only (${skin})`, async ({ page, request }) => {
    await page.setViewportSize({ width: 1600, height: 1000 });
    const d = await draw(request, skin);
    await open(page, d, FLAGS, 4);
    const [q] = d.n as [number];
    const answer = skin === 'default' ? 'answer' : 'tick';
    for (const k of PRESSED) {
      await zoomTo(page, k);
      await expect(page.locator('[data-marks="small"]')).toHaveCount(0);
      await expect(mark(page, q, 'notes')).toHaveCSS('cursor', 'pointer');
      // The disc opens its picker; a switch's half answers (Tick at 83%, Cross at 45%).
      const half = k === PRESSED[0] ? 'tick' : 'cross';
      await mark(page, q, skin === 'default' ? answer : half).click();
      if (skin === 'default') {
        await expect(menuOf(page, `Answer item ${q}`)).toBeVisible();
        await page.keyboard.press('Escape');
      } else await expect(mark(page, q, half), `${half} at ${k}`).toHaveAttribute('aria-pressed', 'true');
      await mark(page, q, 'notes').click();
      await expect(page.locator('vb-note-bubble.vb-node-box')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('vb-note-bubble.vb-node-box')).toBeHidden();
      await expectNoAxeOnBoard(page);
    }
    // Past the far breakpoint: a press selects the node, as on its body, and does nothing else; no hand.
    await zoomTo(page, FAR);
    await expect(page.locator('.vb-stage[data-marks="small"]')).toHaveCount(1);
    await page.locator('.vb-stage').click({ position: { x: 4, y: 4 } }); // nothing selected
    await mark(page, q, answer).click();
    await expect(card(page, q)).toHaveAttribute('data-selected', '');
    await expect(page.locator('.vb-mark-menu')).toHaveCount(0);
    await mark(page, q, 'number').click();
    await mark(page, q, 'notes').click();
    await expect(page.locator('vb-note-bubble.vb-node-box')).toBeHidden();
    await expect(card(page, q)).not.toHaveAttribute('data-bookmarked', '');
    if (skin !== 'default') await expect(mark(page, q, 'cross')).toHaveAttribute('aria-pressed', 'true'); // the press changed nothing
    await expect(mark(page, q, 'number')).not.toHaveCSS('cursor', 'pointer');
    await expectNoAxeOnBoard(page);
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
