// The image route and svg (D-064, host-fixes-and-svg SVG_01; docs/specification/images.md): with the
// svgImages flag on, an svg that opens as one and says its size is served as `image/svg+xml` with its
// own policy (`SVG_CSP`: no script, nothing loads, sandboxed), on a 304 too, so its address opened on
// its own runs nothing on the board's origin; HTML named .svg, an svg with no size or with entities,
// and one over its own cap are refused in IMAGE_WORDS' words. With the flag off it is refused as before.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import type { FlagOverrides } from '#format';
import { IMAGE_LIMITS, IMAGE_ROUTE, IMAGE_WORDS, imageNotReal } from '#format';
import { makeTempDir } from '#format/testing';
import { SVG_CSP, serveImage } from '../server/images.ts';
import { ProblemError, serverError } from '../server/problem.ts';
import { sendProblem } from '../server/respond.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Got } from './images-support.ts';
import { IMAGES, SVG, get, imagesDir, problemOf, put } from './images-support.ts';

const W = IMAGE_WORDS;
const url = (rel: string) => `${IMAGE_ROUTE}${rel}`;
const NS = 'xmlns="http://www.w3.org/2000/svg"';
/** An animated picture, as an agent would write one. */
const SPIN = `<svg ${NS} viewBox="0 0 40 40"><style>@media (prefers-reduced-motion: no-preference){rect{animation:s 2s linear 2}}@keyframes s{to{transform:rotate(90deg)}}</style><rect width="20" height="20"/></svg>`;
/** The board's own policy (app.ts `SECURITY_HEADERS`), which an svg's replaces. */
const BOARD_CSP = /^default-src 'self'/;

let h: Harness;
before(async () => { h = await startBoard(); });
after(() => h.close());

function assertRefused(got: Got, status: number, code: string, detail: string): void {
  assert.equal(got.status, status, got.body.toString('utf8').slice(0, 200));
  assert.match(String(got.headers['content-type']), /^application\/problem\+json/);
  assert.deepEqual(problemOf(got), { code, detail });
  assert.match(String(got.headers['content-security-policy']), BOARD_CSP, 'a refusal is no picture: the board\'s own policy');
}

test('an svg is served as image/svg+xml, whole, with its own policy in place of the board\'s, and the usual no-sniff, no-cache and ETag', async () => {
  for (const [rel, body] of [['logo.svg', SVG], ['d/spin.SVG', Buffer.from(SPIN)]] as const) {
    put(h.project, rel, body);
    for (const method of ['GET', 'HEAD']) {
      const got = await get(h.base, url(rel), { method });
      assert.equal(got.status, 200, `${method} ${rel}`);
      assert.equal(got.headers['content-type'], IMAGE_LIMITS.types.svg.contentType);
      assert.equal(got.headers['content-length'], String(body.length));
      assert.deepEqual(got.body, method === 'GET' ? body : Buffer.alloc(0));
      assert.equal(got.headers['content-security-policy'], SVG_CSP);
      assert.equal(got.headers['x-content-type-options'], 'nosniff');
      assert.equal(got.headers['cache-control'], 'no-cache');
      assert.match(String(got.headers.etag), /^"[0-9a-f]+-[0-9a-f]+"$/);
    }
  }
});

test('SVG_CSP allows no script and loads nothing, sandboxes the document, and keeps every rule of the board\'s policy', () => {
  const d = new Map(SVG_CSP.split(';').map((p) => p.trim().split(/\s+/)).map(([k, ...v]): [string, string[]] => [k!, v]));
  assert.deepEqual(d.get('default-src'), ["'none'"], 'scripts, connections, frames and objects fall back to none');
  assert.equal(d.has('script-src'), false);
  assert.deepEqual(d.get('sandbox'), [], 'sandbox with no allowances: an opaque origin, no script, no forms, no popups');
  assert.deepEqual(d.get('style-src'), ["'unsafe-inline'"], 'its own inline styles, nothing fetched');
  assert.deepEqual(d.get('img-src'), ['data:']);
  assert.deepEqual(d.get('font-src'), ['data:']);
  assert.deepEqual(d.get('frame-ancestors'), ["'none'"], 'as the board\'s');
  assert.deepEqual(d.get('base-uri'), ["'none'"], 'as the board\'s');
});

test('a matching If-None-Match gets 304 with the svg\'s own policy, so a cached copy never takes the board\'s', async () => {
  put(h.project, 'tag.svg', SVG);
  const { etag } = (await get(h.base, url('tag.svg'))).headers as { etag: string };
  for (const method of ['GET', 'HEAD']) {
    const got = await get(h.base, url('tag.svg'), { method, headers: { 'If-None-Match': etag } });
    assert.equal(got.status, 304, method);
    assert.equal(got.body.length, 0);
    assert.equal(got.headers.etag, etag);
    assert.equal(got.headers['content-security-policy'], SVG_CSP);
  }
  put(h.project, 'tag.png', IMAGES.png);
  const png = await get(h.base, url('tag.png'));
  assert.match(String(png.headers['content-security-policy']), BOARD_CSP, 'the other types keep the board\'s policy');
});

