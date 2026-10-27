// Every node is part of the conversation (every-node FE_01, PLAN rulings 1-4 and 6; assumptions A-C;
// D-045), behind the everyNode flag (rule 12, on by default): every card shows its number; the kind
// decides its buttons (a question, decision or action Check, Cross, Comment and Later; every other
// kind Comment and Later); a plain card commented alone shows no status and counts nowhere; Comment on
// a lasso of mixed cards is one note on exactly those cards and answers none; "Hide answered" keeps an
// answered card while the agent owes it an answer; keyboard; axe light and dark; the flag off.
//
// Each test draws its own board through the API as a joined agent, so the shared roadmap board is
// never touched. Agent calls go through `request` (no person cookie); reads through `page.request`.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, openSelectionBar, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['dark', 'light'];

/** The board's cards by role, as numbers once drawn. */
interface Drawn { secret: string; board: string; ask: number; plain: number; topic: number; act: number; risk: number }

let boards = 0;

async function write(request: APIRequestContext, d: Pick<Drawn, 'secret' | 'board'>, items: object[]) {
  const r = await request.post(`/api/boards/${d.board}/write`, { headers: { Authorization: `Bearer ${d.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  const body = await r.json() as { results: { ok: boolean; n?: number }[] };
  expect(body.results.every((x) => x.ok), JSON.stringify(body.results)).toBe(true);
  return body.results;
}

const node = (region: string, kind: string, title: string) => ({ type: 'node', node: { region, kind, title, body: 'Offered on the last call.' } });

/** A board of its own: container "p" holds a question, a finding and a topic; "q" an action and a risk. */
async function draw(request: APIRequestContext): Promise<Drawn> {
  const r = await request.post('/api/agents', { data: { label: 'Pricing chat' } });
  expect(r.status(), await r.text()).toBe(201);
  const d = { secret: ((await r.json()) as { secret: string }).secret, board: `every-${Date.now()}-${(boards += 1)}` };
  const results = await write(request, d, [
    { type: 'board', title: 'Every card' },
    { type: 'region', region: { id: 'p', title: 'Pricing thread', mode: 'grid', columns: 3 } },
    { type: 'region', region: { id: 'q', title: 'Next steps', mode: 'grid', columns: 2 } },
    node('p', 'question', 'Do we grandfather annual plans?'),
    node('p', 'finding', 'The usage tier carries 3x the support load'),
    node('p', 'topic', 'Pricing next quarter'),
    node('q', 'action', 'Draft the migration email'),
    node('q', 'risk', 'The vendor may change pricing'),
  ]);
  const [ask, plain, topic, act, risk] = results.slice(3).map((x) => x.n!) as [number, number, number, number, number];
  return { ...d, ask, plain, topic, act, risk };
}

/** Open the board, wait until it has drawn and settled, and zoom in so every control is its full size. */
async function open(page: Page, d: Drawn, query = ''): Promise<void> {
  await page.goto(`/${query}#${d.board}`);
  await expect(page.locator('vb-node')).toHaveCount(5);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
  await expect(page.locator('.vb-wires:not(.vb-wires-top)')).not.toHaveClass(/settling/);
}

const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);
const bubble = (page: Page) => page.locator('vb-note-bubble');
const bar = (page: Page) => page.locator('vb-selection-bar');
const head = async (page: Page, d: Drawn) => (await (await page.request.get(`/api/boards/${d.board}`)).json() as { head: number }).head;
const responsesAfter = async (page: Page, d: Drawn, after: number) =>
  (await (await page.request.get(`/api/boards/${d.board}/responses?after=${after}`)).json() as { responses: Record<string, unknown>[] }).responses;
const tips = (page: Page, n: number) => card(page, n).locator('button[data-act]').evaluateAll((els) =>
  els.map((e) => [(e as HTMLElement).dataset.act, e.getAttribute('title')]));

/** Focus card `n` and write a note with C, the keyboard way. */
async function commentByKey(page: Page, n: number, text: string): Promise<void> {
  await card(page, n).focus();
  await page.keyboard.press('c');
  await expect(bubble(page)).toHaveAttribute('aria-label', `Note on ${n}`);
  await expect(bubble(page).locator('textarea')).toBeFocused();
  await page.keyboard.type(text);
  await page.keyboard.press('Enter');
  await expect(bubble(page)).toBeHidden();
}

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

test('every card shows its number; the kind decides the buttons, and ✓ and ✗ are Check and Cross on every kind', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d);
  for (const n of [d.ask, d.plain, d.topic, d.act, d.risk]) await expect(card(page, n).locator('.vb-node-num')).toHaveText(String(n));
  const asks = [['ack', 'Check · a'], ['drop', 'Cross · x'], ['comment', 'Comment · c'], ['later', 'Save for later · l']];
  expect(await tips(page, d.ask)).toEqual(asks);
  expect(await tips(page, d.act)).toEqual(asks);
  for (const n of [d.plain, d.topic, d.risk])
    expect(await tips(page, n)).toEqual([['comment', 'Comment · c'], ['later', 'Save for later · l']]);
  await expect(card(page, d.ask).getByRole('button', { name: `Check item ${d.ask} (A)` })).toHaveAttribute('title', 'Check · a');
  await expect(card(page, d.plain)).toHaveAttribute('aria-label', `Item ${d.plain}, Finding: The usage tier carries 3x the support load`);
});

