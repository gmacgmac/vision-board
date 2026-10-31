// `read_attachment` over HTTP (D-071): an agent's operation, every answer against the spec, the flag, and through the MCP tool's table.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { zipSync } from 'fflate';
import { attachedFilesAreUntrusted as UNTRUSTED } from '../server/words/server-chat.ts';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
let agent: Joined;
before(async () => { h = await startBoard(); agent = await h.join('Agent'); });
after(async () => { await h.close(); });

const enc = (s: string) => new TextEncoder().encode(s);
const attach = async (name: string, bytes: Uint8Array, on = h) => (await on.ok('attach_chat_file', { body: { name, type: '', data: Buffer.from(bytes).toString('base64') } })).file.path as string;
const hello = zipSync({ 'a.txt': enc('hello') });

test('an agent expands a zip it was given; the answer fits the spec and says it is untrusted', async () => {
  const rel = await attach('hello.zip', hello);
  const read = await h.ok('read_attachment', { body: { path: rel } }, { as: agent.client });
  assert.equal(read.kind, 'folder');
  assert.equal(read.untrusted, UNTRUSTED);
  assert.equal(fs.readFileSync(path.join(h.project, read.files[0].path), 'utf8'), 'hello');
});

test('it is an agent\'s operation: no secret, or the person, is refused, and a wrong body', async () => {
  const rel = await attach('hello.zip', hello);
  await h.fails('read_attachment', { body: { path: rel } }, 401, 'not-authenticated');
  await h.fails('read_attachment', { body: { path: rel } }, 403, 'forbidden', h.person);
  await h.fails('read_attachment', { body: { path: rel, extra: 1 } as never }, 422, 'invalid', agent.client);
  await h.fails('read_attachment', { body: {} as never }, 422, 'invalid', agent.client);
});

test('a path it did not save is `invalid` at /path, naming no file\'s contents', async () => {
  fs.writeFileSync(path.join(h.project, '.env'), 'SECRET=value-nobody-should-see');
  const err = await h.fails('read_attachment', { body: { path: '.env' } }, 422, 'invalid', agent.client);
  assert.deepEqual(err.errors.map((e) => e.pointer), ['/path']);
  assert.doesNotMatch(JSON.stringify(h.last().body), /value-nobody-should-see/);
});

test('the board answers others while a large read runs', async () => {
  const rel = await attach('big.zip', zipSync({ 'big.bin': new Uint8Array(32 * 1024 * 1024) }));
  const reading = h.ok('read_attachment', { body: { path: rel } }, { as: agent.client });
  const started = performance.now();
  await h.ok('list_boards');
  assert.ok(performance.now() - started < 2000);
  assert.equal((await reading).count, 1);
});

test('flag off: the operation is 404 and nothing is written', async () => {
  const off = await startBoard({ flags: { readAttachment: false } });
  try {
    const rel = await attach('hello.zip', hello, off);
    const joined = await off.join('Agent');
    await off.fails('read_attachment', { body: { path: rel } }, 404, 'not-found', joined.client);
    assert.deepEqual(fs.readdirSync(path.dirname(path.join(off.project, rel))).length, 1);
  } finally { await off.close(); }
});

test('every shape of answer fits the spec: a workbook with names, links and a picture, a sheet with comments, drawings and a cut, a document with markers and its whole text', async () => {
  const rels = (rows: string) => enc(`<Relationships>${rows}</Relationships>`);
  const rows = Array.from({ length: 2100 }, (_, i) => `<row r="${i + 1}"><c r="A${i + 1}"><f>1+1</f></c></row>`).join('');
  const book = await attach('shapes.xlsx', zipSync({
    'xl/workbook.xml': enc('<workbook xmlns:r="r"><sheets><sheet name="S" sheetId="1" state="hidden" r:id="a"/></sheets><externalReferences><externalReference r:id="x"/></externalReferences><definedNames><definedName name="TaxRate" localSheetId="0" hidden="1">S!$A$1</definedName></definedNames></workbook>'),
    'xl/_rels/workbook.xml.rels': rels('<Relationship Id="a" Type="t" Target="worksheets/s.xml"/><Relationship Id="x" Type="t" Target="externalLinks/e.xml"/>'),
    'xl/externalLinks/e.xml': enc('<externalLink xmlns:r="r"><externalBook r:id="f"><sheetNames><sheetName val="Rates"/></sheetNames></externalBook></externalLink>'),
    'xl/externalLinks/_rels/e.xml.rels': rels('<Relationship Id="f" Type="t" Target="rates.xlsx" TargetMode="External"/>'),
    'xl/worksheets/s.xml': enc(`<worksheet><sheetData>${rows}</sheetData></worksheet>`),
    'xl/worksheets/_rels/s.xml.rels': rels('<Relationship Id="d" Type="x/drawing" Target="../drawings/d.xml"/><Relationship Id="c" Type="x/comments" Target="../comments.xml"/>'),
    'xl/comments.xml': enc('<comments><commentList><comment ref="A1"><text><t>Check this</t></text></comment></commentList></comments>'),
    'xl/drawings/d.xml': enc('<wsDr xmlns:a="a" xmlns:r="r"><oneCellAnchor><from><col>1</col><row>1</row></from><pic><blipFill><a:blip r:embed="i"/></blipFill></pic></oneCellAnchor></wsDr>'),
    'xl/drawings/_rels/d.xml.rels': rels('<Relationship Id="i" Type="t" Target="../media/t.emf"/>'),
    'xl/media/t.emf': enc('emf'),
  }));
  const list = await h.ok('read_attachment', { body: { path: book } }, { as: agent.client });
  assert.deepEqual([list.names[0].name, list.links[0].file, list.pictures.length], ['TaxRate', 'rates.xlsx', 1]);
  const sheet = await h.ok('read_attachment', { body: { path: book, sheet: 'S' } }, { as: agent.client });
  assert.deepEqual([sheet.comments[0].text, sheet.drawings[0].unseeable, sheet.cells[0].type], ['Check this', true, 'empty']);
  assert.ok(sheet.cut.next);
  const paragraphs = '<w:p><w:r><w:t>A long line of a long customer document, repeated.</w:t></w:r></w:p>'.repeat(2000);
  const doc = await attach('shapes.docx', zipSync({ 'word/document.xml': enc(`<w:document xmlns:w="w" xmlns:o="o"><w:body><w:p><w:r><w:object><o:OLEObject ProgID="Visio.Drawing.15"/></w:object></w:r></w:p>${paragraphs}</w:body></w:document>`) }));
  const read = await h.ok('read_attachment', { body: { path: doc } }, { as: agent.client });
  assert.match(read.markdown, /\[embedded Visio\.Drawing\.15, not read\]/);
  assert.match(read.wholeText, /document\.md$/);
});
