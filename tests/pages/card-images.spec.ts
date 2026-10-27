// Images in cards, end to end (app-cards FE_03, D-048; PLAN.md § Goal state line 11): on a temp project
// (app-server.ts) an agent's card shows `![Flow](diagrams/flow.png)` from a subfolder at the card's
// width; a click and the keyboard open it to 70% of the screen on its longer side, for a wide and a tall
// image, at 1600×1000 and 1470×956 (from the boxes); Esc, a click outside it and the × close it, focus
// back on the image; a replaced image shows after its card is selected again (a conditional request is
// asserted, and none repeats on a timer), and opening it asks too; reduced motion; axe light and dark.
// The images are real PNGs made here (`pngOf`). Missing and refused images: card-image-states.spec.ts.
import type { Locator, Page, Request } from '@playwright/test';
import { pngOf, put } from '#board/testing';
import { tabTo } from './agent-board.ts';
import type { AppServer } from './app-server.ts';
import { startAppServer } from './app-server.ts';
import { expect, expectNoAxeViolations, setTheme, test } from './helpers.ts';
import type { Theme } from './helpers.ts';
import { card } from './board-page.ts';

const THEMES: Theme[] = ['light', 'dark'];
const SCREENS = [{ width: 1600, height: 1000 }, { width: 1470, height: 956 }];
/** A wide picture (2:1) and a tall one (1:2), each a smooth gradient. */
const WIDE = pngOf(1600, 800, (x, y) => [40 + Math.round(x / 10), 110, 200 - Math.round(y / 7)]);
const TALL = pngOf(600, 1200, (x, y) => [200, 90 + Math.round(y / 10), 60 + Math.round(x / 8)]);

let s: AppServer;
test.beforeAll(async () => {
  s = await startAppServer();
  put(s.project, 'diagrams/flow.png', WIDE);
  put(s.project, 'screens/phone.png', TALL);
});
test.afterAll(async () => { await s.close(); });

const FLOW = { kind: 'question', title: 'Is this the flow you meant?', body: '![Flow](diagrams/flow.png)\n\nThree steps from the start.' };
const PHONE = { kind: 'finding', title: 'The phone screen', body: '![Phone screen](screens/phone.png)' };
const PLAIN = { kind: 'note', title: 'Below the flow', body: 'A card under it in the grid.' };

/** An agent draws `cards` on a board of its own; the page opens it. */
async function open(page: Page, cards: object[]): Promise<number[]> {
  const { board, n } = await s.draw(cards);
  await page.goto(`${s.base}/#${board}`);
  await expect(page.locator('vb-node')).toHaveCount(cards.length);
  return n;
}

