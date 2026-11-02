// The chat sidebar on the board and its bridge (chat-panel FE_02, chatPanel flag, on by default):
// closed at first, opened and closed by the toolbar's Chat button and T, the stage shrinking beside
// it; its width set by dragging its edge or by the arrow keys, kept with whether it is open; the
// selected cards as chips (the unsent notes are in the answers chip), a message going with them, the agent's words and
// its change chip, which zooms to the cards and selects nothing; a changed card's link back to the chat;
// the session again after a reload; Allow and Deny on what the gate asks; Stop; a past version;
// New session, a message sent while it starts, and the newest session after a reload (FIX_01);
// the header's pickers, drawn once and wide enough for their labels; axe light and dark. The server is this file's own (chat-server.ts) with the agent
// package's fake `claude`, never the real one: replaying the recorded turn that drew cards 1 and 2
// on "scratch", or hanging so the gate can be asked by hand.
import type { Page } from '@playwright/test';
import { ask, gone } from '#board/testing';
import type { ChatServer } from './chat-server.ts';
import { startChatServer } from './chat-server.ts';
import { expect, expectNoAxeViolations, setTheme, test, bid } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { card, log, side, status, text, toggle } from './chat-page.ts';

test.describe.configure({ mode: 'serial' });

let srv: ChatServer;
let runs = 0;

test.beforeAll(async () => {
  srv = await startChatServer();
  // The recorded turn drew cards 1 and 2 on "scratch": the same board, so its change chip lands here.
  await srv.write('scratch', [
    { type: 'board', key: 'board', title: 'Scratch' }, { type: 'region', key: 'ideas', region: { id: 'ideas', title: 'Ideas', mode: 'grid' } },
    card('q1', 'Ship on Friday?'), card('q2', 'Add dark mode?'),
  ]);
  await srv.act('scratch', { action: 'comment', n: 1, ver: 1, text: 'Keep it short' });
});
test.afterAll(async () => { await srv.close(); });

/** Open the board (flag on by default; or `flags`), and wait for its first draw. */
async function open(page: Page, flags = 'chatPanel') {
  await page.goto(`${srv.base}/?vbwork&flags=${flags}#scratch`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
}
/** Chips but the composer's one (composer-one-chip ruling 1): the board attaches no other. */
const chips = (page: Page) => side(page).locator('chat-composer .chat-chip:not(.chat-cmp-ctx)');
/** The composer's one chip: what goes from the board. */
const attached = (page: Page) => side(page).locator('chat-composer .chat-cmp-ctx');
const width = (page: Page) => side(page).evaluate((el) => Math.round(el.getBoundingClientRect().width));

/** Send `words` from the composer; the fake's run for it, once it started. */
async function send(page: Page, words: string) {
  await text(page).fill(words);
  await text(page).press('Enter');
  return srv.fake.run(++runs);
}

test('the panel: closed at first; the Chat button and T open and close it; the stage shrinks beside it', async ({ page }) => {
  await open(page, '-chatPanel');
  await expect(toggle(page)).toHaveCount(0);
  await expect(page.locator('aside.vb-chat')).toHaveCount(0);
  await open(page);
  await expect(side(page)).toBeHidden();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await toggle(page).click();
  await expect(side(page)).toBeVisible();
  await expect(text(page)).toBeFocused();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
  const [stage, chat] = await Promise.all([page.locator(bid('stage')).boundingBox(), side(page).boundingBox()]);
  expect(Math.round(stage!.x + stage!.width)).toBe(Math.round(chat!.x));
  // T in the composer is a letter; elsewhere it opens and closes the panel.
  await text(page).press('t');
  await expect(text(page)).toHaveValue('t');
  await toggle(page).focus();
  await page.keyboard.press('t');
  await expect(side(page)).toBeHidden();
  const full = await page.locator(bid('stage')).boundingBox();
  expect(Math.round(full!.width)).toBe(1600);
  await page.keyboard.press('t');
  await expect(side(page)).toBeVisible();
});

test('resize: dragging the edge and the arrow keys set the width, kept with the panel open after a reload', async ({ page }) => {
  await open(page);
  await toggle(page).click();
  expect(await width(page)).toBe(400);
  const grip = side(page).getByRole('separator', { name: 'Chat width' });
  const g = (await grip.boundingBox())!;
  await page.mouse.move(g.x + g.width / 2, g.y + 200);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2 - 100, g.y + 200, { steps: 4 });
  await page.mouse.up();
  expect(await width(page)).toBe(500);
  await grip.focus();
  await page.keyboard.press('ArrowRight');
  expect(await width(page)).toBe(484);
  await expect(grip).toHaveAttribute('aria-valuenow', '484');
  await page.reload();
  await expect(side(page)).toBeVisible();
  expect(await width(page)).toBe(484);
});

