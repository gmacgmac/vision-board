// Send to agent lights only for what the chat's agent may read (point 384): on a board with two agents, an answer in a
// container the chat's agent may not read is never in its answers chip, so it gives Send nothing to carry and Send
// stays quiet ("Nothing new to send"); the other agent reads it with check_responses. An answer on the chat agent's
// own card lights Send, and Send hands it over. The server is chat-server.ts with the agent package's fake `claude`.
import type { Page } from '@playwright/test';
import type { ChatServer } from './chat-server.ts';
import { startChatServer } from './chat-server.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { sendButton, side, status, text } from './chat-page.ts';

test.describe.configure({ mode: 'serial' });

let srv: ChatServer;
test.beforeAll(async () => { srv = await startChatServer(); });
test.afterAll(async () => { await srv.close(); });

// Keys are an agent's own, across boards: each test's keys carry its theme.
const question = (key: string, region: string, title: string) => ({ type: 'node', key, node: { region, kind: 'question', title } });
const cardOf = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);

for (const theme of ['dark', 'light'] as Theme[]) {
  test(`an answer only another agent reads leaves Send quiet; one the chat's agent reads lights it (${theme})`, async ({ page }) => {
    const board = `scope-${theme}`;
    // The server's test agent draws the board and its container; the chat's agent then adds its own.
    const [, , theirs] = await srv.write(board, [
      { type: 'board', key: `${board}-board`, title: 'Scope' }, { type: 'region', key: `${board}-theirs`, region: { id: 'theirs', title: 'Theirs', mode: 'grid' } },
      question(`${board}-t1`, 'theirs', 'Keep the annual price?'),
    ]);
    await setTheme(page, theme);
    await page.goto(`${srv.base}/#${board}`);
    await expect(page.locator('vb-node')).toHaveCount(1);
    await page.locator('#chat-toggle').click();
    await expect(side(page)).toBeVisible();
    const runs = srv.fake.given().length;
    await text(page).fill('Add your own question.');
    await text(page).press('Enter');
    const given = await srv.fake.run(runs + 1);
    await expect(status(page)).toHaveText('Status: Ready');
    const secret = given.mcpConfig.mcpServers['vision-board']!.env.VB_AGENT_SECRET!;
    const [, mine] = await srv.write(board, [
      { type: 'region', key: `${board}-mine`, region: { id: 'mine', title: 'Mine', mode: 'grid' } }, question(`${board}-m1`, 'mine', 'Ship on Friday?'),
    ], secret);
    await expect(page.locator('vb-node')).toHaveCount(2);

    await srv.act(board, { action: 'ack', n: theirs!.n, ver: 1 });
    await expect(cardOf(page, theirs!.n!)).toHaveAttribute('data-status', 'acknowledged');
    await expect(sendButton(page), 'nothing for the chat\'s agent').toHaveAttribute('data-state', 'disabled');
    await expect(sendButton(page)).toHaveAttribute('title', 'Nothing new to send');
    await expectNoAxeViolations(page);

    await srv.act(board, { action: 'ack', n: mine!.n, ver: 1 });
    await expect(cardOf(page, mine!.n!)).toHaveAttribute('data-status', 'acknowledged');
    await expect(sendButton(page)).toHaveAttribute('data-state', 'idle');
    await sendButton(page).click();
    const round = await srv.fake.run(runs + 2);
    expect(round.prompt).toMatch(new RegExp(`^${mine!.n} \\(question\\): ✓$`, 'm'));
    expect(round.prompt, 'only what its agent may read').not.toMatch(new RegExp(`^${theirs!.n} \\(`, 'm'));
    await expect(sendButton(page)).toHaveAttribute('data-state', 'disabled', { timeout: 5000 });
    await expectNoAxeViolations(page);
  });
}
