// The image route, `GET /board-images/<path>` (app-cards BE_03; D-048 rulings 19-21, docs/specification/
// images.md): the project's images, and only those, served as what they are (png, jpeg, webp, gif,
// checked by name and by bytes) with an ETag, a 304 for a matching If-None-Match, and the
// headers that stop a browser guessing. Every refusal is a problem; nothing outside
// `.visionboard/images/` is ever read, so each trick below is also tried against valid pictures
// that sit just outside it (the decoys), whose bytes must never come back.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { IMAGE_LIMITS, IMAGE_ROUTE, IMAGE_WORDS, OPERATIONS, imageNotReal } from '../../../packages/format/src/index.ts';
import type { ImageName } from '../../../packages/format/src/index.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Got } from './images-support.ts';
import { IMAGES, SVG, get, imagesDir, problemOf, put } from './images-support.ts';

const W = IMAGE_WORDS;
const DECOY = 'DECOY-OUTSIDE-THE-IMAGES-FOLDER';
const decoy = Buffer.concat([IMAGES.png, Buffer.from(DECOY)]);
const url = (rel: string) => `${IMAGE_ROUTE}${rel}`;

let h: Harness;
let project: string;
before(async () => {
  h = await startBoard();
  project = fs.realpathSync(h.project);
  // Valid pictures just outside the images folder: in the project and in its `.visionboard/`.
  fs.writeFileSync(path.join(project, 'secret.png'), decoy);
  fs.writeFileSync(path.join(project, '.visionboard', 'secret.png'), decoy);
});
after(() => h.close());

/** Ask for `raw`, expect this status and problem code, and that no decoy byte came back. */
async function refused(raw: string, status: number, code: string, detail?: string, opts?: Parameters<typeof get>[2]): Promise<Got> {
  const got = await get(h.base, raw, opts);
  assert.equal(got.status, status, `${raw}: ${got.body.toString('utf8').slice(0, 200)}`);
  assert.ok(!got.body.includes(DECOY), `${raw}: the decoy came back`);
  assert.match(String(got.headers['content-type']), /^application\/problem\+json/, raw);
  const p = problemOf(got);
  assert.equal(p.code, code, raw);
  if (detail !== undefined) assert.equal(p.detail, detail, raw);
  return got;
}

test('each type is served by its extension and its bytes, with its type, size, ETag and the no-sniff, no-cache headers', async () => {
  const cases: [string, ImageName][] = [['shots/one.png', 'png'], ['shots/two.jpg', 'jpeg'], ['shots/three.jpeg', 'jpeg'], ['shots/four.webp', 'webp'], ['Four.GIF', 'gif']];
  for (const [rel, type] of cases) {
    put(h.project, rel, IMAGES[type]);
    const got = await get(h.base, url(rel));
    assert.equal(got.status, 200, rel);
    assert.deepEqual(got.body, IMAGES[type], rel);
    assert.equal(got.headers['content-type'], IMAGE_LIMITS.types[type].contentType, rel);
    assert.equal(got.headers['content-length'], String(IMAGES[type].length), rel);
    assert.equal(got.headers['x-content-type-options'], 'nosniff', rel);
    assert.equal(got.headers['cache-control'], 'no-cache', rel);
    assert.match(String(got.headers.etag), /^"[0-9a-f]+-[0-9a-f]+"$/, rel);
    assert.equal(got.headers['set-cookie'], undefined, 'an image never gets the person cookie');
  }
});

test('subfolders work down to the depth limit, and one folder deeper is refused', async () => {
  const deep = (n: number) => [...Array(n).fill('d'), 'v2.png'].join('/');
  put(h.project, deep(IMAGE_LIMITS.depth), IMAGES.png);
  put(h.project, deep(IMAGE_LIMITS.depth + 1), decoy);
  assert.equal((await get(h.base, url(deep(IMAGE_LIMITS.depth)))).status, 200);
  await refused(url(deep(IMAGE_LIMITS.depth + 1)), 404, 'not-found', W.deep);
});

