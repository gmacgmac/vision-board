// svg in cards, motion and the flag (D-064, host-fixes-and-svg SVG_01): an svg's CSS and SMIL animation
// play in its card; a person who asked the system for less motion sees CSS animation written inside
// `prefers-reduced-motion: no-preference` hold still (the browser's own setting, which reaches into an
// svg image; Playwright's emulated media does not, so that test launches its own Chromium with
// `--force-prefers-reduced-motion`); and with the svgImages flag off, an svg is refused as before svg,
// by the page's Markdown and by the server's route. Drawing, script and outside files: card-image-svg.spec.ts.
import type { Browser, Locator, Page } from '@playwright/test';
import { put } from '#board/testing';
import type { AppServer } from './app-server.ts';
import { startAppServer } from './app-server.ts';
import { expect, test } from './helpers.ts';
import { card } from './board-page.ts';

const NS = 'xmlns="http://www.w3.org/2000/svg"';
/** CSS animation, as the skill asks: inside `no-preference`, so it holds still for less motion. */
const SLIDE = `<svg ${NS} viewBox="0 0 200 100"><style>@media (prefers-reduced-motion: no-preference){rect{animation:m 1s linear infinite}}` +
  '@keyframes m{to{transform:translateX(150px)}}</style><rect width="50" height="100" fill="#3471d0"/></svg>';
/** SMIL animation: plays, and no media query can stop it (the skill says to keep it short). */
const SMIL = `<svg ${NS} viewBox="0 0 200 100"><rect width="50" height="100" fill="#1f8f7e"><animate attributeName="x" from="0" to="150" dur="1s" repeatCount="indefinite"/></rect></svg>`;
const SVG = `<svg ${NS} width="40" height="40"><rect width="40" height="40"/></svg>`;

let s: AppServer;
test.beforeAll(async () => {
  s = await startAppServer();
  put(s.project, 'slide.svg', SLIDE);
  put(s.project, 'smil.svg', SMIL);
});
test.afterAll(async () => { await s.close(); });

async function openOn(page: Page, server: AppServer, cards: object[], query = ''): Promise<number[]> {
  const { board, n } = await server.draw(cards);
  await page.goto(`${server.base}/${query}#${board}`);
  await expect(page.locator('vb-node')).toHaveCount(cards.length);
  return n;
}
async function imgOf(page: Page, n: number): Promise<Locator> {
  const img = card(page, n).locator('.vb-img img');
  await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  return img;
}
/** Whether `img` looks different 400 ms later. */
async function moves(page: Page, img: Locator): Promise<boolean> {
  const a = await img.screenshot({ animations: 'allow' });
  await page.waitForTimeout(400);
  return !a.equals(await img.screenshot({ animations: 'allow' }));
}
const CARDS = [{ kind: 'finding', title: 'CSS', body: '![A sliding bar](slide.svg)' }, { kind: 'finding', title: 'SMIL', body: '![A sliding box](smil.svg)' }];

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('an svg\'s CSS animation and its SMIL animation play in the card', async ({ page }) => {
    const [css, smil] = await openOn(page, s, CARDS);
    expect(await moves(page, await imgOf(page, css!))).toBe(true);
    expect(await moves(page, await imgOf(page, smil!))).toBe(true);
  });
});

test('for a person who asked for less motion, CSS animation inside no-preference holds still (SMIL does not)', async ({ playwright }) => {
  // Its own browser, with the system-wide setting; the suite's host rule kept, so nothing outside is reached.
  const browser: Browser = await playwright.chromium.launch({ args: ['--force-prefers-reduced-motion', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    const [css, smil] = await openOn(page, s, CARDS);
    expect(await moves(page, await imgOf(page, css!))).toBe(false);
    expect(await moves(page, await imgOf(page, smil!)), 'SMIL ignores the setting: the skill keeps it short').toBe(true);
  } finally { await browser.close(); }
});

test.describe('the svgImages flag off', () => {
  test.use({ expected: { problems: [/^response 415: (HEAD|GET) http:\/\/127\.0\.0\.1:\d+\/board-images\/logo\.svg$/, /Failed to load resource: the server responded with a status of 415/] } });

  test('off on the page, an svg path is the box in the words before svg, and nothing is asked for', async ({ page }) => {
    put(s.project, 'logo.svg', SVG);
    const asked: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/board-images/')) asked.push(r.url()); });
    const [n] = await openOn(page, s, [{ kind: 'finding', title: 'Flag off', body: '![Logo](logo.svg)' }], '?flags=-svgImages');
    await expect(card(page, n!).locator('.vb-md-noimg')).toHaveText('Image not shown: logo.svg (only png, jpeg, webp or gif)');
    await page.waitForTimeout(300);
    expect(asked).toEqual([]);
  });

  test('off on the server (VB_FLAGS=-svgImages), the route refuses an svg in the same words', async ({ page }) => {
    const off = await startAppServer({ flags: '-svgImages' });
    try {
      put(off.project, 'logo.svg', SVG);
      const [n] = await openOn(page, off, [{ kind: 'finding', title: 'Server flag off', body: '![Logo](logo.svg)' }]);
      await expect(card(page, n!).locator('.vb-md-noimg')).toHaveText('Image not shown: logo.svg (only png, jpeg, webp or gif)');
    } finally { await off.close(); }
  });
});
