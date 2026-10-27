// The focus ring on a card a pointer focused (cortex-tasks/board/2026-10-09_board-app_pointer-focus-ring.md):
// a key that moves no focus (Z, Esc, Space) draws no ring on it; focus moved by the keyboard (Tab,
// Shift+Tab, J) shows it again, and a card the keyboard focused keeps it through Z (WCAG 2.4.7).
// Runs on the worker's roadmap board (servers.ts) and writes nothing to it. Focus never moves the board
// (review-polish ruling 11): those tests draw a board of their own (agent-board.ts).
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import type { Drawn } from './agent-board.ts';
import { act, open, reply, write } from './agent-board.ts';
import { card, openBoard, panBy, scale, stageBox, world } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];

/** The focus ring as drawn: the outline style of `el` ('none' when there is no ring). */
const ringOf = (page: Page, n: number) => card(page, n).evaluate((e) => getComputedStyle(e).outlineStyle);
const ringOnFocused = (page: Page) => page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);

async function clickCard(page: Page, n: number): Promise<void> {
  await card(page, n).locator('.vb-node-title').click({ position: { x: 4, y: 4 } });
}

/** Click card `n` and press Z: it zooms to the card, which keeps focus. */
async function clickAndZoom(page: Page, n: number): Promise<void> {
  const before = await scale(page);
  await clickCard(page, n);
  await expect(card(page, n)).toBeFocused();
  expect(await ringOf(page, n)).toBe('none');
  await page.keyboard.press('z');
  await expect.poll(() => scale(page)).toBeGreaterThan(before);
  await expect(card(page, n)).toBeFocused();
}

test('a clicked card shows no focus ring when Z, Space or Esc is pressed', async ({ page }) => {
  await openBoard(page);
  await clickAndZoom(page, 12);
  expect(await ringOf(page, 12)).toBe('none');
  await expect(card(page, 12)).toHaveAttribute('data-selected', '');
  for (const key of ['Space', 'Space', 'Escape']) {
    await page.keyboard.press(key);
    expect(await ringOf(page, 12), key).toBe('none');
  }
});

test('focus moved by the keyboard from a clicked card shows the ring: Tab, Shift+Tab, J', async ({ page }) => {
  await openBoard(page);
  await clickAndZoom(page, 12);
  await page.keyboard.press('Tab');
  await expect(card(page, 12)).not.toBeFocused();
  expect(await ringOnFocused(page)).toBe('solid');
  await page.keyboard.press('Shift+Tab');
  await expect(card(page, 12)).toBeFocused();
  expect(await ringOf(page, 12)).toBe('solid');
  // Clicked again, then J: the next card gets focus from the keyboard, ring and all.
  await clickCard(page, 12);
  await page.keyboard.press('z');
  expect(await ringOf(page, 12)).toBe('none');
  await page.keyboard.press('j');
  await expect(card(page, 12)).not.toBeFocused();
  expect(await ringOnFocused(page)).toBe('solid');
});

test('a card the keyboard focused keeps its ring through Z', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 12);
  await page.keyboard.press('j');
  const id = await page.evaluate(() => (document.activeElement as HTMLElement).dataset.id);
  expect(id).toBeDefined();
  expect(await ringOnFocused(page)).toBe('solid');
  await page.keyboard.press('Space');
  await page.keyboard.press('z');
  expect(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.id)).toBe(id);
  expect(await ringOnFocused(page)).toBe('solid');
});

