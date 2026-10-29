// "Allow for this folder", and forgetting it (agent-access-and-working ASK_01; agentAccessRules flag, on by
// default): a question inside the board's folder offers four answers (Allow once, for this session, for
// this folder, Deny), one outside three; the folder answer is kept (a second question in a new session is
// not asked); the chat header's "Allowed for this folder" lists each kept yes in words with Forget, which
// asks first and then the agent asks again; the keys alone do all of it. Also the approval with no time
// limit (it waits for the person, approvalHold), a read and a search asked (HOLD_01-R3, WIRE_01-R3), and
// words sent while the agent works (workAlongside, WIRE_01-R2). The gallery's section: every state, axe
// and contrast, light and dark, and its screenshot. The server is chat-server.ts with the agent package's
// fake `claude`, never the real one.
import fs from 'node:fs';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { ask, personCookie } from '#board/testing';
import type { ChatServer } from './chat-server.ts';
import { startChatServer } from './chat-server.ts';
import { lc, pixel, resolved } from './apca.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { card, log, side, text, toggle } from './chat-page.ts';

test.describe.configure({ mode: 'serial' });

let srv: ChatServer;
let folder = '';
let runs = 0;

test.beforeAll(async () => {
  srv = await startChatServer();
  await srv.write('scratch', [
    { type: 'board', key: 'board', title: 'Scratch' }, { type: 'region', key: 'ideas', region: { id: 'ideas', title: 'Ideas', mode: 'grid' } },
    card('q1', 'Ship on Friday?'),
  ]);
  const project = await (await fetch(`${srv.base}/api/project`, { headers: { Cookie: await personCookie(srv.base) } })).json() as { path: string };
  folder = fs.realpathSync(project.path);
});
test.afterAll(async () => { await srv.close(); });

const inside = (rel: string) => ({ kind: 'write', op: 'create', path: path.join(folder, rel), preview: 'Ship on Monday.' });
const outside = { kind: 'write', op: 'create', path: '/home/someone/project/outside.txt', preview: 'Ship on Monday.' };
const approvals = (page: Page) => log(page).locator('chat-approval');
const allowed = (page: Page) => side(page).locator('chat-header').getByRole('button', { name: /^Allowed for this folder/ });
const list = (page: Page) => side(page).getByRole('region', { name: 'Allowed for this folder' });
const forgetting = (page: Page) => page.getByRole('dialog', { name: 'Forget this?' });
const kept = async (page: Page) => (await (await page.request.get(`${srv.base}/api/permissions`)).json() as { permissions: unknown[] }).permissions;

