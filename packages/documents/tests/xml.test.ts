// The XML reader (D-071): events and a tree for what a writer really sends, and a refusal, at once, for what a hostile file sends.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DocumentRefused, LIMITS, decodeXml, xmlEvents, xmlTree } from '../src/index.ts';

const refusedWith = (code: string, fn: () => unknown) => assert.throws(fn, (e) => e instanceof DocumentRefused && e.code === code);
const all = (text: string) => [...xmlEvents(text)];

test('elements lose their prefix, attributes and references are read, CDATA is text, comments are skipped', () => {
  const tree = xmlTree('<?xml version="1.0"?><!-- a --><w:p xmlns:w="x" w:val="a&amp;b"><w:t>1 &lt; 2 &#65;&#x42;</w:t><w:t><![CDATA[<raw>]]></w:t><br/></w:p>');
  assert.equal(tree.name, 'p');
  assert.deepEqual({ ...tree.attrs }, { val: 'a&b' });
  assert.deepEqual(tree.children.map((c) => (typeof c === 'string' ? c : `${c.name}:${c.children.join('')}`)), ['t:1 < 2 AB', 't:<raw>', 'br:']);
});

test('a DOCTYPE is refused, in any case, wherever it stands, and no entity is ever declared', () => {
  refusedWith('xmlDoctype', () => all('<!DOCTYPE a><a/>'));
  refusedWith('xmlDoctype', () => all('<!doctype a><a/>'));
  refusedWith('xmlDoctype', () => all('<a><!ENTITY x "y"></a>'));
  refusedWith('xmlMalformed', () => all('<a>&x;</a>'));
});

test('a billion-laughs file ends at once, at its DOCTYPE', () => {
  const lol = Array.from({ length: 9 }, (_, i) => `<!ENTITY l${i + 1} "${`&l${i};`.repeat(10)}">`).join('');
  const started = performance.now();
  refusedWith('xmlDoctype', () => all(`<?xml version="1.0"?><!DOCTYPE lolz [<!ENTITY l0 "lol">${lol}]><lolz>&l9;</lolz>`));
  assert.ok(performance.now() - started < 100);
});

test('a deep nest ends at the limit, an element flood at its limit, and many attributes at theirs', () => {
  refusedWith('xmlLimit', () => all('<a>'.repeat(LIMITS.xmlDepth + 1)));
  refusedWith('xmlLimit', () => [...xmlEvents(`<r>${'<a/>'.repeat(11)}</r>`, { ...LIMITS, xmlNodes: 10 })]);
  refusedWith('xmlLimit', () => [...xmlEvents(`<a ${Array.from({ length: 4 }, (_, i) => `b${i}="1"`).join(' ')}/>`, { ...LIMITS, xmlAttributes: 3 })]);
});

test('what does not balance or close is refused: never half read', () => {
  for (const bad of ['', 'text', '<a>', '<a></b>', '</a>', '<a/><b/>', '<a b=1/>', '<a b="1/>', '<a b="<"/>', '<a>&#0;</a>', '<a>&#xD800;</a>', '<a>&#x110000;</a>', '<a>&amp</a>', '<!-- <a/>', '<a><![CDATA[x</a>', '<? <a/>']) {
    refusedWith('xmlMalformed', () => all(bad));
  }
});

test('a hostile pile of `&` or `<` costs one pass', () => {
  const started = performance.now();
  refusedWith('xmlMalformed', () => all(`<a>${'&'.repeat(5_000_000)}</a>`));
  refusedWith('xmlMalformed', () => all(`<a b="${'x'.repeat(5_000_000)}`));
  assert.ok(performance.now() - started < 1000);
});

test('`__proto__` is only a name, and UTF-8 and UTF-16 are told by their bytes', () => {
  const tree = xmlTree('<a __proto__="x" constructor="y"/>');
  assert.equal(tree.attrs['__proto__'], 'x');
  assert.equal(({} as Record<string, unknown>)['x'], undefined);
  assert.equal(decodeXml(new TextEncoder().encode('<a/>')), '<a/>');
  assert.equal(decodeXml(new Uint8Array([0xff, 0xfe, 0x3c, 0, 0x61, 0, 0x2f, 0, 0x3e, 0])), '<a/>');
  refusedWith('xmlMalformed', () => decodeXml(new Uint8Array([0x3c, 0xff, 0x3e])));
});
