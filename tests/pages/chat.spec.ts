// The chat panel's elements in the gallery (chat-panel FE_01, chatPanel flag, on by default):
// every state drawn from the recorded turns, the elements raising their events (never calling the
// server), the keys, axe light and dark, and the section's screenshots. The board's sidebar and its
// bridge are FE_02's.
import type { Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['dark', 'light'];
const STATES = ['empty', 'thinking', 'tool', 'streaming', 'approval', 'approval-command', 'denied', 'blocked', 'stopped', 'error', 'send-queued', 'send-handed', 'answers', 'selected', 'answers-open', 'answers-working', 'folder'];
const sample = (page: Page, state: string) => page.locator(`.g-chat-sample[data-state="${state}"]`);

/** Collects the chat's events on the page, in order. */
async function listen(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { chatEvents: unknown[] };
    w.chatEvents = [];
    for (const type of ['chat-send', 'chat-chip-remove', 'chat-answer', 'chat-change', 'chat-stop', 'chat-new-session', 'chat-pick']) {
      document.addEventListener(type, (e) => w.chatEvents.push({ type, detail: (e as CustomEvent).detail ?? null }));
    }
  });
}
const events = (page: Page) => page.evaluate(() => (window as unknown as { chatEvents: unknown[] }).chatEvents);

test.beforeEach(async ({ page }) => {
  await page.goto('/gallery.html?flags=chatPanel');
  await expect(page.locator('section[data-feature="chatPanel"]')).toBeVisible();
});

test('the section is there only with the flag on', async ({ page }) => {
  await page.goto('/gallery.html?flags=-chatPanel');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(page.locator('section[data-feature="chatPanel"]')).toHaveCount(0);
});

test('every state is drawn: a header, a named polite log and a labelled composer', async ({ page }) => {
  await expect(page.locator('.g-chat-sample')).toHaveCount(STATES.length);
  for (const state of STATES) {
    const s = sample(page, state);
    await expect(s.locator('chat-header')).toBeVisible();
    await expect(s.getByRole('log', { name: 'Conversation' })).toHaveAttribute('aria-live', 'polite');
    await expect(s.getByRole('textbox', { name: 'Message to the agent' })).toBeVisible();
  }
  await expect(sample(page, 'empty').locator('.chat-empty')).toHaveText('No messages yet. Ask the agent about this board.');
  await expect(sample(page, 'empty').getByRole('combobox', { name: 'Agent' })).toHaveValue('claude');
  // The board's Send (panel-send FE_01): the waiting line, then the answers as one message; a folder with no board.
  await expect(sample(page, 'send-queued').locator('.chat-system')).toHaveText('Your answers go to the agent when it finishes this turn.');
  await expect(sample(page, 'send-handed').locator('chat-message[data-from="person"]').last()).toContainText('The person updated the board:');
  await expect(sample(page, 'folder').locator('.chat-empty')).toHaveText('No boards here yet. Ask the agent to draw one.');
  await expect(sample(page, 'empty').getByRole('combobox', { name: 'Model' }).locator('option:checked')).toHaveText('Sonnet 5.5');
});

test('the status line and the header follow the turn', async ({ page }) => {
  const status = (state: string) => sample(page, state).locator('.chat-hd-status');
  const line = (state: string) => sample(page, state).getByRole('status');
  await expect(line('thinking')).toHaveText('Thinking…');
  await expect(line('tool')).toHaveText('Drawing on the board…');
  await expect(line('streaming')).toHaveText('Writing…');
  await expect(line('approval')).toHaveText('Waiting for your answer');
  await expect(line('denied')).toHaveText('');
  for (const [state, word] of [['empty', 'Ready'], ['thinking', 'Working'], ['approval', 'Waiting for you'], ['blocked', 'Can\'t send'], ['stopped', 'Stopped'], ['error', 'Error']]) {
    await expect(status(state!), state).toHaveText(`Status: ${word}`);
  }
  await expect(sample(page, 'thinking').getByRole('button', { name: 'Stop' })).toBeEnabled();
  await expect(sample(page, 'stopped').getByRole('button', { name: 'Stop' })).toBeDisabled();
  // The tool's own words never show: only its one line.
  await expect(sample(page, 'tool').locator('chat-feed')).not.toContainText('ToolSearch');
});

test('the agent\'s words render as Markdown; the change chip names the board and cards', async ({ page }) => {
  const s = sample(page, 'streaming');
  await expect(s.locator('chat-message[data-from="agent"] code.vb-md-icode')).toHaveText('ideas');
  await expect(s.getByRole('button', { name: /Drew 2 cards on Scratch/ })).toContainText('1, 2');
  await expect(s.locator('chat-message[data-from="person"] .chat-chip')).toHaveText('3Release plan');
});

test('approval: the facts and three answers; one answer raised, then nothing more', async ({ page }) => {
  await listen(page);
  const card = sample(page, 'approval').getByRole('group', { name: 'Approval: Create a file' });
  await expect(card.locator('.chat-ask-subject')).toHaveText('/home/someone/project/notes.txt');
  await expect(card.locator('.chat-ask-ttl')).toHaveText('1:52 left');
  await expect(card.getByRole('button')).toHaveText(['Allow once', 'Allow for this session', 'Deny']);
  await card.getByRole('button', { name: 'Allow for this session' }).click();
  await card.getByRole('button', { name: 'Deny' }).click();
  expect(await events(page)).toEqual([{ type: 'chat-answer', detail: { approvalId: 'ap-1', answer: { approved: true, scope: 'session' } } }]);
  await expect(card).toHaveAttribute('aria-busy', 'true');
  const settled = sample(page, 'denied').getByRole('group', { name: 'Approval: Create a file' });
  await expect(settled.getByRole('button')).toHaveCount(0);
  await expect(settled.locator('.chat-ask-outcome')).toHaveText('Denied');
  await expect(sample(page, 'stopped').locator('.chat-ask-outcome')).toHaveText('Not needed: the turn was stopped or a new message sent');
});

