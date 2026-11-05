// Wheel chaining (wheelChaining flag, cortex-tasks/board/2026-11-05_board-app_wheel-chaining.md): the
// wheel scrolls what is under the pointer while it can still scroll that way, then the board pans. One
// gesture keeps the target its first wheel event found (board/input/wheel-latch.ts), so a flick that
// reaches a bubble's end stops there and the next gesture pans. Ctrl/Cmd + wheel zooms everywhere. Off,
// the note bubble and every hover tip keep the wheel and never pan. Light and dark.
//
// A gesture's latch is checked with synthetic wheel events (no default action, so they scroll nothing
// themselves): the board's handler prevents the default exactly when it pans or zooms.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, setTheme, test } from './helpers.ts';
import { act, card, draw, reply, write } from './agent-board.ts';
import type { Drawn } from './agent-board.ts';
import { box, bubble, scale, world } from './board-page.ts';
import { THEMES } from './rail-board.ts';

const LONG = Array.from({ length: 30 }, (_, i) => `Line ${i + 1} of a long answer.`).join('\n\n');
const TITLE = 'Pricing questions for the plans, the trials, the seats and discounts';
/** Longer than a gesture's quiet gap (WHEEL_GAP, 150 ms): the next wheel is a new gesture. */
const GAP = 400;

/** A board of its own: container "p" (a long title) with one card, its note `note` and the agent's reply `answer`. */
async function board(page: Page, request: APIRequestContext, note: string, answer: string, query = ''): Promise<Drawn & { n: [number] }> {
  const d = await draw(request, 0, 'wheel');
  const out = await write(request, d, [
    { type: 'region', region: { id: 'p', title: TITLE, mode: 'grid' } },
    { type: 'node', node: { region: 'p', kind: 'question', title: 'Is the trial 14 days?' } },
  ]);
  const n = out[1]!.n!;
  const seq = await act(page, d, { action: 'comment', n, ver: 1, text: note });
  await reply(request, d, n, answer, seq);
  await page.goto(`/${query}#${d.board}`);
  await expect(page.locator('vb-node')).toHaveCount(1);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
  await expect(card(page, n).locator('.vb-node-reply')).toHaveCount(1);
  return { ...d, n: [n] };
}

const middle = async (l: Locator) => { const b = await box(l); return { x: b.x + b.width / 2, y: b.y + Math.min(b.height / 2, 60) }; };
const scrollTop = (l: Locator) => l.evaluate((e) => e.scrollTop);
const room = (l: Locator) => l.evaluate((e) => e.scrollHeight - e.clientHeight);

/** One gesture of synthetic wheel events on `el` by `dy`: the first with room to scroll, the rest after `el`
 *  reached its end. Whether the board took each (prevented: it panned). */
const gesture = (el: Locator, dy: number) => el.evaluate((e, dy) => {
  const fire = () => {
    const w = new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true, composed: true });
    e.dispatchEvent(w);
    return w.defaultPrevented;
  };
  const [start, end] = dy < 0 ? [e.scrollHeight, 0] : [0, e.scrollHeight];
  e.scrollTop = start;
  const first = fire();
  e.scrollTop = end;
  return [first, fire(), fire()];
}, dy);

/** A synthetic wheel on `el` by `dy` as a gesture of its own: whether the board took it. */
const alone = (el: Locator, dy: number) => el.evaluate((e, dy) => {
  const w = new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true, composed: true });
  e.dispatchEvent(w);
  return w.defaultPrevented;
}, dy);

/** A real wheel at `at` by `dy`, and whether the board moved (waits long enough to see a pan). */
async function wheel(page: Page, at: { x: number; y: number }, dy: number): Promise<boolean> {
  await page.mouse.move(at.x, at.y);
  const before = await world(page);
  await page.mouse.wheel(0, dy);
  await page.waitForTimeout(GAP);
  return (await world(page)) !== before;
}

const thread = (page: Page) => bubble(page).locator('.vb-nb-thread');
/** Open the card's conversation (a press on the agent's reply): scrolled to the latest, at the bottom. */
async function conversation(page: Page, n: number): Promise<Locator> {
  await card(page, n).locator('.vb-node-reply').click();
  await expect(thread(page)).toBeVisible();
  return thread(page);
}

