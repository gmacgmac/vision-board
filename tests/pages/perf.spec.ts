// The board's performance budgets (N12_FE_01, docs/specification/performance.md): a 1,000-card
// board on its own server (servers.ts, `#format/testing` perfLedger), opened with `?vbwork` so the
// page exposes its work counters (`window.__vbWork`, apps/board/src/board/work.ts). The counting
// tests count the work a change costs, not only its time: put back a whole-board rebuild and
// they fail.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, test } from './helpers.ts';
import { BIG } from '#format/testing';
import { PERF_BASE } from './ports.ts';

const CARDS = BIG.regions * BIG.perRegion;

interface Counts {
  cardsUpdated: number; cardsMeasured: number; cardsPlaced: number; containersLaidOut: number;
  linksRedrawn: number; fullFetches: number; framesUpdated: number; containers: string[]; firstDrawMs: number | null;
}

/** Wait until the page has nothing in flight, then read its counters. */
const counts = (page: Page): Promise<Counts> => page.evaluate(async () => {
  const hook = (window as unknown as { __vbWork: { idle(): Promise<void>; work: Counts } }).__vbWork;
  await hook.idle();
  return structuredClone(hook.work);
});
const reset = (page: Page) => page.evaluate(() => (window as unknown as { __vbWork: { reset(): void } }).__vbWork.reset());

/** Bring card `el` into view as the keyboard does: focus moved after a key press pans an off-screen
 *  card in (review-polish ruling 11); a focus after a click, or with no input yet, moves nothing. */
async function bringIn(page: Page, el: Locator): Promise<void> {
  await page.keyboard.press('Shift');
  await el.focus();
}

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
    const { id: _id, n: _n, ...node } = view.view.nodes.find((x) => x.id === String(n))!;
    const body = `${node.body ?? ''}\n\n${line}`.trim();
    return { type: 'node', n, base: view.versions[String(n)], node: { ...node, body } };
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

// Review polish ruling 2 (FE_02): a container's top line keeps its on-screen size by a counter-transform
// read from one value the viewport writes on the world (--vb-zoom), so a zoom step updates no card and
// no frame and lays nothing out; the style and layout it costs stay inside the one-change budget.
test('a zoom step on the 1,000-card board is under 50 ms and updates no card or frame', async ({ page }) => {
  await open(page);
  await counts(page);
  await reset(page);
  const times = await page.evaluate(() => {
    const head = document.querySelector('vb-region .vb-region-head')!;
    const step = (key: string) => {
      const t = performance.now();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      head.getBoundingClientRect(); // the style and layout the next frame needs
      return performance.now() - t;
    };
    return ['-', '-', '-', '-', '+', '+', '+', '+', '+', '+', '-'].map(step);
  });
  const c = await counts(page);
  expect([c.cardsUpdated, c.containersLaidOut, c.framesUpdated, c.fullFetches]).toEqual([0, 0, 0, 0]);
  const sorted = [...times].sort((x, y) => x - y);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  console.log(`[FE_02] zoom step: ${times.map((t) => t.toFixed(1)).join(', ')} ms (median ${median.toFixed(1)})`);
  expect(median).toBeLessThan(50);
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
  await bringIn(page, far);
  await expect(page.locator(`vb-node[data-id="${id}"]`)).not.toHaveAttribute('data-offscreen');
});

