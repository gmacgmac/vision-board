// The image contract (packages/format/src/images.ts, D-048, docs/specification/images.md): the one
// path check (`imagePathProblem`) that the route and the Markdown renderer both use, the type check
// by bytes (`imageTypeOf`), and the doc that states the limits. The route itself is in
// images-route.test.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { ImageName } from '../../../packages/format/src/index.ts';
import {
  IMAGE_HEAD_BYTES, IMAGE_LIMITS, IMAGE_WORDS, imageNotReal, imagePathProblem, imageTypeByName, imageTypeOf,
} from '../../../packages/format/src/index.ts';
import { PROBLEMS } from '../server/problem.ts';
import { IMAGES, SVG } from './images-support.ts';

const W = IMAGE_WORDS;
const folders = (n: number, file = 'a.png') => [...Array(n).fill('d'), file].join('/');

test('imagePathProblem: plain relative paths to the four types are fine, subfolders too', () => {
  for (const p of ['a.png', 'a.jpg', 'a.jpeg', 'a.webp', 'a.gif', 'A.PNG', 'Shot.JPG', 'diagrams/flow.png', 'diagrams/flow/v2.png',
    'my-shot_1.v2.png', '-a.png', '_a.png', folders(IMAGE_LIMITS.depth), `${'a'.repeat(IMAGE_LIMITS.nameChars - 4)}.png`]) {
    assert.equal(imagePathProblem(p), undefined, p);
  }
});

test('imagePathProblem: anything that leaves the images folder is refused (.., /, a scheme, javascript:, data:)', () => {
  for (const p of ['../a.png', 'a/../b.png', 'a/b/../../../c.png', '/etc/a.png', '/', 'javascript:alert(1)', 'data:image/png;base64,iVBOR',
    'file:///etc/a.png', 'C:/a.png', 'ftp:a.png', 'blob:null/x', 'httpx://x.example/a.png', '\\a.png', '\\\\host\\share\\a.png']) {
    assert.equal(imagePathProblem(p), W.outside, p);
  }
});

test('imagePathProblem: an internet address says so, not a folder rule (http:, https:, //)', () => {
  for (const p of ['//host/a.png', 'http://x.example/a.png', 'https://x.example/a.png', 'HTTPS://x.example/a.png', 'Http:x.example/a.png',
    'https://127.0.0.1:4466/board-images/a.png']) {
    assert.equal(imagePathProblem(p), W.web, p);
  }
});

test('imagePathProblem: a backslash, a % code, a hidden name and an odd character are each refused with their reason', () => {
  for (const p of ['a\\b.png', '..\\..\\a.png', 'a\\..\\b.png']) assert.equal(imagePathProblem(p), W.slash, p);
  for (const p of ['%2e%2e/a.png', '%2E%2E%2Fa.png', 'a/%2e%2e/b.png', 'a%2fb.png', 'a%20b.png', 'a%00.png', '%252e%252e/a.png', 'a%.png']) {
    assert.equal(imagePathProblem(p), W.chars, p);
  }
  for (const p of ['.hidden/a.png', 'a/.hidden/b.png', 'a/.b.png', './a.png', 'a/./b.png', '.', '.png', '..%2fa.png', '.../a.png']) {
    assert.equal(imagePathProblem(p), W.dot, p);
  }
  for (const p of ['a b.png', 'a?b.png', 'a#b.png', 'a;b.png', 'a*b.png', 'a"b.png', "a'b.png", 'a<b>.png', 'a|b.png', 'a\0b.png',
    'a\nb.png', 'a.png\n', ' a.png', 'a.png ', 'a\tb.png', 'é.png', 'a/ü/b.png', 'a=b.png', 'a+b.png']) {
    assert.equal(imagePathProblem(p), W.chars, JSON.stringify(p));
  }
});

test('imagePathProblem: nothing, an empty folder name, a name or a depth over the limit are refused', () => {
  assert.equal(imagePathProblem(''), W.empty);
  assert.equal(imagePathProblem('a/'), W.empty);
  assert.equal(imagePathProblem('a//b.png'), W.blank);
  assert.equal(imagePathProblem('a///b.png'), W.blank);
  assert.equal(imagePathProblem(`${'a'.repeat(IMAGE_LIMITS.nameChars)}.png`), W.long);
  assert.equal(imagePathProblem(`${'d'.repeat(IMAGE_LIMITS.nameChars + 1)}/a.png`), W.long);
  assert.equal(imagePathProblem(folders(IMAGE_LIMITS.depth + 1)), W.deep);
  assert.equal(imagePathProblem(folders(IMAGE_LIMITS.depth + 20)), W.deep);
});

test('imagePathProblem: svg and every other type that is not png, jpeg, webp or gif is refused', () => {
  for (const p of ['a.svg', 'a.SVG', 'a.svgz', 'a.png.svg', 'a.html', 'a.js', 'a.txt', 'a.tiff', 'a.bmp', 'a.ico', 'a.avif', 'a.pn', 'a.jpe',
    'a', 'png', 'a.', 'd.png/b', 'a.png.exe']) {
    assert.equal(imagePathProblem(p), W.type, p);
  }
});

