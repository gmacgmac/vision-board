// Selecting cards, moving them by the kind tab and panning on backgrounds (3_FE_01, rulings 1-9).
// On the worker's roadmap board, fresh for this file (servers.ts); the one card it moves it puts
// back (R), for the tests after it in this file. Cmd or Ctrl + drag
// (review-polish ruling 13) draws a board of its own (agent-board.ts).
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test, zoomToControls, bid } from './helpers.ts';
import type { Theme } from './helpers.ts';
import type { Drawn } from './agent-board.ts';
import { act, open, reply, write } from './agent-board.ts';
import { card, openBoard, ROADMAP_CARDS, selectedIds, zoomToFull } from './board-page.ts';

const THEMES: Theme[] = ['dark', 'light'];

const live = (page: Page) => page.locator(bid('selection-status'));
const docSelection = (page: Page) => page.evaluate(() => document.getSelection()?.toString() ?? '');
const worldAt = (page: Page) => page.locator('.vb-world').evaluate((e) => {
  const m = new DOMMatrix(getComputedStyle(e).transform);
  return { x: Math.round(m.e), y: Math.round(m.f) };
});

/** A point inside `el`, as fractions of its box. */
async function at(el: Locator, fx = 0.5, fy = 0.5): Promise<{ x: number; y: number }> {
  const b = (await el.boundingBox())!;
  return { x: b.x + b.width * fx, y: b.y + b.height * fy };
}

/** Click a card's title (its content, not a control), with modifiers held. */
async function clickCard(page: Page, n: number, modifiers: ('Shift' | 'Meta' | 'Control')[] = []): Promise<void> {
  await card(page, n).locator('.vb-node-title').click({ modifiers, position: { x: 4, y: 4 } });
}

/** Press, move in steps, release: a real drag, so the page sees every pointermove. */
async function drag(page: Page, from: { x: number; y: number }, dx: number, dy: number, button: 'left' | 'middle' = 'left'): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down({ button });
  await page.mouse.move(from.x + dx, from.y + dy, { steps: 8 });
  await page.mouse.up({ button });
}

/** A point on the board's own background, clear of every frame and card. */
async function backgroundPoint(page: Page): Promise<{ x: number; y: number }> {
  return page.evaluate(() => {
    const stage = document.querySelector('.vb-stage')!.getBoundingClientRect();
    for (let y = stage.top + 20; y < stage.bottom - 20; y += 10) {
      for (let x = stage.left + 20; x < stage.right - 20; x += 10) {
        if (document.elementFromPoint(x, y)?.classList.contains('vb-stage')) return { x, y };
      }
    }
    throw new Error('no background point on the stage');
  });
}

test('click selects a card alone; Shift, Cmd and Ctrl-click add and remove; the name and live region say so', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 1);
  expect(await selectedIds(page)).toEqual(['1']);
  await expect(card(page, 1)).toHaveAttribute('aria-label', /, selected$/);
  await expect(card(page, 2)).not.toHaveAttribute('aria-label', /selected/);
  await expect(live(page)).toHaveText('1 card selected');
  await expect(live(page)).toHaveAttribute('role', 'status');
  await clickCard(page, 2, ['Shift']);
  await clickCard(page, 3, ['Meta']);
  await clickCard(page, 4, ['Control']);
  expect(await selectedIds(page)).toEqual(['1', '2', '3', '4']);
  await expect(live(page)).toHaveText('4 cards selected');
  await clickCard(page, 2, ['Shift']);
  await clickCard(page, 3, ['Meta']);
  expect(await selectedIds(page)).toEqual(['1', '4']);
  await expect(live(page)).toHaveText('2 cards selected');
  // A plain click starts again from that card alone.
  await clickCard(page, 5);
  expect(await selectedIds(page)).toEqual(['5']);
  // A Shift-click selects no text (it would extend the text selection in a plain page).
  await clickCard(page, 6, ['Shift']);
  expect(await docSelection(page)).toBe('');
  // The card's controls act on their own and leave the selection alone (the size control is not drawn
  // zoomed out, N13; focusing the card brings it into view).
  await zoomToControls(page);
  await card(page, 7).focus();
  await card(page, 7).locator('.vb-size-trig').click();
  expect(await selectedIds(page)).toEqual(['5', '6']);
});