for (const theme of THEMES) {
  test.describe(theme, () => {
    test.beforeEach(async ({ page }) => {
      await setTheme(page, theme);
      await page.goto('/?setup'); // the page first, so page.request carries the person cookie
    });

    test('the wheel over a container\'s title, and over its full-title tip, pans', async ({ page, request }) => {
      await board(page, request, 'Short note.', 'Short reply.');
      const frame = page.locator('vb-region[data-region="p"]');
      const title = frame.locator('.vb-region-head h2');
      expect(await wheel(page, await middle(title), 120)).toBe(true);
      // The title is cut: its tip opens on hover, over the frame's top room.
      await title.hover();
      await expect(frame).toHaveAttribute('data-title-tip-open', '');
      const tip = frame.locator('.vb-title-tip');
      const t = await box(tip);
      await page.mouse.move(t.x + 20, t.y + t.height / 2, { steps: 5 });
      await expect(frame).toHaveAttribute('data-title-tip-open', '');
      expect(await alone(tip, 120), 'the tip has nothing to scroll: the board pans').toBe(true);
    });

    test('over a bubble with overflow the wheel scrolls it; the gesture that reaches its end does not pan, the next one does', async ({ page, request }) => {
      const { n: [n] } = await board(page, request, LONG, LONG);
      const list = await conversation(page, n);
      expect(await room(list)).toBeGreaterThan(0);
      const at = await middle(list);
      const bottom = await scrollTop(list);
      expect(bottom).toBeGreaterThan(0);
      expect(await wheel(page, at, -200), 'it scrolls, the board stays').toBe(false);
      expect(await scrollTop(list)).toBeLessThan(bottom);
      expect(await gesture(list, -100), 'reaching its end mid-gesture: still the bubble\'s').toEqual([false, false, false]);
      await page.waitForTimeout(GAP);
      expect(await scrollTop(list)).toBe(0);
      expect(await wheel(page, at, -200), 'the next gesture at its end pans').toBe(true);
    });

    test('over a bubble with nothing to scroll the wheel pans', async ({ page, request }) => {
      const { n: [n] } = await board(page, request, 'Short note.', 'Short reply.');
      const list = await conversation(page, n);
      expect(await room(list)).toBe(0);
      expect(await wheel(page, await middle(list), 120)).toBe(true);
    });

    test('over a long tip the wheel scrolls it; the gesture that reaches its end does not pan, the next one does', async ({ page, request }) => {
      const { n: [n] } = await board(page, request, LONG, 'Short reply.');
      const note = card(page, n).locator('.vb-node-note');
      const body = note.locator('.vb-note-tip .vb-tip-body');
      await note.hover();
      await expect(body).toBeVisible();
      const [a, t] = [await box(note), await box(body)];
      // Across to the tip along the note's top line, as a person does (hover-tip.spec.ts).
      await page.mouse.move(a.x + a.width - 10, a.y + 20);
      await page.mouse.move(t.x + 40, a.y + 20, { steps: 10 });
      await expect(note).toHaveAttribute('data-tip-open', '');
      expect(await wheel(page, { x: t.x + 40, y: a.y + 20 }, 200), 'it scrolls, the board stays').toBe(false);
      expect(await scrollTop(body)).toBeGreaterThan(0);
      await expect(note).toHaveAttribute('data-tip-open', '');
      expect(await gesture(body, 100)).toEqual([false, false, false]);
      await page.waitForTimeout(GAP);
      expect(await alone(body, 100), 'the next gesture at its end pans').toBe(true);
    });

    test('a text box scrolls only while it can', async ({ page, request }) => {
      const { n: [n] } = await board(page, request, 'Short note.', 'Short reply.');
      await card(page, n).focus();
      await page.keyboard.press('c');
      const text = bubble(page).locator('textarea');
      await expect(text).toBeVisible();
      await text.fill(LONG);
      await text.evaluate((e) => { e.scrollTop = 0; });
      expect(await room(text)).toBeGreaterThan(0);
      expect(await wheel(page, await middle(text), 120), 'it scrolls, the board stays').toBe(false);
      expect(await scrollTop(text)).toBeGreaterThan(0);
      expect(await gesture(text, 100)).toEqual([false, false, false]);
      await page.waitForTimeout(GAP);
      expect(await alone(text, 100), 'the next gesture at its end pans').toBe(true);
    });

    test('Ctrl + wheel zooms over a bubble too', async ({ page, request }) => {
      const { n: [n] } = await board(page, request, LONG, LONG);
      const list = await conversation(page, n);
      const at = await middle(list);
      await page.mouse.move(at.x, at.y);
      const [k, top] = [await scale(page), await scrollTop(list)];
      await page.keyboard.down('Control');
      await page.mouse.wheel(0, 200);
      await page.keyboard.up('Control');
      await expect.poll(() => scale(page)).toBeLessThan(k);
      expect(await scrollTop(list)).toBe(top);
    });

    test('flag off: the note bubble and the tips keep the wheel and never pan, as before', async ({ page, request }) => {
      const { n: [n] } = await board(page, request, LONG, LONG, '?flags=-wheelChaining');
      const list = await conversation(page, n);
      await list.evaluate((e) => { e.scrollTop = 0; });
      await page.waitForTimeout(GAP);
      expect(await alone(list, -100), 'at its end, the bubble still keeps it').toBe(false);
      expect(await wheel(page, await middle(list), -200)).toBe(false);
      expect(await alone(page.locator('vb-region[data-region="p"] .vb-title-tip'), 120), 'a tip keeps it').toBe(false);
    });
  });
}
