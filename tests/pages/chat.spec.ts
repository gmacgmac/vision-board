// The chat panel's elements in the gallery (chat-panel FE_01, chatPanel flag, on by default):
// every state drawn from the recorded turns, the elements raising their events (never calling the
// server), the keys, axe light and dark, and the section's screenshots. The board's sidebar and its
// bridge are FE_02's.
import type { Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['dark', 'light'];
const STATES = ['empty', 'thinking', 'tool', 'streaming', 'approval', 'approval-command', 'denied', 'blocked', 'stopped', 'error'];
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
