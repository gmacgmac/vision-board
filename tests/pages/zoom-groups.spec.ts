// The three zoom groups (nodeEdges flag, D-101; FE_05; components.md "Zoom groups"), at 20%, 40%, 100% and 250%:
// the edge marks never draw under --vb-mark-min and grow in place (the disc and the notes mark on one vertical line, the
// number on its corner); a menu keeps one size; the conversation box scales with the board to a readable floor; the
// history and proposal boxes keep one size and stay open and attached while the board zooms. Light and dark screenshots
// at 40%, 100% and 200% go to temp/fe05/. With the flag off nothing here applies (zoom-counter-scale.spec.ts).
import type { Locator, Page } from '@playwright/test';
import { expect, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { act, card, open, write } from './agent-board.ts';
import { drawEdges, mark, menuOf } from './edge-board.ts';
import { zoomTo } from './rail-board.ts';
import { BOX_MIN_K, CROWD_GROW, MARK_MIN, boxScale, markGrow, marksPressable } from '../../apps/board/src/board/canvas/viewport.ts';

const FLAGS = '?vbwork&flags=nodeEdges';
const ZOOMS = [0.2, 0.4, 1, 2.5];
const box = async (l: ReturnType<Page['locator']>) => (await l.boundingBox())!;
/** Press a mark as a person can at zoom `k`: a click, or Enter where marks are too small to press (FIX_01, small-marks.spec.ts). */
const press = async (l: Locator, k: number) => { if (marksPressable(k)) await l.click(); else { await l.focus(); await l.press('Enter'); } };
/** On the right a box is top aligned with its node where it fits on the stage, else kept on it (FIX_01, finding 7). */
const beside = async (page: Page, b: { y: number; height: number }, n: { y: number }) => {
  const s = (await page.locator('.vb-stage').boundingBox())!;
  if (n.y + b.height <= s.y + s.height - 8) near(b.y, n.y, 1.5);
  else expect(b.y + b.height).toBeLessThanOrEqual(s.y + s.height);
};
const near = (a: number, b: number, tol = 1.5) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThanOrEqual(tol);
const board = async (page: Page, request: Parameters<typeof drawEdges>[0]) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const d = await drawEdges(request);
  // A newer version of the decision gives its change badge; a proposal on the finding gives its disc a box.
  await write(request, d, [{ type: 'node', n: d.n[2]!, node: { region: 'p', kind: 'decision', title: 'Switch to the backup now?' } }]);
  await open(page, d, FLAGS);
  return d;
};

test('the edge marks never draw under the minimum and grow in place: one vertical line, the number on its corner', async ({ page, request }) => {
  const d = await board(page, request);
  const [q, , dec] = d.n as [number, number, number];
  for (const k of ZOOMS) {
    await zoomTo(page, k);
    const n = await box(card(page, q));
    const [num, disc, notes, badge] = [await box(mark(page, q, 'number')), await box(mark(page, q, 'answer')), await box(mark(page, q, 'notes')), await box(mark(page, dec, 'badge'))];
    for (const [name, m] of Object.entries({ num, disc, notes, badge })) expect(m.height, `${name} at ${k}`).toBeGreaterThanOrEqual(MARK_MIN - 0.6);
    // At or above the zoom where 22px reaches the minimum a mark is its plain scaled size.
    if (k >= 1) near(num.height, 22 * k, 1);
    // The disc and the notes mark on one vertical line; crowded far out, the notes mark takes the badge's corner (FIX_01).
    if (markGrow(k) > CROWD_GROW) near(notes.x, num.x, 1.5);
    else near(disc.x + disc.width / 2, notes.x + notes.width / 2, 1.5);
    near(num.x - n.x, 15 * k, 1.5); // the number's left edge stays 14px (node pixels) in from the border's inner edge
    if (markGrow(k) > CROWD_GROW) near(num.y, n.y - 11 * k, k + 1.5); // crowded, it grows down from where its top sits (FIX_01)
    else expect(Math.abs(num.y + num.height / 2 - n.y), `number on the top border at ${k}`).toBeLessThanOrEqual(k + 1.5); // centred on the padding edge, one border in
    expect(Math.abs(notes.y + notes.height / 2 - (n.y + n.height)), `notes on the bottom border at ${k}`).toBeLessThanOrEqual(k + 1.5);
  }
});