test('a click on the background or a container clears the selection; Esc closes the bubble first, then clears', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 1);
  await clickCard(page, 2, ['Shift']);
  const bg = await backgroundPoint(page);
  await page.mouse.click(bg.x, bg.y);
  expect(await selectedIds(page)).toEqual([]);
  await expect(live(page)).toHaveText('Selection cleared');
  // Inside a container, away from its cards and from the selection bar the first click opens
  // (3_FE_02 ruling 2: the bar shows for any non-empty selection, not just two or more).
  await clickCard(page, 1);
  const frame = page.locator('vb-region[data-region="review"]');
  const f = (await frame.boundingBox())!;
  await page.mouse.click(f.x + f.width - 6, f.y + 6);
  expect(await selectedIds(page)).toEqual([]);
  // Esc: the open bubble first, keeping the selection; then the selection.
  await clickCard(page, 3);
  await clickCard(page, 1, ['Shift']);
  await card(page, 3).focus();
  await page.keyboard.press('c');
  await expect(page.locator('vb-note-bubble')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('vb-note-bubble')).toBeHidden();
  expect(await selectedIds(page)).toEqual(['1', '3']);
  await page.keyboard.press('Escape');
  expect(await selectedIds(page)).toEqual([]);
  await expect(live(page)).toHaveText('Selection cleared');
});

test('Space toggles the focused card in the selection; the focus ring still shows (selection is not focus)', async ({ page }) => {
  await openBoard(page);
  await zoomToControls(page); // the card's size control is not drawn zoomed out (N13)
  await card(page, 2).focus();
  await page.keyboard.press('Space');
  expect(await selectedIds(page)).toEqual(['2']);
  await page.keyboard.press('j');
  await page.keyboard.press('Space');
  expect(await selectedIds(page)).toEqual(['2', '3']);
  await expect(card(page, 3)).toBeFocused();
  const ring = await card(page, 3).evaluate((e) => getComputedStyle(e).outlineStyle);
  expect(ring).toBe('solid');
  await page.keyboard.press('Space');
  expect(await selectedIds(page)).toEqual(['2']);
  // Space on a card's button presses the button, not the selection.
  await card(page, 2).locator('.vb-size-trig').focus();
  await page.keyboard.press('Space');
  expect(await selectedIds(page)).toEqual(['2']);
  await page.keyboard.press('Escape');
});

test('only the kind tab moves a card: dragging a selected card\'s tab moves and pins the selection, R puts each back', async ({ page }) => {
  await openBoard(page);
  await zoomToFull(page);
  await card(page, 1).focus();
  await clickCard(page, 1);
  await clickCard(page, 2, ['Shift']);
  const [b1, b2] = [(await card(page, 1).boundingBox())!, (await card(page, 2).boundingBox())!];
  await drag(page, await at(card(page, 1).locator('.vb-node-kind')), 90, 60);
  await expect(card(page, 1)).toHaveAttribute('data-pinned', '');
  await expect(page.locator('.vb-wires:not(.vb-wires-top)')).not.toHaveClass(/settling/);
  const a1 = (await card(page, 1).boundingBox())!;
  expect(Math.hypot(a1.x - b1.x, a1.y - b1.y)).toBeGreaterThan(40);
  // The other selected card moves with it, by the same amount (3_FE_03 ruling 4), and both stay
  // selected and keep their size.
  await expect(card(page, 2)).toHaveAttribute('data-pinned', '');
  expect(await selectedIds(page)).toEqual(['1', '2']);
  const a2 = (await card(page, 2).boundingBox())!;
  expect([Math.round(a2.x - b2.x), Math.round(a2.y - b2.y)]).toEqual([Math.round(a1.x - b1.x), Math.round(a1.y - b1.y)]);
  expect([Math.round(a2.width), Math.round(a2.height)]).toEqual([Math.round(b2.width), Math.round(b2.height)]);
  for (const n of [1, 2]) {
    await card(page, n).focus();
    await page.keyboard.press('r');
    await expect(card(page, n)).not.toHaveAttribute('data-pinned', '');
  }
});

test('a drag inside a card selects its text and neither moves the card nor pans', async ({ page }) => {
  await openBoard(page);
  await zoomToFull(page);
  await card(page, 1).focus();
  const title = card(page, 1).locator('.vb-node-title');
  const before = { card: (await card(page, 1).boundingBox())!, world: await worldAt(page) };
  const t = (await title.boundingBox())!;
  await drag(page, { x: t.x + 2, y: t.y + 8 }, t.width - 6, 0);
  const picked = await docSelection(page);
  expect(picked.length).toBeGreaterThan(3);
  expect((await title.textContent())!).toContain(picked.trim().split('\n')[0]!);
  expect(await worldAt(page)).toEqual(before.world);
  expect(await card(page, 1).boundingBox()).toEqual(before.card);
  await expect(card(page, 1)).not.toHaveAttribute('data-pinned', '');
  // The body is text too; the footer, the tabs and the size control are not.
  const styles = await card(page, 1).evaluate((e) => Object.fromEntries(
    ['.vb-node-title', '.vb-node-body', '.vb-node-foot', '.vb-node-kind', '.vb-node-num', '.vb-size']
      .map((s) => [s, e.querySelector(s) ? getComputedStyle(e.querySelector(s)!).userSelect : 'none'])));
  expect(styles).toEqual({ '.vb-node-title': 'text', '.vb-node-body': 'text', '.vb-node-foot': 'none',
    '.vb-node-kind': 'none', '.vb-node-num': 'none', '.vb-size': 'none' });
});

