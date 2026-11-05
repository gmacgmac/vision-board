// Heading sizes, tables and thematic breaks (markdownMore flag, PLAN decisions 7-9, insert-markdown-signals
// MD_01): `#` large, `##` medium, `###` to `######` the label; GFM tables of up to 4 columns; `---`,
// `***` and `___` as a line, never a setext underline. With the flag off (`more: false`) the output is
// exactly D-023's. Tables are held to the GFM spec's own examples (GFM 0.29-gfm, § Tables (extension),
// examples 198-205, CC BY-SA 4.0 like the CommonMark fixture, tests/fixtures/README.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/index.ts';

const md = (src: string, more?: boolean) => renderMarkdown(src, more === undefined ? {} : { more });
const label = (t: string, cls = 'vb-md-label') => `<span class="${cls}" role="heading" aria-level="4">${t}</span>`;

test('on by default: # is large, ## medium, ### to ###### the small label, at the caller\'s level', () => {
  assert.equal(md('# A'), label('A', 'vb-md-h1'));
  assert.equal(md('## A'), label('A', 'vb-md-h2'));
  for (const h of ['###', '####', '#####', '######']) assert.equal(md(`${h} A`), label('A'), h);
  assert.equal(renderMarkdown('# A', { headingLevel: 5 }), '<span class="vb-md-h1" role="heading" aria-level="5">A</span>');
  assert.equal(md('# A *b*'), label('A <em>b</em>', 'vb-md-h1'));
});

test('a thematic break is one rule, from ---, *** or ___ with spaces between', () => {
  for (const src of ['---', '***', '___', ' - - -', '_____', '*  *  *']) assert.equal(md(src), '<hr class="vb-md-rule">', src);
  for (const src of ['--', '-- -x', '+++', '===', '    ---']) assert.doesNotMatch(md(src), /<hr/, src);
  assert.equal(md('- a\n- * * *'), '<ul class="vb-md-list"><li>a</li><li><hr class="vb-md-rule"></li></ul>');
});

test('--- under a paragraph line is a break, never a heading underline (setext stays unsupported)', () => {
  assert.equal(md('Title\n---\nmore'), '<p class="vb-md-p">Title</p><hr class="vb-md-rule"><p class="vb-md-p">more</p>');
  assert.equal(md('Title\n==='), '<p class="vb-md-p">Title\n===</p>');
});

const TABLE = '<table class="vb-md-table">';

test('a table: <th scope="col"> header, alignment from the delimiter row, inline Markdown in cells', () => {
  assert.equal(md('| a | b | c |\n|:--|:-:|--:|\n| **1** | `2` | [3](https://e.com) |'),
    `${TABLE}<thead><tr><th scope="col" class="vb-md-left">a</th><th scope="col" class="vb-md-center">b</th>`
    + '<th scope="col" class="vb-md-right">c</th></tr></thead><tbody><tr><td class="vb-md-left"><strong>1</strong></td>'
    + '<td class="vb-md-center"><code class="vb-md-icode">2</code></td><td class="vb-md-right"><a class="vb-md-link" '
    + 'href="https://e.com" rel="noopener noreferrer" target="_blank">3</a></td></tr></tbody></table>');
});

test('the paragraph\'s last line is the header; the lines before it stay a paragraph', () => {
  assert.equal(md('Two options:\n| a | b |\n|---|---|'),
    `<p class="vb-md-p">Two options:</p>${TABLE}<thead><tr><th scope="col">a</th><th scope="col">b</th></tr></thead></table>`);
});

test('4 columns are a table; 5 or more stay text', () => {
  const row = (n: number, c: string) => `|${Array.from({ length: n }, () => ` ${c} `).join('|')}|`;
  const src = (n: number) => `${row(n, 'h')}\n${row(n, '---')}\n${row(n, 'x')}`;
  assert.ok(md(src(4)).startsWith(TABLE));
  assert.equal((md(src(4)).match(/<th /g) ?? []).length, 4);
  assert.equal(md(src(5)), `<p class="vb-md-p">${src(5)}</p>`);
  assert.equal(md(src(9)), `<p class="vb-md-p">${src(9)}</p>`);
});