test('far out (20%) a node keeps its number, answer and notes; no mark covers another or rises into the container\'s title (FIX_01)', async ({ page, request }) => {
  const d = await board(page, request);
  // Nodes as an agent draws them, with a body of a few lines (one under about 110px, a title alone, is too short at 20%
  // for its number and a counted notes mark both), and a note on one.
  await write(request, d, d.n.map((n, i) => ({ type: 'node', n, node: { region: i === 3 ? 'q' : 'p', kind: ['question', 'finding', 'decision', 'question'][i], title: `Item ${n}`, body: 'Doors open at 18:00; the stage manager confirms the crew call at gate four, and the second truck leaves at nine.', ...(i === 1 && { icon: 'signal' }) } })));
  await act(page, d, { action: 'comment', n: d.n[0]!, ver: 2, text: 'Which truck?' });
  const visible = async (id: number) => card(page, id).locator('[data-mark], .vb-node-kind, .vb-node-grip').evaluateAll((els) => els
    .filter((e) => getComputedStyle(e).visibility === 'visible' && e.getClientRects().length && !(e as HTMLElement).hidden)
    .map((e) => { const r = e.getBoundingClientRect(); return { name: (e as HTMLElement).dataset.mark ?? e.className, x: r.x, y: r.y, w: r.width, h: r.height }; }));
  const overlap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  await zoomTo(page, 0.4);
  await expect(page.locator('.vb-stage[data-marks-crowded]')).toHaveCount(0);
  await expect(card(page, d.n[0]!).locator('.vb-node-kind')).toBeVisible();
  await zoomTo(page, 0.2);
  await expect(page.locator('.vb-stage[data-marks-crowded]')).toHaveCount(1);
  for (const id of d.n) {
    const marks = await visible(id);
    expect(marks.map((m) => m.name), `item ${id}`).toContain('number');
    expect(marks.some((m) => /vb-node-kind|vb-node-grip/.test(m.name) || m.name === 'badge'), `item ${id}: the tab and badge give way`).toBe(false);
    const h = (await box(card(page, id))).height;
    for (const [i, a] of marks.entries()) for (const b of marks.slice(i + 1)) expect(overlap(a, b), `item ${id} (${h}px tall): ${a.name} over ${b.name}`).toBe(false);
    // None rises past where it sits at rest (half a disc, 14px of the node's, above its top): the first row's never reach up
    // into the container's title line, which ends at the row's top (the title's own text box already meets it).
    const top = (await box(card(page, id))).y;
    for (const m of marks) expect(m.y, `item ${id}: ${m.name} rises past its place`).toBeGreaterThanOrEqual(top - 14 * 0.2 - 0.5);
  }
  await expect(mark(page, d.n[0]!, 'notes')).toBeVisible(); // a note to count stays
  await expect(mark(page, d.n[0]!, 'answer')).toBeVisible();
});

test('a menu keeps one size at every zoom, and stays open and attached while the board zooms', async ({ page, request }) => {
  const d = await board(page, request);
  const [q] = d.n as [number];
  const sizes: number[][] = [];
  for (const k of ZOOMS) {
    await zoomTo(page, k);
    await press(mark(page, q, 'answer'), k);
    const picker = menuOf(page, `Answer item ${q}`);
    await expect(picker).toBeVisible();
    const b = await box(picker);
    sizes.push([Math.round(b.width), Math.round(b.height)]);
    await page.keyboard.press('Escape');
    await expect(picker, `closed at ${k}`).toHaveCount(0);
  }
  expect(new Set(sizes.map(String)).size, JSON.stringify(sizes)).toBe(1);
  // Open at 100%, zoomed out to 40% and in to 250% without closing, it follows its disc.
  await zoomTo(page, 1);
  await mark(page, q, 'answer').click();
  const picker = menuOf(page, `Answer item ${q}`);
  const before = await box(picker);
  for (const k of [0.4, 2.5]) {
    await zoomTo(page, k);
    await expect(picker).toBeVisible();
    const [p, disc] = [await box(picker), await box(mark(page, q, 'answer'))];
    expect([Math.round(p.width), Math.round(p.height)]).toEqual([Math.round(before.width), Math.round(before.height)]);
    near(p.x, disc.x + disc.width + 6, 2);
  }
});

