// The toolbar at the window widths people use (verification fix, navigation VERIFY_01; toolbar icons
// and menu, 2026-10-09): with a long board title, the toolbar never scrolls or overflows and no
// control is cut off from 768px, the smallest supported width, upward; the board picker keeps at
// least 220px from 1024px up (its title truncates inside). With the toolbarMenu flag (on by default)
// Theme, Hide decided and Reply sit in a "⋯" menu, and Agents, Send to agent and Chat shrink to
// icons on a narrow window; every control is named, has a tooltip and passes axe. Off, the toolbar
// is as it was. It runs on the empty project's server (EMPTY_BASE) after new-board.spec.ts, which it
// does not disturb: it adds one board, opened by its id. Then the gallery's toolbar section.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { EMPTY_BASE } from './perf-server.ts';

const THEMES: Theme[] = ['dark', 'light'];
const WIDTHS = [1500, 1440, 1280, 1200, 1100, 1024, 900, 768];
/** From this width up the board picker keeps its 220px. */
const PICKER_WIDE = 1024;
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
    { type: 'node', node: { region: 'roles', kind: 'question', title: 'Which role first?' } },
  ];
  // A board the agent made that the person has not opened: the "boards updated" chip shows too.
  const other = await request.post(`${EMPTY_BASE}/api/boards/another-board/write`, { headers, data: { items: [{ type: 'board', title: 'Another board' }] } });
  expect(other.status(), await other.text()).toBe(200);
  const wrote = await request.post(`${EMPTY_BASE}/api/boards/${BOARD}/write`, { headers, data: { items } });
  expect(wrote.status(), await wrote.text()).toBe(200);
}

let made = false;
async function open(page: Page, request: APIRequestContext, flags = ''): Promise<void> {
  await page.goto(`${EMPTY_BASE}/?vbwork${flags && `&flags=${flags}`}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: unknown }).__vbWork !== undefined);
  if (!made) { await setUp(page, request); made = true; }
  await page.locator('#board').selectOption(BOARD);
  await page.evaluate(() => (window as unknown as { __vbWork: { idle(): Promise<void> } }).__vbWork.idle());
  await expect(page.locator('#counts .vb-chip').first()).toBeVisible();
}

/** Every visible control in the toolbar and its end group, in order, with its box. */
async function controls(page: Page) {
  return page.evaluate(() => {
    const bar = document.querySelector('.vb-toolbar') as HTMLElement;
    const out = [...bar.querySelectorAll<HTMLElement>(':scope > *, .vb-toolbar-end > *')]
      .filter((e) => !e.classList.contains('vb-visually-hidden') && !e.classList.contains('vb-toolbar-end')
        && e.getClientRects().length > 0)
      .map((e) => { const r = e.getBoundingClientRect(); return { id: e.id || (e.getAttribute('class') ?? ''), left: r.left, right: r.right, width: r.width }; });
    return { scroll: bar.scrollWidth - bar.clientWidth, page: document.documentElement.scrollWidth - window.innerWidth, out, width: window.innerWidth };
  });
}

const menuButton = (page: Page) => page.locator('#toolbar-menu');
const menu = (page: Page) => page.getByRole('menu', { name: 'More' });

for (const width of WIDTHS) {
  test(`at ${width}px a long title leaves every toolbar control whole and inside the window`, async ({ page, request }) => {
    await page.setViewportSize({ width, height: 800 });
    await open(page, request);
    await expect(page.locator('#boards-updated')).toBeVisible();
    const picker = (await page.locator('#board').boundingBox())!;
    if (width >= PICKER_WIDE) expect(picker.width, 'the picker').toBeGreaterThanOrEqual(220);
    const fit = await controls(page);
    console.log(width, JSON.stringify(fit.out.map((e) => [e.id, Math.round(e.left), Math.round(e.width)])));
    expect(fit.scroll, 'the toolbar scrolls').toBeLessThanOrEqual(0);
    expect(fit.page, 'the page scrolls sideways').toBeLessThanOrEqual(0);
    // Always visible (ruling 3): the picker, version, containers, counts, zoom, Agents, Send, Chat and "⋯".
    for (const id of ['board', 'version', 'containers', 'counts', 'send', 'chat-toggle']) {
      expect(fit.out.some((e) => e.id === id), `#${id} shows`).toBe(true);
    }
    for (const cls of ['vb-zoom', 'vb-agents', 'vb-menu']) expect(fit.out.some((e) => e.id.split(' ').includes(cls)), cls).toBe(true);
    // Nothing is cut off or overlaps its neighbour: in order, each ends before the next starts.
    for (const e of fit.out) {
      expect(e.left, `${e.id} starts inside the window`).toBeGreaterThanOrEqual(0);
      expect(e.right, `${e.id} ends inside the window`).toBeLessThanOrEqual(fit.width);
      expect(e.width, `${e.id} has room`).toBeGreaterThanOrEqual(24);
    }
    for (let i = 1; i < fit.out.length; i++) {
      expect(fit.out[i]!.left, `${fit.out[i]!.id} after ${fit.out[i - 1]!.id}`).toBeGreaterThanOrEqual(fit.out[i - 1]!.right - 0.5);
    }
    // Every control has a name and a title tooltip; the icon-only ones say their key there too.
    for (const sel of ['#send', '#chat-toggle', '#toolbar-menu', '.vb-agents > summary']) {
      const b = page.locator(sel);
      await expect(b).toBeVisible();
      expect((await b.evaluate((e) => (e as HTMLElement).getAttribute('aria-label') ?? e.textContent ?? '')).trim().length, sel).toBeGreaterThan(0);
      expect(await b.getAttribute('title'), `${sel} title`).toBeTruthy();
    }
    await expect(page.locator('#chat-toggle')).toHaveAttribute('title', /· T$/);
    // The open menu stays inside the window too.
    await menuButton(page).click();
    const box = (await menu(page).boundingBox())!;
    expect(box.x, 'the menu starts inside the window').toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, 'the menu ends inside the window').toBeLessThanOrEqual(width);
    for (const theme of THEMES) {
      await setTheme(page, theme);
      await expectNoAxeViolations(page);
      if (process.env.TB_SHOTS) await page.locator('.vb-toolbar').screenshot({ path: `${process.env.TB_SHOTS}/toolbar-${width}-${theme}.png` });
    }
  });
}

