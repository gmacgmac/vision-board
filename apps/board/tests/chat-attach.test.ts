// Attaching on the page's side (D-068, COMPOSE_01), the parts that run under Node: each file checked
// before it goes up and its chip's state from the answer (`createChatBridge`), the limits held equal to
// the server's, a name as a label the contract takes, a pasted picture's name, base64 the server reads.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ComposerFile } from '#chat';
import { ATTACHMENT_BYTES } from '../server/chat-files.ts';
import { PDF_FRAME_PATH as SERVER_FRAME_PATH } from '../server/pdf-frame.ts';
import { PAGES_MAX, PDF_FRAME_PATH } from '../src/shell/pdf-pages-core.ts';
import { SCHEMA_BASE, schemaFiles, schemaProblems } from '../server/schema.ts';
import type { AttachFileBody, ChatSide } from '../src/shell/chat-bridge.ts';
import { attachedName, FILE_BYTES, FILE_COUNT, fileData, fileLabel } from '../src/shell/attached-file.ts';
import { createChatBridge } from '../src/shell/chat-bridge.ts';
import type { MakeCopies } from '../src/shell/pdf-pages.ts';
import { attachingFiles, fileIsTooBig, fileRefused, moreFiles, pastedPicture, tooManyFiles, tooManyFilesAtOnce } from '../src/shell/words/chat.ts';

const named = (name: string, body = 'hi', type = 'text/plain') => new File([body], name, { type });
const tick = () => new Promise((r) => setTimeout(r));
const REQUEST = `${SCHEMA_BASE}schema/api/chat-message-request.schema.json`;

/** A bridge with a chat side: the composer's last files, the uploads asked for, each answered by hand. */
function bridged(copies?: MakeCopies) {
  const bridge = createChatBridge();
  const chips = { now: [] as readonly ComposerFile[] };
  const asked: { body: AttachFileBody; ok(path: string): void; no(why: string): void }[] = [];
  const panel = new EventTarget();
  const side: ChatSide = {
    panel: panel as HTMLElement,
    composer: { setContext() {} },
    copies,
    setFiles(f) { chips.now = f; },
    upload: (body) => new Promise((resolve, reject) => {
      asked.push({
        body,
        ok: (path) => resolve({ file: { name: 'saved.txt', path, size: 2 } }),
        no: (why) => reject(new Error(why)),
      });
    }),
    state: () => ({ seq: 0, entries: [], running: [], pending: [], busy: false }),
    agent: () => undefined,
    changed() {},
    reveal() {},
  };
  bridge.chat(side);
  return { bridge, chips, asked, panel };
}
const states = (files: readonly ComposerFile[]) => files.map((f) => f.state);

test('the page\'s limits are the server\'s', () => {
  assert.equal(FILE_BYTES, ATTACHMENT_BYTES);
  const { schema } = schemaFiles().find((f) => f.schema.$id === REQUEST)!;
  assert.equal(FILE_COUNT, (schema as unknown as { properties: { files: { maxItems: number } } }).properties.files.maxItems);
  assert.equal(PDF_FRAME_PATH, SERVER_FRAME_PATH);
  const attach = schemaFiles().find((f) => f.schema.$id === `${SCHEMA_BASE}schema/api/chat-file-request.schema.json`)!.schema as unknown as { properties: { of: { properties: { page: { maximum: number } } } } };
  assert.equal(PAGES_MAX, attach.properties.of.properties.page.maximum);
});

