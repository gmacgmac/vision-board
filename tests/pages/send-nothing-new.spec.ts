// Send to agent with nothing new to send (field report batch 1, ruling 1; tracker N33): while the
// person has not answered on the open board since its last Send (conditions `board.unsent`), Send
// is quiet, aria-disabled with the reason "Nothing new to send" (its title, so its description),
// still focusable, and neither a click nor Enter records anything. An answer (here ✓, a note on a
// container) enables it, live; arranging the board alone (a size) does not. Keyboard only, and axe
// light and dark in both states.
//
// Each test draws its own board through the API, as an agent would; the person's setup acts go
// through `page.request`, which carries the page's cookie.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['dark', 'light'];
const NOTHING = 'Nothing new to send';

interface Drawn { board: string; n: number }
let boards = 0;

/** A board of its own with one question, drawn by a new agent. */
async function draw(request: APIRequestContext): Promise<Drawn> {
  const joined = await request.post('/api/agents', { data: { label: 'Send chat' } });
  expect(joined.status(), await joined.text()).toBe(201);
  const { secret } = await joined.json() as { secret: string };
  const board = `nothing-new-${Date.now()}-${(boards += 1)}`;
  const r = await request.post(`/api/boards/${board}/write`, {
    headers: { Authorization: `Bearer ${secret}` },
    data: { items: [
      { type: 'board', title: 'Nothing new' },
      { type: 'region', region: { id: 'p', title: 'Pricing thread', mode: 'grid' } },
      { type: 'node', node: { region: 'p', kind: 'question', title: 'Keep the annual price?' } },
    ] },
  });
  expect(r.status(), await r.text()).toBe(200);
  const results = (await r.json() as { results: { ok: boolean; n?: number }[] }).results;
  expect(results.every((x) => x.ok)).toBe(true);
  return { board, n: results[2]!.n! };
}

/** The person acts on the board (setup), through the page's cookie. */
async function act(page: Page, d: Drawn, fields: object): Promise<void> {
  const r = await page.request.post(`/api/boards/${d.board}/act`, { data: { type: 'act', ...fields } });
  expect(r.status(), await r.text()).toBe(201);
}

/** The board's ledger lines after `after`, as the page's reads give them. */
async function linesAfter(page: Page, d: Drawn, after: number): Promise<{ type: string; action?: string }[]> {
  const r = await page.request.get(`/api/ledger?board=${d.board}&after=${after}`);
  return (await r.json() as { events: { type: string; action?: string }[] }).events;
}
const head = async (page: Page) => ((await (await page.request.get('/api/boards')).json()) as { head: number }).head;

/** Open the board and wait until it has drawn. */
async function open(page: Page, d: Drawn): Promise<void> {
  await page.goto(`/#${d.board}`);
  await expect(page.locator('vb-node')).toHaveCount(1);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
}

/** Press Tab until `target` has focus, as a keyboard user would; fails after `max` presses. */
async function tabTo(page: Page, target: Locator, max = 60): Promise<void> {
  for (let i = 0; i < max; i += 1) {
    if (await target.evaluate((e) => e === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached ${String(target)}`);
}

const send = (page: Page) => page.locator('#send');

/** Send is disabled with its reason, and still a named button. */
async function expectNothingNew(page: Page): Promise<void> {
  await expect(send(page)).toHaveAttribute('data-state', 'disabled');
  await expect(send(page)).toHaveAttribute('aria-disabled', 'true');
  await expect(send(page)).toHaveAttribute('title', NOTHING);
  await expect(page.getByRole('button', { name: 'Send to agent' })).toHaveAccessibleDescription(NOTHING);
  await expect(send(page)).toBeDisabled();
}

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie for setup acts.
  await page.goto('/?setup');
});

test('with nothing answered, Send is disabled, says why, and a click records nothing', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d);
  await expectNothingNew(page);
  await expect(send(page)).toHaveText('Send to agent');
  const before = await head(page);
  await send(page).click({ force: true });
  await send(page).hover();
  await expect(send(page)).toHaveAttribute('data-state', 'disabled');
  expect((await linesAfter(page, d, before)).filter((e) => e.type === 'act')).toEqual([]);
});

test('an answer enables Send, live; Send records it and the button goes quiet again', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d);
  await expectNothingNew(page);
  await act(page, d, { action: 'ack', n: d.n, ver: 1 });
  await expect(send(page)).toHaveAttribute('data-state', 'idle');
  await expect(send(page)).not.toHaveAttribute('aria-disabled');
  await expect(send(page)).toBeEnabled();
  const before = await head(page);
  await send(page).click();
  await expect(send(page)).toHaveAttribute('data-state', 'sent');
  expect((await linesAfter(page, d, before)).filter((e) => e.type === 'act').map((e) => e.action)).toEqual(['send']);
  // "Sent" is brief; then there is nothing new again.
  await expect(send(page)).toHaveAttribute('data-state', 'disabled', { timeout: 5000 });
  await expect(send(page)).toHaveAttribute('title', NOTHING);
});

test('arranging the board alone does not enable Send; a note on a whole container does', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d);
  await act(page, d, { action: 'size', n: d.n, size: 'l' });
  await expect(page.locator(`vb-node[data-id="${d.n}"]`)).toHaveAttribute('data-size', 'l');
  await expectNothingNew(page);
  await act(page, d, { action: 'comment', board: d.board, region: 'p', text: 'Is this the whole list?' });
  await expect(send(page)).toHaveAttribute('data-state', 'idle');
});

test('keyboard: Send stays in the tab order while disabled, Enter does nothing; after ✓ (A) Enter sends', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d);
  await page.locator('#stage').focus();
  await tabTo(page, send(page));
  const before = await head(page);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(send(page)).toBeFocused();
  await expect(send(page)).toHaveAttribute('data-state', 'disabled');
  const card = page.locator(`vb-node[data-id="${d.n}"]`);
  await card.focus();
  await page.keyboard.press('a');
  await expect(card).toHaveAttribute('aria-label', /, checked$/);
  await expect(send(page)).toHaveAttribute('data-state', 'idle');
  await tabTo(page, send(page));
  await page.keyboard.press('Enter');
  await expect(send(page)).toHaveAttribute('data-state', 'sent');
  await expect(send(page)).toBeFocused();
  expect((await linesAfter(page, d, before)).filter((e) => e.type === 'act').map((e) => e.action)).toEqual(['ack', 'send']);
});

for (const theme of THEMES) {
  test(`axe passes with Send disabled and enabled (${theme})`, async ({ page, request }) => {
    const d = await draw(request);
    await setTheme(page, theme);
    await open(page, d);
    await expectNothingNew(page);
    await expectNoAxeViolations(page);
    await act(page, d, { action: 'ack', n: d.n, ver: 1 });
    await expect(send(page)).toHaveAttribute('data-state', 'idle');
    await expectNoAxeViolations(page);
  });
}