test('a narrow window shows Agents, Send to agent and Chat as icons, a wide one with their words', async ({ page, request }) => {
  await page.setViewportSize({ width: 1600, height: 800 });
  await open(page, request);
  const words = (sel: string) => page.locator(`${sel} .vb-btn-text`).first();
  const icon = (sel: string) => page.locator(`${sel} .vb-btn-icon`).first();
  for (const sel of ['#send', '#chat-toggle', '.vb-agents > summary']) {
    await expect(words(sel)).toBeVisible();
    await expect(icon(sel)).toBeHidden();
  }
  await page.setViewportSize({ width: 1200, height: 800 });
  for (const sel of ['#send', '#chat-toggle', '.vb-agents > summary']) {
    await expect(icon(sel)).toBeVisible();
    expect((await words(sel).boundingBox())!.width, `${sel} words are for screen readers only`).toBeLessThanOrEqual(1);
  }
  // Agents keeps its holder count beside the icon.
  await expect(page.locator('.vb-agents > summary b')).toHaveText(/^\d+$/);
  await expect(page.locator('.vb-agents > summary')).toHaveAccessibleName(/^Agents\s*\d+$/);
});

test('the "⋯" menu: Theme, Hide decided and Reply as rows with their keys; a click opens it, a choice, Esc or a click outside closes it', async ({ page, request }) => {
  await open(page, request);
  await expect(page.locator('.vb-toolbar #hide, .vb-toolbar #theme, .vb-toolbar #reply-toggle')).toHaveCount(3);
  await expect(menu(page)).toBeHidden();
  await expect(menuButton(page)).toHaveAttribute('aria-haspopup', 'menu');
  await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'false');
  await menuButton(page).click();
  await expect(menu(page)).toBeVisible();
  await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'true');
  const rows = menu(page).locator('[role^="menuitem"]');
  // The alignSetting flag (on by default) adds Centre cards after Hide decided (layout-controls.spec.ts
  // tests it), the lockBoard flag Lock board (lock-board.spec.ts), the archiveBoard flag Archive board…
  // (picker-archive.spec.ts) and the openFolder flag Open folder… last (open-folder.spec.ts).
  await expect(rows).toHaveText([/Theme: system/, /Hide decided.*H/, /Centre cards/, /Reply/, /^Lock board$/, /Archive board…/, /Open folder…/]);
  await expect(rows.first()).toBeFocused();
  // Hide decided: a checkbox row; choosing it closes the menu and gives focus back to "⋯".
  await expect(menu(page).getByRole('menuitemcheckbox', { name: /Hide decided/ })).toHaveAttribute('aria-checked', 'false');
  // By id from here: getByRole does not find a row while the menu is closed.
  const hide = page.locator('#hide');
  await expect(hide).toHaveAttribute('aria-keyshortcuts', 'h');
  await hide.click();
  await expect(menu(page)).toBeHidden();
  await expect(menuButton(page)).toBeFocused();
  await expect(hide).toHaveAttribute('aria-checked', 'true');
  // The H key still works from the board, and the row follows it.
  await page.locator('#stage').focus();
  await page.keyboard.press('h');
  await expect(hide).toHaveAttribute('aria-checked', 'false');
  // Theme cycles system, light, dark as the button did.
  await menuButton(page).click();
  await menu(page).getByRole('menuitem', { name: /Theme: system/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await menuButton(page).click();
  await expect(menu(page).getByRole('menuitem', { name: /Theme: light/ })).toBeVisible();
  // A click outside closes it, and nothing else happens.
  await page.locator('#stage').click({ position: { x: 40, y: 300 } });
  await expect(menu(page)).toBeHidden();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  // Reply's panel still opens from the menu.
  await menuButton(page).click();
  const reply = menu(page).getByRole('menuitem', { name: /Reply/ });
  await expect(reply).toHaveAttribute('aria-expanded', 'false');
  await reply.click();
  await expect(page.locator('#reply')).toBeVisible();
  await expect(page.locator('#reply-text')).toBeFocused();
  await page.locator('#reply-close').click();
});