test('a plain card commented alone: its own note and pin, no status word, and counted nowhere', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d);
  const counts = page.locator('#counts');
  await expect(counts).toContainText('2 open');
  await expect(counts).toContainText('0 answered');
  const p = page.locator('vb-region[data-region="p"] .vb-region-count');
  await expect(p).toHaveAttribute('title', '0 of 1 answered');
  const before = await head(page, d);
  await commentByKey(page, d.plain, 'Which renewals asked?');
  await expect(card(page, d.plain)).toHaveAttribute('data-status', 'commented');
  await expect(card(page, d.plain).locator('.vb-node-status')).toHaveText('');
  await expect(card(page, d.plain).locator('.vb-node-note-who')).toHaveText('Your note 1');
  await expect(card(page, d.plain).locator('.vb-note-pin')).toHaveText('1');
  await expect(card(page, d.plain).getByRole('button', { name: `Comment item ${d.plain} (C)` })).toBeVisible();
  // Assumption C: it shows, but counts nowhere; ruling 6: only cards that need an answer count.
  await expect(counts).toContainText('2 open');
  await expect(counts).toContainText('0 answered');
  await expect(p).toHaveAttribute('title', '0 of 1 answered');
  const acts = await responsesAfter(page, d, before);
  expect(acts.map((e) => [e.action, e.n, e.text])).toEqual([['comment', d.plain, 'Which renewals asked?']]);
  // A plain card offers no ✓ or ✗, so A and X do nothing on it.
  await card(page, d.plain).focus();
  await page.keyboard.press('a');
  await page.keyboard.press('x');
  await expect(card(page, d.plain)).toHaveAttribute('data-status', 'commented');
  expect((await responsesAfter(page, d, before)).length).toBe(1);
});

test('three mixed cards lassoed and commented once: one note on exactly those cards', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d);
  // A Shift+drag from just inside one corner of container "p" to the opposite one touches its three cards only.
  const f = (await page.locator('vb-region[data-region="p"]').boundingBox())!;
  await page.keyboard.down('Shift');
  await page.mouse.move(f.x + 2, f.y + f.height - 2);
  await page.mouse.down();
  await page.mouse.move(f.x + f.width - 2, f.y + 2, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  const ids = [d.ask, d.plain, d.topic];
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(3);
  const before = await head(page, d);
  await openSelectionBar(page);
  await bar(page).getByRole('button', { name: 'Comment' }).click();
  await expect(bubble(page)).toHaveAttribute('aria-label', `Note on 3 cards: ${ids.join(', ')}`);
  await bubble(page).locator('textarea').fill('Settle these together.');
  await page.keyboard.press('Enter');
  await expect(bubble(page)).toBeHidden();
  const acts = await responsesAfter(page, d, before);
  expect(acts.map((e) => [e.action, e.nodes, e.n])).toEqual([['comment', ids, undefined]]);
  // Drawn once, as the group's pin (groupNoteOnce flag, group-note.spec.ts): no card repeats it.
  const group = page.locator('.vb-group-pin');
  await expect(group).toHaveCount(1);
  await expect(group).toHaveText('1');
  await expect(group).toHaveAttribute('aria-label', `Note 1 on items ${[...ids].sort((x, y) => x - y).join(', ')}. Edit it`);
  for (const n of [...ids, d.act, d.risk]) await expect(card(page, n).locator('.vb-note-pin')).toBeHidden();
  // A note never answers a card (D-045): the question stays open, and nothing is answered.
  await expect(page.locator('#counts')).toContainText('0 answered');
  await expect(card(page, d.ask)).toHaveAttribute('data-status', 'commented');
  await expect(card(page, d.plain)).toHaveAttribute('data-status', 'commented');
});

