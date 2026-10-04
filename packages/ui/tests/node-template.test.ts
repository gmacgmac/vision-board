import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ViewNode } from '../../format/src/index.ts';
import { KINDS } from '../../format/src/index.ts';
import { esc, nodeTemplate, offers } from '../src/index.ts';

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
