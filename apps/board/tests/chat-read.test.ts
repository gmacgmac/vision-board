// `read_attachment`'s gate and its saving (D-071), with no server: a path `attachedFile` refuses, a folder the board
// made, nothing over anything, and a reader that hangs is stopped while the rest keeps running.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { zipSync } from 'fflate';
import { ATTACHMENT_BYTES, attachedFile, attachedFiles, attachmentName, saveAttachment, saveBeside } from '../server/chat-files.ts';
import { READS_AT_ONCE, inWorker, readAttachment } from '../server/chat-read.ts';
import { ProblemError } from '../server/problem.ts';
import { attachedFilesAreUntrusted as UNTRUSTED } from '../server/words/server-chat.ts';
import { makeTempDir } from '#format/testing';

const base = fs.realpathSync(makeTempDir('vb-chat-read-'));
after(() => fs.rmSync(base, { recursive: true, force: true }));

let count = 0;
function board() {
  const folder = path.join(base, `f${++count}`);
  fs.mkdirSync(path.join(folder, '.visionboard'), { recursive: true });
  return folder;
}
const NOW = new Date('2026-10-30T09:00:00Z');
const attach = (folder: string, name: string, bytes: Uint8Array | string) => saveAttachment(folder, { name, type: '', data: Buffer.from(bytes).toString('base64') }, NOW).path;
const enc = (s: string) => new TextEncoder().encode(s);
const zip = (files: Record<string, string>) => zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, enc(v)])));
const refused = async (run: Promise<unknown>, pointer: string, detail?: RegExp) => {
  await assert.rejects(run, (e) => {
    assert.ok(e instanceof ProblemError, String(e));
    assert.equal(e.code, 'invalid');
    const said = (e.body as { errors: { pointer: string; detail: string }[] }).errors[0]!;
    assert.equal(said.pointer, pointer);
    if (detail) assert.match(said.detail, detail);
    return true;
  });
};
const tree = (dir: string): string[] => fs.readdirSync(dir, { recursive: true, encoding: 'utf8' }).sort();

test('a path attachedFile refuses is refused, and .env is', async () => {
  const folder = board();
  fs.writeFileSync(path.join(folder, '.env'), 'SECRET=1');
  fs.mkdirSync(path.join(folder, '.visionboard/attachments/2026-10-30'), { recursive: true });
  fs.writeFileSync(path.join(folder, '.visionboard/attachments/2026-10-30/.env'), 'SECRET=1');
  fs.writeFileSync(path.join(folder, '.visionboard/agents.json'), '{}');
  for (const p of ['.env', '../x.zip', '/etc/passwd', '.visionboard/agents.json', '.visionboard/attachments/2026-10-30/.env', '.visionboard/attachments/2026-10-30/9-none.zip', '.visionboard/attachments/2026-10-30/1-a/../../x.zip']) {
    await refused(readAttachment(folder, { path: p }), '/path');
  }
});

test('inside a folder the board made a file passes, by its plain steps; a dot name, a link or a file as a folder does not', () => {
  const folder = board();
  const rel = attach(folder, 'a.zip', zip({ 'x.txt': 'hi' }));
  const made = saveBeside(folder, rel, '', [{ path: 'sub/x.txt', bytes: enc('hi') }]);
  const inside = `${made.folder}/sub/x.txt`;
  assert.deepEqual(attachedFile(folder, inside), { name: 'x.txt', path: inside, size: 2 });
  assert.equal(attachedFile(folder, `${made.folder}/sub`), undefined, 'a folder is no file');
  fs.writeFileSync(path.join(folder, made.folder, '.env'), 'SECRET=1');
  assert.equal(attachedFile(folder, `${made.folder}/.env`), undefined);
  assert.equal(attachedFile(folder, `${made.folder}/sub/../../x`), undefined);
  assert.equal(attachedFile(folder, `${rel}/x`), undefined, 'a file is no folder');
  fs.symlinkSync(path.join(folder, made.folder), path.join(folder, made.folder, 'link'));
  assert.equal(attachedFile(folder, `${made.folder}/link/sub/x.txt`), undefined);
  fs.symlinkSync(path.join(folder, '.env'), path.join(folder, made.folder, 'file-link'));
  assert.equal(attachedFile(folder, `${made.folder}/file-link`), undefined);
});

