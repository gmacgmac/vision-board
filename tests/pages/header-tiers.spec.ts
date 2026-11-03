// The header by its own width (adaptiveHeader flag, on by default; board/chrome/header-tier.ts). Three forms with
// one copy of each control: full, half and a third of the design's 1470px. Nothing is cut off down to a 400px
// bar, with a long name and every chip that comes and goes; every action is reachable at a third, by
// pointer and by keys; the bar reads its own width, not the window's, with no jump on load; axe and APCA,
// light and dark; the gallery's section. -adaptiveHeader is the bar as it was (toolbar.spec.ts). It runs on
// the worker's empty project (EMPTY_BASE), fresh for this file: two boards, one crowded.
import type { APIRequestContext, Page } from '@playwright/test';
import { expect, expectNoAxeViolations, setTheme, test, bid } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { EMPTY_BASE } from './ports.ts';
import { folderDialog, menu, menuButton } from './board-page.ts';
import { lc, pixel, resolved } from './apca.ts';
import { expectBarPasses, expectWhole } from './header-fit.ts';

const THEMES: Theme[] = ['light', 'dark'];
const LONG = 'Quarterly hiring plan for the platform and data teams across every region, with budgets and open questions';
const BOARD = 'header-board';
const QUIET = 'quiet-board';
const FORMS = [[1600, 'full'], [1470, 'full'], [1300, 'full'], [1299, 'half'], [1000, 'half'], [735, 'half'], [620, 'half'], [619, 'third'], [490, 'third'], [400, 'third']] as const;

let agent = '';
async function writeAs(request: APIRequestContext, board: string, items: object[]) {
  const wrote = await request.post(`${EMPTY_BASE}/api/boards/${board}/write`, { headers: { Authorization: `Bearer ${agent}` }, data: { items } });
  expect(wrote.status(), await wrote.text()).toBe(200);
  return (await wrote.json() as { results: { n?: number }[] }).results;
}
const node = (title: string, n?: number) => ({ type: 'node', ...(n !== undefined && { n }), node: { region: 'roles', kind: 'question', title } });

let cards: number[] = [];
async function setUp(page: Page, request: APIRequestContext) {
  agent = (await (await request.post(`${EMPTY_BASE}/api/agents`, { data: { label: 'Header chat' } })).json() as { secret: string }).secret;
  const made = await writeAs(request, BOARD, [{ type: 'board', title: LONG }, { type: 'region', region: { id: 'roles', title: 'Roles', mode: 'grid' } }, node('Which role first?'), node('Who pays?'), node('When?')]);
  cards = made.slice(2).map((r) => r.n!);
  await writeAs(request, QUIET, [{ type: 'board', title: 'A quiet board' }, { type: 'region', region: { id: 'roles', title: 'Roles', mode: 'grid' } }, node('One card')]);
}

let ready = false;
/** The long-named board, open and drawn, at `width`. */
async function open(page: Page, request: APIRequestContext, width: number, board = BOARD, flags = '') {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${EMPTY_BASE}/?vbwork${flags && `&flags=${flags}`}`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: unknown }).__vbWork !== undefined);
  if (!ready) { await setUp(page, request); ready = true; }
  await page.goto(`${EMPTY_BASE}/?vbwork${flags && `&flags=${flags}`}#${board}`);
  await page.reload();
  await expect(page.locator('vb-node').first()).toBeVisible();
  await page.evaluate(() => (window as unknown as { __vbWork: { idle(): Promise<void> } }).__vbWork.idle());
}

const act = async (page: Page, body: object) => {
  const r = await page.request.post(`${EMPTY_BASE}/api/boards/${BOARD}/act`, { data: { type: 'act', board: BOARD, ...body } });
  expect(r.status(), await r.text()).toBe(201);
};