test('once a file is ready its pictures start, what they say reaches its chip, and neither holds Send; removing or sending stops them', async () => {
  const started: { path: string; stopped: boolean; progress(p: { doing?: string; note?: string }): void }[] = [];
  const { bridge, chips, asked } = bridged((_, path, { progress }) => { const it = { path, stopped: false, progress }; started.push(it); return () => { it.stopped = true; }; });
  bridge.attachFiles([named('a.pdf'), named('b.pdf')], false);
  await tick();
  asked[0]!.ok('p/1-a.pdf');
  asked[1]!.ok('p/2-b.pdf');
  await tick();
  assert.deepEqual(started.map((s) => s.path), ['p/1-a.pdf', 'p/2-b.pdf']);
  started[0]!.progress({ doing: 'Reading pages… 1 of 3' });
  assert.equal(chips.now[0]!.doing, 'Reading pages… 1 of 3');
  assert.equal(chips.now[0]!.state, 'ready');
  assert.equal(bridge.uploading(), false);
  started[0]!.progress({ note: 'Short.' });
  assert.deepEqual([chips.now[0]!.doing, chips.now[0]!.note], [undefined, 'Short.']);
  bridge.removeFile(chips.now[1]!.id);
  assert.equal(started[1]!.stopped, true);
  assert.equal(started[0]!.stopped, false);
  bridge.sent([], bridge.files());
  assert.equal(started[0]!.stopped, true);
});

test('a file goes uploading, then ready with its path and the person\'s own name; Send carries it, then it is gone', async () => {
  const { bridge, chips, asked } = bridged();
  bridge.attachFiles([named('写真.txt')], false);
  assert.deepEqual(chips.now.map((f) => [f.name, f.state]), [['写真.txt', 'uploading']]);
  assert.equal(bridge.uploading(), true);
  assert.deepEqual(bridge.files(), []);
  await tick();
  assert.deepEqual(asked[0]!.body, { name: '写真.txt', type: 'text/plain', data: btoa('hi') });
  asked[0]!.ok('.visionboard/attachments/2026-10-30/1-file.txt');
  await tick();
  assert.deepEqual(states(chips.now), ['ready']);
  assert.equal(bridge.uploading(), false);
  const files = bridge.files();
  assert.deepEqual(files, [{ path: '.visionboard/attachments/2026-10-30/1-file.txt', label: '写真.txt' }]);
  bridge.sent([], files);
  assert.deepEqual(chips.now, []);
  assert.deepEqual(bridge.files(), []);
});

test('the panel\'s events reach it: chat-files uploads, chat-file-remove forgets', async () => {
  const { chips, asked, panel } = bridged();
  panel.dispatchEvent(new CustomEvent('chat-files', { detail: { files: [named('a.txt')], pasted: false } }));
  assert.deepEqual(chips.now.map((f) => f.name), ['a.txt']);
  await tick();
  assert.equal(asked.length, 1);
  panel.dispatchEvent(new CustomEvent('chat-file-remove', { detail: { id: chips.now[0]!.id } }));
  assert.deepEqual(chips.now, []);
});

test('a refusal from the server shows on the chip in its words; the file is never in Send', async () => {
  const { bridge, chips, asked } = bridged();
  bridge.attachFiles([named('a.txt')], false);
  await tick();
  asked[0]!.no('Attaching files to a chat message is off on this server.');
  await tick();
  assert.deepEqual(chips.now.map((f) => [f.state, f.reason]), [['refused', 'Not attached: Attaching files to a chat message is off on this server.']]);
  assert.deepEqual(bridge.files(), []);
  assert.equal(bridge.uploading(), false);
});

test('over 10 MB and an 11th file are refused before anything goes up, each saying why; a refused one takes no place in the ten', async () => {
  const { bridge, chips, asked } = bridged();
  const big = new File([new Uint8Array(FILE_BYTES + 1)], 'big.bin');
  const at = new File([new Uint8Array(FILE_BYTES)], 'at-the-limit.bin');
  bridge.attachFiles([big, at], false);
  assert.deepEqual(chips.now.map((f) => [f.name, f.state, f.reason]), [
    ['big.bin', 'refused', fileIsTooBig(FILE_BYTES + 1)], ['at-the-limit.bin', 'uploading', undefined],
  ]);
  assert.match(fileIsTooBig(FILE_BYTES + 1), /it is 10\.1 MB, and the limit is 10 MB/);
  bridge.attachFiles(Array.from({ length: 10 }, (_, i) => named(`${i}.txt`)), false);
  assert.equal(states(chips.now).filter((s) => s === 'uploading').length, 10);
  assert.equal(chips.now.at(-1)!.state, 'refused');
  assert.match(chips.now.at(-1)!.reason!, /at most 10 files/);
  await tick();
  assert.equal(asked.length, 10, 'neither refused file went up');
});