test('a drag on the board\'s background pans and selects nothing', async ({ page }) => {
  await openBoard(page);
  const before = await worldAt(page);
  await drag(page, await backgroundPoint(page), 120, 70);
  expect(await worldAt(page)).toEqual({ x: before.x + 120, y: before.y + 70 });
  expect(await docSelection(page)).toBe('');
});

test('U5: a drag across a container\'s title moves the container and leaves no text selected', async ({ page }) => {
  await openBoard(page);
  const h2 = page.locator('vb-region[data-region="review"] h2');
  const before = await worldAt(page);
  const start = await at(h2, 0.1, 0.5);
  // The title moves its container (open list and container title FE_02), not the board. Brought back
  // to where it started, so nothing is written and the board keeps its layout.
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 260, start.y + 30, { steps: 8 });
  await expect(page.locator('vb-region[data-region="review"]')).toHaveAttribute('data-dragging', '');
  await page.mouse.move(start.x, start.y, { steps: 8 });
  await page.mouse.up();
  expect(await docSelection(page)).toBe('');
  expect(await worldAt(page)).toEqual(before);
  // From inside the frame, across the title and a card, too.
  const frame = (await page.locator('vb-region[data-region="review"]').boundingBox())!;
  await drag(page, { x: frame.x + 8, y: frame.y + frame.height - 8 }, 300, -frame.height + 20);
  expect(await docSelection(page)).toBe('');
});

test('Shift+drag on a background is the lasso (3_FE_02): it never pans and selects no text', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 1);
  const before = await worldAt(page);
  await page.keyboard.down('Shift');
  await drag(page, await backgroundPoint(page), 150, 90);
  const h2 = page.locator('vb-region[data-region="review"] h2');
  await drag(page, await at(h2, 0.1, 0.5), 150, 40);
  await page.keyboard.up('Shift');
  expect(await worldAt(page)).toEqual(before);
  expect(await docSelection(page)).toBe('');
});

test('a middle-button drag pans anywhere, a card included', async ({ page }) => {
  await openBoard(page);
  const before = await worldAt(page);
  await drag(page, await at(card(page, 2).locator('.vb-node-title')), 80, 50, 'middle');
  expect(await worldAt(page)).toEqual({ x: before.x + 80, y: before.y + 50 });
  await expect(card(page, 2)).not.toHaveAttribute('data-pinned', '');
  expect(await docSelection(page)).toBe('');
});

// Cmd or Ctrl + drag pans from anywhere (review-polish ruling 13, PLAN decision 5): over text, a
// card's kind tab, a note, a reply, a button, an open hover tip, the open note bubble and a card's
// popover; nothing is text-selected and no click follows. Held still, the press keeps its meaning.

let pans = 0;
const LONG = 'Ask finance first, then support, then the two account managers who own the annual plans, '
  + 'and write down what each of them says about the quarterly accounts before the call on Thursday.';
const HANDOVER = { situation: 'Waiting on finance.', background: 'Asked twice.', assessment: 'Low risk.', recommendation: 'Wait.', sources: ['Pricing sheet'] };

/** A board of its own: card 1 with a link, a long sent note and a reply; card 2 saved for later
 *  with its handover, so its HANDOVER tab opens a popover. */