test('Hide answered keeps a ✓ question while its note is owed; the agent\'s reply clears the ✓, so it stays', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d);
  const before = await head(page, d);
  await card(page, d.ask).focus();
  await page.keyboard.press('a');
  await expect(card(page, d.ask)).toHaveAttribute('data-status', 'acknowledged');
  await commentByKey(page, d.ask, 'Only for annual plans?');
  await commentByKey(page, d.plain, 'Which renewals asked?');
  await card(page, d.act).focus();
  await page.keyboard.press('a');
  await expect(card(page, d.act)).toHaveAttribute('data-status', 'acknowledged');
  await page.keyboard.press('h');
  // The ✓ action hides; the ✓ question waits for the reply to its note; a plain card never hides.
  await expect(card(page, d.act)).toBeHidden();
  await expect(card(page, d.ask)).toBeVisible();
  await expect(card(page, d.ask)).toHaveAttribute('data-status', 'acknowledged');
  await expect(card(page, d.plain)).toBeVisible();
  const note = (await responsesAfter(page, d, before)).find((e) => e.action === 'comment' && e.n === d.ask)!;
  await write(request, d, [{ type: 'reply', n: d.ask, text: 'Annual only.', to: note.seq }]);
  // The reply clears the earlier ✓ (D-045): open again, so it stays in sight with the reply.
  await expect(card(page, d.ask)).toHaveAttribute('data-status', 'open');
  await expect(card(page, d.ask)).toBeVisible();
  await expect(card(page, d.ask).locator('.vb-node-reply')).toContainText('Annual only.');
  await expect(card(page, d.plain)).toBeVisible();
  await page.keyboard.press('h');
  await expect(card(page, d.act)).toBeVisible();
});

test('flag off: numbers and buttons only on cards that need an answer', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d, '?flags=-everyNode');
  for (const n of [d.ask, d.act]) {
    await expect(card(page, n).locator('.vb-node-num')).toHaveText(String(n));
    await expect(card(page, n).locator('button[data-act]')).toHaveCount(4);
  }
  for (const n of [d.plain, d.topic, d.risk]) {
    await expect(card(page, n).locator('.vb-node-num')).toHaveCount(0);
    await expect(card(page, n).locator('button[data-act]')).toHaveCount(0);
  }
  // C on a plain card does nothing; the counts are the same as with the flag on.
  await card(page, d.plain).focus();
  await page.keyboard.press('c');
  await expect(bubble(page)).toBeHidden();
  await expect(page.locator('#counts')).toContainText('2 open');
});

for (const theme of THEMES) {
  test(`axe passes with a plain card commented and a note on a group of mixed cards (${theme})`, async ({ page, request }) => {
    const d = await draw(request);
    await setTheme(page, theme);
    await open(page, d);
    await commentByKey(page, d.plain, 'Which renewals asked?');
    await card(page, d.ask).locator('.vb-node-title').click({ position: { x: 4, y: 4 } });
    await card(page, d.risk).locator('.vb-node-title').click({ modifiers: ['Shift'], position: { x: 4, y: 4 } });
    await openSelectionBar(page);
    await bar(page).getByRole('button', { name: 'Comment' }).click();
    await bubble(page).locator('textarea').fill('Both before Friday.');
    await page.keyboard.press('Enter');
    await expect(bubble(page)).toBeHidden();
    await expect(page.locator('.vb-group-pin')).toHaveAttribute('aria-label', /^Note 1 on items \d+, \d+\. Edit it$/);
    // The selection's bar, and its pill once closed, float over the first container's top line, where
    // they cover its Move grip in part: a target covered in part is no target of 24px. Both are checked
    // by axe where they are the subject (selection-pill, select and group-note specs), so the selection
    // is cleared as a person does (Esc closes the bar, Esc again clears the selection) before this one.
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await expect(page.locator('vb-node[data-selected]')).toHaveCount(0);
    await expect(bar(page)).toBeHidden();
    await expectNoAxeViolations(page);
  });
}
