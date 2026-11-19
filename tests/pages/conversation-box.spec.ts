// The conversation box (D-099 3, FE_03): a node's notes open one box, to read and to write. The notes
// mark, C and right-click's Comment open it with the field focused. Add note (Enter) writes the note for the board's
// Send and keeps the box open; only Ask now (Cmd or Ctrl Enter) sends to the agent, as one `ask` naming the note's
// `seq` with `context: "board"`, and the board's other answers stay for Send. Words typed survive a redraw, a failed
// write and an accidental Esc. Opening the box reads the agent's replies. On a board of its own, light and dark.
import type { Page } from '@playwright/test';
import { bid, expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { act, card, open, write } from './agent-board.ts';
import { drawEdges, mark, menuOf } from './edge-board.ts';
import { head, idle, linesAfter } from './board-page.ts';
import { lc, pixel } from './apca.ts';

const FLAGS = '?vbwork';
const box = (page: Page) => page.locator('vb-note-bubble[data-mode="conversation"]');
const field = (page: Page) => box(page).getByRole('textbox');
const lines = async (page: Page, after: number, action: string) => (await linesAfter(page, after)).filter((e) => e.action === action);
const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';

test('the notes mark, C and right-click\'s Comment open one box, its field focused; empty, only the field; Esc closes it', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q] = d.n as [number];
  await mark(page, q, 'notes').click();
  await expect(box(page)).toBeVisible();
  await expect(box(page)).toHaveAttribute('aria-label', `Conversation on ${q}`);
  await expect(field(page)).toBeFocused();
  await expect(box(page).locator('.vb-nb-thread')).toHaveCount(0);
  await expect(box(page).getByRole('button', { name: 'Ask now' })).toHaveAttribute('title', /Cmd or Ctrl Enter/);
  await expect(box(page).getByRole('button', { name: 'Add note' })).toHaveAttribute('title', /Enter/);
  await page.keyboard.press('Escape');
  await expect(box(page)).toBeHidden();
  await card(page, q).focus();
  await page.keyboard.press('c');
  await expect(field(page)).toBeFocused();
  await page.keyboard.press('Escape');
  const b = (await card(page, q).boundingBox())!;
  await page.mouse.click(b.x + 60, b.y + b.height - 20, { button: 'right' });
  await menuOf(page, `Actions on item ${q}`).getByRole('menuitem', { name: /Comment/ }).click();
  await expect(field(page)).toBeFocused();
});

test('Add note (Enter) writes the note for Send and keeps the box open; Enter never asks; Shift Enter is a new line', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q] = d.n as [number];
  const before = await head(page);
  await mark(page, q, 'notes').click();
  await field(page).fill('Book it for Thursday');
  await page.keyboard.press('Shift+Enter');
  await expect(field(page)).toHaveValue('Book it for Thursday\n');
  await page.keyboard.press('Enter');
  await expect(box(page).locator('.vb-nb-queued')).toContainText('Book it for Thursday');
  await expect(box(page).locator('.vb-nb-queued')).toContainText('User · Not sent');
  await expect(field(page)).toHaveValue('');
  await expect(field(page)).toBeFocused();
  expect(await lines(page, before, 'comment')).toHaveLength(1);
  expect(await lines(page, before, 'ask')).toEqual([]);
  // A second note joins the one not yet sent (one per node, api.md 59).
  await field(page).fill('and the crew');
  await page.keyboard.press('Enter');
  await expect(box(page).locator('.vb-nb-queued')).toContainText('and the crew');
  await idle(page);
  expect(await lines(page, before, 'note-edit')).toHaveLength(1);
  expect(await lines(page, before, 'ask')).toEqual([]);
  await expect(page.locator(bid('send'))).not.toHaveAttribute('aria-disabled', 'true');
});

