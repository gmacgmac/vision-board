// The person's side of agent access (D-027, api.md 16, 20, 23-26), behind the agentAccess flag
// (rule 12, on by default): the requests strip with Allow and Refuse, the holders on each frame
// with Remove access and its confirm step, and Send to agent; then the gallery's Agent access
// section. On the worker's roadmap board, fresh for this file (servers.ts).
//
// The fixture ledger is built through the API itself, as agents would build it: a creator agent
// joins and writes board "access" with one container, then each test joins its own agents and
// asks for that container, so a joined agent, open requests and a granted holder are all real
// ledger lines. Agent calls go through `request` (no person cookie: agent routes refuse it);
// person acts the test sets up go through `page.request`, which carries the page's cookie.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { head } from './board-page.ts';
import { joinAgent } from './agent-board.ts';

const BOARD = 'access';
const REGION = 'pricing';
const CONTAINER = 'Pricing thread';
const CREATOR = 'Pricing chat';
const THEMES: Theme[] = ['dark', 'light'];

interface Agent { agent: string; secret: string; label: string }

const bearer = (a: Agent) => ({ Authorization: `Bearer ${a.secret}` });

/** Board "access" with one container, written once by its creator agent. */
async function ensureBoard(request: APIRequestContext): Promise<void> {
  const boards = await (await request.get('/api/boards')).json() as { boards: { board: string }[] };
  if (boards.boards.some((b) => b.board === BOARD)) return;
  const creator = { ...await joinAgent(request, CREATOR), label: CREATOR };
  const r = await request.post(`/api/boards/${BOARD}/write`, {
    headers: bearer(creator),
    data: { items: [
      { type: 'board', title: 'Agent access' },
      { type: 'region', region: { id: REGION, title: CONTAINER, mode: 'grid' } },
      { type: 'node', node: { region: REGION, kind: 'question', title: 'Which annual plans keep the old price?' } },
    ] },
  });
  expect(r.status(), await r.text()).toBe(200);
  expect((await r.json() as { results: { ok: boolean }[] }).results.every((x) => x.ok)).toBe(true);
}

/** A new agent asks for the container; returns it with the request's `seq`. */
async function ask(request: APIRequestContext, label: string, reason = `${label} needs to add items.`): Promise<Agent & { seq: number }> {
  const a = { ...await joinAgent(request, label), label };
  const r = await request.post('/api/grants', { headers: bearer(a), data: { board: BOARD, region: REGION, reason } });
  expect(r.status(), await r.text()).toBe(201);
  return { ...a, seq: (await r.json() as { request: number }).request };
}

/** The person grants a request (setup only; the page's own Allow is under test elsewhere). */
async function grant(page: Page, seq: number): Promise<void> {
  const r = await page.request.post(`/api/boards/${BOARD}/act`, { data: { type: 'act', action: 'grant', request: seq } });
  expect(r.status(), await r.text()).toBe(201);
}

interface Holder { agent: string; label: string; creator?: true }
const holdersNow = async (page: Page): Promise<Holder[]> =>
  ((await (await page.request.get(`/api/boards/${BOARD}`)).json()) as { holders?: Record<string, Holder[]> }).holders?.[REGION] ?? [];
/** Take back every holder but the creator (setup): earlier tests leave theirs granted, and on this
 * one-card frame a holder with no room on the line is out of sight (FIX_48), so a test that points at
 * its holder starts from the creator alone. */
async function revokeOthers(page: Page): Promise<void> {
  for (const h of (await holdersNow(page)).filter((x) => !x.creator)) {
    const r = await page.request.post(`/api/boards/${BOARD}/act`, { data: { type: 'act', action: 'revoke', board: BOARD, region: REGION, holder: h.agent } });
    expect(r.status(), await r.text()).toBe(201);
  }
}
const openRequests = async (page: Page): Promise<number[]> =>
  (((await (await page.request.get(`/api/boards/${BOARD}`)).json()) as { requests?: { seq: number }[] }).requests ?? []).map((r) => r.seq);

/** The board's ledger lines after `after`, through read_ledger. */
async function ledgerAfter(page: Page, after: number) {
  const r = await page.request.get(`/api/ledger?board=${BOARD}&after=${after}`);
  return (await r.json() as { events: Record<string, unknown>[]; head: number }).events;
}