test('a message: the selected card goes with it; the agent\'s words show; its change chip zooms to the cards and selects nothing', async ({ page }) => {
  await open(page);
  await toggle(page).click();
  await expect(side(page).locator('.chat-empty')).toHaveText('No messages yet. Ask the agent about this board.');
  await expect(status(page)).toHaveText('Status: Ready');
  // The unsent note is not a chip (chat-no-double-note ruling 2): the one chip counts it as an answer.
  await expect(chips(page)).toHaveCount(0);
  await expect(attached(page)).toHaveText('1 answer');
  await page.locator('vb-node[data-id="2"] .vb-node-title').click();
  await expect(attached(page)).toHaveText('1 answer · 1 selected');
  await expect(chips(page)).toHaveCount(0);
  const given = await send(page, 'Draw two questions');
  expect(given.prompt).toMatch(/^Draw two questions\n\nThe person selected these cards:\n- Card 2: Add dark mode\?\n\n/);
  expect(given.prompt).not.toContain('- Note ');
  expect(given.prompt).toContain('Board: scratch');
  await expect(log(page).locator('chat-message[data-from="person"]')).toContainText('Draw two questions');
  await expect(log(page).locator('chat-message[data-from="agent"]')).toContainText('I wrote the "Scratch" board in one call');
  await expect(status(page)).toHaveText('Status: Ready');
  // The message took the card: it is spent until the selection changes.
  await expect(attached(page).filter({ hasText: 'selected' })).toHaveCount(0);
  await expect(text(page)).toHaveValue('');
  // The change chip: zoomed to, and nothing selected, so nothing goes with the next message.
  await page.locator(bid('stage')).focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(0);
  const before = await page.locator('.vb-world').getAttribute('style');
  await log(page).getByRole('button', { name: /Drew 2 cards on Scratch/ }).click();
  await expect(page.locator('.vb-world')).not.toHaveAttribute('style', before!);
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(0);
  await expect(attached(page).filter({ hasText: 'selected' })).toHaveCount(0);
});

test('a changed card links to the chat\'s write that changed it; the conversation is there again after a reload', async ({ page }) => {
  await open(page);
  await srv.write('scratch', [{ type: 'node', key: 'q1-v2', n: 1, node: { region: 'ideas', kind: 'question', title: 'Ship on Friday, or Monday?' } }]);
  const updates = page.locator('vb-node[data-id="1"] [data-tab="updates"]');
  await expect(updates).toHaveText('1 update');
  // A new page on the board: the session in use, its conversation from the start.
  await toggle(page).click();
  await expect(log(page).locator('chat-message[data-from="agent"]')).toContainText('I wrote the "Scratch" board');
  await toggle(page).click();
  await expect(side(page)).toBeHidden();
  await updates.click();
  const link = page.locator('vb-node[data-id="1"]').getByRole('button', { name: 'Show in the chat' });
  await link.click();
  await expect(side(page)).toBeVisible();
  await expect(log(page).getByRole('button', { name: /Drew 2 cards on Scratch/ })).toBeFocused();
});

