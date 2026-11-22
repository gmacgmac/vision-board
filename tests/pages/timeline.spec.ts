// The timeline on the board (D-105, D-106; the timeline set's FE_02): a container's dated cards
// on one line across its top (a dot each, in date order, alternating, a band behind equal dates, the year at the start
// and the turn, the arrow), the rest below; a board with no key draws no line and no date; a dated card never moves under the pointer or the keys and writes no pin, while Move to,
// links, the widths switch and the direction row work on it as on any card, and Tab walks a timeline in date order; the
// line stays joined to its cards from 20% to 250%; both skins, light and dark, axe clean. Each test draws its own board through the API, as an agent would.
import type { APIRequestContext, Page } from '@playwright/test';
import { axeFindings, expect, expectNoAxeOnBoard, expectNoAxeViolations, openSelectionBar, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { act, joinAgent, open, write } from './agent-board.ts';
import { card, drag, frame, head, idle, linesAfter, panBy, scale, zoomToFull } from './board-page.ts';

const ON = '?vbwork';
const THEMES: Theme[] = ['dark', 'light'];
const LONG = 'Two hundred teams from the waitlist, in two waves a week apart; every reply is read by product and support together before the second wave goes out.';
/** The plan's cards in the order they are written (so card numbers are not date order): kind, title, date, more. */
const PLAN: [string, string, string?, object?][] = [
  ['action', 'Beta sign-off', '2026-11-03'],
  ['decision', 'Freeze the feature list', '2026-09-15'],
  ['topic', 'Private beta', '2026-10', { body: LONG }],
  ['question', 'Which region goes first?', '2026-11-03'],
  ['finding', 'Load test passed', '2026-11-12T09:30'],
  ['topic', '2.1: offline drafts', '2027', { icon: 'apps', tone: 'teal' }],
  ['action', 'Write the launch post'],
  ['risk', 'Support queue may double'],
];
const [SIGN, FREEZE, BETA, REGION, LOAD, DRAFTS, POST, QUEUE, RETRO] = [0, 1, 2, 3, 4, 5, 6, 7, 8];
/** The dated cards in date order: equal dates by card number (Beta sign-off was made first). */
const BY_DATE = [FREEZE, BETA, SIGN, REGION, LOAD, DRAFTS];
let boards = 0;

/** A board of its own: the plan as a row in `plan` (run `direction` if given), "After launch" (a grid with one dated
 *  card and one not), "Loose ends" (a grid with no date), and a link from Load test passed to Support queue. `dates`
 *  false writes the same board with no timeline key. `n` is the cards' numbers in writing order. */
async function drawPlan(request: APIRequestContext, o: { dates?: boolean; direction?: string } = {}) {
  const d = { agent: await joinAgent(request, 'Plan chat'), board: `plan-${Date.now()}-${(boards += 1)}` };
  const node = (region: string, [kind, title, timeline, more]: [string, string, string?, object?]) =>
    ({ type: 'node', node: { region, kind, title, ...(o.dates !== false && timeline && { timeline }), ...more } });
  const r = await write(request, d, [
    { type: 'board', title: 'Launch plan' },
    { type: 'region', region: { id: 'plan', title: 'Launch plan', mode: 'row', ...(o.direction && { direction: o.direction }) } },
    { type: 'region', region: { id: 'after', title: 'After launch', mode: 'grid' } },
    { type: 'region', region: { id: 'misc', title: 'Loose ends', mode: 'grid' } },
    ...PLAN.map((p) => node('plan', p)),
    node('after', ['topic', 'Retro', '2027-02']), node('after', ['topic', 'Plan 2.2']), node('misc', ['topic', 'Open questions']),
  ]);
  const n = r.slice(4).map((x) => x.n!);
  await write(request, d, [{ type: 'link', from: n[LOAD], to: n[QUEUE] }]);
  return { ...d, n };
}

/** A container's line (its bands, line, arrow and years), and each dated node's stem and dot, are groups of their own
 *  (links/timelines.ts; the dots in the layer's last group, above the links), so they move with their container and card. */
const LINES = 'svg.vb-wires .vb-timelines > g.vb-timeline:not([data-node])';
const line = (page: Page, region: string) => page.locator(`${LINES}[data-region="${region}"]`);
/** Each dot of `region`'s line, in drawn order: its card, side and centre on screen. */
const dots = (page: Page, region: string) => page.locator(`svg.vb-wires .vb-timeline-dots > g[data-region="${region}"] .vb-timeline-dot`).evaluateAll((els) => els.map((e) => {
  const r = e.getBoundingClientRect();
  return { node: (e as SVGElement).dataset.node!, side: (e as SVGElement).dataset.side!, x: r.x + r.width / 2, y: r.y + r.height / 2 };
}));
/** In the page: how far, in screen pixels, each stem misses the middle of its card's facing edge, its dot the stem's end,
 *  or the dot its container's line. */
function missesIn(region: string): number[] {
  const at = (r: DOMRect) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  const lineEl = document.querySelector(`svg.vb-wires .vb-timelines > g:not([data-node])[data-region="${region}"] .vb-timeline-line`);
  if (!lineEl) return [];
  const l = lineEl.getBoundingClientRect();
  return [...document.querySelectorAll<SVGElement>(`svg.vb-wires .vb-timelines > g[data-node][data-region="${region}"]`)].map((g) => {
    const dotEl = document.querySelector<SVGElement>(`svg.vb-wires .vb-timeline-dots > g[data-node="${g.dataset.node}"] .vb-timeline-dot`)!;
    const [s, o] = [g.querySelector('.vb-timeline-stem')!.getBoundingClientRect(), dotEl.getBoundingClientRect()];
    const c = document.querySelector(`vb-node[data-id="${g.dataset.node}"]`)!.getBoundingClientRect();
    const [sc, oc, cc] = [at(s), at(o), at(c)];
    const across = { above: [s.top - c.bottom, sc.x - cc.x, oc.y - s.bottom, oc.y - at(l).y], below: [s.bottom - c.top, sc.x - cc.x, oc.y - s.top, oc.y - at(l).y] };
    const down = { left: [s.left - c.right, sc.y - cc.y, oc.x - s.right, oc.x - at(l).x], right: [s.right - c.left, sc.y - cc.y, oc.x - s.left, oc.x - at(l).x] };
    return Math.max(...({ ...across, ...down } as Record<string, number[]>)[dotEl.dataset.side!]!.map(Math.abs));
  });
}
const misses = (page: Page, region: string) => page.evaluate(missesIn, region);
/** Open board `d` with `query`: from a blank page, since a new hash alone does not switch the page's board. */
const openOn = async (page: Page, d: { board: string; n: number[] }, query = ON) => { await page.goto('about:blank'); await open(page, d, query); };
const boxOf = async (page: Page, i: number, n: number[]) => (await card(page, n[i]!).boundingBox())!;
const markup = (page: Page) => page.locator('svg.vb-wires').first().evaluate((s) => [...s.querySelectorAll('.vb-timelines, .vb-timeline-dots')].map((g) => g.innerHTML).join(''));

test('the line: a dot per dated card in date order, alternating, a band behind the equal pair, the years, the arrow; the rest below', async ({ page, request }) => {
  const d = await drawPlan(request);
  await open(page, d, ON);
  await idle(page);
  const at = await dots(page, 'plan');
  expect(at.map((x) => x.node)).toEqual(BY_DATE.map((i) => String(d.n[i])));
  expect(at.map((x) => x.side)).toEqual(['above', 'below', 'above', 'below', 'above', 'below']);
  expect(at.every((x, i) => i === 0 || x.x > at[i - 1]!.x), 'left to right').toBe(true);
  const band = (await line(page, 'plan').locator('.vb-timeline-band').boundingBox())!;
  expect(Math.abs(band.x - at[2]!.x) + Math.abs(band.x + band.width - at[3]!.x), 'the band runs from one equal date to the other').toBeLessThan(12);
  await expect(line(page, 'plan').locator('.vb-timeline-year')).toHaveText(['2026', '2027']);
  const turn = (await line(page, 'plan').locator('.vb-timeline-year').nth(1).boundingBox())!;
  expect(turn.x > at[4]!.x && turn.x + turn.width < at[5]!.x, 'the year turns between November and 2027').toBe(true);
  await expect(line(page, 'plan').locator('.vb-timeline-arrow')).toHaveCount(1);
  expect(Math.max(...await misses(page, 'plan')), 'every stem meets its card and its dot').toBeLessThan(1.5);
  for (const i of BY_DATE) await expect(card(page, d.n[i]!).locator('.vb-node-date')).toHaveCount(1);
  // The other cards below the line, in the row; a container with no date has no line.
  const lowest = Math.max(...await Promise.all(BY_DATE.map(async (i) => { const b = await boxOf(page, i, d.n); return b.y + b.height; })));
  for (const i of [POST, QUEUE]) expect((await boxOf(page, i, d.n)).y).toBeGreaterThan(lowest);
  expect((await boxOf(page, POST, d.n)).y).toBe((await boxOf(page, QUEUE, d.n)).y);
  await expect(line(page, 'misc')).toHaveCount(0);
  expect(await dots(page, 'after')).toHaveLength(1);
});

test('a board with no key draws as before: no line, no date header, no date in a name', async ({ page, request }) => {
  const plain = await drawPlan(request, { dates: false });
  await openOn(page, plain);
  await idle(page);
  await expect(page.locator('.vb-timeline')).toHaveCount(0);
  await expect(page.locator('.vb-node-date, vb-node[data-timeline]')).toHaveCount(0);
  await expect(card(page, plain.n[SIGN]!)).toHaveAccessibleName(new RegExp(`^Item ${plain.n[SIGN]}, Action: Beta sign-off, Open`));
});

test('a dated card\'s name carries its full date after its kind; an undated card\'s does not', async ({ page, request }) => {
  const d = await drawPlan(request);
  await open(page, d, ON);
  await idle(page);
  const name = (i: number, rest: string) => expect(card(page, d.n[i]!)).toHaveAccessibleName(new RegExp(`^Item ${d.n[i]}, ${rest}`));
  await name(SIGN, 'Action, 3 November 2026: Beta sign-off, Open');
  await name(BETA, 'Topic, October 2026: Private beta');
  await name(LOAD, 'Finding, 12 November 2026, 09:30: Load test passed');
  await name(DRAFTS, 'Topic, 2027: 2\\.1: offline drafts');
  await name(POST, 'Action: Write the launch post, Open');
});

/** The page's text selection, as a copy would take it. */
const selected = (page: Page) => page.evaluate(() => String(document.getSelection() ?? ''));

test('a dated card\'s date is said once: copying its content gives the short date only, its name the full one (602)', async ({ page, request, context }) => {
  const d = await drawPlan(request);
  await open(page, d, ON);
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(page.url()).origin });
  await idle(page);
  for (const skin of ['default', 'command-lens']) {
    if (skin !== 'default') {
      await act(page, d, { action: 'skin', board: d.board, skin });
      await expect(card(page, d.n[SIGN]!)).toHaveAttribute('data-marks-at', 'plate');
      await idle(page);
    }
    for (const [i, short, full] of [[SIGN, /nov 3/gi, '3 November 2026'], [LOAD, /nov 12 · 09:30/gi, '12 November 2026, 09:30']] as const) {
      // A real copy (the keys, then the clipboard): the selection's own text leaves out a visually hidden form; a copy does not.
      await card(page, d.n[i]!).locator('.vb-node-content').evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        document.getSelection()!.removeAllRanges();
        document.getSelection()!.addRange(range);
      });
      await page.keyboard.press('ControlOrMeta+C');
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      expect(copied.match(short)?.length, `${skin}: ${copied}`).toBe(1);
      expect(copied, skin).not.toContain(full);
      await expect(card(page, d.n[i]!).locator('.vb-node-date time')).toHaveAttribute('datetime', /^2026-11/);
      await expect(card(page, d.n[i]!)).toHaveAccessibleName(new RegExp(`, ${full}: `));
    }
  }
});

