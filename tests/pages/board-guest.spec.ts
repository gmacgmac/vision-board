// The board is a guest in any page (PROOF_01; docs/principles.md § The board is a plugin; tracker M12,
// M13, M21, M22): a fake host with its own keys, its own storage and two boards from different folders,
// the same board name in each. Its flags come from that host alone, its saved view goes through that
// host and touches no storage of the page's, a key it does not use stays the host's and one it uses is
// marked so, its pictures load from that host's route, and the zoomed view draws inside its root and
// goes with `unmount`. The fixture is board-host-fixture.ts.
import type { Page } from '@playwright/test';
import { expect, test } from './helpers.ts';
import { call, LINES, open } from './board-host-page.ts';

const ORIGIN = 'http://host.test';
/** A 1 by 1 png, the host's every picture. */
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEBgIApD5fRAAAAABJRU5ErkJggg==', 'base64');
/** The fixture's first card, its body two pictures: a png and an svg. */
const BODY = '![Flow](flow.png)\n\n![Plan](plan.svg)';
const WITH_IMAGES = LINES.map((l) => {
  const line = l as unknown as { type: string; n?: number; node?: object };
  return line.type === 'node' && line.n === 1 ? { ...line, node: { ...line.node, body: BODY } } : l;
});
const cards = LINES.filter((l) => l.type === 'node').length;

