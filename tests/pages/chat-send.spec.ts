// The chat panel with the board's Send and in a folder with no board (panel-send FE_01): in an empty
// folder the chat works, its agent is told no board is open, and the first board it draws opens with
// the conversation still there (the same session, listed first on that board); Send to agent with a
// session on the board hands the agent the answers as one message, at once when it is idle; pressed
// while it works, the button waits until the turn ends and the answers go; the model picker names
// exact models, Kiro's its two (N34); axe light and dark. The server is chat-server.ts with the agent package's fake
// `claude`, never the real one, on its own empty project.
import type { Page } from '@playwright/test';
import type { ChatServer } from './chat-server.ts';
import { startChatServer } from './chat-server.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { card, log, sendButton, side, status, text } from './chat-page.ts';

test.describe.configure({ mode: 'serial' });

const ROUND_HEAD = 'The person updated the board:';
const QUEUED = 'Your answers go to the agent when it finishes this turn.';

let srv: ChatServer;
let runs = 0;
test.beforeAll(async () => { srv = await startChatServer(); });
test.afterAll(async () => { await srv.close(); });

const mine = (page: Page) => log(page).locator('chat-message[data-from="person"]');
const replies = (page: Page) => log(page).locator('chat-message[data-from="agent"]');

/** Open the page (on `board`, or the folder) with the chat panel open. */
async function open(page: Page, board = '') {
  await page.goto(`${srv.base}/?vbwork${board ? `#${board}` : ''}`);
  if (board) await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
  await page.locator('#chat-toggle').click();
  await expect(side(page)).toBeVisible();
}

/** Send `words` from the composer; the fake's run for it, once it started. */
async function send(page: Page, words: string) {
  await text(page).fill(words);
  await text(page).press('Enter');
  return srv.fake.run(++runs);
}

/** The message Send hands the agent: the head line, the board, then the answer `line` first. */
function expectRound(prompt: string, line: string) {
  const lines = prompt.split('\n');
  expect(lines[0]).toBe(ROUND_HEAD);
  expect(lines[1]).toMatch(/^Board "Scratch" \(v\d+\)$/);
  expect(lines[2]).toBe(line);
}

/** The board's sessions, newest first. */
async function sessionsOn(page: Page, board: string) {
  return (await (await page.request.get(`${srv.base}/api/boards/${board}/chats`)).json() as { sessions: { session: string; model?: string }[] }).sessions;
}


test('picking Kiro offers Opus 5.5, picked with it, and Sonnet 5.5 by Kiro\'s ids, never auto (N34)', async ({ page }) => {
  // First, before any session: the pick is the next session's, so nothing starts.
  await open(page);
  await side(page).getByRole('combobox', { name: 'Agent' }).selectOption({ label: 'Kiro' });
  const model = side(page).getByRole('combobox', { name: 'Model' });
  await expect(model.locator('option')).toHaveText(['Opus 5.5', 'Sonnet 5.5']);
  expect(await model.locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))).toEqual(['claude-opus-5.5', 'claude-sonnet-5.5']);
  await expect(model.locator('option:checked')).toHaveText('Opus 5.5');
});

