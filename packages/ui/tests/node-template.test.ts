// The node's markup (node-template.ts): one pure function from a node to its markup, escaping what the agent wrote,
// with no inline style; the number and the kind on the top border before the content; the body as Markdown. The marks
// themselves are node-edges.test.ts's, an app window node-window.test.ts's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '#format';
import { KINDS } from '#format';
import { esc, KIND_ICON, nodeTemplate } from '../src/index.ts';

const node = (f: Partial<ViewNode>): ViewNode =>
  ({ id: '1', region: 'r', kind: 'question', title: 'T', ...f });

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
  assert.match(nodeTemplate(node({ n: 41 })), /class="vb-mark vb-node-num" data-mark="number"[^>]*>41<\/button>/);
  assert.doesNotMatch(nodeTemplate(node({ kind: 'topic' })), /vb-node-num/);
});

test('nodeTemplate carries no inline style and no style element (the CSP refuses them)', () => {
  for (const kind of KINDS) assert.doesNotMatch(nodeTemplate(node({ kind, n: 1, body: 'b', tags: ['t'] })), /style=|<style/, kind);
});

test('nodeTemplate puts the number and the kind on the top border, before the content, and no footer', () => {
  const html = nodeTemplate(node({ n: 41, kind: 'risk' }));
  assert.match(html, /^<button type="button" class="vb-mark vb-node-num"[^>]*>41<\/button><span class="vb-node-kind">Risk<\/span>/);
  assert.ok(html.indexOf('vb-node-kind') < html.indexOf('vb-node-content'));
  for (const kind of KINDS) assert.doesNotMatch(nodeTemplate(node({ kind, n: 3 })), /<footer|data-act=/, kind);
});

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