async function open(page: Page, flags = '') {
  await page.goto(`${srv.base}/?vbwork${flags && `&flags=${flags}`}#scratch`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
  if (!(await side(page).isVisible())) await toggle(page).click(); // the panel stays open from a visit before
  await expect(side(page)).toBeVisible();
}

/** With the fake hanging, send `words`: the turn stays open. The fake's run for it. */
async function busy(page: Page, words: string) {
  srv.fake.mode('hang');
  await text(page).fill(words);
  await text(page).press('Enter');
  return srv.fake.run(++runs);
}

/** Leave the board's newest chat idle: the fake replays again and a turn left hanging is stopped. */
async function end(page: Page) {
  srv.fake.mode('replay');
  const { sessions } = await (await page.request.get(`${srv.base}/api/boards/scratch/chats`)).json() as { sessions: { session: string }[] };
  if (sessions[0]) await page.request.post(`${srv.base}/api/chats/${sessions[0].session}/stop`);
}

/** Answer `facts` with "Allow for this folder"; the gate's outcome. */
async function keep(page: Page, token: string, facts: unknown, name: RegExp) {
  const asked = ask(srv.base, token, facts);
  const group = approvals(page).filter({ hasText: name });
  await group.getByRole('button', { name: 'Allow for this folder' }).click();
  return (await asked).json();
}

/** Forget what was kept, through the list, until none is left. */
async function forgetAll(page: Page) {
  if (!(await allowed(page).count())) return;
  if ((await allowed(page).getAttribute('aria-expanded')) !== 'true') await allowed(page).click();
  const forgets = list(page).getByRole('button');
  for (let n = await forgets.count(); n > 0; n--) {
    await forgets.first().click();
    await forgetting(page).getByRole('button', { name: 'Forget' }).click();
    await expect(forgets).toHaveCount(n - 1);
  }
  await expect.poll(() => kept(page)).toEqual([]);
}

test('inside the folder a question offers four answers, outside three; with no time limit it says it waits for the person', async ({ page }) => {
  await open(page);
  try {
    const given = await busy(page, 'Write two files');
    const [here, there] = [ask(srv.base, given.gate.token, inside('src/inside.txt')), ask(srv.base, given.gate.token, outside)];
    const [cardIn, cardOut] = [approvals(page).filter({ hasText: 'inside.txt' }), approvals(page).filter({ hasText: 'outside.txt' })];
    await expect(cardIn.getByRole('button')).toHaveText(['Allow once', 'Allow for this session', 'Allow for this folder', 'Deny']);
    await expect(cardOut.getByRole('button')).toHaveText(['Allow once', 'Allow for this session', 'Deny']);
    await expect(cardIn.locator('.chat-ask-lapse')).toHaveText('Waiting for your answer');
    await expect(cardIn.locator('.chat-ask-ttl')).toHaveText('');
    await expect(cardIn).not.toContainText(/NaN|left|Denied if not answered/);
    await cardIn.getByRole('button', { name: 'Deny' }).click();
    await cardOut.getByRole('button', { name: 'Deny' }).click();
    expect((await (await here).json()).approved).toBe(false);
    expect((await (await there).json()).approved).toBe(false);
    await expect(cardIn.locator('.chat-ask-outcome')).toHaveText('Denied');
  } finally {
    await end(page);
  }
});

test('a read and a search are asked as such, with the scopes the request lists', async ({ page }) => {
  await open(page);
  try {
    const given = await busy(page, 'Look around');
    const [file, folderSearch] = [
      ask(srv.base, given.gate.token, { kind: 'read', path: '/home/someone/notes.txt' }),
      ask(srv.base, given.gate.token, { kind: 'read', path: '/home/someone/project', recursive: true }),
    ];
    const read = side(page).getByRole('group', { name: 'Approval: Read a file' });
    const search = side(page).getByRole('group', { name: 'Approval: Search a folder' });
    await expect(read.locator('.chat-ask-subject')).toHaveText('/home/someone/notes.txt');
    await expect(search.locator('.chat-ask-subject')).toHaveText('/home/someone/project');
    await expect(read.locator('.chat-ask-family')).toHaveText('File read');
    await expect(search.locator('.chat-ask-family')).toHaveText('Folder search');
    await expect(read.getByRole('button')).toHaveText(['Allow once', 'Allow for this session', 'Deny']);
    await read.getByRole('button', { name: 'Allow once' }).click();
    await search.getByRole('button', { name: 'Allow once' }).click();
    expect(await (await file).json()).toMatchObject({ approved: true, scope: 'once' });
    expect(await (await folderSearch).json()).toMatchObject({ approved: true, scope: 'once' });
  } finally {
    await end(page);
  }
});

test('the folder answer is kept: a second question in a new session is not asked; the header lists it; Forget asks first, then it asks again', async ({ page }) => {
  await open(page);
  try {
    await expect(allowed(page)).toBeVisible();
    await expect(allowed(page).locator('.chat-hd-count')).toHaveCount(0);
    const first = await busy(page, 'Write the first file');
    expect(await keep(page, first.gate.token, inside('src/a.txt'), /a\.txt/)).toMatchObject({ approved: true, status: 'approved', scope: 'folder' });
    await expect(approvals(page).filter({ hasText: 'a.txt' }).locator('.chat-ask-outcome')).toHaveText('Allowed for this folder');
    await expect(allowed(page).locator('.chat-hd-count')).toHaveText('1');
    expect(await kept(page)).toHaveLength(1);

    // A new session: the same kind of write inside src/ goes ahead with no card.
    await side(page).getByRole('button', { name: 'New session' }).click();
    await page.getByRole('dialog', { name: 'Start a new session?' }).getByRole('button', { name: 'New session' }).click();
    await expect(side(page).locator('.chat-empty')).toBeVisible();
    const second = await busy(page, 'Write the second file');
    const again = await ask(srv.base, second.gate.token, inside('src/b.txt'));
    expect(await again.json()).toMatchObject({ approved: true, status: 'approved', scope: 'folder' });
    await expect(approvals(page)).toHaveCount(0);
    // Another folder inside the board's folder is another question.
    const elsewhere = ask(srv.base, second.gate.token, inside('docs/c.txt'));
    await expect(approvals(page)).toHaveCount(1);
    await approvals(page).getByRole('button', { name: 'Deny' }).click();
    expect((await (await elsewhere).json()).approved).toBe(false);

    // The list, in words; Cancel keeps it; Forget forgets it, and the next such call asks again.
    await allowed(page).click();
    await expect(allowed(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(list(page).locator('li')).toHaveText(['Write files in src/Forget']);
    await list(page).getByRole('button', { name: 'Forget: Write files in src/' }).click();
    await expect(forgetting(page)).toContainText('The agent will ask again before it does this: Write files in src/.');
    await expect(forgetting(page).getByRole('button', { name: 'Cancel' })).toBeFocused();
    await forgetting(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(list(page).locator('li')).toHaveCount(1);
    expect(await kept(page)).toHaveLength(1);
    await list(page).getByRole('button', { name: 'Forget: Write files in src/' }).click();
    await forgetting(page).getByRole('button', { name: 'Forget' }).click();
    await expect(list(page).locator('.chat-hd-none')).toHaveText('Nothing yet. Choose Allow for this folder when the agent asks.');
    await expect(allowed(page).locator('.chat-hd-count')).toHaveCount(0);
    expect(await kept(page)).toEqual([]);
    const third = ask(srv.base, second.gate.token, inside('src/d.txt'));
    await expect(approvals(page).getByRole('button')).toHaveText(['Allow once', 'Allow for this session', 'Allow for this folder', 'Deny']);
    await approvals(page).getByRole('button', { name: 'Deny' }).click();
    expect((await (await third).json()).approved).toBe(false);
  } finally {
    await end(page);
  }
});

test('keyboard only: answer for the folder, open the list, Forget with the dialog, and focus is never lost', async ({ page }) => {
  await open(page);
  try {
    const given = await busy(page, 'Run the tests');
    const asked = ask(srv.base, given.gate.token, { kind: 'command', command: 'npm test', risks: [], paths: [] });
    const yes = approvals(page).getByRole('button', { name: 'Allow for this folder' });
    await yes.focus();
    await page.keyboard.press('Enter');
    expect(await (await asked).json()).toMatchObject({ approved: true, scope: 'folder' });
    await expect(allowed(page).locator('.chat-hd-count')).toHaveText('1');
    await allowed(page).focus();
    await page.keyboard.press('Enter');
    await expect(list(page)).toBeVisible();
    await expect(list(page).locator('li')).toHaveText(['Run npm testForget']);
    // Esc closes the list and gives focus back to its button.
    await page.keyboard.press('Escape');
    await expect(list(page)).toHaveCount(0);
    await expect(allowed(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    const forget = list(page).getByRole('button', { name: 'Forget: Run npm test' });
    await expect(forget).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(forgetting(page)).toBeVisible();
    await expect(forgetting(page).getByRole('button', { name: 'Cancel' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(forgetting(page)).toHaveCount(0);
    await expect(forget, 'Cancelled: focus is back on Forget').toBeFocused();
    await expect(list(page)).toBeVisible();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(forgetting(page).getByRole('button', { name: 'Forget' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(list(page).locator('.chat-hd-none')).toBeVisible();
    await expect(allowed(page), 'nothing left to forget: focus is on the list\'s button').toBeFocused();
    expect(await kept(page)).toEqual([]);
  } finally {
    await end(page);
  }
});

for (const theme of ['dark', 'light'] as Theme[]) {
  test(`axe passes with a question of four answers and the list open (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await open(page);
    try {
      const given = await busy(page, 'Write a file');
      const asked = ask(srv.base, given.gate.token, inside('src/axe.txt'));
      await expect(approvals(page).getByRole('button', { name: 'Allow for this folder' })).toBeVisible();
      await expectNoAxeViolations(page);
      await approvals(page).getByRole('button', { name: 'Allow for this folder' }).click();
      await asked;
      await allowed(page).click();
      await expect(list(page)).toBeVisible();
      await expectNoAxeViolations(page);
      await forgetAll(page);
    } finally {
      await end(page);
    }
  });
}

test('flag off: the header offers no list, and the question shows the scopes the server lists', async ({ page }) => {
  await open(page, '-agentAccessRules');
  try {
    await expect(side(page).locator('chat-header')).toBeVisible();
    await expect(page.locator('chat-header .chat-hd-allow')).toHaveCount(0);
    const given = await busy(page, 'Write a file');
    const asked = ask(srv.base, given.gate.token, inside('src/off.txt'));
    await expect(approvals(page).getByRole('button', { name: 'Allow once' })).toBeVisible();
    await approvals(page).getByRole('button', { name: 'Deny' }).click();
    await asked;
  } finally {
    await end(page);
  }
});

/** Stop through the API (the chat may be closed); what was queued goes to a run that replays. */
async function stopAndHandOver(page: Page, session: string) {
  srv.fake.mode('replay');
  expect((await page.request.post(`${srv.base}/api/chats/${session}/stop`)).status()).toBe(200);
  return srv.fake.run(++runs);
}

test('words sent while the agent works are queued and go in order (workAlongside); with the flag off they wait for Stop', async ({ page }) => {
  await open(page);
  const line = side(page).locator('.chat-cmp-line');
  const given = await busy(page, 'First');
  try {
    await expect(line).toHaveText('The agent is working. What is attached goes when it finishes; words you send now are queued.');
    await text(page).fill('Second thought');
    await expect(side(page).locator('.chat-cmp-send')).toBeEnabled();
    await text(page).press('Enter');
    await expect(text(page)).toHaveValue('');
    const next = await stopAndHandOver(page, given.args[5]!);
    expect(next.prompt).toContain('Second thought');
    await open(page, '-workAlongside');
    const held = await busy(page, 'Third');
    await expect(line).toHaveText('The agent is working. What is attached goes when it finishes; Stop it to send words alone.');
    await text(page).fill('Fourth');
    await expect(side(page).locator('.chat-cmp-send')).toBeDisabled();
    expect(held.args[5]).toBeTruthy();
  } finally {
    await end(page);
  }
});

/** The APCA Lc of the text colour of `sel` on the background of `on` (another element, or itself). */
async function contrast(page: Page, sel: string | Locator, prop: 'color' | 'background-color' | 'border-top-color', on = sel) {
  const pick = (s: string | Locator) => (typeof s === 'string' ? page.locator(s).first() : s.first());
  const [fg, bg] = await Promise.all([
    pick(sel).evaluate((e, p) => getComputedStyle(e).getPropertyValue(p), prop),
    pick(on).evaluate((e) => getComputedStyle(e).backgroundColor),
  ]);
  return lc(await pixel(page, await resolved(page, fg)), await pixel(page, await resolved(page, bg)));
}

const SAMPLES = ['inside', 'outside', 'once', 'reads', 'kept', 'timed', 'list', 'closed', 'empty'];

for (const theme of ['dark', 'light'] as Theme[]) {
  test(`gallery: every state drawn, axe and contrast pass, and the section matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    const section = page.locator('section[data-feature="folderAccess"]');
    await expect(section).toBeVisible();
    const sample = (state: string) => section.locator(`.g-access-sample[data-state="${state}"]`);
    await expect(section.locator('.g-access-sample')).toHaveCount(SAMPLES.length);
    await expect(sample('inside').locator('chat-approval button')).toHaveText(['Allow once', 'Allow for this session', 'Allow for this folder', 'Deny']);
    await expect(sample('inside').locator('.chat-ask-lapse')).toHaveText('Waiting for your answer');
    await expect(sample('outside').locator('chat-approval button')).toHaveText(['Allow once', 'Allow for this session', 'Deny']);
    await expect(sample('outside').locator('.chat-ask-ttl')).toHaveText('1:52 left');
    await expect(sample('once').locator('chat-approval button')).toHaveText(['Allow once', 'Deny']);
    await expect(sample('reads').getByRole('group')).toHaveCount(2);
    await expect(sample('kept').locator('.chat-ask-outcome')).toHaveText('Allowed for this folder');
    await expect(sample('timed').locator('.chat-ask-ttl')).toHaveText('1:52 left');
    await expect(sample('list').locator('.chat-hd-what')).toHaveText(['Write files in src/', 'Run npm test', 'Read docs/notes.md', 'Search docs/']);
    await expect(sample('list').getByRole('button', { name: /^Forget:/ })).toHaveCount(4);
    await expect(sample('closed').locator('.chat-hd-count')).toHaveText('4');
    await expect(sample('closed').getByRole('region')).toHaveCount(0);
    await expect(sample('empty').locator('.chat-hd-none')).toBeVisible();
    // Reading text 60, the count on its fill 60, the short label 45.
    expect(await contrast(page, sample('list').locator('.chat-hd-what'), 'color', sample('list').locator('.chat-hd-pop'))).toBeGreaterThanOrEqual(60);
    expect(await contrast(page, sample('closed').locator('.chat-hd-count'), 'color')).toBeGreaterThanOrEqual(60);
    expect(await contrast(page, sample('closed').locator('.chat-hd-allow'), 'color', sample('closed').locator('.chat-panel'))).toBeGreaterThanOrEqual(60);
    expect(await contrast(page, sample('list').locator('.chat-hd-pop-h'), 'color', sample('list').locator('.chat-hd-pop'))).toBeGreaterThanOrEqual(45);
    expect(await contrast(page, sample('empty').locator('.chat-hd-none'), 'color', sample('empty').locator('.chat-hd-pop'))).toBeGreaterThanOrEqual(60);
    expect(await contrast(page, sample('kept').locator('.chat-ask-outcome'), 'color', sample('kept').locator('chat-approval'))).toBeGreaterThanOrEqual(45);
    await expectNoAxeViolations(page);
    await expect(section).toHaveScreenshot(`folder-access-${theme}.png`);
  });
}

test('gallery: the section is there only with chatPanel and agentAccessRules on, and the list opens and closes by its button', async ({ page }) => {
  for (const off of ['-chatPanel', '-agentAccessRules']) {
    await page.goto(`/gallery.html?flags=${off}`);
    await expect(page.locator('section[data-pattern]').first()).toBeVisible();
    await expect(page.locator('section[data-feature="folderAccess"]')).toHaveCount(0);
  }
  await page.goto('/gallery.html');
  const closed = page.locator('.g-access-sample[data-state="closed"]');
  const button = closed.getByRole('button', { name: /^Allowed for this folder/ });
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await button.click();
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(closed.getByRole('region', { name: 'Allowed for this folder' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(closed.getByRole('region')).toHaveCount(0);
  await expect(button).toBeFocused();
});
