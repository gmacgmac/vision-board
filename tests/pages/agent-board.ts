// A board of its own per test, drawn through the API as an agent would (parking-replies.spec.ts,
// popover-thread.spec.ts): a joined agent writes the board and its cards, the page opens, then the
// person acts and the agent answers, so every change arrives live. Agent calls go through `request`
// (no person cookie); the person's through `page.request`, so open the page before acting.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect } from './helpers.ts';

export interface Agent { secret: string }
export interface Drawn { agent: Agent; board: string; n: number[] }

let boards = 0;

async function join(request: APIRequestContext): Promise<Agent> {
  const r = await request.post('/api/agents', { data: { label: 'Pricing chat' } });
  expect(r.status(), await r.text()).toBe(201);
  return await r.json() as Agent;
}

export async function write(request: APIRequestContext, d: { agent: Agent; board: string }, items: object[]) {
  const r = await request.post(`/api/boards/${d.board}/write`, { headers: { Authorization: `Bearer ${d.agent.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  const body = await r.json() as { results: { ok: boolean; n?: number }[] };
  expect(body.results.every((x) => x.ok), JSON.stringify(body.results)).toBe(true);
  return body.results;
}

/** A board of its own with `count` cards in container "p" (Pricing thread), drawn by a new agent. */
export async function draw(request: APIRequestContext, count = 1, name = 'parking'): Promise<Drawn> {
  const d = { agent: await join(request), board: `${name}-${Date.now()}-${(boards += 1)}` };
  const results = await write(request, d, [
    { type: 'board', title: 'Parking' },
    { type: 'region', region: { id: 'p', title: 'Pricing thread', mode: 'grid' } },
    ...Array.from({ length: count }, (_, i) => ({ type: 'node', node: { region: 'p', kind: 'question', title: `Card ${i + 1}` } })),
  ]);
  return { ...d, n: results.slice(2).map((x) => x.n!) };
}

/** The agent's reply on card `n`, to the note `to` when given. */
export const reply = (request: APIRequestContext, d: Drawn, n: number, text: string, to?: number) =>
  write(request, d, [{ type: 'reply', n, text, ...(to !== undefined && { to }) }]);

/** The person's act, with the cookie the page was given. */
export async function act(page: Page, d: Drawn, body: object): Promise<number> {
  const r = await page.request.post(`/api/boards/${d.board}/act`, { data: { type: 'act', ...body } });
  expect(r.status(), await r.text()).toBe(201);
  return (await r.json() as { seq: number }).seq;
}

export async function open(page: Page, d: Drawn, query = ''): Promise<void> {
  await page.goto(`/${query}#${d.board}`);
  await expect(page.locator('vb-node')).toHaveCount(d.n.length);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
}

export const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);

/** Press Tab until `target` has focus, as a keyboard user would; fails after `max` presses. */
export async function tabTo(page: Page, target: Locator, max = 60): Promise<void> {
  for (let i = 0; i < max; i += 1) {
    if (await target.evaluate((e) => e === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached ${String(target)}`);
}
