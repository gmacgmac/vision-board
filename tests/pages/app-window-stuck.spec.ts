// A panel stuck in a loop (FE_08 step 5; apps.md § A stuck panel): with sandboxed frames in a process of their own, as a
// browser with site isolation runs them (desktop Chromium does by default; Playwright's Chromium only with
// --site-per-process, used here), a panel spinning forever leaves the board's own controls working: its window's drawer
// opens and the board zooms. The frame is still `sandbox="allow-scripts"` with an opaque origin. Where frames share the
// page's thread (WebKit: Safari, a Tauri window on macOS; Chromium without site isolation) the loop freezes the whole
// page, board included, and nothing in the page can stop it: what is seen there is in apps.md.
import fs from 'node:fs';
import path from 'node:path';
import type { AppServer } from './app-server.ts';
import { startAppServer } from './app-server.ts';
import { bid, expect, test } from './helpers.ts';

// Local servers only, as every spec (playwright.config.ts), and site isolation. No trace: its snapshots read every frame,
// and would wait on the stuck one forever.
test.use({ launchOptions: { args: ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1', '--site-per-process'] }, trace: 'off' });

let s: AppServer;
let board = '';

test.beforeAll(async () => {
  s = await startAppServer();
  const dir = s.dir('spin');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify({ id: 'spin', title: 'Spin', version: '0.1.0', size: { w: 300, h: 200 } }));
  // Says it is ready, then never gives its thread back.
  fs.writeFileSync(path.join(dir, 'panel.html'), '<!doctype html><title>Spin</title><p>Spinning</p><script>'
    + 'parent.postMessage({ jsonrpc: "2.0", method: "ui/notifications/initialized" }, "*");'
    + 'setTimeout(() => { for (;;) {} }, 300);</script>');
  ({ board } = await s.draw([{ kind: 'app', title: 'Spin', app: { id: 'spin', w: 300, h: 200 } }, { kind: 'topic', title: 'Next door' }]));
});
test.afterAll(async () => { await s.close(); });

test('a panel in a tight loop leaves the board\'s own controls working', async ({ page }) => {
  await page.goto(`${s.base}/?flags=nodeEdges,appWindow,appStage#${board}`);
  const win = page.locator('vb-node[data-window]');
  await expect(win.locator('vb-app-frame iframe')).toHaveCount(1);
  await page.waitForTimeout(800); // the loop has started
  const t0 = Date.now();
  await win.locator('[data-drawer]').click({ timeout: 3000 });
  await expect(win).toHaveAttribute('data-drawer-open', '', { timeout: 3000 });
  const zoom = page.locator(bid('stage'));
  const before = await zoom.evaluate((el) => getComputedStyle(el.querySelector('.vb-world')!).transform);
  await page.getByRole('button', { name: 'Zoom in', exact: true }).first().click({ timeout: 3000 });
  await expect.poll(() => zoom.evaluate((el) => getComputedStyle(el.querySelector('.vb-world')!).transform), { timeout: 3000 }).not.toBe(before);
  expect(Date.now() - t0).toBeLessThan(5000);
});
