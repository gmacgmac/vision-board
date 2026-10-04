import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '../../format/src/index.ts';
import { KINDS } from '../../format/src/index.ts';
import { esc, KIND_ICON, nodeTemplate, offers } from '../src/index.ts';

const node = (f: Partial<ViewNode>): ViewNode =>
  ({ id: '1', region: 'r', kind: 'question', title: 'T', ...f });

const acts = (html: string): string[] => [...html.matchAll(/data-act="(\w+)"/g)].map((m) => m[1]!);

test('esc escapes the five HTML-significant characters', () =>
  assert.equal(esc(`<a href="x">'&'</a>`), '&#60;a href=&#34;x&#34;&#62;&#39;&#38;&#39;&#60;/a&#62;'));

test('nodeTemplate escapes title, body and tags', () => {
  const html = nodeTemplate(node({ n: 1, title: '<b>t</b>', body: 'a & "b"', tags: ['<i>'] }));
  assert.ok(!html.includes('<b>') && !html.includes('<i>'), 'no raw markup from data');
  assert.ok(html.includes('&#60;b&#62;t&#60;/b&#62;'));
  assert.ok(html.includes('a &#38; &#34;b&#34;'));
  assert.ok(html.includes('<li>&#60;i&#62;</li>'));
});

test('nodeTemplate shows the number only on items', () => {
  assert.match(nodeTemplate(node({ n: 41 })), /<span class="vb-node-num" aria-hidden="true">41<\/span>/);
  assert.doesNotMatch(nodeTemplate(node({ kind: 'topic' })), /vb-node-num/);
});

test('nodeTemplate draws one button per offered action, in order, for every kind', () => {
  for (const kind of KINDS) {
    for (const n of [node({ kind, n: 3 }), node({ kind })]) {
      const html = nodeTemplate(n);
      assert.deepEqual(acts(html), offers(n), `${kind}${n.n ? ' item' : ''}`);
      assert.equal(html.includes('vb-node-actions'), offers(n).length > 0, `${kind} toolbar`);
    }
  }
});

test('nodeTemplate carries no inline style and no style element (the CSP refuses them)', () => {
  const html = nodeTemplate(node({ n: 1, body: 'b', tags: ['t'] }));
  assert.doesNotMatch(html, /style=|<style/);
});

test('nodeTemplate puts number, kind and pin on the top border, before the content', () => {
  const html = nodeTemplate(node({ n: 41, kind: 'risk' }));
  assert.match(html, /^<span class="vb-node-num"[^>]*>41<\/span><span class="vb-node-kind">Risk<\/span><span class="vb-node-pin"/);
  assert.ok(html.indexOf('vb-node-pin') < html.indexOf('vb-node-content'));
});

test('nodeTemplate draws the footer on items only: kind icon, divider, state word, then buttons', () => {
  for (const kind of KINDS) {
    const item = nodeTemplate(node({ kind, n: 3 }));
    assert.match(item, new RegExp(`<footer class="vb-node-foot">.*${KIND_ICON[kind].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
      + '.*vb-node-sep.*vb-node-status.*</span></span>(<div class="vb-node-actions"|</footer>)'), kind);
    assert.doesNotMatch(nodeTemplate(node({ kind })), /vb-node-foot|vb-node-status/, `${kind} non-item`);
  }
});

test('nodeTemplate draws the note block hidden, with who and text parts for update() to fill', () =>
  assert.match(nodeTemplate(node({ n: 1 })),
    /<div class="vb-node-notes" hidden><span class="vb-node-note-who"><\/span><span class="vb-node-note-text"><\/span><\/div>/));

test('KIND_ICON has a drawing for every kind', () => {
  for (const kind of KINDS) assert.match(KIND_ICON[kind], /^<(path|circle) /, kind);
});

test('nodeTemplate renders the body as Markdown in div.vb-node-body (D-023)', () => {
  const html = nodeTemplate(node({ n: 1, body: '### Options\n\n- **One**\n- Two' }));
  assert.match(html, /<div class="vb-node-body"><span class="vb-md-label" role="heading" aria-level="4">Options<\/span>/);
  assert.match(html, /<ul class="vb-md-list"><li><strong>One<\/strong><\/li><li>Two<\/li><\/ul><\/div>/);
});

test('nodeTemplate escapes raw HTML in a Markdown body', () => {
  const html = nodeTemplate(node({ n: 1, body: 'a <b>bold</b> claim' }));
  assert.ok(html.includes('<div class="vb-node-body"><p class="vb-md-p">a &#60;b&#62;bold&#60;/b&#62; claim</p></div>'));
  assert.ok(!html.includes('<b>'));
});