test('a drag where an undated card would move selects no text on a dated card, in both skins; its text stays selectable', async ({ page, request }) => {
  const d = await drawPlan(request);
  await open(page, d, ON);
  await idle(page);
  const none = async (from: { x: number; y: number }) => {
    await drag(page, from, { x: from.x + 160, y: from.y + 220 });
    expect(await selected(page), 'nothing selected, nothing to copy').toBe('');
  };
  for (const i of [FREEZE, SIGN]) {
    const b = await boxOf(page, i, d.n);
    await none({ x: b.x + b.width / 2, y: b.y + 3 }); // the top edge, where an undated card's kind tab is
  }
  // Text inside a dated card selects as on any card.
  const title = (await card(page, d.n[SIGN]!).locator('.vb-node-title').boundingBox())!;
  await drag(page, { x: title.x + 2, y: title.y + title.height / 2 }, { x: title.x + title.width - 2, y: title.y + title.height / 2 });
  expect(await selected(page)).toContain('sign');
  await page.mouse.click(5, 300); // the background clears it
  await act(page, d, { action: 'skin', board: d.board, skin: 'command-lens' });
  await expect(card(page, d.n[FREEZE]!)).toHaveAttribute('data-marks-at', 'plate');
  await idle(page);
  const plate = (await card(page, d.n[FREEZE]!).locator('.vb-node-plate').boundingBox())!;
  await none({ x: plate.x + plate.width / 2, y: plate.y + plate.height / 2 });
});

