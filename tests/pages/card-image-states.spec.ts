// Images in cards, every other state (app-cards FE_03, D-048 rulings 19-23; PLAN.md § Goal state line 11):
// a missing file, a fake png and one over 8 MB each give their place to the box saying why (404, 415, 413
// from the route), a path out of the images folder or to the internet is the box and is never asked
// for, no alt text is the path; with the cardImages flag off nothing is an image; zoomed out past FAR_K
// or well off screen an image is not loaded until its card is near; and the gallery's section. Light
// and dark, axe. The end to end and the zoomed view: card-images.spec.ts.
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { IMAGES, imagesDir, pngOf, put } from '../../apps/board/tests/images-support.ts';
import type { AppServer } from './app-server.ts';
import { startAppServer } from './app-server.ts';
import { expect, expectNoAxeViolations, setTheme, test, zoomToControls } from './helpers.ts';
import type { Theme } from './helpers.ts';

const THEMES: Theme[] = ['light', 'dark'];

let s: AppServer;
test.beforeAll(async () => {
  s = await startAppServer();
  put(s.project, 'diagrams/flow.png', pngOf(800, 400, (x) => [52, 113, 120 + Math.round(x / 8)]));
  put(s.project, 'fake.png', 'a text file named .png');
  // Over the 8 MB limit without writing 8 MB: a sparse file that starts like a png.
  const big = path.join(imagesDir(s.project), 'big.png');
  fs.writeFileSync(big, IMAGES.png);
  fs.truncateSync(big, 8 * 1024 * 1024 + 1);
});
test.afterAll(async () => { await s.close(); });

/** The page's requests to the image route, as paths. */
function asked(page: Page): string[] {
  const seen: string[] = [];
  page.on('request', (r) => { const u = new URL(r.url()); if (u.pathname.startsWith('/board-images/') || u.hostname !== '127.0.0.1') seen.push(`${r.method()} ${u.pathname}`); });
  return seen;
}

async function open(page: Page, cards: object[], query = ''): Promise<number[]> {
  const { board, n } = await s.draw(cards);
  await page.goto(`${s.base}/${query}#${board}`);
  await expect(page.locator('vb-node')).toHaveCount(cards.length);
  return n;
}
const card = (page: Page, n: number) => page.locator(`vb-node[data-id="${n}"]`);

const REFUSED = { kind: 'risk', title: 'Pictures that can\'t be shown', body: [
  '![Old diagram](gone.png)', '![Chart](fake.png)', '![Scan](big.png)',
  '![Secret](../notes.png) ![Logo](https://example.com/logo.png)', '![](diagrams/flow.png)'].join('\n\n') };
/** The refusals this card causes on purpose: each file's question (HEAD) and the reason it fetches (GET). */
const ROUTE_REFUSALS = [
  /^response (404|413|415): (HEAD|GET) http:\/\/127\.0\.0\.1:\d+\/board-images\/(gone|fake|big)\.png$/,
  /Failed to load resource: the server responded with a status of (404|413|415)/,
];

test.describe('missing and refused', () => {
  test.use({ expected: { problems: ROUTE_REFUSALS } });

  for (const theme of THEMES) {
    test(`a missing file, a fake png, one over 8 MB, a path out of the folder and an internet address each say why in their place; no alt text is the path (${theme})`, async ({ page }) => {
      await setTheme(page, theme);
      const requests = asked(page);
      const [n] = await open(page, [REFUSED]);
      const boxes = card(page, n!).locator('.vb-md-noimg');
      await expect(boxes).toHaveText([
        'Image not found: gone.png',
        'Image not shown: fake.png (not a real png)',
        'Image not shown: big.png (over 8 MB)',
        'Image not shown: ../notes.png (must be inside the images folder)',
        'Image not shown: https://example.com/logo.png (no images from the internet)',
      ]);
      await expect(card(page, n!).locator('.vb-node-body')).toContainText('diagrams/flow.png');
      await expect(card(page, n!).locator('img')).toHaveCount(0);
      // Neither the path out of the folder nor the internet address was ever asked for.
      expect(requests.filter((r) => /notes|example|logo/.test(r))).toEqual([]);
      expect(requests.some((r) => r.endsWith('/gone.png'))).toBe(true);
      // At 100%, so the card's own buttons are drawn at their size (this tall card fits below it).
      const scale = () => page.locator('#world').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).a);
      for (let i = 0; i < 8 && (await scale()) < 1; i += 1) await page.keyboard.press('+');
      await expectNoAxeViolations(page);
      await expect(card(page, n!)).toHaveScreenshot(`card-image-refused-${theme}.png`);
    });
  }
});

test('with the cardImages flag off, ![alt](path) stays its text and nothing is asked for', async ({ page }) => {
  const requests = asked(page);
  const [n] = await open(page, [{ kind: 'finding', title: 'Flag off', body: '![Flow](diagrams/flow.png)' }], '?flags=-cardImages');
  await expect(card(page, n!).locator('.vb-node-body')).toHaveText('![Flow](diagrams/flow.png)');
  await expect(card(page, n!).locator('img, .vb-img, .vb-md-noimg')).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(requests).toEqual([]);
});

/** Open board `board` with the view the person left it at (keepView: sessionStorage `vb.view.<board>`). */
async function openAt(page: Page, view: { x: number; y: number; k: number }, card0: object): Promise<number> {
  const { board, n: [n] } = await s.draw([card0]);
  await page.addInitScript(([key, v]) => sessionStorage.setItem(key, v), [`vb.view.${board}`, JSON.stringify(view)] as const);
  await page.goto(`${s.base}/#${board}`);
  await expect(page.locator('vb-node')).toHaveCount(1);
  return n!;
}
const loaded = (page: Page, n: number) => card(page, n).locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0 && i.hasAttribute('src'));

