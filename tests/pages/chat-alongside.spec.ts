// Working alongside the agent (workAlongside flag, point 328; WORK_01): while the chat's agent works the
// Chat button says so ("Agent working"), and "Waiting for your OK" while a question is open (said
// politely); the board takes clicks meanwhile; Send to agent is queued and the answers given until the
// turn ends go with it; a reply that lands with the chat closed or scrolled away shows a count on the
// Chat button and a polite toast whose Open chat shows the chat at it, which clears the count, as does
// scrolling back to the latest; flag off, none of it. The gallery's section: every state, axe, contrast
// and its screenshot, light and dark. The server is chat-server.ts with the agent package's fake
// `claude` (replaying a recorded turn, or hanging so a turn stays open), never the real one.
import type { Page } from '@playwright/test';
import { ask } from '#board/testing';
import type { ChatServer } from './chat-server.ts';
import { startChatServer } from './chat-server.ts';
import { lc, pixel, resolved } from './apca.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { card, log, sendButton, side, text, toggle } from './chat-page.ts';

test.describe.configure({ mode: 'serial' });

let srv: ChatServer;
let runs = 0;

// The board is drawn by the chat session's own agent (a chat in the empty folder first), so the answers
// on it are that agent's to be told (api.md 41) and go with what the person sends.
test.beforeAll(async ({ browser }) => {
  srv = await startChatServer();
  const page = await browser.newPage();
  await page.goto(`${srv.base}/?vbwork`);
  await toggle(page).click();
  await text(page).fill('Draw a board');
  await text(page).press('Enter');
  const given = await srv.fake.run(++runs);
  await srv.write('scratch', [
    { type: 'board', key: 'board', title: 'Scratch' }, { type: 'region', key: 'ideas', region: { id: 'ideas', title: 'Ideas', mode: 'grid' } },
    card('q1', 'Ship on Friday?'), card('q2', 'Add dark mode?'), card('q3', 'Keep the beta?'), card('q4', 'Write the notes?'),
  ], given.mcpConfig.mcpServers['vision-board']!.env.VB_AGENT_SECRET!);
  await expect(page.locator('vb-node')).toHaveCount(4);
  await page.close();
});
test.afterAll(async () => { await srv.close(); });

const mark = (page: Page) => toggle(page).locator('.vb-chat-mark');
const news = (page: Page) => toggle(page).locator('.vb-chat-news');
const toast = (page: Page) => page.locator('#toast-news');
const replies = (page: Page) => log(page).locator('chat-message[data-from="agent"]');
const ack = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"] button[data-act="ack"]`);

