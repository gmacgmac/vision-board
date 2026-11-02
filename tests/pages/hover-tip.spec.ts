// A hover tip stays open while the pointer travels to it (hover-tip-reachable, WCAG 1.4.13 hoverable):
// an agent reply's or a note's full text beside the card, scrolled with the wheel once the pointer is
// on it. The pointer walks from the anchor to the tip in small steps, straight and diagonal, at full
// size and zoomed out; the tip closes about 300 ms after the pointer leaves both (the shared grace,
// tip/close-grace.ts) and at once on Esc.
//
// Each test draws its own board through the API, as an agent would (agent-board.ts).
import type { Locator, Page } from '@playwright/test';
import { expect, test, bid } from './helpers.ts';
import { act, card, draw, open, reply, write } from './agent-board.ts';
import { box } from './board-page.ts';

const LONG = Array.from({ length: 30 }, (_, i) => `Line ${i + 1} of a long answer.`).join('\n\n');
const STEPS = 30;

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

type Kind = 'reply' | 'note';
const anchorOf = (page: Page, n: number, kind: Kind) => card(page, n).locator(kind === 'reply' ? '.vb-node-reply' : '.vb-node-note');

async function drawn(page: Page, request: Parameters<typeof draw>[0]) {
  const d = await draw(request);
  const [n] = d.n as [number];
  const seq = await act(page, d, { action: 'comment', n, ver: 1, text: LONG });
  await open(page, d);
  await reply(request, d, n, LONG, seq);
  await expect(anchorOf(page, n, 'reply')).toHaveCount(1);
  return n;
}

const isOpen = (a: Locator) => a.evaluate((e) => e.hasAttribute('data-tip-open'));

/** The pointer walks from `from` to `to` in small steps; the tip must stay open at every one. */
async function walk(page: Page, a: Locator, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await expect(a).toHaveAttribute('data-tip-open', '');
  for (let i = 1; i <= STEPS; i += 1) {
    const x = from.x + ((to.x - from.x) * i) / STEPS;
    const y = from.y + ((to.y - from.y) * i) / STEPS;
    await page.mouse.move(x, y);
    await page.waitForTimeout(16);
    if (await isOpen(a)) continue;
    const under = await page.evaluate(([px, py]) => document.elementFromPoint(px!, py!)?.className, [x, y]);
    expect(false, `closed at step ${i} of ${STEPS}, (${Math.round(x)}, ${Math.round(y)}) over ${under}`).toBe(true);
  }
}

/** How far the tip's text has scrolled: the tip itself, or the body inside it. */
const scrolled = (tip: Locator) => tip.evaluate((t) => Math.max(t.scrollTop, ...[...t.querySelectorAll<HTMLElement>('*')].map((e) => e.scrollTop)));

for (const kind of ['reply', 'note'] as const) {
  for (const zoom of ['full size', 'zoomed out'] as const) {
    test(`a ${kind}'s tip stays open while the pointer crosses to it, at ${zoom}, and the wheel scrolls it`, async ({ page, request }) => {
      const n = await drawn(page, request);
      if (zoom === 'zoomed out') {
        for (let i = 0; i < 2; i += 1) await page.keyboard.press('-');
        await expect(page.locator(bid('stage'))).not.toHaveAttribute('data-zoom', 'far');
        await page.waitForTimeout(300);
      }
      const a = anchorOf(page, n, kind);
      const tip = a.locator('.vb-note-tip');
      await a.hover();
      await expect(tip).toBeVisible();
      const r = await box(a);
      const t = await box(tip);
      const mid = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
      // The tip's middle, or as far down as the anchor goes: below that the path leaves the card's
      // line and crosses its neighbours, which is another anchor.
      const tipMid = { x: t.x + t.width / 2, y: Math.min(t.y + Math.min(t.height / 2, 120), r.y + r.height - 5) };
      await walk(page, a, { x: r.x + r.width - 10, y: r.y + 20 }, { x: t.x + 40, y: r.y + 20 });
      await walk(page, a, mid, tipMid);
      await walk(page, a, { x: r.x + r.width / 2, y: r.y + r.height - 5 }, tipMid);
      await walk(page, a, { x: r.x + r.width - 10, y: r.y + 20 }, { x: t.x + 40, y: r.y + 20 });
      const board = await box(card(page, n));
      await page.mouse.wheel(0, 300);
      await expect.poll(() => scrolled(tip)).toBeGreaterThan(0);
      expect(await isOpen(a)).toBe(true);
      expect((await box(card(page, n))).y, 'the board did not pan').toBe(board.y);
    });
  }

  test(`a ${kind}'s tip closes about 300 ms after the pointer leaves both, and at once on Esc`, async ({ page, request }) => {
    const n = await drawn(page, request);
    const a = anchorOf(page, n, kind);
    const tip = a.locator('.vb-note-tip');
    await a.hover();
    await expect(tip).toBeVisible();
    // Away from the card and the tip: it holds for the grace, then closes.
    const left = Date.now();
    await page.mouse.move(5, 5);
    expect(await isOpen(a), 'held through the grace').toBe(true);
    await expect(tip).toBeHidden();
    const took = Date.now() - left;
    expect(took, `closed after ${took} ms`).toBeGreaterThanOrEqual(250);
    expect(took).toBeLessThan(1200);
    // Back within the grace: it never closed.
    await a.hover();
    await expect(tip).toBeVisible();
    await page.mouse.move(5, 5);
    await a.hover();
    await page.waitForTimeout(500);
    expect(await isOpen(a)).toBe(true);
    // Esc closes it with no wait.
    await page.keyboard.press('Escape');
    expect(await isOpen(a)).toBe(false);
  });
}

test('a card popover opened by hover stays open while the pointer crosses the card to it, and closes after the grace when it does not', async ({ page, request }) => {
  const d = await draw(request);
  const [n] = d.n as [number];
  await write(request, d, [{ type: 'park', n, bundle: { situation: 'Short.', background: 'Short.', assessment: 'Short.', recommendation: 'Short.', sources: ['One'] } }]);
  await open(page, d);
  const tab = card(page, n).locator('.vb-node-btab[data-tab="handover"]');
  const pop = card(page, n).locator('.vb-card-pop[data-pop="handover"]');
  await tab.hover();
  await expect(pop).toBeVisible();
  const t = await box(pop);
  // A person's quick sweep from the tab, up across the card, onto the box.
  await page.mouse.move(t.x + 40, t.y + 20, { steps: 12 });
  await page.waitForTimeout(500);
  await expect(pop).toBeVisible();
  // Away from both: it holds for the grace, then closes.
  await page.mouse.move(5, 5);
  await expect(pop).toBeHidden();
});
