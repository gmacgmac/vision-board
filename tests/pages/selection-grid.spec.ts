// The selection grid (selectionGrid flag, selection-grid task, maintainer points 773 and 775): a click on the pill
// opens a 3×3 grid with Comment's centre at the click, focused, so a second click comments; Enter opens it with
// Comment at the pill's centre; near the top it opens downward with its rows reversed, Comment still at the click and
// Remove still farthest; the arrows move between the cells as drawn; Esc, the label and a press outside close it;
// labels stay on one line in 24px cells; axe and the labels' APCA in light and dark. Off, the pill spec's bar.
import type { APIRequestContext, Locator, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test, bid } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { bar } from './board-page.ts';
import { lc, pixel } from './apca.ts';
import type { Rgb } from './apca.ts';

const THEMES: Theme[] = ['dark', 'light'];
const TITLES = ['First idea', 'Second idea', 'Third idea', 'Fourth idea'];
/** The cells as drawn opening upward, row by row. */
const CELLS = ['2 selected', 'Reset places', 'Remove', 'Save for later', 'Width', 'Zoom', 'Move to', 'Comment', 'Bookmark all'];
let boards = 0;

/** A board of its own: four cards, two by two, in one container, drawn by a new agent. */
async function draw(request: APIRequestContext): Promise<string> {
  const r = await request.post('/api/agents', { data: { label: 'Grid chat' } });
  const secret = (await r.json() as { secret: string }).secret;
  const board = `grid-${Date.now()}-${(boards += 1)}`;
  const items = [
    { type: 'board', title: 'Grid board' },
    { type: 'region', region: { id: 'ideas', title: 'Ideas', mode: 'grid' } },
    ...TITLES.map((title) => ({ type: 'node', node: { region: 'ideas', kind: 'question', title } })),
  ];
  const w = await request.post(`/api/boards/${board}/write`, { headers: { Authorization: `Bearer ${secret}` }, data: { items } });
  expect(w.status(), await w.text()).toBe(200);
  return board;
}

async function open(page: Page, request: APIRequestContext): Promise<void> {
  await page.goto(`/?flags=selectionGrid#${await draw(request)}`);
  await expect(page.locator('vb-node')).toHaveCount(4);
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/);
}

const pill = (page: Page) => bar(page).locator('.vb-sb-pill');
const cell = (page: Page, command: string) => bar(page).locator(`[data-command="${command}"]`);

/** Select the bottom two cards (the third and fourth) with the pointer. */
async function selectTwo(page: Page): Promise<void> {
  const cards = page.locator('vb-node');
  await cards.nth(2).locator('.vb-node-title').click({ position: { x: 4, y: 4 } });
  await cards.nth(3).locator('.vb-node-title').click({ position: { x: 4, y: 4 }, modifiers: ['Shift'] });
  await expect(pill(page)).toHaveAttribute('aria-expanded', 'false');
}

