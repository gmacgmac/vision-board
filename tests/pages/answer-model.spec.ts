// The answer model on the page (answer-model FE_01, D-045, PLAN rulings 1-5, 7 and 8): ✓ and ✗ are
// Check and Cross, tools with no meaning, lit in their state colour with no word after them; the name
// says "checked" or "crossed"; ✗ neither fades the card nor strikes it through; a card that only
// informs shows no status; More context and M are gone; pressing a lit ✓ clears it ("N cleared"), ✗
// while ✓ is lit switches to ✗, and a double click leaves ✓ ticked; the header reads "answered"; a
// card whose note the agent answered is open, unmarked and marked updated until the person looks;
// keyboard; axe light and dark.
//
// Each test draws its own board through the API as a joined agent (agent-board.ts), so the shared
// roadmap board is never touched.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import type { Drawn } from './agent-board.ts';
import { act, card, open, reply, write } from './agent-board.ts';

const THEMES: Theme[] = ['dark', 'light'];

let boards = 0;

/** A board of its own: a decision, a question and a finding in container "p". */
async function draw(request: APIRequestContext): Promise<Drawn & { decision: number; question: number; finding: number }> {
  const r = await request.post('/api/agents', { data: { label: 'Pricing chat' } });
  expect(r.status(), await r.text()).toBe(201);
  const d = { agent: await r.json() as { secret: string }, board: `answer-${Date.now()}-${(boards += 1)}` };
  const results = await write(request, d, [
    { type: 'board', title: 'Answers' },
    { type: 'region', region: { id: 'p', title: 'Pricing thread', mode: 'grid', columns: 3 } },
    { type: 'node', node: { region: 'p', kind: 'decision', title: 'Keep the free tier', body: '✓ keep it · ✗ cut it now' } },
    { type: 'node', node: { region: 'p', kind: 'question', title: 'Grandfather annual plans?' } },
    { type: 'node', node: { region: 'p', kind: 'finding', title: 'The usage tier carries 3x the support load' } },
  ]);
  const [decision, question, finding] = results.slice(2).map((x) => x.n!) as [number, number, number];
  return { ...d, n: [decision, question, finding], decision, question, finding };
}

const button = (page: Page, n: number, name: string) => card(page, n).getByRole('button', { name: new RegExp(`^${name} item ${n} `) });
const toast = (page: Page) => page.locator('#toast');

test.beforeEach(async ({ page }) => {
  // The page first, so page.request carries the person cookie.
  await page.goto('/?setup');
});

test('✓ and ✗ are Check and Cross: lit in their colour, no word, the name says checked or crossed; ✗ fades nothing', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d);
  const tips = await card(page, d.decision).locator('button[data-act]').evaluateAll((els) => els.map((e) => [(e as HTMLElement).dataset.act, e.getAttribute('title')]));
  expect(tips).toEqual([['ack', 'Check · a'], ['drop', 'Cross · x'], ['comment', 'Comment · c'], ['later', 'Save for later · l']]);
  await expect(card(page, d.decision).locator('.vb-node-status')).toHaveText('Open');
  await button(page, d.decision, 'Check').click();
  await expect(card(page, d.decision)).toHaveAttribute('data-status', 'acknowledged');
  await expect(card(page, d.decision)).toHaveAttribute('aria-label', `Item ${d.decision}, Decision: Keep the free tier, checked`);
  await expect(card(page, d.decision).locator('.vb-node-status')).toHaveText('');
  await expect(card(page, d.decision).locator('.vb-node-sep')).toBeHidden();
  await expect(button(page, d.decision, 'Check')).toHaveAttribute('aria-pressed', 'true');
  await button(page, d.question, 'Cross').click();
  const q = card(page, d.question);
  await expect(q).toHaveAttribute('data-status', 'dropped');
  await expect(q).toHaveAttribute('aria-label', `Item ${d.question}, Question: Grandfather annual plans?, crossed`);
  await expect(q.locator('.vb-node-status')).toHaveText('');
  expect(await q.evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
  expect(await q.locator('.vb-node-title').evaluate((e) => getComputedStyle(e).textDecorationLine)).toBe('none');
  // The header and the container say "answered", never "decided".
  await expect(page.locator('#counts')).toContainText('0 open');
  await expect(page.locator('#counts')).toContainText('2 answered');
  await expect(page.locator('#counts')).not.toContainText('decided');
  await expect(page.locator('vb-region[data-region="p"] .vb-region-count')).toHaveText('2 of 2 answered');
});

