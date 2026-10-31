// Images in Markdown (D-048 ruling 19, app-cards FE_03): `![alt](path)` is one fixed <img> under the
// board's image route when `imagePathProblem` (packages/format, the one path check) passes and the alt
// text is there; a path it refuses is the "Image not shown" box with the reason in IMAGE_WORDS' words;
// no alt text is the path as plain text; with the cardImages flag off it is its source text, as before.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { IMAGE_LIMITS, IMAGE_ROUTE, IMAGE_WORDS } from '#format';
import { imageNote, renderMarkdown } from '../src/index.ts';
import { IMG, IMGS, assertSafe } from './markdown-adversarial.ts';

const md = (src: string, images?: boolean) => renderMarkdown(src, images === undefined ? {} : { images });
const img = (path: string, alt: string) =>
  `<img class="vb-md-img" src="${IMAGE_ROUTE}${path}" alt="${alt}" loading="lazy" decoding="async">`;

test('an image is the one fixed shape: its class, its src under the image route, its alt, lazy and async', () => {
  assert.equal(md('![Flow](diagrams/flow.png)'), `<p class="vb-md-p">${img('diagrams/flow.png', 'Flow')}</p>`);
  assert.equal(md('See ![a shot](shot.JPG) here'), `<p class="vb-md-p">See ${img('shot.JPG', 'a shot')} here</p>`);
  for (const ext of ['png', 'jpg', 'jpeg', 'webp', 'gif']) assert.match(md(`![x](a.${ext})`), IMG, ext);
  assert.match(md('![Flow](diagrams/flow.png)'), new RegExp(`^<p class="vb-md-p">${IMG.source}</p>$`));
});

test('subfolders work down to the depth limit; one folder deeper is refused', () => {
  const deep = (n: number) => `${Array.from({ length: n }, (_, i) => `d${i}`).join('/')}/x.png`;
  assert.match(md(`![Deep](${deep(IMAGE_LIMITS.depth)})`), IMG);
  const html = md(`![Deeper](${deep(IMAGE_LIMITS.depth + 1)})`);
  assert.doesNotMatch(html, /<img/);
  assert.ok(html.includes(IMAGE_WORDS.deep), html);
});

test('the alt text is the description as plain text: marks and links drop to their words, and it is escaped', () => {
  assert.equal(md('![foo *bar* `c`](a.png)'), `<p class="vb-md-p">${img('a.png', 'foo bar c')}</p>`);
  assert.equal(md('![foo [bar](https://e.com)](a.png)'), `<p class="vb-md-p">${img('a.png', 'foo bar')}</p>`);
  assert.equal(md('![a "b" <c> & \'d\'](a.png)'), `<p class="vb-md-p">${img('a.png', 'a &#34;b&#34; &#60;c&#62; &#38; &#39;d&#39;')}</p>`);
  assert.equal(md('![one\ntwo](a.png)'), `<p class="vb-md-p">${img('a.png', 'one two')}</p>`);
  // A title is not part of the shape.
  assert.equal(md('![T](a.png "a title")'), `<p class="vb-md-p">${img('a.png', 'T')}</p>`);
});

test('no alt text: the image shows as its path, in plain text', () => {
  assert.equal(md('![](diagrams/flow.png)'), '<p class="vb-md-p">diagrams/flow.png</p>');
  assert.equal(md('![  ](diagrams/flow.png)'), '<p class="vb-md-p">diagrams/flow.png</p>');
});

/** Every path the one check refuses, with the reason it gives. */
const REFUSED: [string, string][] = [
  ['../secret.png', IMAGE_WORDS.outside],
  ['a/../../secret.png', IMAGE_WORDS.outside],
  ['%2e%2e/secret.png', IMAGE_WORDS.chars],
  ['/etc/a.png', IMAGE_WORDS.outside],
  ['//evil.com/a.png', IMAGE_WORDS.web],
  ['\\\\server\\a.png', IMAGE_WORDS.outside],
  ['a\\b.png', IMAGE_WORDS.slash],
  ['.hidden/a.png', IMAGE_WORDS.dot],
  ['./a.png', IMAGE_WORDS.dot],
  ['a//b.png', IMAGE_WORDS.blank],
  ['https://example.com/a.png', IMAGE_WORDS.web],
  ['http://127.0.0.1:4466/board-images/a.png', IMAGE_WORDS.web],
  ['javascript:alert(1)', IMAGE_WORDS.outside],
  ['JaVaScRiPt:alert(1)//a.png', IMAGE_WORDS.outside],
  ['data:image/png;base64,iVBORw0KGgo=', IMAGE_WORDS.outside],
  ['a.svgz', IMAGE_WORDS.type],
  ['a.png.html', IMAGE_WORDS.type],
  ['noextension', IMAGE_WORDS.type],
  ['a b.png', IMAGE_WORDS.chars],
];

