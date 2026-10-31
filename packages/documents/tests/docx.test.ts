// A Word file as Markdown (D-071 ruling 2; PLAN ruling 3): what a writer really sends, built in the test, and what a hostile one sends.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DocumentRefused, LIMITS, readDocx } from '../src/index.ts';
import { cell, docx, para, rawZip, rels, wordXml } from './support.ts';

const refusedWith = (code: string, fn: () => unknown) => assert.throws(fn, (e) => e instanceof DocumentRefused && e.code === code, code);
const md = (body: string, parts = {}) => readDocx(docx(body, parts)).markdown;

const STYLES = wordXml('styles', '<w:style w:styleId="Heading1"><w:name w:val="heading 1"/></w:style><w:style w:styleId="berschrift2"><w:name w:val="heading 2"/></w:style><w:style w:styleId="Custom"><w:basedOn w:val="berschrift2"/></w:style><w:style w:styleId="Loop"><w:basedOn w:val="Loop"/></w:style><w:style w:styleId="ListBullet"><w:pPr><w:numPr><w:numId w:val="7"/></w:numPr></w:pPr></w:style>');
const NUMBERING = wordXml('numbering', '<w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:numFmt w:val="decimal"/></w:lvl><w:lvl w:ilvl="1"><w:numFmt w:val="lowerLetter"/></w:lvl></w:abstractNum><w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:numFmt w:val="bullet"/></w:lvl></w:abstractNum><w:num w:numId="5"><w:abstractNumId w:val="0"/></w:num><w:num w:numId="7"><w:abstractNumId w:val="1"/></w:num>');
const parts = { 'word/styles.xml': STYLES, 'word/numbering.xml': NUMBERING };
const numbered = (id: string, level = 0) => `<w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="${id}"/></w:numPr>`;

test('headings come from the style, by id or by name, and through what it is based on', () => {
  const out = md(para('One', '<w:pStyle w:val="Heading1"/>') + para('Two', '<w:pStyle w:val="berschrift2"/>') + para('Three', '<w:pStyle w:val="Custom"/>') + para('Plain', '<w:pStyle w:val="Loop"/>') + para('Body'), parts);
  assert.equal(out, '# One\n\n## Two\n\n## Three\n\nPlain\n\nBody');
});

test('lists: bullets, numbers counted per level, numbering from the style, and 0 cancels it', () => {
  const out = md(para('a', `${numbered('7')}`) + para('first', numbered('5')) + para('sub', numbered('5', 1)) + para('sub2', numbered('5', 1)) + para('second', numbered('5')) + para('sub3', numbered('5', 1)) + para('styled', '<w:pStyle w:val="ListBullet"/>') + para('cancelled', `<w:pStyle w:val="ListBullet"/>${numbered('0')}`), parts);
  assert.equal(out, ['- a', '1. first', '  a. sub', '  b. sub2', '2. second', '  a. sub3', '- styled', 'cancelled'].join('\n\n'));
});

test('a table reads as Markdown; gridSpan and vMerge repeat the merged text in every place it covers', () => {
  const tr = (...cells: string[]) => `<w:tr>${cells.join('')}</w:tr>`;
  const out = md(`<w:tbl>${tr(cell('Region', '<w:vMerge w:val="restart"/>'), cell('Plan', '<w:gridSpan w:val="2"/>'))}${tr(cell('', '<w:vMerge/>'), cell('A'), cell('B | C'))}</w:tbl>`);
  assert.equal(out, ['| Region | Plan | Plan |', '| --- | --- | --- |', '| Region | A | B \\| C |'].join('\n'));
});

test('a row in a content control, a nested table, and a line break in a cell all read', () => {
  const inner = `<w:tbl><w:tr>${cell('nested')}</w:tr></w:tbl>`;
  const out = md(`<w:tbl><w:sdt><w:sdtContent><w:tr><w:tc><w:p><w:r><w:t>a</w:t><w:br/><w:t>b</w:t></w:r></w:p>${inner}</w:tc></w:tr></w:sdtContent></w:sdt></w:tbl>`);
  assert.match(out, /\| a<br>b<br>nested \|/);
});

test('deleted text and fallbacks are left out, inserted text and content controls are read', () => {
  const out = md('<w:sdt><w:sdtContent><w:p><w:ins><w:r><w:t>kept</w:t></w:r></w:ins><w:del><w:r><w:delText>gone</w:delText></w:r></w:del><mc:AlternateContent xmlns:mc="m"><mc:Choice><w:r><w:t> once</w:t></w:r></mc:Choice><mc:Fallback><w:r><w:t> twice</w:t></w:r></mc:Fallback></mc:AlternateContent></w:p></w:sdtContent></w:sdt>');
  assert.equal(out, 'kept once');
});

test('a picture comes back as bytes with a new name and its marker stands where it stood; once per picture', () => {
  const drawing = '<w:p><w:r><w:t>See </w:t><w:drawing><wp:inline xmlns:wp="p"><wp:docPr id="1" descr="The [network]"/><a:graphic><a:blip r:embed="rId4"/></a:graphic></wp:inline></w:drawing></w:r></w:p>';
  const image = new Uint8Array([1, 2, 3, 4]);
  const { markdown, pictures } = readDocx(docx(drawing + drawing, { 'word/_rels/document.xml.rels': rels([{ id: 'rId4', target: 'media/../media/evil name.PNG' }]), 'word/media/evil name.png': image }));
  assert.equal(markdown, 'See ![The network](picture-1.png)\n\nSee ![The network](picture-1.png)');
  assert.deepEqual(pictures.map((p) => [p.name, [...p.bytes]]), [['picture-1.png', [1, 2, 3, 4]]]);
});

