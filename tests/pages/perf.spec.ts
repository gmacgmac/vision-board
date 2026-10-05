// The board's performance budgets (N12_FE_01, docs/specification/performance.md): a 1,000-card
// board on its own server (playwright.config.ts, `perf-ledger.ts`), opened with `?vbwork` so the
// page exposes its work counters (`window.__vbWork`, apps/board/src/board/work.ts). The counting
// tests count the work a change costs, not only its time: put back a whole-board rebuild and
// they fail.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from './helpers.ts';
import { BIG } from './perf-ledger.ts';
import { PERF_BASE } from './perf-server.ts';

const CARDS = BIG.regions * BIG.perRegion;

interface Counts {
  cardsUpdated: number; cardsMeasured: number; cardsPlaced: number; containersLaidOut: number;
  linksRedrawn: number; fullFetches: number; containers: string[]; firstDrawMs: number | null;
}

/** Wait until the page has nothing in flight, then read its counters. */
const counts = (page: Page): Promise<Counts> => page.evaluate(async () => {
  const hook = (window as unknown as { __vbWork: { idle(): Promise<void>; work: Counts } }).__vbWork;
  await hook.idle();
  return structuredClone(hook.work);
});
const reset = (page: Page) => page.evaluate(() => (window as unknown as { __vbWork: { reset(): void } }).__vbWork.reset());