test('a message may name a file in such a folder, and the day\'s numbers still count', () => {
  const folder = board();
  const made = saveBeside(folder, attach(folder, 'a.zip', 'x'), '', [{ path: 'x.txt', bytes: enc('hi') }]);
  assert.equal(attachedFiles(folder, [{ path: made.files[0]!.path }])[0]!.size, 2);
  assert.match(attach(folder, 'next.txt', 'y'), /\/2-next\.txt$/);
});

test('a message names no file over its 10 MB, wherever it is', () => {
  const folder = board();
  const made = saveBeside(folder, attach(folder, 'a.zip', 'x'), '', [{ path: 'big.bin', bytes: new Uint8Array(ATTACHMENT_BYTES + 1) }]);
  assert.throws(() => attachedFiles(folder, [{ path: made.files[0]!.path }]), (e) => e instanceof ProblemError && e.code === 'invalid');
});

test('saving never writes over anything: a taken name gets another, a second folder is another, names become the board\'s own', () => {
  const folder = board();
  const rel = attach(folder, 'a.zip', 'x');
  const first = saveBeside(folder, rel, '', [{ path: 'A.txt', bytes: enc('1') }, { path: 'a.txt', bytes: enc('2') }, { path: 'a b/c.txt', bytes: enc('3') }, { path: 'a_b', bytes: enc('4') }, { path: '报告.pdf', bytes: enc('5') }]);
  assert.equal(first.folder, `.visionboard/attachments/2026-10-30/1-a`);
  assert.deepEqual(first.files.map((f) => [path.posix.basename(f.path), f.from]), [['A.txt', undefined], ['a-2.txt', 'a.txt'], ['c.txt', 'a b/c.txt'], ['a_b-2', 'a_b'], ['file.pdf', '报告.pdf']]);
  const second = saveBeside(folder, rel, '', [{ path: 'A.txt', bytes: enc('new') }]);
  assert.equal(second.folder, '.visionboard/attachments/2026-10-30/1-a-2');
  assert.equal(fs.readFileSync(path.join(folder, first.folder, 'A.txt'), 'utf8'), '1');
  assert.equal(fs.statSync(path.join(folder, first.files[0]!.path)).mode & 0o777, 0o600);
  assert.equal(fs.statSync(path.join(folder, first.folder)).mode & 0o777, 0o700);
});

test('whatever a reader sends, a saved name stays inside: the names of a worker are not believed', () => {
  const folder = board();
  const rel = attach(folder, 'a.zip', 'x');
  const out = saveBeside(folder, rel, '', [{ path: '../../../../../../escape.txt', bytes: enc('1') }, { path: '..', bytes: enc('2') }]);
  for (const f of out.files) assert.ok(attachedFile(folder, f.path), f.path);
  assert.equal(fs.existsSync(path.join(folder, '.visionboard/attachments/escape.txt')), false);
});

test('a folder from the longest name still passes attachedFile', () => {
  const folder = board();
  const rel = attach(folder, `${'n'.repeat(90)}.docx`, 'x');
  for (let i = 0; i < 2; i++) {
    const made = saveBeside(folder, rel, '-pictures', [{ path: `${'p'.repeat(90)}.png`, bytes: enc('1') }]);
    assert.ok(attachedFile(folder, made.files[0]!.path), made.files[0]!.path);
  }
  assert.equal(attachmentName('x'.repeat(200)).length, 80);
});