test('a relationship that climbs out or goes outside is never followed, and past the limit a picture says it cut', () => {
  const pic = (id: string) => `<w:p><w:r><w:drawing><a:blip r:embed="${id}"/></w:drawing></w:r></w:p>`;
  const rel = { 'word/_rels/document.xml.rels': rels([{ id: 'out', target: '../../../../etc/passwd' }, { id: 'web', target: 'https://example.invalid/x.png', external: true }, { id: 'a', target: 'media/a.png' }, { id: 'b', target: 'media/b.exe' }]), 'word/media/a.png': new Uint8Array([1]), 'word/media/b.exe': new Uint8Array([2]) };
  const read = readDocx(docx(pic('out') + pic('web') + pic('a') + pic('b'), rel));
  assert.deepEqual(read.pictures.map((p) => p.name), ['picture-1.png', 'picture-2.bin']);
  const capped = readDocx(docx(pic('a') + pic('b'), rel), { ...LIMITS, pictures: 1 });
  assert.deepEqual([capped.pictures.length, capped.cut], [1, true]);
});

test('over the budget it stops at a whole unit and says so; a hostile span is cut to the columns, never allocated', () => {
  const long = readDocx(docx(para('12345') + para('67890') + para('never')), { ...LIMITS, markdownChars: 8 });
  assert.deepEqual([long.markdown, long.cut], ['12345', true]);
  const span = readDocx(docx(`<w:tbl><w:tr>${cell('x', '<w:gridSpan w:val="1000000000"/>')}</w:tr></w:tbl>`), { ...LIMITS, tableColumns: 3 });
  assert.equal(span.markdown.split('\n')[0], '| x | x | x |');
  assert.equal(span.cut, true);
});

test('parts this reader leaves out are named; the words of a body are not lost to them', () => {
  const read = readDocx(docx(para('Body'), { 'word/header1.xml': '<x/>', 'word/comments.xml': '<x/>', 'word/footnotes.xml': '<x/>' }));
  assert.deepEqual(read.notRead, ['headers', 'footnotes', 'comments']);
});

test('no document part, a DOCTYPE, an encrypted or plain file: refused', () => {
  refusedWith('notDocument', () => readDocx(rawZip([{ name: 'a.txt', data: 'x' }])));
  refusedWith('xmlDoctype', () => readDocx(rawZip([{ name: 'word/document.xml', data: '<!DOCTYPE x [<!ENTITY a "b">]><x>&a;</x>' }])));
  refusedWith('encrypted', () => readDocx(rawZip([{ name: 'word/document.xml', data: '<x/>', flags: 0x0801 }])));
  refusedWith('notZip', () => readDocx(new TextEncoder().encode('not an archive, but long enough to hold an end record')));
});

test('the main part is the one the package names, inside the archive', () => {
  const entries = [{ name: '_rels/.rels', data: `<Relationships><Relationship Id="1" Type="x/officeDocument" Target="/custom/main.xml"/></Relationships>` }, { name: 'custom/main.xml', data: '<d><body><p><r><t>Named</t></r></p></body></d>' }];
  assert.equal(readDocx(rawZip(entries)).markdown, 'Named');
});

test('a heading or title style with no definition still reads; a list with no numbering part is bullets; empty paragraphs are not blocks', () => {
  assert.equal(md(para('T', '<w:pStyle w:val="Title"/>') + para('H', '<w:pStyle w:val="Heading_3"/>') + para('', '<w:pStyle w:val="Heading1"/>') + para('L', numbered('9'))), '# T\n\n### H\n\n- L');
});

test('sections in a content control or custom XML are read, a cell in a control is, a row with no cells does not end the table, a nested table adds no column', () => {
  assert.equal(md(`<w:customXml>${para('in xml')}</w:customXml><w:sdt><w:sdtContent>${para('in control')}</w:sdtContent></w:sdt>`), 'in xml\n\nin control');
  const nested = `<w:tc><w:tbl><w:tr>${cell('n1')}${cell('n2')}</w:tr></w:tbl><w:p/></w:tc>`;
  const out = md(`<w:tbl><w:tr><w:sdt><w:sdtContent>${cell('a')}</w:sdtContent></w:sdt>${nested}</w:tr><w:tr></w:tr><w:tr>${cell('b')}${cell('c')}</w:tr></w:tbl>`);
  assert.deepEqual(out.split('\n'), ['| a | n1  n2 |', '| --- | --- |', '|  |  |', '| b | c |']);
});

test('what fits is not reported cut; what does not stops there, with nothing past the gap', () => {
  assert.equal(readDocx(docx(para('12345'))).cut, false);
  const table = readDocx(docx(`<w:tbl><w:tr>${cell('12345')}</w:tr><w:tr>${cell('67890')}</w:tr></w:tbl>${para('after')}`), { ...LIMITS, markdownChars: 10 });
  assert.equal(table.cut, true);
  assert.doesNotMatch(table.markdown, /67890|after/);
});
