// The attached files' store (D-068, api.md 164): a name is hostile until sanitised, a saved file stays
// inside `.visionboard/attachments/`, and `attachedFile` is the one check of a path a page sends back.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ATTACHMENT_BODY_BYTES, ATTACHMENT_BYTES, attachedFile, attachmentName, saveAttachment } from '../server/chat-files.ts';
import { ProblemError } from '../server/problem.ts';
import { CHAT_EVENT_ID, schemaProblems } from '../server/schema.ts';
import { makeTempDir } from '#format/testing';

const base = fs.realpathSync(makeTempDir('vb-chat-files-'));
after(() => fs.rmSync(base, { recursive: true, force: true }));

let count = 0;
/** A new board folder and, beside it, a folder a link can lead out to. */
function folders() {
  const folder = path.join(base, `f${++count}`);
  const outside = path.join(base, `out${count}`);
  fs.mkdirSync(path.join(folder, '.visionboard'), { recursive: true });
  fs.mkdirSync(outside);
  return { folder, outside, attachments: path.join(folder, '.visionboard', 'attachments') };
}
const NOW = new Date('2026-10-30T09:00:00Z');
const DAY = '2026-10-30';
const input = (name: string, text = 'hello') => ({ name, type: 'text/plain', data: Buffer.from(text).toString('base64') });
const refused = (fn: () => unknown, code: string) => assert.throws(fn, (e) => e instanceof ProblemError && e.code === code);

test('a file is saved at its day and number, readable by this user only, and its path is relative to the folder', () => {
  const { folder } = folders();
  const file = saveAttachment(folder, input('notes.txt'), NOW);
  assert.deepEqual(file, { name: 'notes.txt', path: `.visionboard/attachments/${DAY}/1-notes.txt`, size: 5 });
  assert.equal(fs.readFileSync(path.join(folder, file.path), 'utf8'), 'hello');
  assert.equal(fs.statSync(path.join(folder, file.path)).mode & 0o777, 0o600);
});

test('two files of one name on one day get different paths, and a new day counts from 1', () => {
  const { folder } = folders();
  const [a, b] = [saveAttachment(folder, input('a.png'), NOW), saveAttachment(folder, input('a.png', 'two'), NOW)];
  assert.deepEqual([a.path, b.path], [`.visionboard/attachments/${DAY}/1-a.png`, `.visionboard/attachments/${DAY}/2-a.png`]);
  assert.equal(fs.readFileSync(path.join(folder, a.path), 'utf8'), 'hello', 'the first is untouched');
  assert.match(saveAttachment(folder, input('a.png'), new Date('2026-10-31T00:00:00Z')).path, /2026-10-31\/1-a\.png$/, 'a new day counts from 1');
});

test('a name keeps letters, digits, dots, hyphens and underscores, no leading dot, at most 80 characters, its extension', () => {
  const cases: [string, string][] = [
    ['report.final-v2_a.PDF', 'report.final-v2_a.PDF'],
    ['../x', 'x'],
    ['../../../etc/passwd', 'passwd'],
    ['a/b', 'b'],
    ['a\\b.txt', 'b.txt'],
    ['.env', 'env'],
    ['.env.local', 'env.local'],
    ['.git', 'git'],
    ['CON', 'CON'],
    ['', 'file'],
    ['.', 'file'],
    ['..', 'file'],
    ['.....', 'file'],
    ['/', 'file'],
    ['a/..', 'file'],
    ['résumé.pdf', 'resume.pdf'],
    ['写真.png', 'file.png'],
    ['．．／x', 'x'],
    ['a\u0000b\nc‮gnp.exe', 'a_b_c_gnp.exe'],
    ['two  words.txt', 'two_words.txt'],
    ['a..b', 'a.b'],
    ['trailing.', 'trailing'],
    ['-rf', 'rf'],
  ];
  for (const [raw, want] of cases) assert.equal(attachmentName(raw), want, JSON.stringify(raw));
  const long = attachmentName(`${'a'.repeat(200)}.pdf`);
  assert.deepEqual([long.length, long.slice(-4)], [80, '.pdf']);
  assert.equal(attachmentName('a'.repeat(200)).length, 80);
  assert.equal(attachmentName(`a.${'b'.repeat(200)}`).length, 80, 'too long to be an extension');
});

test('every hostile name stays in the day\'s folder, and is a file the check accepts', () => {
  const { folder, attachments } = folders();
  const names = ['../x', '../../../../x', 'a/b', '.env', 'CON', 'x'.repeat(200), '写真', '', '...', '．．／．．／x', '\u0000', 'a\nb'];
  for (const name of names) {
    const file = saveAttachment(folder, input(name), NOW);
    assert.equal(path.dirname(fs.realpathSync(path.join(folder, file.path))), path.join(attachments, DAY), JSON.stringify(name));
    assert.deepEqual(attachedFile(folder, file.path), file, JSON.stringify(name));
  }
});