test('HEAD answers the GET headers and no body', async () => {
  put(h.project, 'head.png', IMAGES.png);
  const [a, b] = [await get(h.base, url('head.png')), await get(h.base, url('head.png'), { method: 'HEAD' })];
  assert.equal(b.status, 200);
  assert.equal(b.body.length, 0);
  assert.equal(b.headers['content-length'], String(IMAGES.png.length));
  assert.ok(a.headers.etag, 'the GET has an ETag');
  for (const name of ['content-type', 'content-length', 'etag', 'cache-control', 'x-content-type-options']) assert.equal(b.headers[name], a.headers[name], name);
});

test('a matching If-None-Match gets 304 with the ETag and no body; another gets the image', async () => {
  put(h.project, 'tag.png', IMAGES.png);
  const { etag } = (await get(h.base, url('tag.png'))).headers as { etag: string };
  for (const match of [etag, `W/${etag}`, `"other", ${etag}`, '*']) {
    for (const method of ['GET', 'HEAD']) {
      const got = await get(h.base, url('tag.png'), { method, headers: { 'If-None-Match': match } });
      assert.equal(got.status, 304, `${method} ${match}`);
      assert.equal(got.body.length, 0);
      assert.equal(got.headers.etag, etag);
      assert.equal(got.headers['cache-control'], 'no-cache');
      assert.equal(got.headers['x-content-type-options'], 'nosniff');
    }
  }
  const other = await get(h.base, url('tag.png'), { headers: { 'If-None-Match': '"0-0"' } });
  assert.equal(other.status, 200);
  assert.deepEqual(other.body, IMAGES.png);
});

test('an overwritten image has a new ETag, so the old one gets the new picture (updates without polling)', async () => {
  const file = put(h.project, 'swap.png', IMAGES.png);
  const first = (await get(h.base, url('swap.png'))).headers.etag as string;
  put(h.project, 'swap.png', Buffer.concat([IMAGES.png, Buffer.from('longer')]));
  const longer = await get(h.base, url('swap.png'), { headers: { 'If-None-Match': first } });
  assert.equal(longer.status, 200, 'another size');
  assert.notEqual(longer.headers.etag, first);
  const second = longer.headers.etag as string;
  const later = new Date(Date.now() + 60_000);
  fs.utimesSync(file, later, later);
  const touched = await get(h.base, url('swap.png'), { headers: { 'If-None-Match': second } });
  assert.equal(touched.status, 200, 'the same size, a later time');
  assert.notEqual(touched.headers.etag, second);
  assert.equal((await get(h.base, url('swap.png'), { headers: { 'If-None-Match': touched.headers.etag as string } })).status, 304);
});

test('svg is refused (415), by name and by content, and a file is the type its name says or it is refused (415)', async () => {
  put(h.project, 'logo.svg', SVG);
  await refused(url('logo.svg'), 415, 'unsupported-media-type', W.type);
  const fakes: [string, Buffer | string, ImageName][] = [
    ['svg-as.png', SVG, 'png'], ['text.png', 'just some text\n', 'png'], ['html.gif', '<!doctype html><script>alert(1)</script>', 'gif'],
    ['empty.png', '', 'png'], ['png-as.jpg', IMAGES.png, 'jpeg'], ['gif-as.webp', IMAGES.gif, 'webp'], ['cut.png', IMAGES.png.subarray(0, 7), 'png'],
  ];
  for (const [rel, data, claims] of fakes) {
    put(h.project, rel, data);
    await refused(url(rel), 415, 'unsupported-media-type', imageNotReal(claims));
  }
  put(h.project, 'tagged.png', SVG);
  const tagged = await get(h.base, url('tagged.png'), { headers: { 'If-None-Match': '*' } });
  assert.equal(tagged.status, 415, 'a fake is refused even when the client sends an ETag');
});

test('other extensions are refused (415): html, js, txt, none', async () => {
  for (const rel of ['page.html', 'run.js', 'notes.txt', 'noext', 'a.png.exe']) {
    put(h.project, rel, IMAGES.png);
    await refused(url(rel), 415, 'unsupported-media-type', W.type);
  }
});