test('a drag anywhere on a dated card moves nothing and writes nothing, in both skins; Alt+arrows neither', async ({ page, request }) => {
  const d = await drawPlan(request);
  await open(page, d, ON);
  const was = await markup(page);
  const still = async (i: number, from: { x: number; y: number }) => {
    const [b, before] = [await boxOf(page, i, d.n), await head(page)];
    await drag(page, from, { x: from.x + 160, y: from.y + 220 });
    await idle(page);
    expect(await head(page), 'nothing written').toBe(before);
    expect(await boxOf(page, i, d.n)).toEqual(b);
    expect(await markup(page)).toBe(was);
  };
  for (const i of [FREEZE, SIGN]) {
    const b = await boxOf(page, i, d.n);
    await still(i, { x: b.x + b.width / 2, y: b.y + 3 }); // the top edge, where an undated card's kind tab is
  }
  await card(page, d.n[BETA]!).focus();
  const before = await head(page);
  for (const key of ['Alt+ArrowRight', 'Alt+ArrowDown']) await page.keyboard.press(key);
  await idle(page);
  expect(await head(page)).toBe(before);
  // A pin written on a dated card all the same (an older page, the API): the layout ignores it.
  const b = await boxOf(page, BETA, d.n);
  await act(page, d, { action: 'pin', n: d.n[BETA], x: 600, y: 600 });
  await idle(page);
  expect(await boxOf(page, BETA, d.n)).toEqual(b);
  await act(page, d, { action: 'skin', board: d.board, skin: 'command-lens' });
  await expect(card(page, d.n[FREEZE]!)).toHaveAttribute('data-marks-at', 'plate');
  await idle(page);
  const plate = (await card(page, d.n[FREEZE]!).locator('.vb-node-plate').boundingBox())!;
  await expect(card(page, d.n[FREEZE]!).locator('.vb-node-plate')).toHaveCSS('cursor', 'default');
  const kept = await markup(page);
  const [fb, h] = [await boxOf(page, FREEZE, d.n), await head(page)];
  await drag(page, { x: plate.x + plate.width / 2, y: plate.y + plate.height / 2 }, { x: plate.x + 200, y: plate.y + 260 });
  await idle(page);
  expect(await head(page)).toBe(h);
  expect(await boxOf(page, FREEZE, d.n)).toEqual(fb);
  expect(await markup(page)).toBe(kept);
});

