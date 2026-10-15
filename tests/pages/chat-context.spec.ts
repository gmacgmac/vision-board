// The chat carries the board (chat-board-context, composer-one-chip): after a ✓ the composer shows
// one chip, "1 answer" ("1 answer · 1 selected" with a card selected, "1 selected" alone), which opens
// a preview of exactly what the agent receives from the board, the same text the fake CLI then gets;
// the words, "The person selected these cards:" and the answers go as one message, in that order; with no words the context alone goes, and the toolbar's Send is that
// same message; with nothing at all both are disabled together; while the agent works a message
// with context waits and goes when the turn ends; on a board with no session Send is as today; the
// chip by keyboard; axe light and dark. The server is chat-server.ts with the agent package's fake
// `claude`, never the real one, on its own empty project: the session's agent draws the board, so
// it may answer every card and is told every answer.
import type { Page } from '@playwright/test';
import type { ChatServer } from './chat-server.ts';
import { startChatServer } from './chat-server.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

test.describe.configure({ mode: 'serial' });

const ROUND_HEAD = 'The person updated the board:';
const SELECTED_HEAD = 'The person selected these cards:';
const QUEUED_WORDS = 'Your message goes to the agent when it finishes this turn.';
const NOTHING = 'Nothing new to send';

let srv: ChatServer;
let runs = 0;
test.beforeAll(async () => { srv = await startChatServer(); });
test.afterAll(async () => { await srv.close(); });

const side = (page: Page) => page.locator('#chat');
const text = (page: Page) => side(page).getByRole('textbox', { name: 'Message to the agent' });
const submit = (page: Page) => side(page).getByRole('button', { name: 'Send', exact: true });
const answers = (page: Page) => side(page).locator('button.chat-cmp-ctx');
const preview = (page: Page) => side(page).getByRole('region', { name: 'What the agent receives' });
/** The preview's text, opened by hover (focus stays where it is), then closed again. */
async function previewText(page: Page): Promise<string> {
  await answers(page).hover();
  const shown = (await preview(page).locator('pre').textContent())!;
  await side(page).locator('chat-header').hover();
  await expect(preview(page)).toHaveCount(0);
  return shown;
}
const mine = (page: Page) => side(page).locator('chat-message[data-from="person"]');
const status = (page: Page) => side(page).locator('.chat-hd-status');
const sendButton = (page: Page) => page.locator('#send');
const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);
const node = (key: string, title: string, kind = 'question') => ({ type: 'node', key, node: { region: 'plan', kind, title } });