const strip = (page: Page) => page.getByRole('region', { name: /asks? for access/ });
const row = (page: Page, label: string) => page.locator('.vb-access-row').filter({ hasText: `${label} asks to write in` });
const frame = (page: Page) => page.locator(`vb-region[data-region="${REGION}"]`);
const holderButton = (page: Page, label: string) => frame(page).getByRole('button', { name: `${label}: remove access` });

/** Open board "access" and wait until it has drawn. */
async function openAccess(page: Page, query = ''): Promise<void> {
  await page.goto(`/${query}#${BOARD}`);
  await expect(page.locator('vb-node')).toHaveCount(1);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
}

/** Zoom in to 250% (the + key), where the one-card frame's line has room for two holders: a holder
 * with no room leaves the line whole (FIX_48), so at the opening zoom only the title and count show. */
async function zoomToHolders(page: Page): Promise<void> {
  const percent = () => page.locator('.vb-world').evaluate((e) => Math.round(new DOMMatrix(getComputedStyle(e).transform).a * 100));
  for (let i = 0; i < 30 && (await percent()) < 250; i += 1) await page.keyboard.press('+');
  await expect.poll(percent).toBe(250);
}

/** Press Tab until `target` has focus, as a keyboard user would; fails after `max` presses. */
async function tabTo(page: Page, target: Locator, max = 80): Promise<void> {
  for (let i = 0; i < max; i += 1) {
    if (await target.evaluate((e) => e === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached ${String(target)}`);
}

test.beforeEach(async ({ page, request }) => {
  // The page first, so page.request carries the person cookie for setup acts. A query of its
  // own, so the test's later goto to /#access is a real load, not a same-page hash change.
  await page.goto('/?setup');
  await ensureBoard(request);
});

test('flag off: no Send, no requests strip and no holders', async ({ page, request }) => {
  const a = await ask(request, 'Hidden chat');
  await openAccess(page, '?flags=-agentAccess');
  await expect(page.locator('.vb-send')).toHaveCount(0);
  await expect(page.locator('.vb-access')).toHaveCount(0);
  await expect(frame(page).locator('.vb-holder')).toHaveCount(0);
  await grant(page, a.seq); // leave nothing open for the tests below
});

test('Allow removes the request and adds the holder', async ({ page, request }) => {
  const a = await ask(request, 'Docs chat', 'I keep the help pages in step with the prices.');
  await openAccess(page);
  await expect(strip(page)).toBeVisible();
  await expect(row(page, 'Docs chat')).toContainText(`Docs chat asks to write in ${CONTAINER}`);
  await expect(row(page, 'Docs chat')).toContainText('I keep the help pages in step with the prices.');
  // The creator shows as plain text with no remove control.
  await expect(frame(page).locator('.vb-holder', { hasText: CREATOR })).toBeVisible();
  await expect(frame(page).getByRole('button', { name: `${CREATOR}: remove access` })).toHaveCount(0);
  await row(page, 'Docs chat').getByRole('button', { name: `Allow Docs chat to write in ${CONTAINER}` }).click();
  await expect(row(page, 'Docs chat')).toHaveCount(0);
  await expect(holderButton(page, 'Docs chat')).toBeVisible();
  await expect(page.locator('#toast')).toHaveText(`Docs chat can now write in ${CONTAINER}`);
  expect((await holdersNow(page)).map((h) => h.agent)).toContain(a.agent);
  expect(await openRequests(page)).not.toContain(a.seq);
});

test('Refuse with a note sends deny with the note; the request goes and no holder is added', async ({ page, request }) => {
  const a = await ask(request, 'Support chat');
  const before = await head(page);
  await openAccess(page);
  await row(page, 'Support chat').getByRole('button', { name: 'Refuse Support chat' }).click();
  const note = page.getByLabel('Note for Support chat (optional)');
  await expect(note).toBeFocused();
  await note.fill('Not this thread; ask in the support board.');
  await row(page, 'Support chat').getByRole('button', { name: 'Refuse Support chat' }).click();
  await expect(row(page, 'Support chat')).toHaveCount(0);
  await expect(page.locator('#toast')).toHaveText('Refused Support chat');
  const deny = (await ledgerAfter(page, before)).find((e) => e.action === 'deny');
  expect(deny).toMatchObject({ type: 'act', by: 'person', request: a.seq, text: 'Not this thread; ask in the support board.' });
  expect((await holdersNow(page)).map((h) => h.agent)).not.toContain(a.agent);
});

test('a request for the whole board: Allow lists the agent under Agents, and Remove access takes the board back (D-034)', async ({ page, request }) => {
  const a = { ...await joinAgent(request, 'Roadmap chat'), label: 'Roadmap chat' };
  const asked = await request.post('/api/grants', { headers: bearer(a), data: { board: BOARD, reason: 'I add the roadmap items.' } });
  expect(asked.status(), await asked.text()).toBe(201);
  const before = await head(page);
  await openAccess(page);
  const ask = page.locator('.vb-access-row').filter({ hasText: 'Roadmap chat wants to draw on this board' });
  await expect(ask).toContainText('I add the roadmap items.');
  await ask.getByRole('button', { name: 'Allow Roadmap chat to draw on this board' }).click();
  await expect(ask).toHaveCount(0);
  await expect(page.locator('#toast')).toHaveText('Roadmap chat can now draw on this board');
  const agents = page.locator('.vb-toolbar .vb-agents');
  await agents.locator('summary').click();
  await expect(agents.locator('.vb-agents-row').first()).toHaveText(new RegExp(`${CREATOR}\\s*made this board`));
  await agents.getByRole('button', { name: "Remove Roadmap chat's access to this board" }).click();
  const dialog = page.getByRole('dialog', { name: "Remove Roadmap chat's access?" });
  await expect(dialog).toContainText('Roadmap chat will no longer be able to draw on this board');
  await dialog.getByRole('button', { name: 'Remove access' }).click();
  await expect(page.locator('#toast')).toHaveText('Roadmap chat can no longer draw on this board');
  await expect(agents.locator('.vb-agents-row', { hasText: 'Roadmap chat' })).toHaveCount(0);
  expect((await ledgerAfter(page, before)).filter((e) => e.type === 'act').map((e) => [e.action, e.region])).toEqual([
    ['grant', undefined], ['revoke', undefined],
  ]);
});

// ---- The gallery's Agent access section ----

const section = (page: Page) => page.locator('section[data-feature="agentAccess"]');

test('gallery: the Agent access section shows by default and not with -agentAccess', async ({ page }) => {
  await page.goto('/gallery.html?flags=-agentAccess');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  await expect(section(page)).toBeVisible();
});

test('gallery: three requests (one for the board) with one refusing note open, the Agents list, frames with two holders, and every Send state', async ({ page }) => {
  await page.goto('/gallery.html');
  const s = section(page);
  await expect(s.locator('.vb-access-row')).toHaveCount(3);
  await expect(s.getByRole('region', { name: '3 agents ask for access' })).toBeVisible();
  await expect(s.locator('.vb-access-note')).toHaveCount(1);
  await expect(s.getByLabel('Note for Launch plan chat (optional)')).toBeVisible();
  await expect(s.locator('.vb-access-row').nth(2)).toContainText('Support chat wants to draw on this board');
  await expect(s.getByRole('button', { name: 'Allow Support chat to draw on this board' })).toBeVisible();
  const agents = s.locator('.vb-agents');
  await expect(agents.locator('.vb-agents-row')).toHaveText([/Pricing chat\s*made this board/, /Docs chat\s*Remove access/]);
  await expect(agents.getByRole('button', { name: "Remove Docs chat's access to this board" })).toBeVisible();
  await expect(s.locator('vb-region')).toHaveCount(2);
  for (const f of await s.locator('vb-region').all()) {
    await expect(f.locator('.vb-region-count')).toHaveAttribute('title', '0 of 1 answered');
    await expect(f.locator('.vb-holder')).toHaveCount(2);
    await expect(f.locator('span.vb-holder', { hasText: 'Pricing chat' })).toBeVisible();
    await expect(f.getByRole('button', { name: 'Docs chat: remove access' })).toBeVisible();
  }
  await expect(s.locator('vb-region[data-region="held-hover"] .vb-holder-remove')).toBeVisible();
  await expect(s.locator('vb-region[data-region="held"] .vb-holder-remove')).toBeHidden();
  const states = await s.locator('.vb-send').evaluateAll((els) => els.map((e) => `${e.getAttribute('data-state')}/${e.getAttribute('data-look') ?? ''}`));
  expect(states).toEqual(['idle/', 'idle/hover', 'idle/focus', 'idle/pressed', 'sending/', 'sent/', 'error/', 'waiting/', 'disabled/']);
  await expect(s.locator('.vb-send[data-state="disabled"]')).toHaveAttribute('aria-disabled', 'true');
  await expect(s.locator('.vb-send[data-state="disabled"]')).toHaveAttribute('title', 'Nothing new to send');
  await expect(s.locator('.vb-send[data-state="waiting"]')).toHaveText('Waiting for agent');
  await expect(s.locator('.vb-send[data-state="waiting"]')).not.toHaveAttribute('aria-disabled', 'true');
  await expect(s.locator('.vb-send[data-state="sending"] .vb-spinner')).toBeVisible();
  await expect(s.locator('.vb-send[data-state="sending"]')).toHaveAttribute('aria-disabled', 'true');
  await expect(s.locator('#send')).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`gallery: Agent access passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`agent-access-${theme}.png`);
  });
}