test('the "⋯" menu by keyboard: Enter opens it, arrows move, H chooses Hide decided, Esc closes it and Tab leaves it', async ({ page, request }) => {
  await open(page, request);
  await menuButton(page).focus();
  await page.keyboard.press('Enter');
  const rows = menu(page).locator('[role^="menuitem"]');
  await expect(rows.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(rows.nth(1)).toBeFocused();
  await page.keyboard.press('End');
  await expect(rows.last()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(rows.nth(0)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(rows.last()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu(page)).toBeHidden();
  await expect(menuButton(page)).toBeFocused();
  // Esc closed the menu only: the theme and hide are as they were.
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
  await page.keyboard.press('Enter');
  await page.keyboard.press('h');
  await expect(menu(page)).toBeHidden();
  await expect(page.locator('#hide')).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Enter');
  await expect(rows.nth(0)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(menu(page)).toBeHidden();
});

for (const theme of THEMES) {
  test(`the open menu passes axe (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    await open(page, request);
    await menuButton(page).click();
    await expect(menu(page)).toBeVisible();
    await expectNoAxeViolations(page);
  });
}

test('with -toolbarMenu the toolbar is as it was: Hide decided, Theme and Reply are buttons, no "⋯"', async ({ page, request }) => {
  await page.setViewportSize({ width: 1600, height: 800 });
  await open(page, request, '-toolbarMenu');
  await expect(menuButton(page)).toHaveCount(0);
  for (const id of ['hide', 'theme', 'reply-toggle']) await expect(page.getByRole('button').and(page.locator(`#${id}`))).toBeVisible();
  await expect(page.locator('#send .vb-btn-icon, .vb-agents .vb-btn-icon')).toHaveCount(0);
  await expect(page.locator('#theme')).toHaveText(/Theme: system/);
});

// ---- The gallery's toolbar section (toolbarMenu flag) ----
const section = (page: Page) => page.locator('section[data-feature="toolbarMenu"]');

test('gallery: the toolbar section shows by default, wide, narrow and with the menu open, and not with -toolbarMenu', async ({ page }) => {
  await page.goto('/gallery.html?flags=-toolbarMenu');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  await expect(section(page).locator('.vb-toolbar-end')).toHaveCount(3);
  await expect(section(page).getByRole('menu', { name: 'More' })).toBeVisible();
  // No sample repeats the board's ids.
  await expect(section(page).locator('[id="send"], [id="chat-toggle"], [id="toolbar-menu"], [id="hide"], [id="theme"], [id="reply-toggle"]')).toHaveCount(0);
});

for (const theme of THEMES) {
  test(`gallery: the toolbar section passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`toolbar-${theme}.png`);
  });
}