/** Open the board (the flags as given), with the chat closed, and wait for its first draw. */
async function open(page: Page, flags = '') {
  await page.goto(`${srv.base}/?vbwork${flags && `&flags=${flags}`}#scratch`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
}

/** With the chat open, send `words` with the fake hanging: the turn stays open. The fake's run for it. */
async function busy(page: Page, words: string) {
  if (!(await side(page).isVisible())) await toggle(page).click();
  srv.fake.mode('hang');
  await text(page).fill(words);
  await text(page).press('Enter');
  return srv.fake.run(++runs);
}

/** End the hanging turn by Stop through the API (the chat may be closed); what was queued goes to a run that replays. */
async function stopAndHandOver(page: Page, session: string) {
  srv.fake.mode('replay');
  expect((await page.request.post(`${srv.base}/api/chats/${session}/stop`)).status()).toBe(200);
  return srv.fake.run(++runs);
}

test('while the agent works the Chat button says so, and "Waiting for your OK" while it asks; the board takes clicks meanwhile', async ({ page }) => {
  await open(page);
  await expect(mark(page)).toHaveCount(0);
  try {
    const given = await busy(page, 'Think it over');
    await toggle(page).click();
    await expect(side(page)).toBeHidden();
    await expect(mark(page)).toHaveText('Agent working');
    await expect(toggle(page)).toHaveAttribute('data-work', 'working');
    await ack(page, 1).click();
    await expect(page.locator('vb-node[data-id="1"]')).toHaveAttribute('data-status', 'acknowledged');
    const write = ask(srv.base, given.gate.token, { kind: 'write', op: 'create', path: 'notes.txt', preview: 'Ship on Monday.' });
    await expect(mark(page)).toHaveText('Waiting for your OK');
    await expect(toggle(page)).toHaveAttribute('data-work', 'asking');
    await expect(page.getByRole('status').filter({ hasText: 'The agent is waiting for your OK in the chat.' })).toHaveCount(1);
    await expectNoAxeViolations(page);
    await toggle(page).click();
    await side(page).getByRole('group', { name: 'Approval: Create a file' }).getByRole('button', { name: 'Allow once' }).click();
    expect((await (await write).json()).approved).toBe(true);
    await expect(mark(page)).toHaveText('Agent working');
    await side(page).getByRole('button', { name: 'Stop' }).click();
    await expect(mark(page)).toHaveCount(0);
    await expect(toggle(page)).not.toHaveAttribute('data-work');
  } finally {
    srv.fake.mode('replay');
  }
});

test('Send while the agent works is queued with the answers given meanwhile; the reply lands out of sight: a count, a polite toast, and Open chat shows it', async ({ page }) => {
  await open(page);
  try {
    const given = await busy(page, 'Look at the board');
    await toggle(page).click();
    await ack(page, 2).click();
    await sendButton(page).click();
    await expect(sendButton(page)).toHaveAttribute('data-state', 'waiting');
    await expect(sendButton(page)).toHaveText('Queued');
    await expect(sendButton(page)).toHaveAttribute('title', 'Queued: it goes to the agent when it finishes this turn, with every answer you give until then');
    // Still working on the board: this answer goes with the queued one.
    await ack(page, 3).click();
    await expect(page.locator('vb-node[data-id="3"]')).toHaveAttribute('data-status', 'acknowledged');
    const next = await stopAndHandOver(page, given.args[5]!);
    expect(next.prompt).toContain('2 (question): ✓');
    expect(next.prompt).toContain('3 (question): ✓');
    await expect(news(page)).toHaveText('1 new');
    await expect(toast(page)).toContainText('The agent replied');
    await expect(page.locator('.vb-toast-news')).toHaveAttribute('role', 'status');
    await expect(page.locator('#toast')).toBeHidden();
    await expectNoAxeViolations(page);
    await toast(page).getByRole('button', { name: 'Open chat' }).click();
    await expect(side(page)).toBeVisible();
    await expect(toast(page)).toHaveCount(0);
    await expect(news(page)).toHaveCount(0);
    await expect(replies(page).last()).toBeInViewport();
    await expect(text(page), 'focus goes on in the chat, not lost with the toast').toBeFocused();
  } finally {
    srv.fake.mode('replay');
  }
});

test('the Chat button opens the chat at a reply not seen; scrolled away, a reply counts until the person is back at the latest', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 460 });
  await open(page);
  try {
    // Closed: a reply counts; the Chat button opens the chat at it and the count clears.
    let given = await busy(page, 'One more look');
    await toggle(page).click();
    await ack(page, 4).click();
    await sendButton(page).click();
    await stopAndHandOver(page, given.args[5]!);
    await expect(news(page)).toHaveText('1 new');
    await toggle(page).click();
    await expect(news(page)).toHaveCount(0);
    await expect(replies(page).last()).toBeInViewport();
    // Open but scrolled away from the latest: a reply counts too.
    // (Sending follows the latest again, so the person scrolls away after Send.)
    given = await busy(page, 'And again');
    await srv.act('scratch', { action: 'comment', n: 1, ver: 1, text: 'One more thing' });
    await sendButton(page).click();
    await expect(sendButton(page)).toHaveText('Queued');
    await expect.poll(() => log(page).evaluate((el) => el.scrollHeight - el.clientHeight)).toBeGreaterThan(100);
    await log(page).hover();
    await page.mouse.wheel(0, -2000);
    await expect(side(page).getByRole('button', { name: 'Jump to latest' })).toBeVisible();
    await stopAndHandOver(page, given.args[5]!);
    await expect(news(page)).toHaveText('1 new');
    await expect(toast(page)).toBeVisible();
    await toast(page).getByRole('button', { name: 'Open chat' }).click();
    await expect(news(page)).toHaveCount(0);
    await expect(side(page).getByRole('button', { name: 'Jump to latest' })).toBeHidden();
    await expect(text(page)).toBeFocused();
    // Scrolled away again, a reply counts until the person scrolls back to the latest.
    given = await busy(page, 'Last one');
    await srv.act('scratch', { action: 'comment', n: 2, ver: 1, text: 'And this' });
    await sendButton(page).click();
    await log(page).hover();
    await page.mouse.wheel(0, -2000);
    await expect(side(page).getByRole('button', { name: 'Jump to latest' })).toBeVisible();
    await stopAndHandOver(page, given.args[5]!);
    await expect(news(page)).toHaveText('1 new');
    await page.mouse.wheel(0, 4000);
    await expect(news(page)).toHaveCount(0);
  } finally {
    srv.fake.mode('replay');
  }
});