test('a card that only informs shows no status, in its footer or its name; nothing offers More context or M', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d);
  const f = card(page, d.finding);
  await expect(f).toHaveAttribute('aria-label', `Item ${d.finding}, Finding: The usage tier carries 3x the support load`);
  await expect(f.locator('.vb-node-status')).toHaveText('');
  await expect(f.locator('button[data-act]')).toHaveCount(2);
  await expect(page.locator('button[data-act="context"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /More context/ })).toHaveCount(0);
  // A note shows its pin and still no word; Later lights its button, and the footer says only that the
  // agent owes the handover ("Awaiting", FE_03: the agent's due, not the card's status).
  await act(page, d, { action: 'comment', n: d.finding, ver: 1, text: 'Which tier?' });
  await expect(f.locator('.vb-note-pin')).toHaveText('1');
  await expect(f.locator('.vb-node-status')).toHaveText('');
  await expect(f).toHaveAttribute('aria-label', `Item ${d.finding}, Finding: The usage tier carries 3x the support load`);
  await f.focus();
  await page.keyboard.press('l');
  await expect(f).toHaveAttribute('data-status', 'later');
  await expect(f.locator('button[data-act="later"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(f.locator('.vb-node-status')).toHaveText('Awaiting');
  await expect(f).toHaveAttribute('aria-label', `Item ${d.finding}, Finding: The usage tier carries 3x the support load, awaiting context`);
  for (const n of [d.decision, d.question]) {
    await card(page, n).focus();
    await page.keyboard.press('m');
  }
  await expect(page.locator('vb-note-bubble')).toBeHidden();
  await expect(card(page, d.decision)).toHaveAttribute('data-status', 'open');
  await expect(card(page, d.question)).toHaveAttribute('data-status', 'open');
});

test('a lit ✓ pressed again clears it ("N cleared"); ✗ while ✓ is lit switches; a double click leaves ✓ ticked', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d);
  const c = card(page, d.decision);
  await button(page, d.decision, 'Check').click();
  await expect(c).toHaveAttribute('data-status', 'acknowledged');
  await expect(toast(page)).toHaveText(`${d.decision} ✓`);
  // A press of the same button after the 400 ms guard clears it.
  await page.waitForTimeout(450);
  await button(page, d.decision, 'Check').click();
  await expect(c).toHaveAttribute('data-status', 'open');
  await expect(toast(page)).toHaveText(`${d.decision} cleared`);
  await expect(c.locator('.vb-node-status')).toHaveText('Open');
  // ✗ while ✓ is lit goes straight to ✗.
  await page.waitForTimeout(450);
  await button(page, d.decision, 'Check').click();
  await expect(c).toHaveAttribute('data-status', 'acknowledged');
  await button(page, d.decision, 'Cross').click();
  await expect(c).toHaveAttribute('data-status', 'dropped');
  await expect(button(page, d.decision, 'Check')).toHaveAttribute('aria-pressed', 'false');
  // A double click on ✓: ticked, and the second press is ignored.
  await button(page, d.question, 'Check').dblclick();
  await expect(card(page, d.question)).toHaveAttribute('data-status', 'acknowledged');
  await page.waitForTimeout(450);
  await expect(card(page, d.question)).toHaveAttribute('data-status', 'acknowledged');
  // The same by keyboard: A twice in a row within 400 ms keeps ✓; again later clears it.
  await card(page, d.question).focus();
  await page.waitForTimeout(450);
  await page.keyboard.press('a');
  await expect(card(page, d.question)).toHaveAttribute('data-status', 'open');
  await page.waitForTimeout(450);
  await page.keyboard.press('a');
  await page.keyboard.press('a');
  await page.waitForTimeout(450);
  await expect(card(page, d.question)).toHaveAttribute('data-status', 'acknowledged');
});