test('a link where the new folder goes is not followed', () => {
  const folder = board();
  const rel = attach(folder, 'a.zip', 'x');
  const out = path.join(base, `out${count}`);
  fs.mkdirSync(out);
  fs.symlinkSync(out, path.join(folder, '.visionboard/attachments/2026-10-30/1-a'));
  const made = saveBeside(folder, rel, '', [{ path: 'x.txt', bytes: enc('1') }]);
  assert.equal(made.folder, '.visionboard/attachments/2026-10-30/1-a-2');
  assert.deepEqual(tree(out), []);
});

test('a zip expands to a new folder; again, to another; nothing overwritten; every answer says it is untrusted', async () => {
  const folder = board();
  const rel = attach(folder, 'arch.zip', zip({ 'a.txt': 'one', 'dir/b.txt': 'two' }));
  const first = await readAttachment(folder, { path: rel });
  assert.deepEqual(first, {
    kind: 'folder', untrusted: UNTRUSTED, folder: '.visionboard/attachments/2026-10-30/1-arch', count: 2,
    files: [{ path: '.visionboard/attachments/2026-10-30/1-arch/a.txt', size: 3 }, { path: '.visionboard/attachments/2026-10-30/1-arch/dir/b.txt', size: 3 }],
  });
  const second = await readAttachment(folder, { path: rel });
  assert.equal(second.kind === 'folder' && second.folder, '.visionboard/attachments/2026-10-30/1-arch-2');
  assert.equal(fs.readFileSync(path.join(folder, '.visionboard/attachments/2026-10-30/1-arch/a.txt'), 'utf8'), 'one');
});

test('a hostile archive leaves nothing: its refusal says why, and the day\'s folder holds only the file', async () => {
  const folder = board();
  const day = path.join(folder, '.visionboard/attachments/2026-10-30');
  const made = zipSync({ 'fine.txt': enc('x'), 'evil.txt': enc('y') });
  const text = new TextDecoder('latin1').decode(made).replaceAll('evil.txt', '../x.txt');
  const hostile = attach(folder, 'evil.zip', Uint8Array.from(text, (c) => c.charCodeAt(0)));
  await refused(readAttachment(folder, { path: hostile }), '/path', /land outside/);
  assert.deepEqual(tree(day), ['1-evil.zip']);
});

test('a file in a folder the board made is read in turn: a zip inside a zip expands beside it', async () => {
  const folder = board();
  const inner = zip({ 'deep.txt': 'deep' });
  const rel = attach(folder, 'outer.zip', zipSync({ 'inner.zip': inner }));
  const outer = await readAttachment(folder, { path: rel });
  assert.ok(outer.kind === 'folder');
  const nested = await readAttachment(folder, { path: outer.files[0]!.path });
  assert.ok(nested.kind === 'folder');
  assert.equal(nested.folder, `${outer.folder}/inner`);
  assert.equal(fs.readFileSync(path.join(folder, nested.files[0]!.path), 'utf8'), 'deep');
});

test('a Word file: Markdown, its pictures saved in a new folder and listed with their sizes', async () => {
  const folder = board();
  const png = new Uint8Array([137, 80, 78, 71]);
  const rel = attach(folder, 'report.docx', zipSync({
    'word/document.xml': enc('<w:document xmlns:w="w" xmlns:r="r" xmlns:a="a"><w:body><w:p><w:r><w:t>Hello</w:t></w:r></w:p><w:p><w:r><w:drawing><a:blip r:embed="i"/></w:drawing></w:r></w:p></w:body></w:document>'),
    'word/_rels/document.xml.rels': enc('<Relationships><Relationship Id="i" Type="t" Target="media/d.png"/></Relationships>'),
    'word/media/d.png': png,
    'word/comments.xml': enc('<x/>'),
  }));
  const pictures = '.visionboard/attachments/2026-10-30/1-report-pictures';
  assert.deepEqual(await readAttachment(folder, { path: rel }), {
    kind: 'document', untrusted: UNTRUSTED, markdown: 'Hello\n\n![](picture-1.png)', folder: pictures, pictures: [{ path: `${pictures}/picture-1.png`, size: 4 }],
    note: 'Not read from the document: comments.',
  });
  assert.deepEqual([...fs.readFileSync(path.join(folder, pictures, 'picture-1.png'))], [...png]);
});