// ---- Keyboard only ----

test('keyboard: Tab reaches Allow, and Enter allows', async ({ page, request }) => {
  const a = await ask(request, 'Keys allow chat');
  await openAccess(page);
  await tabTo(page, row(page, 'Keys allow chat').getByRole('button', { name: /^Allow Keys allow chat/ }));
  await page.keyboard.press('Enter');
  await expect(row(page, 'Keys allow chat')).toHaveCount(0);
  await expect(holderButton(page, 'Keys allow chat')).toBeVisible();
  // Focus lands on the board, not on the page body, once the strip is gone.
  await expect(page.locator('#stage')).toBeFocused();
  expect((await holdersNow(page)).map((h) => h.agent)).toContain(a.agent);
});

test('keyboard: Refuse opens the note, Esc closes it, Enter sends deny with the note', async ({ page, request }) => {
  const a = await ask(request, 'Keys refuse chat');
  const before = await head(page);
  await openAccess(page);
  const refuse = row(page, 'Keys refuse chat').getByRole('button', { name: 'Refuse Keys refuse chat' });
  await tabTo(page, refuse);
  await page.keyboard.press('Enter');
  const note = page.getByLabel('Note for Keys refuse chat (optional)');
  await expect(note).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(note).toHaveCount(0);
  await expect(refuse).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.type('Wrong container.');
  await page.keyboard.press('Enter');
  await expect(row(page, 'Keys refuse chat')).toHaveCount(0);
  const deny = (await ledgerAfter(page, before)).find((e) => e.action === 'deny');
  expect(deny).toMatchObject({ request: a.seq, text: 'Wrong container.' });
});