// 3_FE_01 ruling 10: selecting is view state, so it touches only the cards whose state changed:
// no measuring, no placing, no layout, no fetch.
test('selecting 50 cards updates exactly those 50 and lays out none; clearing updates the same 50', async ({ page }) => {
  // Its budget is the counts, not the clock: fifty rounds of key, focus and click take about 26 s
  // alone at low priority, so the default 30 s failed it under any load (tracker M29).
  test.setTimeout(90_000);
  await open(page);
  await counts(page);
  await reset(page);
  // The 50 cards of one container, each brought in first (a key's focus pans it into view, which
  // costs no card work), then clicked on its title: the first alone, the rest with Shift.
  const ns = numbersOf(4);
  for (const [i, n] of ns.entries()) {
    const el = page.locator(`vb-node[data-id="${n}"]`);
    await bringIn(page, el);
    await el.locator('.vb-node-title').click({ modifiers: i === 0 ? [] : ['Shift'] });
  }
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(50);
  await expect(page.locator('#selection-status')).toHaveText('50 cards selected');
  const c = await counts(page);
  console.log(`[3_FE_01] select 50: ${JSON.stringify({ ...c, containers: c.containers.join(',') })}`);
  expect([c.cardsUpdated, c.cardsMeasured, c.cardsPlaced, c.containersLaidOut, c.fullFetches]).toEqual([50, 0, 0, 0, 0]);
  // linksRedrawn is not asserted: focus moved card to card, and focus lights a card's connectors.
  await reset(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(0);
  const cleared = await counts(page);
  expect([cleared.cardsUpdated, cleared.cardsMeasured, cleared.cardsPlaced, cleared.containersLaidOut]).toEqual([50, 0, 0, 0]);
});

// 3_FE_02 ruling 7: a lasso over 50 cards updates exactly those 50 and lays out none; the lasso box
// and the selection bar redraw without touching any card, while drawing and while panning.
test('a lasso over the 50 cards of one container updates those 50 and lays out none; the bar follows a pan for free', async ({ page }) => {
  await open(page);
  await counts(page);
  // r05 (regions[4]): index 4 % 4 = 0, the roadmap's grid-mode region (3 columns) repeated — a
  // lasso needs a compact box on screen, which only the grid regions give at 50 cards; the flow,
  // radial and lanes regions run far wider than any viewport.
  const region = 5;
  const corners = [numbersOf(region)[0]!, numbersOf(region).at(-1)!];
  for (const [i, n] of corners.entries()) {
    const el = page.locator(`vb-node[data-id="${n}"]`);
    await bringIn(page, el);
    await el.locator('.vb-node-title').click({ modifiers: i === 0 ? [] : ['Shift'] });
  }
  await page.keyboard.press('z');
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(0);
  const f = (await page.locator(`vb-region[data-region="${regionId(region)}"]`).boundingBox())!;
  await reset(page);
  await page.keyboard.down('Shift');
  await page.mouse.move(f.x + 2, f.y + 2);
  await page.mouse.down();
  await page.mouse.move(f.x + f.width - 2, f.y + f.height - 2, { steps: 12 });
  const drawing = await counts(page);
  expect([drawing.cardsUpdated, drawing.cardsMeasured, drawing.cardsPlaced, drawing.containersLaidOut]).toEqual([0, 0, 0, 0]);
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(50);
  expect(await page.locator('vb-node[data-selected]').evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.id))
    .sort((a, b) => a - b))).toEqual(numbersOf(region));
  await expect(page.locator('vb-selection-bar')).toBeVisible();
  const c = await counts(page);
  console.log(`[3_FE_02] lasso 50: ${JSON.stringify({ ...c, containers: c.containers.join(',') })}`);
  expect([c.cardsUpdated, c.cardsMeasured, c.cardsPlaced, c.containersLaidOut, c.fullFetches]).toEqual([50, 0, 0, 0, 0]);
  // A wheel pan moves the bar with the board and touches no card. Checked on two adjacent cards
  // (one row): the 50-card box used above is taller than the viewport even when fit, so its bar
  // stays clamped to the stage's top edge through a small pan and the move would not show.
  await page.keyboard.press('Escape');
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(0);
  const near = [numbersOf(region)[0]!, numbersOf(region)[1]!];
  for (const [i, n] of near.entries()) {
    const el = page.locator(`vb-node[data-id="${n}"]`);
    await bringIn(page, el);
    await el.locator('.vb-node-title').click({ modifiers: i === 0 ? [] : ['Shift'] });
  }
  await page.keyboard.press('z');
  await page.waitForTimeout(450);
  await reset(page);
  const bar0 = (await page.locator('vb-selection-bar').boundingBox())!;
  await page.mouse.move(f.x + f.width / 2, f.y + f.height / 2);
  await page.mouse.wheel(0, 40);
  await expect.poll(async () => Math.round((await page.locator('vb-selection-bar').boundingBox())!.y)).toBe(Math.round(bar0.y - 40));
  const panned = await counts(page);
  expect([panned.cardsUpdated, panned.cardsMeasured, panned.cardsPlaced, panned.containersLaidOut]).toEqual([0, 0, 0, 0]);
});

