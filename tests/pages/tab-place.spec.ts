// Tab place (updateSignals flag, on by default; D-091 and the tab-lower task,
// cortex-tasks/board/2026-11-05_board-ui_tab-lower.md): the card's bottom-edge tabs hang below the footer
// and start just after the footer's state word, left-aligned, growing right (maintainer, by eye). One tab,
// the combined tab ("1 update · out of date", oneChangeTab), two tabs and a proposal alone, on S, M and L:
// the first tab starts a little after the state word, at the same place on every size; never past the
// card's right edge less 14px; never over the kind icon or the state word; no tab's 24px target over a
// footer button, so the buttons stay level with the state word every time; the tabs still on the card's
// edge. Flag off: today's 14px. Light and dark, axe. Each test draws its own board through the API.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { ROW_GAP } from '#layout';
import { act, joinAgent, open, write } from './agent-board.ts';
import { card } from './board-page.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

type Size = 's' | 'm' | 'l';
const SIZES: Size[] = ['s', 'm', 'l'];
const THEMES: Theme[] = ['light', 'dark'];
/** Today's left edge of the tabs (node-popover.css), the minimum. */
const MIN_LEFT = 14;
let boards = 0;

/** What each card carries: "1 update" (the agent changed it); that and a proposal made before the change
 *  ("Out of date"), as two tabs ('both', oneChangeTab off) or one ('combined'); or a proposal alone. */
type Tabs = 'update' | 'both' | 'combined' | 'proposal';

/** A board with one card per size, each in a container of its own (a grid widens a card to its column), or
 *  with `stacked` all three in one column container, S above M above L. */
async function board(page: Page, request: APIRequestContext, tabs: Tabs, query = '', stacked = false): Promise<number[]> {
  const d = { agent: await joinAgent(request), board: `tab-place-${Date.now()}-${(boards += 1)}` };
  const node = (s: Size, body?: string) => ({ region: stacked ? 'col' : s, kind: 'question', title: `Card ${s}`, ...(body && { body }) });
  const r = await write(request, d, [
    { type: 'board', title: 'Tab place' },
    ...(stacked ? [{ type: 'region', region: { id: 'col', title: 'Stacked', mode: 'column' } }]
      : SIZES.map((s) => ({ type: 'region', region: { id: s, title: `Size ${s}`, mode: 'grid' } }))),
    ...SIZES.map((s) => ({ type: 'node', node: node(s) })),
  ]);
  const ns = r.slice(-SIZES.length).map((x) => x.n!);
  // Two tabs are the oneChangeTab flag off: on, a proposal and updates share one tab (one-change-tab.spec.ts).
  await open(page, { board: d.board, n: ns }, tabs === 'both' ? `${query || '?flags='}${query ? ',' : ''}-oneChangeTab` : query);
  for (const [i, n] of ns.entries()) await act(page, d, { action: 'size', n, size: SIZES[i] });
  // The proposal first, on version 1; the change after it makes it "Out of date", still a tab.
  if (tabs !== 'update') await write(request, d, ns.map((n) => ({ type: 'propose', n, ver: 1, action: 'check', reason: 'The client said yes.', source: 'Email pasted in chat' })));
  if (tabs !== 'proposal') await write(request, d, ns.map((n, i) => ({ type: 'node', n, node: node(SIZES[i]!, 'Changed once.') })));
  // The combined tab after the round, the page opened again: a live proposal and change together sometimes
  // never show their tab (tracker N50; one-change-tab.spec.ts opens after the round too).
  if (tabs === 'combined') await open(page, { board: d.board, n: ns }, query);
  const shown = tabs === 'both' ? 2 : 1;
  const showing = (n: number) => card(page, n).locator('.vb-node-btab:visible').evaluateAll((ts) => ts.map((t) => `${t.getAttribute('data-tab')}${t.hasAttribute('data-updated') ? '+updated' : ''}`).join(' '));
  for (const n of ns) {
    await expect.poll(async () => (await showing(n)).split(' ').filter(Boolean).length, `card ${n}: ${await showing(n)}`).toBe(shown);
    if (tabs === 'combined') await expect.poll(() => showing(n)).toBe('proposal+updated');
  }
  return ns;
}

interface Box { l: number; r: number; t: number; b: number }
/** The card's footer in its own CSS pixels (the board's zoom taken out), from inside its border's top-left,
 *  where the tabs' `left` is measured from. */
const footer = (c: Locator) => c.evaluate((el) => {
  const card = el.getBoundingClientRect();
  const k = card.width / (el as HTMLElement).offsetWidth;
  const [x0, y0] = [card.left + el.clientLeft * k, card.top + el.clientTop * k];
  const box = (e: Element) => {
    const b = e.getBoundingClientRect();
    return { l: (b.left - x0) / k, r: (b.right - x0) / k, t: (b.top - y0) / k, b: (b.bottom - y0) / k };
  };
  const all = (sel: string) => [...el.querySelectorAll(sel)].map(box);
  const mid = (sel: string) => { const b = box(el.querySelector(sel)!); return (b.t + b.b) / 2; };
  return {
    w: el.clientWidth,
    h: el.clientHeight,
    tabs: all('.vb-node-btab:not([hidden])'),
    marks: all('.vb-node-kico, .vb-node-status'),
    word: box(el.querySelector('.vb-node-status')!),
    buttons: all('.vb-node-foot :is(.vb-act, .vb-history)'),
    /** How far the buttons' middle is from the state word's: 0 when level. */
    level: Math.abs(mid('.vb-node-actions') - mid('.vb-node-state')),
  };
});
const overlap = (a: Box, b: Box) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
/** A tab's 24px target (its ::after, node-popover.css: 3px above and below, 2px each side). */
const target = (t: Box): Box => ({ l: t.l - 2, r: t.r + 2, t: t.t - 3, b: t.b + 3 });
/** The first tab's left edge. */
const start = (bs: Box[]) => Math.min(...bs.map((b) => b.l));
/** "Just after the state word": the first tab starts at least a space and at most this far past its end. */
const AFTER = { min: 4, max: 24 };