/** Everything that comes and goes on the bar at once: locked, flagged, replied, a new card, a board updated. */
let flagged = false;
async function crowd(page: Page, request: APIRequestContext) {
  await act(page, { action: 'unlock' }).catch(() => undefined); // a test that failed may have left it locked
  await writeAs(request, BOARD, [node('Who pays, and from which budget?', cards[1]), node(`A card added ${Date.now()}`)]);
  await writeAs(request, QUIET, [node(`Another card ${Date.now()}`)]);
  if (!flagged) { // once: a press flags or unflags, and a card holds one note not yet sent
    await act(page, { action: 'comment', n: cards[0], ver: 1, text: 'Which team?' });
    await act(page, { action: 'flag', n: cards[2] });
  }
  flagged = true;
  await act(page, { action: 'lock' });
  await page.reload();
  await expect(page.locator('vb-node').first()).toBeVisible();
  await expect(page.locator('.vb-world')).not.toHaveClass(/no-anim/); // settled: the zoom that hides the cards' controls is in
  await page.evaluate(() => (window as unknown as { __vbWork: { idle(): Promise<void> } }).__vbWork.idle());
  await expect(page.locator('.vb-toolbar [data-tone="new"]').first()).toHaveCount(1, { timeout: 10_000 });
}
const uncrowd = (page: Page) => act(page, { action: 'unlock' });

