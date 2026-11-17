// The three zoom groups (nodeEdges flag, D-101; FE_05; components.md "Zoom groups"), at 20%, 40%, 100% and 250%:
// the edge marks never draw under --vb-mark-min and grow in place (the disc and the notes mark on one vertical line, the
// number on its corner); a menu keeps one size; the conversation box scales with the board to a readable floor; the
// history and proposal boxes keep one size and stay open and attached while the board zooms. Light and dark screenshots
// at 40%, 100% and 200% go to temp/fe05/. With the flag off nothing here applies (zoom-counter-scale.spec.ts).
import type { Page } from '@playwright/test';
import { expect, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { card, open, write } from './agent-board.ts';
import { drawEdges, mark, menuOf } from './edge-board.ts';
import { zoomTo } from './rail-board.ts';
import { BOX_MIN_K, MARK_MIN, boxScale } from '../../apps/board/src/board/canvas/viewport.ts';

const FLAGS = '?vbwork&flags=nodeEdges';
const ZOOMS = [0.2, 0.4, 1, 2.5];
const box = async (l: ReturnType<Page['locator']>) => (await l.boundingBox())!;
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
    near(disc.x + disc.width / 2, notes.x + notes.width / 2, 1.5);
    near(num.x - n.x, 15 * k, 1.5); // the number's left edge stays 14px (node pixels) in from the border's inner edge
    expect(Math.abs(num.y + num.height / 2 - n.y), `number on the top border at ${k}`).toBeLessThanOrEqual(k + 1.5); // centred on the padding edge, one border in
    expect(Math.abs(notes.y + notes.height / 2 - (n.y + n.height)), `notes on the bottom border at ${k}`).toBeLessThanOrEqual(k + 1.5);
  }
});

test('a menu keeps one size at every zoom, and stays open and attached while the board zooms', async ({ page, request }) => {
  const d = await board(page, request);
  const [q] = d.n as [number];
  const sizes: number[][] = [];
  for (const k of ZOOMS) {
    await zoomTo(page, k);
    await mark(page, q, 'answer').click();
    const picker = menuOf(page, `Answer item ${q}`);
    await expect(picker).toBeVisible();
    const b = await box(picker);
    sizes.push([Math.round(b.width), Math.round(b.height)]);
    await page.keyboard.press('Escape');
    await expect(picker).toHaveCount(0);
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
    await mark(page, q, 'notes').click();
    const talk = page.locator('vb-note-bubble.vb-node-box');
    await expect(talk).toBeVisible();
    const [b, n] = [await box(talk), await box(card(page, q))];
    if (k === 1) at100 = b.width;
    widths.push([k, b.width / at100]);
    near(b.width / at100, boxScale(k), 0.02);
    if (await talk.getAttribute('data-side') === 'right') near(b.y, n.y, 1.5);
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
    if (await history.getAttribute('data-side') === 'right') { near(b.y, n.y, 1.5); expect(b.x).toBeGreaterThan(n.x + n.width); }
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
      await mark(page, q, 'notes').click();
      await expect(page.locator('vb-note-bubble.vb-node-box')).toBeVisible();
      await page.screenshot({ path: `temp/fe05/conversation-${Math.round(k * 100)}-${theme}.png` });
      await page.keyboard.press('Escape');
      await mark(page, dec, 'badge').click();
      await page.screenshot({ path: `temp/fe05/history-${Math.round(k * 100)}-${theme}.png` });
      await page.keyboard.press('Escape');
    }
  });
}
