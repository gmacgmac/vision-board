// The panel route, `GET /app-panels/<id>` (app-cards BE_02; D-047 rulings 4, 9, 13): an app's panel
// comes with its own CSP, exactly ruling 4's, widened only by the manifest's `csp` domains; the
// `sandbox` directive keeps the panel on an opaque origin even when opened on its own; a missing or
// invalid app, an id trick, or the `appCards` flag off answers 404. The board page's own CSP lets
// it frame its own server only (`frame-src 'self'`).
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { addApp, raw } from './app-support.ts';
import { PANEL_CSP, panelCsp } from '../server/apps.ts';

const EXACT = "sandbox allow-scripts; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
  "img-src data:; font-src data:; connect-src 'none'; frame-ancestors 'self'; base-uri 'none'; form-action 'none'";

let h: Harness;
let off: Harness;
before(async () => {
  [h, off] = await Promise.all([startBoard(), startBoard({ flags: { appCards: false } })]);
  for (const id of ['good', 'panel-only', 'invalid-manifest']) addApp(h.project, id);
  addApp(off.project, 'good');
});
after(() => Promise.all([h.close(), off.close()]));

test('the panel CSP is exactly ruling 4\'s', () => {
  assert.equal(PANEL_CSP, EXACT);
  assert.equal(panelCsp(undefined), EXACT);
  assert.equal(panelCsp({}), EXACT);
});

test('a panel comes as HTML with its own CSP, no cookie, never cached', async () => {
  const r = await raw(h.base, '/app-panels/good');
  assert.equal(r.status, 200);
  assert.match(r.body, /A test panel/);
  assert.equal(r.headers['content-type'], 'text/html; charset=utf-8');
  assert.equal(r.headers['content-security-policy'], EXACT);
  assert.match(String(r.headers['content-security-policy']), /^sandbox allow-scripts;/);
  assert.equal(r.headers['x-content-type-options'], 'nosniff');
  assert.equal(r.headers['cache-control'], 'no-store');
  assert.equal(r.headers['set-cookie'], undefined, 'the panel never gets the person cookie');
});

test('the manifest\'s domains widen connect-src, img-src, font-src and style-src, and nothing else', async () => {
  const csp = String((await raw(h.base, '/app-panels/panel-only')).headers['content-security-policy']);
  const directive = (name: string) => csp.split('; ').find((d) => d.startsWith(`${name} `));
  assert.equal(directive('connect-src'), 'connect-src https://api.example.com');
  assert.equal(directive('img-src'), 'img-src data: https://cdn.example.com https://fonts.example.org:8443');
  assert.equal(directive('font-src'), 'font-src data: https://cdn.example.com https://fonts.example.org:8443');
  assert.equal(directive('style-src'), "style-src 'unsafe-inline' https://cdn.example.com https://fonts.example.org:8443");
  assert.equal(directive('script-src'), "script-src 'unsafe-inline'", 'no domain can add a script');
  assert.equal(directive('default-src'), "default-src 'none'");
  assert.equal(directive('sandbox'), 'sandbox allow-scripts');
  assert.doesNotMatch(csp, /evil|\*/, 'no undeclared domain, no wildcard');
});

test('404 for a missing or invalid app, an id trick, and with app cards off; the route\'s 404 carries the panel\'s own policy, so a card\'s frame shows it (finding 1)', async () => {
  // The route's own paths: no panel, and ruling 4's policy with no manifest's domains, so the frame
  // that asked loads the refusal (frame-ancestors 'self') instead of a blank the page's policy would make.
  for (const p of ['/app-panels/nope', '/app-panels/invalid-manifest', '/app-panels/Good', '/app-panels/..%2fgood',
    '/app-panels/%2e%2e%2fledger.jsonl', '/app-panels/good%2f..', '/app-panels/']) {
    const r = await raw(h.base, p);
    assert.equal(r.status, 404, p);
    assert.doesNotMatch(r.body, /A test panel/, `${p}: no panel`);
    assert.equal(r.headers['content-security-policy'], EXACT, p);
  }
  // Not the route's paths: the page's 404, with the page's policy.
  for (const p of ['/app-panels/good/', '/app-panels/good/panel.html']) {
    const r = await raw(h.base, p);
    assert.equal(r.status, 404, p);
    assert.doesNotMatch(String(r.headers['content-security-policy']), /sandbox/, `${p}: no panel`);
  }
  const flagged = await raw(off.base, '/app-panels/good');
  assert.equal(flagged.status, 404);
  assert.match(flagged.body, /App cards are off/);
  assert.equal(flagged.headers['content-security-policy'], EXACT);
});

test('with app cards off, call_app_tool answers not-found', async () => {
  const p = await off.fails('call_app_tool', { app: 'good', body: { tool: 'add', arguments: { a: 1, b: 1 } } }, 404, 'not-found');
  assert.match(p.detail, /App cards are off/);
});

test('the board page may frame its own server only', async () => {
  const page = await raw(h.base, '/');
  const csp = String(page.headers['content-security-policy']);
  assert.ok(csp.split('; ').includes("frame-src 'self'"), csp);
  assert.ok(csp.split('; ').includes("frame-ancestors 'none'"), 'and nothing frames the board');
});