test('an Excel file: its sheets, then a range; a sheet or range on anything else, or a range with no sheet, is refused', async () => {
  const folder = board();
  const rel = attach(folder, 'b.xlsx', zipSync({
    'xl/workbook.xml': enc('<workbook xmlns:r="r"><sheets><sheet name="Plan" sheetId="1" r:id="a"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': enc('<Relationships><Relationship Id="a" Type="t" Target="worksheets/s.xml"/></Relationships>'),
    'xl/worksheets/s.xml': enc('<worksheet><sheetData><row r="2"><c r="B2"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>'),
  }));
  assert.deepEqual(await readAttachment(folder, { path: rel }), { kind: 'workbook', untrusted: UNTRUSTED, sheets: [{ name: 'Plan', hidden: false, rows: 1, columns: 1, cells: 1, formulas: 1, used: 'B2:B2' }] });
  assert.deepEqual(await readAttachment(folder, { path: rel, sheet: 'Plan', range: 'B2:F20' }), { kind: 'sheet', untrusted: UNTRUSTED, sheet: 'Plan', range: 'B2:F20', cells: [{ address: 'B2', type: 'number', value: 2, formula: '1+1' }], merged: [] });
  await refused(readAttachment(folder, { path: rel, range: 'A1' }), '/range');
  await refused(readAttachment(folder, { path: rel, sheet: 'No' }), '/sheet', /no sheet/);
  await refused(readAttachment(folder, { path: rel, sheet: 'Plan', range: 'nope' }), '/range', /no range/);
  const other = attach(folder, 'c.zip', zip({ 'a': 'x' }));
  await refused(readAttachment(folder, { path: other, sheet: 'Plan' }), '/sheet');
});

test('a kind this tool does not read says to use the agent\'s own read tool; a file named for one it reads, but no such thing, is refused', async () => {
  const folder = board();
  await refused(readAttachment(folder, { path: attach(folder, 'a.pdf', 'x') }), '/path', /own read tool/);
  await refused(readAttachment(folder, { path: attach(folder, 'n.docx', 'not an archive at all, not one bit of it') }), '/path', /not an archive/);
  await refused(readAttachment(folder, { path: attach(folder, 'n.xlsx', zip({ 'a.txt': 'x' })) }), '/path', /no Word or Excel/);
});

test('a hang is stopped by the deadline, and the board keeps answering while it runs', async () => {
  const script = new URL('./fixtures/hanging-reader.ts', import.meta.url);
  let ticks = 0;
  const tick = setInterval(() => { ticks++; }, 10);
  const started = performance.now();
  await refused(inWorker({ kind: 'zip', bytes: new Uint8Array(1) }, { script, deadlineMs: 300 }), '/path', /too long/);
  clearInterval(tick);
  assert.ok(performance.now() - started < 5000);
  assert.ok(ticks >= 10, `the event loop ran ${ticks} times`);
});

test('the caller going away stops the worker; only so many run at once, and a slot comes back', async () => {
  const script = new URL('./fixtures/hanging-reader.ts', import.meta.url);
  const gone = new AbortController();
  const running = Array.from({ length: READS_AT_ONCE }, () => inWorker({ kind: 'zip', bytes: new Uint8Array(1) }, { script, signal: gone.signal }));
  assert.throws(() => inWorker({ kind: 'zip', bytes: new Uint8Array(1) }, { script }), (e) => e instanceof ProblemError && e.code === 'conflict');
  gone.abort();
  await Promise.all(running.map((r) => refused(r, '/path', /stopped/)));
  await refused(inWorker({ kind: 'zip', bytes: new Uint8Array(1) }, { script, deadlineMs: 50 }), '/path', /too long/);
});
