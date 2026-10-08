// Reset places for a selection (navigation FE_03): the selection bar's Reset places and the R key
// put every selected pinned card back where layout places it, as one redraw; the button is
// disabled while no selected card is pinned; with no selection R still resets the focused card;
// a past version refuses it. A board of its own, written by an agent through the API.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['dark', 'light'];
const TITLES = ['First idea', 'Second idea', 'Third idea'];

async function join(request: APIRequestContext): Promise<string> {
  const r = await request.post('/api/agents', { data: { label: 'Reset chat' } });
  return (await r.json() as { secret: string }).secret;
}

/** Draw a board of three cards in one container on `board`. */
async function draw(request: APIRequestContext, board: string): Promise<void> {
  const secret = await join(request);
  const items = [
    { type: 'board', title: 'Reset board' },
    { type: 'region', region: { id: 'ideas', title: 'Ideas', mode: 'grid' } },
    ...TITLES.map((title) => ({ type: 'node', node: { region: 'ideas', kind: 'question', title, item: true } })),
  ];
  const r = await request.post(`/api/boards/${board}/write`, { headers: { Authorization: `Bearer ${secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
}

async function open(page: Page, board: string): Promise<void> {
  await page.goto(`/?vbwork#${board}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
  await expect(page.locator('vb-node')).toHaveCount(3);
  await expect(page.locator('#wires')).not.toHaveClass(/settling/);
}

const idle = (page: Page) => page.evaluate(() => (window as unknown as { __vbWork: { idle(): Promise<void> } }).__vbWork.idle());
const card = (page: Page, n: string) => page.locator(`vb-node[data-id="${n}"]`);
/** The cards' ids (item numbers are the project's, not the board's), in drawing order. */
const idsOf = (page: Page) => page.locator('vb-node').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.id!));
const bar = (page: Page) => page.locator('vb-selection-bar');
const reset = (page: Page) => bar(page).getByRole('button', { name: 'Reset places' });

/** Nudge card `n` with the keyboard so it is pinned. */
async function nudge(page: Page, n: string): Promise<void> {
  await card(page, n).focus();
  await page.keyboard.press('Alt+ArrowRight');
  await expect(card(page, n)).toHaveAttribute('data-pinned', '');
}

async function select(page: Page, ...ns: string[]): Promise<void> {
  for (const n of ns) {
    await card(page, n).focus();
    await page.keyboard.press(' ');
  }
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(ns.length);
}

test('Reset places puts the selected pinned cards back and leaves the others; R does the same; disabled when none is pinned', async ({ page, request }) => {
  await draw(request, 'reset-sel');
  await open(page, 'reset-sel');
  const [a, b, c] = await idsOf(page) as [string, string, string];
  for (const n of [a, b, c]) await nudge(page, n);

  await select(page, a, b);
  await expect(reset(page)).toBeEnabled();
  await reset(page).click();
  await expect(card(page, a)).not.toHaveAttribute('data-pinned', '');
  await expect(card(page, b)).not.toHaveAttribute('data-pinned', '');
  await expect(card(page, c)).toHaveAttribute('data-pinned', '');
  await idle(page);
  // Nothing selected is pinned now: the button stays, disabled.
  await expect(reset(page)).toBeDisabled();

  // R with a selection resets every selected card, not just the focused one.
  await nudge(page, a);
  await nudge(page, b);
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(2); // the selection stays
  await page.keyboard.press('r');
  await expect(card(page, a)).not.toHaveAttribute('data-pinned', '');
  await expect(card(page, b)).not.toHaveAttribute('data-pinned', '');
  await expect(card(page, c)).toHaveAttribute('data-pinned', '');

  // With nothing selected, R resets the focused card.
  await page.keyboard.press('Escape');
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(0);
  await card(page, c).focus();
  await page.keyboard.press('r');
  await expect(card(page, c)).not.toHaveAttribute('data-pinned', '');

  for (const theme of THEMES) {
    await setTheme(page, theme);
    await select(page, a, b);
    await expect(reset(page)).toBeDisabled();
    await expectNoAxeViolations(page, ['target-size']);
    await page.keyboard.press('Escape');
  }
});

test('a past version has no Reset places, and R sends nothing there', async ({ page, request }) => {
  const secret = await join(request);
  const write = async (items: unknown[]): Promise<number> => {
    const r = await request.post('/api/boards/reset-past/write', { headers: { Authorization: `Bearer ${secret}` }, data: { items } });
    expect(r.status(), await r.text()).toBe(200);
    const out = await r.json() as { results: { seq?: number }[] };
    return Math.max(...out.results.map((x) => x.seq ?? 0));
  };
  const item = (title: string) => ({ type: 'node', node: { region: 'ideas', kind: 'question', title, item: true } });
  await write([{ type: 'board', title: 'Reset board' }, { type: 'region', region: { id: 'ideas', title: 'Ideas', mode: 'grid' } }, item('One'), item('Two')]);
  // Person acts end the agent's runs: card 1 pinned inside the second, an ack closes it.
  await page.goto('/?vbwork#reset-past');
  await expect(page.locator('vb-node')).toHaveCount(2);
  const [a, b] = await idsOf(page) as [string, string];
  const act = (data: object) => page.request.post('/api/boards/reset-past/act', { data: { type: 'act', ver: 1, ...data } });
  const pinned = await act({ action: 'pin', n: Number(a), x: 30, y: 30 });
  expect(pinned.status(), await pinned.text()).toBe(201);
  const second = await write([item('Three')]);
  expect((await act({ action: 'ack', n: Number(b) })).status()).toBe(201);
  await write([item('Four')]);
  await idle(page);
  await expect(page.locator('vb-node')).toHaveCount(4);
  await expect(card(page, a)).toHaveAttribute('data-pinned', '');

  await page.locator('#version').selectOption(String(second));
  await expect(page.locator('#world')).toHaveAttribute('data-readonly', '');
  await expect(page.locator('vb-node')).toHaveCount(3);
  await expect(card(page, a)).toHaveAttribute('data-pinned', '');
  const sent: string[] = [];
  page.on('request', (r) => { if (r.method() === 'POST' && /\/act$/.test(r.url())) sent.push(r.url()); });
  await select(page, a);
  await expect(bar(page).locator('[data-command="comment"]')).toHaveCount(0);
  await expect(bar(page).locator('[data-command="reset-places"]')).toHaveCount(0);
  await page.keyboard.press('r');
  await idle(page);
  expect(sent).toEqual([]);
  await expect(card(page, a)).toHaveAttribute('data-pinned', '');
});