test('an empty folder: the chat works, and the first board its agent draws opens with the conversation on it', async ({ page }) => {
  await open(page);
  await expect(page.locator('.vb-message')).toContainText('No boards yet');
  await expect(side(page).locator('.chat-empty')).toHaveText('No boards here yet. Ask the agent to draw one.');
  await expect(status(page)).toHaveText('Status: Ready');
  await expectNoAxeViolations(page);
  // The fake replays a turn whose board write names "scratch" before that board is held: it opens once drawn.
  const given = await send(page, 'Draw a board for the release');
  expect(given.prompt).toContain('No board is open in this folder yet');
  await expect(replies(page)).toContainText('I wrote the "Scratch" board');
  await expect(page.locator('.vb-message')).toContainText('No boards yet');
  const secret = given.mcpConfig.mcpServers['vision-board']!.env.VB_AGENT_SECRET!;
  await srv.write('scratch', [
    { type: 'board', key: 'board', title: 'Scratch' }, { type: 'region', key: 'ideas', region: { id: 'ideas', title: 'Ideas', mode: 'grid' } },
    card('q1', 'Ship on Friday?'), card('q2', 'Add dark mode?'),
  ], secret);
  await expect(page.locator('vb-node')).toHaveCount(2);
  await expect(page).toHaveURL(/#scratch$/);
  await expect(mine(page)).toHaveText([/Draw a board for the release$/]);
  expect((await sessionsOn(page, 'scratch'))[0]!.session, 'the same session, first on its board').toBe(given.args[5]);
  // The next message goes to the same session, now on the board.
  const next = await send(page, 'Now refine it');
  expect(next.args[5]).toBe(given.args[5]);
  expect(next.prompt).toContain('Board: scratch');
  await expect(replies(page)).toHaveCount(2);
  await expect(status(page)).toHaveText('Status: Ready');
});

test('Send to agent while it is idle hands it the answers as one message, in card order', async ({ page }) => {
  await open(page, 'scratch');
  await srv.act('scratch', { action: 'ack', n: 1, ver: 1 });
  await sendButton(page).click();
  await expect(sendButton(page)).toHaveAttribute('data-state', 'sent');
  const given = await srv.fake.run(++runs);
  expectRound(given.prompt, '1 (question): ✓');
  const round = mine(page).last();
  await expect(round).toContainText(ROUND_HEAD);
  await expect(round).toContainText('1 (question): ✓');
  await expect(status(page)).toHaveText('Status: Ready');
});

/** The agent mid-turn (the fake hangs), the person's `act` on the board and Send to agent pressed: the button waits. */
async function sendWhileBusy(page: Page, act: Record<string, unknown>) {
  srv.fake.mode('hang');
  await send(page, 'Think it over');
  await expect(status(page)).toHaveText('Status: Working');
  await srv.act('scratch', act);
  await sendButton(page).click();
  await expect(sendButton(page)).toHaveAttribute('data-state', 'waiting');
}

/** Stop the turn; the held answers go to a run that replays and ends. */
async function stopAndHandOver(page: Page) {
  srv.fake.mode('replay');
  await side(page).getByRole('button', { name: 'Stop' }).click();
  return srv.fake.run(++runs);
}

test('Send to agent while it works waits, then the answers go when the turn ends', async ({ page }) => {
  await open(page, 'scratch');
  try {
    await sendWhileBusy(page, { action: 'ack', n: 2, ver: 1 });
    await expect(sendButton(page)).toHaveText('Waiting for agent');
    await expect(sendButton(page)).toHaveAttribute('title', 'Your answers go to the agent when it finishes this turn');
    await expect(log(page).locator('.chat-system').last()).toHaveText(QUEUED);
    const given = await stopAndHandOver(page);
    expectRound(given.prompt, '2 (question): ✓');
    await expect(sendButton(page)).not.toHaveAttribute('data-state', 'waiting');
    await expect(mine(page).last()).toContainText('2 (question): ✓');
    await expect(status(page)).toHaveText('Status: Ready');
  } finally {
    srv.fake.mode('replay');
  }
});

for (const theme of ['dark', 'light'] as Theme[]) {
  test(`axe passes with Send waiting, then with the answers handed over (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page, 'scratch');
    try {
      await sendWhileBusy(page, { action: 'comment', n: 1, ver: 1, text: `Checked in ${theme}` });
      await expectNoAxeViolations(page);
      await stopAndHandOver(page);
      // The comment goes as the answer in the Send message: the session's agent drew the board, so it is told it.
      await expect(mine(page).last()).toContainText(`Checked in ${theme}`);
      await expect(status(page)).toHaveText('Status: Ready');
      await expectNoAxeViolations(page);
    } finally {
      srv.fake.mode('replay');
    }
  });
}

// Last: it starts a new session whose agent has not been granted the first agent's container, so it is told
// no answer there (api.md 41), and the comment would not reach it.
test('the model picker names exact models; the one picked is the session\'s and the CLI\'s', async ({ page }) => {
  await open(page, 'scratch');
  const model = side(page).getByRole('combobox', { name: 'Model' });
  await expect(model.locator('option')).toHaveText(['Default', 'Opus 5.5', 'Sonnet 5.5']);
  expect(await model.locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value))).toEqual(['', 'claude-opus-5-5[1m]', 'claude-sonnet-5-5[1m]']);
  await model.selectOption({ label: 'Opus 5.5' });
  await page.getByRole('dialog', { name: 'Start a new session?' }).getByRole('button', { name: 'New session' }).click();
  await expect(side(page).locator('.chat-empty')).toBeVisible();
  expect((await sessionsOn(page, 'scratch'))[0]!.model).toBe('claude-opus-5-5[1m]');
  const given = await send(page, 'Which model are you?');
  expect(given.args.slice(given.args.indexOf('--model'), given.args.indexOf('--model') + 2)).toEqual(['--model', 'claude-opus-5-5[1m]']);
  await expect(status(page)).toHaveText('Status: Ready');
});

// After the last: Kiro's models follow the agent in every path (N37). The fake process stands in for Kiro.
test('the model picker follows the agent: picking Kiro, a New session, a Kiro session with no model, and back to Claude (N37)', async ({ page }) => {
  await open(page, 'scratch');
  const pick = (name: string) => side(page).getByRole('combobox', { name });
  const options = async () => pick('Model').locator('option').allTextContents();
  // Confirm the dialog and wait for the session to be on the board (its start finishes after the click).
  const newSession = async () => {
    const before = (await sessionsOn(page, 'scratch')).length;
    await page.getByRole('dialog', { name: 'Start a new session?' }).getByRole('button', { name: 'New session' }).click();
    await expect.poll(async () => (await sessionsOn(page, 'scratch')).length).toBe(before + 1);
  };
  // A Claude session in use: picking Kiro asks, then Kiro's two models show with Opus 5.5 picked.
  await pick('Agent').selectOption({ label: 'Kiro' });
  await newSession();
  await expect(pick('Agent').locator('option:checked')).toHaveText('Kiro');
  await expect(pick('Model').locator('option')).toHaveText(['Opus 5.5', 'Sonnet 5.5']);
  await expect(pick('Model').locator('option:checked')).toHaveText('Opus 5.5');
  expect((await sessionsOn(page, 'scratch'))[0]!.model).toBe('claude-opus-5.5');
  // New session keeps the agent and the model.
  await pick('Model').selectOption({ label: 'Sonnet 5.5' });
  await newSession();
  await side(page).getByRole('button', { name: 'New session' }).click();
  await newSession();
  await expect(pick('Model').locator('option:checked')).toHaveText('Sonnet 5.5');
  expect(await options()).toEqual(['Opus 5.5', 'Sonnet 5.5']);
  // A Kiro session recorded with no model (started through the API) shows Opus 5.5, what Kiro runs.
  const made = await page.request.post(`${srv.base}/api/boards/scratch/chats`, { data: { agent: 'kiro' } });
  expect(made.status()).toBe(201);
  expect((await sessionsOn(page, 'scratch'))[0]!.model).toBeUndefined();
  await page.reload();
  await expect(side(page)).toBeVisible();
  await expect(pick('Agent').locator('option:checked')).toHaveText('Kiro');
  await expect(pick('Model').locator('option:checked')).toHaveText('Opus 5.5');
  // And back to Claude: its Default, Opus 5.5 and Sonnet 5.5.
  await pick('Agent').selectOption({ label: 'Claude' });
  await newSession();
  await expect(pick('Model').locator('option')).toHaveText(['Default', 'Opus 5.5', 'Sonnet 5.5']);
  await expect(pick('Model').locator('option:checked')).toHaveText('Default');
});
