// What a workbook holds beside its cells (VERIFY_01 F2, F4), the cap on an answer (F6), `next` moving on (F7), the list surviving a big sheet (F8), and F9's details.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITS, readCells, readWorkbook } from '../src/index.ts';
import { rels, xlsx } from './support.ts';

const sheetData = (...rows: string[]) => `<sheetData>${rows.join('')}</sheetData>`;
const row = (r: number, ...cells: string[]) => `<row r="${r}">${cells.join('')}</row>`;
const CHART = '<c:chartSpace xmlns:c="c" xmlns:a="a"><c:chart><c:title><c:tx><c:rich><a:p><a:r><a:t>Nodes by region</a:t></a:r></a:p></c:rich></c:tx></c:title><c:plotArea><c:barChart><c:ser><c:val><c:numRef><c:f>Summary!$D$4:$D$18</c:f></c:numRef></c:val></c:ser></c:barChart></c:plotArea></c:chart></c:chartSpace>';
const anchor = (col: number, r: number, inner: string) => `<xdr:twoCellAnchor><xdr:from><xdr:col>${col}</xdr:col><xdr:row>${r}</xdr:row></xdr:from>${inner}</xdr:twoCellAnchor>`;
const DRAWING = `<xdr:wsDr xmlns:xdr="x" xmlns:a="a" xmlns:r="r">${anchor(1, 1, '<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="2" name="T" descr="Portal to database"/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="i"/></xdr:blipFill></xdr:pic>')}${anchor(1, 22, '<xdr:graphicFrame><a:graphic><a:graphicData><c:chart xmlns:c="c" r:id="c"/></a:graphicData></a:graphic></xdr:graphicFrame>')}${anchor(3, 3, '<xdr:sp><xdr:nvSpPr><xdr:cNvPr id="5" name="s"/></xdr:nvSpPr><xdr:txBody><a:p><a:r><a:t>Gateway</a:t></a:r></a:p></xdr:txBody></xdr:sp>')}${anchor(4, 3, '<xdr:cxnSp><xdr:nvCxnSpPr><xdr:cNvCxnSpPr><a:stCxn id="5"/></xdr:cNvCxnSpPr></xdr:nvCxnSpPr></xdr:cxnSp>')}</xdr:wsDr>`;
const WITH_DRAWING = {
  'xl/worksheets/_rels/sheet1.xml.rels': rels([{ id: 'd', target: '../drawings/drawing1.xml' }]).replace('Type="t"', 'Type="x/drawing"'),
  'xl/drawings/drawing1.xml': DRAWING,
  'xl/drawings/_rels/drawing1.xml.rels': rels([{ id: 'i', target: '../media/image1.png' }, { id: 'c', target: '../charts/chart1.xml' }]),
  'xl/media/image1.png': 'PNGBYTES',
  'xl/charts/chart1.xml': CHART,
};

test('a sheet holding only a picture and a chart does not read as nothing: the list counts them and hands the picture over', () => {
  const read = readWorkbook(xlsx({ Topology: '' }, { parts: WITH_DRAWING }));
  assert.deepEqual(read.sheets, [{ name: 'Topology', hidden: false, rows: 0, columns: 0, cells: 0, formulas: 0, pictures: 1, charts: 1, shapes: 1 }]);
  assert.deepEqual(read.pictures.map((p) => [p.name, new TextDecoder().decode(p.bytes)]), [['picture-1.png', 'PNGBYTES']]);
});

test('the same sheet read: what each drawing is, where it sits, the words in it; a chart\'s figures come from its cells', () => {
  const read = readCells(xlsx({ Topology: '' }, { parts: WITH_DRAWING }), 'Topology', undefined);
  assert.deepEqual(read.cells, []);
  assert.deepEqual(read.drawings, [
    { kind: 'picture', at: 'B2', text: 'Portal to database', file: 'picture-1.png' },
    { kind: 'chart', at: 'B23', text: 'bar. Nodes by region. from Summary!$D$4:$D$18' },
    { kind: 'shapes', at: 'D4', text: 'Gateway. Connectors: 1 joined to nothing named' },
  ]);
});

test('an EMF on a sheet is marked as one a model can\'t be shown', () => {
  const parts = { ...WITH_DRAWING, 'xl/drawings/_rels/drawing1.xml.rels': rels([{ id: 'i', target: '../media/image1.emf' }]), 'xl/media/image1.emf': 'E' };
  assert.deepEqual(readCells(xlsx({ S: '' }, { parts }), 'S', undefined).drawings[0], { kind: 'picture', at: 'B2', text: 'Portal to database', file: 'picture-1.emf', unseeable: true });
});