const centre = async (l: Locator) => { const b = (await l.boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };

/** Click the pill at `share` of its width; the point clicked. */
async function clickPill(page: Page, share: number): Promise<{ x: number; y: number }> {
  const b = (await pill(page).boundingBox())!;
  const at = { x: b.x + b.width * share, y: b.y + b.height / 2 };
  await page.mouse.click(at.x, at.y);
  await expect(bar(page)).toHaveAttribute('data-open', '');
  return at;
}

/** The cells' words top to bottom, left to right, as the person sees them. */
async function drawn(page: Page): Promise<string[]> {
  const cells = await bar(page).locator('[data-row]').evaluateAll((es) => es.map((e) => {
    const r = e.getBoundingClientRect();
    return { text: (e as HTMLElement).innerText.trim(), x: Math.round(r.x), y: Math.round(r.y) };
  }));
  return cells.sort((a, b) => a.y - b.y || a.x - b.x).map((c) => c.text);
}

async function expectAt(l: Locator, at: { x: number; y: number }): Promise<void> {
  const c = await centre(l);
  expect(Math.abs(c.x - at.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(c.y - at.y)).toBeLessThanOrEqual(1);
}

test('a click on the pill opens the grid upward with Comment under it, focused; a second click comments', async ({ page, request }) => {
  await open(page, request);
  await selectTwo(page);
  const at = await clickPill(page, 0.3);
  await expect(bar(page)).toHaveAttribute('data-side', 'above');
  await expectAt(cell(page, 'comment'), at);
  await expect(cell(page, 'comment')).toBeFocused();
  expect(await drawn(page)).toEqual(CELLS);
  // One line each, every cell a 24px target, the columns as wide as the widest label.
  for (const c of await bar(page).locator('[data-row]').all()) {
    const b = (await c.boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(24);
    expect(b.height).toBeLessThan(30);
    expect(await c.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(true);
  }
  await expect(cell(page, 'remove')).toHaveClass(/vb-sb-danger/);
  await page.mouse.click(at.x, at.y);
  await expect(page.locator('vb-note-bubble')).toHaveAttribute('data-mode', 'conversation');
});

test('Enter opens it with Comment at the pill\'s centre; the arrows move as drawn; Esc gives focus back to the pill', async ({ page, request }) => {
  await open(page, request);
  await selectTwo(page);
  const at = await centre(pill(page));
  await pill(page).focus();
  await page.keyboard.press('Enter');
  await expect(cell(page, 'comment')).toBeFocused();
  await expectAt(cell(page, 'comment'), at);
  // Reset places is off (no card has been moved): Up from Width stays, Left from Remove passes over it to the label.
  for (const [key, command] of [['ArrowDown', 'comment'], ['ArrowLeft', 'move'], ['ArrowUp', 'save-for-later'], ['ArrowRight', 'width'],
    ['ArrowUp', 'width'], ['ArrowRight', 'zoom-selection'], ['ArrowUp', 'remove']] as const) {
    await page.keyboard.press(key);
    await expect(cell(page, command)).toBeFocused();
  }
  await page.keyboard.press('ArrowLeft');
  await expect(pill(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(pill(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(pill(page)).toBeFocused();
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(2);
});

test('near the top it opens downward, rows reversed: Comment at the click, Remove farthest; the label and a press outside close it', async ({ page, request }) => {
  await open(page, request);
  await selectTwo(page);
  // Pan the board up until the pill is near the stage's top: no room above for the grid.
  const stage = (await page.locator(bid('stage')).boundingBox())!;
  await page.mouse.move(stage.x + stage.width - 40, stage.y + stage.height - 40);
  for (let i = 0; i < 60 && (await pill(page).boundingBox())!.y - stage.y > 40; i += 1) await page.mouse.wheel(0, 12);
  const at = await clickPill(page, 0.7);
  await expect(bar(page)).toHaveAttribute('data-side', 'below');
  await expectAt(cell(page, 'comment'), at);
  expect(await drawn(page)).toEqual([...CELLS.slice(6), ...CELLS.slice(3, 6), ...CELLS.slice(0, 3)]);
  // Remove is in the row farthest from the click, at its far corner (the label at the other).
  const rows = await bar(page).locator('[data-row]').evaluateAll((es, y) => es.map((e) => {
    const r = e.getBoundingClientRect();
    return { c: e.getAttribute('data-command') ?? 'label', d: Math.round(Math.abs(r.y + r.height / 2 - y)) };
  }), at.y);
  const farthest = Math.max(...rows.map((c) => c.d));
  expect(rows.filter((c) => c.d === farthest).map((c) => c.c)).toEqual(['label', 'reset-places', 'remove']);
  await page.keyboard.press('ArrowDown');
  await expect(cell(page, 'width')).toBeFocused();
  // The label closes it.
  await pill(page).click();
  await expect(pill(page)).toHaveAttribute('aria-expanded', 'false');
  // A press outside closes it too.
  await clickPill(page, 0.5);
  await page.mouse.click(stage.x + stage.width - 30, stage.y + stage.height - 30);
  await expect(bar(page)).not.toHaveAttribute('data-open', '');
});

/** The open grid's ground as drawn: its glass over the first opaque background behind it. */
const ground = (page: Page): Promise<Rgb> => bar(page).evaluate((b) => {
  let under: Element | null = b.parentElement;
  const opaque = (e: Element) => getComputedStyle(e).backgroundColor.match(/[\d.]+/g)?.[3] !== '0';
  while (under && !opaque(under)) under = under.parentElement;
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = under ? getComputedStyle(under).backgroundColor : '#fff';
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = getComputedStyle(b).backgroundColor;
  ctx.fillRect(0, 0, 1, 1);
  return [...ctx.getImageData(0, 0, 1, 1).data.slice(0, 3)] as Rgb;
});

for (const theme of THEMES) {
  test(`axe passes with the grid open; the labels meet their APCA tiers on its glass (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    await open(page, request);
    await selectTwo(page);
    await clickPill(page, 0.5);
    // The grid opens over the cards and their container's title line (target-size, as in selection-pill.spec.ts).
    await expectNoAxeViolations(page, ['target-size']);
    const back = await ground(page);
    const ink = async (command: string) => pixel(page, await cell(page, command).evaluate((e) => getComputedStyle(e).color));
    expect(lc(await ink('width'), back), 'a label: the reading tier').toBeGreaterThanOrEqual(60);
    expect(lc(await ink('remove'), back), 'Remove\'s red: the label tier').toBeGreaterThanOrEqual(45);
    expect(lc(await pixel(page, await pill(page).evaluate((e) => getComputedStyle(e).color)), back)).toBeGreaterThanOrEqual(60);
  });
}