test('HTML named .svg, an empty file, an svg with no size, one declaring entities and one under another namespace are refused (415)', async () => {
  const cases: [string, string, string][] = [
    ['page.svg', '<!doctype html><html><script>alert(1)</script></html>', imageNotReal('svg')],
    ['empty.svg', '', imageNotReal('svg')],
    ['plain.svg', '<svg viewBox="0 0 1 1"></svg>', imageNotReal('svg')],
    ['nosize.svg', `<svg ${NS}><rect width="9" height="9"/></svg>`, W.svgSize],
    ['bomb.svg', `<!DOCTYPE svg [<!ENTITY a "aaaa"><!ENTITY b "&a;&a;&a;">]><svg ${NS} viewBox="0 0 1 1">&b;</svg>`, W.svgEntity],
  ];
  for (const [rel, body, why] of cases) {
    put(h.project, rel, body);
    assertRefused(await get(h.base, url(rel)), 415, 'unsupported-media-type', why);
    assertRefused(await get(h.base, url(rel), { headers: { 'If-None-Match': '*' } }), 415, 'unsupported-media-type', why);
  }
  put(h.project, 'logo-as.png', SVG);
  assertRefused(await get(h.base, url('logo-as.png')), 415, 'unsupported-media-type', imageNotReal('png'));
});

test('an entity declared after text holding <svg is refused (415), and an ordinary svg after such text is served (VERIFY_01 F1)', async () => {
  const ent = '<!ENTITY a "aaaa"><!ENTITY b "&a;&a;&a;">';
  const hidden: [string, string][] = [
    ['hid-comment.svg', `<!-- <svg --><!DOCTYPE svg [${ent}]><svg ${NS} viewBox="0 0 1 1">&b;</svg>`],
    ['hid-pi.svg', `<?x <svg ?><!DOCTYPE svg [${ent}]><svg ${NS} viewBox="0 0 1 1">&b;</svg>`],
    ['hid-subset.svg', `<!DOCTYPE svg [<!-- <svg -->${ent}]><svg ${NS} viewBox="0 0 1 1">&b;</svg>`],
  ];
  for (const [rel, body] of hidden) {
    put(h.project, rel, body);
    assertRefused(await get(h.base, url(rel)), 415, 'unsupported-media-type', W.svgEntity);
  }
  put(h.project, 'after-text.svg', `<!-- <svg> drawn by hand --><svg ${NS} viewBox="0 0 1 1"><rect width="1" height="1"/></svg>`);
  assert.equal((await get(h.base, url('after-text.svg'))).status, 200);
});

test('an svg over its own cap is refused (413) in its own words, and one at the cap is served', async () => {
  const sized = (rel: string, size: number) => {
    const file = put(h.project, rel, `<svg ${NS} viewBox="0 0 1 1">`);
    fs.truncateSync(file, size); // NUL bytes after the opening: no disk used
  };
  sized('big.svg', IMAGE_LIMITS.svgMaxBytes + 1);
  assertRefused(await get(h.base, url('big.svg')), 413, 'too-large', W.svgTooBig);
  sized('edge.svg', IMAGE_LIMITS.svgMaxBytes);
  const edge = await get(h.base, url('edge.svg'), { method: 'HEAD' });
  assert.equal(edge.status, 200);
  assert.equal(edge.headers['content-length'], String(IMAGE_LIMITS.svgMaxBytes));
});

/** The route alone, as app.ts calls it, under `flags`: the server's own flags. */
async function routeUnder(flags: FlagOverrides): Promise<{ base: string; project: string; close(): Promise<void> }> {
  const project = fs.realpathSync(makeTempDir('vb-svg-flag-'));
  fs.mkdirSync(path.join(project, '.visionboard'), { recursive: true });
  const server = http.createServer((req, res) => {
    try { serveImage(req, res, new URL(req.url!, 'http://x').pathname.slice(IMAGE_ROUTE.length), project, flags); } catch (err) {
      sendProblem(res, err instanceof ProblemError ? err : serverError(err));
    }
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, project, close: async () => { await new Promise((done) => server.close(done)); fs.rmSync(project, { recursive: true, force: true }); } };
}

test('with the svgImages flag off, an svg is refused (415) as before svg, and so is every other type; png and the rest are served', async () => {
  const off = await routeUnder({ svgImages: false });
  try {
    put(off.project, 'logo.svg', SVG);
    put(off.project, 'shot.png', IMAGES.png);
    put(off.project, 'page.html', IMAGES.png);
    const svg = await get(off.base, url('logo.svg'));
    assert.equal(svg.status, 415);
    assert.deepEqual(problemOf(svg), { code: 'unsupported-media-type', detail: W.typeNoSvg });
    assert.equal(W.typeNoSvg, 'only png, jpeg, webp or gif');
    assert.equal(problemOf(await get(off.base, url('page.html'))).detail, W.typeNoSvg);
    assert.deepEqual((await get(off.base, url('shot.png'))).body, IMAGES.png);
  } finally { await off.close(); }
  const on = await routeUnder({});
  try {
    put(on.project, 'logo.svg', SVG);
    assert.equal((await get(on.base, url('logo.svg'))).status, 200, 'on by default');
  } finally { await on.close(); }
});

test('the server passes its own flags to the route: VB_FLAGS=-svgImages refuses an svg', async () => {
  const off = await startBoard({ flags: { svgImages: false } });
  try {
    put(off.project, 'logo.svg', SVG);
    assert.equal(problemOf(await get(off.base, url('logo.svg'))).detail, W.typeNoSvg);
    assert.equal(fs.existsSync(path.join(imagesDir(off.project), 'logo.svg')), true);
  } finally { await off.close(); }
});