for (const [width, form] of FORMS) {
  test(`${width}px is the ${form} form and a long name leaves every control whole, quiet or crowded`, async ({ page, request }) => {
    await open(page, request, width);
    await expect(page.locator('.vb-toolbar')).toHaveAttribute('data-tier', form);
    await expectWhole(page, 'quiet');
    await crowd(page, request);
    await expect(page.locator(bid('locked'))).toBeVisible();
    await expectWhole(page, 'crowded');
    // At full's first width the path can still give 70px, for Send's longest word and Chat's marks (floors: folder 36, board 100).
    if (width === 1300) {
      const [folder, name] = [(await page.locator(bid('folder-chip')).boundingBox())!, (await page.locator('.vb-path-board').boundingBox())!];
      expect(folder.width + name.width).toBeGreaterThanOrEqual(206);
    }
    // A long board name is cut before the folder's name is, from 1400px up.
    if (width === 1470) expect(await page.locator(`${bid('folder-chip')} .vb-folder-chip-name`).evaluate((e) => e.getBoundingClientRect().width)).toBeGreaterThan(30);
    // The open "⋯" stays inside the window, and scrolls inside itself when it is the taller.
    await menuButton(page).click();
    const box = (await page.locator(`${bid('toolbar-menu')} ~ .vb-menu-surface[data-fields], ${bid('toolbar-menu')} ~ .vb-menu-surface > .vb-menu-list`).first().boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    await page.keyboard.press('Escape');
    await uncrowd(page);
  });
}

test('the bar goes by its own width, not the window\'s, and redraws its form as it changes', async ({ page, request }) => {
  await open(page, request, 1600);
  const bar = page.locator('.vb-toolbar');
  await expect(bar).toHaveAttribute('data-tier', 'full');
  // A host's pane, or the chat's room: the window stays 1600px wide, the bar does not.
  await bar.evaluate((e) => { e.style.right = '865px'; });
  await expect(bar).toHaveAttribute('data-tier', 'half');
  await bar.evaluate((e) => { e.style.right = '1100px'; });
  await expect(bar).toHaveAttribute('data-tier', 'third');
  await bar.evaluate((e) => { e.style.right = ''; });
  await expect(bar).toHaveAttribute('data-tier', 'full');
  await page.setViewportSize({ width: 735, height: 900 });
  await expect(bar).toHaveAttribute('data-tier', 'half');
});

for (const [width, form] of [[735, 'half'], [490, 'third']] as const) {
  test(`a page opened at ${width}px draws its form from the start: no other form first`, async ({ page, request }) => {
    await open(page, request, width);
    await page.addInitScript(() => {
      const seen: string[] = [];
      (window as unknown as { __tiers: string[] }).__tiers = seen;
      new MutationObserver(() => {
        const t = document.querySelector('.vb-toolbar')?.getAttribute('data-tier');
        if (t && seen.at(-1) !== t) seen.push(t);
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-tier'] });
    });
    await page.reload();
    await expect(page.locator('.vb-toolbar')).toHaveAttribute('data-tier', form);
    await page.evaluate(() => (window as unknown as { __vbWork: { idle(): Promise<void> } }).__vbWork.idle());
    expect(await page.evaluate(() => (window as unknown as { __tiers: string[] }).__tiers)).toEqual([form]);
  });
}

test('full: one path, the title once as the page\'s heading, the closed picker without a version', async ({ page, request }) => {
  await open(page, request, 1470, QUIET);
  const path = page.getByRole('navigation', { name: 'Where you are' });
  await expect(path.locator('.vb-path-name')).toHaveText('A quiet board');
  await expect(path.locator('.vb-path-board')).toHaveAttribute('title', 'A quiet board');
  await expect(path.locator('.vb-path-sep')).toHaveCount(2);
  await expect(page.locator('.vb-title')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: 'A quiet board' })).toHaveCount(1);
  expect((await page.locator(bid('title')).boundingBox())!.width).toBeLessThanOrEqual(1);
  await expect(page.locator(`.vb-path-part:has(${bid('version')})`)).toHaveAttribute('title', 'Version');
  expect(await page.locator(`.vb-path-part:has(${bid('version')})`).evaluate((e) => e.firstChild?.textContent)).toMatch(/^v\d+$/);
  // The picker and the version are the native selects, unseen over their faces; Containers and the counts too.
  for (const id of [bid('board'), bid('version'), bid('containers'), bid('open-cards')]) expect(await page.locator(id).evaluate((e) => [e.tagName, getComputedStyle(e).opacity])).toEqual(['SELECT', '0']);
  await expect(page.locator(bid('counts'))).toContainText(/\d+ open/);
  await expect(page.locator('.vb-zoom').getByRole('button')).toHaveText(['−', '+', 'Fit']);
  await expect(page.locator(bid('send'))).toContainText('Send to agent');
  await expect(page.locator('#chat-toggle')).toContainText('Chat');
  // The path's own keys: Tab from the picker reaches the version, then Containers.
  await page.locator(bid('board')).focus();
  await page.keyboard.press('Tab');
  await expect(page.locator(bid('version'))).toBeFocused();
  await expect(page.locator('.vb-path-part').nth(1)).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Tab');
  await expect(page.locator(bid('containers'))).toBeFocused();
  // The picker opens the other board by its select.
  await page.locator(bid('board')).selectOption(BOARD);
  await expect(page.locator('.vb-path-name')).toHaveText(LONG);
  await expect(page.locator(bid('title'))).toHaveText(LONG);
});

test('half: Version and Containers are rows of "⋯" that do what they did; the zoom is a small menu', async ({ page, request }) => {
  await open(page, request, 735, BOARD);
  await expect(page.locator('.vb-toolbar > .vb-brand')).toHaveCount(0);
  await expect(page.locator(`.vb-path ${bid('folder-chip')} .vb-folder-chip-name`)).toBeHidden();
  await expect(page.locator(`.vb-path ${bid('version')}`)).toHaveCount(0);
  await menuButton(page).click();
  await expect(page.locator(bid('toolbar-menu'))).toHaveAttribute('title', /^More: Version, Containers, Theme/);
  const fields = page.getByRole('group', { name: 'Moved from the bar' });
  await expect(fields.locator(bid('version'))).toBeFocused();
  await expect(fields).toContainText(/Version\s*v\d+/);
  await page.keyboard.press('ArrowDown');
  await expect(fields.locator(bid('containers'))).toBeFocused();
  await expect(fields.locator(bid('containers')).locator('..')).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#theme')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await page.locator(bid('containers')).selectOption('roles');
  await expect(fields).toBeHidden();
  await expect(page.locator('vb-region[data-region="roles"]').getByRole('heading', { name: 'Roles' })).toBeFocused();
  // The zoom menu: − and + leave it open, and the level says so; Fit closes it; the keys are the shared menu's.
  const zoom = page.locator(bid('zoom-menu'));
  await zoom.click();
  const list = page.getByRole('menu', { name: 'Zoom' });
  const rows = list.getByRole('menuitem');
  await expect(rows).toHaveText([/Zoom out/, /Zoom in/, /Fit/]);
  await expect(rows.first()).toBeFocused();
  const before = await zoom.innerText();
  await rows.nth(1).click();
  await expect(zoom).not.toHaveText(before);
  await expect(list).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(list).toBeHidden();
  await expect(zoom).toBeFocused();
  await zoom.click();
  await rows.nth(2).click();
  await expect(list).toBeHidden();
  await expect(zoom).toHaveAccessibleName(/^Zoom \d+%, more zoom controls$/);
});

test('a third: the bar is the name, a compact count, Send, Chat and "⋯"; every action is in "⋯" and works', async ({ page, request }) => {
  await open(page, request, 490);
  await crowd(page, request);
  const fields = page.getByRole('group', { name: 'Moved from the bar' });
  const reopen = () => menuButton(page).click();
  // In the bar: the padlock alone, the count with its dot and its words for screen readers.
  await expect(page.locator(`${bid('locked')} .vb-btn-icon`)).toBeVisible();
  expect((await page.locator(`${bid('locked')} .vb-chip-word`).boundingBox())!.width).toBeLessThanOrEqual(1);
  await expect(page.locator(`${bid('counts')} .vb-count b`)).toHaveText(/^\d+$/);
  await expect(page.locator(`${bid('counts')} .vb-count-dot`)).toBeVisible();
  await expect(page.locator(bid('counts'))).toContainText(/\d+ open\s+\d+ new/);
  await expect(page.locator(bid('counts'))).toContainText('board updated');
  for (const id of [bid('send'), '#chat-toggle', bid('toolbar-menu'), bid('board')]) await expect(page.locator(id)).toBeVisible();
  for (const gone of ['.vb-brand', '.vb-zoom', '.vb-toolbar-end > .vb-agents', `${bid('counts')} [data-tone="agent"]`]) await expect(page.locator(gone)).toHaveCount(0);
  await reopen();
  await expect(menuButton(page)).toHaveAttribute('title', /Folder, Version, Containers, Open cards, New cards, Zoom, Agents, Theme/);
  // The rows, in the design's order, then the menu's own.
  await expect(fields.locator('> *').first()).toContainText('Folder');
  for (const word of ['Version', 'Containers', 'Open cards', 'New cards', 'Flagged', 'Zoom', 'Agents', 'Board updated']) await expect(fields).toContainText(word);
  await expect(menu(page).getByRole('menuitem', { name: 'Unlock board' })).toBeVisible();
  await expect(page.locator('#open-folder')).toHaveCount(0); // the Folder row stands for it
  // Keys: Up and Down walk every field and row, wrapping.
  await expect(page.locator(bid('folder-chip'))).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator(bid('version'))).toBeFocused();
  await page.keyboard.press('End');
  await expect(menu(page).getByRole('menuitem').last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.locator(bid('folder-chip'))).toBeFocused();
  // Folder: the dialog, focus back on "⋯".
  await page.locator(bid('folder-chip')).click();
  await expect(folderDialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menuButton(page)).toBeFocused();
  // Containers, Open and New: a native select over a row; a choice closes the menu and goes there.
  await reopen();
  await page.locator(bid('containers')).selectOption('roles');
  await expect(fields).toBeHidden();
  await expect(page.locator('vb-region[data-region="roles"]').getByRole('heading', { name: 'Roles' })).toBeFocused();
  await reopen();
  await page.locator(bid('open-cards')).selectOption(String(cards[2]));
  await expect(fields).toBeHidden();
  await expect(page.locator(`vb-node[data-id="${cards[2]}"]`)).toBeFocused();
  await reopen();
  await expect(page.locator(`${bid('fresh-cards')} option`).nth(1)).toBeAttached();
  await page.locator(bid('fresh-cards')).selectOption({ index: 1 });
  await expect(fields).toBeHidden();
  // Flagged: the next flagged card.
  await reopen();
  await page.locator(bid('flagged')).click();
  await expect(page.locator(`vb-node[data-id="${cards[2]}"]`)).toBeFocused();
  await uncrowd(page);
});