/** A card's image: its button, once its picture has loaded at the version the route named. */
async function imageOf(page: Page, n: number): Promise<Locator> {
  const button = card(page, n).locator('.vb-img');
  await expect.poll(() => button.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
  return button;
}
const boxOf = (l: Locator) => l.evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
const view = (page: Page) => page.locator('vb-image-view dialog');
const zoomed = (page: Page) => page.locator('vb-image-view .vb-iv-img');
/** The zoomed box, once it stopped moving (reduced motion: at once). */
async function zoomedBox(page: Page) {
  await expect(view(page)).toBeVisible();
  await expect.poll(() => zoomed(page).evaluate((e) => getComputedStyle(e).transform)).toBe('none');
  return boxOf(zoomed(page));
}
const near = (a: number, b: number) => expect(Math.abs(a - b), `${a} vs ${b}`).toBeLessThan(1.5);

for (const theme of THEMES) {
  test(`an agent's card shows ![Flow](diagrams/flow.png) from a subfolder at the card's width, and its card is measured with it (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    const [n, , below] = await open(page, [FLOW, PHONE, PLAIN]);
    const flow = await imageOf(page, n!);
    const img = flow.locator('img');
    await expect(img).toHaveAttribute('src', /^\/board-images\/diagrams\/flow\.png\?v=[0-9a-f-]+$/);
    await expect(img).toHaveAttribute('alt', 'Flow');
    await expect(card(page, n!).getByRole('button', { name: 'Flow' })).toHaveAttribute('aria-haspopup', 'dialog');
    // The card's width, its own shape (2:1).
    const [box, para] = [await boxOf(img), await boxOf(flow.locator('xpath=..'))];
    near(box.w, para.w);
    near(box.h, box.w / 2);
    // Measured again once it loaded: the card under it in the grid starts below it.
    await expect.poll(async () => (await boxOf(card(page, below!))).y - (await boxOf(card(page, n!))).y - (await boxOf(card(page, n!))).h).toBeGreaterThan(0);
    await expectNoAxeViolations(page);
    await expect(card(page, n!)).toHaveScreenshot(`card-image-${theme}.png`);
  });
}

for (const screen of SCREENS) {
  test(`a click opens a wide image to 70% of the screen's width, never past its height, at ${screen.width}×${screen.height}`, async ({ page }) => {
    await page.setViewportSize(screen);
    const [n] = await open(page, [FLOW]);
    await (await imageOf(page, n!)).click();
    await expect(page.getByRole('dialog', { name: 'Flow' })).toBeVisible();
    const box = await zoomedBox(page);
    near(box.w, 0.7 * screen.width);
    near(box.h, box.w / 2);
    near(box.x, (screen.width - box.w) / 2);
    near(box.y, (screen.height - box.h) / 2);
  });

  test(`the keyboard opens a tall image to 70% of the screen's height, at ${screen.width}×${screen.height}`, async ({ page }) => {
    await page.setViewportSize(screen);
    const [n] = await open(page, [PHONE]);
    const phone = await imageOf(page, n!);
    // A button in the card's tab order: from the card, Tab reaches it; Enter opens it, and Space too.
    await card(page, n!).focus();
    await tabTo(page, phone, 10); // past the size control (its glyph, then S, M, L and Auto while it has focus)
    for (const key of ['Enter', 'Space']) {
      await page.keyboard.press(key);
      await expect(page.getByRole('dialog', { name: 'Phone screen' })).toBeVisible();
      const box = await zoomedBox(page);
      near(box.h, 0.7 * screen.height);
      near(box.w, box.h / 2);
      await page.keyboard.press('Escape');
      await expect(view(page)).toBeHidden();
      await expect(phone).toBeFocused();
    }
  });
}

test('Esc, a click outside the image and the × each close it with focus back on the image; while open, focus stays on the × and the board neither pans nor zooms', async ({ page }) => {
  const [n] = await open(page, [FLOW]);
  const flow = await imageOf(page, n!);
  const world = () => page.locator('.vb-world').evaluate((e) => getComputedStyle(e).transform);
  const close = page.getByRole('button', { name: 'Close' });
  await flow.click();
  await expect(close).toBeFocused();
  await expect(close).toHaveAttribute('title', 'Close · Esc');
  const before = await world();
  for (const key of ['Tab', 'Shift+Tab', '+', '-', 'f']) await page.keyboard.press(key);
  await expect(close).toBeFocused();
  await page.mouse.move(800, 500);
  await page.mouse.wheel(0, 400);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -300);
  await page.keyboard.up('Control');
  // A click on the picture itself keeps it open.
  await zoomed(page).click();
  await expect(view(page)).toBeVisible();
  expect(await world()).toBe(before);
  await page.keyboard.press('Escape');
  await expect(view(page)).toBeHidden();
  await expect(flow).toBeFocused();
  // A click outside the picture, on the backdrop.
  await flow.click();
  await expect(view(page)).toBeVisible();
  await page.mouse.click(40, 500);
  await expect(view(page)).toBeHidden();
  await expect(flow).toBeFocused();
  // The ×.
  await flow.click();
  await close.click();
  await expect(view(page)).toBeHidden();
  await expect(flow).toBeFocused();
  expect(await world()).toBe(before);
});