// 3_FE_03 ruling 9: moving 50 cards between two containers updates exactly those 50 and lays out
// only the two containers; a frame of the drag touches no card and lays out nothing (the dragged
// cards' transforms are written by the drag itself, and the highlighted container is an attribute).
test('dragging 50 selected cards into another container updates those 50 and lays out only the two; a drag frame costs nothing', async ({ page }) => {
  await open(page);
  await counts(page);
  const region = 5;
  // As the lasso test: zoom to two corner cards so the grid container is large on the stage.
  for (const [i, n] of [numbersOf(region)[0]!, numbersOf(region).at(-1)!].entries()) {
    const el = page.locator(`vb-node[data-id="${n}"]`);
    await bringIn(page, el);
    await el.locator('.vb-node-title').click({ modifiers: i === 0 ? [] : ['Shift'] });
  }
  await page.keyboard.press('z');
  await page.keyboard.press('Escape');
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(0);
  const f = (await page.locator(`vb-region[data-region="${regionId(region)}"]`).boundingBox())!;
  await page.keyboard.down('Shift');
  await page.mouse.move(f.x + 2, f.y + 2);
  await page.mouse.down();
  await page.mouse.move(f.x + f.width - 2, f.y + f.height - 2, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(50);
  // Zoom out round the selection until a neighbouring container is wholly on the stage.
  await page.keyboard.press('z');
  const target = await page.evaluate(async (ids) => {
    const stage = document.getElementById('stage')!.getBoundingClientRect();
    const wait = () => new Promise((r) => setTimeout(r, 450));
    for (let i = 0; i < 8; i += 1) {
      for (const id of ids) {
        const el = document.querySelector<HTMLElement>(`vb-region[data-region="${id}"]`)!;
        const r = el.getBoundingClientRect();
        // The part of the frame on the stage, clear of the stage's edge.
        const b = { left: Math.max(r.left, stage.left + 10), top: Math.max(r.top, stage.top + 10),
          right: Math.min(r.right, stage.right - 10), bottom: Math.min(r.bottom, stage.bottom - 10) };
        for (let y = b.bottom - 6; y > b.top + 6; y -= 4) {
          for (let x = b.right - 6; x > b.left + 6; x -= 4) {
            if (document.elementFromPoint(x, y)?.closest('vb-region') === el) return { id, x, y };
          }
        }
      }
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '-', bubbles: true }));
      await wait();
    }
    throw new Error(`no neighbouring container on the stage: ${JSON.stringify(ids.map((id) => {
      const b = document.querySelector(`vb-region[data-region="${id}"]`)!.getBoundingClientRect();
      return [id, Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)];
    }))} stage ${JSON.stringify(stage)}`);
  }, [regionId(region - 1), regionId(region + 1), regionId(region + 4), regionId(region - 4)]);
  const tab = (await page.locator(`vb-node[data-id="${numbersOf(region)[0]}"] .vb-node-kind`).boundingBox())!;
  await page.mouse.move(tab.x + tab.width / 2, tab.y + tab.height / 2);
  await page.mouse.down();
  await page.mouse.move(tab.x + tab.width / 2 + 20, tab.y + tab.height / 2 + 20, { steps: 4 });
  await counts(page);
  await reset(page);
  await page.mouse.move(target.x, target.y, { steps: 12 });
  const frame = await counts(page);
  expect([frame.cardsUpdated, frame.cardsMeasured, frame.cardsPlaced, frame.containersLaidOut]).toEqual([0, 0, 0, 0]);
  await expect(page.locator(`vb-region[data-region="${target.id}"]`)).toHaveAttribute('data-drop', '');
  await reset(page);
  await page.mouse.up();
  await expect(page.locator('vb-node[data-pinned]')).toHaveCount(50);
  const c = await counts(page);
  console.log(`[3_FE_03] move 50: ${JSON.stringify({ ...c, containers: c.containers.join(',') })}`);
  expect([c.cardsUpdated, c.cardsMeasured, c.containersLaidOut, c.fullFetches]).toEqual([50, 50, 2, 0]);
  expect([...c.containers].sort()).toEqual([regionId(region), target.id].sort());
  const moved = await (await page.request.get(`${PERF_BASE}/api/boards/${BIG.board}`)).json() as { state: { moves?: Record<string, string> } };
  expect(Object.keys(moved.state.moves ?? {}).map(Number).sort((a, b) => a - b)).toEqual(numbersOf(region));
});