/** Placed as decided: starting just after the state word, within the card less 14px; never over the kind
 *  icon or the state word; no tab's target over a button, which stay level with the state word; every tab
 *  still on the card's bottom edge. */
function placed(f: Awaited<ReturnType<typeof footer>>, size: Size): void {
  const after = start(f.tabs) - f.word.r;
  expect(after, `${size}: the first tab ${after.toFixed(1)}px after the state word`).toBeGreaterThanOrEqual(AFTER.min);
  expect(after, `${size}: the first tab ${after.toFixed(1)}px after the state word`).toBeLessThanOrEqual(AFTER.max);
  expect(Math.max(...f.tabs.map((t) => t.r)), `${size}: never past the right edge less 14px`).toBeLessThanOrEqual(f.w - MIN_LEFT + 0.5);
  expect(f.level, `${size}: the buttons level with the state word`).toBeLessThanOrEqual(1);
  for (const t of f.tabs) {
    for (const m of f.marks) expect(overlap(t, m), `${size}: a tab over the kind icon or the state word`).toBe(false);
    for (const b of f.buttons) expect(overlap(target(t), b), `${size}: a tab's target over a footer button`).toBe(false);
    // The border runs from h to h + 1 below the inside's top: the tab starts above its outer edge, ends below it.
    expect(t.t < f.h + 1 && t.b > f.h + 1, `${size}: the tab on the card's edge (${t.t.toFixed(1)}-${t.b.toFixed(1)}, edge ${f.h + 1})`).toBe(true);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?setup');
});

const NAMES: Record<Tabs, string> = { update: 'one tab ("1 update")', combined: 'the combined tab ("1 update · out of date")', both: 'two tabs (a proposal and "1 update")', proposal: 'a wide tab (a proposal alone)' };
for (const tabs of ['update', 'combined', 'both', 'proposal'] as const) {
  test(`${NAMES[tabs]}: on S, M and L just after the state word, left-aligned, below the buttons, which stay level`, async ({ page, request }) => {
    const ns = await board(page, request, tabs);
    const fs = [];
    for (const [i, n] of ns.entries()) {
      const f = await footer(card(page, n));
      placed(f, SIZES[i]!);
      fs.push(f);
    }
    const starts = fs.map((f) => start(f.tabs));
    expect(Math.max(...starts) - Math.min(...starts), `the same start on every size: ${starts.map((x) => x.toFixed(1))}`).toBeLessThanOrEqual(0.5);
  });
}

test('flag off: the tabs stay at today\'s 14px on every size', async ({ page, request }) => {
  const ns = await board(page, request, 'update', '?flags=-updateSignals');
  for (const n of ns) {
    const f = await footer(card(page, n));
    expect(f.tabs[0]!.l).toBeCloseTo(MIN_LEFT, 0);
  }
});

for (const theme of THEMES) {
  for (const tabs of ['update', 'combined', 'both'] as const) {
    test(`${theme}: ${NAMES[tabs]}, axe passes`, async ({ page, request }) => {
      await setTheme(page, theme);
      await board(page, request, tabs);
      await expectNoAxeViolations(page);
    });
  }
}

/** Each card and the one under it, in the board's own px: the gap between them, and how far the next card's
 *  top tabs (number, kind, size) start below the lowest of this card's bottom tabs. */
const stack = (page: Page, ns: number[]) => page.evaluate((ns) => {
  const els = ns.map((n) => document.querySelector(`vb-node[data-id="${n}"]`) as HTMLElement);
  const k = els[0]!.getBoundingClientRect().width / els[0]!.offsetWidth;
  const all = (el: Element, sel: string) => [...el.querySelectorAll(sel)].map((e) => e.getBoundingClientRect());
  return els.slice(0, -1).map((el, i) => {
    const next = els[i + 1]!;
    const tabsEnd = Math.max(...all(el, '.vb-node-btab:not([hidden])').map((b) => b.bottom));
    const topStart = Math.min(...all(next, '.vb-node-num, .vb-node-kind, .vb-size').map((b) => b.top));
    return { gap: (next.getBoundingClientRect().top - el.getBoundingClientRect().bottom) / k, clear: (topStart - tabsEnd) / k };
  });
}, ns);

test('stacked in a column: 30px under each card, so the hung tab clears the next card\'s top tabs; flag off 24px', async ({ page, request }) => {
  const on = await stack(page, await board(page, request, 'combined', '', true));
  for (const p of on) {
    expect(p.gap, 'the gap under a card (ROW_GAP, 30px)').toBeCloseTo(ROW_GAP, 0);
    // The combined tab is 18px tall and ends 4px above them; a 20px proposal or handover tab would end 3px above.
    expect(p.clear, `the hung tab ${p.clear.toFixed(1)}px clear of the next card's top tabs`).toBeGreaterThanOrEqual(3);
  }
  const off = await stack(page, await board(page, request, 'update', '?flags=-updateSignals', true));
  for (const p of off) expect(p.gap, 'flag off: GAP').toBeCloseTo(24, 0);
});