async function drawPan(page: Page, request: APIRequestContext): Promise<Drawn> {
  const r = await request.post('/api/agents', { data: { label: 'Pricing chat' } });
  expect(r.status(), await r.text()).toBe(201);
  const d = { agent: await r.json() as { secret: string }, board: `pan-${Date.now()}-${(pans += 1)}` };
  const results = await write(request, d, [
    { type: 'board', title: 'Pan' },
    { type: 'region', region: { id: 'p', title: 'Pricing thread', mode: 'grid', columns: 2 } },
    { type: 'node', node: { region: 'p', kind: 'question', title: 'Grandfather annual plans?', body: 'See [the sheet](https://example.com/sheet).' } },
    { type: 'node', node: { region: 'p', kind: 'question', title: 'Who owns the migration?' } },
  ]);
  const drawn = { ...d, n: results.slice(2).map((x) => x.n!) };
  const [one, two] = drawn.n as [number, number];
  await page.goto('/?setup');
  const note = await act(page, drawn, { action: 'comment', n: one, ver: 1, text: LONG });
  await act(page, drawn, { action: 'send', board: drawn.board });
  await reply(request, drawn, one, 'Finance says yes.', note);
  await act(page, drawn, { action: 'later', n: two, ver: 1 });
  await write(request, drawn, [{ type: 'park', n: two, bundle: HANDOVER }]);
  await open(page, drawn);
  return drawn;
}

/** A drag with Cmd (or Ctrl) held from `from`: it pans by exactly the drag, selects no text. */
async function modDrag(page: Page, from: { x: number; y: number }, key: 'Meta' | 'Control' = 'Meta'): Promise<void> {
  const before = await worldAt(page);
  await page.keyboard.down(key);
  await drag(page, from, 70, 40);
  await page.keyboard.up(key);
  expect(await worldAt(page)).toEqual({ x: before.x + 70, y: before.y + 40 });
  expect(await docSelection(page)).toBe('');
}

test('Cmd or Ctrl + drag pans from anywhere: text, the kind tab, a note, a reply, a button; no text, no click', async ({ page, request }) => {
  const d = await drawPan(page, request);
  const [one] = d.n as [number];
  const c = card(page, one);
  const bubble = page.locator('vb-note-bubble');
  await modDrag(page, await at(c.locator('.vb-node-title'), 0.3));
  await modDrag(page, await at(c.locator('.vb-node-title'), 0.6), 'Control');
  await modDrag(page, await at(c.locator('.vb-node-body'), 0.2));
  await modDrag(page, await at(c.locator('.vb-node-kind')));
  await modDrag(page, await at(c.locator('.vb-node-note'), 0.3));
  await modDrag(page, await at(c.locator('.vb-node-reply'), 0.3));
  await modDrag(page, await at(c.locator('button[data-act="ack"]')));
  // No click followed any of them: nothing selected, no bubble, ✓ not pressed, the card not moved.
  expect(await selectedIds(page)).toEqual([]);
  await expect(bubble).toBeHidden();
  await expect(c).toHaveAttribute('data-status', 'open');
  await expect(c).not.toHaveAttribute('data-pinned', '');
});

test('Cmd + drag pans from an open hover tip, the open note bubble and a card\'s popover, which stay open', async ({ page, request }) => {
  const d = await drawPan(page, request);
  const [one, two] = d.n as [number, number];
  const c = card(page, one);
  // The long note's hover tip: hovered open, then the drag starts on the tip itself.
  await c.locator('.vb-node-note').hover();
  const tip = c.locator('.vb-node-note .vb-note-tip');
  await expect(tip).toBeVisible();
  await page.mouse.move(...Object.values(await at(tip, 0.5, 0.3)) as [number, number]);
  await modDrag(page, await at(tip, 0.5, 0.3));
  // The note bubble, opened by a click on the note.
  await c.locator('.vb-node-note').click();
  const bubble = page.locator('vb-note-bubble');
  await expect(bubble).toBeVisible();
  await modDrag(page, await at(bubble, 0.3, 0.1));
  await expect(bubble).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(bubble).toBeHidden();
  // The handover popover beside card 2 (off the note first: its tip would cover the tab).
  await page.mouse.move(1, 1);
  await card(page, two).focus();
  await expect(tip).toBeHidden();
  await card(page, two).locator('.vb-node-btab[data-tab="handover"]').click();
  const pop = card(page, two).locator('.vb-card-pop[data-pop="handover"]');
  await expect(pop).toBeVisible();
  await modDrag(page, await at(pop, 0.5, 0.3));
  await expect(pop).toBeVisible();
  await page.keyboard.press('Escape');
});

