// svg in cards, end to end (D-064, host-fixes-and-svg SVG_01): on a temp project (app-server.ts) an
// agent's svg draws in its card at its own size (its width and height, or its viewBox's shape) and opens
// in the zoomed view at 70% of the screen, light and dark, axe; an svg holding a script is drawn and the
// script never runs, in the card, in the zoomed view, or opened at its own address (the route's policy);
// an svg naming outside files makes no request for them; one with no size says why in its place; and the
// gallery's svg group. Animation, reduced motion and the flag off: card-image-svg-motion.spec.ts.
import type { Locator, Page, Request } from '@playwright/test';
import { put } from '#board/testing';
import type { AppServer } from './app-server.ts';
import { startAppServer } from './app-server.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { card } from './board-page.ts';
import { planSvg } from './gallery-images.ts';

const THEMES: Theme[] = ['light', 'dark'];
const NS = 'xmlns="http://www.w3.org/2000/svg"';
/** Every way an svg might run code: a script element, an onload handler and a handler on a shape. */
const EVIL = `<svg ${NS} viewBox="0 0 200 100" onload="fetch('/beacon/onload')">` +
  '<script>fetch("/beacon/script");try{parent.EVIL=1;top.EVIL=1}catch(e){}top.postMessage("evil","*");document.title="EVIL"</script>' +
  '<rect width="200" height="100" fill="#1f8f7e" onclick="fetch(\'/beacon/click\')"/></svg>';
/** An svg naming outside files every way it can: an image, a stylesheet, a font, a fill, a use, and one of the board's own images. */
const OUTSIDE = `<svg ${NS} viewBox="0 0 200 100"><style>@import url(http://127.0.0.1:9/outside.css);` +
  '@font-face{font-family:o;src:url(https://example.com/outside.woff)}text{font-family:o}rect{fill:url(http://example.com/outside.svg#g)}</style>' +
  '<image href="https://example.com/outside.png" width="50" height="50"/><image href="/board-images/plan.svg" width="50" height="50"/>' +
  '<use href="http://127.0.0.1:9/outside.svg#a"/><rect width="200" height="100"/><text x="10" y="50">o</text></svg>';
/** Sized by its viewBox alone: 3 to 1. */
const WIDE = `<svg ${NS} viewBox="0 0 300 100"><rect width="300" height="100" fill="#3471d0"/></svg>`;

let s: AppServer;
test.beforeAll(async () => {
  s = await startAppServer();
  put(s.project, 'plan.svg', planSvg());
  put(s.project, 'evil.svg', EVIL);
  put(s.project, 'outside.svg', OUTSIDE);
  put(s.project, 'wide.svg', WIDE);
  put(s.project, 'nosize.svg', `<svg ${NS}><rect width="10" height="10"/></svg>`);
});
test.afterAll(async () => { await s.close(); });