test('comments come back with the range they are in; the list counts them', () => {
  const parts = {
    'xl/worksheets/_rels/sheet1.xml.rels': rels([{ id: 'c', target: '../comments1.xml' }]).replace('Type="t"', 'Type="x/comments"'),
    'xl/comments1.xml': '<comments xmlns="x"><authors><author>F</author></authors><commentList><comment ref="F20" authorId="0"><text><r><t>Uses the March</t></r><r><t> rate card</t></r></text></comment><comment ref="A1" authorId="0"><text><t>Far away</t></text></comment></commentList></comments>',
  };
  const file = xlsx({ S: sheetData(row(20, '<c r="F20"><v>1</v></c>')) }, { parts });
  assert.deepEqual(readCells(file, 'S', 'F20').comments, [{ address: 'F20', text: 'Uses the March rate card' }]);
  assert.equal(readWorkbook(file).sheets[0]!.comments, 2);
});

test('defined names in the workbook answer, so `TaxRate` can be looked up; Excel\'s own are left out', () => {
  const pr = '<definedNames><definedName name="TaxRate">Rates!$B$2</definedName><definedName name="Local" localSheetId="1">Rates!$B$3</definedName><definedName name="Odd" hidden="1">1</definedName><definedName name="_xlnm.Print_Area" localSheetId="0">Summary!$A$1:$F$20</definedName></definedNames>';
  assert.deepEqual(readWorkbook(xlsx({ Summary: '', Rates: '' }, { pr })).names, [
    { name: 'TaxRate', refersTo: 'Rates!$B$2' }, { name: 'Local', refersTo: 'Rates!$B$3', sheet: 'Rates' }, { name: 'Odd', refersTo: '1', hidden: true },
  ]);
  const many = `<definedNames>${Array.from({ length: 5 }, (_, i) => `<definedName name="N${i}">A</definedName>`).join('')}</definedNames>`;
  const capped = readWorkbook(xlsx({ S: '' }, { pr: many }), { ...LIMITS, definedNames: 2 });
  assert.deepEqual([capped.names.length, capped.namesCut], [2, true]);
});

test('external links are named by the number a formula uses, with the file the workbook says, never opened', () => {
  const pr = '<externalReferences><externalReference r:id="x1"/><externalReference r:id="x2"/></externalReferences>';
  const parts = {
    'xl/_rels/workbook.xml.rels': rels([{ id: 'rId1', target: 'worksheets/sheet1.xml' }, { id: 'x1', target: 'externalLinks/externalLink1.xml' }, { id: 'x2', target: 'externalLinks/externalLink2.xml' }]),
    'xl/externalLinks/externalLink1.xml': '<externalLink xmlns:r="r"><externalBook r:id="f"><sheetNames><sheetName val="Rates"/></sheetNames></externalBook></externalLink>',
    'xl/externalLinks/_rels/externalLink1.xml.rels': rels([{ id: 'f', target: 'file:///C:/finance/rates.xlsx', external: true }]),
    'xl/externalLinks/externalLink2.xml': '<externalLink><externalBook><sheetNames/></externalBook></externalLink>',
  };
  const file = xlsx({ S: '' }, { pr, parts });
  assert.deepEqual(readWorkbook(file).links, [{ index: 1, file: 'file:///C:/finance/rates.xlsx', sheets: ['Rates'] }, { index: 2, sheets: [] }]);
});

test('the list of sheets survives one huge sheet: smallest counted first, and what isn\'t counted says so and still reads', () => {
  const big = sheetData(...Array.from({ length: 2000 }, (_, i) => row(i + 1, `<c r="A${i + 1}"><v>${i}</v></c>`)));
  const file = xlsx({ Export: big, Small: sheetData(row(1, '<c r="A1"><v>1</v></c>')) });
  const limits = { ...LIMITS, scanBytes: 1000 };
  assert.deepEqual(readWorkbook(file, limits).sheets.map((s) => [s.name, s.counted, s.cells]), [['Export', false, undefined], ['Small', undefined, 1]]);
  assert.equal(readCells(file, 'Export', 'A1:A2', limits).cells.length, 2);
});

test('a sheet over the tree limit reads as a stream: the element limit protects memory, and a stream keeps nothing', () => {
  const file = xlsx({ S: sheetData(...Array.from({ length: 50 }, (_, i) => row(i + 1, `<c r="A${i + 1}" t="s"><v>0</v></c>`))) }, { parts: { 'xl/sharedStrings.xml': `<sst xmlns="x">${'<si><t>x</t></si>'.repeat(50)}</sst>` } });
  const limits = { ...LIMITS, xmlNodes: 40 };
  assert.equal(readWorkbook(file, limits).sheets[0]!.cells, 50);
  assert.equal(readCells(file, 'S', 'A1:A2', limits).cells[0]!.value, 'x');
});

