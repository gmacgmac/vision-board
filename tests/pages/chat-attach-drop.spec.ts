// A file dropped anywhere on the board's page (chat-attachments COMPOSE_01 Run 2, point 357, chatAttachments
// flag): the whole open chat panel takes it as the composer does, and everywhere else it does nothing, so the
// browser never opens it in place of the board; text still drags as ever; flag off is today's. Real drags, through
// the browser's own drag handling (CDP `Input.dispatchDragEvent`), so what the browser would do by itself is
// what is tested. The server is chat-server.ts with the agent package's fake `claude`, never the real one.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import type { ChatServer } from './chat-server.ts';
import { startChatServer } from './chat-server.ts';
import { expect, test } from './helpers.ts';
import { card, side, text, toggle } from './chat-page.ts';

test.describe.configure({ mode: 'serial' });

let srv: ChatServer;
let folder = '';
let file = '';

test.beforeAll(async () => {
  srv = await startChatServer();
  await srv.write('scratch', [
    { type: 'board', key: 'board', title: 'Scratch' }, { type: 'region', key: 'ideas', region: { id: 'ideas', title: 'Ideas', mode: 'grid' } },
    card('q1', 'Ship on Friday?'),
  ]);
  folder = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-drop-'));
  file = path.join(folder, 'dropped.txt');
  fs.writeFileSync(file, 'hello');
});
test.afterAll(async () => {
  await srv.close();
  fs.rmSync(folder, { recursive: true, force: true });
});

const composer = (page: Page) => side(page).locator('chat-composer');
const chips = (page: Page) => composer(page).locator('.chat-chip[data-kind="file"]');

async function open(page: Page, flags = '', panel = true) {
  await page.goto(`${srv.base}/?vbwork${flags && `&flags=${flags}`}#scratch`);
  await page.waitForFunction(() => (window as unknown as { __vbWork?: { work: { firstDrawMs: number | null } } }).__vbWork?.work.firstDrawMs != null);
  if (panel && !(await side(page).isVisible())) await toggle(page).click(); // the panel stays open from a visit before
  if (panel) await expect(text(page)).toBeVisible();
}

const middle = async (at: Locator) => {
  const box = (await at.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

/** The browser's drag, as the person's: `data` over the middle of `at`, then, unless `hold`, dropped. */
async function drag(page: Page, at: Locator, data: { files?: string[]; items?: { mimeType: string; data: string }[] }, hold = false) {
  const cdp = await page.context().newCDPSession(page);
  const where = await middle(at);
  const payload = { items: [], dragOperationsMask: 1, ...data };
  for (const type of ['dragEnter', 'dragOver', ...(hold ? [] : ['drop'])]) {
    await cdp.send('Input.dispatchDragEvent', { type: type as 'dragEnter', ...where, data: payload });
  }
}

/** Note, past everything on the page, what became of each drag event. The headless browser does not itself
 *  open a dropped file, so whether the page stopped it is what can fail. */
const watchDrags = (page: Page) => page.evaluate(() => {
  const seen: { type: string; stopped: boolean; effect: string }[] = [];
  (window as unknown as { __drags: typeof seen }).__drags = seen;
  for (const type of ['dragover', 'drop']) {
    window.addEventListener(type, (e) => { seen.push({ type, stopped: e.defaultPrevented, effect: (e as DragEvent).dataTransfer!.dropEffect }); });
  }
});

/** The page is still the board, and it stopped the browser from opening the file: the page said no drop, so none comes. */
async function stillTheBoard(page: Page) {
  await page.waitForTimeout(150);
  expect(page.url()).toMatch(/#scratch$/);
  await expect(page.locator('vb-node').first()).toBeVisible();
  const seen = await page.evaluate(() => (window as unknown as { __drags: { type: string; stopped: boolean }[] }).__drags.splice(0));
  expect(seen.map((e) => e.type)).toContain('dragover');
  expect(seen.filter((e) => !e.stopped)).toEqual([]);
}

test('dropped on the board, the panel closed: nothing happens, and the page stays the board', async ({ page }) => {
  await open(page, '', false);
  await expect(side(page)).toBeHidden();
  await watchDrags(page);
  await drag(page, page.locator('#stage'), { files: [file] });
  await stillTheBoard(page);
  await expect(side(page)).toBeHidden();
});

test('dropped on the toolbar or a card, the panel open: nothing attaches, and the page stays the board', async ({ page }) => {
  await open(page);
  await watchDrags(page);
  for (const at of [page.locator('vb-node').first(), page.locator('#send')]) {
    await drag(page, at, { files: [file] });
    await stillTheBoard(page);
  }
  await expect(chips(page)).toHaveCount(0);
});

test('dropped on an app\'s frame: the page stays the board', async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const frame = document.createElement('iframe');
    frame.id = 'a-frame';
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.srcdoc = '<p>A panel</p>';
    frame.style.cssText = 'position:fixed;left:40px;top:120px;width:200px;height:120px;z-index:5';
    document.body.append(frame);
  });
  await watchDrags(page);
  await drag(page, page.locator('vb-node').first(), { files: [file] }, true); // onto the page, then on over the frame
  await drag(page, page.locator('#a-frame'), { files: [file] });
  await stillTheBoard(page);
  await expect(chips(page)).toHaveCount(0);
});