// Card 20's sequence on the board behind D-045: ✓, then a note asking, then the agent's reply.
test('the agent\'s answer to a note clears an earlier ✓: open, unmarked, "1 update" until the person looks', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d);
  const c = card(page, d.decision);
  await act(page, d, { action: 'ack', n: d.decision, ver: 1 });
  await expect(c).toHaveAttribute('data-status', 'acknowledged');
  const note = await act(page, d, { action: 'comment', n: d.decision, ver: 1, text: 'Does this cover renewals?' });
  // A note never answers: still ✓, and the agent owes the note.
  await expect(c.locator('.vb-node-note-who')).toHaveText('Your note 1');
  await expect(c).toHaveAttribute('data-status', 'acknowledged');
  await reply(request, d, d.decision, 'Yes, renewals too. ✓ again if keeping it still holds.', note);
  await expect(c).toHaveAttribute('data-status', 'open');
  await expect(button(page, d.decision, 'Check')).toHaveAttribute('aria-pressed', 'false');
  await expect(c.locator('.vb-node-status')).toHaveText('Open');
  await expect(c.locator('.vb-node-reply')).toContainText('Yes, renewals too.');
  const tab = c.locator('[data-tab="updates"]');
  await expect(tab).toHaveText('1 update');
  await expect(c).toHaveAttribute('aria-label', `Item ${d.decision}, Decision: Keep the free tier, Open, 1 unseen update`);
  // The tab steps through the reply, then up to date; the card seen line ends the marker.
  await tab.click();
  await expect(c.locator('.vb-step-head')).toHaveText(/^Reply · .+ · Pricing chat$/);
  await expect(c.locator('.vb-step-line')).toHaveText('Yes, renewals too. ✓ again if keeping it still holds.');
  await c.locator('[data-step="next"]').click();
  await expect(c.locator('.vb-step-done')).toHaveText('You\'re up to date');
  await expect(tab).toBeHidden({ timeout: 5000 });
  await expect(c).toHaveAttribute('aria-label', `Item ${d.decision}, Decision: Keep the free tier, Open`);
  // Opening the board again: nothing left to mark.
  await page.reload();
  await expect(card(page, d.decision)).toHaveAttribute('data-status', 'open');
  await expect(card(page, d.decision).locator('[data-tab="updates"]')).toBeHidden();
});

test('selecting a card the agent\'s answer cleared marks it seen, and the tab goes', async ({ page, request }) => {
  const d = await draw(request);
  await open(page, d);
  const c = card(page, d.question);
  await act(page, d, { action: 'drop', n: d.question, ver: 1 });
  const note = await act(page, d, { action: 'comment', n: d.question, ver: 1, text: 'Which plans?' });
  await reply(request, d, d.question, 'Only the 2024 ones.', note);
  await expect(c.locator('[data-tab="updates"]')).toHaveText('1 update');
  await c.focus();
  await page.keyboard.press('Space');
  await expect(c).toHaveAttribute('data-selected', '');
  await expect(c.locator('[data-tab="updates"]')).toBeHidden();
  await expect(c).toHaveAttribute('data-status', 'open');
});

for (const theme of THEMES) {
  test(`axe passes on lit ✓ and ✗, a finding and a card the agent's answer cleared (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    const d = await draw(request);
    await open(page, d);
    await act(page, d, { action: 'drop', n: d.question, ver: 1 });
    const note = await act(page, d, { action: 'comment', n: d.decision, ver: 1, text: 'Why now?' });
    await reply(request, d, d.decision, 'The forum is unanswered on weekends.', note);
    await expect(card(page, d.decision).locator('[data-tab="updates"]')).toHaveText('1 update');
    await expect(card(page, d.question)).toHaveAttribute('data-status', 'dropped');
    await expectNoAxeViolations(page);
  });
}
