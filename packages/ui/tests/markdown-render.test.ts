// The renderer's own shapes (D-023, 2c_FE_01 "Output classes"): the CSS hooks, the label's
// heading level, one level of list nesting, and the constructs outside the subset as plain text.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/index.ts';

const md = (src: string, opts?: { headingLevel?: number; more?: boolean }) => renderMarkdown(src, opts);

test('paragraphs, with soft and hard line breaks', () => {
  assert.equal(md(''), '');
  assert.equal(md('one\ntwo\n\nthree'), '<p class="vb-md-p">one\ntwo</p><p class="vb-md-p">three</p>');
  assert.equal(md('a  \nb'), '<p class="vb-md-p">a<br />\nb</p>');
  assert.equal(md('a\\\nb'), '<p class="vb-md-p">a<br />\nb</p>');
});

test('inline marks carry their classes', () => {
  assert.equal(md('**b** __b__ *i* _i_ ~~s~~ `c`'), '<p class="vb-md-p"><strong>b</strong> <strong>b</strong> '
    + '<em>i</em> <em>i</em> <del>s</del> <code class="vb-md-icode">c</code></p>');
  assert.equal(md('[t](https://e.com "Title")'), '<p class="vb-md-p"><a class="vb-md-link" href="https://e.com" '
    + 'title="Title" rel="noopener noreferrer" target="_blank">t</a></p>');
  assert.equal(md('<https://e.com/x>'), '<p class="vb-md-p"><a class="vb-md-link" href="https://e.com/x" '
    + 'rel="noopener noreferrer" target="_blank">https://e.com/x</a></p>');
  assert.equal(md('\\*not\\*'), '<p class="vb-md-p">*not*</p>');
});

// Heading sizes (markdownMore on, the default) are markdown-more.test.ts's; with it off, every level is the label.
test('a ### heading is a small label, at the level the caller gives (default 4); with markdownMore off, every level', () => {
  assert.equal(md('### Options'), '<span class="vb-md-label" role="heading" aria-level="4">Options</span>');
  assert.equal(md('# A', { more: false }), md('###### A'));
  assert.equal(md('## A', { headingLevel: 5, more: false }), '<span class="vb-md-label" role="heading" aria-level="5">A</span>');
  for (const bad of [0, 9, 2.5, Number.NaN]) assert.match(md('# A', { headingLevel: bad }), /aria-level="4"/, String(bad));
});

test('lists: bullets, numbers with their start, one level of nesting', () => {
  assert.equal(md('- a\n- b'), '<ul class="vb-md-list"><li>a</li><li>b</li></ul>');
  assert.equal(md('* a\n+ b'), '<ul class="vb-md-list"><li>a</li></ul><ul class="vb-md-list"><li>b</li></ul>');
  assert.equal(md('1. a\n2. b'), '<ol class="vb-md-list"><li>a</li><li>b</li></ol>');
  assert.equal(md('3. a'), '<ol class="vb-md-list" start="3"><li>a</li></ol>');
  assert.equal(md('- a\n  - b'), '<ul class="vb-md-list"><li>a<ul class="vb-md-list"><li>b</li></ul></li></ul>');
  assert.equal(md('- a\n\n- b'), '<ul class="vb-md-list"><li><p class="vb-md-p">a</p></li><li><p class="vb-md-p">b</p></li></ul>');
});

test('a list nested deeper than one level is plain text, marker included', () => {
  assert.equal(md('- a\n  - b\n    - c\n    - **d**'),
    '<ul class="vb-md-list"><li>a<ul class="vb-md-list"><li>b<p class="vb-md-p">- c</p>'
    + '<p class="vb-md-p">- <strong>d</strong></p></li></ul></li></ul>');
  assert.match(md('1. a\n   1. b\n      1) c'), /<p class="vb-md-p">1\) c<\/p>/);
});

test('quotes are callouts and code blocks are scrollable, focusable pre > code', () => {
  assert.equal(md('> said\n> **this**'), '<blockquote class="vb-md-quote"><p class="vb-md-p">said\n<strong>this</strong></p></blockquote>');
  assert.equal(md('```js\nlet a = 1;\n```'), '<pre class="vb-md-code" tabindex="0"><code>let a = 1;\n</code></pre>');
  assert.equal(md('~~~\nx\n~~~'), '<pre class="vb-md-code" tabindex="0"><code>x\n</code></pre>');
});

test('everything outside the subset renders as escaped plain text', () => {
  const plain = (src: string) => assert.doesNotMatch(md(src), /<(?!\/?p\b)[a-z]/, src);
  // Tables and thematic breaks are in the subset with markdownMore (markdown-more.test.ts); off, they are text.
  plain('Title\n=====');
  plain('    indented code');
  plain('[ref]\n\n[ref]: https://e.com');
  plain('<div>\nhtml block\n</div>');
  // An image from the internet is never shown (D-048 ruling 19, rule 18): the box says so (markdown-images.test.ts).
  assert.equal(md('![alt](https://e.com/a.png)'), '<p class="vb-md-p"><span class="vb-md-noimg">Image not shown: '
    + '<code>https://e.com/a.png</code> (no images from the internet)</span></p>');
  assert.equal(md('&copy; &amp;'), '<p class="vb-md-p">&#38;copy; &#38;amp;</p>');
});

test('the output never carries an inline style', () => {
  assert.doesNotMatch(md('# a\n\n- **b**\n\n> c\n\n```\nd\n```\n\n[e](https://e.com) `f`\n\n---\n\n| g | h |\n|:-:|--:|\n| i | j |'), /style=|<style/);
});
