// What `read_attachment` tells the agent of what it can't see (VERIFY_01 F2, F4-F6, F9), over the readers' results: the markers, the notes, and the caps on an answer.
// verify: data-folder-literal the attachment paths a page and an agent see (`.visionboard/attachments/…`, repo-wide in every layout)
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { zipSync } from 'fflate';
import { attachedFile, saveAttachment } from '../server/chat-files.ts';
import { readAttachment } from '../server/chat-read.ts';
import { ProblemError } from '../server/problem.ts';
import { makeTempDir } from '#format/testing';
import { projectFiles } from '#format';

const base = fs.realpathSync(makeTempDir('vb-chat-read-notes-'));
after(() => fs.rmSync(base, { recursive: true, force: true }));

let count = 0;
function board() {
  const folder = path.join(base, `f${++count}`);
  fs.mkdirSync(projectFiles(folder).root, { recursive: true });
  return folder;
}
const NOW = new Date('2026-10-30T09:00:00Z');
const attach = (folder: string, name: string, bytes: Uint8Array | string) => saveAttachment(folder, { name, type: '', data: Buffer.from(bytes).toString('base64') }, NOW).path;
const enc = (s: string) => new TextEncoder().encode(s);
const refused = async (run: Promise<unknown>, pointer: string, detail: RegExp) => {
  await assert.rejects(run, (e) => {
    assert.ok(e instanceof ProblemError, String(e));
    const said = (e.body as { errors: { pointer: string; detail: string }[] }).errors[0]!;
    assert.equal(said.pointer, pointer);
    assert.match(said.detail, detail);
    return true;
  });
};

const R = 'word/_rels/document.xml.rels';
const WORD_NS = 'xmlns:w="w" xmlns:r="r" xmlns:a="a" xmlns:c="c" xmlns:dgm="d" xmlns:o="o" xmlns:v="v"';
const word = (body: string, parts: Record<string, Uint8Array>) => zipSync({ 'word/document.xml': enc(`<w:document ${WORD_NS}><w:body>${body}</w:body></w:document>`), ...parts });
const REL = (rows: string) => enc(`<Relationships>${rows}</Relationships>`);
const rel = (id: string, target: string) => `<Relationship Id="${id}" Type="t" Target="${target}"/>`;