interface Asked { method: string; url: string; ifNoneMatch?: string; status?: number; etag?: string }
/** Every request the page makes to the image route: method, address, the ETag it names and the answer's. */
function imageRequests(page: Page): Asked[] {
  const seen: Asked[] = [];
  page.on('request', (r: Request) => {
    if (!new URL(r.url()).pathname.startsWith('/board-images/')) return;
    const entry: Asked = { method: r.method(), url: r.url(), ...(r.headers()['if-none-match'] && { ifNoneMatch: r.headers()['if-none-match'] }) };
    seen.push(entry);
    void r.response().then((res) => { if (res) Object.assign(entry, { status: res.status(), etag: res.headers().etag }); });
  });
  return seen;
}
/** The ETag the first question about `path` was answered with: the version the page shows. */
async function firstVersion(asked: Asked[], path: string): Promise<string> {
  await expect.poll(() => asked.find((r) => r.method === 'HEAD' && r.url.endsWith(path))?.etag).toMatch(/^"[0-9a-f]+-[0-9a-f]+"$/);
  return asked.find((r) => r.method === 'HEAD' && r.url.endsWith(path))!.etag!;
}
const natural = (img: Locator) => img.evaluate((i: HTMLImageElement) => [i.naturalWidth, i.naturalHeight]);

test('a replaced image shows after its card is selected again: a conditional request with its ETag, the new picture swapped in, and no request on a timer', async ({ page }) => {
  put(s.project, 'swap/pic.png', pngOf(800, 400, () => [52, 113, 208]));
  const asked = imageRequests(page);
  const [n] = await open(page, [{ kind: 'question', title: 'Which colour?', body: '![Swatch](swap/pic.png)' }]);
  const pic = (await imageOf(page, n!)).locator('img');
  expect(await natural(pic)).toEqual([800, 400]);
  const etag = await firstVersion(asked, '/swap/pic.png');
  const title = card(page, n!).locator('.vb-node-title');
  // Selected: the page asks with the version it shows, and it is still that one (304).
  await title.click();
  await expect(card(page, n!)).toHaveAttribute('data-selected', '');
  await expect.poll(() => asked.filter((r) => r.method === 'HEAD' && r.ifNoneMatch === etag && r.status === 304).length).toBe(1);
  // The agent overwrites it; selected again, the page asks again and swaps the new picture in.
  put(s.project, 'swap/pic.png', pngOf(400, 400, () => [212, 19, 138]));
  await page.keyboard.press('Escape');
  await expect(card(page, n!)).not.toHaveAttribute('data-selected', '');
  await title.click();
  await expect.poll(() => natural(pic)).toEqual([400, 400]);
  expect(asked.filter((r) => r.method === 'HEAD' && r.ifNoneMatch === etag).map((r) => r.status)).toEqual([304, 200]);
  await expect(pic).not.toHaveAttribute('src', new RegExp(etag.replace(/"/g, '').replace(/-/g, '\\-')));
  await expect.poll(async () => { const b = await boxOf(pic); return Math.abs(b.h - b.w); }).toBeLessThan(1);
  // Nothing asks again by itself.
  const count = asked.length;
  await page.waitForTimeout(2500);
  expect(asked.length).toBe(count);
});

test('opening an image asks for a newer version too, and the open view and the card both show it', async ({ page }) => {
  put(s.project, 'swap/open.png', WIDE);
  const asked = imageRequests(page);
  const [n] = await open(page, [{ kind: 'finding', title: 'The chart', body: '![Chart](swap/open.png)' }]);
  const chart = await imageOf(page, n!);
  const etag = await firstVersion(asked, '/swap/open.png');
  put(s.project, 'swap/open.png', TALL);
  await chart.click();
  await expect(view(page)).toBeVisible();
  await expect.poll(() => natural(zoomed(page))).toEqual([600, 1200]);
  expect(asked.some((r) => r.method === 'HEAD' && r.ifNoneMatch === etag && r.status === 200)).toBe(true);
  near((await zoomedBox(page)).h, 700);
  expect(await natural(chart.locator('img'))).toEqual([600, 1200]);
});

/** The far end of the open image's running motion (the keyframe that is not `none`), its length and easing. */
async function motion(page: Page): Promise<{ duration: number; easing: string; far: string; from: 'card' | 'view' }> {
  const run = await page.waitForFunction(() => {
    const a = document.getAnimations().find((x) => ((x.effect as KeyframeEffect).target as Element | null)?.matches('.vb-iv-img'));
    if (!a) return null;
    const e = a.effect as KeyframeEffect;
    const [first, last] = [e.getKeyframes()[0]!.transform as string, e.getKeyframes().at(-1)!.transform as string];
    return { duration: Number(e.getTiming().duration), easing: e.getTiming().easing!, far: last === 'none' ? first : last, from: last === 'none' ? 'card' : 'view' };
  }, undefined, { polling: 5 });
  return run.jsonValue() as Promise<{ duration: number; easing: string; far: string; from: 'card' | 'view' }>;
}

/** Whether `far` draws the zoomed box over `card` (the transform's origin is the box's top left). */
async function drawsOver(page: Page, far: string, card: { x: number; y: number; w: number; h: number }): Promise<void> {
  const to = await zoomed(page).evaluate((e: HTMLElement) => ({ x: parseFloat(e.style.left), y: parseFloat(e.style.top), w: parseFloat(e.style.width), h: parseFloat(e.style.height) }));
  const m = /^translate\((-?[\d.]+)px, (-?[\d.]+)px\) scale\(([\d.]+), ([\d.]+)\)$/.exec(far);
  expect(m, far).not.toBeNull();
  const [tx, ty, sx, sy] = m!.slice(1).map(Number) as [number, number, number, number];
  near(to.x + tx, card.x);
  near(to.y + ty, card.y);
  near(to.w * sx, card.w);
  near(to.h * sy, card.h);
}

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the view grows from the card\'s image box and shrinks back to it, for about 220 ms, eased by the board\'s easing', async ({ page }) => {
    const [n] = await open(page, [FLOW]);
    const flow = await imageOf(page, n!);
    const from = await boxOf(flow.locator('img'));
    await flow.click();
    const opening = await motion(page);
    expect(opening.from).toBe('card');
    expect(Math.abs(opening.duration - 216)).toBeLessThan(1); // 60% of --vb-motion (360ms): about 220 ms
    expect(opening.easing).toBe('cubic-bezier(0.2, 0.8, 0.2, 1)');
    await drawsOver(page, opening.far, from);
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
    await page.keyboard.press('Escape');
    const closing = await motion(page);
    expect(closing.from).toBe('view');
    await drawsOver(page, closing.far, from);
    await expect(view(page)).toBeHidden();
    await expect(flow).toBeFocused();
  });
});

