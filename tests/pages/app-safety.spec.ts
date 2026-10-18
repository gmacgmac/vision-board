// The panel's isolation in a real browser (app-cards FE_02, D-047 rulings 4 and 5; PLAN.md § Goal
// state 4a, 4b and 4j), from inside a test-only panel (apps/board/tests/fixtures/apps/probe/: it
// does the handshake and nothing else) in an app card on the board:
// (a) the panel's origin is opaque: it can't read the board's cookie, storage or page, and can't
//     call /api;
// (b) its fetch to a domain the manifest did not declare is blocked by the panel's CSP (the
//     violation event; no network needed), while a declared one gets past the policy;
// (j) a message to the board from any window but the card's own frame (a second frame the test
//     adds, the board's own window) is ignored, while the card's frame is heard.
import type { Frame, Page } from '@playwright/test';
import type { AppServer } from './app-server.ts';
import { startAppServer } from './app-server.ts';
import { expect, test } from './helpers.ts';

let s: AppServer;
let board = '';
let n = 0;

test.beforeAll(async () => {
  s = await startAppServer({ fixtures: ['probe'] });
  const drawn = await s.draw([{ kind: 'app', title: 'Probe', app: { id: 'probe' } }]);
  [board, n] = [drawn.board, drawn.n[0]!];
  await s.act(board, { action: 'app-allow', app: 'probe', hash: (await s.apps()).get('probe')!.hash });
});
test.afterAll(async () => { await s.close(); });

/** The board with the probe's card, and the probe's panel once it is ready. */
async function openProbe(page: Page): Promise<Frame> {
  await page.goto(`${s.base}/#${board}`);
  const frame = page.locator(`vb-node[data-id="${n}"] vb-app-frame`);
  await expect(frame).toHaveAttribute('data-state', 'ready');
  const panel = (await (await frame.locator('iframe').elementHandle())!.contentFrame())!;
  await expect(panel.locator('#say')).toHaveText('Probe panel, ready.');
  return panel;
}

/** The panel's own CSP refuses these on purpose; every other problem still fails the test. */
const REFUSED = [
  /^console error: Connecting to '[^']+' violates the following Content Security Policy directive: "connect-src https:\/\/declared\.example\.com"\. The action has been blocked\.$/,
  /^console error: Fetch API cannot load \S+\. Refused to connect because it violates the document's Content Security Policy\.$/,
  /^request failed: GET https:\/\/declared\.example\.com\/x \(net::ERR_NAME_NOT_RESOLVED\)$/, /^console error: Failed to load resource: net::ERR_NAME_NOT_RESOLVED$/,
];

test.describe('the panel is isolated', () => {
  test.use({ expected: { problems: REFUSED } });

  test('4a: the panel cannot read the board\'s cookie, storage or page, nor call /api', async ({ page }) => {
    const panel = await openProbe(page);
    const seen = await panel.evaluate(async (api) => {
      const tryIt = async (f: () => unknown) => { try { return { ok: await f() }; } catch (e) { return { threw: (e as Error).name }; } };
      return {
        origin: self.origin,
        cookie: await tryIt(() => document.cookie),
        storage: await tryIt(() => localStorage.length),
        page: await tryIt(() => parent.document.title),
        api: await tryIt(async () => (await fetch('/api/boards')).status),
        apiByUrl: await tryIt(async () => (await fetch(api)).status),
      };
    }, `${s.base}/api/boards`);
    expect(seen.origin).toBe('null');
    // Chromium refuses the cookie outright in a sandbox without allow-same-origin; empty would do too.
    expect(seen.cookie.threw ?? (seen.cookie.ok === '' ? 'empty' : seen.cookie.ok)).toMatch(/^(SecurityError|empty)$/);
    expect(seen.storage).toEqual({ threw: 'SecurityError' });
    expect(seen.page).toEqual({ threw: 'SecurityError' });
    expect(seen.api).toEqual({ threw: 'TypeError' });
    expect(seen.apiByUrl).toEqual({ threw: 'TypeError' });
  });

  test('4b: a fetch to a domain the manifest did not declare is blocked by the panel\'s CSP; a declared one is not', async ({ page }) => {
    const panel = await openProbe(page);
    const violations = (url: string) => panel.evaluate(async (u) => {
      const seen: string[] = [];
      const on = (e: SecurityPolicyViolationEvent) => seen.push(`${e.effectiveDirective} ${e.blockedURI}`);
      addEventListener('securitypolicyviolation', on);
      const failed = await fetch(u).then(() => false, () => true);
      await new Promise((r) => setTimeout(r, 100));
      removeEventListener('securitypolicyviolation', on);
      return { failed, seen };
    }, url);
    expect(await violations('https://undeclared.example.com/x')).toEqual({ failed: true, seen: ['connect-src https://undeclared.example.com/x'] });
    // Declared in app.json: past the policy (the request then fails only because the test browser
    // resolves no outside name).
    expect(await violations('https://declared.example.com/x')).toEqual({ failed: true, seen: [] });
  });
});

/** A `tools/call` as a panel sends it, from `from` (a window's script), and what came back to it. */
const callFrom = (from: Frame | Page, id: string) => from.evaluate(async (callId) => {
  const back: unknown[] = [];
  // Answers only: the board's own window also hears the request it posts to itself.
  const on = (e: MessageEvent) => { const d = e.data as Record<string, unknown> | null; if (d?.id === callId && ('result' in d || 'error' in d)) back.push(d); };
  addEventListener('message', on);
  const target = window.parent === window ? window : window.parent;
  target.postMessage({ jsonrpc: '2.0', id: callId, method: 'tools/call', params: { name: 'echo', arguments: { text: callId } } }, '*');
  await new Promise((r) => setTimeout(r, 600));
  removeEventListener('message', on);
  return back;
}, id);

test('4j: a message to the board from any window but the card\'s own frame is ignored', async ({ page }) => {
  const panel = await openProbe(page);
  const calls: string[] = [];
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().endsWith('/api/apps/probe/calls')) calls.push(r.postData() ?? ''); });
  // The card's own frame is heard: its call reaches the board's server and is answered.
  expect(await callFrom(panel, 'own')).toEqual([{ jsonrpc: '2.0', id: 'own', result: {
    content: [{ type: 'text', text: '{"text":"own"}' }], structuredContent: { text: 'own' }, isError: false } }]);
  expect(calls).toHaveLength(1);
  // A second frame on the board, showing the same panel: the board ignores it, and answers nothing.
  await page.evaluate((src) => {
    const f = document.createElement('iframe');
    f.setAttribute('sandbox', 'allow-scripts');
    f.title = 'Another window';
    f.id = 'intruder';
    f.src = src;
    document.body.append(f);
  }, '/app-panels/probe');
  const intruder = page.frameLocator('#intruder');
  await expect(intruder.locator('#say')).toHaveText('Probe panel, waiting for the board.');
  const other = (await (await page.locator('#intruder').elementHandle())!.contentFrame())!;
  expect(await callFrom(other, 'other')).toEqual([]);
  // Its Esc doesn't move the person's focus either.
  await page.locator('#stage').focus();
  await other.evaluate(() => parent.postMessage({ jsonrpc: '2.0', method: 'ui/notifications/escape' }, '*'));
  await expect(page.locator('#stage')).toBeFocused();
  // Nor does the board's own window posting to itself.
  expect(await callFrom(page, 'self')).toEqual([]);
  // Its handshake stays unanswered: it still waits.
  await expect(intruder.locator('#say')).toHaveText('Probe panel, waiting for the board.');
  expect(calls).toHaveLength(1);
});
