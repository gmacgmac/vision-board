// An Excel file keeps its shape (D-071 ruling 2): sheets and real sizes, then address, value and formula, both.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DocumentRefused, LIMITS, readCells, readWorkbook } from '../src/index.ts';
import { rawZip, xlsx } from './support.ts';

const refusedWith = (code: string, fn: () => unknown) => assert.throws(fn, (e) => e instanceof DocumentRefused && e.code === code, code);
const SHARED = '<sst xmlns="x"><si><t>Region</t></si><si><r><t>Ri</t></r><r><t>ch</t></r><rPh sb="0" eb="1"><t>guide</t></rPh></si></sst>';
const STYLES = '<styleSheet xmlns="x"><numFmts><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/><numFmt numFmtId="165" formatCode="&quot;day&quot;0"/></numFmts><cellXfs><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/><xf numFmtId="165"/></cellXfs></styleSheet>';
const sheetData = (...rows: string[]) => `<sheetData>${rows.join('')}</sheetData>`;
const row = (r: number, ...cells: string[]) => `<row r="${r}">${cells.join('')}</row>`;
const parts = { 'xl/sharedStrings.xml': SHARED, 'xl/styles.xml': STYLES };

test('with no sheet: the sheets and their real sizes, a hidden one marked', () => {
  const file = xlsx({
    Data: `<dimension ref="A1"/>${sheetData(row(2, '<c r="B2"><v>1</v></c>', '<c r="D2"><f>B2*2</f><v>2</v></c>'), row(5, '<c r="B5" t="s"><v>0</v></c>', '<c r="C5" s="1"/>'))}`,
    Secret: sheetData(row(1, '<c r="A1"><v>9</v></c>')),
    Empty: '',
  }, { hidden: ['Secret'], parts });
  assert.deepEqual(readWorkbook(file), {
    kind: 'workbook', cut: false,
    sheets: [
      { name: 'Data', hidden: false, rows: 2, columns: 3, cells: 3, formulas: 1, used: 'B2:D5' },
      { name: 'Secret', hidden: true, rows: 1, columns: 1, cells: 1, formulas: 0, used: 'A1:A1' },
      { name: 'Empty', hidden: false, rows: 0, columns: 0, cells: 0, formulas: 0 },
    ],
  });
});

test('a wrong dimension record is not believed, and a sparse row costs one cell', () => {
  const file = xlsx({ S: `<dimension ref="A1:A1"/>${sheetData(row(1, '<c r="A1"><v>1</v></c>'), row(1048576, '<c r="XFD1048576"><v>2</v></c>'))}` });
  const started = performance.now();
  const [sheet] = readWorkbook(file).sheets;
  assert.deepEqual([sheet!.rows, sheet!.used, sheet!.cells], [2, 'A1:XFD1048576', 2]);
  assert.deepEqual(readCells(file, 'S', 'XFD1048576').cells.map((c) => c.value), [2]);
  assert.ok(performance.now() - started < 200);
});

test('a range gives each cell its address, value and formula, both, whatever the type', () => {
  const file = xlsx({ S: sheetData(row(2,
    '<c r="B2"><f>SUM(C2:D2)</f><v>7.5</v></c>', '<c r="C2" t="s"><v>0</v></c>', '<c r="D2" t="s"><v>1</v></c>', '<c r="E2" t="b"><v>1</v></c>',
    '<c r="F2" t="e"><f>1/0</f><v>#DIV/0!</v></c>', '<c r="G2" t="str"><f>"a"&amp;"b"</f><v>ab</v></c>', '<c r="H2" t="inlineStr"><is><t>in</t></is></c>',
  ), row(30, '<c r="B30"><v>1</v></c>')) }, { parts });
  assert.deepEqual(readCells(file, 'S', 'B2:H20'), {
    kind: 'sheet', sheet: 'S', range: 'B2:H20', merged: [],
    cells: [
      { address: 'B2', type: 'number', value: 7.5, formula: 'SUM(C2:D2)' },
      { address: 'C2', type: 'text', value: 'Region' },
      { address: 'D2', type: 'text', value: 'Rich' },
      { address: 'E2', type: 'boolean', value: true },
      { address: 'F2', type: 'error', value: '#DIV/0!', formula: '1/0' },
      { address: 'G2', type: 'text', value: 'ab', formula: '"a"&"b"' },
      { address: 'H2', type: 'text', value: 'in' },
    ],
  });
});

test('a date reads as a date, by built-in or own format, and keeps its number; a number in a format with words stays one', () => {
  const file = xlsx({ S: sheetData(row(1, '<c r="A1" s="1"><v>46325</v></c>', '<c r="B1" s="2"><v>46325.5</v></c>', '<c r="C1" s="3"><v>46325</v></c>', '<c r="D1" s="1"><v>1E+300</v></c>', '<c r="E1" s="1"><v>59</v></c>', '<c r="F1" s="1"><v>61</v></c>', '<c r="G1" s="2"><v>0.5</v></c>')) }, { parts });
  assert.deepEqual(readCells(file, 'S', 'A1:G1').cells.map((c) => [c.type, c.value, c.serial]), [
    ['date', '2026-10-30', 46325], ['date', '2026-10-30T12:00:00', 46325.5], ['number', 46325, undefined], ['number', 1e300, undefined],
    ['date', '1900-02-28', 59], ['date', '1900-03-01', 61], ['date', '12:00:00', 0.5],
  ]);
  const y1904 = xlsx({ S: sheetData(row(1, '<c r="A1" s="1"><v>1</v></c>')) }, { parts, pr: '<workbookPr date1904="1"/>' });
  assert.equal(readCells(y1904, 'S', 'A1').cells[0]!.value, '1904-01-02');
});

