// The boxes beside a node (nodeEdges flag; FE_03 run 2, the maintainer's rulings): the conversation, proposal and
// history boxes share one place (mark-place.ts `placeBeside`): top level with the node's top, to its right when there is
// room, else below it with their left edges aligned, never over the node, and one look (node-box.css). The history box
// is the designed one: "History of N" with an ×, the stepper, one row per entry with its version, and "Proposal
// withdrawn: the node changed" when a newer version made a proposal out of date. With the flag on no group pin draws:
// a note on several nodes is counted on their notes marks. Light and dark screenshots to temp/fe03/.
import type { Locator, Page } from '@playwright/test';
import { expect, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { act, card, open, write } from './agent-board.ts';
import { drawEdges, mark } from './edge-board.ts';

const FLAGS = '?vbwork&flags=nodeEdges';
const box = async (l: Locator) => (await l.boundingBox())!;

async function besideTheNode(page: Page, n: number, opened: Locator) {
  const [c, b] = [await box(card(page, n)), await box(opened)];
  const side = await opened.getAttribute('data-side');
  if (side === 'right') {
    expect(Math.abs(b.y - c.y), 'top level with the node').toBeLessThanOrEqual(1.5);
    expect(b.x).toBeGreaterThanOrEqual(c.x + c.width);
  } else {
    expect(side).toBe('below');
    expect(Math.abs(b.x - c.x), 'left edges aligned').toBeLessThanOrEqual(1.5);
    expect(b.y).toBeGreaterThanOrEqual(c.y + c.height);
  }
}

test('the conversation, history and proposal boxes open beside the node, top aligned, in one look', async ({ page, request }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q, , dec, f] = d.n as [number, number, number, number];
  await mark(page, q, 'notes').click();
  const talk = page.locator('vb-note-bubble.vb-node-box');
  await expect(talk).toBeVisible();
  await besideTheNode(page, q, talk);
  await page.keyboard.press('Escape');
  // History: a newer version of the decision, after a proposal on the one before.
  await write(request, d, [{ type: 'propose', n: dec, ver: 1, action: 'check', reason: 'The backup link held all night', source: 'Ops log' }]);
  await write(request, d, [{ type: 'node', n: dec, node: { region: 'p', kind: 'decision', title: 'Switch to the backup now?' } }]);
  await mark(page, dec, 'badge').click();
  const history = card(page, dec).locator('.vb-card-pop.vb-node-box[data-pop="history"]');
  await expect(history).toHaveAttribute('data-open', '');
  await besideTheNode(page, dec, history);
  await expect(history.locator('.vb-node-box-title')).toHaveText(`History of ${dec}`);
  await expect(history.locator('.vb-history-row').first()).toContainText('Proposal withdrawn: the node changed');
  await expect(history.locator('.vb-history-ver').nth(1)).toHaveText('v2');
  await expect(history.locator('.vb-history-head')).toHaveCount(0);
  await history.getByRole('button', { name: 'Close history' }).click();
  await expect(history).not.toHaveAttribute('data-open', '');
  // A proposal waiting: its box beside the node too.
  await write(request, d, [{ type: 'propose', n: f, ver: 1, action: 'check', reason: 'Seen on two runs', source: 'Ops log' }]);
  await mark(page, f, 'answer').click();
  const proposal = card(page, f).locator('.vb-card-pop.vb-node-box[data-pop="proposal"]');
  await expect(proposal).toHaveAttribute('data-open', '');
  await besideTheNode(page, f, proposal);
  // One look: the same width, border and head size for every box.
  const look = (l: Locator) => l.evaluate((e) => { const c = getComputedStyle(e); return [c.borderTopColor, c.borderRadius, c.fontSize]; });
  expect(await look(proposal)).toEqual(await look(history));
});

test('below the node when the right has no room; no group pin with the edges on', async ({ page, request }) => {
  await page.setViewportSize({ width: 820, height: 1000 });
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const [q, f] = d.n as [number, number];
  await act(page, d, { action: 'comment', nodes: [q, f], text: 'Do these two clash?' });
  await expect(page.locator('.vb-group-pin')).toHaveCount(0);
  await expect(mark(page, q, 'notes')).toHaveAttribute('data-group', '');
  const right = (await box(card(page, f)));
  await mark(page, f, 'notes').click();
  const talk = page.locator('vb-note-bubble.vb-node-box');
  await expect(talk).toBeVisible();
  const b = await box(talk);
  if (right.x + right.width + 12 + b.width > 812) await expect(talk).toHaveAttribute('data-side', 'below');
  await besideTheNode(page, f, talk);
});

for (const theme of ['dark', 'light'] as Theme[]) {
  test(`screenshots of the three boxes, ${theme}`, async ({ page, request }) => {
    await setTheme(page, theme);
    await page.setViewportSize({ width: 1600, height: 1000 });
    const d = await drawEdges(request);
    await open(page, d, FLAGS);
    const [q, , dec, f] = d.n as [number, number, number, number];
    await act(page, d, { action: 'comment', n: q, ver: 1, text: 'Is the second truck free on Thursday?' });
    await mark(page, q, 'notes').click();
    await expect(page.locator('vb-note-bubble.vb-node-box')).toBeVisible();
    await page.screenshot({ path: `temp/fe03/run2-conversation-${theme}.png` });
    await page.keyboard.press('Escape');
    await write(request, d, [{ type: 'propose', n: dec, ver: 1, action: 'check', reason: 'The backup link held all night', source: 'Ops log' }]);
    await write(request, d, [{ type: 'node', n: dec, node: { region: 'p', kind: 'decision', title: 'Switch to the backup now?' } }]);
    await mark(page, dec, 'badge').click();
    await expect(card(page, dec).locator('.vb-card-pop[data-pop="history"]')).toHaveAttribute('data-open', '');
    await page.screenshot({ path: `temp/fe03/run2-history-${theme}.png` });
    await page.keyboard.press('Escape');
    await write(request, d, [{ type: 'propose', n: f, ver: 1, action: 'check', reason: 'Seen on two runs', source: 'Ops log' }]);
    await mark(page, f, 'answer').click();
    await expect(card(page, f).locator('.vb-card-pop[data-pop="proposal"]')).toHaveAttribute('data-open', '');
    await page.screenshot({ path: `temp/fe03/run2-proposal-${theme}.png` });
  });
}