// 3_FE_04 ruling 9: a container drag changes only the frame's transform (and the carried cards'
// shared offset), so a frame of it touches no card, measures nothing and lays out nothing; the drop
// repacks only, re-measures nothing and redraws only the links of containers that moved; a note on
// a container updates only that container's frame.
test('a container drag frame costs nothing; the drop repacks only; a container note updates one frame', async ({ page }) => {
  await open(page);
  await counts(page);
  // Zoom to r01's first card so its frame's grip is on the stage at a usable size.
  const first = page.locator(`vb-node[data-id="${numbersOf(1)[0]}"]`);
  await bringIn(page, first);
  await first.locator('.vb-node-title').click();
  await page.keyboard.press('z');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(450);
  const frames = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('vb-region')]
    .map((f) => [f.dataset.region!, { box: f.style.transform, mode: f.dataset.mode! }])));
  const before = await frames();
  const g = (await page.locator(`vb-region[data-region="${regionId(1)}"] .vb-region-grip`).boundingBox())!;
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
  await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2 + 10, g.y + g.height / 2 + 10, { steps: 3 });
  await counts(page);
  await reset(page);
  await page.mouse.move(g.x + g.width / 2 + 40, g.y + g.height / 2 + 160, { steps: 12 });
  const frame = await counts(page);
  expect([frame.cardsUpdated, frame.cardsMeasured, frame.cardsPlaced, frame.containersLaidOut]).toEqual([0, 0, 0, 0]);
  await reset(page);
  await page.mouse.up();
  await expect.poll(async () => Object.keys((await (await page.request.get(`${PERF_BASE}/api/boards/${BIG.board}`)).json() as {
    state: { containerPins?: Record<string, unknown> } }).state.containerPins ?? {})).toEqual([regionId(1)]);
  const drop = await counts(page);
  const after = await frames();
  const moved = Object.keys(after).filter((id) => after[id]!.box !== before[id]?.box);
  const linksOfMoved = moved.reduce((sum, id) => sum + (after[id]!.mode === 'grid' ? 0 : BIG.perRegion - 1), 0);
  console.log(`[3_FE_04] container drop: ${JSON.stringify({ ...drop, containers: drop.containers.join(','), moved: moved.join(',') })}`);
  expect([drop.cardsUpdated, drop.cardsMeasured, drop.containersLaidOut, drop.fullFetches]).toEqual([0, 0, 0, 0]);
  expect(moved).toContain(regionId(1));
  expect(drop.linksRedrawn).toBeLessThanOrEqual(linksOfMoved);
  // A note on the container: one frame updated, no card, no layout, no link.
  await reset(page);
  const act = (body: object) => page.request.post(`${PERF_BASE}/api/boards/${BIG.board}/act`, { data: { type: 'act', board: BIG.board, region: regionId(1), ...body } });
  const note = await act({ action: 'comment', text: 'Is this container in the right place?' });
  expect(note.status(), await note.text()).toBe(201);
  await expect(page.locator(`vb-region[data-region="${regionId(1)}"]`)).toHaveAttribute('data-badge', 'unsent');
  const noted = await counts(page);
  expect([noted.cardsUpdated, noted.cardsMeasured, noted.cardsPlaced, noted.containersLaidOut, noted.linksRedrawn, noted.framesUpdated])
    .toEqual([0, 0, 0, 0, 0, 1]);
  // Leave the board as it was for the tests after this one.
  expect((await act({ action: 'note-remove', note: (await note.json() as { seq: number }).seq })).status()).toBe(201);
  expect((await act({ action: 'unpin' })).status()).toBe(201);
});