/** The host's own page, at its own address, serving pictures under `/pics/`. */
async function hostPage(page: Page): Promise<string[]> {
  const asked: string[] = [];
  await page.route(`${ORIGIN}/**`, (route) => {
    const req = route.request();
    if (new URL(req.url()).pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Host</title>' });
    asked.push(`${req.method()} ${new URL(req.url()).pathname}`);
    return route.fulfill({ contentType: 'image/png', headers: { ETag: '"one"', 'Cache-Control': 'no-cache' }, body: PNG });
  });
  await page.goto(`${ORIGIN}/`);
  await open(page);
  return asked;
}

test('every flag comes from the host: two boards, two settings; a picture is drawn or stays words by its own host', async ({ page }) => {
  await hostPage(page);
  await call(page, (h, lines: object[]) => {
    h.mount('a', lines, lines.length, { imageRoute: '/pics/a/' });
    h.mount('b', lines, lines.length, { imageRoute: '/pics/b/', settings: { cardImages: false } });
  }, WITH_IMAGES);
  await expect(page.locator('#a vb-node')).toHaveCount(cards);
  await expect(page.locator('#b vb-node')).toHaveCount(cards);
  await expect(page.locator('#a vb-node').first().locator('img.vb-md-img')).toHaveCount(2);
  await expect(page.locator('#b vb-node').first().locator('img')).toHaveCount(0);
  await expect(page.locator('#b vb-node').first().locator('.vb-node-body')).toContainText('![Flow](flow.png)');
});

test('svgImages comes from the host too: off, that board refuses an svg, and the other still draws it', async ({ page }) => {
  await hostPage(page);
  await call(page, (h, lines: object[]) => {
    h.mount('a', lines, lines.length, { imageRoute: '/pics/a/' });
    h.mount('b', lines, lines.length, { imageRoute: '/pics/b/', settings: { svgImages: false } });
  }, WITH_IMAGES);
  await expect(page.locator('#a vb-node')).toHaveCount(cards);
  await expect(page.locator('#a vb-node').first().locator('img.vb-md-img')).toHaveCount(2);
  await expect(page.locator('#b vb-node').first().locator('img.vb-md-img')).toHaveCount(1);
  await expect(page.locator('#b vb-node').first().locator('.vb-md-noimg')).toContainText('plan.svg');
});

test('the saved view goes through the host: two folders with a board "roadmap" never clash, and the page\'s storage stays empty', async ({ page }) => {
  await hostPage(page);
  await call(page, (h, lines: object[]) => {
    h.mount('a', lines, lines.length, { folder: 'one' });
    h.mount('b', lines, lines.length, { folder: 'two' });
  }, LINES);
  await expect(page.locator('#a vb-node')).toHaveCount(cards);
  await call(page, (h) => h.idle('a'));
  // Each opened by fitting, and kept that: the same view, in two stores.
  const viewOf = (folder: string) => call(page, (h, f: string) => h.store(f)['view.roadmap'], folder);
  await expect.poll(() => viewOf('one')).toBeTruthy();
  await expect.poll(() => viewOf('two')).toBeTruthy();
  const fitted = await viewOf('two');
  const box = (await page.locator('#a .vb-stage').boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -300);
  await page.keyboard.up('Control');
  await expect.poll(() => viewOf('one'), 'the zoom is kept for this folder').not.toBe(fitted);
  const saved = await viewOf('one');
  expect(await viewOf('two'), 'the other folder keeps its own').toBe(fitted);
  expect(await page.evaluate(() => [sessionStorage.length, localStorage.length]), 'nothing of the page\'s').toEqual([0, 0]);

  // Mounted again from the same folder, it opens where the person left it; the other host never saw it.
  const zoom = await call(page, (h) => h.status('a').zoom);
  await call(page, (h) => h.unmount('a'));
  await call(page, (h, lines: object[]) => h.mount('a', lines, lines.length, { folder: 'one' }), LINES);
  await expect(page.locator('#a vb-node')).toHaveCount(cards);
  await expect.poll(() => call(page, (h) => h.status('a').zoom)).toBe(zoom);
  expect(await viewOf('one')).toBe(saved);
});

test('an open layer takes Esc only when focus is in its board: with focus in the host\'s field the Esc is the host\'s, and the tip stays', async ({ page }) => {
  await open(page);
  await call(page, (h, lines: object[]) => { h.addHostControls('host-bar'); h.hearKeys(); h.mount('a', lines, lines.length); h.mount('b', lines, lines.length); }, LINES);
  await expect(page.locator('#a vb-node')).toHaveCount(cards);
  const tip = page.locator('#a .vb-keys-tip');
  await page.locator('#a .vb-keys-btn').hover();
  await expect(tip).toBeVisible();

  await page.locator('#host-input').focus();
  await page.keyboard.press('Escape');
  expect(await call(page, (h) => h.heard()), 'the host hears it, unmarked').toEqual([{ key: 'Escape', prevented: false }]);
  await expect(tip).toBeVisible();

  // In the other board it is that board's, not this tip's.
  await page.locator('#b .vb-stage').focus();
  await page.keyboard.press('Escape');
  await expect(tip).toBeVisible();
  await call(page, (h) => h.heard());

  // In its own board the tip takes it, and nothing goes on.
  await page.locator('#a .vb-stage').focus();
  await page.keyboard.press('Escape');
  await expect(tip).toBeHidden();
  expect(await call(page, (h) => h.heard()), 'taken').toEqual([]);
});

test('every key the board acts on is marked used, whenever the host listens; a key it does not use, and an Esc with nothing to escape, stay the host\'s', async ({ page }) => {
  await open(page);
  // The host's listener goes on the document first, so it hears before anything else there.
  await call(page, (h, lines: object[]) => { h.hearKeys(); h.mount('a', lines, lines.length); }, LINES);
  const first = page.locator('#a vb-node').first();
  await expect(page.locator('#a vb-node')).toHaveCount(cards);
  const press = async (key: string) => { await page.keyboard.press(key); return (await call(page, (h) => h.heard())).at(-1)?.prevented; };

  await page.locator('#a .vb-stage').focus();
  expect(await press('Escape'), 'nothing to escape').toBe(false);
  expect(await press('q'), 'no such key').toBe(false);
  expect(await press('h'), 'Hide answered').toBe(true);
  expect(await press('h')).toBe(true);
  expect(await press('Shift+?'), 'the keys help').toBe(true);
  await first.focus();
  expect(await press('j'), 'the next card').toBe(true);
  await first.focus();
  expect(await press('r'), 'reset places').toBe(true);
  expect(await press('Space'), 'select').toBe(true);
  await expect.poll(() => call(page, (h) => h.status('a').selection)).toMatch(/1 card selected/);
  expect(await press('Escape'), 'clears the selection').toBe(true);
  expect(await press('Escape'), 'nothing left to escape').toBe(false);

  // A menu's and a dialog's keys go no further than the board.
  await page.locator('#a .vb-toolbar [aria-haspopup="menu"]').first().focus();
  await page.keyboard.press('Enter');
  await call(page, (h) => h.heard());
  await page.keyboard.press('Escape');
  expect((await call(page, (h) => h.heard())).filter((k) => !k.prevented), 'a menu\'s Esc').toEqual([]);
});

test('typing includes contenteditable: no shortcut fires in one inside the board', async ({ page }) => {
  await open(page);
  await call(page, (h, lines: object[]) => h.mount('a', lines, lines.length), LINES);
  await expect(page.locator('#a vb-node')).toHaveCount(cards);
  await page.evaluate(() => {
    const field = document.createElement('div');
    field.id = 'typed';
    field.contentEditable = 'true';
    field.setAttribute('aria-label', 'Typed');
    document.querySelector('#a .vb-stage')!.append(field);
    field.focus();
  });
  await page.keyboard.type('hj');
  await expect(page.locator('#typed')).toHaveText('hj');
  expect(await call(page, (h) => h.status('a').hide)).toBe(false);
  await page.evaluate(() => document.getElementById('typed')!.remove());
});

test('pictures load from the host\'s route: the version and the picture ask there, and nothing asks a fixed path', async ({ page }) => {
  const asked = await hostPage(page);
  await call(page, (h, lines: object[]) => {
    h.mount('a', lines, lines.length, { imageRoute: '/pics/one/' });
    h.mount('b', lines, lines.length, { imageRoute: '/pics/two/' });
  }, WITH_IMAGES);
  const pic = (id: string) => page.locator(`#${id} vb-node`).first().locator('img.vb-md-img').first();
  await expect(page.locator('#a vb-node')).toHaveCount(cards);
  await call(page, (h) => { h.reveal('a', { cards: [1] }); h.reveal('b', { cards: [1] }); }); // a picture waits until its card is close enough to read
  await expect.poll(() => pic('a').getAttribute('src')).toMatch(/^\/pics\/one\/flow\.png\?v=one$/);
  await expect.poll(() => pic('b').getAttribute('src')).toMatch(/^\/pics\/two\/flow\.png\?v=one$/);
  expect(asked).toContain('HEAD /pics/one/flow.png');
  expect(asked).toContain('GET /pics/two/flow.png');
  expect(asked.filter((a) => !a.includes(' /pics/')), 'no fixed path').toEqual([]);
});

test('the zoomed view draws inside its root, says its Esc is used, and goes with `unmount`, open or not', async ({ page }) => {
  await hostPage(page);
  await call(page, (h) => h.hearKeys());
  const baseline = await call(page, (h) => h.listeners());
  await call(page, (h, lines: object[]) => h.mount('a', lines, lines.length, { imageRoute: '/pics/a/' }), WITH_IMAGES);
  const button = page.locator('#a vb-node').first().locator('.vb-img').first();
  await expect(page.locator('#a vb-node')).toHaveCount(cards);
  await call(page, (h) => h.reveal('a', { cards: [1] })); // a picture waits until its card is close enough to read
  await expect(button).toBeVisible();
  await expect.poll(() => button.locator('img').evaluate((i) => (i as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await button.click();
  const dialog = page.locator('#a vb-image-view dialog');
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => document.querySelectorAll('body > vb-image-view').length), 'in the root, not the page').toBe(0);

  // The dialog covers the root, not the window.
  const [root, shown] = await Promise.all([page.locator('#a').boundingBox(), dialog.boundingBox()]);
  expect(shown).toEqual(root);
  const pic = (await page.locator('#a .vb-iv-img').boundingBox())!;
  expect(pic.x).toBeGreaterThanOrEqual(root!.x);
  expect(pic.x + pic.width).toBeLessThanOrEqual(root!.x + root!.width);

  // Esc closes it, and the host's document never hears it.
  await call(page, (h) => h.heard());
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect((await call(page, (h) => h.heard())), 'the dialog\'s key stays in the board').toEqual([]);
  await expect(button).toBeFocused();

  // Open again, then unmount: nothing stays, its listener on the window included.
  await button.click();
  await expect(dialog).toBeVisible();
  await call(page, (h) => h.unmount('a'));
  expect(await page.evaluate(() => document.querySelectorAll('vb-image-view, dialog[open]').length)).toBe(0);
  expect(await call(page, (h) => h.listeners())).toBe(baseline);
});