test('reduced motion: the view appears and goes without motion', async ({ page }) => {
  // The suite's own setting (playwright.config.ts): --vb-motion is 0ms, so nothing is animated at all.
  const [n] = await open(page, [FLOW]);
  const flow = await imageOf(page, n!);
  await page.evaluate(() => {
    const animate = Element.prototype.animate;
    const w = window as unknown as { animated: number };
    w.animated = 0;
    Element.prototype.animate = function (this: Element, ...args: Parameters<Element['animate']>) { w.animated += 1; return animate.apply(this, args); };
  });
  await flow.click();
  await zoomedBox(page);
  await page.keyboard.press('Escape');
  await expect(view(page)).toBeHidden();
  await expect(flow).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as { animated: number }).animated)).toBe(0);
});

for (const theme of THEMES) {
  test(`the open view passes axe and matches its screenshot (${theme})`, async ({ page }) => {
    await setTheme(page, theme);
    const [n] = await open(page, [FLOW]);
    await (await imageOf(page, n!)).click();
    await zoomedBox(page);
    await expectNoAxeViolations(page);
    // Behind the backdrop, the toolbar's version (and what sits after it) depends on the boards drawn before.
    await page.locator('#version, #containers, #counts').evaluateAll((els) => { for (const e of els) (e as HTMLElement).style.visibility = 'hidden'; });
    await expect(page).toHaveScreenshot(`zoomed-${theme}.png`);
  });
}