test('Ask now (Cmd Enter) sends this node\'s note at once: one ask with its seq and context board; the other answers wait for Send', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q, , , w] = d.n as [number, number, number, number];
  const before = await head(page);
  // Another answer on the board, waiting for Send, and a note already queued on this node.
  await act(page, d, { action: 'ack', n: w, ver: 1 });
  const queued = await act(page, d, { action: 'comment', n: q, ver: 1, text: 'Is a second truck free?' });
  await mark(page, q, 'notes').click();
  await expect(box(page).locator('.vb-nb-queued')).toContainText('Is a second truck free?');
  await field(page).fill('Before noon, please');
  await page.keyboard.press(`${MOD}+Enter`);
  await expect(box(page).locator('.vb-nb-wait')).toHaveText('Waiting for the agent');
  await expect(box(page).locator('.vb-nb-queued')).toHaveCount(0);
  await expect(box(page).locator('.vb-nb-edit')).toHaveCount(0); // locked, as a sent note
  await expect(field(page)).toHaveValue('');
  const asks = await lines(page, before, 'ask');
  expect(asks).toHaveLength(1);
  expect(asks[0]).toMatchObject({ board: d.board, lines: [queued], context: 'board' });
  // The words joined the queued note first, as an edit, before the ask.
  const [edit] = await lines(page, before, 'note-edit');
  expect(edit).toMatchObject({ note: queued, text: 'Is a second truck free?\n\nBefore noon, please' });
  expect((edit!.seq as number) < (asks[0]!.seq as number)).toBe(true);
  expect(await lines(page, before, 'send')).toEqual([]);
  // The tick still waits for Send; the asked note does not: once the tick is cleared there is nothing to send.
  await expect(page.locator(bid('send'))).not.toHaveAttribute('aria-disabled', 'true');
  await act(page, d, { action: 'reopen', n: w, ver: 1 });
  await expect(page.locator(bid('send'))).toHaveAttribute('aria-disabled', 'true');
});

