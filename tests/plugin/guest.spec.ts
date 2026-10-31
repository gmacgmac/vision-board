// The board as a guest in a page that isn't its own (docs/specification/plugin.md § A guest in the host's page): a
// second Svelte round it, a host's loud element rules, the host's own keys, a modal, and a short pane.
import { sveltes } from './fake-host/host-svelte.ts';
import { drawn, drawPicture, drawPlans, drive, expect, openHost, test } from './harness.ts';

test('a second Svelte: the host\'s runtime and the bundle\'s both work, the board nested in the host\'s tree, each click heard once', async ({ page, host }, info) => {
  const { host: theirs, bundle } = sveltes();
  info.annotations.push({ type: 'svelte', description: `host ${theirs} beside bundle ${bundle}${theirs === bundle ? ' (the same version: two runtimes, not two versions)' : ''}` });
  console.log(`svelte: host ${theirs}, bundle ${bundle}`);
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  await expect(page.locator('.host-pane .host-root.vb-board')).toHaveCount(1);
  // The host's Svelte reacts to its own click, once.
  await page.locator('#host-count').click();
  await expect(page.locator('#host-count')).toHaveText('Host clicks 1');
  // The bundle's: a menu that toggles would stay shut on a click heard twice, and the host's count stays.
  await page.locator('.host-root #toolbar-menu').click();
  await expect(page.locator('.host-root #toolbar-menu')).toHaveAttribute('aria-expanded', 'true');
  await page.locator('.host-root #toolbar-menu').click();
  await expect(page.locator('.host-root #toolbar-menu')).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#host-count')).toHaveText('Host clicks 1');
  // A chip the board attached redraws in the host's Svelte: the two meet only through the seam.
  await page.locator('.host-root vb-node').first().click();
  await expect(page.locator('#host-chips li')).toHaveCount(1);
});

test('a host\'s loud element rules do not reach the board\'s controls', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  const hostButton = await page.locator('#host-button').evaluate((e) => getComputedStyle(e).backgroundColor);
  expect(hostButton, 'the sheet is in').toBe('rgb(255, 200, 0)');
  const inBoard = await page.locator('.host-root #toolbar-menu').evaluate((e) => {
    const s = getComputedStyle(e);
    return { background: s.backgroundColor, border: s.borderTopColor, transform: s.textTransform, family: s.fontFamily };
  });
  expect(inBoard.background).not.toBe('rgb(255, 200, 0)');
  expect(inBoard.border).not.toBe('rgb(0, 0, 255)');
  expect(inBoard.transform).toBe('none');
  expect(inBoard.family).not.toBe('serif');
  const title = await page.locator('.host-root vb-node').first().locator('.vb-node-title').evaluate((e) => ({ color: getComputedStyle(e).color, transform: getComputedStyle(e).textTransform }));
  expect(title.transform).toBe('none');
  expect(title.color).not.toBe('rgb(200, 0, 0)');
});

test('keys: a host\'s listener on the document skips a key the board used; a capture listener on the window hears first; a key outside the root is the host\'s', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  await drive(page, 'hearKeys');
  // Inside the board: `h` (Hide answered) is the board's, marked used before the document hears it.
  await page.locator('.host-root .vb-stage').focus();
  await page.keyboard.press('h');
  await expect.poll(async () => (await drive(page, 'boardStatus')).hide).toBe(true);
  // A key the board does not use stays the host's.
  await page.keyboard.press('q');
  // Outside it: the board hears nothing, the host's shortcut acts.
  await page.locator('#host-button').focus();
  await page.keyboard.press('h');
  expect((await drive(page, 'boardStatus')).hide, 'not the board\'s').toBe(true);
  await page.keyboard.press('q');
  const { heard, order, mine } = await drive(page, 'keys');
  expect(heard).toEqual([{ key: 'h', prevented: true }, { key: 'q', prevented: false }, { key: 'h', prevented: false }, { key: 'q', prevented: false }]);
  expect(mine).toBe(2);
  expect(order[0], 'a capture listener runs before the board\'s, so it reads nothing marked').toEqual({ key: 'h', prevented: false });
});

test('the zoomed view is a real modal: the page is inert while it is open, and its Esc goes no further than the root', async ({ page, host }) => {
  await drawPicture(host);
  await openHost(page, host);
  await expect(page.locator('.host-root vb-node')).toHaveCount(1);
  await drive(page, 'reveal', { cards: [1] });
  const button = page.locator('.host-root vb-node .vb-img').first();
  await expect.poll(() => button.locator('img').evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await button.click();
  const dialog = page.locator('.host-root vb-image-view dialog');
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((d) => d.matches(':modal'))).toBe(true);
  expect(await page.evaluate(() => { document.getElementById('host-input')!.focus(); return document.activeElement?.id; }), 'the host\'s field takes no focus').not.toBe('host-input');
  await drive(page, 'hearKeys');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect((await drive(page, 'keys')).heard, 'the host\'s document never heard it').toEqual([]);
  await page.locator('#host-input').focus();
  await expect(page.locator('#host-input'), 'the page is back').toBeFocused();
});

test('a page holds one built version: a second copy mounts, and the first copy\'s elements stay', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  expect(await drive(page, 'mountSecondCopy')).toEqual({ sameElements: true });
  await expect(page.locator('.plain-root vb-node')).toHaveCount(3);
  await drive(page, 'unmountSecond');
});

test('two mounts in one page work apart', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  await drive(page, 'mountPlain');
  await expect(page.locator('#plain vb-node')).toHaveCount(3);
  const ids = await page.evaluate(() => { const all = [...document.querySelectorAll('[id]')].map((e) => e.id); return all.filter((id, i) => all.indexOf(id) !== i); });
  expect(ids, 'no id twice').toEqual([]);
  await page.locator('.host-root vb-node').first().click();
  await expect(page.locator('#host-chips li')).toHaveCount(1);
  await drive(page, 'unmountSecond');
  await expect(page.locator('.host-root vb-node')).toHaveCount(3);
});

test('theme: the three --host-* properties reach the board, and light or dark follows the system, or data-theme', async ({ page, host }) => {
  await drawPlans(host);
  await openHost(page, host);
  await drawn(page);
  const read = () => page.locator('.host-root').evaluate((e) => {
    const s = getComputedStyle(e);
    return { font: s.fontFamily, mono: s.getPropertyValue('--vb-font-mono'), scale: s.getPropertyValue('--vb-ui-text-scale').trim() };
  });
  expect((await read()).font).toContain('system-ui');
  await page.evaluate(() => {
    const s = document.documentElement.style;
    s.setProperty('--host-font', 'Georgia'); s.setProperty('--host-font-mono', 'Courier'); s.setProperty('--host-text-scale', '1');
  });
  await expect.poll(read).toEqual({ font: 'Georgia', mono: expect.stringContaining('Courier'), scale: '1' });
  const ground = () => page.locator('.host-root .vb-stage').evaluate((e) => getComputedStyle(e).backgroundColor);
  await page.emulateMedia({ colorScheme: 'light' });
  const light = await ground();
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(ground).not.toBe(light);
  const dark = await ground();
  // `data-theme` on the page's root forces one; on the board's root, or a `color-scheme` of the host's, does not.
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await expect.poll(ground).toBe(light);
  await page.evaluate(() => { delete document.documentElement.dataset.theme; document.querySelector<HTMLElement>('.host-root')!.dataset.theme = 'light'; document.documentElement.style.colorScheme = 'light'; });
  await expect.poll(ground).toBe(dark);
});