test('composer: Enter sends the words and chips, Shift+Enter breaks the line; a chip comes off by its button', async ({ page }) => {
  await listen(page);
  const s = sample(page, 'empty');
  const text = s.getByRole('textbox', { name: 'Message to the agent' });
  await expect(s.getByRole('button', { name: 'Send' })).toBeDisabled();
  await text.fill('Look at these');
  await text.press('Shift+Enter');
  await text.pressSequentially('two');
  await s.getByRole('button', { name: 'Remove Card 7: Ship on Friday?' }).click();
  await expect(text).toBeFocused();
  await text.press('Enter');
  expect(await events(page)).toEqual([
    { type: 'chat-chip-remove', detail: { chip: { kind: 'card', ref: 7, label: 'Ship on Friday?' } } },
    { type: 'chat-send', detail: { text: 'Look at these\ntwo', chips: [{ kind: 'card', ref: 3, label: 'Release plan' }, { kind: 'note', ref: 41, label: 'Keep a written record' }] } },
  ]);
  // While the agent works Enter sends nothing; blocked, the text can't be typed in and says why.
  const busy = sample(page, 'thinking').getByRole('textbox', { name: 'Message to the agent' });
  await busy.fill('More');
  await busy.press('Enter');
  expect(await events(page)).toHaveLength(2);
  await expect(sample(page, 'blocked').getByRole('textbox', { name: 'Message to the agent' })).toBeDisabled();
  await expect(sample(page, 'blocked').locator('.chat-cmp-line')).toHaveText(/A past version of the board is showing/);
});

test('composer: one chip for what goes from the board, opening a preview of exactly that by keyboard and by hover; with it Send goes with no words, also while the agent works', async ({ page }) => {
  await listen(page);
  const s = sample(page, 'answers');
  const chip = s.getByRole('button', { name: '3 answers · 1 selected' });
  const preview = s.getByRole('region', { name: 'What the agent receives' });
  await expect(chip).toHaveAttribute('aria-expanded', 'false');
  await expect(preview).toHaveCount(0);
  await expect(sample(page, 'selected').getByRole('button', { name: '2 selected', exact: true })).toBeVisible();
  await expect(sample(page, 'answers-open').getByRole('region', { name: 'What the agent receives' })).toBeVisible();
  await chip.focus();
  await page.keyboard.press('Enter');
  await expect(chip).toBeFocused();
  await expect(chip).toHaveAttribute('aria-expanded', 'true');
  await expect(chip).toHaveAttribute('aria-controls', (await preview.getAttribute('id'))!);
  const text = await preview.locator('pre').textContent();
  expect(text!.split('\n\n')[0]).toBe('The person selected these cards:\n- Card 7: Book the venue');
  expect(text!.split('\n\n')[1]!.split('\n').slice(0, 3)).toEqual(['The person updated the board:', 'Board "Launch" (v4)', '2 (question): ✓']);
  await page.keyboard.press('Space');
  await expect(chip).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter');
  await expect(preview).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(preview).toHaveCount(0);
  await expect(chip).toBeFocused();
  // Hover opens it; it stays while the pointer crosses to it, and goes once the pointer leaves both.
  await chip.hover();
  await expect(preview).toBeVisible();
  await expect(chip).toHaveAttribute('aria-expanded', 'true');
  await preview.hover();
  await page.waitForTimeout(400);
  await expect(preview).toBeVisible();
  await s.locator('chat-header').hover();
  await expect(preview).toHaveCount(0);
  // Not removable; no words: Send is on, and goes (the host adds what the chip holds).
  await expect(s.locator('button.chat-chip-x')).toHaveCount(0);
  await s.getByRole('button', { name: 'Send', exact: true }).click();
  // While the agent works, what is attached waits: Send stays on and says so.
  const working = sample(page, 'answers-working');
  await expect(working.locator('.chat-cmp-line')).toHaveText('The agent is working. What is attached goes when it finishes; Stop it to send words alone.');
  await working.getByRole('textbox', { name: 'Message to the agent' }).fill('And these');
  await working.getByRole('textbox', { name: 'Message to the agent' }).press('Enter');
  expect(await events(page)).toEqual([
    { type: 'chat-send', detail: { text: '', chips: [] } },
    { type: 'chat-send', detail: { text: 'And these', chips: [] } },
  ]);
});

test('change chip, Stop, New session and the agent picker raise their events', async ({ page }) => {
  await listen(page);
  await sample(page, 'streaming').getByRole('button', { name: /Drew 2 cards on Scratch/ }).click();
  await sample(page, 'thinking').getByRole('button', { name: 'Stop' }).click();
  await sample(page, 'denied').getByRole('button', { name: 'New session' }).click();
  await sample(page, 'empty').getByRole('combobox', { name: 'Agent' }).selectOption('kiro');
  expect(await events(page)).toEqual([
    { type: 'chat-change', detail: { board: 'scratch', cards: [1, 2], head: 5 } },
    { type: 'chat-stop', detail: null },
    { type: 'chat-new-session', detail: null },
    { type: 'chat-pick', detail: { field: 'agent', id: 'kiro' } },
  ]);
});

for (const theme of THEMES) {
  test(`axe passes and the section matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await expectNoAxeViolations(page);
    await expect(page.locator('section[data-feature="chatPanel"]')).toHaveScreenshot(`chat-${theme}.png`);
  });
}
