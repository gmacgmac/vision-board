// Word's numbers (VERIFY_01 F3): worked out from `w:start`, `w:numFmt` and `w:lvlText`, headings included, in the
// two shapes real files have: a template's multilevel list linked to heading styles, and python-docx's `List Number`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDocx } from '../src/index.ts';
import { formatNumber } from '../src/docx-numbering.ts';
import { cell, docx, para, wordXml } from './support.ts';

const lvl = (i: number, fmt: string, text: string, start: number | undefined = 1, extra = '') =>
  `<w:lvl w:ilvl="${i}">${start === undefined ? '' : `<w:start w:val="${start}"/>`}<w:numFmt w:val="${fmt}"/>${extra}<w:lvlText w:val="${text}"/></w:lvl>`;
const abstract = (id: number, ...levels: string[]) => `<w:abstractNum w:abstractNumId="${id}">${levels.join('')}</w:abstractNum>`;
const num = (id: number, of: number, inner = '') => `<w:num w:numId="${id}"><w:abstractNumId w:val="${of}"/>${inner}</w:num>`;
const numbering = (...inner: string[]) => wordXml('numbering', inner.join(''));
const numPr = (id: number, level = 0) => `<w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${id}"/></w:numPr>`;
const md = (body: string, parts: Record<string, string>) => readDocx(docx(body, parts)).markdown.split('\n\n');
const style = (id: string) => `<w:pStyle w:val="${id}"/>`;

test('a heading numbered through its style reads with its number: 2., then 2.1', () => {
  const parts = {
    'word/styles.xml': wordXml('styles', `<w:style w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr></w:style><w:style w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="1"/></w:numPr></w:pPr></w:style>`),
    'word/numbering.xml': numbering(abstract(0, lvl(0, 'decimal', '%1.'), lvl(1, 'decimal', '%1.%2')), num(1, 0)),
  };
  assert.deepEqual(md(para('Overview', style('Heading1')) + para('Network', style('Heading1')) + para('Zones', style('Heading2')) + para('Paths', style('Heading2')) + para('Later', style('Heading1')) + para('One', style('Heading2')), parts),
    ['# 1. Overview', '# 2. Network', '## 2.1 Zones', '## 2.2 Paths', '# 3. Later', '## 3.1 One']);
});

test('a style with no level takes the level its list links to it (`w:pStyle` on the `w:lvl`)', () => {
  const parts = {
    'word/styles.xml': wordXml('styles', `<w:style w:styleId="Heading1"><w:name w:val="heading 1"/><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr></w:style><w:style w:styleId="Heading2"><w:name w:val="heading 2"/><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr></w:style>`),
    'word/numbering.xml': numbering(abstract(0, lvl(0, 'decimal', '%1', 1, style('Heading1')), lvl(1, 'decimal', '%1.%2', 1, style('Heading2'))), num(1, 0)),
  };
  assert.deepEqual(md(para('A', style('Heading1')) + para('B', style('Heading2')), parts), ['# 1 A', '## 1.1 B']);
});

test('`w:start` and `w:lvlText`: (c), (d); a list starting at 5, then 5.1; I., II.; and the rest of the formats', () => {
  const parts = { 'word/numbering.xml': numbering(
    abstract(0, lvl(0, 'lowerLetter', '(%1)', 3)), abstract(1, lvl(0, 'decimal', '%1.', 5), lvl(1, 'decimal', '%1.%2')), abstract(2, lvl(0, 'upperRoman', '%1.')), abstract(3, lvl(0, 'decimalZero', '%1)')), abstract(4, lvl(0, 'upperLetter', 'Appendix %1:')), abstract(5, lvl(0, 'none', '')),
    num(1, 0), num(2, 1), num(3, 2), num(4, 3), num(5, 4), num(6, 5),
  ) };
  assert.deepEqual(md(para('Encrypt', numPr(1)) + para('Rotate', numPr(1)) + para('Five', numPr(2)) + para('Clause', numPr(2, 1)) + para('One', numPr(3)) + para('Two', numPr(3)) + para('Zero', numPr(4)) + para('Annex', numPr(5)) + para('Bare', numPr(6)), parts),
    ['(c) Encrypt', '(d) Rotate', '5. Five', '  5.1 Clause', 'I. One', 'II. Two', '01) Zero', 'Appendix A: Annex', 'Bare']);
});