async function open(page: Page, cards: object[]): Promise<number[]> {
  const { board, n } = await s.draw(cards);
  await page.goto(`${s.base}/#${board}`);
  await expect(page.locator('vb-node')).toHaveCount(cards.length);
  return n;
}
/** A card's image button, once its picture loaded at the version the route named. */
async function imageOf(page: Page, n: number): Promise<Locator> {
  const button = card(page, n).locator('.vb-img');
  await expect.poll(() => button.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  return button;
}
const boxOf = (l: Locator) => l.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
const near = (a: number, b: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(1.5);
/** The zoomed picture, once it stopped moving (reduced motion: at once). */
async function zoomedBox(page: Page) {
  const pic = page.locator('vb-image-view .vb-iv-img');
  await expect(page.locator('vb-image-view dialog')).toBeVisible();
  await expect.poll(() => pic.evaluate((e) => getComputedStyle(e).transform)).toBe('none');
  return boxOf(pic);
}

for (const theme of THEMES) {
  test(`an svg sized by its width and height draws at the card's width with its own shape, and its card is measured with it (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    const [n] = await open(page, [{ kind: 'finding', title: 'The plan, as an svg', body: '![A plan in three steps](plan.svg)\n\nThree steps.' }]);
    const plan = await imageOf(page, n!);
    const img = plan.locator('img');
    await expect(img).toHaveAttribute('src', /^\/board-images\/plan\.svg\?v=[0-9a-f-]+$/);
    expect(await img.evaluate((i: HTMLImageElement) => [i.naturalWidth, i.naturalHeight])).toEqual([480, 240]);
    const [box, para] = [await boxOf(img), await boxOf(plan.locator('xpath=..'))];
    near(box.w, Math.min(480, para.w));
    near(box.h, box.w / 2);
    await expectNoAxeViolations(page);
    await expect(card(page, n!)).toHaveScreenshot(`card-image-svg-${theme}.png`);
  });
}

test('an svg sized by its viewBox alone keeps its shape on the card and opens to 70% of the screen\'s width', async ({ page }) => {
  const [n] = await open(page, [{ kind: 'finding', title: 'Wide', body: '![A wide bar](wide.svg)' }]);
  const wide = await imageOf(page, n!);
  const box = await boxOf(wide.locator('img'));
  near(box.h, box.w / 3);
  await wide.click();
  await expect(page.getByRole('dialog', { name: 'A wide bar' })).toBeVisible();
  const zoomed = await zoomedBox(page);
  near(zoomed.w, 0.7 * 1600);
  near(zoomed.h, zoomed.w / 3);
});

test('an svg holding a script is drawn and the script never runs: in the card, in the zoomed view, or opened at its own address', async ({ page, context }) => {
  const beacons: string[] = [];
  const watch = (p: Page) => p.on('request', (r: Request) => { if (r.url().includes('/beacon/')) beacons.push(r.url()); });
  watch(page);
  await page.addInitScript(() => { const w = window as unknown as { messages: number }; w.messages = 0; addEventListener('message', () => { w.messages += 1; }); });
  const [n] = await open(page, [{ kind: 'risk', title: 'A picture with a script', body: '![A green box](evil.svg)' }]);
  const evil = await imageOf(page, n!);
  await evil.click();
  await zoomedBox(page);
  await page.mouse.click(5, 5);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => [(window as unknown as { EVIL?: number }).EVIL, (window as unknown as { messages: number }).messages, document.title.includes('EVIL')]))
    .toEqual([undefined, 0, false]);
  // Opened at its own address, as "open image in new tab" or a link would: the route's policy blocks
  // the script and sandboxes the document (the browser reports the block on that page's console).
  const own = await context.newPage();
  watch(own);
  const res = await own.goto(`${s.base}/board-images/evil.svg`);
  expect(res?.headers()['content-security-policy']).toMatch(/default-src 'none'.*sandbox/);
  await own.waitForTimeout(500);
  expect(await own.evaluate(() => [(window as unknown as { EVIL?: number }).EVIL, document.title, origin])).toEqual([undefined, '', 'null']);
  await own.close();
  expect(beacons).toEqual([]);
});

test('an svg naming outside files, and another of the board\'s images, makes no request for any of them', async ({ page }) => {
  const asked: string[] = [];
  page.on('request', (r) => { const u = new URL(r.url()); if (u.hostname !== '127.0.0.1' || u.port !== new URL(s.base).port || /plan\.svg/.test(u.pathname)) asked.push(r.url()); });
  const [n] = await open(page, [{ kind: 'finding', title: 'Outside', body: '![Outside files](outside.svg)' }]);
  await (await imageOf(page, n!)).click();
  await zoomedBox(page);
  await page.waitForTimeout(500);
  expect(asked).toEqual([]);
});

test.describe('refused', () => {
  test.use({ expected: { problems: [/^response 415: (HEAD|GET) http:\/\/127\.0\.0\.1:\d+\/board-images\/nosize\.svg$/, /Failed to load resource: the server responded with a status of 415/] } });

  test('an svg that says no size gives its place to the box saying why', async ({ page }) => {
    const [n] = await open(page, [{ kind: 'finding', title: 'No size', body: '![Logo](nosize.svg)' }]);
    await expect(card(page, n!).locator('.vb-md-noimg')).toHaveText('Image not shown: nosize.svg (needs a viewBox, or a width and height)');
    await expect(card(page, n!).locator('img')).toHaveCount(0);
  });
});

// The gallery (the main test server, whose project holds the gallery's pictures: gallery-images.ts).
const svgGroup = (page: Page) => page.locator('section[data-pattern="image-view"] .g-group').filter({ has: page.getByRole('list', { name: 'SVG images in cards' }) });
const galleryLoaded = (page: Page, id: string) =>
  svgGroup(page).locator(`vb-node[data-id="${id}"] img`).evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0);

for (const theme of THEMES) {
  test(`gallery: svg in a card, animated, refused, and the buttons to open each (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    await page.goto('/gallery.html');
    await expect(svgGroup(page).locator('vb-node')).toHaveCount(3);
    for (const id of ['svg-plan', 'svg-pulse']) await expect.poll(() => galleryLoaded(page, id)).toBe(true);
    await expect(svgGroup(page).locator('.vb-md-noimg')).toHaveText(['Image not shown: gallery/logo.svg (needs a viewBox, or a width and height)']);
    await expectNoAxeViolations(page);
    // The pulse plays three times, about 1.6 s, then rests on its first frame: the screenshot waits for it.
    await page.waitForTimeout(2000);
    await expect(svgGroup(page)).toHaveScreenshot(`gallery-svg-${theme}.png`);
    await svgGroup(page).getByRole('button', { name: 'Open the svg' }).click();
    const box = await zoomedBox(page);
    near(box.w, 0.7 * 1600);
    near(box.h, box.w / 2);
  });
}