test('a path the one check refuses is the "Image not shown" box, with its reason, and nothing is fetched', () => {
  for (const [path, why] of REFUSED) {
    const html = md(`![Picture](<${path.replace(/\\/g, '\\\\')}>)`);
    assertSafe(html);
    assert.doesNotMatch(html, /<img|src=/, path);
    assert.ok(html.includes(`<span class="vb-md-noimg">Image not shown: <code>`), `${path}: ${html}`);
    assert.ok(html.includes(`(${why.replace(/'/g, '&#39;')})`), `${path}: ${why} in ${html}`);
  }
  assert.equal(md('![Picture]()'), `<p class="vb-md-p"><span class="vb-md-noimg">Image not shown (${IMAGE_WORDS.empty})</span></p>`);
  assert.equal(md('![x](../a.png)'), `<p class="vb-md-p">${imageNote('../a.png', IMAGE_WORDS.outside)}</p>`);
});

test('the box: "Image not found" with the path when the file is missing, else "Image not shown" and why', () => {
  assert.equal(imageNote('diagrams/flow.png', IMAGE_WORDS.missing), '<span class="vb-md-noimg">Image not found: <code>diagrams/flow.png</code></span>');
  assert.equal(imageNote('big.png', IMAGE_WORDS.tooBig), '<span class="vb-md-noimg">Image not shown: <code>big.png</code> (over 8 MB)</span>');
  assert.equal(imageNote('<b>.png', 'a "reason"'), '<span class="vb-md-noimg">Image not shown: <code>&#60;b&#62;.png</code> (a &#34;reason&#34;)</span>');
});

test('an image inside a link stays an image; a link inside an image\'s alt is only its words', () => {
  assert.equal(md('[![Flow](flow.png)](https://e.com)'), '<p class="vb-md-p"><a class="vb-md-link" href="https://e.com" '
    + `rel="noopener noreferrer" target="_blank">${img('flow.png', 'Flow')}</a></p>`);
  assert.equal(md('[![Flow](flow.png)](/relative)'), `<p class="vb-md-p">${img('flow.png', 'Flow')}</p>`);
});

test('images render in every block: lists, quotes, labels; never in code', () => {
  assert.match(md('- ![a](a.png)'), /<li><img class="vb-md-img"/);
  assert.match(md('> ![a](a.png)'), /<blockquote class="vb-md-quote"><p class="vb-md-p"><img class="vb-md-img"/);
  assert.equal(md('`![a](a.png)`'), '<p class="vb-md-p"><code class="vb-md-icode">![a](a.png)</code></p>');
  assert.equal(md('```\n![a](a.png)\n```'), '<pre class="vb-md-code" tabindex="0"><code>![a](a.png)\n</code></pre>');
  assert.equal(md('\\![a](a.png)'), '<p class="vb-md-p">!a</p>');
});

test('with images off (the cardImages flag off) an image is its source text, exactly as before', () => {
  for (const src of ['![Flow](diagrams/flow.png)', '![x](../a.png)', '![](a.png)', '![a *b*](https://e.com/a.png "t")']) {
    const html = md(src, false);
    assert.equal(html, `<p class="vb-md-p">${src.replace(/"/g, '&#34;')}</p>`, src);
  }
});

test('each flag comes in with the call, its default when left out, and no call changes another: two boards on one page can differ', () => {
  assert.match(renderMarkdown('![F](f.png)'), IMG, 'cardImages is on by default');
  assert.equal(renderMarkdown('![F](f.png)', { images: false }), '<p class="vb-md-p">![F](f.png)</p>');
  assert.match(renderMarkdown('![F](f.png)'), IMG, 'the call before it changed nothing');
  assert.match(renderMarkdown('![F](f.svg)'), /<img /, 'svgImages is on by default');
  assert.ok(renderMarkdown('![F](f.svg)', { svg: false }).includes(IMAGE_WORDS.typeNoSvg));
  assert.match(renderMarkdown('![F](f.svg)'), /<img /);
});

test('an image goes under the route it is given, and only the board\'s path check decides what follows it', () => {
  assert.equal(renderMarkdown('![F](f.png)', { imageRoute: '/plugins/board/images/' }), `<p class="vb-md-p">${img('f.png', 'F').replace(IMAGE_ROUTE, '/plugins/board/images/')}</p>`);
  assert.doesNotMatch(renderMarkdown('![F](../f.png)', { imageRoute: '/plugins/board/images/' }), /<img/);
});

test('many images in one body each get the shape', () => {
  const html = md(Array.from({ length: 50 }, (_, i) => `![p${i}](p/${i}.png)`).join(' '));
  assert.equal(html.match(IMGS)?.length, 50);
  assertSafe(html);
});
