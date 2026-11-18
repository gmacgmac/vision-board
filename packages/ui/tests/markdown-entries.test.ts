// Entries (D-105 5, PLAN call 9; MarkdownOptions.entries): a `###` heading and the blocks after it up to the next
// heading, rule or entry start; a paragraph opening with a bold run; a top-level list item opening with one (it keeps
// its li). `##`, `####`, plain lists, quotes, tables, code and details stay as they are; everything stays escaped; off,
// byte for byte as before.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown } from '../src/index.ts';

const on = (src: string): string => renderMarkdown(src, { more: true, details: true, entries: true });
const off = (src: string, extra = {}): string => renderMarkdown(src, { more: true, details: true, ...extra });
const NAME = (s: string, level = 4): string => `<span class="vb-md-entry-name" role="heading" aria-level="${level}">${s}</span>`;

test('a ### entry is the heading and the blocks after it, up to the next heading, rule or entry start', () => {
  assert.equal(on('### Invites go out\n200 teams.\n\n- a\n- b\n\n### Review\nTogether.\n\n---\n\nAfter the rule.'),
    `<div class="vb-md-entry">${NAME('Invites go out')}<p class="vb-md-p">200 teams.</p><ul class="vb-md-list"><li>a</li><li>b</li></ul></div>`
    + `<div class="vb-md-entry">${NAME('Review')}<p class="vb-md-p">Together.</p></div><hr class="vb-md-rule"><p class="vb-md-p">After the rule.</p>`);
  assert.match(on('### One\ntext\n\n## Two\nmore'), /^<div class="vb-md-entry">.*text<\/p><\/div><span class="vb-md-h2"/);
  assert.match(on('### One\ntext\n\n**Two** next'), /text<\/p><\/div><div class="vb-md-entry"><strong class="vb-md-entry-name">Two<\/strong>/, 'a bold lead starts the next entry');
  assert.match(on('### One\n\n- **Two**: x'), /^<div class="vb-md-entry">.*One<\/span><\/div><ul class="vb-md-list"><li class="vb-md-entry">/, 'so does a list with an entry');
  assert.equal(on('### Level', ), `<div class="vb-md-entry">${NAME('Level')}</div>`);
  assert.equal(renderMarkdown('### Level', { entries: true, headingLevel: 5 }), `<div class="vb-md-entry">${NAME('Level', 5)}</div>`, 'the name keeps its level');
});

test('a bold lead: the name, then the rest with one leading separator and its spaces dropped', () => {
  for (const sep of [':', ' -', ' –', ' —', '', ' :']) {
    assert.equal(on(`**Pricing page live**${sep} on the site.`),
      '<div class="vb-md-entry"><strong class="vb-md-entry-name">Pricing page live</strong><p class="vb-md-p">on the site.</p></div>', JSON.stringify(sep));
  }
  assert.equal(on('__Name__'), '<div class="vb-md-entry"><strong class="vb-md-entry-name">Name</strong></div>', 'a name alone');
  assert.equal(on('**Name** -- two'), '<div class="vb-md-entry"><strong class="vb-md-entry-name">Name</strong><p class="vb-md-p">- two</p></div>', 'one separator only');
  assert.match(on('**Name**  \nnext line'), /<strong class="vb-md-entry-name">Name<\/strong><p class="vb-md-p">next line<\/p>/, 'a hard break after the name');
  assert.equal(on('Plain **bold** later'), '<p class="vb-md-p">Plain <strong>bold</strong> later</p>', 'bold that does not open the paragraph');
});

test('in a list, each top-level item opening with a bold name is an entry and keeps its li; the others keep their bullets', () => {
  assert.equal(on('- Store listing\n- **Launch webinar**: forty minutes\n- Support macros'),
    '<ul class="vb-md-list"><li>Store listing</li><li class="vb-md-entry"><strong class="vb-md-entry-name">Launch webinar</strong> forty minutes</li><li>Support macros</li></ul>');
  assert.equal(on('1. **One** — a\n\n2. two'),
    '<ol class="vb-md-list"><li class="vb-md-entry"><strong class="vb-md-entry-name">One</strong><p class="vb-md-p">a</p></li><li><p class="vb-md-p">two</p></li></ol>', 'a loose list keeps its paragraphs');
  assert.equal(on('- a\n  - **nested**: no'), off('- a\n  - **nested**: no'), 'a nested item stays as it is');
  assert.equal(on('- one\n- two'), off('- one\n- two'), 'a plain list stays as it is');
});

test('##, ####, quotes, tables, code and details stay as they are', () => {
  for (const src of ['## Two\ntext', '#### Four\ntext', '> **Quoted**: lead', '| **A** | b |\n|---|---|\n| 1 | 2 |', '```\n**code**: x\n```', '# One\ntext']) {
    assert.equal(on(src), off(src), src);
  }
  assert.match(on('+++ More\n**Inside**: x\n+++'), /<div class="vb-md-detail"><div class="vb-md-entry"><strong class="vb-md-entry-name">Inside<\/strong>/, 'inside details, the detail is a document of its own');
});

test('everything stays escaped: a name with markup in it, and the text after it', () => {
  assert.equal(on('**<img src=x onerror=alert(1)>** - <b>x</b>'),
    '<div class="vb-md-entry"><strong class="vb-md-entry-name">&#60;img src=x onerror=alert(1)&#62;</strong><p class="vb-md-p">&#60;b&#62;x&#60;/b&#62;</p></div>');
  assert.equal(on('### <script>x</script>'), `<div class="vb-md-entry">${NAME('&#60;script&#62;x&#60;/script&#62;')}</div>`);
  assert.match(on('**A *b* c**: d'), /<strong class="vb-md-entry-name">A <em>b<\/em> c<\/strong>/, 'inline marks in a name stay');
});

test('entries off (the default) is byte for byte what it was', () => {
  const src = '### Head\ntext\n\n**Lead**: rest\n\n- **Item**: x\n- y';
  assert.equal(off(src, { entries: false }), off(src));
  assert.ok(!off(src).includes('vb-md-entry'));
});
