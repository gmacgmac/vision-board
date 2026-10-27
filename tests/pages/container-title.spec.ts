// A container's title centred, sliding left, draggable (open list and container title FE_02, PLAN §
// Proposed Solution 2-3; the maintainer, 2026-10-19): the label (grip, title, count) sits in the
// middle of the frame's top line; as the frame narrows on screen (zooming out) it slides left before
// it would touch the tools, then starts at the frame's start and its title is cut. A drag on the
// grip, the title or the count moves the container and pins it (at any zoom; the grip hides zoomed
// out, the title doesn't); a click on the title still clears the selection; the line's empty part and
// Cmd or Ctrl + drag still pan. Hovering the title tints the grip and the title together. On a board of
// its own, drawn through the API by an agent.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { draw, write } from './agent-board.ts';
import type { Drawn } from './agent-board.ts';
import { expect, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { lc, pixel, resolved } from './apca.ts';

type Point = { x: number; y: number };
const TITLE = 'Pricing questions for the plans';

/** One container, four cards in a row under TITLE; `query` is the page's address query (flags). */
async function board(page: Page, request: APIRequestContext, query = ''): Promise<Drawn> {
  const d = await draw(request, 0, 'title');
  const out = await write(request, d, [
    { type: 'region', region: { id: 'p', title: TITLE, mode: 'row' } },
    ...[1, 2, 3, 4].map((i) => ({ type: 'node', node: { region: 'p', kind: 'question', title: `Card ${i}?` } })),
  ]);
  const drawn = { ...d, n: out.slice(1).map((x) => x.n!) };
  await page.goto(`/${query}#${d.board}`);
  await expect(page.locator('vb-node')).toHaveCount(4);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
  return drawn;
}

const frame = (page: Page) => page.locator('vb-region[data-region="p"]');
const title = (page: Page) => frame(page).locator('.vb-region-head h2');
const zoom = (page: Page) => page.locator('.vb-world').evaluate((w) => new DOMMatrix(getComputedStyle(w).transform).a);
const centre = (b: { x: number; y: number; width: number; height: number }): Point => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
const boxOf = async (l: Locator) => (await l.boundingBox())!;
const api = (page: Page, path: string) => page.request.get(`/api${path}`).then((r) => r.json());
const head = async (page: Page, d: Drawn) => (await api(page, `/boards/${d.board}`)).head as number;
const pins = async (page: Page, d: Drawn) => ((await api(page, `/boards/${d.board}`)).state.containerPins ?? {}) as Record<string, Point>;
const acts = async (page: Page, d: Drawn, after: number) => ((await api(page, `/ledger?after=${after}&board=${d.board}`)).events as Record<string, unknown>[])
  .filter((e) => e.type !== 'seen');

/** Zoom to `k` by Ctrl + wheel over the title (one turn lands on k), then move the pointer away. */
async function zoomTo(page: Page, k: number): Promise<void> {
  const at = centre(await boxOf(title(page)));
  await page.mouse.move(at.x, at.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -Math.log(k / await zoom(page)) / 0.0015);
  await page.keyboard.up('Control');
  await expect.poll(() => zoom(page)).toBeCloseTo(k, 2);
  await page.mouse.move(2, 990);
}

/** Press on `from`, move by `d` in steps, let go (with `key` held, when given). */
async function drag(page: Page, from: Point, d: Point, key?: string): Promise<void> {
  await page.mouse.move(from.x, from.y);
  if (key) await page.keyboard.down(key);
  await page.mouse.down();
  await page.mouse.move(from.x + d.x, from.y + d.y, { steps: 10 });
  await page.mouse.up();
  if (key) await page.keyboard.up(key);
}

/** Where the label sits on the line, on screen. */
interface Place { frameMid: number; labelMid: number; labelLeft: number; labelRight: number; headLeft: number; toolsLeft: number | null; cut: boolean }
const place = (f: Locator) => f.evaluate((e): Place => {
  const box = (s: string) => e.querySelector<HTMLElement>(s)!.getBoundingClientRect();
  const [f, label, line, tools] = [e.getBoundingClientRect(), box('.vb-region-label'), box('.vb-region-head'), box('.vb-region-tools')];
  const h2 = e.querySelector<HTMLElement>('.vb-region-head h2')!;
  return {
    frameMid: f.left + f.width / 2, labelMid: label.left + label.width / 2, labelLeft: label.left, labelRight: label.right,
    headLeft: line.left, toolsLeft: tools.width > 0 ? tools.left : null, cut: h2.scrollWidth > h2.clientWidth,
  };
});

// The tools on the top line (the toolRail flag off): with the rail the line holds the label alone,
// centred at every zoom (container-rail.spec.ts).
test('the label is centred at 100%, slides left before it would touch the tools, starts the line zoomed out, cut at the far end', async ({ page, request }) => {
  await board(page, request, '?flags=-toolRail');
  const ks = [1, 0.9, 0.8, 0.7, 0.6, 0.56, 0.5, 0.4, 0.3, 0.2];
  const seen: Record<string, Place> = {};
  for (const k of ks) {
    await zoomTo(page, k);
    seen[k] = await place(frame(page));
  }
  const at = (k: number) => seen[k]!;
  // Centred on the frame, whole.
  expect(Math.abs(at(1).labelMid - at(1).frameMid)).toBeLessThanOrEqual(2);
  expect(at(1).cut).toBe(false);
  // Never on the tools, at any zoom where they show.
  expect(ks.filter((k) => at(k).toolsLeft !== null && at(k).labelRight > at(k).toolsLeft!).map((k) => [k, at(k)])).toEqual([]);
  // Sliding: between the centre and the start at 70% (the frame too narrow on screen to centre the
  // label beside the tools); zooming out only ever moves it towards the start.
  expect(at(0.7).toolsLeft).not.toBeNull();
  expect(at(0.7).labelMid).toBeLessThan(at(0.7).frameMid - 2);
  expect(at(0.7).labelLeft).toBeGreaterThan(at(0.7).headLeft + 1);
  for (const [a, b] of ks.slice(1).map((k, i) => [ks[i]!, k] as const))
    expect(at(b).labelLeft - at(b).headLeft, `${a} then ${b}`).toBeLessThanOrEqual(at(a).labelLeft - at(a).headLeft + 0.5);
  // Zoomed out (the tools gone) it starts the line; at the far end its title is cut ("…").
  for (const k of [0.5, 0.2]) expect([at(k).toolsLeft, Math.abs(at(k).labelLeft - at(k).headLeft) <= 1], `${k}`).toEqual([null, true]);
  expect(at(0.2).cut).toBe(true);
});

test('a drag on the title moves the container and pins it, at 100% and zoomed out; Alt+arrows on the grip still move it', async ({ page, request }) => {
  const d = await board(page, request);
  const before = await head(page, d);
  const f0 = await boxOf(frame(page));
  await drag(page, centre(await boxOf(title(page))), { x: 60, y: 40 });
  await expect.poll(() => pins(page, d).then((p) => Object.keys(p))).toEqual(['p']);
  await expect(frame(page)).not.toHaveAttribute('data-dragging', '');
  // The drop is written in board units, rounded, so the frame lands within a pixel of the pointer.
  const f1 = await boxOf(frame(page));
  expect(Math.abs(f1.x - f0.x - 60) <= 1 && Math.abs(f1.y - f0.y - 40) <= 1, JSON.stringify([f0, f1])).toBe(true);
  expect((await acts(page, d, before)).map((e) => [e.action, e.region])).toEqual([['pin', 'p']]);
  // As the grip does: the grip has focus after the move, so Alt+arrows go on from there.
  await expect(frame(page).locator('.vb-region-grip')).toBeFocused();
  await page.keyboard.press('Alt+ArrowRight');
  await expect.poll(async () => (await acts(page, d, before)).length).toBe(2);
  // Zoomed out the grip leaves the line; the title still moves the container.
  await zoomTo(page, 0.4);
  await expect(page.locator('#stage')).toHaveAttribute('data-zoom', 'far');
  await expect(frame(page).locator('.vb-region-grip')).toBeHidden();
  const [p0, z0] = [(await pins(page, d)).p!, await boxOf(frame(page))];
  await drag(page, centre(await boxOf(title(page))), { x: 40, y: 30 });
  await expect.poll(async () => (await acts(page, d, before)).length).toBe(3);
  const [p1, z1] = [(await pins(page, d)).p!, await boxOf(frame(page))];
  expect(Math.abs(z1.x - z0.x - 40) <= 1 && Math.abs(z1.y - z0.y - 30) <= 1, JSON.stringify([z0, z1])).toBe(true);
  expect(Math.abs(p1.x - p0.x - 40 / 0.4)).toBeLessThanOrEqual(1);
  expect(Math.abs(p1.y - p0.y - 30 / 0.4)).toBeLessThanOrEqual(1);
});

test('a click on the title still clears the selection and writes nothing; the line\'s empty part and Cmd + drag still pan', async ({ page, request }) => {
  const d = await board(page, request);
  const before = await head(page, d);
  const card = page.locator(`vb-node[data-id="${d.n[0]}"]`);
  await card.locator('.vb-node-title').click({ position: { x: 4, y: 4 } });
  await expect(card).toHaveAttribute('data-selected', '');
  await title(page).click();
  await expect(card).not.toHaveAttribute('data-selected', '');
  // The line left of the centred label is the frame's: a drag there pans the board.
  const line = await boxOf(frame(page).locator('.vb-region-head'));
  const f0 = await boxOf(frame(page));
  await drag(page, { x: line.x + 6, y: line.y + line.height / 2 }, { x: -80, y: 30 });
  const f1 = await boxOf(frame(page));
  expect([Math.round(f1.x - f0.x), Math.round(f1.y - f0.y)]).toEqual([-80, 30]);
  // Cmd (Ctrl elsewhere) + drag on the title pans too, as anywhere on the board.
  await drag(page, centre(await boxOf(title(page))), { x: 100, y: 0 }, process.platform === 'darwin' ? 'Meta' : 'Control');
  const f2 = await boxOf(frame(page));
  expect([Math.round(f2.x - f1.x), Math.round(f2.y - f1.y)]).toEqual([100, 0]);
  expect(await pins(page, d)).toEqual({});
  expect(await acts(page, d, before)).toEqual([]);
});

for (const theme of ['light', 'dark'] as Theme[]) {
  test(`hovering the title tints the grip and the title together, as the grip's hover does (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    await board(page, request);
    const handle = frame(page).locator('.vb-region-handle');
    const grip = frame(page).locator('.vb-region-grip');
    const bg = () => handle.evaluate((e) => getComputedStyle(e).backgroundColor);
    expect(await bg()).toBe('rgba(0, 0, 0, 0)');
    await title(page).hover();
    const tint = await pixel(page, await bg());
    expect(tint).toEqual(await pixel(page, await resolved(page, 'var(--vb-surface-sunken)')));
    // One box over the grip and the title (and the count); the grip's dots show; a hand to grab.
    const [h, g, t] = await Promise.all([handle, grip, title(page)].map(boxOf));
    for (const b of [g!, t!]) expect(b.x >= h!.x - 0.5 && b.x + b.width <= h!.x + h!.width + 0.5).toBe(true);
    expect(await title(page).evaluate((e) => getComputedStyle(e).cursor)).toBe('grab');
    expect(await grip.evaluate((e) => getComputedStyle(e, '::before').opacity)).toBe('1');
    // APCA (rule 3): the title is reading text on the tint (Lc 60), the grip's dots decoration (Lc 30).
    // The tint on the canvas is the grip's own hover look, the maintainer's pick: reported, not gated.
    const colour = async (l: Locator) => pixel(page, await l.evaluate((e) => getComputedStyle(e).color));
    const [text, dots] = [lc(await colour(title(page)), tint), lc(await colour(grip), tint)];
    const canvas = lc(tint, await pixel(page, await resolved(page, 'var(--vb-surface-canvas)')));
    test.info().annotations.push({ type: `${theme} on the tint`, description: `title Lc ${text.toFixed(1)}, dots Lc ${dots.toFixed(1)}, tint on canvas Lc ${canvas.toFixed(1)}` });
    expect(text).toBeGreaterThanOrEqual(60);
    expect(dots).toBeGreaterThanOrEqual(30);
  });
}

test('the gallery draws the three places with the board\'s own drawing: centred, slid left, at the start zoomed out', async ({ page }) => {
  await page.goto('/gallery.html');
  const at = (k: number) => place(page.locator(`section[data-pattern="region"] vb-region[data-region="align-title-${k}"]`));
  const [full, mid, far] = [await at(100), await at(70), await at(25)];
  expect(Math.abs(full.labelMid - full.frameMid)).toBeLessThanOrEqual(2);
  expect(mid.toolsLeft).not.toBeNull();
  expect([mid.labelMid < mid.frameMid - 2, mid.labelLeft > mid.headLeft + 1, mid.labelRight <= mid.toolsLeft!]).toEqual([true, true, true]);
  expect([Math.abs(far.labelLeft - far.headLeft) <= 1, far.toolsLeft]).toEqual([true, null]);
});

// A narrow line shows the count and each holder whole or not at all (VERIFY_01 finding 1, FIX_48):
// never a clipped sliver ("(" or "· W" beside the tools). Two frames of a board of their own, each held
// by its creator and "Second" by a second agent too: "Second" (the frame VERIFY_01 shot at 70%, here
// with three cards, so both holders show at 100%) and a one-card frame, the narrowest. At every step of a zoom-out from 100% to 20% each count and
// holder is either whole (its box all inside the line's clips, nothing of it cut, clear of the tools)
// or wholly out of sight (no box, or a box all outside the clips). Read with the pointer away.
type Seen = { part: string; state: 'whole' | 'gone' | 'sliver'; box: number[]; shown: number[] };
const parts = (f: Locator) => f.evaluate((e): Seen[] => {
  const tools = e.querySelector<HTMLElement>('.vb-region-tools')!.getBoundingClientRect();
  const shown = (p: HTMLElement): DOMRect => {
    let r = p.getBoundingClientRect();
    for (let a = p.parentElement; a && a !== e; a = a.parentElement) {
      const s = getComputedStyle(a);
      if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const m = s.overflowX === 'clip' || s.overflowY === 'clip' ? parseFloat(s.overflowClipMargin) || 0 : 0;
      const c = a.getBoundingClientRect();
      const [x0, x1] = s.overflowX === 'visible' ? [r.left, r.right] : [Math.max(r.left, c.left - m), Math.min(r.right, c.right + m)];
      const [y0, y1] = s.overflowY === 'visible' ? [r.top, r.bottom] : [Math.max(r.top, c.top - m), Math.min(r.bottom, c.bottom + m)];
      r = new DOMRect(x0, y0, Math.max(0, x1 - x0), Math.max(0, y1 - y0));
    }
    return r;
  };
  const cut = (p: HTMLElement) => [p, ...p.querySelectorAll<HTMLElement>('.vb-holder-name')].some((x) => x.scrollWidth > x.clientWidth + 0.5);
  return [...e.querySelectorAll<HTMLElement>('.vb-region-count, .vb-holder')].map((p) => {
    const [b, v] = [p.getBoundingClientRect(), shown(p)];
    const gone = b.width === 0 || b.height === 0 || v.width === 0 || v.height === 0;
    // Clear of the tools: no overlap with their box (on the line's right end, or the rail on the frame's
    // left edge with the toolRail flag).
    const clear = tools.width === 0 || b.right <= tools.left + 0.5 || b.left >= tools.right - 0.5 || b.bottom <= tools.top + 0.5 || b.top >= tools.bottom - 0.5;
    const whole = !gone && !cut(p) && Math.abs(v.width - b.width) < 0.5 && Math.abs(v.height - b.height) < 0.5 && clear;
    const part = p.classList.contains('vb-region-count') ? 'count' : `holder ${p.querySelector('.vb-holder-name')!.textContent}`;
    return { part, state: gone ? 'gone' : whole ? 'whole' : 'sliver', box: [b.left, b.width].map(Math.round), shown: [v.left, v.width].map(Math.round) };
  });
});

// With the rail (the toolRail flag, on by default) and with the row on the top line (off).
for (const query of ['', '?flags=-toolRail']) test(`a narrow line shows the count and each holder whole or not at all, at every zoom from 100% to 20%${query ? ', the row on the top line' : ''}`, async ({ page, request }) => {
  const d = await draw(request, 0, 'slivers');
  await write(request, d, [
    { type: 'region', region: { id: 'q', title: 'Second', mode: 'row' } },
    { type: 'region', region: { id: 'o', title: 'Release checklist for the spring launch', mode: 'row' } },
    ...[5, 6, 7].map((i) => ({ type: 'node', node: { region: 'q', kind: 'decision', title: `Decision ${i}` } })),
    { type: 'node', node: { region: 'o', kind: 'question', title: 'Ship it?' } },
  ]);
  await page.goto(`/${query}#${d.board}`);
  await expect(page.locator('vb-node')).toHaveCount(4);
  // A second holder on "Second": an agent asks for it and the person grants it.
  const b = await (await request.post('/api/agents', { data: { label: 'Launch chat' } })).json() as { secret: string };
  const ask = await request.post('/api/grants', { headers: { Authorization: `Bearer ${b.secret}` }, data: { board: d.board, region: 'q', reason: 'Add items.' } });
  expect(ask.status(), await ask.text()).toBe(201);
  const granted = await page.request.post(`/api/boards/${d.board}/act`, { data: { type: 'act', action: 'grant', request: (await ask.json() as { request: number }).request } });
  expect(granted.status(), await granted.text()).toBe(201);
  const [q, o] = [page.locator('vb-region[data-region="q"]'), page.locator('vb-region[data-region="o"]')];
  await expect(q.locator('.vb-holder')).toHaveCount(2);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
  const zoomAt = async (k: number) => {
    const at = centre(await boxOf(q.locator('.vb-region-head h2')));
    await page.mouse.move(at.x, at.y);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -Math.log(k / await zoom(page)) / 0.0015);
    await page.keyboard.up('Control');
    await expect.poll(() => zoom(page)).toBeCloseTo(k, 2);
    await page.mouse.move(2, 990);
  };
  const [slivers, states, sweep] = [[] as string[], new Set<string>(), [] as string[]];
  const ks = [1, 0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.56, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2];
  for (const k of ks) {
    await zoomAt(k);
    for (const [id, f] of [['q', q], ['o', o]] as const) {
      for (const s of await parts(f)) {
        states.add(`${id} ${s.part} ${s.state}`);
        sweep.push(`${Math.round(k * 100)}% ${id} ${s.part} ${s.state}`);
        if (s.state === 'sliver') slivers.push(`${id} at ${Math.round(k * 100)}%: ${JSON.stringify(s)}`);
      }
    }
  }
  test.info().annotations.push({ type: 'sweep', description: sweep.join('; ') });
  expect(slivers).toEqual([]);
  // The sweep saw both: whole with room, and out of sight in the narrow lines.
  for (const s of ['o count whole', 'o count gone', 'q holder Pricing chat whole', 'q holder Pricing chat gone', 'q holder Launch chat whole', 'q holder Launch chat gone'])
    expect([...states], s).toContain(s);
  // Out of sight, but still read out: at zooms where the controls show and the one-card frame's count,
  // then "Second"'s second holder, is out of sight, each stays in the accessible tree, as before. With
  // the rail the line is the label's alone, so neither goes out of sight while the controls show.
  if (!query) return;
  const goneAt = (part: string) => ks.find((x) => x >= 0.56 && sweep.includes(`${Math.round(x * 100)}% ${part} gone`));
  const [countGone, holderGone] = [goneAt('o count'), goneAt('q holder Launch chat')];
  expect([countGone, holderGone], sweep.join('; ')).not.toContain(undefined);
  await zoomAt(countGone!);
  await expect(o.locator('.vb-region-count')).toHaveAttribute('title', '0 of 1 answered');
  await expect(o.locator('.vb-region-count-words')).toHaveText('0 of 1 answered');
  await expect(o.locator('.vb-region-count-words')).not.toHaveCSS('display', 'none');
  await zoomAt(holderGone!);
  const holder = q.getByRole('button', { name: 'Launch chat: remove access' });
  await expect(holder).toHaveCount(1);
  // Keyboard focus brings a holder out of sight back whole, the title giving way to it (WCAG 2.4.11).
  await holder.focus();
  await expect(holder).toHaveCSS('outline-style', 'solid');
  expect((await parts(q)).filter((x) => x.part === 'holder Launch chat').map((x) => x.state)).toEqual(['whole']);
  await expect(holder.locator('.vb-holder-remove')).toBeVisible();
});
