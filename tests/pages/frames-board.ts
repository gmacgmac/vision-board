// The board containers.spec.ts runs on, and its locators (3_FE_04): board "frames-w<worker>",
// written through the API by an agent, so no other file's board changes. Its cards are found by
// the number their write returned (step 4G ruling 6), never by title.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from './helpers.ts';
import { api, bubble, frame, scale } from './board-page.ts';
import type { Point } from './board-page.ts';

export { api, bubble, drag, frame, scale } from './board-page.ts';
export type { Point } from './board-page.ts';

export type Box = Point & { width: number; height: number };

/** The board, written once per spec file (each file starts on fresh boards, servers.ts), and its
 *  agent's secret. `n`: card number by write key, the write result's `n` (959). */
export const fx = { board: '', secret: '', n: {} as Record<string, number> };

export const grip = (page: Page, region: string) => frame(page, region).locator('.vb-region-grip');
// Item numbers run across every board of the project: a card is found by the number its write
// returned, never by its title.
export const card = (page: Page, key: string) => page.locator(`vb-node[data-id="${fx.n[key]}"]`);
export const text = (page: Page) => bubble(page).getByLabel('Note text');
export const comment = (page: Page, title: string) => page.getByRole('button', { name: `Comment on container ${title}` });
export const preview = (page: Page, region: string) => frame(page, region).locator('.vb-note-pop');
export const block = (page: Page, region: string) => frame(page, region).locator('.vb-region-note-block');
export const discard = (page: Page) => page.getByRole('dialog', { name: 'Discard your changes?' });

export async function agentWrite(request: APIRequestContext, items: unknown[]) {
  const r = await request.post(`/api/boards/${fx.board}/write`, { headers: { Authorization: `Bearer ${fx.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  return (await r.json()) as { results: { key?: string; n?: number; title?: string }[] };
}

/** Four containers, items in each, a link across two; the fourth is wide, so it wraps to a second
 *  row under Plan (packing's row width), where a note shown in Plan pushes it down. */
export async function ensureBoard(request: APIRequestContext, worker: number): Promise<void> {
  // Written already for this file: the board is on the server (another file's left with its server).
  if (fx.board && (await request.get(`/api/boards/${fx.board}`)).ok()) return;
  Object.assign(fx, { board: `frames-w${worker}`, n: {} });
  const j = await request.post('/api/agents', { data: { label: 'Frames chat' } });
  expect(j.status(), await j.text()).toBe(201);
  fx.secret = ((await j.json()) as { secret: string }).secret;
  const node = (region: string, title: string, key: string) =>
    ({ type: 'node', key, node: { region, kind: 'question', title } });
  const { results } = await agentWrite(request, [
    { type: 'board', title: 'Frames' },
    { type: 'region', region: { id: 'plan', title: 'Plan', mode: 'grid' } },
    { type: 'region', region: { id: 'risks', title: 'Risks', mode: 'grid' } },
    { type: 'region', region: { id: 'parked', title: 'Parked', mode: 'grid' } },
    { type: 'region', region: { id: 'backlog', title: 'Backlog', mode: 'flow' } },
    node('plan', 'Ship the beta in May?', 'p1'), node('plan', 'Who signs off the copy?', 'p2'),
    node('risks', 'Is the import too slow?', 'r1'), node('parked', 'Dark mode for print?', 'k1'),
    node('backlog', 'Offline mode?', 'b1'), node('backlog', 'A print view?', 'b2'), node('backlog', 'Keyboard map?', 'b3'),
    { type: 'link', from: { key: 'p1' }, to: { key: 'r1' }, label: 'blocks' },
  ]);
  for (const x of results) if (x.key && x.n !== undefined) fx.n[x.key] = x.n;
}

export async function openFrames(page: Page): Promise<void> {
  await page.goto(`/?frames#${fx.board}`);
  await expect(page.locator('vb-node')).toHaveCount(7);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
  await expect(page.locator('.vb-wires:not(.vb-wires-top)')).not.toHaveClass(/settling/);
}

export const head = async (page: Page) => (await api(page, `/boards/${fx.board}`)).head as number;
export const linesAfter = async (page: Page, after: number) => (await api(page, `/ledger?after=${after}&board=${fx.board}`)).events as Record<string, unknown>[];
export const regionPins = async (page: Page) => ((await api(page, `/boards/${fx.board}`)).state.containerPins ?? {}) as Record<string, Point>;
export const boxOf = async (page: Page, sel: ReturnType<Page['locator']>): Promise<Box> => (await sel.boundingBox())!;
export const centre = (b: Box): Point => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
export const settled = async (page: Page) => expect(page.locator('.vb-wires:not(.vb-wires-top)')).not.toHaveClass(/settling/);
export const REGIONS = ['plan', 'risks', 'parked', 'backlog'];
export const frames = (page: Page) => Promise.all(REGIONS.map((r) => boxOf(page, frame(page, r))));

export function apart(boxes: Box[]): boolean {
  return boxes.every((a, i) => boxes.every((b, j) => j <= i
    || a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y));
}

/** Every container back where the layout puts it (setup and clean-up). */
export async function putAllBack(page: Page): Promise<void> {
  for (const region of Object.keys(await regionPins(page))) {
    const r = await page.request.post(`/api/boards/${fx.board}/act`, { data: { type: 'act', action: 'unpin', board: fx.board, region } });
    expect(r.status(), await r.text()).toBe(201);
  }
}