test('Cmd held still keeps its meaning: a click adds the card, opens a link in a new tab, presses a button; a field keeps its press', async ({ page, request }) => {
  const d = await drawPan(page, request);
  const [one, two] = d.n as [number, number];
  await clickCard(page, two);
  await clickCard(page, one, ['Meta']);
  expect(await selectedIds(page)).toEqual([String(one), String(two)].sort((a, b) => Number(a) - Number(b)));
  // The link's own click reaches it, its default (a new tab) untouched by the board; the test
  // browser opens no tab of its own for it, so the click is read where it ends, on the window.
  const link = card(page, one).locator('.vb-node-body a');
  await page.evaluate(() => window.addEventListener('click', (e) => {
    (window as unknown as { linkClick: unknown }).linkClick = { a: (e.target as Element).localName, meta: e.metaKey, kept: !e.defaultPrevented };
    e.preventDefault();
  }, { once: true }));
  await link.click({ modifiers: ['Meta'] });
  expect(await page.evaluate(() => (window as unknown as { linkClick: unknown }).linkClick)).toEqual({ a: 'a', meta: true, kept: true });
  await card(page, one).locator('button[data-act="ack"]').click({ modifiers: ['Meta'] });
  await expect(card(page, one)).toHaveAttribute('data-status', 'acknowledged');
  // A note being written: Cmd + drag in its text field is the field's, not a pan.
  await card(page, two).focus();
  await page.keyboard.press('c');
  const field = page.locator('vb-note-bubble').getByLabel('Note text');
  await expect(field).toBeFocused();
  const before = await worldAt(page);
  await page.keyboard.down('Meta');
  await drag(page, await at(field, 0.2), 60, 0);
  await page.keyboard.up('Meta');
  expect(await worldAt(page)).toEqual(before);
  await page.keyboard.press('Escape');
});

// Review polish round 2 ruling 6: holding Cmd (Ctrl elsewhere) with the pointer over the board shows a
// hand, since a drag then pans from anywhere; during the pan, a closed hand. A text field keeps its
// cursor, and letting go gives every part its own cursor back. A still Cmd click keeps its meaning
// (the test above).
test('Cmd or Ctrl held over the board shows a hand, a closed hand while it pans; a text field keeps its cursor', async ({ page, request }) => {
  const d = await drawPan(page, request);
  const [one, two] = d.n as [number, number];
  const c = card(page, one);
  const cursorAt = (p: { x: number; y: number }) => page.evaluate(({ x, y }) => getComputedStyle(document.elementFromPoint(x, y)!).cursor, p);
  const points = [await at(c.locator('.vb-node-title'), 0.3), await at(c.locator('button[data-act="ack"]')), await at(c.locator('.vb-node-note'), 0.3), await backgroundPoint(page)];
  const own = await Promise.all(points.map(cursorAt));
  expect(own.slice(0, 3).every((x) => x !== 'grab'), own.join()).toBe(true);
  await page.mouse.move(points[0]!.x, points[0]!.y);
  for (const key of ['Meta', 'Control'] as const) {
    await page.keyboard.down(key);
    expect(await Promise.all(points.map(cursorAt)), key).toEqual(points.map(() => 'grab'));
    await page.keyboard.up(key);
    expect(await Promise.all(points.map(cursorAt)), `${key} let go`).toEqual(own);
  }
  // A Cmd + drag pan: a closed hand wherever the pointer is, then the hand again while Cmd stays held.
  await page.keyboard.down('Meta');
  await page.mouse.down();
  const to = { x: points[0]!.x + 60, y: points[0]!.y + 30 };
  await page.mouse.move(to.x, to.y, { steps: 6 });
  expect(await cursorAt(to)).toBe('grabbing');
  await page.mouse.up();
  expect(await cursorAt(to)).toBe('grab');
  await page.keyboard.up('Meta');
  // The note being written: its text field keeps its own cursor with Cmd held.
  await card(page, two).focus();
  await page.keyboard.press('c');
  const field = page.locator('vb-note-bubble').getByLabel('Note text');
  await expect(field).toBeFocused();
  const inField = await at(field, 0.3);
  const fieldOwn = await cursorAt(inField);
  await page.keyboard.down('Meta');
  expect(await cursorAt(inField)).toBe(fieldOwn);
  await page.keyboard.up('Meta');
  await page.keyboard.press('Escape');
});

test('the selection survives a redraw', async ({ page }) => {
  await openBoard(page);
  await clickCard(page, 1);
  await clickCard(page, 4, ['Shift']);
  // H hides decided cards and draws again; again shows them.
  await page.keyboard.press('h');
  await page.keyboard.press('h');
  await expect(page.locator('vb-node:visible')).toHaveCount(ROADMAP_CARDS);
  expect(await selectedIds(page)).toEqual(['1', '4']);
});

for (const theme of THEMES) {
  test(`axe passes with cards selected, at full size (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await openBoard(page);
    await zoomToFull(page);
    await card(page, 1).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('j');
    await page.keyboard.press('Space');
    expect(await selectedIds(page)).toEqual(['1', '2']);
    await expectNoAxeViolations(page);
  });
}
