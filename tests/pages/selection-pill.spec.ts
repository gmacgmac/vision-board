// The selection pill (stage5-follow-ups FE_02, flag selectionPill, on by default): selecting cards
// shows a pill ("2 selected" and a chevron, aria-expanded) where the bar sits; a click or Enter
// opens the compact bar, the pill first; a press outside (a card, the background), a pan or Esc
// (focus back on the pill) closes it, and a new selection starts closed. The selection's keys work
// with it closed; the Comment hover uses the accent hover fill in both themes; axe light and dark;
// off, today's bar; the gallery's samples. A board of its own, written by an agent through the API.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['dark', 'light'];
const TITLES = ['First idea', 'Second idea', 'Third idea'];
const BUTTONS = ['Comment', 'Move to', 'Reset places', 'Zoom to selection', 'Clear'];
let boards = 0;

/** A board of its own: three cards in one container, drawn by a new agent. */
async function draw(request: APIRequestContext): Promise<string> {
  const r = await request.post('/api/agents', { data: { label: 'Pill chat' } });
  const secret = (await r.json() as { secret: string }).secret;
  const board = `pill-${Date.now()}-${(boards += 1)}`;
  const items = [
    { type: 'board', title: 'Pill board' },
    { type: 'region', region: { id: 'ideas', title: 'Ideas', mode: 'grid' } },
    ...TITLES.map((title) => ({ type: 'node', node: { region: 'ideas', kind: 'question', title } })),
  ];
  const w = await request.post(`/api/boards/${board}/write`, { headers: { Authorization: `Bearer ${secret}` }, data: { items } });
  expect(w.status(), await w.text()).toBe(200);
  return board;
}

async function open(page: Page, request: APIRequestContext, query = ''): Promise<void> {
  const board = await draw(request);
  await page.goto(`/${query}#${board}`);
  await expect(page.locator('vb-node')).toHaveCount(3);
  await expect(page.locator('#world')).not.toHaveClass(/no-anim/);
  await expect(page.locator('#wires')).not.toHaveClass(/settling/);
}

const bar = (page: Page) => page.locator('vb-selection-bar');
const pill = (page: Page) => bar(page).locator('.vb-sb-pill');
const cards = (page: Page) => page.locator('vb-node');
const view = (page: Page) => page.locator('#world').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a);
/** The bar's buttons a person can see and reach, by their words. */
const shown = (page: Page) => bar(page).getByRole('button').allInnerTexts();

/** Select the first and third cards, one column of the grid, with the pointer (a click, then a
 *  Shift+click): the bar above them sits clear of the container's own buttons. */
async function selectTwo(page: Page): Promise<void> {
  await cards(page).nth(0).locator('.vb-node-title').click({ position: { x: 4, y: 4 } });
  await cards(page).nth(2).locator('.vb-node-title').click({ position: { x: 4, y: 4 }, modifiers: ['Shift'] });
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(2);
}

/** A point on the stage's own background, at its top right corner, clear of the cards. */
async function background(page: Page): Promise<{ x: number; y: number }> {
  const s = (await page.locator('#stage').boundingBox())!;
  return { x: s.x + s.width - 24, y: s.y + 24 };
}