test('a lasso and Z: no card shows a focus ring', async ({ page }) => {
  await openBoard(page);
  const f = (await page.locator('vb-region[data-region="review"]').boundingBox())!;
  await page.keyboard.down('Shift');
  await page.mouse.move(f.x + 2, f.y + f.height - 2);
  await page.mouse.down();
  await page.mouse.move(f.x + f.width - 2, f.y + 2, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(3);
  await page.keyboard.press('z');
  const rings = await page.locator('vb-node').evaluateAll((els) => els.map((e) => getComputedStyle(e).outlineStyle));
  expect(rings.filter((r) => r !== 'none')).toEqual([]);
});

for (const theme of THEMES) {
  test(`axe passes with a clicked card zoomed to by Z (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page);
    await clickAndZoom(page, 12);
    expect(await ringOf(page, 12)).toBe('none');
    await expectNoAxeViolations(page);
    await page.keyboard.press('Escape');
  });
}

// Focus never moves the board (review-polish ruling 11, PLAN decisions 1 and 2): a click on a card or
// any control in it, or the window getting focus back, neither pans nor zooms; the keyboard reaching
// a card wholly off screen pans it in; a card bigger than the stage is never fitted, only its
// top-left corner brought in. A small window and the top zoom make card 1 taller than the stage.

let still = 0;

/** A board of its own: a decision (1) and two questions, card 2 with a sent note and a reply. */
async function drawStill(page: Page, request: APIRequestContext): Promise<Drawn> {
  const r = await request.post('/api/agents', { data: { label: 'Pricing chat' } });
  expect(r.status(), await r.text()).toBe(201);
  const d = { agent: await r.json() as { secret: string }, board: `still-${Date.now()}-${(still += 1)}` };
  const results = await write(request, d, [
    { type: 'board', title: 'Still' },
    { type: 'region', region: { id: 'p', title: 'Pricing thread', mode: 'grid', columns: 3 } },
    { type: 'node', node: { region: 'p', kind: 'decision', title: 'Keep the free tier', body: '✓ keep it · ✗ cut it now' } },
    { type: 'node', node: { region: 'p', kind: 'question', title: 'Grandfather annual plans?' } },
    { type: 'node', node: { region: 'p', kind: 'question', title: 'Who owns the migration?' } },
  ]);
  const drawn = { ...d, n: results.slice(2).map((x) => x.n!) };
  await page.goto('/?setup');
  const note = await act(page, drawn, { action: 'comment', n: drawn.n[1], ver: 1, text: 'Ask finance first.' });
  await act(page, drawn, { action: 'send', board: drawn.board });
  await reply(request, drawn, drawn.n[1]!, 'Finance says yes.', note);
  return drawn;
}

const boxOf = async (page: Page, n: number) => (await card(page, n).boundingBox())!;

/** A 1000 by 320 window at the top zoom: card 1 is taller than the stage. */
async function openTall(page: Page, d: Drawn): Promise<void> {
  await page.setViewportSize({ width: 1000, height: 320 });
  await open(page, d);
  for (let i = 0; i < 20; i += 1) await page.keyboard.press('+');
  await expect.poll(() => scale(page)).toBeCloseTo(2.5, 3);
  expect((await boxOf(page, d.n[0]!)).height).toBeGreaterThan((await stageBox(page)).height);
}

test('a press on ✓ on a card bigger than the screen ticks it and does not pan', async ({ page, request }) => {
  const d = await drawStill(page, request);
  const [tall] = d.n as [number];
  await openTall(page, d);
  // Its top above the stage, its footer on screen: the card overflows, as it always does.
  const s = await stageBox(page);
  const b = await boxOf(page, tall);
  await panBy(page, s.x + 120 - b.x, s.y + s.height - 30 - (b.y + b.height));
  const check = card(page, tall).locator('button[data-act="ack"]');
  const [before, at] = [await world(page), (await check.boundingBox())!];
  await check.click();
  await expect(card(page, tall)).toHaveAttribute('data-status', 'acknowledged');
  expect(await world(page)).toBe(before);
  expect(await check.boundingBox()).toEqual(at);
});

test('a click on a card partly off screen, its note, its size control or its footer does not pan or zoom', async ({ page, request }) => {
  const d = await drawStill(page, request);
  const [, noted] = d.n as [number, number];
  await page.setViewportSize({ width: 1000, height: 600 });
  await open(page, d);
  for (let i = 0; i < 6; i += 1) await page.keyboard.press('+');
  // The noted card hangs off the stage's right edge, its top on the stage (its notes' head, card-polish
  // FE_02, made it taller than the stage's top half at this zoom).
  const s = await stageBox(page);
  const b = await boxOf(page, noted);
  await panBy(page, s.x + s.width - 60 - b.x - b.width / 2, Math.max(0, s.y + 40 - b.y));
  const before = await world(page);
  const c = card(page, noted);
  await c.locator('.vb-node-title').click({ position: { x: 4, y: 4 } });
  await expect(c).toBeFocused();
  expect(await world(page)).toBe(before);
  await c.locator('.vb-node-foot').click({ position: { x: 4, y: 4 } });
  expect(await world(page)).toBe(before);
  await c.locator('.vb-size-trig').click();
  expect(await world(page)).toBe(before);
  await page.keyboard.press('Escape');
  await c.locator('.vb-node-note').click();
  await expect(page.locator('vb-note-bubble')).toBeVisible();
  expect(await world(page)).toBe(before);
});

test('the window getting focus back does not pan', async ({ page, request }) => {
  const d = await drawStill(page, request);
  const [, second] = d.n as [number, number];
  await page.setViewportSize({ width: 1000, height: 600 });
  await open(page, d);
  for (let i = 0; i < 6; i += 1) await page.keyboard.press('+');
  // The keyboard brings card 2 in; the wheel then leaves it half off screen.
  await card(page, d.n[0]!).focus();
  await page.keyboard.press('j');
  await expect(card(page, second)).toBeFocused();
  const s = await stageBox(page);
  const b = await boxOf(page, second);
  await panBy(page, s.x + s.width - 60 - b.x - b.width / 2, 0);
  const before = await world(page);
  // The window loses focus and gets it back, as the browser tells the page (headless has no other
  // window): the window's blur, the card's focusout to nowhere while the page has no focus, then
  // the window's focus and the card's focusin.
  await page.evaluate(() => {
    const el = document.activeElement!;
    const hasFocus = document.hasFocus;
    document.hasFocus = () => false;
    el.dispatchEvent(new FocusEvent('blur', { relatedTarget: null }));
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    window.dispatchEvent(new FocusEvent('blur'));
    document.hasFocus = hasFocus;
    window.dispatchEvent(new FocusEvent('focus'));
    el.dispatchEvent(new FocusEvent('focus'));
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  });
  await page.waitForTimeout(100);
  expect(await world(page)).toBe(before);
});

/** Whether card `n` shows whole on the stage. */
async function inStage(page: Page, n: number): Promise<boolean> {
  const [s, b] = [await stageBox(page), await boxOf(page, n)];
  return b.y >= s.y && b.y + b.height <= s.y + s.height && b.x >= s.x && b.x + b.width <= s.x + s.width;
}

test('J or Tab to a card wholly off screen pans it fully in; Tab among one card\'s controls moves nothing', async ({ page, request }) => {
  const d = await drawStill(page, request);
  const [first, second, third] = d.n as [number, number, number];
  await page.setViewportSize({ width: 1000, height: 600 });
  await open(page, d);
  for (let i = 0; i < 2; i += 1) await page.keyboard.press('+');
  const s = await stageBox(page);
  // J from card 1 to card 2, wholly off screen below.
  await card(page, first).focus();
  await panBy(page, 0, s.y + s.height + 40 - (await boxOf(page, second)).y);
  await page.keyboard.press('j');
  await expect(card(page, second)).toBeFocused();
  await expect.poll(() => inStage(page, second)).toBe(true);
  // Tab from card 2 through its controls moves nothing; on into card 3, off screen right, pans it in.
  await panBy(page, s.x + s.width + 40 - (await boxOf(page, third)).x, 0);
  const before = await world(page);
  for (let i = 0; i < 30 && !(await card(page, third).evaluate((e) => e === document.activeElement)); i += 1) {
    expect(await page.evaluate((n) => !!document.activeElement?.closest(`vb-node[data-id="${n}"]`), second)).toBe(true);
    expect(await world(page)).toBe(before);
    await page.keyboard.press('Tab');
  }
  await expect(card(page, third)).toBeFocused();
  await expect.poll(() => inStage(page, third)).toBe(true);
});

test('K to a card bigger than the stage, wholly off screen: its top-left corner comes in, it is never fitted', async ({ page, request }) => {
  const d = await drawStill(page, request);
  const [tall, second] = d.n as [number, number];
  await openTall(page, d);
  const s = await stageBox(page);
  const k = await scale(page);
  await card(page, second).focus();
  const t = await boxOf(page, tall);
  await panBy(page, 0, s.y - 40 - (t.y + t.height));
  await page.keyboard.press('k');
  await expect(card(page, tall)).toBeFocused();
  await expect.poll(async () => Math.round((await boxOf(page, tall)).y - s.y)).toBe(48);
  expect(await scale(page)).toBe(k);
  expect((await boxOf(page, tall)).height).toBeGreaterThan(s.height);
  // Once some of it shows, the keyboard reaching it again pans nothing.
  await page.keyboard.press('j');
  await panBy(page, 0, -100);
  const before = await world(page);
  await page.keyboard.press('k');
  await expect(card(page, tall)).toBeFocused();
  expect(await world(page)).toBe(before);
});

test('focus coming back to the card it left (Esc closing its note) does not pan', async ({ page, request }) => {
  const d = await drawStill(page, request);
  const [, noted] = d.n as [number, number];
  await page.setViewportSize({ width: 1000, height: 600 });
  await open(page, d);
  for (let i = 0; i < 2; i += 1) await page.keyboard.press('+');
  await card(page, noted).focus();
  const s = await stageBox(page);
  const b = await boxOf(page, noted);
  await panBy(page, s.x + s.width - 60 - b.x - b.width / 2, 0);
  const before = await world(page);
  await page.keyboard.press('c');
  await expect(page.locator('vb-note-bubble').getByLabel('Note text')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(card(page, noted)).toBeFocused();
  expect(await world(page)).toBe(before);
});
