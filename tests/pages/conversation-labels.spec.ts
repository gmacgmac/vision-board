// The conversation box's one scrollbar, one label line and one divider (export-import-print FIX_01, points 617-619): the
// thread scrolls the box's full width with the board's skinny bar at its edge, even under a host's rule that hides every
// bar; a note reads "User" (its number on hover), a reply "Agent · <name> <id>" on one line, the name alone cut and whole
// on hover; an imported conversation comes in whole, each line by its author, with one "Imported" divider after it. The
// headless shell hides every scrollbar by default (`--hide-scrollbars`), so this file runs with it shown, as a person's
// browser draws it.
import type { Page } from '@playwright/test';
import { expect, test } from './helpers.ts';
import { act, joinAgent, open, write } from './agent-board.ts';
import { drawEdges, mark } from './edge-board.ts';

test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

const FLAGS = '?vbwork';
const box = (page: Page) => page.locator('vb-note-bubble[data-mode="conversation"]');

/** A note on card `q` with `count` long replies to it: a thread that scrolls. */
async function longThread(page: Page, request: Parameters<typeof drawEdges>[0], d: Awaited<ReturnType<typeof drawEdges>>, q: number, count = 6) {
  const note = await act(page, d, { action: 'comment', n: q, ver: 1, text: 'Which backup link, and when?' });
  await write(request, d, Array.from({ length: count }, (_, i) => ({ type: 'reply', n: q, to: note, text: `Reply ${i + 1}: the backup link holds for the whole of the second day, if the rain keeps on.` })));
  return note;
}

test('the thread scrolls the box\'s full width: one skinny scrollbar at its right edge, a gap before it, more room on the left (point 618)', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q] = d.n as [number];
  await longThread(page, request, d, q);
  await mark(page, q, 'notes').click();
  const thread = box(page).locator('.vb-nb-thread');
  await expect(thread).toBeVisible();
  const m = await thread.evaluate((t) => {
    const b = t.closest('vb-note-bubble')!.getBoundingClientRect();
    const r = t.getBoundingClientRect();
    const note = t.querySelector('.vb-nb-note')!.getBoundingClientRect();
    // The box is scaled with the board's zoom (--vb-box-scale): the gaps are read in its own, unscaled pixels.
    const k = r.width / (t as HTMLElement).offsetWidth;
    return { boxLeft: b.left / k, boxRight: b.right / k, left: r.left / k, right: r.right / k, bar: (t as HTMLElement).offsetWidth - t.clientWidth,
      inner: r.left / k + t.clientWidth, noteLeft: note.left / k, noteRight: note.right / k, scrolls: t.scrollHeight > t.clientHeight };
  });
  expect(m.scrolls).toBe(true);
  expect(m.right, 'the scrollbar at the box\'s own right edge, inside its border').toBeCloseTo(m.boxRight - 1, 0);
  expect(m.left).toBeCloseTo(m.boxLeft + 1, 0);
  expect(m.bar, 'a skinny bar, no wide rail').toBe(7);
  expect(m.inner - m.noteRight, 'a gap between the bubbles and the scrollbar').toBeGreaterThanOrEqual(8);
  expect(m.noteLeft - m.boxLeft, 'a little more room on the left').toBeGreaterThanOrEqual(16);
});

test('a host that hides every scrollbar (as nclite does) leaves the board\'s own: the same skinny bar (point 618)', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  // The host's sheet, as nclite's overlay-scroll.css hides the native bar on everything (a constructed sheet: the page's
  // policy refuses an inline one).
  await page.evaluate(() => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('* { scrollbar-width: none; } *::-webkit-scrollbar { display: none; }');
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  });
  const [q] = d.n as [number];
  await longThread(page, request, d, q);
  await mark(page, q, 'notes').click();
  const thread = box(page).locator('.vb-nb-thread');
  await expect(thread).toBeVisible();
  expect(await thread.evaluate((t) => (t as HTMLElement).offsetWidth - t.clientWidth)).toBe(7);
  expect(await page.locator('body').evaluate((b) => (b as HTMLElement).offsetWidth - b.clientWidth), 'the host\'s own page keeps its rule').toBe(0);
});