/** Open the page (on `board`, or the folder) with the chat panel open. */
async function open(page: Page, board = '') {
  await page.goto(`${srv.base}/?vbwork${board ? `#${board}` : ''}`);
  if (board) await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
  await page.locator('#chat-toggle').click();
  await expect(side(page)).toBeVisible();
}

/** The prompt's parts, split at its blank lines. */
const parts = (prompt: string) => prompt.split('\n\n');

test('setup: a chat in the empty folder draws the board "Launch" (scratch, the board the recorded turn names), its session moving there', async ({ page }) => {
  await open(page);
  await text(page).fill('Draw the launch plan');
  await text(page).press('Enter');
  const given = await srv.fake.run(++runs);
  await expect(status(page)).toHaveText('Status: Ready');
  await srv.write('scratch', [
    { type: 'board', key: 'board', title: 'Launch' }, { type: 'region', key: 'plan', region: { id: 'plan', title: 'Plan', mode: 'grid' } },
    node('q1', 'Ship on Friday?'), node('q2', 'Add dark mode?'), node('a3', 'Book the venue', 'action'),
  ], given.mcpConfig.mcpServers.vb!.env.VB_AGENT_SECRET!);
  await expect(page.locator('vb-node')).toHaveCount(3);
  await expect(page).toHaveURL(/#scratch$/);
});

test('a ✓ shows "1 answer" in the composer; it opens a preview of the answers the message carries', async ({ page }) => {
  await open(page, 'scratch');
  await expect(answers(page)).toHaveCount(0);
  await expect(submit(page)).toBeDisabled();
  await expect(sendButton(page)).toHaveAttribute('title', NOTHING);
  await card(page, 1).locator('button[data-act="ack"]').click();
  await expect(answers(page)).toHaveText('1 answer');
  await expect(answers(page)).toHaveAttribute('aria-expanded', 'false');
  await answers(page).click();
  const [head, title, first] = (await preview(page).locator('pre').textContent())!.split('\n');
  expect([head, first]).toEqual([ROUND_HEAD, '1 (question): ✓']);
  expect(title).toMatch(/^Board "Launch" \(v\d+\)$/);
  await expect(submit(page)).toBeEnabled();
  await expect(sendButton(page)).not.toHaveAttribute('aria-disabled', 'true');
});

test('the words, "The person selected these cards:" and the answers go as one message, in that order, exactly as the preview showed; then nothing is new', async ({ page }) => {
  await open(page, 'scratch');
  await expect(answers(page)).toHaveText('1 answer');
  await card(page, 3).locator('.vb-node-title').click();
  await expect(answers(page)).toHaveText('1 answer · 1 selected');
  await text(page).fill('Write the tasks for these');
  const shown = await previewText(page);
  await text(page).press('Enter');
  const given = await srv.fake.run(++runs);
  expect(given.prompt).toBe(`Write the tasks for these\n\n${shown}\n\nBoard: scratch`);
  const [words, attached, round, board] = parts(given.prompt);
  expect(words).toBe('Write the tasks for these');
  expect(attached).toBe(`${SELECTED_HEAD}\n- Card 3: Book the venue`);
  const [head, title, first] = round!.split('\n');
  expect([head, first]).toEqual([ROUND_HEAD, '1 (question): ✓']);
  expect(title).toMatch(/^Board "Launch" \(v\d+\)$/);
  expect(board).toBe('Board: scratch');
  await expect(mine(page).last()).toContainText('Write the tasks for these');
  await expect(mine(page).last()).toContainText('1 (question): ✓');
  await expect(mine(page).last().locator('.chat-chip')).toHaveText(['3Book the venue']);
  await expect(status(page)).toHaveText('Status: Ready');
  await expect(answers(page)).toHaveCount(0);
  await expect(sendButton(page)).toHaveAttribute('title', NOTHING);
});

test('no words: the context alone goes; the toolbar\'s Send is the same message', async ({ page }) => {
  await open(page, 'scratch');
  await card(page, 2).locator('button[data-act="ack"]').click();
  await expect(answers(page)).toHaveText('1 answer');
  await expect(text(page)).toHaveValue('');
  const shown = await previewText(page);
  await submit(page).click();
  const fromComposer = await srv.fake.run(++runs);
  expect(fromComposer.prompt).toBe(`${shown}\n\nBoard: scratch`);
  await expect(answers(page)).toHaveCount(0);
  await expect(status(page)).toHaveText('Status: Ready');
  await card(page, 2).locator('button[data-act="drop"]').click();
  await expect(answers(page)).toHaveText('1 answer');
  await sendButton(page).click();
  await expect(sendButton(page)).toHaveAttribute('data-state', 'sent');
  const fromSend = await srv.fake.run(++runs);
  const shape = (prompt: string) => prompt.replace(/\(v\d+\)/, '(vN)').replace(/head \d+/g, 'head N').replace(/after \d+/, 'after N').replace(/: (✓|✗)$/m, ': WORD');
  expect(fromComposer.prompt.startsWith(`${ROUND_HEAD}\n`)).toBe(true);
  expect(fromComposer.prompt).toContain('\n2 (question): ✓\n');
  expect(fromSend.prompt).toContain('\n2 (question): ✗\n');
  expect(shape(fromSend.prompt)).toBe(shape(fromComposer.prompt));
  await expect(mine(page).last()).toContainText(ROUND_HEAD);
  await expect(answers(page)).toHaveCount(0);
  await expect(sendButton(page)).toHaveAttribute('title', NOTHING);
});

test('a comment shows as one answers chip and no note chip; the note\'s words go once in the message, as the answer', async ({ page }) => {
  await open(page, 'scratch');
  const note = 'Ask the venue first';
  await card(page, 2).focus();
  await page.keyboard.press('c');
  await page.getByLabel('Note text').fill(note);
  await page.keyboard.press('Enter');
  await expect(answers(page)).toHaveText('1 answer');
  await expect(side(page).locator('chat-composer .chat-chip')).toHaveCount(1);
  await expect(side(page).locator('chat-composer .chat-chip', { hasText: note })).toHaveCount(0);
  expect((await previewText(page)).split(note).length - 1).toBe(1);
  await text(page).fill('Go');
  await text(page).press('Enter');
  const given = await srv.fake.run(++runs);
  expect(given.prompt.split(note).length - 1).toBe(1);
  expect(given.prompt).not.toContain('Attached from the board');
  expect(given.prompt).toContain(`2 (question): ✗: ${note}`);
  await expect(status(page)).toHaveText('Status: Ready');
});

test('nothing at all: submit and Send are disabled together; a selected card enables both', async ({ page }) => {
  await open(page, 'scratch');
  await expect(submit(page)).toBeDisabled();
  await expect(sendButton(page)).toHaveAttribute('aria-disabled', 'true');
  await card(page, 1).locator('.vb-node-title').click();
  await expect(side(page).locator('chat-composer .chat-chip')).toHaveText(['1 selected']);
  expect(await previewText(page)).toBe(`${SELECTED_HEAD}\n- Card 1: Ship on Friday?`);
  await expect(submit(page)).toBeEnabled();
  await expect(sendButton(page)).not.toHaveAttribute('aria-disabled', 'true');
  await page.locator('#stage').focus();
  await page.keyboard.press('Escape');
  await expect(submit(page)).toBeDisabled();
  await expect(sendButton(page)).toHaveAttribute('aria-disabled', 'true');
});

test('while the agent works, a message with context waits and goes when the turn ends, built then', async ({ page }) => {
  await open(page, 'scratch');
  srv.fake.mode('hang');
  try {
    await text(page).fill('Think it over');
    await text(page).press('Enter');
    const busy = await srv.fake.run(++runs);
    await expect(status(page)).toHaveText('Status: Working');
    await expect(submit(page)).toBeDisabled();
    await card(page, 3).locator('button[data-act="ack"]').click();
    await expect(answers(page)).toHaveText('1 answer');
    await expect(side(page).locator('.chat-cmp-line')).toHaveText('The agent is working. What is attached goes when it finishes; Stop it to send words alone.');
    await text(page).fill('Also these');
    await text(page).press('Enter');
    await expect(side(page).locator('.chat-system').last()).toHaveText(QUEUED_WORDS);
    await expect(text(page)).toHaveValue('');
    await expect(sendButton(page)).toHaveAttribute('data-state', 'waiting');
    await card(page, 1).locator('button[data-act="drop"]').click();
    srv.fake.mode('replay');
    await side(page).getByRole('button', { name: 'Stop' }).click();
    const given = await srv.fake.run(++runs);
    expect(given.args[5]).toBe(busy.args[5]);
    const [words, round] = parts(given.prompt);
    expect(words).toBe('Also these');
    expect(round).toContain('\n1 (question): ✗\n');
    expect(round).toContain('\n3 (action): ✓\n');
    await expect(mine(page).last()).toContainText('Also these');
    await expect(sendButton(page)).not.toHaveAttribute('data-state', 'waiting');
    await expect(status(page)).toHaveText('Status: Ready');
    await expect(answers(page)).toHaveCount(0);
  } finally {
    srv.fake.mode('replay');
  }
});

test('a board with no session: Send is as today, the act alone; no agent runs', async ({ page }) => {
  await srv.write('other', [
    { type: 'board', key: 'other', title: 'Other' }, { type: 'region', key: 'plan', region: { id: 'plan', title: 'Plan', mode: 'grid' } },
    node('o1', 'Keep the old logo?'),
  ]);
  await open(page, 'other');
  await expect(side(page).locator('.chat-empty')).toHaveText('No messages yet. Ask the agent about this board.');
  await card(page, 1).locator('button[data-act="ack"]').click();
  await sendButton(page).click();
  await expect(sendButton(page)).toHaveAttribute('data-state', 'sent');
  await expect(sendButton(page)).toHaveAttribute('title', NOTHING);
  expect(srv.fake.given()).toHaveLength(runs);
  await expect(mine(page)).toHaveCount(0);
});

for (const theme of ['dark', 'light'] as Theme[]) {
  test(`keyboard: the chip opens its preview with Enter, Space closes it, Esc closes it without touching the board, focus staying; axe passes open (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page, 'scratch');
    // ✓ in one theme, Later in the other: pressing the same answer again would clear it, and ✗ after ✓
    // could put the card back where the last Send left it, which folds to nothing to send (D-045).
    const answer = card(page, 2).locator(`button[data-act="${theme === 'dark' ? 'ack' : 'later'}"]`);
    await answer.click();
    await expect(answer).toHaveAttribute('aria-pressed', 'true');
    await card(page, 3).locator('.vb-node-title').click();
    await expect(answers(page)).toHaveText('1 answer · 1 selected');
    await text(page).click();
    await expect(text(page)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(answers(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(answers(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(answers(page)).toBeFocused();
    await expect(answers(page)).toHaveAttribute('aria-controls', (await preview(page).getAttribute('id'))!);
    const shown = (await preview(page).locator('pre').textContent())!.split('\n');
    expect(shown.slice(0, 3)).toEqual([SELECTED_HEAD, '- Card 3: Book the venue', '']);
    expect(shown).toContainEqual(expect.stringMatching(/^2 \(question\): (✓|saved for later)$/));
    await expectNoAxeViolations(page);
    await page.keyboard.press('Space');
    await expect(answers(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(preview(page)).toHaveCount(0);
    await page.keyboard.press('Enter');
    await expect(preview(page)).toBeVisible();
    // Esc closes the preview only: the card stays selected.
    await page.keyboard.press('Escape');
    await expect(preview(page)).toHaveCount(0);
    await expect(answers(page)).toBeFocused();
    await expect(answers(page)).toHaveText('1 answer · 1 selected');
    await expect(card(page, 3)).toHaveAttribute('data-selected', /.*/);
    await expectNoAxeViolations(page);
  });
}

test('hover: the preview opens on the chip, stays while the pointer crosses to it, and closes once it leaves both; a click holds it open until clicked again', async ({ page }) => {
  await open(page, 'scratch');
  await card(page, 1).locator('.vb-node-title').click();
  await expect(answers(page)).toContainText('selected');
  await answers(page).hover();
  await expect(preview(page)).toBeVisible();
  await preview(page).hover();
  await page.waitForTimeout(400);
  await expect(preview(page)).toBeVisible();
  await side(page).locator('chat-header').hover();
  await expect(preview(page)).toHaveCount(0);
  await answers(page).click();
  await side(page).locator('chat-header').hover();
  await page.waitForTimeout(400);
  await expect(preview(page)).toBeVisible();
  await answers(page).click();
  await expect(preview(page)).toHaveCount(0);
  await expect(answers(page)).toHaveAttribute('aria-expanded', 'false');
});