/** A point inside `region`'s frame that no card covers, near its bottom right. */
const emptyIn = (page: Page, region: string) => frame(page, region).evaluate((f) => {
  const b = f.getBoundingClientRect();
  for (let y = b.bottom - 14; y > b.top + 40; y -= 8) {
    for (let x = b.right - 14; x > b.left + 14; x -= 8) if (document.elementFromPoint(x, y)?.closest('vb-region') === f) return { x, y };
  }
  throw new Error('no free point in the frame');
});
const pick = (page: Page, n: number, add = false) =>
  card(page, n).locator('.vb-node-title').click({ position: { x: 4, y: 4 }, ...(add && { modifiers: ['Shift' as const] }) });

test('a selection drag of a dated and an undated card moves only the undated one; Reset places leaves the line as it is', async ({ page, request }) => {
  const d = await drawPlan(request);
  await open(page, d, ON);
  const was = await markup(page);
  const sign = await boxOf(page, SIGN, d.n);
  await pick(page, d.n[POST]!);
  await pick(page, d.n[SIGN]!, true);
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(2);
  const before = await head(page);
  const tab = (await card(page, d.n[POST]!).locator('.vb-node-kind').boundingBox())!;
  await drag(page, { x: tab.x + tab.width / 2, y: tab.y + tab.height / 2 }, await emptyIn(page, 'plan'));
  await idle(page);
  expect((await linesAfter(page, before)).map((e) => e.action), 'one pin, the undated card\'s').toEqual(['pin']);
  await expect(card(page, d.n[POST]!)).toHaveAttribute('data-pinned', '');
  await expect(card(page, d.n[SIGN]!)).not.toHaveAttribute('data-pinned', '');
  expect(await boxOf(page, SIGN, d.n)).toEqual(sign);
  await page.keyboard.press('r');
  await expect(card(page, d.n[POST]!)).not.toHaveAttribute('data-pinned', '');
  await idle(page);
  expect(await markup(page)).toBe(was);
});