test('a file that can\'t be read (a folder dropped) is refused and says so', async () => {
  const { bridge, chips, asked } = bridged();
  const folder = Object.assign(named('photos'), { arrayBuffer: () => Promise.reject(new Error('not readable')) });
  bridge.attachFiles([folder], false);
  await tick();
  assert.equal(asked.length, 0);
  assert.equal(chips.now[0]!.state, 'refused');
  assert.match(chips.now[0]!.reason!, /could not be read/);
});

test('a chip taken off leaves the composer, and its answer coming late is dropped', async () => {
  const { bridge, chips, asked } = bridged();
  bridge.attachFiles([named('a.txt'), named('b.txt')], false);
  await tick();
  bridge.removeFile(chips.now[0]!.id);
  assert.deepEqual(chips.now.map((f) => f.name), ['b.txt']);
  asked[0]!.ok('.visionboard/attachments/2026-10-30/1-a.txt');
  await tick();
  assert.deepEqual(chips.now.map((f) => f.name), ['b.txt']);
  assert.deepEqual(bridge.files(), []);
  assert.equal(bridge.uploading(), true, 'b.txt still goes up');
});

test('a message sent keeps a file attached after it left: only what went is gone', async () => {
  const { bridge, chips, asked } = bridged();
  bridge.attachFiles([named('a.txt')], false);
  await tick();
  asked[0]!.ok('.visionboard/attachments/2026-10-30/1-a.txt');
  await tick();
  const went = bridge.files();
  bridge.attachFiles([named('b.txt'), new File([new Uint8Array(FILE_BYTES + 1)], 'big.bin')], false);
  bridge.sent([], went);
  assert.deepEqual(chips.now.map((f) => f.name), ['b.txt'], 'a refused file goes with the message it was for');
});

test('a label: the contract always takes it; a name with nothing in it gives none', () => {
  const takes = (label: string) => schemaProblems(REQUEST, { files: [{ path: 'a', label }] });
  for (const name of ['photo.png', '写真 (2).png', 'مرحبا.pdf', 'two\nlines.txt', 'a\tb\r\n.txt', 'rtl‮gnp.exe', '‏نص.txt', 'c1\u0085.txt', 'sep .txt', 'x'.repeat(300), `${'x'.repeat(199)}😀.png`]) {
    const label = fileLabel(name);
    assert.ok(label && label.length <= 200, JSON.stringify(name));
    assert.deepEqual(takes(label), [], JSON.stringify(name));
  }
  assert.equal(fileLabel('two\nlines.txt'), 'two lines.txt');
  assert.equal(fileLabel('\n‮\t '), undefined);
});

test('a pasted picture with no name of its own gets one from the words: the day, its type\'s extension; any other file keeps its name', () => {
  const now = new Date(2026, 9, 30, 12);
  const pic = (name: string, type: string) => ({ name, type });
  assert.equal(attachedName(pic('image.png', 'image/png'), true, now), pastedPicture('2026-10-30', 'png'));
  assert.equal(attachedName(pic('', 'image/png'), false, now), 'pasted picture 2026-10-30.png');
  assert.equal(attachedName(pic('image.jpeg', 'image/jpeg'), true, now), 'pasted picture 2026-10-30.jpg');
  assert.equal(attachedName(pic('image.svg', 'image/svg+xml'), true, now), 'pasted picture 2026-10-30.svg');
  assert.equal(attachedName(pic('holiday.png', 'image/png'), true, now), 'holiday.png', 'a real name, pasted');
  assert.equal(attachedName(pic('image.png', 'image/png'), false, now), 'image.png', 'dropped: the person\'s own name');
  assert.equal(attachedName(pic('notes.txt', 'text/plain'), true, now), 'notes.txt');
});

test('base64 is what the server reads back, also past one chunk and empty', async () => {
  const bytes = Uint8Array.from({ length: 0x8000 * 2 + 7 }, (_, i) => i % 251);
  assert.equal(await fileData(new Blob([bytes])), Buffer.from(bytes).toString('base64'));
  assert.equal(await fileData(new Blob([])), '');
});