test('a file over the size limit is refused (413) and one at the limit is served', async () => {
  const sparse = (rel: string, size: number) => {
    const file = put(h.project, rel, IMAGES.png);
    fs.truncateSync(file, size); // a hole after the png header: no disk used
  };
  sparse('big.png', IMAGE_LIMITS.maxBytes + 1);
  await refused(url('big.png'), 413, 'too-large', W.tooBig);
  sparse('edge.png', IMAGE_LIMITS.maxBytes);
  const edge = await get(h.base, url('edge.png'));
  assert.equal(edge.status, 200);
  assert.equal(edge.body.length, IMAGE_LIMITS.maxBytes);
  assert.deepEqual(edge.body.subarray(0, IMAGES.png.length), IMAGES.png);
});

test('a missing file, a folder and a missing images folder are 404', async () => {
  await refused(url('nothing-here.png'), 404, 'not-found', W.missing);
  await refused(url('missing/dir/nothing.png'), 404, 'not-found', W.missing);
  fs.mkdirSync(path.join(imagesDir(h.project), 'folder.png'), { recursive: true });
  await refused(url('folder.png'), 404, 'not-found', W.missing);
  await refused(IMAGE_ROUTE, 404, 'not-found', W.empty);
  await refused(IMAGE_ROUTE.slice(0, -1), 404, 'not-found');
  const bare = await startBoard();
  try {
    const got = await get(bare.base, url('a.png'));
    assert.equal(got.status, 404);
    assert.equal(problemOf(got).detail, W.missing);
    assert.equal(fs.existsSync(imagesDir(bare.project)), false, 'asking for an image makes no folder');
  } finally { await bare.close(); }
});

// What a person or an agent might write in `![alt](path)`, or send straight to the route. Raw
// request paths are sent exactly as written. `..` and `%2e%2e` standing alone as a path segment are
// resolved by URL parsing before routing, so they leave the route and find no page (404); the rest
// reach the route, which decodes once and runs the same check as the Markdown renderer.
const TRICKS: [string, number, string?][] = [
  ['..%2fsecret.png', 404, W.outside], ['..%2f..%2fsecret.png', 404, W.outside], ['%2e%2e%2fsecret.png', 404, W.outside],
  ['%2E%2E%2F%2E%2E%2Fsecret.png', 404, W.outside], ['a%2f..%2f..%2fsecret.png', 404, W.outside], ['..%5csecret.png', 404, W.slash],
  ['..%5C..%5Csecret.png', 404, W.slash], ['%252e%252e%252fsecret.png', 404, W.chars], ['%2fsecret.png', 404, W.outside],
  ['%2fetc%2fhosts.png', 404, W.outside], ['/etc/hosts.png', 404, W.outside], ['http:%2f%2fexample.com%2fa.png', 404, W.outside],
  ['javascript:alert(1)', 404, W.outside], ['data:image%2fpng;base64,AAAA', 404, W.outside], ['file:%2f%2f%2fetc%2fhosts.png', 404, W.outside],
  ['.hidden/a.png', 404, W.dot], ['d/.b.png', 404, W.dot], ['%2ehidden/a.png', 404, W.dot], ['.%2fa.png', 404, W.dot],
  ['a%00.png', 404, W.chars], ['a%20b.png', 404, W.chars], ['%zz.png', 404, W.chars], ['%E0%A4%A.png', 404, W.chars], ['a//b.png', 404, W.blank],
  ['..%2fsecret.png%00.png', 404, W.outside], ['%2e%2e/secret.png', 404], ['../secret.png', 404], ['a/../../secret.png', 404],
  ['./../secret.png', 404], ['.', 404, W.empty],
];

test('path tricks are refused and never read the decoys outside the images folder (.., %2e, leading /, backslash, hidden, scheme, javascript:, data:)', async () => {
  put(h.project, '.hidden/a.png', decoy);
  put(h.project, 'd/.b.png', decoy);
  for (const [raw, status, detail] of TRICKS) await refused(url(raw), status, 'not-found', detail);
});