test('Move to (Shift+M, and the bar\'s Move to) moves a dated card to another container, where it joins that line', async ({ page, request }) => {
  const d = await drawPlan(request);
  await open(page, d, ON);
  const menu = page.getByRole('menu', { name: /^Move \d+ cards? to$/ });
  await pick(page, d.n[BETA]!);
  const before = await head(page);
  await page.keyboard.press('Shift+M');
  await menu.getByRole('menuitem', { name: 'After launch' }).click();
  await expect.poll(async () => (await dots(page, 'after')).map((x) => x.node)).toEqual([String(d.n[BETA]), String(d.n[RETRO])]);
  expect((await linesAfter(page, before)).map((e) => e.action)).toEqual(['move']);
  expect((await dots(page, 'plan')).map((x) => x.node)).not.toContain(String(d.n[BETA]));
  await pick(page, d.n[FREEZE]!);
  await openSelectionBar(page);
  await page.locator('vb-selection-bar').getByRole('button', { name: 'Move to' }).click();
  await menu.getByRole('menuitem', { name: 'Loose ends' }).click();
  await expect.poll(async () => (await dots(page, 'misc')).map((x) => x.node)).toEqual([String(d.n[FREEZE])]);
  await idle(page);
  expect(Math.max(...await misses(page, 'misc'), ...await misses(page, 'after'))).toBeLessThan(1.5);
});

/** The cards a link's path runs inside (its own two ends aside), sampled every 4 px along it, on screen. */
const linkThrough = (page: Page, ends: string[]) => page.evaluate((ends) => {
  const p = document.querySelector<SVGPathElement>('svg.vb-wires:not(.vb-wires-top) path.vb-wire')!;
  const [len, m] = [p.getTotalLength(), p.getScreenCTM()!];
  return [...document.querySelectorAll<HTMLElement>('vb-node')].filter((c) => !ends.includes(c.dataset.id!)).flatMap((c) => {
    const r = c.getBoundingClientRect();
    for (let t = 0; t <= len; t += 4) {
      const q = p.getPointAtLength(t);
      const [x, y] = [m.a * q.x + m.e, m.d * q.y + m.f];
      if (x > r.left + 1 && x < r.right - 1 && y > r.top + 1 && y < r.bottom - 1) return [c.dataset.id!];
    }
    return [];
  });
}, ends);

