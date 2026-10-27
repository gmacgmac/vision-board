// The container tool rail's page-test board and helpers (container-rail.spec.ts,
// container-rail-states.spec.ts): a board of its own drawn through the API by an agent, two one-card
// containers side by side and a lanes container; zoom and pan by wheel; the rail's reach on screen.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { draw, write } from './agent-board.ts';
import type { Drawn } from './agent-board.ts';
import { expect } from './helpers.ts';
import { scale as zoom } from './board-page.ts';
import type { Theme } from './helpers.ts';
import { REGION_GAP, REGION_PAD } from '#layout';
import { FAR_K } from '../../apps/board/src/board/canvas/viewport.ts';

export type Box = { x: number; y: number; width: number; height: number };
export const THEMES: Theme[] = ['light', 'dark'];
export const TITLE = 'Pricing questions for the plans';
/** The rail's canvas ring (region-rail.css --rail-ring), part of its reach. */
export const RING = 2;
/** Design 3's hard bounds, on screen, at every zoom down to FAR_K. */
export const INSIDE = REGION_PAD * FAR_K - 2;
export const OUTSIDE = REGION_GAP * FAR_K - 2;

/** Two one-card containers side by side (p, q) and a lanes container (l), drawn by an agent. */
export async function board(page: Page, request: APIRequestContext, query = ''): Promise<Drawn> {
  const d = await draw(request, 0, 'rail');
  await write(request, d, [
    { type: 'region', region: { id: 'p', title: TITLE, mode: 'grid' } },
    { type: 'node', node: { region: 'p', kind: 'question', title: 'Which plan first?' } },
    { type: 'region', region: { id: 'q', title: 'Rollout', mode: 'grid' } },
    { type: 'node', node: { region: 'q', kind: 'action', title: 'Draft the rollout' } },
    { type: 'region', region: { id: 'l', title: 'Workstreams', mode: 'lanes', lanes: ['Design', 'Build'] } },
    { type: 'node', node: { region: 'l', kind: 'action', title: 'Sketch', lane: 'Design' } },
    { type: 'node', node: { region: 'l', kind: 'action', title: 'Ship', lane: 'Build' } },
  ]);
  await page.goto(`/${query}#${d.board}`);
  await expect(page.locator('vb-node')).toHaveCount(4);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
  return d;
}

export const frame = (page: Page, id = 'p') => page.locator(`vb-region[data-region="${id}"]`);
export const rail = (page: Page, id = 'p') => frame(page, id).locator('.vb-region-tools');
export { scale as zoom } from './board-page.ts';
export const boxOf = async (l: Locator): Promise<Box> => (await l.boundingBox())!;

/** Zoom to `k` by Ctrl + wheel over frame `id`'s title (one turn lands on k), then move the pointer away. */
export async function zoomTo(page: Page, k: number, id = 'p'): Promise<void> {
  const t = await boxOf(frame(page, id).locator('.vb-region-head h2'));
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -Math.log(k / await zoom(page)) / 0.0015);
  await page.keyboard.up('Control');
  await expect.poll(() => zoom(page)).toBeCloseTo(k, 2);
  await page.mouse.move(2, 990);
}

/** Pan with the wheel (scroll pans the board) until frame `id` sits in the middle of the stage. */
export async function centreOn(page: Page, id = 'p'): Promise<void> {
  const mid = { x: 800, y: 560 };
  await page.mouse.move(mid.x, mid.y);
  await expect.poll(async () => {
    const b = await boxOf(frame(page, id));
    const off = { x: b.x + b.width / 2 - mid.x, y: b.y + b.height / 2 - mid.y };
    if (Math.abs(off.x) < 4 && Math.abs(off.y) < 4) return true;
    await page.mouse.wheel(off.x, off.y);
    return false;
  }).toBe(true);
  await page.mouse.move(2, 990);
}

/** The rail's reach on screen against its frame (outer edges) and the nearest card or lane label. */
export const reach = (f: Locator) => f.evaluate((e, ring) => {
  const fr = e.getBoundingClientRect();
  const parts = [...e.querySelectorAll<HTMLElement>('.vb-region-tools, .vb-region-badge')]
    .map((p) => p.getBoundingClientRect()).filter((r) => r.width > 0);
  const tools = e.querySelector('.vb-region-tools')!.getBoundingClientRect();
  const left = Math.min(tools.left - ring, ...parts.map((r) => r.left));
  const right = Math.max(tools.right + ring, ...parts.map((r) => r.right));
  return { inside: right - fr.left, outside: fr.left - left, right, top: tools.top - ring, bottom: tools.bottom + ring, frameLeft: fr.left };
}, RING);

/** The opacity the rail's icons draw at, the first unchecked layout's. */
export const iconOpacity = (f: Locator) => f.locator('.vb-mseg[aria-checked="false"] .vb-mode-icon').first().evaluate((e) => Number(getComputedStyle(e).opacity));