test('a link out of the images folder is refused, a link that stays inside works, and a dangling link is 404', async () => {
  const dir = imagesDir(h.project);
  put(h.project, 'real/inner.png', IMAGES.png);
  const link = (target: string, name: string) => fs.symlinkSync(target, path.join(dir, name));
  link(path.join(project, 'secret.png'), 'out-file.png'); // an absolute link to a picture outside
  link('../secret.png', 'out-relative.png'); // a relative one: .visionboard/secret.png
  link(project, 'out-dir'); // a folder link out, then a file inside it
  link(path.join(project, '.visionboard'), 'out-data');
  link('real/inner.png', 'in-file.png');
  link('real', 'in-dir');
  link('nowhere.png', 'dangling.png');
  for (const rel of ['out-file.png', 'out-relative.png', 'out-dir/secret.png', 'out-data/secret.png']) await refused(url(rel), 404, 'not-found', W.outside);
  for (const rel of ['in-file.png', 'in-dir/inner.png']) assert.deepEqual((await get(h.base, url(rel))).body, IMAGES.png, rel);
  await refused(url('dangling.png'), 404, 'not-found', W.missing);
});

test('the images folder may itself be a link, but nothing in it may link out of it', async () => {
  const real = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vb-images-')));
  const linked = await startBoard();
  try {
    fs.mkdirSync(path.join(linked.project, '.visionboard'), { recursive: true });
    fs.symlinkSync(real, imagesDir(linked.project));
    fs.writeFileSync(path.join(real, 'here.png'), IMAGES.png);
    fs.writeFileSync(path.join(linked.project, 'secret.png'), decoy);
    fs.symlinkSync(path.join(linked.project, 'secret.png'), path.join(real, 'out.png'));
    assert.deepEqual((await get(linked.base, url('here.png'))).body, IMAGES.png);
    const out = await get(linked.base, url('out.png'));
    assert.equal(out.status, 404);
    assert.ok(!out.body.includes(DECOY));
  } finally { await linked.close(); fs.rmSync(real, { recursive: true, force: true }); }
});

test('the Host check applies to images: another host gets nothing (403)', async () => {
  put(h.project, 'guard.png', IMAGES.png);
  const { port } = new URL(h.base);
  for (const host of ['evil.example', `evil.example:${port}`, `127.0.0.1:${Number(port) + 1}`]) {
    const got = await get(h.base, url('guard.png'), { host });
    assert.equal(got.status, 403, host);
    assert.equal(problemOf(got).code, 'forbidden');
    assert.ok(!got.body.includes(IMAGES.png), host);
  }
  assert.equal((await get(h.base, url('guard.png'), { host: `localhost:${port}` })).status, 200);
});

test('only GET and HEAD: any other method is 405 and says so', async () => {
  put(h.project, 'method.png', IMAGES.png);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const got = await refused(url('method.png'), 405, 'method-not-allowed', undefined, { method });
    assert.equal(got.headers.allow, 'GET, HEAD', method);
  }
  assert.deepEqual(fs.readFileSync(path.join(imagesDir(h.project), 'method.png')), IMAGES.png, 'nothing was written');
});

test('the route serves the folder that is open now, not the one the server started on', async () => {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'vb-home-')));
  const other = path.join(home, 'projects', 'other');
  const b = await startBoard({ home });
  try {
    put(b.project, 'which.png', IMAGES.png);
    put(other, 'which.png', Buffer.concat([IMAGES.png, Buffer.from('FROM-THE-OTHER-FOLDER')]));
    assert.ok(!(await get(b.base, url('which.png'))).body.includes('FROM-THE-OTHER-FOLDER'));
    await b.ok('open_project', { body: { path: other, create: true } });
    assert.ok((await get(b.base, url('which.png'))).body.includes('FROM-THE-OTHER-FOLDER'));
  } finally { await b.close(); fs.rmSync(home, { recursive: true, force: true }); }
});

test('the image route is not an API operation: not in openapi.json, and not in the route table (api.md 154)', () => {
  const spec = JSON.parse(fs.readFileSync(new URL('../../../packages/format/schema/openapi.json', import.meta.url), 'utf8')) as { paths: Record<string, unknown> };
  const prefix = IMAGE_ROUTE.slice(0, -1);
  assert.deepEqual(Object.keys(spec.paths).filter((p) => p.includes(prefix)), []);
  assert.deepEqual(Object.values(OPERATIONS).filter((o) => o.path.includes(prefix)), []);
});