async function open(page: Page, board = BIG.board): Promise<void> {
  await page.goto(`${PERF_BASE}/?vbwork#${board}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: Counts } }).__vbWork?.work.firstDrawMs != null);
}

interface Agent { secret: string }

/** An agent that holds `regions` of the big board: it joins, asks, and the person allows. */
async function agentHolding(page: Page, request: APIRequestContext, regions: string[]): Promise<Agent> {
  const j = await request.post(`${PERF_BASE}/api/agents`, { data: { label: 'Perf agent' } });
  expect(j.status(), await j.text()).toBe(201);
  const a = await j.json() as Agent;
  for (const region of regions) {
    const r = await request.post(`${PERF_BASE}/api/grants`, {
      headers: { Authorization: `Bearer ${a.secret}` }, data: { board: BIG.board, region, reason: 'Perf test edits.' },
    });
    expect(r.status(), await r.text()).toBe(201);
    const seq = (await r.json() as { request: number }).request;
    const g = await page.request.post(`${PERF_BASE}/api/boards/${BIG.board}/act`, { data: { type: 'act', action: 'grant', request: seq } });
    expect(g.status(), await g.text()).toBe(201);
  }
  return a;
}

type NodeBody = Record<string, unknown> & { region: string; body?: string };

/** One new version of each card, each body one line longer, written in one batch. */
async function redraw(page: Page, request: APIRequestContext, a: Agent, ns: number[], line: string): Promise<void> {
  const view = await (await page.request.get(`${PERF_BASE}/api/boards/${BIG.board}`)).json() as {
    view: { nodes: (NodeBody & { id: string; n?: number })[] }; versions: Record<string, number>;
  };
  const items = ns.map((n) => {
    const { id: _id, n: item, ...node } = view.view.nodes.find((x) => x.id === String(n))!;
    const body = `${node.body ?? ''}\n\n${line}`.trim();
    return { type: 'node', n, base: view.versions[String(n)], node: { ...node, ...(item !== undefined && { item: true }), body } };
  });
  const r = await request.post(`${PERF_BASE}/api/boards/${BIG.board}/write`, { headers: { Authorization: `Bearer ${a.secret}` }, data: { items } });
  expect(r.status(), await r.text()).toBe(200);
  const results = (await r.json() as { results: { ok: boolean; problem?: { detail: string } }[] }).results;
  expect(results.filter((x) => !x.ok).map((x) => x.problem?.detail)).toEqual([]);
}

/** The node numbers of region `index` (1-based): the fixture numbers 50 cards per region in order. */
const numbersOf = (index: number) => Array.from({ length: BIG.perRegion }, (_, i) => (index - 1) * BIG.perRegion + i + 1);
const regionId = (index: number) => `r${String(index).padStart(2, '0')}`;

test(`first draw of ${CARDS} cards is under 1 s, with one full fetch`, async ({ page }) => {
  await open(page);
  await expect(page.locator('vb-node')).toHaveCount(CARDS);
  const c = await counts(page);
  console.log(`[N12] first draw of ${CARDS} cards: ${c.firstDrawMs!.toFixed(0)} ms`);
  expect(c.firstDrawMs!).toBeLessThan(1000);
  expect(c.fullFetches).toBe(1);
});

test('50 cards changed in one batch: exactly 50 updated and measured, only their 2 containers laid out, no full fetch', async ({ page, request }) => {
  await open(page);
  const a = await agentHolding(page, request, [regionId(3), regionId(7)]);
  await counts(page);
  await reset(page);
  const ns = [...numbersOf(3).slice(0, 25), ...numbersOf(7).slice(0, 25)];
  await redraw(page, request, a, ns, 'Changed in one batch.');
  await expect(page.locator('vb-node', { hasText: 'Changed in one batch.' })).toHaveCount(50);
  const c = await counts(page);
  console.log(`[N12] 50-card batch: ${JSON.stringify({ ...c, containers: c.containers.join(',') })}`);
  expect([c.cardsUpdated, c.cardsMeasured]).toEqual([50, 50]);
  expect([...c.containers].sort()).toEqual([regionId(3), regionId(7)]);
  expect(c.containersLaidOut).toBe(2);
  expect(c.fullFetches).toBe(0);
});

test('1 card changed: 1 updated and measured, 1 container laid out, only links near it redrawn', async ({ page, request }) => {
  await open(page);
  const last = BIG.regions;
  const a = await agentHolding(page, request, [regionId(last)]);
  await counts(page);
  await reset(page);
  await redraw(page, request, a, [numbersOf(last)[10]!], 'Changed on its own.');
  await expect(page.locator('vb-node', { hasText: 'Changed on its own.' })).toHaveCount(1);
  const c = await counts(page);
  console.log(`[N12] 1-card change: ${JSON.stringify({ ...c, containers: c.containers.join(',') })}`);
  expect([c.cardsUpdated, c.cardsMeasured, c.containersLaidOut, c.fullFetches]).toEqual([1, 1, 1, 0]);
  expect(c.containers).toEqual([regionId(last)]);
  // The last container moves nothing after it: at most its own cards and links change.
  expect(c.cardsPlaced).toBeLessThanOrEqual(BIG.perRegion);
  expect(c.linksRedrawn).toBeLessThanOrEqual(BIG.perRegion - 1);
});

test('one act on the 1,000-card board is shown in under 50 ms, updating one card', async ({ page }) => {
  await open(page);
  await counts(page);
  const times: number[] = [];
  // Five cards spread over the board, each the first open one with Acknowledge from a starting point.
  for (const from of [5, 205, 405, 605, 805]) {
    await reset(page);
    times.push(await page.evaluate(async (start) => {
      const el = [...document.querySelectorAll<HTMLElement>('vb-node')].slice(start)
        .find((e) => e.querySelector('button[data-act="ack"][aria-pressed="false"]'))!;
      const done = new Promise<void>((resolve) => {
        new MutationObserver((_m, o) => { if (el.dataset.status === 'acknowledged') { o.disconnect(); resolve(); } })
          .observe(el, { attributes: true, attributeFilter: ['data-status'] });
      });
      const t = performance.now();
      el.querySelector<HTMLButtonElement>('button[data-act="ack"]')!.click();
      await done;
      return performance.now() - t;
    }, from));
    const c = await counts(page);
    expect([c.cardsUpdated, c.fullFetches]).toEqual([1, 0]);
  }
  const sorted = [...times].sort((x, y) => x - y);
  console.log(`[N12] one act shown: ${times.map((t) => t.toFixed(1)).join(', ')} ms (median ${sorted[2]!.toFixed(1)})`);
  expect(sorted[2]!).toBeLessThan(50);
});

test('cards off screen are cheap, keep their name and order, and draw again when brought into view', async ({ page }) => {
  await open(page);
  await counts(page);
  const off = page.locator('vb-node[data-offscreen]');
  expect(await off.count()).toBeGreaterThan(0);
  expect(await page.locator('vb-node:not([data-offscreen])').count()).toBeGreaterThan(0);
  // They keep reading order (items by number, then the rest) and their names.
  const items = await page.locator('vb-node').evaluateAll((els) =>
    els.map((e) => (e.getAttribute('aria-label')?.startsWith('Item ') ? Number((e as HTMLElement).dataset.id) : null)));
  const numbered = items.filter((n): n is number => n !== null);
  expect(items.slice(0, numbered.length)).toEqual([...numbered].sort((x, y) => x - y));
  const far = off.last();
  await expect(far).toHaveAttribute('aria-label', /\w+: \S/);
  const id = await far.getAttribute('data-id');
  await far.focus();
  await expect(page.locator(`vb-node[data-id="${id}"]`)).not.toHaveAttribute('data-offscreen');
});