test('keyboard: focus on a holder shows Remove access; Enter, then Tab to confirm, removes it', async ({ page, request }) => {
  const a = await ask(request, 'Keys revoke chat');
  await grant(page, a.seq);
  await openAccess(page);
  const holder = holderButton(page, 'Keys revoke chat');
  await tabTo(page, holder);
  await expect(holder.locator('.vb-holder-remove')).toBeVisible();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: "Remove Keys revoke chat's access?" });
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Remove access' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(holder).toHaveCount(0);
  expect((await holdersNow(page)).map((h) => h.agent)).not.toContain(a.agent);
});

/** The person answers on the board (setup): a note on its one card, so Send has something to send
 * (field report batch 1, ruling 1). */
async function answer(page: Page): Promise<void> {
  const b = await (await page.request.get(`/api/boards/${BOARD}`)).json() as { view: { nodes: { id: string }[] }; versions: Record<string, number> };
  const id = b.view.nodes[0]!.id;
  const r = await page.request.post(`/api/boards/${BOARD}/act`, { data: { type: 'act', action: 'comment', n: Number(id), ver: b.versions[id], text: 'Which plans?' } });
  expect(r.status(), await r.text()).toBe(201);
}

test('keyboard: Tab reaches Send to agent, and Enter sends', async ({ page }) => {
  await answer(page);
  const before = await head(page);
  await openAccess(page);
  await tabTo(page, page.locator('#send'));
  await page.keyboard.press('Enter');
  await expect(page.locator('#send')).toHaveAttribute('data-state', 'sent');
  await expect(page.locator('#send')).toBeFocused();
  expect((await ledgerAfter(page, before)).filter((e) => e.type === 'act')).toEqual([expect.objectContaining({ action: 'send', board: BOARD })]);
});

