// Diagrams in a Word file (VERIFY_01 F2): none goes with no word. A marker where it stood, what could be read of it, and `found` for the host to say.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDocx } from '../src/index.ts';
import { docx, para, rels } from './support.ts';

const NS = 'xmlns:wp="p" xmlns:dgm="d" xmlns:c="c" xmlns:wps="s" xmlns:wpg="g" xmlns:v="v" xmlns:o="o" xmlns:mc="m"';
const run = (inner: string) => `<w:p><w:r ${NS}>${inner}</w:r></w:p>`;
const graphic = (inner: string) => `<w:drawing><wp:inline><wp:docPr id="1" name="n"/><a:graphic><a:graphicData uri="u">${inner}</a:graphicData></a:graphic></wp:inline></w:drawing>`;
const pt = (id: string, text: string, type = '') => `<dgm:pt modelId="${id}"${type && ` type="${type}"`}><dgm:t><a:p><a:r><a:t>${text}</a:t></a:r></a:p></dgm:t></dgm:pt>`;
const shape = (id: number, text: string) => `<wps:wsp><wps:cNvPr id="${id}" name="Box ${id}"/><wps:cNvSpPr/><wps:spPr/><wps:txbx><w:txbxContent>${para(text)}</w:txbxContent></wps:txbx></wps:wsp>`;
const wire = (id: number, a: number, b: number) => `<wps:wsp><wps:cNvPr id="${id}" name="Connector ${id}"/><wps:cNvCnPr><a:stCxn id="${a}" idx="3"/><a:endCxn id="${b}" idx="1"/></wps:cNvCnPr><wps:spPr/></wps:wsp>`;
const R = 'word/_rels/document.xml.rels';

test('SmartArt: its boxes and links come back as text, at a marker; presentation points are not boxes', () => {
  const data = `<dgm:dataModel xmlns:dgm="d" xmlns:a="a"><dgm:ptLst>${pt('0', '', 'doc')}${pt('1', 'Ingest')}${pt('2', 'Transform')}${pt('3', 'Warehouse')}${pt('9', 'ignore', 'pres')}</dgm:ptLst><dgm:cxnLst><dgm:cxn modelId="7" srcId="0" destId="1"/><dgm:cxn modelId="8" srcId="1" destId="2"/><dgm:cxn modelId="10" srcId="2" destId="3"/><dgm:cxn modelId="11" type="presOf" srcId="1" destId="9"/></dgm:cxnLst></dgm:dataModel>`;
  const read = readDocx(docx(para('Before') + run(graphic('<dgm:relIds r:dm="d1" r:lo="d1"/>')) + para('After'), { [R]: rels([{ id: 'd1', target: 'diagrams/data1.xml' }]), 'word/diagrams/data1.xml': data }));
  assert.equal(read.markdown, 'Before\n\n[SmartArt: Ingest; Transform; Warehouse. Links: Ingest → Transform; Transform → Warehouse]\n\nAfter');
  assert.equal(read.found.smartArt, 1);
});

test('a chart: its kind, title, series and stored figures, and where they come from; never drawn', () => {
  const chart = `<c:chartSpace xmlns:c="c" xmlns:a="a"><c:chart><c:title><c:tx><c:rich><a:p><a:r><a:t>Latency by zone</a:t></a:r></a:p></c:rich></c:tx></c:title><c:plotArea><c:barChart><c:ser><c:tx><c:strRef><c:strCache><c:pt idx="0"><c:v>p95</c:v></c:pt></c:strCache></c:strRef></c:tx><c:cat><c:strLit><c:pt idx="0"><c:v>DMZ</c:v></c:pt><c:pt idx="1"><c:v>App</c:v></c:pt></c:strLit></c:cat><c:val><c:numRef><c:f>Sheet1!$B$2:$B$3</c:f><c:numCache><c:pt idx="0"><c:v>12</c:v></c:pt><c:pt idx="1"><c:v>40</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser></c:barChart></c:plotArea></c:chart></c:chartSpace>`;
  const read = readDocx(docx(run(graphic('<c:chart r:id="c1"/>')), { [R]: rels([{ id: 'c1', target: 'charts/chart1.xml' }]), 'word/charts/chart1.xml': chart }));
  assert.equal(read.markdown, '[chart: bar. Latency by zone. p95: DMZ 12, App 40: from Sheet1!$B$2:$B$3]');
  assert.equal(read.found.charts, 1);
});

