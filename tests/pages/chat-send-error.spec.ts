// A Send the chat can't take says why (point 386): after a restart the board's chat session is loaded again on first
// use; when its CLI can't start, the Send is refused in the person's words, as any failed act is (the error toast),
// nothing is recorded, and Send stays lit for the next try. The server is chat-server.ts with the agent package's fake
// `claude`, twice on one project folder: the first starts the session, the second cannot start it again.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ChatServer } from './chat-server.ts';
import { startChatServer } from './chat-server.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { PORTS } from './ports.ts';
import { sendButton, side, status, text } from './chat-page.ts';

test.describe.configure({ mode: 'serial' });

const project = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vb-send-error-')));
let srv: ChatServer | undefined;
test.afterEach(async () => { await srv?.close(); srv = undefined; });
test.afterAll(() => { fs.rmSync(project, { recursive: true, force: true }); });

const WHY = 'the CLI is gone';
// The refusal this test causes on purpose: the Send's act.
test.use({ expected: { problems: [/^response 409: POST .*\/act$/, /^console error: .*409 \(Conflict\)/] } });

for (const theme of ['dark', 'light'] as Theme[]) {
  test(`a Send the chat can't take says why, records nothing, and Send stays lit (${theme})`, async ({ page }) => {
    const board = `send-error-${theme}`;
    srv = await startChatServer({ project });
    await setTheme(page, theme);
    await srv.write(board, [{ type: 'board', key: `${board}-board`, title: 'Send error' }]);
    await page.goto(`${srv.base}/#${board}`);
    await page.locator('#chat-toggle').click();
    await expect(side(page)).toBeVisible();
    // The chat's own agent draws a card the person can answer.
    await text(page).fill('Add a question.');
    await text(page).press('Enter');
    const given = await srv.fake.run(1);
    await expect(status(page)).toHaveText('Status: Ready');
    const secret = given.mcpConfig.mcpServers['vision-board']!.env.VB_AGENT_SECRET!;
    const [, asked] = await srv.write(board, [
      { type: 'region', key: `${board}-mine`, region: { id: 'mine', title: 'Mine', mode: 'grid' } },
      { type: 'node', key: `${board}-m1`, node: { region: 'mine', kind: 'question', title: 'Ship on Friday?' } },
    ], secret);
    await expect(page.locator('vb-node')).toHaveCount(1);
    await page.goto('about:blank'); // the page's streams end before the server does
    await srv.close();

    // The server restarts: the session is on disk, not loaded, and its CLI can't start.
    srv = await startChatServer({ project, startError: WHY, port: PORTS.chatAgain });
    // This page was open before the session existed, as when it is started elsewhere: it knows no chat on the board,
    // so its Send records the act and the server hands the answers over.
    await page.route(`**/api/boards/${board}/chats`, (route) => (route.request().method() === 'GET' ? route.fulfill({ json: { sessions: [] } }) : route.fallback()));
    await page.goto(`${srv.base}/#${board}`);
    await expect(page.locator('vb-node')).toHaveCount(1);
    await srv.act(board, { action: 'ack', n: asked!.n, ver: 1 });
    await expect(sendButton(page)).toHaveAttribute('data-state', 'idle');
    const sends = () => fs.readFileSync(path.join(project, '.visionboard', 'ledger.jsonl'), 'utf8').split('\n').filter((l) => /"action": ?"send"/.test(l)).length;
    const before = sends();
    await sendButton(page).click();
    const toast = page.locator('#toast');
    await expect(toast).toContainText('Send did not go: the chat could not be reached');
    await expect(toast).toContainText(WHY);
    await expect(toast).toContainText('Your answers are still unsent');
    expect(srv.fake.given(), 'the agent was told nothing').toEqual([]);
    expect(sends(), 'no Send is recorded').toBe(before);
    // The button itself shows the error, with the reason as its tip, then is lit again (SendButton.svelte HOLD.error).
    await expect(sendButton(page)).toHaveAttribute('data-state', 'error');
    await expect(sendButton(page)).toHaveAttribute('title', /Send did not go: the chat could not be reached .*the CLI is gone/);
    await expectNoAxeViolations(page);
    await expect(sendButton(page), 'still lit').toHaveAttribute('data-state', 'idle', { timeout: 10_000 });
  });
}