for (const theme of THEMES) {
  test(`axe passes on the board with the strip, a refusing note and holders (${theme})`, async ({ page, request }) => {
    // No known failure: the holders show whole or not at all (FIX_48), so none narrows under 24px
    // (target-size, once excused here: 2d_FE_01 Open item 3).
    await revokeOthers(page);
    const a = await ask(request, `Axe ${theme} chat`);
    const b = await ask(request, `Axe ${theme} holder`);
    await grant(page, b.seq);
    await setTheme(page, theme);
    await openAccess(page);
    await expectNoAxeViolations(page);
    await zoomToHolders(page);
    await row(page, `Axe ${theme} chat`).getByRole('button', { name: `Refuse Axe ${theme} chat` }).click();
    await holderButton(page, `Axe ${theme} holder`).hover();
    await expectNoAxeViolations(page);
    await grant(page, a.seq);
    // Take both back (3_FE_04), so the light run and the tests after it start from fewer holders: a
    // holder with no room on this one-card frame's line is out of sight (FIX_48).
    for (const x of [a, b]) {
      const r = await page.request.post(`/api/boards/${BOARD}/act`, { data: { type: 'act', action: 'revoke', board: BOARD, region: REGION, holder: x.agent } });
      expect(r.status(), await r.text()).toBe(201);
    }
  });
}

test('Remove access shows on hover, asks to confirm, and Cancel keeps the holder', async ({ page, request }) => {
  await revokeOthers(page);
  const a = await ask(request, 'Launch chat');
  await grant(page, a.seq);
  const before = await head(page);
  await openAccess(page);
  await zoomToHolders(page);
  const holder = holderButton(page, 'Launch chat');
  await expect(holder.locator('.vb-holder-remove')).toBeHidden();
  await holder.hover();
  await expect(holder.locator('.vb-holder-remove')).toBeVisible();
  await expect(holder.locator('.vb-holder-remove')).toHaveText('Remove access');
  await holder.click();
  const dialog = page.getByRole('dialog', { name: "Remove Launch chat's access?" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(`Launch chat will no longer be able to write in ${CONTAINER}`);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();
  await expect(holder).toBeVisible();
  // Nothing recorded but the board seen that opening the board sends (awareness tables FE_01).
  expect((await ledgerAfter(page, before)).filter((e) => e.type !== 'seen')).toEqual([]);
  await holder.click();
  await dialog.getByRole('button', { name: 'Remove access' }).click();
  await expect(holder).toHaveCount(0);
  await expect(page.locator('#toast')).toHaveText(`Launch chat can no longer write in ${CONTAINER}`);
  const revoke = (await ledgerAfter(page, before)).find((e) => e.action === 'revoke');
  expect(revoke).toMatchObject({ type: 'act', by: 'person', holder: a.agent, board: BOARD, region: REGION });
  expect((await holdersNow(page)).map((h) => h.agent)).not.toContain(a.agent);
});

test('Send records a send act on the board, read back through read_ledger', async ({ page }) => {
  await answer(page);
  const before = await head(page);
  await openAccess(page);
  const send = page.getByRole('button', { name: 'Send to agent' });
  await expect(send).toBeVisible();
  await send.click();
  await expect(page.locator('#send')).toHaveAttribute('data-state', 'sent');
  await expect(page.locator('#send')).toHaveText(/Sent/);
  await expect(page.getByRole('status').filter({ hasText: 'Sent to the agent' })).toHaveCount(1);
  const lines = (await ledgerAfter(page, before)).filter((e) => e.type === 'act');
  expect(lines).toEqual([expect.objectContaining({ type: 'act', action: 'send', board: BOARD, by: 'person' })]);
  // "Sent" is brief; then nothing is new, so the button is disabled until the next answer.
  await expect(page.locator('#send')).toHaveAttribute('data-state', 'disabled', { timeout: 5000 });
});

test('a request that arrives while the page is open shows in the strip and is announced', async ({ page, request }) => {
  await openAccess(page);
  await expect(page.locator('.vb-access')).toHaveCount(0);
  const a = await ask(request, 'Late chat');
  await expect(row(page, 'Late chat')).toBeVisible();
  await expect(page.locator('#board-request-0-announce')).toHaveText(`Late chat asks to write in ${CONTAINER}`);
  await grant(page, a.seq);
  await expect(page.locator('.vb-access')).toHaveCount(0);
});

test('the strip moves the board down instead of covering it, and back when it goes', async ({ page, request }) => {
  const a = await ask(request, 'Layout chat');
  await openAccess(page);
  const stageTop = () => page.locator('#stage').evaluate((e) => e.getBoundingClientRect().top);
  const stripBottom = await strip(page).evaluate((e) => e.getBoundingClientRect().bottom);
  expect(await stageTop()).toBeCloseTo(stripBottom, 0);
  await grant(page, a.seq);
  await expect(page.locator('.vb-access')).toHaveCount(0);
  const toolbarBottom = await page.locator('.vb-toolbar').evaluate((e) => e.getBoundingClientRect().bottom);
  await expect.poll(stageTop).toBeCloseTo(toolbarBottom, 0);
});