test('shapes drawn in Word: their words, and what the connectors join, which are the point', () => {
  const group = `<mc:AlternateContent><mc:Choice Requires="wpg">${graphic(`<wpg:wgp>${shape(11, 'Firewall')}${shape(12, 'Proxy')}${shape(13, 'Vault')}${wire(14, 11, 12)}${wire(15, 12, 13)}${wire(16, 12, 99)}</wpg:wgp>`)}</mc:Choice><mc:Fallback><w:pict><v:group/></w:pict></mc:Fallback></mc:AlternateContent>`;
  const read = readDocx(docx(run(group)));
  assert.equal(read.markdown, '[drawing: Firewall; Proxy; Vault. Connectors: Firewall → Proxy; Proxy → Vault; 1 joined to nothing named]');
  assert.deepEqual([read.found.shapes, read.found.connectors], [3, 3]);
});

test('a picture that can\'t be shown to a model is named at its marker and in `found`, and a Visio object is mentioned', () => {
  const visio = '<w:object><v:shape><v:imagedata r:id="e1" o:title="Physical view"/></v:shape><o:OLEObject Type="Embed" ProgID="Visio.Drawing.15" r:id="e2"/></w:object>';
  const read = readDocx(docx(run(visio), { [R]: rels([{ id: 'e1', target: 'media/image2.emf' }, { id: 'e2', target: 'embeddings/v.vsdx' }]), 'word/media/image2.emf': new Uint8Array([1]), 'word/embeddings/v.vsdx': new Uint8Array([2]) }));
  assert.equal(read.markdown, "![Physical view](picture-1.emf) [picture in a format a model can't be shown] [embedded Visio.Drawing.15, not read]");
  assert.deepEqual([read.found.unseeable, read.found.embedded, read.pictures.length], [['picture-1.emf'], ['Visio.Drawing.15'], 1]);
});

test('a drawing of a kind nothing reads still says it was there, a damaged SmartArt too, and an old text box keeps its words', () => {
  const read = readDocx(docx(run(graphic('<x:ink xmlns:x="x"/>')) + run(graphic('<dgm:relIds r:dm="bad"/>')) + run(`<w:pict><v:shape><v:textbox><w:txbxContent>${para('Old box')}</w:txbxContent></v:textbox></v:shape></w:pict>`) + run('<w:pict><v:line/></w:pict>'), { [R]: rels([{ id: 'bad', target: 'diagrams/bad.xml' }]), 'word/diagrams/bad.xml': '<!DOCTYPE x><x/>' }));
  assert.equal(read.markdown, ['[drawing of a kind not read]', '[SmartArt: its words could not be read]', '[drawing: Old box]', '[drawing of a kind not read]'].join('\n\n'));
  assert.deepEqual([read.found.otherDrawings, read.found.smartArt, read.found.shapes], [1, 1, 2]);
});

test('words in a marker can\'t close it, and hostile alt text and object kinds are made plain', () => {
  const read = readDocx(docx(run(`<w:object><o:OLEObject ProgID="a b]\u202e!"/></w:object>`) + run(graphic(shape(1, 'x] [injected'))), {}));
  assert.equal(read.markdown, '[embedded ab, not read]\n\n[drawing: x injected]');
});

test('hidden text is marked, a tracked change is noted, a link keeps its address', () => {
  const body = '<w:p><w:r><w:rPr><w:vanish/></w:rPr><w:t>Secret margin</w:t></w:r></w:p><w:p><w:r><w:rPr><w:vanish w:val="0"/></w:rPr><w:t>Shown</w:t></w:r></w:p><w:p><w:del><w:r><w:delText>2</w:delText></w:r></w:del><w:ins><w:r><w:t>3</w:t></w:r></w:ins></w:p><w:p><w:hyperlink r:id="l"><w:r><w:t>The runbook</w:t></w:r></w:hyperlink></w:p>';
  const read = readDocx(docx(body, { [R]: rels([{ id: 'l', target: 'https://example.invalid/run', external: true }]) }));
  assert.equal(read.markdown, '[hidden: Secret margin]\n\nShown\n\n3\n\n[The runbook](https://example.invalid/run)');
  assert.deepEqual([read.found.hiddenRuns, read.found.trackedChanges], [1, true]);
});

test('an old or password-protected Office file says so, not "not an archive"', () => {
  assert.throws(() => readDocx(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0])), { code: 'protected' });
});