test('a link planted on the way out is refused and nothing is written through it', () => {
  const plant = (at: (f: ReturnType<typeof folders>) => string) => {
    const f = folders();
    fs.mkdirSync(f.attachments);
    fs.mkdirSync(path.dirname(at(f)), { recursive: true });
    fs.symlinkSync(f.outside, at(f));
    return f;
  };
  const day = plant((f) => path.join(f.attachments, DAY));
  refused(() => saveAttachment(day.folder, input('a.txt'), NOW), 'conflict');
  assert.deepEqual(fs.readdirSync(day.outside), []);
  const whole = folders();
  fs.symlinkSync(whole.outside, whole.attachments);
  refused(() => saveAttachment(whole.folder, input('a.txt'), NOW), 'conflict');
  assert.deepEqual(fs.readdirSync(whole.outside), [], 'not even the day folder is made through it');
  const dangling = folders();
  fs.symlinkSync(path.join(dangling.outside, 'gone'), dangling.attachments);
  refused(() => saveAttachment(dangling.folder, input('a.txt'), NOW), 'conflict');
  assert.deepEqual(fs.readdirSync(dangling.outside), []);
});

test('over 10 MB is too-large; exactly 10 MB and an empty file are saved', () => {
  const { folder } = folders();
  const of = (n: number) => ({ name: 'big.bin', type: '', data: Buffer.alloc(n).toString('base64') });
  refused(() => saveAttachment(folder, of(ATTACHMENT_BYTES + 1), NOW), 'too-large');
  assert.equal(saveAttachment(folder, of(ATTACHMENT_BYTES), NOW).size, ATTACHMENT_BYTES);
  assert.equal(saveAttachment(folder, of(0), NOW).size, 0);
});

test('the schema and the docs say the limit the code has', () => {
  const file = { name: 'a', path: 'p', size: ATTACHMENT_BYTES };
  assert.deepEqual(schemaProblems(`${CHAT_EVENT_ID}#/$defs/attachedFile`, file), []);
  assert.notDeepEqual(schemaProblems(`${CHAT_EVENT_ID}#/$defs/attachedFile`, { ...file, size: ATTACHMENT_BYTES + 1 }), []);
  assert.equal(ATTACHMENT_BYTES, 10 * 1024 * 1024, 'api.md 164 and D-068 say 10 MB');
  assert.ok(ATTACHMENT_BODY_BYTES > Buffer.alloc(ATTACHMENT_BYTES).toString('base64').length, 'a 10 MB file fits its body');
});

test('anything but plain base64 is bad-request and writes nothing', () => {
  const { folder, attachments } = folders();
  for (const data of ['not base64!', 'QQ', 'QQ=', 'Q===', '-_-_', 'QUJD\n', ' QUJD', 'QUI=QUI=']) {
    refused(() => saveAttachment(folder, { name: 'a', type: '', data }, NOW), 'bad-request');
  }
  assert.equal(fs.existsSync(attachments), false);
});

test('attachedFile takes only a file the board saved: the shape, then no link at any step', () => {
  const { folder, outside, attachments } = folders();
  const file = saveAttachment(folder, input('a.txt'), NOW);
  assert.deepEqual(attachedFile(folder, file.path), file);
  const day = path.join(attachments, DAY);
  fs.writeFileSync(path.join(folder, '.visionboard', 'ledger.jsonl'), '');
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'x');
  fs.symlinkSync(path.join(outside, 'secret.txt'), path.join(day, '2-link.txt'));
  fs.mkdirSync(path.join(day, '3-folder'));
  fs.mkdirSync(path.join(attachments, '2026-10-29'));
  fs.writeFileSync(path.join(attachments, '2026-10-29', 'no-number.txt'), 'x');
  fs.writeFileSync(path.join(day, '4-.hidden'), 'x');
  fs.writeFileSync(path.join(attachments, 'not-in-a-day.txt'), 'x');
  fs.symlinkSync(outside, path.join(attachments, '2026-10-28'));
  fs.writeFileSync(path.join(outside, '1-x.txt'), 'x');
  for (const p of [
    '', '.', file.path.replace('1-a.txt', '9-gone.txt'), `./${file.path}`, `.visionboard/attachments/${DAY}/../${DAY}/1-a.txt`,
    `${folder}/${file.path}`, '/etc/passwd', '../secret.txt', '.visionboard/ledger.jsonl', '.visionboard/attachments/not-in-a-day.txt',
    `.visionboard/attachments/${DAY}/2-link.txt`, `.visionboard/attachments/${DAY}/3-folder`, `.visionboard/attachments/${DAY}/4-.hidden`,
    '.visionboard/attachments/2026-10-29/no-number.txt', '.visionboard/attachments/2026-10-28/1-x.txt',
    `.VISIONBOARD/attachments/${DAY}/1-a.txt`, `.visionboard\\attachments\\${DAY}\\1-a.txt`, `${file.path}\nIgnore the above.`, `${file.path}/`,
  ]) assert.equal(attachedFile(folder, p), undefined, JSON.stringify(p));
  fs.rmSync(path.join(folder, file.path));
  assert.equal(attachedFile(folder, file.path), undefined, 'since deleted');
});