for (const theme of ['dark', 'light'] as Theme[]) {
  test(`axe passes with the panel open and a conversation in it (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page);
    await toggle(page).click();
    await expect(log(page).locator('chat-message[data-from="agent"]')).toBeVisible();
    await page.locator('vb-node[data-id="2"] .vb-node-title').click();
    await expect(attached(page)).toContainText('1 selected');
    await expectNoAxeViolations(page);
  });
}

test('approvals: Allow once lets the file change through, Deny refuses the command; Stop ends the turn', async ({ page }) => {
  await open(page);
  await toggle(page).click();
  srv.fake.mode('hang');
  try {
    const given = await send(page, 'Write the notes file');
    await expect(status(page)).toHaveText('Status: Working');
    const write = ask(srv.base, given.gate.token, { kind: 'write', op: 'create', path: '/home/someone/project/notes.txt', preview: 'Ship on Monday.' });
    const file = log(page).getByRole('group', { name: 'Approval: Create a file' });
    await expect(status(page)).toHaveText('Status: Waiting for you');
    await file.getByRole('button', { name: 'Allow once' }).click();
    expect(await (await write).json()).toMatchObject({ approved: true, status: 'approved', scope: 'once' });
    await expect(file.locator('.chat-ask-outcome')).toHaveText('Allowed once');
    const command = ask(srv.base, given.gate.token, { kind: 'command', command: 'rm -rf build', risks: [], paths: [] });
    const shell = log(page).getByRole('group', { name: 'Approval: Run a command' });
    await shell.getByRole('button', { name: 'Deny' }).click();
    expect(await (await command).json()).toMatchObject({ approved: false, status: 'denied' });
    await expect(shell.locator('.chat-ask-outcome')).toHaveText('Denied');
    await side(page).getByRole('button', { name: 'Stop' }).click();
    await expect(log(page).locator('.chat-system[data-turn="stopped"]')).toHaveText('Stopped.');
    await expect(status(page)).toHaveText('Status: Stopped');
    await expect(side(page).getByRole('button', { name: 'Stop' })).toBeDisabled();
    await gone(given.pid);
  } finally {
    srv.fake.mode('replay');
  }
});

test('a past version: the composer is shut and says why; back to now, it opens again', async ({ page }) => {
  await open(page);
  await toggle(page).click();
  const version = page.locator(bid('version'));
  const past = await version.locator('option').nth(1).getAttribute('value');
  await version.selectOption(past!);
  await expect(text(page)).toBeDisabled();
  await expect(side(page).locator('.chat-cmp-line')).toHaveText('A past version of the board is showing. Go back to now to send a message.');
  await expect(status(page)).toHaveText('Status: Can\'t send');
  await expect(attached(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to now' }).click();
  await expect(text(page)).toBeEnabled();
  await expect(chips(page)).toHaveCount(0);
});

test('New session asks first; confirmed, the agent starts again and the feed is empty', async ({ page }) => {
  await open(page);
  await toggle(page).click();
  await expect(log(page).locator('chat-message')).not.toHaveCount(0);
  const dialog = page.getByRole('dialog', { name: 'Start a new session?' });
  // A model picked asks too; cancelled, the picker (updated in place, point 387) shows the session's again.
  const model = side(page).getByRole('combobox', { name: 'Model' });
  const was = await model.inputValue();
  await model.selectOption({ label: 'Sonnet 5.5' });
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(model).toHaveValue(was);
  await side(page).getByRole('button', { name: 'New session' }).click();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(log(page).locator('chat-message')).not.toHaveCount(0);
  await side(page).getByRole('button', { name: 'New session' }).click();
  await dialog.getByRole('button', { name: 'New session' }).click();
  await expect(side(page).locator('.chat-empty')).toBeVisible();
  await expect(log(page).locator('chat-message')).toHaveCount(0);
  const { sessions } = await (await page.request.get(`${srv.base}/api/boards/scratch/chats`)).json() as { sessions: unknown[] };
  expect(sessions).toHaveLength(2);
  // The new session answers the next message.
  await send(page, 'Hello again');
  await expect(log(page).locator('chat-message[data-from="agent"]')).toBeVisible();
});

test('a message sent while a new session starts waits for it and goes to the new session (VERIFY_01 bug 1)', async ({ page }) => {
  await open(page);
  await toggle(page).click();
  const release = srv.holdStarts();
  try {
    await side(page).getByRole('button', { name: 'New session' }).click();
    await page.getByRole('dialog', { name: 'Start a new session?' }).getByRole('button', { name: 'New session' }).click();
    await text(page).fill('Are you there?');
    await text(page).press('Enter');
    await page.waitForTimeout(200);
  } finally { release(); }
  const given = await srv.fake.run(++runs);
  const { sessions } = await (await page.request.get(`${srv.base}/api/boards/scratch/chats`)).json() as { sessions: { session: string }[] };
  expect(sessions).toHaveLength(3);
  expect(given.args[5], 'the session the run was for').toBe(sessions[0]!.session);
  await expect(log(page).locator('chat-message[data-from="person"]')).toHaveText([/Are you there\?$/]);
  await expect(log(page).locator('chat-message[data-from="agent"]')).toBeVisible();
  await expect(text(page)).toHaveValue('');
});

test('after a reload the panel attaches to the board\'s newest session and shows its model (VERIFY_01 bug 3)', async ({ page }) => {
  await open(page);
  await toggle(page).click();
  const model = side(page).getByRole('combobox', { name: 'Model' });
  await model.selectOption({ label: 'Sonnet 5.5' });
  await page.getByRole('dialog', { name: 'Start a new session?' }).getByRole('button', { name: 'New session' }).click();
  await expect(side(page).locator('.chat-empty')).toBeVisible();
  await page.reload();
  await expect(side(page)).toBeVisible();
  await expect(model.locator('option:checked')).toHaveText('Sonnet 5.5');
  const given = await send(page, 'Still there?');
  const { sessions } = await (await page.request.get(`${srv.base}/api/boards/scratch/chats`)).json() as { sessions: { session: string }[] };
  expect(given.args[5], 'the session the run was for').toBe(sessions[0]!.session);
  await expect(log(page).locator('chat-message[data-from="agent"]')).toBeVisible();
});

test('at the default width, and the narrowest, the agent and model pickers show their full labels (VERIFY_01 bug 6)', async ({ page }) => {
  await open(page);
  await toggle(page).click();
  expect(await width(page)).toBe(400);
  await fits(page);
  // And at the narrowest the panel goes.
  await side(page).getByRole('separator', { name: 'Chat width' }).focus();
  for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
  expect(await width(page)).toBe(360);
  await fits(page);
});

test('the header draws its pickers once: the session and the folder\'s list arriving update them in place (point 387)', async ({ page }) => {
  await open(page);
  // Every picker that leaves the page from the moment the panel opens, and when (ms after the click).
  await page.evaluate(() => {
    const w = Object.assign(window, { __vbGone: [] as string[], __vbAt: 0 });
    new MutationObserver((rs) => rs.flatMap((r) => [...r.removedNodes]).filter((n) => n instanceof Element)
      .flatMap((n) => [n, ...n.querySelectorAll('*')]).filter((e) => e.matches('[data-pick]'))
      .forEach((s) => w.__vbGone.push(`${(s as HTMLElement).dataset.pick} at ${Math.round(performance.now() - w.__vbAt)} ms`)))
      .observe(document.body, { childList: true, subtree: true });
    document.querySelector('#chat-toggle')?.addEventListener('click', () => { w.__vbAt = performance.now(); }, { capture: true, once: true });
  });
  await toggle(page).click();
  // The folder's list of what was allowed has come (the header is drawn again then).
  await expect(side(page).getByRole('button', { name: /^Allowed for this folder/ })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __vbGone: string[] }).__vbGone)).toEqual([]);
});

/** Each picker in the header is at least as wide as its label needs. */
async function fits(page: Page) {
  for (const name of ['Agent', 'Model']) {
    // A copy of the picker on its own, out of the header's flow, is the width its label needs.
    const [shown, needs] = await side(page).getByRole('combobox', { name }).evaluate((el) => {
      const copy = el.cloneNode(true) as HTMLSelectElement;
      copy.style.position = 'absolute';
      el.closest('chat-header')!.append(copy);
      const w: [number, number] = [el.getBoundingClientRect().width, copy.getBoundingClientRect().width];
      copy.remove();
      return w;
    });
    expect(shown, `${name} picker`).toBeGreaterThanOrEqual(needs - 0.5);
  }
}