test('a link from a card above the line to one below never runs through a card, both skins, across and down', async ({ page, request }) => {
  for (const skin of ['default', 'command-lens']) {
    for (const direction of ['across', 'down']) {
      const d = await drawPlan(request, { direction });
      await openOn(page, d);
      if (skin !== 'default') await act(page, d, { action: 'skin', board: d.board, skin });
      await expect(card(page, d.n[LOAD]!)).toHaveAttribute('data-marks-at', skin === 'default' ? 'edges' : 'plate');
      await idle(page);
      expect(await linkThrough(page, [String(d.n[LOAD]), String(d.n[QUEUE])]), `${skin} ${direction}`).toEqual([]);
    }
  }
});

test('a link from a dated card to an undated one draws and lights up as any link', async ({ page, request }) => {
  const d = await drawPlan(request);
  await open(page, d, ON);
  const wires = page.locator('svg.vb-wires:not(.vb-wires-top) path.vb-wire');
  await expect(wires).toHaveCount(1);
  await expect(wires).not.toHaveClass(/hot/);
  for (const i of [LOAD, QUEUE]) {
    await card(page, d.n[i]!).focus();
    await expect(wires).toHaveClass(/hot/);
    await card(page, d.n[POST]!).focus();
    await expect(wires).not.toHaveClass(/hot/);
  }
});

const widths = async (page: Page, d: { n: number[] }, ids: number[]) => new Set(await Promise.all(ids.map(async (i) => Math.round((await boxOf(page, i, d.n)).width))));

test('while the cards glide to a new layout the timeline is hidden, as the links are; shown, it is on its cards', async ({ page, request }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' }); // the glide runs (the suite turns motion off)
  const d = await drawPlan(request);
  await open(page, d, ON);
  await idle(page);
  await page.waitForTimeout(500);
  const id = String(d.n[DRAFTS]);
  // Every frame for 900 ms: the worst miss while any part of the line shows, the frames it was hidden in, and how far
  // the last dated card travelled (so the glide is proven to run).
  const sampled = page.evaluate(async ({ id, src }) => {
    const missesOf = new Function(`return (${src})`)() as (r: string) => number[];
    const shown = () => [...document.querySelectorAll('svg.vb-wires :is(.vb-timelines, .vb-timeline-dots) > g[data-region="plan"]')]
      .some((g) => Number(getComputedStyle(g).opacity) > 0.01);
    const x0 = document.querySelector(`vb-node[data-id="${id}"]`)!.getBoundingClientRect().x;
    let [worst, hidden] = [0, 0];
    const xs = new Set<number>();
    const end = performance.now() + 900;
    while (performance.now() < end) {
      await new Promise((r) => requestAnimationFrame(r));
      if (shown()) worst = Math.max(worst, ...missesOf('plan'));
      else hidden += 1;
      xs.add(Math.round(document.querySelector(`vb-node[data-id="${id}"]`)!.getBoundingClientRect().x - x0));
    }
    return { worst, hidden, between: xs.size, shownAtEnd: shown() };
  }, { id, src: missesIn.toString() });
  await frame(page, 'plan').getByRole('switch', { name: 'Match card widths' }).click();
  const { worst, hidden, between, shownAtEnd } = await sampled;
  expect(between, 'the card glided through several places').toBeGreaterThan(3);
  expect(hidden, 'hidden while the cards move').toBeGreaterThan(3);
  expect(worst, 'every frame it shows, on its cards').toBeLessThan(2);
  expect(shownAtEnd, 'back once they land').toBe(true);
});