test('a Word file\'s SmartArt, chart, Visio object and EMF stand as markers, and the note names each, what was reached and what wasn\'t', async () => {
  const folder = board();
  const rels = REL(rel('d', 'diagrams/data1.xml') + rel('c', 'charts/chart1.xml') + rel('e', 'media/image1.emf') + rel('v', 'embeddings/v.vsdx'));
  const rels2 = { [R]: rels, 'word/diagrams/data1.xml': enc('<dataModel><ptLst><pt modelId="1"><t><p><r><t>Ingest</t></r></p></t></pt></ptLst></dataModel>'), 'word/charts/chart1.xml': enc('<chartSpace><chart><plotArea><barChart/></plotArea></chart></chartSpace>'), 'word/media/image1.emf': new Uint8Array([1]), 'word/embeddings/v.vsdx': new Uint8Array([2]) };
  const body = '<w:p><w:r><w:drawing><dgm:relIds r:dm="d"/></w:drawing><w:drawing><c:chart r:id="c"/></w:drawing><w:object><v:imagedata r:id="e"/><o:OLEObject ProgID="Visio.Drawing.15" r:id="v"/></w:object></w:r></w:p>';
  const read = await readAttachment(folder, { path: attach(folder, 'design.docx', word(body, rels2)) });
  assert.ok(read.kind === 'document');
  assert.match(read.markdown, /\[SmartArt: Ingest\]/);
  assert.match(read.markdown, /\[chart: bar\]/);
  assert.match(read.markdown, /\[embedded Visio\.Drawing\.15, not read\]/);
  assert.match(read.note!, /1 SmartArt diagram and 1 chart/);
  assert.match(read.note!, /How it looks was not seen/);
  assert.match(read.note!, /can't be shown these pictures, whatever opens them: picture-1\.emf/);
  assert.match(read.note!, /embedded objects were not read: Visio\.Drawing\.15/);
});

test('a long Word file: the answer stays under the cap and says where all of it is, a file the agent can open', async () => {
  const folder = board();
  const paragraphs = Array.from({ length: 4000 }, (_, i) => `<w:p><w:r><w:t>Paragraph number ${i} of a long customer document.</w:t></w:r></w:p>`).join('');
  const read = await readAttachment(folder, { path: attach(folder, 'long.docx', word(paragraphs, {})) });
  assert.ok(read.kind === 'document');
  assert.ok(JSON.stringify(read).length < 45_000, String(JSON.stringify(read).length));
  assert.equal(read.wholeText, '.visionboard/attachments/2026-10-30/1-long-text/document.md');
  assert.match(read.note!, /All of it is in .*document\.md/);
  assert.ok(attachedFile(folder, read.wholeText!));
  assert.match(fs.readFileSync(path.join(folder, read.wholeText!), 'utf8'), /Paragraph number 3999/);
  assert.deepEqual(read.pictures, []);
});

const book = (sheetXml: string, parts: Record<string, Uint8Array> = {}, pr = '') => zipSync({
  'xl/workbook.xml': enc(`<workbook xmlns:r="r">${pr}<sheets><sheet name="S" sheetId="1" r:id="a"/></sheets></workbook>`),
  'xl/_rels/workbook.xml.rels': REL(rel('a', 'worksheets/s.xml')),
  'xl/worksheets/s.xml': enc(`<worksheet>${sheetXml}</worksheet>`),
  ...parts,
});

test('a sheet holding only a picture: the list says so and saves it, and the sheet\'s answer says what is where', async () => {
  const folder = board();
  const rel2 = attach(folder, 'topology.xlsx', book('', {
    'xl/worksheets/_rels/s.xml.rels': enc('<Relationships><Relationship Id="d" Type="x/drawing" Target="../drawings/d.xml"/></Relationships>'),
    'xl/drawings/d.xml': enc('<wsDr xmlns:a="a" xmlns:r="r"><oneCellAnchor><from><col>1</col><row>1</row></from><pic><nvPicPr><cNvPr id="1" descr="Topology"/></nvPicPr><blipFill><a:blip r:embed="i"/></blipFill></pic></oneCellAnchor></wsDr>'),
    'xl/drawings/_rels/d.xml.rels': REL(rel('i', '../media/t.png')),
    'xl/media/t.png': new Uint8Array([9, 9]),
  }));
  const list = await readAttachment(folder, { path: rel2 });
  assert.ok(list.kind === 'workbook');
  assert.deepEqual([list.sheets[0]!.cells, list.sheets[0]!.pictures], [0, 1]);
  assert.deepEqual(list.pictures, [{ path: '.visionboard/attachments/2026-10-30/1-topology-pictures/picture-1.png', size: 2 }]);
  assert.match(list.note!, /hold pictures, charts or drawn shapes/);
  const sheet = await readAttachment(folder, { path: rel2, sheet: 'S' });
  assert.ok(sheet.kind === 'sheet');
  assert.deepEqual(sheet.drawings, [{ kind: 'picture', at: 'B2', text: 'Topology', file: 'picture-1.png' }]);
  assert.match(sheet.note!, /has things drawn on it/);
});

test('notes for what a range can\'t state: a value nobody calculated, a hidden cell, and where to go on', async () => {
  const folder = board();
  const rows = Array.from({ length: 2100 }, (_, i) => `<row r="${i + 2}"><c r="A${i + 2}"><v>${i}</v></c></row>`).join('');
  const rel2 = attach(folder, 'n.xlsx', book(`<sheetData><row r="1" hidden="1"><c r="A1"><f>1+1</f></c></row>${rows}</sheetData>`));
  const read = await readAttachment(folder, { path: rel2, sheet: 'S' });
  assert.ok(read.kind === 'sheet');
  assert.ok(read.cut);
  assert.match(read.note!, new RegExp(`Ask for the range ${read.cut.next.replace('$', '')} next`));
  assert.match(read.note!, /1 formula here has no stored value/);
  assert.match(read.note!, /1 cell here is in a hidden row or column/);
  assert.ok(JSON.stringify(read).length < 45_000);
});

test('defined names and links come back from a workbook; sheets not counted are named', async () => {
  const folder = board();
  const read = await readAttachment(folder, { path: attach(folder, 'names.xlsx', book('', {}, '<definedNames><definedName name="TaxRate">Rates!$B$2</definedName></definedNames>')) });
  assert.ok(read.kind === 'workbook');
  assert.deepEqual(read.names, [{ name: 'TaxRate', refersTo: 'Rates!$B$2' }]);
});

test('an archive\'s PDFs and pictures: the note names the PDFs and what to do; a PDF inside is a dead end said plainly; a directly attached one isn\'t told that', async () => {
  const folder = board();
  const rel2 = attach(folder, 'pack.zip', zipSync({ 'scope.pdf': enc('%PDF'), 'net.png': enc('png'), 'old.emf': enc('emf') }));
  const read = await readAttachment(folder, { path: rel2 });
  assert.ok(read.kind === 'folder');
  assert.match(read.note!, /These PDFs came out of the archive and have no pages made.*1-pack\/scope\.pdf/);
  assert.match(read.note!, /attach each one on its own/);
  assert.match(read.note!, /1 picture came out of the archive/);
  assert.match(read.note!, /can't be shown these pictures.*old\.emf/);
  const pdf = read.files.find((f) => f.path.endsWith('.pdf'))!.path;
  await refused(readAttachment(folder, { path: pdf }), '/path', /no pages made.*attach it on its own/);
  await refused(readAttachment(folder, { path: attach(folder, 'top.pdf', '%PDF') }), '/path', /own read tool/);
});

test('a huge folder lists what fits the cap and says the rest is there', async () => {
  const folder = board();
  const read = await readAttachment(folder, { path: attach(folder, 'many.zip', zipSync(Object.fromEntries(Array.from({ length: 1500 }, (_, i) => [`deep/folder/with/a/long/name/for/each/file-number-${i}.txt`, enc('x')])))) });
  assert.ok(read.kind === 'folder');
  assert.equal(read.count, 1500);
  assert.ok(read.files.length < 1500);
  assert.ok(JSON.stringify(read).length < 45_000);
  assert.match(read.note!, /Only the first \d+ files are listed/);
});

test('a password-protected file says so and how to go on', async () => {
  const folder = board();
  await refused(readAttachment(folder, { path: attach(folder, 'locked.docx', new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0])) }), '/path', /protected by a password, or in the old/);
});