test('zoomed out past FAR_K, an image is not loaded; zoomed in, it is', async ({ page }) => {
  const requests = asked(page);
  const n = await openAt(page, { x: 400, y: 300, k: 0.2 }, { kind: 'finding', title: 'Far', body: '![Flow](diagrams/flow.png)' });
  await expect(page.locator('#stage')).toHaveAttribute('data-zoom', 'far');
  await page.waitForTimeout(500);
  expect(requests).toEqual([]);
  expect(await loaded(page, n)).toBe(false);
  await zoomToControls(page);
  await expect.poll(() => loaded(page, n)).toBe(true);
  expect(requests.length).toBeGreaterThan(0);
});

test('well off screen, an image is not loaded; once its card comes into view, it is', async ({ page }) => {
  const requests = asked(page);
  const n = await openAt(page, { x: 30_000, y: 30_000, k: 1 }, { kind: 'finding', title: 'Away', body: '![Flow](diagrams/flow.png)' });
  await page.waitForTimeout(500);
  expect(requests).toEqual([]);
  await page.keyboard.press('f');
  await expect.poll(() => loaded(page, n)).toBe(true);
});

// The gallery (the main test server, whose project holds the gallery's pictures: gallery-images.ts).
const gallery = (page: Page) => page.locator('section[data-pattern="image-view"]');
const galleryLoaded = (page: Page, id: string) =>
  gallery(page).locator(`vb-node[data-id="${id}"] img`).evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0);

for (const theme of THEMES) {
  test(`gallery: images in cards in every state, from the gallery's own pictures (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(gallery(page).locator('vb-node')).toHaveCount(8);
    for (const id of ['img-wide', 'img-tall']) await expect.poll(() => galleryLoaded(page, id)).toBe(true);
    await expect(gallery(page).locator('vb-node[data-id="img-loading"] img')).not.toHaveAttribute('src');
    await expect(gallery(page).locator('.vb-md-noimg')).toHaveText([
      'Image not found: gallery/gone.png', 'Image not shown: gallery/scan.png (over 8 MB)', 'Image not shown: gallery/chart.png (not a real png)',
      'Image not shown: ../notes.png (must be inside the images folder)', 'Image not shown: https://example.com/logo.png (no images from the internet)',
    ]);
    await expectNoAxeViolations(page);
    await expect(gallery(page)).toHaveScreenshot(`gallery-images-${theme}.png`);
  });
}

test.describe('gallery, with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('gallery: its pictures open in the zoomed view, with motion and without it', async ({ page }) => {
    await page.goto('/gallery.html');
    await expect.poll(() => galleryLoaded(page, 'img-wide')).toBe(true);
    await page.evaluate(() => {
      const animate = Element.prototype.animate;
      const w = window as unknown as { animated: number };
      w.animated = 0;
      Element.prototype.animate = function (this: Element, ...args: Parameters<Element['animate']>) { w.animated += 1; return animate.apply(this, args); };
    });
    const animated = () => page.evaluate(() => (window as unknown as { animated: number }).animated);
    const dialog = page.getByRole('dialog', { name: 'Sign-in flow, three steps' });
    await page.getByRole('button', { name: 'Open without motion' }).click(); // the gallery's sample of the view without motion
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect(await animated()).toBe(0);
    await gallery(page).getByRole('button', { name: 'Sign-in flow, three steps' }).click();
    await expect(dialog).toBeVisible();
    await expect.poll(animated).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});

test.describe('a file that goes', () => {
  test.use({ expected: { problems: [/^response 404: (HEAD|GET) http:\/\/127\.0\.0\.1:\d+\/board-images\/going\.png$/, /status of 404/] } });

  test('opening an image whose file has gone: the view closes, the box says so, and focus is on its card', async ({ page }) => {
    put(s.project, 'going.png', pngOf(400, 200));
    const [n] = await open(page, [{ kind: 'finding', title: 'Going', body: '![Going](going.png)' }]);
    const button = card(page, n!).locator('.vb-img');
    await expect.poll(() => button.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
    fs.rmSync(path.join(imagesDir(s.project), 'going.png'));
    await button.click();
    await expect(card(page, n!).locator('.vb-md-noimg')).toHaveText('Image not found: going.png');
    await expect(page.locator('vb-image-view dialog')).toBeHidden();
    await expect(card(page, n!)).toBeFocused();
  });
});

test('closed, opened again and Esc, all before the first close has finished: the view still closes and focus goes back', async ({ page }) => {
  const [n] = await open(page, [{ kind: 'finding', title: 'Again', body: '![Again](diagrams/flow.png)' }]);
  const button = card(page, n!).locator('.vb-img');
  await expect.poll(() => button.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  await button.click();
  const dialog = page.locator('vb-image-view dialog');
  await expect(dialog).toBeVisible();
  // The dialog's close event is a task of its own: here the second open and its Esc (the cancel) come first.
  const closedBetween = await page.evaluate(async () => {
    const view = document.querySelector('vb-image-view') as HTMLElement & { close(): void; open(i: HTMLImageElement): void; shown: HTMLImageElement | null };
    const dlg = view.querySelector('dialog')!;
    const img = view.shown!;
    view.close();
    for (let i = 0; i < 3 && dlg.open; i += 1) await Promise.resolve(); // reduced motion: it closes in a microtask
    const closed = !dlg.open;
    view.open(img);
    dlg.dispatchEvent(new Event('cancel', { cancelable: true }));
    return closed;
  });
  expect(closedBetween).toBe(true);
  await expect(dialog).toBeHidden();
  await expect(button).toBeFocused();
});
