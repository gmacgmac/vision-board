// pageChanged (nclite's handover, item 160; plugin.md § The view): the board tells its host each time what `pageChip()`
// answers would change, so a pane's Add to chat is never stale. Once after the first draw, then on each case the handover
// lists: a board opens or another is switched to, the shown board is archived or restored, the last board goes, an agent's
// first board arrives and opens; and a rename, which changes the chip's label. Nothing else on the board tells it.
import type { Page } from '@playwright/test';
import { drawn, drawPlans, drive, expect, openHost, test } from './harness.ts';

const PERSON = { caller: { by: 'person' as const } };
const told = async (page: Page): Promise<number> => (await drive(page, 'record')).pageChanged;
const shown = async (page: Page) => {
  const chip = await drive(page, 'pageChip');
  return chip ? { board: chip.ref.board, label: chip.label } : null;
};

/** The host is told once more than `before`, and `pageChip()` then answers `want`. Gives the new count. */
async function toldOnce(page: Page, before: number, want: { board: string; label: string } | null): Promise<number> {
  await expect.poll(() => told(page)).toBe(before + 1);
  expect(await shown(page)).toEqual(want);
  return before + 1;
}

/** Nothing the chip shows changed: after the board settles, the host has been told no more. */
async function notTold(page: Page, count: number): Promise<void> {
  await page.waitForTimeout(300);
  expect(await told(page)).toBe(count);
}

test('pageChanged: once after the first draw, then on every case the handover lists, and never for a change the chip does not show', async ({ page, host }) => {
  const act = (board: string, action: string) => host.engine.route({ method: 'POST', path: `boards/${board}/act`, body: { type: 'act', action, board } }, PERSON);
  const write = async (board: string, items: unknown[]) => { const r = await host.tool("write_board", { board, items }); expect(r.isError, JSON.stringify(r)).toBe(false); };

  await openHost(page, host);
  let count = await toldOnce(page, 0, null); // the first draw, nothing on show

  await drive(page, 'reveal', { board: 'plans' });
  await drawPlans(host);
  await drawn(page);
  count = await toldOnce(page, count, { board: 'plans', label: 'Plans' }); // an agent's first board arrives and opens

  await write('plans', [{ type: 'node', node: { region: 'now', kind: 'question', title: 'One more?' } }]);
  await expect(page.locator('.host-root vb-node')).toHaveCount(4);
  await notTold(page, count); // a card on the board on show: the same chip

  await write('other', [{ type: 'board', title: 'Other' }, { type: 'region', region: { id: 'now', title: 'Now' } }]);
  await notTold(page, count); // another board drawn, not opened

  await drive(page, 'reveal', { board: 'other' });
  count = await toldOnce(page, count, { board: 'other', label: 'Other' }); // switched to another board
  await drive(page, 'reveal', { board: 'plans' });
  count = await toldOnce(page, count, { board: 'plans', label: 'Plans' }); // a board opens

  expect((await host.engine.route({ method: 'PUT', path: 'boards/plans', body: { title: 'Plans for May' } }, PERSON))?.status).toBeLessThan(300);
  count = await toldOnce(page, count, { board: 'plans', label: 'Plans for May' }); // renamed: a different chip

  expect((await act('plans', 'archive'))?.status).toBe(201);
  count = await toldOnce(page, count, { board: 'other', label: 'Other' }); // the shown board archived: the next one shows
  expect((await act('other', 'archive'))?.status).toBe(201);
  count = await toldOnce(page, count, null); // the last board goes

  expect((await act('plans', 'restore'))?.status).toBe(201);
  await drive(page, 'reveal', { board: 'plans' });
  count = await toldOnce(page, count, { board: 'plans', label: 'Plans for May' }); // restored and open again
});

test('pageChanged: a board already there when the host mounts is told once, with its chip, and never after unmount', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  await expect.poll(() => told(page)).toBe(1);
  expect(await shown(page)).toEqual({ board: 'plans', label: 'Plans' });
  await notTold(page, 1);
  await drive(page, 'unmount');
  expect((await host.engine.route({ method: 'POST', path: 'boards/plans/act', body: { type: 'act', action: 'archive', board: 'plans' } }, PERSON))?.status).toBe(201);
  await notTold(page, 1); // never from unmount, or after it
});

test('pageChanged left out: a host that does not give it still has its board, and pageChip answers', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host, { noPageChanged: true });
  await drawn(page);
  expect(await shown(page)).toEqual({ board: 'plans', label: 'Plans' });
  expect(await told(page)).toBe(0);
});
