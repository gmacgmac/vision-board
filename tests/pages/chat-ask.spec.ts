// Ask now with the board's chat panel (nodeEdges flag, api.md 188; FE_03 run 2): the page records the `ask` as before,
// and the server hands the panel's agent that node's asked note at once, with the board, as its own message ("Asked
// now."): never the board's other answers, and no Send, so the tick waits for Send. The server is chat-server.ts with
// the agent package's fake `claude`, never the real one, on its own empty project.
import type { Page } from '@playwright/test';
import type { ChatServer } from './chat-server.ts';
import { startChatServer } from './chat-server.ts';
import { expect, test } from './helpers.ts';
import { log, side, status, text } from './chat-page.ts';

test.describe.configure({ mode: 'serial' });

const ROUND_HEAD = 'The person updated the board:';
const ASKED_HEAD = "The person asks about this now, apart from the board's Send (the rest of their answers wait for it):";
const MOD = process.platform === 'darwin' ? 'Meta' : 'Control';

let srv: ChatServer;
test.beforeAll(async () => { srv = await startChatServer(); });
test.afterAll(async () => { await srv.close(); });

const mine = (page: Page) => log(page).locator('chat-message[data-from="person"]');
const node = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);

test('Ask now in the conversation box goes to the panel\'s agent alone, at once, recorded as an ask and no Send', async ({ page }) => {
  await srv.write('asks', [
    { type: 'board', key: 'board', title: 'Asks' }, { type: 'region', key: 'r', region: { id: 'r', title: 'Kit', mode: 'grid' } },
    { type: 'node', key: 'a', node: { region: 'r', kind: 'question', title: 'Is 96 GB enough?' } },
    { type: 'node', key: 'b', node: { region: 'r', kind: 'question', title: 'Book the truck?' } },
  ]);
  await page.goto(`${srv.base}/?vbwork&flags=nodeEdges#asks`);
  await expect(page.locator('vb-node')).toHaveCount(2);
  await page.locator('#chat-toggle').click();
  await expect(side(page)).toBeVisible();
  await text(page).fill('Look at the kit');
  await text(page).press('Enter');
  await srv.fake.run(1);
  await expect(status(page)).toHaveText('Status: Ready');
  // Another answer, waiting for Send.
  await srv.act('asks', { action: 'ack', n: 2, ver: 1 });
  await node(page, 1).locator('[data-mark="notes"]').click();
  const field = page.locator('vb-note-bubble[data-mode="conversation"]').getByRole('textbox');
  await field.fill('Even for the largest model?');
  await field.press(`${MOD}+Enter`);
  const asked = await srv.fake.run(2);
  expect(asked.prompt.startsWith(ASKED_HEAD), asked.prompt).toBe(true);
  expect(asked.prompt).toContain('Even for the largest model?');
  expect(asked.prompt).toContain('Board: asks');
  expect(asked.prompt).not.toContain(ROUND_HEAD);
  await expect(mine(page).last()).toContainText('Asked now.');
  await expect(page.locator('vb-note-bubble .vb-nb-who').first()).toContainText('Asked now');
  // Recorded as an `ask` with its context, and no Send: the tick still waits for the board's Send.
  const lines = (await (await page.request.get(`${srv.base}/api/ledger?after=0`)).json() as { events: Record<string, unknown>[] }).events;
  expect(lines.filter((e) => e.action === 'ask')).toEqual([expect.objectContaining({ board: 'asks', context: 'board' })]);
  expect(lines.filter((e) => e.action === 'send' && e.board === 'asks')).toEqual([expect.objectContaining({ action: 'send' })]); // the first message's
  expect(srv.fake.given()).toHaveLength(2);
});