test('tables sit in quotes and list items, and end at a blank line or another block', () => {
  assert.match(md('> | a |\n> |---|\n> | 1 |'), /^<blockquote class="vb-md-quote"><table class="vb-md-table">.*<\/table><\/blockquote>$/);
  assert.match(md('- x\n\n  | a |\n  |---|'), /<li><p class="vb-md-p">x<\/p><table /);
  assert.match(md('| a |\n|---|\n| 1 |\n\nafter'), /<\/table><p class="vb-md-p">after<\/p>$/);
  assert.match(md('| a |\n|---|\n- item'), /<\/table><ul class="vb-md-list">/);
  // A delimiter row with no pipe is not one, and a lazy line outside the quote does not open a table.
  assert.doesNotMatch(md('a\n:-:'), /<table/);
  assert.doesNotMatch(md('> | a |\n|---|'), /<table/);
});

test('flag off: every heading is the label and tables and breaks stay text, exactly as D-023', () => {
  assert.equal(md('# A', false), label('A'));
  assert.equal(md('## A', false), label('A'));
  assert.equal(md('---', false), '<p class="vb-md-p">---</p>');
  assert.equal(md('a\n***\nb', false), '<p class="vb-md-p">a\n***\nb</p>');
  assert.equal(md('| a | b |\n|---|---|\n| 1 | 2 |', false), '<p class="vb-md-p">| a | b |\n|---|---|\n| 1 | 2 |</p>');
});

/** GFM's examples 198-205 (§ Tables (extension)), their HTML as the spec gives it. */
const GFM: { n: number; markdown: string; html: string }[] = [
  { n: 198, markdown: '| foo | bar |\n| --- | --- |\n| baz | bim |\n',
    html: '<table><thead><tr><th>foo</th><th>bar</th></tr></thead><tbody><tr><td>baz</td><td>bim</td></tr></tbody></table>' },
  { n: 199, markdown: '| abc | defghi |\n:-: | -----------:\nbar | baz\n',
    html: '<table><thead><tr><th align="center">abc</th><th align="right">defghi</th></tr></thead>'
      + '<tbody><tr><td align="center">bar</td><td align="right">baz</td></tr></tbody></table>' },
  { n: 200, markdown: '| f\\|oo  |\n| ------ |\n| b `\\|` az |\n| b **\\|** im |\n',
    html: '<table><thead><tr><th>f|oo</th></tr></thead><tbody><tr><td>b <code>|</code> az</td></tr>'
      + '<tr><td>b <strong>|</strong> im</td></tr></tbody></table>' },
  { n: 201, markdown: '| abc | def |\n| --- | --- |\n| bar | baz |\n> bar\n',
    html: '<table><thead><tr><th>abc</th><th>def</th></tr></thead><tbody><tr><td>bar</td><td>baz</td></tr></tbody></table>'
      + '<blockquote><p>bar</p></blockquote>' },
  { n: 202, markdown: '| abc | def |\n| --- | --- |\n| bar | baz |\nbar\n\nbar\n',
    html: '<table><thead><tr><th>abc</th><th>def</th></tr></thead><tbody><tr><td>bar</td><td>baz</td></tr>'
      + '<tr><td>bar</td><td></td></tr></tbody></table><p>bar</p>' },
  { n: 203, markdown: '| abc | def |\n| --- |\n| bar |\n', html: '<p>| abc | def |\n| --- |\n| bar |</p>' },
  { n: 204, markdown: '| abc | def |\n| --- | --- |\n| bar |\n| bar | baz | boo |\n',
    html: '<table><thead><tr><th>abc</th><th>def</th></tr></thead><tbody><tr><td>bar</td><td></td></tr>'
      + '<tr><td>bar</td><td>baz</td></tr></tbody></table>' },
  { n: 205, markdown: '| abc | def |\n| --- | --- |\n', html: '<table><thead><tr><th>abc</th><th>def</th></tr></thead></table>' },
];

/** Our shapes back to GFM's: no classes or scope, alignment as the align attribute. */
const plain = (html: string): string => html
  .replace(/ scope="col"/g, '')
  .replace(/ class="vb-md-(left|center|right)"/g, ' align="$1"')
  .replace(/ class="vb-md-[a-z]+"/g, '');

for (const e of GFM) {
  test(`GFM table example ${e.n}`, () => assert.equal(plain(md(e.markdown)), e.html));
}
