// The change badge says when the agent last wrote a card's text (card-written-time): a quiet "v1" on a card that never
// changed, its tip two lines, "Updated 26 Nov '26, 11:42 by Claude" then the badge's name with its key. On a board of its
// own; the flag writtenTime off brings back the old badge (none until v2, its own tip).
import { expect, test } from './helpers.ts';
import { open, write } from './agent-board.ts';
import { drawEdges, mark } from './edge-board.ts';

const WRITTEN = /^Updated \d{1,2} [A-Z][a-z]{2} '\d\d, \d\d:\d\d( by .+)?\nv1, history of item \d+ \(H\)$/;

test('a card that never changed shows v1, and its tip says when it was written, then its name', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, '?vbwork');
  const [q] = d.n as [number];
  const badge = mark(page, q, 'badge');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveAttribute('data-badge', 'settled');
  await expect(badge).toContainText('v1');
  await expect(badge).toHaveAttribute('data-tip', WRITTEN);
  await badge.hover();
  const tip = page.locator('.vb-mark-tip');
  await expect(tip).toBeVisible({ timeout: 5000 });
  await expect(tip).toHaveText(WRITTEN);
  expect(await tip.evaluate((t) => getComputedStyle(t).whiteSpace)).toBe('pre-line');
});

test('a redrawn card is told by its newest drawn time; flag off, no badge on a card that never changed', async ({ page, request }) => {
  const d = await drawEdges(request);
  const [q] = d.n as [number];
  await write(request, d, [{ type: 'node', n: q, node: { region: 'p', kind: 'question', title: 'Book the second truck today, again?' } }]);
  await open(page, d, '?vbwork');
  await expect(mark(page, q, 'badge')).toContainText('1 update');
  await expect(mark(page, q, 'badge')).toHaveAttribute('data-tip', /^Updated .+\n1 update, history of item \d+ \(H\)$/);
  await open(page, d, '?vbwork&flags=-writtenTime');
  await expect(mark(page, d.n[1] as number, 'badge')).toBeHidden();
});