test('a merged cell says which range it stands in, and the ranges that touch the range are listed', () => {
  const file = xlsx({ S: `${sheetData(row(1, '<c r="A1"><v>1</v></c>', '<c r="C1"><v>2</v></c>'))}<mergeCells count="2"><mergeCell ref="A1:B2"/><mergeCell ref="X9:Y9"/><mergeCell ref="bad"/></mergeCells>` });
  const read = readCells(file, 'S', 'A1:C1');
  assert.deepEqual(read.merged, ['A1:B2']);
  assert.deepEqual(read.cells.map((c) => [c.address, c.merged]), [['A1', 'A1:B2'], ['C1', undefined]]);
});

test('a shared formula is given to each cell it covers, moved to that cell', () => {
  const file = xlsx({ S: sheetData(row(1, '<c r="C1"><f t="shared" ref="C1:C3" si="0">A1+$B$1+SUM(A:A)+"A1"+LOG10(A1)</f><v>1</v></c>'), row(2, '<c r="C2"><f t="shared" si="0"/><v>2</v></c>'), row(3, '<c r="D3"><f t="shared" si="0"/><v>3</v></c>')) });
  assert.deepEqual(readCells(file, 'S', 'C1:D3').cells.map((c) => c.formula), ['A1+$B$1+SUM(A:A)+"A1"+LOG10(A1)', 'A2+$B$1+SUM(A:A)+"A1"+LOG10(A2)', 'B3+$B$1+SUM(B:B)+"A1"+LOG10(B3)']);
});

test('a range past the cap says it cut and where to go on, and going on reaches the rest', () => {
  const rows = Array.from({ length: 5 }, (_, i) => row(i + 1, `<c r="A${i + 1}"><v>${i}</v></c>`, `<c r="B${i + 1}"><v>${i}</v></c>`));
  const file = xlsx({ S: sheetData(...rows) });
  const limits = { ...LIMITS, cells: 3 };
  const first = readCells(file, 'S', 'A1:B5', limits);
  assert.equal(first.cells.length, 3);
  assert.deepEqual(first.cut, { shown: 3, next: 'A2:B5' });
  const next = readCells(file, 'S', first.cut!.next, limits);
  assert.deepEqual(next.cells.map((c) => c.address), ['A2', 'B2', 'A3']);
  assert.equal(readCells(file, 'S', 'A1:B1', limits).cut, undefined);
});

test('long text is cut: one cell says so, and characters count toward the cap', () => {
  const long = 'x'.repeat(100);
  const file = xlsx({ S: sheetData(row(1, `<c r="A1" t="inlineStr"><is><t>${long}</t></is></c>`, '<c r="B1"><v>1</v></c>')) });
  const cut = readCells(file, 'S', 'A1:B1', { ...LIMITS, cellChars: 10 });
  assert.deepEqual([cut.cells[0]!.value, cut.cells[0]!.truncated], ['x'.repeat(10), true]);
  assert.deepEqual(readCells(file, 'S', 'A1:B1', { ...LIMITS, sheetChars: 50 }).cut, { shown: 0, next: 'A1:B1' });
});

test('a sheet asked for by name, in either case; a sheet or range that is not there is refused', () => {
  const file = xlsx({ Plan: sheetData(row(1, '<c r="A1"><v>1</v></c>')) });
  assert.equal(readCells(file, 'plan', 'A1').sheet, 'Plan');
  refusedWith('noSheet', () => readCells(file, 'Nope', 'A1'));
  for (const bad of ['', 'A', 'A1:', ':A1', 'A1:B2:C3', 'XFE1', 'A1048577', 'A0', '1:2', 'SUM(A1)']) refusedWith('badRange', () => readCells(file, 'Plan', bad));
});

test('a cell address that is none, or a shared string that is not there, is refused; cells with no address are counted in place', () => {
  refusedWith('malformed', () => readWorkbook(xlsx({ S: sheetData(row(1, '<c r="ZZZZ1"><v>1</v></c>')) })));
  refusedWith('malformed', () => readWorkbook(xlsx({ S: sheetData(row(1, '<c r="A1" t="s"><v>5</v></c>')) })));
  const noAddress = xlsx({ S: sheetData('<row><c><v>1</v></c><c><v>2</v></c></row>', '<row><c><v>3</v></c></row>') });
  assert.deepEqual(readCells(noAddress, 'S', undefined).cells.map((c) => c.address), ['A1', 'B1', 'A2']);
});

test('a hostile sheet name is cut, so one attribute can\'t fill the answer', () => {
  const name = 'n'.repeat(100);
  const [sheet] = readWorkbook(xlsx({ [name]: '' }), { ...LIMITS, cellChars: 10 }).sheets;
  assert.equal(sheet!.name, 'n'.repeat(10));
});

test('no workbook part, or a DOCTYPE in a sheet: refused', () => {
  refusedWith('notDocument', () => readWorkbook(rawZip([{ name: 'a.txt', data: 'x' }])));
  const hostile = xlsx({ S: '' }, { parts: { 'xl/sharedStrings.xml': '<!DOCTYPE a [<!ENTITY x "y">]><sst/>' } });
  refusedWith('xmlDoctype', () => readCells(hostile, 'S', undefined));
});