test('one label line (point 619): "User", its number in the hover; "Agent · <name> <id>", the name alone cut and whole on hover', async ({ page, request }) => {
  // A board drawn by an agent with a long name, so its replies need no grant.
  const long = await joinAgent(request, 'The field operations planning agent for the northern uplink sites');
  const d = { agent: long, board: `labels-${Date.now()}` };
  const [, , drawn] = await write(request, d, [
    { type: 'board', title: 'Labels' }, { type: 'region', region: { id: 'p', title: 'Plan', mode: 'grid' } },
    { type: 'node', node: { region: 'p', kind: 'question', title: 'Who drives?' } },
  ]);
  const q = drawn!.n!;
  await open(page, { board: d.board, n: [q] }, FLAGS);
  const note = await act(page, d, { action: 'comment', n: q, ver: 1, text: 'Who drives the second truck?' });
  await write(request, d, [{ type: 'reply', n: q, text: 'Sam drives.', to: note }]);
  await mark(page, q, 'notes').click();
  const who = box(page).locator('.vb-nb-note .vb-nb-who');
  await expect(who).toHaveText('User');
  await expect(who).toHaveAttribute('title', 'Note 1');
  await expect(box(page)).not.toContainText(/Sent|Asked now|Answered|Not sent/);
  const agent = box(page).locator('.vb-nb-agent');
  await expect(agent.locator('.vb-nb-who-id')).toHaveText(` ${long.agent}`);
  const lineH = await agent.evaluate((e) => parseFloat(getComputedStyle(e).lineHeight));
  expect((await agent.boundingBox())!.height, 'one line, no wrap').toBeLessThan(lineH * 1.5);
  expect(await agent.locator('.vb-nb-who-name').evaluate((e) => e.scrollWidth > e.clientWidth), 'the long name is cut').toBe(true);
  expect(await agent.locator('.vb-nb-who-id').evaluate((e) => e.scrollWidth <= e.clientWidth), 'the id never').toBe(true);
  await agent.locator('.vb-nb-who-name').hover();
  await expect(agent.locator('.vb-nb-who-name')).toHaveAttribute('title', 'The field operations planning agent for the northern uplink sites');
  // A name that fits has no hover of its own.
  const e = await drawEdges(request);
  await page.goto('about:blank');
  await open(page, e, FLAGS);
  const [r] = e.n as [number];
  await write(request, e, [{ type: 'reply', n: r, text: 'Confirmed.', to: await act(page, e, { action: 'comment', n: r, ver: 1, text: 'Sure?' }) }]);
  await mark(page, r, 'notes').click();
  await expect(box(page).locator('.vb-nb-agent')).toHaveText(`Agent · Edges chat ${(e.agent as { agent?: string }).agent}`);
  await box(page).locator('.vb-nb-who-name').hover();
  await expect(box(page).locator('.vb-nb-who-name')).not.toHaveAttribute('title', /./);
});

test('an imported conversation (point 617): every note and reply in, each keeping its author, one "Imported" divider after the last', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q] = d.n as [number];
  const note = await act(page, d, { action: 'comment', n: q, ver: 1, text: 'Old question' });
  await write(request, d, [{ type: 'reply', n: q, text: 'Old answer', to: note }]);
  const file = await (await page.request.get(`/api/boards/${d.board}/export?notes=true`)).json() as Record<string, unknown>;
  const copy = { board: `${d.board}-copy` };
  const r = await page.request.post(`/api/boards/${copy.board}/write`, { data: { import: { into: 'new', file } } });
  expect(r.status(), await r.text()).toBe(200);
  await page.goto('about:blank'); // a new hash alone would keep the page on the board it shows
  await open(page, copy, FLAGS, 4);
  const n = Number(await page.locator('vb-node', { hasText: 'Book the second truck?' }).getAttribute('data-id'));
  await act(page, copy, { action: 'comment', n, ver: 1, text: 'New here' });
  await mark(page, n, 'notes').click();
  const items = box(page).locator('.vb-nb-convo > li');
  await expect(items).toHaveCount(4);
  await expect(items.nth(0)).toContainText('Old question');
  await expect(items.nth(1).locator('.vb-nb-agent')).toHaveText(`Agent · Edges chat ${(d.agent as { agent?: string }).agent}`);
  await expect(items.nth(2)).toHaveText('Imported');
  await expect(items.nth(3)).toContainText('New here');
  await expect(items.nth(3).locator('.vb-nb-who')).toHaveText('User · Not sent');
  await expect(box(page).locator('.vb-nb-edit')).toHaveCount(1);
});
