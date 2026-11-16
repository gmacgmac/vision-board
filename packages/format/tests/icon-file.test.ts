// The icon library's one check (icon-file.ts; api.md 185; ledger review § 4 O4): a hostile corpus of files and path
// data, each refused with its reason, and the fixed form round-tripping. The same check runs on add (the server's
// reducer, apps/board/tests/icon-library.test.ts) and on every read, so a file that arrives by hand, git or a sync is
// held to it too.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ICON_BOX, ICON_LIMITS, iconFileProblem, iconFileText, iconPathProblem, iconPathsOf, iconTitleProblem } from '../src/icon-file.ts';

const OPEN = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_BOX} ${ICON_BOX}">`;
const GOOD = 'M4 6h16v12H4z';
/** A file in the fixed form, with `inner` in place of its paths. */
const file = (inner: string): string => `${OPEN}${inner}</svg>\n`;

test('icon-file.ts is pure string logic: no Node, no DOM (the page and the server both run it)', () => {
  const code = fs.readFileSync(new URL('../src/icon-file.ts', import.meta.url), 'utf8')
    .split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n');
  assert.doesNotMatch(code, /\b(Buffer|process|require|document|window|globalThis|fetch|DOMParser)\b|node:/);
  assert.deepEqual([...code.matchAll(/from '([^']+)'/g)].map((m) => m[1]), ['./ledger-shape.ts', './words/format-icons.ts']);
});

test('the fixed form round-trips: what iconFileText writes, iconPathsOf reads back', () => {
  const text = iconFileText([GOOD, 'M8 10h8M8 14h5'], 'A video encoder & its <output>');
  assert.equal(iconFileProblem(text), undefined);
  assert.deepEqual(iconPathsOf(text), { paths: [GOOD, 'M8 10h8M8 14h5'], title: 'A video encoder & its <output>' });
  assert.deepEqual(iconPathsOf(iconFileText([GOOD])), { paths: [GOOD] }, 'no title');
  assert.ok(text.endsWith('</svg>\n') && !text.slice(0, -1).includes('\n'), 'one line');
  const most = iconFileText(Array(ICON_LIMITS.paths).fill(`M0 0${' '.repeat(ICON_LIMITS.pathChars - 4)}`), '&'.repeat(ICON_LIMITS.titleChars));
  assert.equal(iconFileProblem(most), undefined, 'every limit at its most');
  assert.ok(most.length <= ICON_LIMITS.fileChars && most.length > ICON_LIMITS.fileChars - 100, 'fileChars is the fixed form at every limit, with a little room');
});

test('path data: only the grammar passes, and each refusal says what was found', () => {
  for (const d of [GOOD, 'm1.5.5-2,3e1l.1 .2', 'M12 2a10 10 0 1 1 0 20a10 10 0 1 1 0-20z', 'M0 0C1 2 3 4 5 6s1 1 2 2q1 1 2 2t3 3Z', 'M-1000 1000']) {
    assert.equal(iconPathProblem(d), undefined, d);
  }
  const refused: [string, RegExp][] = [
    ['', /empty/],
    ['   ', /empty/],
    ['L4 4', /start with M/],
    ['M0 0 url(#a)', /"u" \(U\+0075\)/],
    ['M0 0"/><script>', /"\\"" \(U\+0022\)/],
    ["M0 0'", /"'" \(U\+0027\)/],
    ['M0 0 М1 1', /U\+041C/], // a Cyrillic capital Em, the look-alike of M
    ['M0 0 е', /U\+0435/], // a Cyrillic small ie, the look-alike of e
    ['M0 0\tL1 1', /U\+0009/],
    ['M0 0\nL1 1', /U\+000A/],
    ['M1e999 0', /number 1e999/],
    ['M1e4 0', /number 1e4/],
    ['M1001 0', /number 1001/],
    ['M0 0 e', /"e" at character 6/],
    ['M0 0 --1', /"--1"/],
    [`M0 0${' '.repeat(ICON_LIMITS.pathChars - 3)}`, new RegExp(`${ICON_LIMITS.pathChars + 1} characters long`)],
  ];
  for (const [d, why] of refused) assert.match(iconPathProblem(d) ?? 'passed', why, JSON.stringify(d));
});

/** Hostile files, each refused on read with a reason that names what was found. Every one is a file someone could
 * drop into `.visionboard/icons/` by hand. */
const HOSTILE: [string, string, RegExp][] = [
  ['script', file(`<path d="${GOOD}"/><script>alert(1)</script>`), /element "script"/],
  ['an on* attribute', file(`<path d="${GOOD}" onclick="alert(1)"/>`), /attribute "onclick" on path/],
  ['onload on the svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" onload="alert(1)"><path d="${GOOD}"/></svg>\n`, /attribute "onload" on svg/],
  ['a style element', file(`<style>path{fill:url(//x)}</style><path d="${GOOD}"/>`), /element "style"/],
  ['a style attribute', file(`<path d="${GOOD}" style="fill:red"/>`), /attribute "style" on path/],
  ['use with href', file(`<use href="#a"/><path d="${GOOD}"/>`), /element "use"/],
  ['xlink:href', file(`<path d="${GOOD}" xlink:href="javascript:alert(1)"/>`), /attribute "xlink:href"/],
  ['an image', file(`<image href="https://example.invalid/x.png"/><path d="${GOOD}"/>`), /element "image"/],
  ['foreignObject', file(`<foreignObject><div>hi</div></foreignObject><path d="${GOOD}"/>`), /element "foreignObject"/],
  ['text', file(`<text>Encoder</text><path d="${GOOD}"/>`), /element "text"/],
  ['a gradient', file(`<linearGradient id="g"/><path d="${GOOD}"/>`), /element "linearGradient"/],
  ['a pattern', file(`<pattern id="p"/><path d="${GOOD}"/>`), /element "pattern"/],
  ['a filter', file(`<filter id="f"/><path d="${GOOD}"/>`), /element "filter"/],
  ['a transform', file(`<path d="${GOOD}" transform="scale(9)"/>`), /attribute "transform" on path/],
  ['a DOCTYPE with an entity', `<!DOCTYPE svg [<!ENTITY x "y">]>\n${file(`<path d="${GOOD}"/>`)}`, /"<!DOCTYPE"/],
  ['an entity in the title', file(`<title>&x;</title><path d="${GOOD}"/>`), /not in the form/],
  ['a numeric reference in the title', file(`<title>&#60;script&#62;</title><path d="${GOOD}"/>`), /not in the form/],
  ['CDATA', file(`<![CDATA[<script>alert(1)</script>]]><path d="${GOOD}"/>`), /"<!\[CDATA\["/],
  ['a comment', file(`<!-- hi --><path d="${GOOD}"/>`), /"<!--"/],
  ['an XML declaration', `<?xml version="1.0"?>${file(`<path d="${GOOD}"/>`)}`, /"<\?xml"/],
  ['a d holding url(', file('<path d="M0 0 url(#a)"/>'), /path 1: .*"u" \(U\+0075\)/],
  ['a d holding a quote, single-quoted', `${OPEN}<path d='M0 0"'/></svg>\n`, /not in the form/],
  ['a look-alike letter', file('<path d="М0 0h4"/>'), /path 1: .*U\+041C/],
  ['a number in exponent form past sane size', file('<path d="M1e308 0"/>'), /path 1: .*number 1e308/],
  ['a nested svg', file(`<svg><path d="${GOOD}"/></svg>`), /not in the form/],
  ['a byte-order mark', `﻿${file(`<path d="${GOOD}"/>`)}`, /byte-order mark/],
  ['CRLF', `${OPEN}<path d="${GOOD}"/></svg>\r\n`, /carriage return/],
  ['another box', file(`<path d="${GOOD}"/>`).replace('0 0 24 24', '0 0 48 48'), /not in the form/],
  ['a width', file(`<path d="${GOOD}"/>`).replace('<svg ', '<svg width="24" '), /attribute "width" on svg/],
  ['an empty d', file('<path d=""/>'), /not in the form|path 1: .*empty/],
  ['no path', file('<title>Nothing</title>'), /not in the form/],
  ['no closing newline', file(`<path d="${GOOD}"/>`).slice(0, -1), /not in the form/],
  ['two lines', file(`<path d="${GOOD}"/>\n<path d="${GOOD}"/>`), /not in the form/],
  ['a bidi override in the title', file(`<title>abc‮def</title><path d="${GOOD}"/>`), /not in the form/],
  ['a control character in the title', file(`<title>a\u0007b</title><path d="${GOOD}"/>`), /not in the form/],
  ['a path one character over', iconFileText([`M0 0${' '.repeat(ICON_LIMITS.pathChars - 3)}`]), new RegExp(`path 1: .*${ICON_LIMITS.pathChars + 1} characters`)],
  ['one path over', iconFileText(Array(ICON_LIMITS.paths + 1).fill(GOOD)), new RegExp(`${ICON_LIMITS.paths + 1} paths`)],
  ['a title one character over', iconFileText([GOOD], 'a'.repeat(ICON_LIMITS.titleChars + 1)), new RegExp(`${ICON_LIMITS.titleChars + 1} characters`)],
  ['a file one character over', `${'x'.repeat(ICON_LIMITS.fileChars + 1)}`, new RegExp(`${ICON_LIMITS.fileChars + 1} characters`)],
];

test('every hostile file is refused with its reason, and none gives a path', () => {
  for (const [what, text, why] of HOSTILE) {
    assert.match(iconFileProblem(text) ?? 'passed', why, what);
    assert.equal(iconPathsOf(text), undefined, what);
  }
});

test('the reasons are sentences from the words file, never the file\'s raw text', () => {
  const long = file(`<${'a'.repeat(500)}/><path d="${GOOD}"/>`);
  assert.ok((iconFileProblem(long) ?? '').length < 200, 'a found name is clipped');
});

test('a title: a few words, shown as text, with no control character or invisible mark', () => {
  assert.equal(iconTitleProblem('An encoder & its <output>'), undefined);
  assert.equal(iconTitleProblem('é'.repeat(ICON_LIMITS.titleChars)), undefined, 'counted in characters');
  assert.match(iconTitleProblem(' ') ?? 'passed', /empty/);
  assert.match(iconTitleProblem('a'.repeat(ICON_LIMITS.titleChars + 1)) ?? 'passed', /81 characters/);
  for (const ch of ['\u0000', '\n', '‮', '​', '⁦', '﻿']) assert.match(iconTitleProblem(`a${ch}b`) ?? 'passed', /U\+/, JSON.stringify(ch));
});