test('`cut.next` always moves on: one row over the cap goes on along the row, then the rows after, and following it reaches every cell', () => {
  const cells = Array.from({ length: 6 }, (_, i) => `<c r="${String.fromCharCode(65 + i)}1"><v>${i}</v></c>`);
  const file = xlsx({ S: sheetData(row(1, ...cells), row(2, '<c r="A2"><v>6</v></c>')) });
  const limits = { ...LIMITS, cells: 2 };
  const seen: string[] = [];
  const queue = ['A1:F2'];
  for (let turns = 0; queue.length > 0; turns++) {
    assert.ok(turns < 12, 'it ends');
    const asked = queue.shift()!;
    const read = readCells(file, 'S', asked, limits);
    seen.push(...read.cells.map((c) => c.address));
    if (read.cut) {
      assert.notEqual(read.cut.next, asked);
      queue.unshift(...[read.cut.next, read.cut.then].filter((r): r is string => r !== undefined));
    }
  }
  assert.deepEqual(new Set(seen), new Set(['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'A2']));
  assert.deepEqual(readCells(file, 'S', undefined, limits).cut, { shown: 2, next: 'C1:XFD1', then: 'A2:XFD1048576' });
});

test('one answer stays under its cap, whatever the file holds: cells, comments, merged ranges and drawings', () => {
  const long = 'x'.repeat(8000);
  const file = xlsx({ S: `${sheetData(row(1, ...Array.from({ length: 60 }, (_, i) => `<c r="${String.fromCharCode(65 + (i % 26))}${String.fromCharCode(65 + Math.floor(i / 26))}1" t="inlineStr"><is><t>${long}</t></is></c>`)))}<mergeCells>${Array.from({ length: 900 }, (_, i) => `<mergeCell ref="A${i + 2}:B${i + 2}"/>`).join('')}</mergeCells>` });
  const read = readCells(file, 'S', undefined);
  assert.ok(JSON.stringify(read).length <= LIMITS.answerChars, String(JSON.stringify(read).length));
  assert.ok(read.cut);
  const many = xlsx(Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`Sheet number ${i}`, ''])));
  assert.ok(JSON.stringify(readWorkbook(many)).length <= LIMITS.answerChars);
});

test('F9: more date formats, elapsed time is a number, the format comes back, `_x000D_` is decoded, `$F$20` is taken, hidden is marked, an uncalculated formula is `empty`', () => {
  const styles = '<styleSheet xmlns="x"><numFmts><numFmt numFmtId="165" formatCode="&quot;GBP &quot;#,##0.00"/><numFmt numFmtId="166" formatCode="[h]:mm"/></numFmts><cellXfs><xf numFmtId="0"/><xf numFmtId="31"/><xf numFmtId="57"/><xf numFmtId="165"/><xf numFmtId="10"/><xf numFmtId="166"/></cellXfs></styleSheet>';
  const file = xlsx({ S: `<cols><col min="7" max="7" hidden="1"/></cols>${sheetData(
    row(1, '<c r="A1" s="1"><v>46023</v></c>', '<c r="B1" s="2"><v>46023</v></c>', '<c r="C1" s="3"><v>1000</v></c>', '<c r="D1" s="4"><v>0.31</v></c>', '<c r="E1" s="5"><v>1.5</v></c>', '<c r="F1" t="inlineStr"><is><t>a_x000D_b_x005F_x000D_</t></is></c>', '<c r="G1"><v>1</v></c>'),
    '<row r="25" hidden="1"><c r="A25"><v>2</v></c></row>', row(26, '<c r="A26"><f>A25*2</f></c>'),
  )}` }, { parts: { 'xl/styles.xml': styles } });
  const cells = readCells(file, 'S', undefined).cells;
  const of = (a: string) => cells.find((c) => c.address === a)!;
  assert.deepEqual([of('A1').type, of('A1').value], ['date', '2026-01-01']);
  assert.equal(of('B1').type, 'date');
  assert.deepEqual([of('C1').value, of('C1').format], [1000, '"GBP "#,##0.00']);
  assert.deepEqual([of('D1').value, of('D1').format], [0.31, '0.00%']);
  assert.deepEqual([of('E1').type, of('E1').value, of('E1').format], ['number', 1.5, '[h]:mm']);
  assert.equal(of('F1').value, 'a\rb_x000D_');
  assert.deepEqual([of('G1').hidden, of('A25').hidden, of('A1').hidden], [true, true, undefined]);
  assert.deepEqual([of('A26').type, of('A26').value, of('A26').formula], ['empty', null, 'A25*2']);
  assert.equal(readCells(file, 'S', undefined).uncalculated, 1);
  assert.equal(readCells(file, 'S', '$A$1:$B$1').cells.length, 2);
});