test('the whole open panel takes a file: the same drop target on the composer, from the feed and the header too', async ({ page }) => {
  await open(page);
  await watchDrags(page);
  await drag(page, side(page).locator('chat-feed'), { files: [file] }, true);
  await expect(composer(page)).toHaveAttribute('data-drop');
  await expect(composer(page).locator('.chat-cmp-drop')).toBeVisible();
  // On over the board: the target goes, and comes back on the way in; leaving the window or Esc is a leave with nowhere to go to.
  await drag(page, page.locator('vb-node').first(), { files: [file] }, true);
  await expect(composer(page)).not.toHaveAttribute('data-drop');
  await drag(page, side(page).locator('chat-header'), { files: [file] }, true);
  await expect(composer(page)).toHaveAttribute('data-drop');
  await side(page).locator('chat-header').dispatchEvent('dragleave', { relatedTarget: null });
  await expect(composer(page)).not.toHaveAttribute('data-drop');
  await drag(page, side(page).locator('chat-feed'), { files: [file] });
  await expect(composer(page)).not.toHaveAttribute('data-drop');
  await expect(chips(page)).toHaveCount(1);
  await expect(chips(page)).toHaveAttribute('data-state', 'ready');
  await drag(page, side(page).locator('chat-header'), { files: [file] });
  await expect(chips(page)).toHaveCount(2);
  await drag(page, text(page), { files: [file] });
  await expect(chips(page)).toHaveCount(3);
  await expect(text(page)).toHaveValue('');
  await stillTheBoard(page);
  await watchDrags(page);
  await drag(page, page.locator('vb-node').first(), { files: [file] });
  await expect(chips(page)).toHaveCount(3);
});

test('shut, the panel takes nothing and the page stays the board', async ({ page }) => {
  await open(page);
  await composer(page).evaluate((el) => { (el as HTMLElement & { show(v: unknown): void }).show({ send: false, shut: 'A past version is showing.', hint: '', placeholder: 'x', files: { attach: 'Attach files', tip: 't', drop: 'd', uploading: 'u', ready: 'r', waits: 'w', remove: String, removed: String, said: String } }); });
  await watchDrags(page);
  await drag(page, side(page).locator('chat-feed'), { files: [file] });
  await stillTheBoard(page);
  await expect(chips(page)).toHaveCount(0);
  await expect(composer(page)).not.toHaveAttribute('data-drop');
});

test('text drags as ever: into the words, and nothing stops it on the board', async ({ page }) => {
  await open(page);
  await drag(page, text(page), { items: [{ mimeType: 'text/plain', data: 'dragged words' }] });
  await expect(text(page)).toHaveValue('dragged words');
  await expect(chips(page)).toHaveCount(0);
  await expect(composer(page)).not.toHaveAttribute('data-drop');
  const stopped = await page.locator('#stage').evaluate((el) => {
    const data = new DataTransfer();
    data.setData('text/plain', 'words');
    const e = new DragEvent('dragover', { dataTransfer: data, bubbles: true, cancelable: true });
    el.dispatchEvent(e);
    return e.defaultPrevented;
  });
  expect(stopped).toBe(false);
});

test('flag off: a dragged file is left to the browser, on the board and on the panel, as today', async ({ page }) => {
  await open(page, '-chatAttachments');
  for (const at of [page.locator('#stage'), side(page).locator('chat-feed'), composer(page)]) {
    const stopped = await at.evaluate((el) => {
      const data = new DataTransfer();
      data.items.add(new File(['x'], 'off.txt', { type: 'text/plain' }));
      const e = new DragEvent('dragover', { dataTransfer: data, bubbles: true, cancelable: true });
      el.dispatchEvent(e);
      return e.defaultPrevented;
    });
    expect(stopped).toBe(false);
  }
  await expect(composer(page)).not.toHaveAttribute('data-drop');
});