test('flag off: no mark, no count and no toast, and Send waits as before', async ({ page }) => {
  await open(page, '-workAlongside');
  try {
    const given = await busy(page, 'Without the flag');
    await toggle(page).click();
    await expect(toggle(page)).not.toHaveAttribute('data-work');
    await expect(mark(page)).toHaveCount(0);
    await srv.act('scratch', { action: 'comment', n: 2, ver: 1, text: 'Flag off' });
    await sendButton(page).click();
    await expect(sendButton(page)).toHaveText('Waiting for agent');
    await stopAndHandOver(page, given.args[5]!);
    await expect(sendButton(page)).not.toHaveAttribute('data-state', 'waiting');
    await expect(news(page)).toHaveCount(0);
    await expect(toast(page)).toHaveCount(0);
  } finally {
    srv.fake.mode('replay');
  }
});

/** The APCA Lc of the text colour of `sel` on the background of `on` (another element, or itself). */
async function contrast(page: Page, sel: string, prop: 'color' | 'background-color' | 'border-top-color', on = sel) {
  const [fg, bg] = await page.evaluate(([s, p, o]) => [
    getComputedStyle(document.querySelector(s!)!).getPropertyValue(p!), getComputedStyle(document.querySelector(o!)!).backgroundColor,
  ], [sel, prop, on]);
  return lc(await pixel(page, await resolved(page, fg!)), await pixel(page, await resolved(page, bg!)));
}

for (const theme of ['dark', 'light'] as Theme[]) {
  test(`gallery: every state drawn, axe and contrast pass, and the section matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    const section = page.locator('section[data-feature="workAlongside"]');
    await expect(section).toBeVisible();
    const sel = (state: string, narrow = false) => `section[data-feature="workAlongside"] .g-group:nth-of-type(${narrow ? 2 : 1}) .g-row[data-state="${state}"]`;
    await expect(section.locator('.vb-chat-mark-word')).toHaveText(['Agent working', 'Waiting for your OK', 'Agent working', 'Agent working', 'Waiting for your OK', 'Agent working']);
    await expect(section.locator('.vb-chat-news')).toHaveText(['1 new', '2 new', '1 new', '2 new']);
    await expect(section.locator('.vb-send')).toHaveText('Queued');
    await expect(section.locator('.vb-toast')).toContainText(['The agent replied']);
    await expect(section.locator('[data-narrow] .vb-chat-mark-word').first()).toHaveCSS('position', 'absolute');
    // Reading text 60, the count on its fill 60, the dots and the asking edge 30 (decoration).
    expect(await contrast(page, `${sel('working-0')} .vb-chat-mark-word`, 'color', `${sel('working-0')} .vb-chat-btn`)).toBeGreaterThanOrEqual(60);
    expect(await contrast(page, `${sel('idle-1')} .vb-chat-news`, 'color')).toBeGreaterThanOrEqual(60);
    expect(await contrast(page, `${sel('working-0')} .vb-chat-dot`, 'background-color', `${sel('working-0')} .vb-chat-btn`)).toBeGreaterThanOrEqual(30);
    expect(await contrast(page, `${sel('asking-0')} .vb-chat-dot`, 'background-color', `${sel('asking-0')} .vb-chat-btn`)).toBeGreaterThanOrEqual(30);
    expect(await contrast(page, `${sel('asking-0')} .vb-chat-btn`, 'border-top-color', '.g-alongside')).toBeGreaterThanOrEqual(30);
    expect(await contrast(page, '.g-alongside-toast .vb-toast-act', 'color', '.g-alongside-toast .vb-toast')).toBeGreaterThanOrEqual(60);
    await expectNoAxeViolations(page);
    await expect(section).toHaveScreenshot(`alongside-${theme}.png`);
  });
}