test('imagePathProblem: the reasons are plain words, short, and say what is allowed', () => {
  const reasons = [...Object.values(W), imageNotReal('png')];
  for (const r of reasons) {
    assert.ok(r.length <= 40, `"${r}" is longer than it needs to be`);
    assert.doesNotMatch(r, /\b(urls?|uris?|regex|patterns?|segments?|traversal|mime|magic|bytes?|http|payload|sanitis|invalid)\b/i, r);
  }
  assert.equal(W.type, 'only png, jpeg, webp or gif');
  assert.equal(W.tooBig, 'over 8 MB');
  assert.equal(W.outside, 'must be inside the images folder');
  assert.equal(W.web, 'no images from the internet');
});

test('imageTypeByName: the extension names the type, in any case; jpg is jpeg', () => {
  assert.equal(imageTypeByName('a.png'), 'png');
  assert.equal(imageTypeByName('d/a.JPG'), 'jpeg');
  assert.equal(imageTypeByName('a.jpeg'), 'jpeg');
  assert.equal(imageTypeByName('a.webp'), 'webp');
  assert.equal(imageTypeByName('a.Gif'), 'gif');
  for (const p of ['a.svg', 'a', 'd.png/b', 'a.png.svg', '']) assert.equal(imageTypeByName(p), undefined, p);
});

test('imageTypeOf: each type is known by the bytes it starts with, and nothing else is', () => {
  for (const [name, data] of Object.entries(IMAGES)) {
    assert.equal(imageTypeOf(data), name, name);
    assert.equal(imageTypeOf(new Uint8Array(data)), name, `${name} as a plain Uint8Array`);
    assert.equal(imageTypeOf(data.subarray(0, IMAGE_HEAD_BYTES)), name, `${name} from its first ${IMAGE_HEAD_BYTES} bytes`);
  }
  const text = (s: string) => Buffer.from(s, 'latin1');
  const fakes: Record<string, Buffer> = {
    svg: SVG, 'svg with an xml header': text('<?xml version="1.0"?><svg/>'), html: text('<!doctype html><script>alert(1)</script>'),
    empty: Buffer.alloc(0), zeros: Buffer.alloc(64), 'png cut short': IMAGES.png.subarray(0, 7), 'png with one byte wrong': Buffer.concat([Buffer.from([0x88]), IMAGES.png.subarray(1)]),
    'jpeg cut short': Buffer.from([0xff, 0xd8]), 'gif cut short': text('GIF8'), 'gif with a wrong version': text('GIF88a......'),
    'riff that is not webp': text('RIFF\0\0\0\0AVI LIST'), 'webp name only': text('....WEBP....'), 'riff cut short': text('RIFF\0\0\0\0WEB'),
  };
  for (const [what, data] of Object.entries(fakes)) assert.equal(imageTypeOf(data), undefined, what);
});

test('images.ts is pure string logic: no import, no Node, no DOM (the page and the server both run it)', () => {
  const code = fs.readFileSync(new URL('../../../packages/format/src/images.ts', import.meta.url), 'utf8')
    .split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');
  assert.doesNotMatch(code, /^\s*import\s/m, 'it imports nothing');
  assert.doesNotMatch(code, /\b(Buffer|process|require|document|window|globalThis|fetch)\b|node:/, 'it uses no Node or browser name');
});

// ---- the doc ----

const DOC = fs.readFileSync(new URL('../../../docs/specification/images.md', import.meta.url), 'utf8');
/** The body rows of the table under heading `title`: each cell, backticks dropped. */
function rows(title: string): string[][] {
  const section = DOC.split(new RegExp(`^#+ ${title}$`, 'm'))[1]?.split(/^#+ /m)[0];
  assert.ok(section, `images.md has no "${title}" section`);
  return [...section.matchAll(/^\|(.+)\|$/gm)].map((m) => m[1]!.split('|').map((c) => c.trim().replaceAll('`', '')))
    .filter((r) => !/^:?-+:?$/.test(r[0]!)).slice(1);
}

test('images.md states every limit as IMAGE_LIMITS holds it, and nothing else', () => {
  const { maxBytes, depth, nameChars } = IMAGE_LIMITS;
  assert.deepEqual(Object.fromEntries(rows('Limits').map(([name, value]) => [name, Number(value)])), { maxBytes, depth, nameChars });
});

test('images.md lists each type with its extensions and content type as IMAGE_LIMITS holds them', () => {
  const held = Object.entries(IMAGE_LIMITS.types).map(([name, t]) => [name, t.extensions.join(', '), t.contentType]);
  assert.deepEqual(rows('Types').map((r) => r.slice(0, 3)), held);
});

test('images.md lists every reason an image is not shown, in the words the code uses', () => {
  const held = [...Object.values(IMAGE_WORDS), imageNotReal('<type>' as ImageName)];
  assert.deepEqual(rows('Reasons').map(([reason]) => reason), held);
});

test('images.md gives each problem the status the server gives it', () => {
  const problems = rows('Answers').filter(([, code]) => code);
  assert.ok(problems.length >= 5, 'the doc lists the route\'s problems');
  for (const [status, code] of problems) assert.equal(PROBLEMS[code as keyof typeof PROBLEMS]?.status, Number(status), `${status} ${code}`);
  assert.deepEqual(rows('Answers').filter(([, code]) => !code).map(([status]) => status), ['200', '304']);
});

test('images.md lists the headers the route sets', () => {
  assert.deepEqual(rows('Headers').map(([name]) => name), ['Content-Type', 'Content-Length', 'ETag', 'Cache-Control', 'X-Content-Type-Options']);
});