test('a third: the zoom row, the version row, Agents and the menu\'s own rows', async ({ page, request }) => {
  await open(page, request, 490);
  await menuButton(page).click();
  const fields = page.getByRole('group', { name: 'Moved from the bar' });
  // − and + leave the menu open and move the level; Fit closes it. A polite status says the level, menu open or not.
  const row = fields.getByRole('group', { name: 'Zoom' });
  const level = row.locator('.vb-menu-zoom-level');
  const was = await level.textContent();
  await row.getByRole('button', { name: 'Zoom in' }).click();
  await expect(level).not.toHaveText(was!);
  await expect(fields).toBeVisible();
  await expect(page.locator('.vb-toolbar-end > [role="status"]').first()).toHaveText(/^Zoom \d+%$/);
  await row.getByRole('button', { name: 'Fit' }).click();
  await expect(fields).toBeHidden();
  // Agents: its list opens in place, inside the surface.
  await menuButton(page).click();
  const agents = fields.locator('.vb-agents');
  await agents.locator('summary').click();
  await expect(agents.getByRole('heading', { name: 'Can draw on this board' })).toBeVisible();
  await expect(agents).toContainText('Header chat');
  const [panel, surface] = [(await agents.locator('.vb-agents-panel').boundingBox())!, (await page.locator('.vb-menu-surface').boundingBox())!];
  expect(panel.x).toBeGreaterThanOrEqual(surface.x);
  expect(panel.x + panel.width).toBeLessThanOrEqual(surface.x + surface.width);
  await agents.locator('summary').click();
  // The menu's own rows work as ever: Theme, and H for Hide answered.
  await menu(page).getByRole('menuitem', { name: /Theme: system/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await menuButton(page).click();
  await menu(page).getByRole('menuitem', { name: /Theme: light/ }).click();
  await menuButton(page).click();
  await menu(page).getByRole('menuitem', { name: /Theme: dark/ }).click();
  await menuButton(page).click();
  await page.keyboard.press('h');
  await expect(fields).toBeHidden();
  await expect(page.locator(bid('hide'))).toHaveAttribute('aria-checked', 'true');
  await menuButton(page).click();
  await page.keyboard.press('h');
  // The version row: a past version, then back.
  await writeAs(request, BOARD, [node(`A later card ${Date.now()}`)]);
  await menuButton(page).click();
  await expect(page.locator(`${bid('version')} option`).nth(1)).toBeAttached();
  await page.locator(bid('version')).selectOption({ index: 1 });
  await expect(fields).toBeHidden();
  await expect(page.locator('.vb-banner')).toBeVisible();
  await expect(page.locator(bid('send'))).toHaveCount(0);
  await page.locator('.vb-banner').getByRole('button').click();
  await expect(page.locator('.vb-banner')).toHaveCount(0);
});

test('a short window: "⋯" scrolls inside itself and keeps every row reachable', async ({ page, request }) => {
  await open(page, request, 490);
  await page.setViewportSize({ width: 490, height: 320 });
  await menuButton(page).click();
  const surface = page.locator('.vb-menu-surface');
  const box = (await surface.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(320);
  await page.keyboard.press('End');
  const last = menu(page).getByRole('menuitem').last();
  await expect(last).toBeFocused();
  await expect(last).toBeInViewport();
});

for (const theme of THEMES) {
  test(`axe at every form with its menus open (${theme})`, async ({ page, request }) => {
    await setTheme(page, theme);
    for (const width of [1470, 735, 490]) {
      await open(page, request, width);
      await crowd(page, request);
      await expectBarPasses(page);
      await menuButton(page).click();
      await expectBarPasses(page);
      await page.keyboard.press('Escape');
      if (width === 735) {
        await page.locator(bid('zoom-menu')).click();
        await expectBarPasses(page);
        await page.keyboard.press('Escape');
      }
      await uncrowd(page);
    }
  });

  test(`APCA (${theme}): the path Lc 60, its separator and the count's dot Lc 30, a row's value Lc 60`, async ({ page, request }) => {
    await setTheme(page, theme);
    await open(page, request, 1470);
    const paint = (css: string) => resolved(page, css).then((c) => pixel(page, c));
    const colour = (sel: string) => page.locator(sel).first().evaluate((e) => getComputedStyle(e).color).then((c) => pixel(page, c));
    const bar = await paint('var(--vb-surface-region)');
    const found: [string, number, number][] = [
      ['board name', lc(await colour('.vb-path-name'), bar), 60], ['version', lc(await colour('.vb-path-part:not(.vb-path-board)'), bar), 60],
      ['folder', lc(await colour(`${bid('folder-chip')} .vb-folder-chip-name`), bar), 60], ['separator', lc(await colour('.vb-path-sep'), bar), 30],
    ];
    await page.locator('.vb-path-board').hover();
    const sunken = await paint('var(--vb-surface-sunken)');
    found.push(['board name hovered', lc(await colour('.vb-path-name'), sunken), 60]);
    await page.setViewportSize({ width: 490, height: 900 });
    await writeAs(request, BOARD, [node(`Dot card ${Date.now()}`)]);
    await expect(page.locator(`${bid('counts')} .vb-count-dot`)).toBeVisible();
    found.push(['count dot', lc(await paint('var(--vb-accent)'), await paint('var(--vb-surface-sunken)')), 30]);
    await menuButton(page).click();
    const raised = await paint('var(--vb-surface-raised)');
    found.push(['row value', lc(await colour('.vb-menu-value'), raised), 60], ['row word', lc(await colour('.vb-menu-fields .vb-menu-label'), raised), 60], ['zoom level', lc(await colour('.vb-menu-zoom-level'), raised), 60]);
    console.log(`APCA ${theme}: ${found.map(([w, v]) => `${w} ${v.toFixed(1)}`).join(', ')}`);
    for (const [what, v, bar2] of found) expect(Math.abs(v), what).toBeGreaterThanOrEqual(bar2);
    await page.keyboard.press('Escape');
  });
}

// ---- The gallery's section (adaptiveHeader flag) ----
const section = (page: Page) => page.locator('section[data-feature="adaptiveHeader"]');

test('gallery: the section is last, draws the three forms with ids of its own, and not with -adaptiveHeader', async ({ page }) => {
  await page.goto('/gallery.html?flags=-adaptiveHeader');
  await expect(page.locator('section[data-pattern]').first()).toBeVisible();
  await expect(section(page)).toHaveCount(0);
  await page.goto('/gallery.html');
  await expect(page.locator('main > section').last()).toHaveAttribute('data-feature', 'adaptiveHeader');
  for (const form of ['full', 'half', 'third']) await expect(section(page).locator(`.vb-toolbar[data-tier="${form}"]`).first()).toBeVisible();
  await expect(section(page).getByRole('menu', { name: 'Zoom' })).toBeVisible();
  await expect(section(page).locator(`${bid('board')}, ${bid('version')}, ${bid('containers')}, ${bid('send')}, [id="chat-toggle"], ${bid('toolbar-menu')}, ${bid('counts')}, ${bid('title')}, ${bid('folder-chip')}, ${bid('open-cards')}, ${bid('locked')}`)).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./); // a sample's theme is not the page's
});

for (const theme of THEMES) {
  test(`gallery: the section passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(section(page)).toBeVisible();
    await expectNoAxeViolations(page);
    await expect(section(page)).toHaveScreenshot(`header-${theme}.png`);
  });
}