test('the widths switch shows what is in force and covers the dated cards as well as the others', async ({ page, request }) => {
  const d = await drawPlan(request);
  await open(page, d, ON);
  const sw = (region: string) => frame(page, region).getByRole('switch', { name: 'Match card widths' });
  // Across with no choice: the timeline's default, own, for the whole container; a grid with a timeline too.
  await expect(sw('plan')).toHaveAttribute('aria-checked', 'false');
  await expect(sw('after')).toHaveAttribute('aria-checked', 'false');
  await expect(sw('misc')).toHaveAttribute('aria-checked', 'true'); // a grid with no timeline: the grid's own default
  expect((await widths(page, d, BY_DATE)).size, 'across, each its own width (Private beta is longer)').toBeGreaterThan(1);
  await sw('plan').click();
  await expect(sw('plan')).toHaveAttribute('aria-checked', 'true');
  await expect.poll(async () => (await widths(page, d, BY_DATE)).size).toBe(1);
  // Run down with no choice: match, and the switch says so (After FE_02 (a)); the person's own wins.
  const down = await drawPlan(request, { direction: 'down' });
  await openOn(page, down);
  await idle(page);
  await expect(sw('plan')).toHaveAttribute('aria-checked', 'true');
  expect((await widths(page, down, BY_DATE)).size, 'run down, matched with no choice (point 595)').toBe(1);
  await sw('plan').click(); // the person's own
  await expect(sw('plan')).toHaveAttribute('aria-checked', 'false');
  await expect.poll(async () => (await widths(page, down, BY_DATE)).size).toBeGreaterThan(1);
});

test('the layout menu of a container with a timeline offers Across, Down and Auto; Down draws the line down, the rest to its right', async ({ page, request }) => {
  const d = await drawPlan(request);
  await open(page, d, ON);
  const f = frame(page, 'plan');
  const dir = (to: string) => f.locator(`.vb-dir[data-dir="${to}"]`);
  await f.locator('.vb-layout-btn').click();
  await expect(f.locator('.vb-dir')).toHaveText([/Across/, /Down/, /Auto/]);
  await expect(dir('across')).toHaveAttribute('aria-checked', 'true');
  await expect(f.locator('.vb-layout-btn')).toHaveAccessibleName('Layout: Row');
  const before = await head(page);
  await dir('down').click();
  await expect(line(page, 'plan')).toHaveAttribute('data-direction', 'down');
  expect((await linesAfter(page, before)).map((e) => [e.action, e.region, e.direction])).toEqual([['direction', 'plan', 'down']]);
  await idle(page);
  expect((await dots(page, 'plan')).map((x) => x.side)).toEqual(['left', 'right', 'left', 'right', 'left', 'right']);
  const right = Math.max(...await Promise.all(BY_DATE.map(async (i) => { const b = await boxOf(page, i, d.n); return b.x + b.width; })));
  for (const i of [POST, QUEUE]) expect((await boxOf(page, i, d.n)).x).toBeGreaterThan(right);
  expect(Math.max(...await misses(page, 'plan'))).toBeLessThan(1.5);
  await f.locator('.vb-layout-btn').click();
  await expect(dir('down')).toHaveAttribute('aria-checked', 'true');
  await dir('auto').click();
  await expect(line(page, 'plan')).toHaveAttribute('data-direction', 'across');
  // A grid with no timeline offers no direction.
  await frame(page, 'misc').locator('.vb-layout-btn').click();
  await expect(frame(page, 'misc').locator('.vb-mode-pop')).toBeVisible();
  await expect(frame(page, 'misc').locator('.vb-dir-row')).toBeHidden();
});

/** The cards Tab (or Shift Tab, `back`) reaches from card `from`, in turn, until `count` are reached. */
async function tabbed(page: Page, from: number, count: number, back = false): Promise<number[]> {
  await card(page, from).focus();
  const reached = [from];
  for (let i = 0; i < 200 && reached.length < count; i += 1) {
    await page.keyboard.press(back ? 'Shift+Tab' : 'Tab');
    const id = await page.evaluate(() => document.activeElement?.closest<HTMLElement>('vb-node')?.dataset.id);
    if (id !== undefined && Number(id) !== reached.at(-1)) reached.push(Number(id));
  }
  return reached;
}

