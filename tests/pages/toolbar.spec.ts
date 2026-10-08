// The toolbar at the window widths people use (verification fix, navigation VERIFY_01): with a long
// board title, the board picker keeps at least 220px (its title truncates inside), the toolbar never
// scrolls or overflows, and every control is still reachable and named (axe) while the end group's
// text buttons (Hide decided, Theme, Reply) shrink to icon buttons on a narrow window. It runs on
// the empty project's server (EMPTY_BASE) after new-board.spec.ts, which it does not disturb: it
// adds one board, opened by its id.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { EMPTY_BASE } from './perf-server.ts';

const THEMES: Theme[] = ['dark', 'light'];
const WIDTHS = [1100, 1280, 1440];
const LONG = 'Quarterly hiring plan for the platform and data teams across every region, with budgets and open questions';
const BOARD = 'long-title-board';

async function setUp(page: Page, request: APIRequestContext): Promise<void> {
  const made = await page.request.put(`${EMPTY_BASE}/api/boards/${BOARD}`, { data: { title: LONG, summary: 'A board with a long title.' } });
  expect([200, 201]).toContain(made.status());
  const agent = await (await request.post(`${EMPTY_BASE}/api/agents`, { data: { label: 'Toolbar chat' } })).json() as { secret: string };
  const headers = { Authorization: `Bearer ${agent.secret}` };
  const asked = await request.post(`${EMPTY_BASE}/api/grants`, { headers, data: { board: BOARD, reason: 'Drawing.' } });
  expect(asked.status(), await asked.text()).toBe(201);
  const granted = await page.request.post(`${EMPTY_BASE}/api/boards/${BOARD}/act`, { data: { type: 'act', action: 'grant', request: (await asked.json() as { request: number }).request } });
  expect(granted.status(), await granted.text()).toBe(201);
  const items = [
    { type: 'region', region: { id: 'roles', title: 'Roles', mode: 'grid' } },
    { type: 'node', node: { region: 'roles', kind: 'question', title: 'Which role first?', item: true } },
  ];
  // A board the agent made that the person has not opened: the "boards updated" chip shows too.
  const other = await request.post(`${EMPTY_BASE}/api/boards/another-board/write`, { headers, data: { items: [{ type: 'board', title: 'Another board' }] } });
  expect(other.status(), await other.text()).toBe(200);
  const wrote = await request.post(`${EMPTY_BASE}/api/boards/${BOARD}/write`, { headers, data: { items } });
  expect(wrote.status(), await wrote.text()).toBe(200);
}

let made = false;
async function open(page: Page, request: APIRequestContext): Promise<void> {
  await page.goto(`${EMPTY_BASE}/?vbwork`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: unknown }).__vbWork !== undefined);
  if (!made) { await setUp(page, request); made = true; }
  await page.locator('#board').selectOption(BOARD);
  await page.evaluate(() => (window as unknown as { __vbWork: { idle(): Promise<void> } }).__vbWork.idle());
  await expect(page.locator('#counts .vb-chip').first()).toBeVisible();
}

for (const width of WIDTHS) {
  test(`at ${width}px a long title leaves the picker 220px or more and the toolbar whole`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 800 });
    await open(page, request);
    await expect(page.locator('#boards-updated')).toBeVisible();
    const picker = (await page.locator('#board').boundingBox())!;
    expect(picker.width, 'the picker').toBeGreaterThanOrEqual(220);
    const fit = await page.evaluate(() => {
      const bar = document.querySelector('.vb-toolbar') as HTMLElement;
      const out = [...bar.querySelectorAll<HTMLElement>(':scope > *, .vb-toolbar-end > *')]
        .filter((e) => !e.classList.contains('vb-visually-hidden') && (e.offsetParent !== null || getComputedStyle(e).position === 'fixed'))
        .map((e) => ({ id: e.id || e.className, right: e.getBoundingClientRect().right, left: e.getBoundingClientRect().left }));
      return { scroll: bar.scrollWidth - bar.clientWidth, page: document.documentElement.scrollWidth - window.innerWidth, out, width: window.innerWidth };
    });
    console.log(width, JSON.stringify(fit.out.map((e) => [e.id, Math.round(e.left), Math.round(e.right - e.left)])));
    expect(fit.scroll, 'the toolbar scrolls').toBeLessThanOrEqual(0);
    expect(fit.page, 'the page scrolls sideways').toBeLessThanOrEqual(0);
    for (const e of fit.out) expect(e.right, `${e.id} ends inside the window`).toBeLessThanOrEqual(fit.width);
    // Nothing overlaps its neighbour: the controls in order never cross.
    const tops = fit.out.map((e) => e.left);
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    // Every control has a name, a title tooltip when it shows no words, and passes axe.
    for (const id of ['hide', 'theme', 'reply-toggle']) {
      const b = page.locator(`#${id}`);
      await expect(b).toBeVisible();
      expect((await b.evaluate((e) => (e as HTMLElement).getAttribute('aria-label') ?? e.textContent ?? '')).trim().length, id).toBeGreaterThan(0);
      expect(await b.getAttribute('title'), `${id} title`).toBeTruthy();
    }
    for (const theme of THEMES) {
      await setTheme(page, theme);
      await expectNoAxeViolations(page);
      if (process.env.TB_SHOTS) await page.locator('.vb-toolbar').screenshot({ path: `${process.env.TB_SHOTS}/toolbar-${width}-${theme}.png` });
    }
  });
}
