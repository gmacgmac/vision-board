// Finding never clears a card's marks (search-and-finding FIND_01, findKeepsMarks flag, on by
// default; the maintainer's ruling 322): going to a card by Go to card, the "N new" list or the open
// list selects it and brings it into view but leaves its NEW or "updated" mark, the toolbar's count
// and the ledger as they were (no card seen line). The person's own click on the card, and any act on
// it, still clear them. Off, a found card is marked seen as a selected one is (today).
// Each test draws a board of its own through the API as a joined agent (agent-board.ts), opens it,
// sees every card at version 1, then the agent adds card 4 (NEW) and changes card 3 (updated).
import type { Page } from '@playwright/test';
import { expect, test } from './helpers.ts';
import type { Drawn } from './agent-board.ts';
import { act, card, draw, open, write } from './agent-board.ts';
import { boardLines } from './board-lines.ts';
import { idle, selected, stageBox } from './board-page.ts';

const isNew = (page: Page, n: number) => card(page, n).locator('.vb-node-btab[data-tab="new"]');
const updates = (page: Page, n: number) => card(page, n).locator('.vb-node-btab[data-tab="updates"]');
const freshList = (page: Page) => page.getByLabel('Go to a new or updated card', { exact: true });
const openList = (page: Page) => page.getByLabel('Go to an open card', { exact: true });
const freshChip = (page: Page) => page.locator('#counts .vb-chip[data-tone="new"]:has(#fresh-cards)');

/** The card seen lines the person has sent on the board (a board seen line names no card). */
const cardSeen = async (page: Page, d: Drawn) => (await boardLines(page, d.board)).filter((e) => e.type === 'seen' && e.n !== undefined).length;

/** Whether any of card `n` shows on the stage. */
async function shows(page: Page, n: number): Promise<boolean> {
  const [s, b] = [await stageBox(page), (await card(page, n).boundingBox())!];
  return b.y < s.y + s.height && b.y + b.height > s.y && b.x < s.x + s.width && b.x + b.width > s.x;
}

/** A board of its own: opened, seen, then changed (card 4 added in "p", card 3 updated). */
async function fresh(page: Page, request: Parameters<typeof draw>[0], query = '?vbwork'): Promise<{ d: Drawn; added: number; updated: number }> {
  const d = await draw(request, 3, 'finds');
  await open(page, d, query);
  await expect.poll(async () => (await boardLines(page, d.board)).some((e) => e.type === 'seen' && e.n === undefined)).toBe(true);
  for (const n of d.n) expect((await page.request.post(`/api/boards/${d.board}/seen`, { data: { n, ver: 1 } })).status()).toBe(201);
  const [added] = await write(request, d, [
    { type: 'node', node: { region: 'p', kind: 'question', title: 'Card 4' } },
    { type: 'node', n: d.n[2], node: { region: 'p', kind: 'question', title: 'Card 3', body: 'Changed.' } },
  ]);
  await expect(page.locator('vb-node')).toHaveCount(4);
  await expect(isNew(page, added!.n!)).toHaveText('NEW');
  await expect(updates(page, d.n[2]!)).toHaveText('1 update');
  await expect(freshChip(page)).toContainText('2 new');
  return { d, added: added!.n!, updated: d.n[2]! };
}

/** Everything a find must leave alone, for a board where cards `added` and `updated` are fresh. */
async function untouched(page: Page, d: Drawn, added: number, updated: number, was: number): Promise<void> {
  await idle(page);
  await expect(isNew(page, added)).toHaveText('NEW');
  await expect(updates(page, updated)).toHaveText('1 update');
  await expect(freshChip(page)).toContainText('2 new');
  expect(await cardSeen(page, d), 'no card seen line').toBe(was);
}

const goByNumber = async (page: Page, n: number) => {
  await page.keyboard.type(String(n));
  await page.keyboard.press('Enter');
};

const finders: [string, (page: Page, n: number) => Promise<void>][] = [
  ['Go to card (digits, Enter)', goByNumber],
  ['the "N new" list', (page, n) => freshList(page).selectOption(String(n)).then(() => undefined)],
  ['the open list', (page, n) => openList(page).selectOption(String(n)).then(() => undefined)],
];

for (const [name, find] of finders) {
  test(`${name}: a new and an updated card are selected, focused and in view, and keep their marks`, async ({ page, request }) => {
    await page.goto('/?setup');
    const { d, added, updated } = await fresh(page, request);
    const was = await cardSeen(page, d);
    for (const n of [added, updated]) {
      await find(page, n);
      await expect(card(page, n)).toBeFocused();
      expect(await selected(page)).toEqual([String(n)]);
      expect(await shows(page, n)).toBe(true);
      await untouched(page, d, added, updated, was);
    }
  });
}

test('a click on a found card clears its mark; so does an act on the other', async ({ page, request }) => {
  await page.goto('/?setup');
  const { d, added, updated } = await fresh(page, request);
  const was = await cardSeen(page, d);
  expect(was, 'the setup sent a seen line per card').toBe(3);
  await freshList(page).selectOption(String(added));
  await expect(card(page, added)).toHaveAttribute('data-selected', '');
  await untouched(page, d, added, updated, was);
  // The person's own click, on the card already selected, engages with it.
  await card(page, added).locator('.vb-node-title').click();
  await expect(isNew(page, added)).toBeHidden();
  await expect(freshChip(page)).toContainText('1 new');
  await expect.poll(() => cardSeen(page, d)).toBe(was + 1);
  // An act on a card found and left alone clears it too.
  await goByNumber(page, updated);
  await expect(card(page, updated)).toBeFocused();
  await expect(updates(page, updated)).toHaveText('1 update');
  await act(page, d, { action: 'ack', n: updated, ver: 2 });
  await expect(updates(page, updated)).toBeHidden();
});

test('finding a second card leaves the first alone, and clicking a card not yet selected clears it', async ({ page, request }) => {
  await page.goto('/?setup');
  const { d, added, updated } = await fresh(page, request);
  const was = await cardSeen(page, d);
  await freshList(page).selectOption(String(added));
  await freshList(page).selectOption(String(updated));
  await untouched(page, d, added, updated, was);
  await card(page, added).locator('.vb-node-title').click();
  await expect(isNew(page, added)).toBeHidden();
  await expect(updates(page, updated)).toHaveText('1 update');
});

test('with the flag off a found card is marked seen as a selected one is (today)', async ({ page, request }) => {
  await page.goto('/?setup');
  const { added } = await fresh(page, request, '?vbwork&flags=-findKeepsMarks');
  await freshList(page).selectOption(String(added));
  await expect(card(page, added)).toHaveAttribute('data-selected', '');
  await expect(isNew(page, added)).toBeHidden();
  await expect(freshChip(page)).toContainText('1 new');
});
