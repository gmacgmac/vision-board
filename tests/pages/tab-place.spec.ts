// Tab place (updateSignals flag, on by default; cortex-tasks/board/2026-11-05_board-ui_title-weight-and-tab-place.md):
// the card's bottom-edge tabs centre about a third of the way along its bottom edge, away from the kind
// icon and the state word at its left. One tab or two, on S, M and L: the centre at a third where it fits;
// never left of today's 14px; never over the kind icon, the state word or a footer button (a tab's 24px
// target included); on M and L two tabs leave the buttons level with the state word. Where the third does
// not fit (a wide tab on S) the tabs end before the buttons; two on S start at 14px and the buttons rise.
// Flag off: today's 14px. Light and dark, axe. Each test draws its own board through the API.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
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

/** What each card carries: "1 update" (the agent changed it), that and a proposal made before the change
 *  ("Out of date"), or a proposal alone. */
type Tabs = 'update' | 'both' | 'proposal';

/** A board with one card per size, each in a container of its own (a grid widens a card to its column). */
async function board(page: Page, request: APIRequestContext, tabs: Tabs, query = ''): Promise<number[]> {
  const d = { agent: await joinAgent(request), board: `tab-place-${Date.now()}-${(boards += 1)}` };
  const node = (s: Size, body?: string) => ({ region: s, kind: 'question', title: `Card ${s}`, ...(body && { body }) });
  const r = await write(request, d, [
    { type: 'board', title: 'Tab place' },
    ...SIZES.map((s) => ({ type: 'region', region: { id: s, title: `Size ${s}`, mode: 'grid' } })),
    ...SIZES.map((s) => ({ type: 'node', node: node(s) })),
  ]);
  const ns = r.slice(-SIZES.length).map((x) => x.n!);
  // Two tabs are the oneChangeTab flag off: on, a proposal and updates share one tab (one-change-tab.spec.ts).
  await open(page, { board: d.board, n: ns }, tabs === 'both' ? `${query || '?flags='}${query ? ',' : ''}-oneChangeTab` : query);
  for (const [i, n] of ns.entries()) await act(page, d, { action: 'size', n, size: SIZES[i] });
  // The proposal first, on version 1; the change after it makes it "Out of date", still a tab.
  if (tabs !== 'update') await write(request, d, ns.map((n) => ({ type: 'propose', n, ver: 1, action: 'check', reason: 'The client said yes.', source: 'Email pasted in chat' })));
  if (tabs !== 'proposal') await write(request, d, ns.map((n, i) => ({ type: 'node', n, node: node(SIZES[i]!, 'Changed once.') })));
  const shown = tabs === 'both' ? 2 : 1;
  const showing = (n: number) => card(page, n).locator('.vb-node-btab:visible').evaluateAll((ts) => ts.map((t) => t.getAttribute('data-tab')).join(' '));
  for (const n of ns) await expect.poll(async () => (await showing(n)).split(' ').filter(Boolean).length, `card ${n}: ${await showing(n)}`).toBe(shown);
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
  return {
    w: el.clientWidth,
    tabs: all('.vb-node-btab:not([hidden])'),
    marks: all('.vb-node-kico, .vb-node-status'),
    buttons: all('.vb-node-foot :is(.vb-act, .vb-history)'),
  };
});
const overlap = (a: Box, b: Box) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
/** A tab's 24px target (its ::after, node-popover.css: 3px above and below, 2px each side). */
const target = (t: Box): Box => ({ l: t.l - 2, r: t.r + 2, t: t.t - 3, b: t.b + 3 });
const middle = (bs: Box[]) => (Math.min(...bs.map((b) => b.l)) + Math.max(...bs.map((b) => b.r))) / 2;

/** Nothing crowds: no tab over the kind icon or the state word, no tab's target over a button. */
function clear(f: Awaited<ReturnType<typeof footer>>, size: Size): void {
  expect(Math.min(...f.tabs.map((t) => t.l)), `${size}: never left of today's 14px`).toBeGreaterThanOrEqual(MIN_LEFT - 0.5);
  for (const t of f.tabs) {
    for (const m of f.marks) expect(overlap(t, m), `${size}: a tab over the kind icon or the state word`).toBe(false);
    for (const b of f.buttons) expect(overlap(target(t), b), `${size}: a tab's target over a footer button`).toBe(false);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?setup');
});

test('one tab ("1 update"): centred at a third of the card on S, M and L, clear of the icon, the word and the buttons', async ({ page, request }) => {
  const ns = await board(page, request, 'update');
  for (const [i, n] of ns.entries()) {
    const f = await footer(card(page, n));
    expect(Math.abs(middle(f.tabs) - f.w / 3), `${SIZES[i]}: centre ${middle(f.tabs).toFixed(1)} of ${f.w}`).toBeLessThanOrEqual(1);
    clear(f, SIZES[i]!);
  }
});

test('two tabs (a proposal and "1 update"): a third on M and L with the buttons level; on S from 14px, the buttons raised', async ({ page, request }) => {
  const ns = await board(page, request, 'both');
  for (const [i, n] of ns.entries()) {
    const size = SIZES[i]!;
    const f = await footer(card(page, n));
    clear(f, size);
    const level = await card(page, n).evaluate((el) => {
      const mid = (s: string) => { const b = el.querySelector(s)!.getBoundingClientRect(); return (b.top + b.bottom) / 2; };
      return Math.abs(mid('.vb-node-actions') - mid('.vb-node-state'));
    });
    if (size === 's') {
      expect(Math.min(...f.tabs.map((t) => t.l)), 'S: they start at 14px').toBeCloseTo(MIN_LEFT, 0);
      expect(level, 'S: the buttons rise').toBeGreaterThan(2);
    } else {
      expect(Math.abs(middle(f.tabs) - f.w / 3), `${size}: centre ${middle(f.tabs).toFixed(1)} of ${f.w}`).toBeLessThanOrEqual(1);
      expect(level, `${size}: the buttons stay level with the state word`).toBeLessThanOrEqual(1);
    }
  }
});

test('a wide tab on S (a proposal alone): the third does not fit, so it ends before the buttons', async ({ page, request }) => {
  const [s, m] = await board(page, request, 'proposal');
  const f = await footer(card(page, s!));
  clear(f, 's');
  expect(middle(f.tabs), 'slid left of the third').toBeLessThan(f.w / 3 - 1);
  expect(Math.max(...f.tabs.map((t) => t.r)) + 2, 'its target ends before the first button').toBeLessThanOrEqual(Math.min(...f.buttons.map((b) => b.l)));
  const fm = await footer(card(page, m!));
  expect(Math.abs(middle(fm.tabs) - fm.w / 3), 'M: the third fits').toBeLessThanOrEqual(1);
});

test('flag off: the tabs stay at today\'s 14px on every size', async ({ page, request }) => {
  const ns = await board(page, request, 'update', '?flags=-updateSignals');
  for (const n of ns) {
    const f = await footer(card(page, n));
    expect(f.tabs[0]!.l).toBeCloseTo(MIN_LEFT, 0);
  }
});

for (const theme of THEMES) {
  for (const tabs of ['update', 'both'] as const) {
    test(`${theme}: ${tabs === 'both' ? 'two tabs' : 'one tab'}, axe passes`, async ({ page, request }) => {
      await setTheme(page, theme);
      await board(page, request, tabs);
      await expectNoAxeViolations(page);
    });
  }
}