async function expectClosed(page: Page, count: number): Promise<void> {
  await expect(pill(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(pill(page)).toHaveText(`${count} selected`);
  expect(await shown(page)).toEqual([`${count} selected`]);
}

async function expectOpen(page: Page): Promise<void> {
  await expect(pill(page)).toHaveAttribute('aria-expanded', 'true');
  expect(await shown(page)).toEqual(['2 selected', ...BUTTONS]);
}

test('a selection shows the pill; a click opens the compact bar, the pill first; a press outside closes it', async ({ page, request }) => {
  await open(page, request);
  await expect(bar(page)).toBeHidden();
  await selectTwo(page);
  await expect(bar(page)).toBeVisible();
  await expect(bar(page)).toHaveAttribute('role', 'toolbar');
  await expectClosed(page, 2);
  await pill(page).click();
  await expectOpen(page);
  // Compact, every button still a 24px target (WCAG 2.5.8).
  for (const b of await bar(page).getByRole('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(24);
  expect((await bar(page).boundingBox())!.height).toBeLessThan(40);
  // A press on a card outside the bar closes it; the card's click picks it, a new selection, closed.
  await cards(page).nth(1).locator('.vb-node-title').click({ position: { x: 4, y: 4 }, modifiers: ['Shift'] });
  await expectClosed(page, 3);
  // A click on the background closes it and clears the selection; the next selection starts closed.
  await pill(page).click();
  await expect(pill(page)).toHaveAttribute('aria-expanded', 'true');
  const p = await background(page);
  await page.mouse.click(p.x, p.y);
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(0);
  await expect(bar(page)).toBeHidden();
  await selectTwo(page);
  await expectClosed(page, 2);
});

test('a pan closes the open bar: the wheel, and a drag on the background', async ({ page, request }) => {
  await open(page, request);
  await selectTwo(page);
  await pill(page).click();
  await expectOpen(page);
  const p = await background(page);
  await page.mouse.move(p.x, p.y);
  await page.mouse.wheel(0, 30);
  await expectClosed(page, 2);
  await pill(page).click();
  await expectOpen(page);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.mouse.move(p.x - 40, p.y + 30, { steps: 6 });
  await page.mouse.up();
  await expectClosed(page, 2);
  // A pan is not a click: the selection stays.
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(2);
});

test('Enter opens it, Esc closes it with focus back on the pill, a second Esc clears the selection', async ({ page, request }) => {
  await open(page, request);
  await selectTwo(page);
  await pill(page).focus();
  await page.keyboard.press('Enter');
  await expectOpen(page);
  await expect(pill(page)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(bar(page).getByRole('button', { name: 'Comment' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expectClosed(page, 2);
  await expect(pill(page)).toBeFocused();
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(page.locator('vb-node[data-selected]')).toHaveCount(0);
  await expect(bar(page)).toBeHidden();
});

test('the selection\'s keys work with the pill closed: Z zooms to it, N opens the group note', async ({ page, request }) => {
  await open(page, request);
  // Zoomed out first: this small board fits at the largest zoom a fit gives, which Z gives too.
  await page.keyboard.press('-');
  const fit = await view(page);
  await selectTwo(page);
  await expectClosed(page, 2);
  await page.keyboard.press('z');
  await expect.poll(() => view(page)).toBeGreaterThan(fit);
  await page.keyboard.press('n');
  await expect(page.locator('vb-note-bubble')).toBeVisible();
  await expect(page.locator('vb-note-bubble')).toHaveAttribute('aria-label', /^Note on 2 cards: /);
  await expect(bar(page)).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page.locator('vb-note-bubble')).toBeHidden();
  await expectClosed(page, 2);
});

/** A token's colour as the page resolves it, in the theme the page shows. */
const tokenColour = (page: Page, token: string) => page.evaluate((t) => {
  const probe = document.createElement('div');
  probe.style.color = `var(${t})`;
  document.body.append(probe);
  const c = getComputedStyle(probe).color;
  probe.remove();
  return c;
}, token);

for (const theme of THEMES) {
  test(`hover: Comment wears the accent hover fill under its own ink; axe passes closed and open (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    await open(page, request);
    await selectTwo(page);
    // Zoom to the two cards: every card control at full size (the fit zoom's excuse, N13, is not needed).
    await page.keyboard.press('z');
    await expect.poll(() => view(page)).toBeGreaterThanOrEqual(1);
    await expectNoAxeViolations(page);
    await pill(page).click();
    await expectOpen(page);
    // The open bar sits above the selection, on its container's title line, so it crowds the
    // container's grip (target-size, as in reset-places.spec.ts); its own buttons are 24px (above).
    await expectNoAxeViolations(page, ['target-size']);
    const comment = bar(page).getByRole('button', { name: 'Comment' });
    await comment.hover();
    const look = await comment.evaluate((e) => ({ bg: getComputedStyle(e).backgroundColor, ink: getComputedStyle(e).color }));
    expect(look).toEqual({ bg: await tokenColour(page, '--vb-accent-fill-hover'), ink: await tokenColour(page, '--vb-ink-on-fill') });
  });
}

test('flag off (?flags=-selectionPill): today\'s bar, every button on selecting, no pill', async ({ page, request }) => {
  await open(page, request, '?flags=-selectionPill');
  await selectTwo(page);
  await expect(bar(page)).toBeVisible();
  await expect(pill(page)).toHaveCount(0);
  await expect(bar(page).locator('.vb-sb-count')).toHaveText('2 selected');
  expect(await shown(page)).toEqual(BUTTONS);
});

for (const theme of THEMES) {
  test(`gallery: the pill, the open bar, its hover and the area bar; axe; screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    const section = page.locator('section[data-pattern="selection-bar"]');
    await expect(section.locator('vb-selection-bar')).toHaveCount(4);
    await expect(section.locator('.vb-sb-pill[aria-expanded="false"]')).toHaveCount(1);
    await expect(section.locator('.vb-sb-pill[aria-expanded="true"]')).toHaveCount(2);
    await expect(section.locator('[data-look="hover"]')).toHaveCount(2);
    await expectNoAxeViolations(page);
    await expect(section).toHaveScreenshot(`selection-pill-gallery-${theme}.png`);
  });
}