test('the conversation box scales with the board to a readable floor, top aligned with its node', async ({ page, request }) => {
  const d = await board(page, request);
  const [q] = d.n as [number];
  let at100 = 0;
  const widths: [number, number][] = [];
  for (const k of [1, 0.2, 0.4, 2.5]) {
    await zoomTo(page, k);
    await page.keyboard.press('Escape'); // a tip the zoom left open under the pointer goes first (a layer of its own)
    await card(page, q).focus(); // C on the node: far out a quiet notes mark gives way (FIX_01)
    await page.keyboard.press('c');
    const talk = page.locator('vb-note-bubble.vb-node-box');
    await expect(talk).toBeVisible();
    const [b, n] = [await box(talk), await box(card(page, q))];
    if (k === 1) at100 = b.width;
    widths.push([k, b.width / at100]);
    near(b.width / at100, boxScale(k), 0.02);
    if (await talk.getAttribute('data-side') === 'right') await beside(page, b, n);
    await expect(talk.locator('textarea')).toBeVisible(); // its field stays usable
    expect((await box(talk.locator('textarea'))).height * (1 / boxScale(k)), `field at ${k}`).toBeGreaterThan(20);
    await page.keyboard.press('Escape');
    await expect(talk).toBeHidden();
  }
  expect(widths.find(([k]) => k === 0.2)![1], 'below the floor it holds its size').toBeCloseTo(BOX_MIN_K, 2);
  // Open, it follows a zoom (stays attached).
  await zoomTo(page, 1);
  await mark(page, q, 'notes').click();
  const talk = page.locator('vb-note-bubble.vb-node-box');
  await zoomTo(page, 2.5);
  await expect(talk).toBeVisible();
  const [b, n] = [await box(talk), await box(card(page, q))];
  near(b.width / at100, 2.5, 0.03);
  if (await talk.getAttribute('data-side') === 'right') near(b.y, n.y, 1.5);
});

test('the history box keeps one size at any zoom and stays open and attached while zooming', async ({ page, request }) => {
  const d = await board(page, request);
  const dec = d.n[2]!;
  await zoomTo(page, 1);
  await mark(page, dec, 'badge').click();
  const history = card(page, dec).locator('.vb-card-pop.vb-node-box[data-pop="history"]');
  await expect(history).toHaveAttribute('data-open', '');
  const first = await box(history);
  for (const k of [0.4, 2.5, 0.2, 1]) {
    await zoomTo(page, k);
    await expect(history).toHaveAttribute('data-open', '');
    const [b, n] = [await box(history), await box(card(page, dec))];
    near(b.width, first.width, 1.5);
    near(b.height, first.height, 1.5);
    if (await history.getAttribute('data-side') === 'right') { await beside(page, b, n); expect(b.x).toBeGreaterThan(n.x + n.width); }
  }
});

test('the proposal box keeps one size at any zoom', async ({ page, request }) => {
  const d = await board(page, request);
  const f = d.n[0]!;
  await write(request, d, [{ type: 'propose', n: f, ver: 1, action: 'check', reason: 'Seen on two runs', source: 'Ops log' }]);
  await zoomTo(page, 1);
  await mark(page, f, 'answer').click();
  const proposal = card(page, f).locator('.vb-card-pop.vb-node-box[data-pop="proposal"]');
  await expect(proposal).toHaveAttribute('data-open', '');
  const first = await box(proposal);
  for (const k of [0.4, 2.5]) {
    await zoomTo(page, k);
    await expect(proposal).toHaveAttribute('data-open', '');
    const b = await box(proposal);
    near(b.width, first.width, 1.5);
    near(b.height, first.height, 1.5);
  }
});

for (const theme of ['dark', 'light'] as Theme[]) {
  test(`screenshots at 40%, 100% and 200% with the marks and the boxes, ${theme}`, async ({ page, request }) => {
    await setTheme(page, theme);
    const d = await board(page, request);
    const [q, , dec] = d.n as [number, number, number];
    for (const k of [0.4, 1, 2]) {
      await zoomTo(page, k);
      await page.screenshot({ path: `temp/fe05/marks-${Math.round(k * 100)}-${theme}.png` });
      await card(page, q).focus();
      await page.keyboard.press('c');
      await expect(page.locator('vb-note-bubble.vb-node-box')).toBeVisible();
      await page.screenshot({ path: `temp/fe05/conversation-${Math.round(k * 100)}-${theme}.png` });
      await page.keyboard.press('Escape');
      await press(mark(page, dec, 'badge'), k);
      await page.screenshot({ path: `temp/fe05/history-${Math.round(k * 100)}-${theme}.png` });
      await page.keyboard.press('Escape');
    }
  });
}