test('what a screen reader is told names the file and its state; refused, the reason', () => {
  const f = { id: 'x', name: 'a.txt' };
  assert.equal(attachingFiles.said({ ...f, state: 'uploading' }), 'a.txt: uploading.');
  assert.equal(attachingFiles.said({ ...f, state: 'ready' }), 'a.txt: ready to send.');
  assert.equal(attachingFiles.said({ ...f, state: 'refused', reason: 'Not attached: too big.' }), 'a.txt: Not attached: too big.');
});

test('F4: the server\'s `/files/<i>` marks that file\'s chip refused, with why; the others stay ready, and the next message goes without it', async () => {
  const { bridge, chips, asked } = bridged();
  bridge.attachFiles([named('will-vanish.txt'), named('stays.txt')], false);
  await tick();
  asked[0]!.ok('.visionboard/attachments/2026-10-30/1-will-vanish.txt');
  asked[1]!.ok('.visionboard/attachments/2026-10-30/2-stays.txt');
  await tick();
  const sent = bridge.files();
  bridge.refuseSent(sent, [{ pointer: '/files/0', detail: 'it has since been deleted' }, { pointer: '/text', detail: 'not about a file' }, { pointer: '/files/9', detail: 'no such file' }]);
  assert.deepEqual(chips.now.map((f) => [f.name, f.state, f.reason]), [
    ['will-vanish.txt', 'refused', fileRefused('it has since been deleted')],
    ['stays.txt', 'ready', undefined],
  ]);
  assert.deepEqual(bridge.files().map((f) => f.path), ['.visionboard/attachments/2026-10-30/2-stays.txt']);
});

test('F9: many files at once: what fits gets its chip and uploads; what is left shares one chip that counts them', async () => {
  const { bridge, chips, asked } = bridged();
  bridge.attachFiles(Array.from({ length: 1000 }, (_, i) => named(`${i}.txt`)), false);
  await tick();
  assert.equal(asked.length, 10, 'ten go up');
  assert.equal(chips.now.length, 11, 'and one chip more');
  const last = chips.now.at(-1)!;
  assert.deepEqual([last.name, last.state, last.reason, last.count], [moreFiles(990), 'refused', tooManyFilesAtOnce, 990]);
});

test('F9: one file over the limit keeps its own chip and name; too big keeps its own reason; a second batch adds at most one more', async () => {
  const { bridge, chips, asked } = bridged();
  bridge.attachFiles(Array.from({ length: 11 }, (_, i) => named(`${i}.txt`)), false);
  await tick();
  assert.deepEqual([chips.now.at(-1)!.name, chips.now.at(-1)!.reason, chips.now.at(-1)!.count], ['10.txt', tooManyFiles, undefined]);
  bridge.attachFiles([named('a.txt'), named('b.txt')], false);
  assert.equal(chips.now.length, 12);
  assert.equal(chips.now.at(-1)!.count, 2);
  assert.equal(asked.length, 10);
  const { bridge: other, chips: otherChips } = bridged();
  other.attachFiles(Array.from({ length: 30 }, (_, i) => new File([new Uint8Array(FILE_BYTES + 1)], `${i}.bin`)), false);
  assert.equal(otherChips.now.length, 11, 'too many too big: still no more than fits, and one chip');
  assert.equal(otherChips.now.at(0)!.state, 'refused');
  assert.equal(otherChips.now.at(-1)!.count, 20);
});

test('F11: a name that would show nothing gives no label, so the saved name shows; the contract refuses that label and takes the rest', () => {
  const takes = (label: string) => schemaProblems(REQUEST, { files: [{ path: 'a', label }] }).length === 0;
  for (const name of ['\u200b', '\ufeff', '\u00a0', '\u00ad', '\u2060', '\u3164', '\ufe0f', ' \u200b ', '\u{e0020}', '\u2800', '\u034f']) {
    assert.equal(fileLabel(name), undefined, JSON.stringify(name));
    assert.equal(takes(name), false, JSON.stringify(name));
  }
  for (const name of ['a', '\u200ba', 'é', '写真', '😀', 'ا']) {
    assert.equal(fileLabel(name), name, JSON.stringify(name));
    assert.equal(takes(name), true, JSON.stringify(name));
  }
});