test('python-docx\'s shape: numbering only on the style, by numId, `%1.`, with bullets beside it', () => {
  const parts = {
    'word/styles.xml': wordXml('styles', `<w:style w:type="paragraph" w:styleId="ListNumber"><w:name w:val="List Number"/><w:basedOn w:val="Normal"/><w:pPr><w:numPr><w:numId w:val="5"/></w:numPr></w:pPr></w:style><w:style w:type="paragraph" w:styleId="ListBullet"><w:name w:val="List Bullet"/><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr></w:style>`),
    'word/numbering.xml': numbering(abstract(8, lvl(0, 'bullet', '\uF0B7')), abstract(7, lvl(0, 'decimal', '%1.')), num(1, 8), num(5, 7)),
  };
  assert.deepEqual(md(para('First', style('ListNumber')) + para('Second', style('ListNumber')) + para('Dot', style('ListBullet')) + para('Third', style('ListNumber')), parts), ['1. First', '2. Second', '- Dot', '3. Third']);
});

test('nums on one abstractNum share a count, unless a startOverride restarts one, once', () => {
  const parts = { 'word/numbering.xml': numbering(abstract(0, lvl(0, 'decimal', '%1.')), num(1, 0), num(2, 0), num(3, 0, '<w:lvlOverride w:ilvl="0"><w:startOverride w:val="10"/></w:lvlOverride>')) };
  assert.deepEqual(md(para('a', numPr(1)) + para('b', numPr(2)) + para('c', numPr(3)) + para('d', numPr(3)) + para('e', numPr(1)), parts), ['1. a', '2. b', '10. c', '11. d', '12. e']);
});

test('a level\'s own override, a list style pointer, `isLgl`, and `lvlRestart` 0', () => {
  const parts = {
    'word/styles.xml': wordXml('styles', '<w:style w:styleId="Clauses"><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr></w:style>'),
    'word/numbering.xml': numbering(
      abstract(0, lvl(0, 'upperRoman', '%1.'), lvl(1, 'decimal', '%1.%2', 1, '<w:isLgl/>'), lvl(2, 'decimal', '%3', 1, '<w:lvlRestart w:val="0"/>')),
      '<w:abstractNum w:abstractNumId="1"><w:numStyleLink w:val="Clauses"/></w:abstractNum>',
      num(1, 0), num(2, 1), num(3, 0, `<w:lvlOverride w:ilvl="0">${lvl(0, 'lowerRoman', '[%1]', 7)}</w:lvlOverride>`),
    ),
  };
  assert.deepEqual(md(para('a', numPr(2)) + para('b', numPr(2, 1)) + para('c', numPr(2, 2)) + para('d', numPr(1)) + para('e', numPr(1, 2)) + para('f', numPr(3)), parts),
    ['I. a', '  1.1 b', '    1 c', 'II. d', '    2 e', '[iii] f']);
});

test('numbers in a table cell count too', () => {
  const parts = { 'word/numbering.xml': numbering(abstract(0, lvl(0, 'decimal', 'REQ-%1')), num(1, 0)) };
  assert.equal(md(`<w:tbl><w:tr><w:tc>${para('Log', numPr(1))}</w:tc>${cell('x')}</w:tr><w:tr><w:tc>${para('Audit', numPr(1))}</w:tc>${cell('y')}</w:tr></w:tbl>`, parts)[0]!.split('\n')[2], '| REQ-2 Audit | y |');
});

test('a hostile start, a huge level or a long text costs nothing and states no invented number; no definition is a bullet', () => {
  assert.equal(formatNumber(1e9, 'lowerLetter'), '1000000000');
  assert.equal(formatNumber(4000, 'upperRoman'), '4000');
  assert.equal(formatNumber(28, 'lowerLetter'), 'bb');
  assert.equal(formatNumber(3999, 'upperRoman'), 'MMMCMXCIX');
  const parts = { 'word/numbering.xml': numbering(abstract(0, lvl(0, 'lowerLetter', '%1.', 999_999_999_999), lvl(1, 'decimal', 'x'.repeat(100))), num(1, 0)) };
  assert.deepEqual(md(para('a', numPr(1)) + para('b', numPr(1, 1)) + para('c', numPr(9)) + para('d', numPr(1, 99)), parts), ['a. a', '  1. b', '- c', 'b. d']);
});
