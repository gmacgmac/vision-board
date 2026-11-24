// Scroll first, then pan (FIX_04 ruling 2, point 460; settles tracker M4): over anything that can scroll in the wheel's
// direction (the conversation box's thread, the history list, a code block in a node's body) the wheel scrolls it and
// the board does not move; a flick that carries it to its end stops there, the rest of that gesture never pans or zooms;
// only a new gesture, after a pause, that starts at the end pans. Ctrl or Cmd with the wheel always zooms. Trackpad-style small deltas and
// mouse-style large ones. On a board of its own.
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './helpers.ts';
import { act, card, open, reply, write } from './agent-board.ts';
import { drawEdges, mark } from './edge-board.ts';
import { box, scale, world } from './board-page.ts';

const FLAGS = '?vbwork';
const LONG = Array.from({ length: 30 }, (_, i) => `Line ${i + 1} of a long answer.`).join('\n\n');
const CODE = ['```', ...Array.from({ length: 40 }, (_, i) => `step ${i + 1}: run the check`), '```'].join('\n');
/** Longer than a gesture's quiet gap: the next wheel is a new gesture. */
const GAP = 450;

const middle = async (l: Locator) => { const b = await box(l); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const top = (l: Locator) => l.evaluate((e) => e.scrollTop);
const end = (l: Locator) => l.evaluate((e) => e.scrollHeight - e.clientHeight);

/** One gesture at `at`: `count` wheel events of `dy` each, `every` ms apart (a trackpad flick: small and many; a mouse:
 *  large and few). Whether the board moved during it, read after it settled. */
async function gesture(page: Page, at: { x: number; y: number }, dy: number, count: number, every = 16): Promise<boolean> {
  await page.mouse.move(at.x, at.y);
  const before = await world(page);
  for (let i = 0; i < count; i += 1) {
    await page.mouse.wheel(0, dy);
    if (every) await page.waitForTimeout(every);
  }
  await page.waitForTimeout(GAP);
  return (await world(page)) !== before;
}

/** Scroll `el` back to its top, as a gesture of its own, then wait the gap out. */
const toTop = async (page: Page, el: Locator) => { await el.evaluate((e) => { e.scrollTop = 0; }); await page.waitForTimeout(GAP); };

/** Node `q`'s conversation box with a long note and a long reply, once the reply shows in its thread (a reply that lands
 *  after the box opened draws it again, at the latest). */
async function longThread(page: Page, request: Parameters<typeof drawEdges>[0], d: Awaited<ReturnType<typeof drawEdges>>, q: number): Promise<Locator> {
  const seq = await act(page, d, { action: 'comment', n: q, ver: 1, text: LONG });
  await reply(request, d, q, LONG, seq);
  await mark(page, q, 'notes').click();
  const thread = page.locator('vb-note-bubble.vb-node-box .vb-nb-thread');
  await expect(thread.locator('.vb-nb-reply')).toHaveCount(1);
  return thread;
}

async function scrollsThenPans(page: Page, el: Locator, style: 'trackpad' | 'mouse') {
  expect(await end(el), 'it has room to scroll').toBeGreaterThan(40);
  const at = await middle(el);
  const [dy, count] = style === 'trackpad' ? [12, 6] : [100, 1];
  expect(await gesture(page, at, dy, count), 'a small scroll: it scrolls, the board stays').toBe(false);
  expect(await top(el)).toBeGreaterThan(0);
  // A flick far past its end: it stops there; the rest of that gesture does not pan.
  const [fdy, fcount] = style === 'trackpad' ? [40, 60] : [120, 25];
  expect(await gesture(page, at, fdy, fcount), 'a flick to the end: the board stays').toBe(false);
  expect(await top(el)).toBeGreaterThanOrEqual((await end(el)) - 1);
  // A new gesture at its end pans the board.
  expect(await gesture(page, at, dy, count), 'the next gesture at its end pans').toBe(true);
  await toTop(page, el);
}

test.describe('scroll first, then pan', () => {
  for (const style of ['trackpad', 'mouse'] as const) {
    test(`the conversation box's thread (${style})`, async ({ page, request }) => {
      const d = await drawEdges(request);
      const q = d.n[0]!;
      await open(page, d, FLAGS);
      const thread = await longThread(page, request, d, q);
      await expect(thread).toBeVisible();
      await toTop(page, thread);
      await scrollsThenPans(page, thread, style);
    });

    test(`the history list (${style})`, async ({ page, request }) => {
      const d = await drawEdges(request);
      const f = d.n[1]!;
      for (let v = 2; v <= 16; v += 1) await write(request, d, [{ type: 'node', n: f, node: { region: 'p', kind: 'finding', title: `Rain fade, take ${v}` } }]);
      await open(page, d, FLAGS);
      await mark(page, f, 'badge').click();
      const list = card(page, f).locator('.vb-node-box[data-pop="history"] .vb-history-body');
      await expect(list).toBeVisible();
      await toTop(page, list);
      await scrollsThenPans(page, list, style);
    });

    test(`a code block in a node's body (${style})`, async ({ page, request }) => {
      const d = await drawEdges(request);
      const [r] = await write(request, d, [{ type: 'node', node: { region: 'q', kind: 'finding', title: 'The checks', body: CODE } }]);
      await open(page, { ...d, n: [...d.n, r!.n!] }, FLAGS);
      const code = card(page, r!.n!).locator('pre').first();
      await expect(code).toBeVisible();
      await scrollsThenPans(page, code, style);
    });
  }

  test('a gesture that opens with an event of no movement is still the thread\'s: the board stays', async ({ page, request }) => {
    const d = await drawEdges(request);
    const q = d.n[0]!;
    await open(page, d, FLAGS);
    const thread = await longThread(page, request, d, q);
    await toTop(page, thread);
    const before = await world(page);
    // Synthetic events scroll nothing themselves: the board's handler prevents the default exactly when it takes one.
    const taken = await thread.evaluate((e) => [0, 30, 30, 30, 0, 30].map((dy) => {
      const w = new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true, composed: true });
      e.dispatchEvent(w);
      return w.defaultPrevented;
    }));
    expect(taken.slice(1), 'no moving event of the gesture is the board\'s').toEqual([false, false, false, false, false]);
    expect(await world(page)).toBe(before);
  });

  test('a mouse wheel that counts in lines pans the board by lines, not by pixels', async ({ page, request }) => {
    const d = await drawEdges(request);
    await open(page, d, FLAGS);
    const ty = () => page.locator('.vb-world').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).f);
    const y0 = await ty();
    await page.locator('.vb-stage').evaluate((e) => {
      e.dispatchEvent(new WheelEvent('wheel', { deltaY: 3, deltaMode: WheelEvent.DOM_DELTA_LINE, bubbles: true, cancelable: true, clientX: 5, clientY: 5 }));
    });
    expect(y0 - (await ty()), 'three lines down').toBeGreaterThanOrEqual(40);
  });

  // The maintainer's "that momentum must basically be killed by the time it gets to the bottom" (bookmark-list-and-scroll-end
  // task): a gesture that starts in the thread is the thread's until a quiet gap. FIX_05 ended it when the stream rose,
  // which a real trackpad does mid-gesture (fingers speed up, momentum starts faster, a busy frame coalesces two
  // events), and the rest panned. Real wheel events, one a frame: the thread scrolls itself.
  test('a flick that reaches the end of the thread stops there: the rest of the gesture, rises and Ctrl too, moves nothing', async ({ page, request }) => {
    const d = await drawEdges(request);
    const q = d.n[0]!;
    await open(page, d, FLAGS);
    const thread = await longThread(page, request, d, q);
    await toTop(page, thread);
    const at = await middle(thread);
    await page.mouse.move(at.x, at.y);
    const before = await world(page);
    const k = await scale(page);
    const wheel = async (dys: number[]) => { for (const dy of dys) { await page.mouse.wheel(0, dy); await page.waitForTimeout(16); } };
    // Fingers that slow and speed up, then a tail decaying 7% a frame that starts faster than they left off.
    await wheel([20, 60, 40, 20, 10, 60, 120, 160]);
    const tail = Array.from({ length: 50 }, (_, i) => Math.max(1, Math.round(160 * 0.93 ** i)));
    tail.splice(20, 2, tail[20]! + tail[21]!); // a busy frame: two events as one
    await wheel(tail);
    expect(await top(thread)).toBeGreaterThanOrEqual((await end(thread)) - 1);
    expect(await world(page), 'the tail at the end moves nothing').toBe(before);
    // Still the same gesture: a push with no pause, and Ctrl held.
    await wheel([2, 6, 14, 24, 30]);
    await page.keyboard.down('Control');
    await wheel([-20, -20]);
    await page.keyboard.up('Control');
    await wheel([30, 30]);
    expect(await world(page), 'nothing in the gesture pans').toBe(before);
    expect(await scale(page), 'or zooms').toBe(k);
    // After a pause, a new gesture at the end pans.
    await page.waitForTimeout(GAP);
    await wheel([12, 12, 12]);
    await expect.poll(() => world(page), { message: 'the next gesture pans' }).not.toBe(before);
  });

  test('a board scroller has no elastic bounce: its overscroll does nothing', async ({ page, request }) => {
    const d = await drawEdges(request);
    const q = d.n[0]!;
    await open(page, d, FLAGS);
    const thread = await longThread(page, request, d, q);
    await expect(thread).toHaveCSS('overscroll-behavior-y', 'none');
    await expect(card(page, q)).toHaveCSS('overscroll-behavior-y', 'none');
  });

  test('Ctrl + wheel over the thread zooms the board, and leaves the thread where it was', async ({ page, request }) => {
    const d = await drawEdges(request);
    const q = d.n[0]!;
    await open(page, d, FLAGS);
    const thread = await longThread(page, request, d, q);
    await toTop(page, thread);
    const at = await middle(thread);
    await page.mouse.move(at.x, at.y);
    const k = await scale(page);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -200);
    await page.keyboard.up('Control');
    await expect.poll(() => scale(page)).toBeGreaterThan(k);
    expect(await top(thread)).toBe(0);
  });
});