// FIX_03 ruling 3 (point 446): Add note and Ask now are two modes. The active one is pink (the primary style) and
// pressed; Enter does it; pressing a button does it and makes it the mode, kept for the board through a reload (as its
// zoom is), Add note on a board not yet set; the field says which. Light and dark: the pink is the accent fill.
for (const theme of ['light', 'dark'] as Theme[]) {
  test(`Add note and Ask now are two modes: the active one pink and pressed, Enter does it, kept for the board (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    const d = await drawEdges(request);
    await open(page, d, FLAGS);
    const [q, f] = d.n as [number, number];
    const before = await head(page);
    const [ask, add] = [box(page).getByRole('button', { name: 'Ask now' }), box(page).getByRole('button', { name: 'Add note' })];
    await mark(page, q, 'notes').click();
    await expect(add).toHaveAttribute('aria-pressed', 'true');
    await expect(ask).toHaveAttribute('aria-pressed', 'false');
    await expect(field(page)).toHaveAttribute('placeholder', `Add a note about ${q}`);
    const pink = await add.evaluate((e) => getComputedStyle(e).backgroundColor);
    const plain = await ask.evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(pink).not.toBe(plain);
    // A press of Ask now asks and makes it the mode, at once.
    await field(page).fill('Before noon?');
    await ask.click();
    await expect(ask).toHaveAttribute('aria-pressed', 'true');
    await expect(add).toHaveAttribute('aria-pressed', 'false');
    await expect(ask).toHaveCSS('background-color', pink);
    await expect.poll(async () => (await lines(page, before, 'ask')).length).toBe(1);
    await expect(field(page)).toHaveAttribute('placeholder', `Ask the agent about ${q} now`);
    await expect(field(page)).toHaveAccessibleName(`Ask the agent about ${q} now`);
    await expect(ask).toHaveAttribute('title', /^Ask now \(Enter/);
    // Enter now asks.
    await field(page).fill('And the crew?');
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await lines(page, before, 'ask')).length).toBe(2);
    // Kept for the board: through a reload, and in another node's box.
    await page.reload();
    await mark(page, f, 'notes').click();
    await expect(ask).toHaveAttribute('aria-pressed', 'true');
    // A press of Add note writes the note and turns the mode back; Enter adds notes again, asking nothing.
    await field(page).fill('Rain all day');
    await add.click();
    await expect(add).toHaveAttribute('aria-pressed', 'true');
    await expect(box(page).locator('.vb-nb-queued')).toContainText('Rain all day');
    await field(page).fill('and wind');
    await page.keyboard.press('Enter');
    await expect(box(page).locator('.vb-nb-queued')).toContainText('and wind');
    expect(await lines(page, before, 'ask')).toHaveLength(2);
    await expectNoAxeViolations(page);
    await page.screenshot({ path: `temp/fix03/modes-${theme}.png` });
  });
}

test('another board keeps its own mode: Add note until Ask now is pressed there', async ({ page, request }) => {
  const [a, b] = [await drawEdges(request), await drawEdges(request)];
  await open(page, a, FLAGS);
  await mark(page, a.n[0]!, 'notes').click();
  await field(page).fill('Now?');
  await box(page).getByRole('button', { name: 'Ask now' }).click();
  await expect(box(page).getByRole('button', { name: 'Ask now' })).toHaveAttribute('aria-pressed', 'true');
  await open(page, b, FLAGS);
  await page.reload(); // the same number of nodes: a fresh page is sure to show board b
  await expect(page.locator('vb-node')).toHaveCount(4);
  await mark(page, b.n[0]!, 'notes').click();
  await expect(box(page).getByRole('button', { name: 'Add note' })).toHaveAttribute('aria-pressed', 'true');
});

test.describe('a failed write', () => {
  test.use({ expected: { problems: [/response 503: POST .*\/act/, /console error: Failed to load resource.*503/] } });
  test('words typed survive a redraw, a failed write and an accidental Esc', async ({ page, request }) => {
    const d = await drawEdges(request);
    await open(page, d, FLAGS);
    const [q] = d.n as [number];
    await mark(page, q, 'notes').click();
    await field(page).fill('Half a thought');
    // A redraw: the agent changes the node and replies while the person types.
    await write(request, d, [{ type: 'node', n: q, node: { region: 'p', kind: 'question', title: 'Book the second truck today?' } }]);
    await write(request, d, [{ type: 'reply', n: q, text: 'Yes, one is free.' }]);
    await expect(box(page).locator('.vb-nb-reply')).toContainText('Yes, one is free.');
    await expect(field(page)).toHaveValue('Half a thought');
    await expect(field(page)).toBeFocused();
    // A failed write: the box says why and the words stay.
    await page.route('**/api/boards/*/act', (r) => r.fulfill({ status: 503, contentType: 'application/problem+json', body: JSON.stringify({ title: 'Down', detail: 'The board is away' }) }));
    await page.keyboard.press('Enter');
    await expect(box(page).locator('.vb-nb-error')).toBeVisible();
    await expect(field(page)).toHaveValue('Half a thought');
    await page.keyboard.press(`${MOD}+Enter`);
    await expect(box(page).locator('.vb-nb-error')).toBeVisible();
    await expect(field(page)).toHaveValue('Half a thought');
    await page.unroute('**/api/boards/*/act');
    // An accidental Esc asks first; Cancel keeps the words.
    await field(page).focus();
    await page.keyboard.press('Escape');
    const ask = page.getByRole('dialog', { name: 'Discard your changes?' });
    await expect(ask).toBeVisible();
    await ask.getByRole('button', { name: 'Cancel' }).click();
    await expect(box(page)).toBeVisible();
    await expect(field(page)).toHaveValue('Half a thought');
  });
});

test('a reply fills the notes mark; opening the box reads it, and the mark goes back to its count', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q] = d.n as [number];
  const note = await act(page, d, { action: 'comment', n: q, ver: 1, text: 'Who drives?' });
  await write(request, d, [{ type: 'reply', n: q, text: 'Sam drives.', to: note }]);
  await expect(mark(page, q, 'notes')).toHaveAttribute('data-notes-mark', 'unread');
  await mark(page, q, 'notes').click();
  await expect(box(page).locator('.vb-nb-reply')).toContainText('Sam drives.');
  await expect(mark(page, q, 'notes')).toHaveAttribute('data-notes-mark', 'count');
});

test('a node in a note on several nodes: tabs, this node first; a tab lists its own conversation and Ask now sends its note', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q, f] = d.n as [number, number];
  const mine = await act(page, d, { action: 'comment', n: q, ver: 1, text: 'Only about this one' });
  const shared = await act(page, d, { action: 'comment', nodes: [q, f], text: 'Do these two clash?' });
  await mark(page, q, 'notes').click();
  const tabs = box(page).getByRole('tab');
  await expect(tabs).toHaveText(['This node', `With ${f}`]);
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await expect(box(page).locator('.vb-nb-convo')).toContainText('Only about this one');
  await expect(box(page).locator('.vb-nb-convo')).not.toContainText('Do these two clash?');
  await field(page).fill('kept across tabs');
  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(box(page).locator('.vb-nb-convo')).toContainText('Do these two clash?');
  await expect(field(page)).toHaveValue('kept across tabs');
  const before = await head(page);
  await field(page).fill('');
  await box(page).getByRole('button', { name: 'Ask now' }).click();
  await expect(box(page).locator('.vb-nb-wait')).toBeVisible();
  const asks = await lines(page, before, 'ask');
  expect(asks).toHaveLength(1);
  expect(asks[0]).toMatchObject({ lines: [shared] });
  expect(mine).toBeLessThan(shared);
});

for (const theme of ['dark', 'light'] as Theme[]) {
  test(`the box in ${theme}: a note waiting for Send, the thread and the field, keyboard alone, and axe finds nothing`, async ({ page, request }) => {
    await setTheme(page, theme);
    const d = await drawEdges(request);
    await open(page, d, FLAGS);
    const [q] = d.n as [number];
    const sent = await act(page, d, { action: 'comment', n: q, ver: 1, text: 'Is 96 GB enough for every base model?' });
    await act(page, d, { action: 'ask', board: d.board, lines: [sent], context: 'board' });
    await write(request, d, [{ type: 'reply', n: q, text: 'Yes: the largest needs about 70 GB.', to: sent }]);
    await act(page, d, { action: 'comment', n: q, ver: 1, text: 'Book the Mac Studio then.' });
    // By keyboard alone: focus the node, C, type, Tab to Ask now and Add note.
    await card(page, q).focus();
    await page.keyboard.press('c');
    await expect(field(page)).toBeFocused();
    await page.keyboard.type('And a spare drive');
    await page.keyboard.press('Tab');
    await expect(box(page).getByRole('button', { name: 'Ask now' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(box(page).getByRole('button', { name: 'Add note' })).toBeFocused();
    await idle(page);
    // The agent's id is new each run: masked (point 619 puts it on the label line).
    await expect(box(page)).toHaveScreenshot(`box-${theme}.png`, { maxDiffPixelRatio: 0.01, mask: [box(page).locator('.vb-nb-who-id')] });
    await page.screenshot({ path: `temp/fe03/page-box-${theme}.png` });
    await expectNoAxeViolations(page);
    // APCA (rule 3): reading text Lc 60, the short labels Lc 45, on the box's own surface.
    const back = await pixel(page, await box(page).evaluate((b) => getComputedStyle(b).backgroundColor));
    const check = async (tier: Record<string, number>) => {
      for (const [sel, min] of Object.entries(tier)) {
        const ink = await pixel(page, await box(page).locator(sel).first().evaluate((e) => getComputedStyle(e).color));
        expect(lc(ink, back), `${sel} in ${theme}`).toBeGreaterThanOrEqual(min);
      }
    };
    await check({ '.vb-nb-note-text': 60, '.vb-nb-reply-text': 60, '.vb-node-box-title': 60, '.vb-nb-who em': 45, '.vb-nb-ask': 45 });
    await box(page).getByRole('button', { name: 'Ask now' }).click(); // the note goes: "Waiting for the agent" shows
    await expect(box(page).locator('.vb-nb-wait')).toBeVisible();
    await check({ '.vb-nb-wait': 45 });
  });
}