for (const direction of ['across', 'down']) {
  test(`Tab and Shift Tab walk a timeline in date order, then the container's other cards, ${direction}`, async ({ page, request }) => {
    const d = await drawPlan(request, { direction });
    await open(page, d, ON);
    await idle(page);
    // The line's order (its dots, as drawn), then Launch plan's undated cards; After launch's line of one, its other
    // card; Loose ends, with no timeline, as today.
    const want = [...BY_DATE, POST, QUEUE, RETRO, RETRO + 1, RETRO + 2].map((i) => d.n[i]!);
    expect((await dots(page, 'plan')).map((x) => Number(x.node))).toEqual(BY_DATE.map((i) => d.n[i]));
    expect(await tabbed(page, want[0]!, want.length)).toEqual(want);
    expect(await tabbed(page, want.at(-1)!, want.length, true)).toEqual([...want].reverse());
  });
}

test('from 20% to 250% the line, its stems and its dots stay joined to their cards', async ({ page, request }) => {
  const d = await drawPlan(request, { direction: 'down' });
  await open(page, d, ON);
  const joined = async (why: string) => {
    await idle(page);
    for (const region of ['plan', 'after']) expect(Math.max(...await misses(page, region)), `${why} ${await scale(page)}`).toBeLessThan(2);
  };
  for (let i = 0; i < 30 && (await scale(page)) > 0.2001; i += 1) { await page.keyboard.press('-'); await joined('out'); }
  expect(await scale(page)).toBeCloseTo(0.2);
  for (let i = 0; i < 40 && (await scale(page)) < 2.4999; i += 1) { await page.keyboard.press('+'); await joined('in'); }
  expect(await scale(page)).toBeCloseTo(2.5);
});

for (const skin of ['default', 'command-lens']) {
  for (const theme of THEMES) {
    test(`the container across and down, ${skin}, ${theme}: as the person sees it, axe clean`, async ({ page, request }) => {
      await setTheme(page, theme);
      for (const direction of ['across', 'down']) {
        const d = await drawPlan(request, { direction });
        await openOn(page, d);
        if (skin !== 'default') {
          await act(page, d, { action: 'skin', board: d.board, skin });
          await expect(card(page, d.n[SIGN]!)).toHaveAttribute('data-marks-at', 'plate');
        }
        await idle(page);
        await expect(line(page, 'plan')).toHaveAttribute('data-direction', direction);
        await expect(page.locator('svg.vb-wires').first()).not.toHaveClass(/settling/);
        await expect(frame(page, 'plan')).toHaveScreenshot(`timeline-${skin}-${direction}-${theme}.png`); // the whole container, fitted
        await expectNoAxeOnBoard(page);
        await zoomToFull(page);
        await panBy(page, 0, 160); // the container's top line clear of the page's header (the zoom is about the middle)
        await expectNoAxeViolations(page); // every control at full size
      }
    });
  }
}

for (const theme of THEMES) {
  test(`the gallery's section draws the plan for real, across and down in both skins; axe clean in it (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    const section = page.locator('[data-feature="timeline-board"]');
    await expect(section.locator('.g-mini')).toHaveCount(4);
    await expect(section.locator('svg.vb-wires .vb-timelines > g.vb-timeline:not([data-node])')).toHaveCount(4);
    await expect(section.locator('.vb-timeline[data-direction="down"]')).toHaveCount(2);
    await expect(section.locator('.vb-timeline-dots > g[data-node] .vb-timeline-dot')).toHaveCount(24);
    await expect(section.locator('.vb-timeline-band')).toHaveCount(4);
    await expect(section.locator('vb-node[data-marks-at="plate"][data-timeline]')).toHaveCount(12);
    await section.scrollIntoViewIfNeeded();
    // axe on the page, judged on this section: other sections' findings are theirs (gallery.spec.ts).
    const found = await axeFindings(page);
    const mine = await page.evaluate((all) => all.flatMap((f) => {
      const targets = f.targets.filter((t) => document.querySelector(t)?.closest('[data-feature="timeline-board"]'));
      return targets.length ? [`${f.id}: ${targets.join(', ')}`] : [];
    }), found);
    expect(mine).toEqual([]);
    await expect(section).toHaveScreenshot(`timeline-gallery-${theme}.png`);
  });
}
