// Focus given back (FIX_03 ruling 1, points 338 and 442): when Esc or a click closes something, focus returns to what
// opened it with no ring unless the person was moving by Tab (`#ui` `returnFocus`). Each place it showed: the notes
// mark after the conversation box, the disc after its picker, the badge after the history box, the card after the
// right-click list, a container's cog after its menu, and the image after the image viewer. With Tab, the ring shows.
// The app window's stage: app-window.spec.ts.
import type { Locator, Page } from '@playwright/test';
import { pngOf, put } from '#board/testing';
import { expect, test } from './helpers.ts';
import { card, open, tabTo, write } from './agent-board.ts';
import { drawEdges, mark } from './edge-board.ts';
import { frame } from './board-page.ts';
import type { AppServer } from './app-server.ts';
import { startAppServer } from './app-server.ts';

const FLAGS = '?vbwork';
/** The ring on what has focus: its outline style ('none' when there is none), from what draws it (`at`, else itself). */
const ring = (page: Page, at?: string) => page.evaluate((sel) => {
  const el = document.activeElement!;
  return getComputedStyle(sel ? el.querySelector(sel)! : el).outlineStyle;
}, at);
const focused = (l: Locator) => expect(l).toBeFocused();

test('the notes mark after the conversation box: a click then Esc, or the box\'s ×, no ring; Tab, Enter, Esc, a ring', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const notes = mark(page, d.n[0]!, 'notes');
  const box = page.locator('vb-note-bubble[data-mode="conversation"]');
  await notes.click();
  await expect(box).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(box).toBeHidden();
  await focused(notes);
  expect(await ring(page)).toBe('none');
  await page.keyboard.press('z'); // a key that moves no focus lights nothing either
  expect(await ring(page)).toBe('none');
  await notes.click();
  await box.locator('.vb-node-box-x').click();
  await focused(notes);
  expect(await ring(page)).toBe('none');
  await card(page, d.n[0]!).focus();
  await tabTo(page, notes);
  await page.keyboard.press('Enter');
  await expect(box).toBeVisible();
  await page.keyboard.press('Escape');
  await focused(notes);
  expect(await ring(page)).not.toBe('none');
});

test('the disc after its picker, the card after the right-click list: no ring after a click; a ring after Tab', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  const disc = mark(page, d.n[0]!, 'answer');
  const picker = page.locator('.vb-mark-menu');
  await disc.click();
  await expect(picker).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(picker).toHaveCount(0);
  await focused(disc);
  expect(await ring(page)).toBe('none');
  const c = card(page, d.n[1]!);
  await c.locator('.vb-node-title').click({ button: 'right' });
  await expect(picker).toBeVisible();
  await page.keyboard.press('Escape');
  await focused(c);
  expect(await ring(page)).toBe('none');
  await card(page, d.n[0]!).focus();
  await tabTo(page, disc);
  await page.keyboard.press('Enter');
  await expect(picker).toBeVisible();
  await page.keyboard.press('Escape');
  await focused(disc);
  expect(await ring(page)).not.toBe('none');
});

test('the badge after the history box, a container\'s cog after its menu: no ring after a click', async ({ page, request }) => {
  const d = await drawEdges(request);
  await open(page, d, FLAGS);
  await write(request, d, [{ type: 'node', n: d.n[1]!, node: { region: 'p', kind: 'finding', title: 'Rain fade on the link, twice' } }]);
  const badge = mark(page, d.n[1]!, 'badge');
  await expect(badge).toBeVisible();
  const history = card(page, d.n[1]!).locator('.vb-card-pop.vb-node-box[data-pop="history"]');
  await badge.click();
  await expect(history).toHaveAttribute('data-open', '');
  await page.keyboard.press('Escape');
  await expect(history).not.toHaveAttribute('data-open', '');
  await focused(badge);
  expect(await ring(page)).toBe('none');
  const cog = frame(page, 'p').locator('button.vb-cog');
  await cog.click();
  await expect(cog).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(cog).toHaveAttribute('aria-expanded', 'false');
  await focused(cog);
  expect(await ring(page)).toBe('none');
});

test.describe('the image viewer', () => {
  let s: AppServer;
  test.beforeAll(async () => {
    s = await startAppServer();
    put(s.project, 'diagrams/flow.png', pngOf(800, 400, (x, y) => [40 + Math.round(x / 5), 110, 200 - Math.round(y / 3)]));
  });
  test.afterAll(async () => { await s.close(); });

  test('the image after the viewer: a click then Esc, or the ×, no ring; Tab, Enter, Esc, a ring', async ({ page }) => {
    const { board, n } = await s.draw([{ kind: 'question', title: 'Is this the flow?', body: '![Flow](diagrams/flow.png)' }]);
    await page.goto(`${s.base}/#${board}`);
    const img = card(page, n[0]!).locator('.vb-img');
    await expect.poll(() => img.locator('img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth)).toBeGreaterThan(0);
    const view = page.locator('vb-image-view dialog');
    await img.click();
    await expect(view).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(view).toBeHidden();
    await focused(img);
    expect(await ring(page, '.vb-md-img')).toBe('none');
    await img.click();
    await page.locator('vb-image-view .vb-iv-x').click();
    await expect(view).toBeHidden();
    await focused(img);
    expect(await ring(page, '.vb-md-img')).toBe('none');
    await card(page, n[0]!).focus();
    await tabTo(page, img);
    await page.keyboard.press('Enter');
    await expect(view).toBeVisible();
    await page.keyboard.press('Escape');
    await focused(img);
    expect(await ring(page, '.vb-md-img')).not.toBe('none');
  });
});
