// Attaching a file to a chat message, over HTTP with the fake CLI (D-068, api.md 164): the operation, the
// refusals `send_chat` gives a path it did not save, the prompt's one block, `message_in.files`, and the flag.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ATTACHMENT_BYTES } from '../server/chat-files.ts';
import { CHAT_EVENT_ID, schemaProblems } from '../server/schema.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Event } from './chat-support.ts';
import { fakeChat, readChat } from './chat-support.ts';
import { makeTempDir } from '#format/testing';

const config = makeTempDir('vb-chat-files-api-');
const fake = fakeChat(config);
let h: Harness;
before(async () => { h = await startBoard({ chat: { adapters: fake.adapters } }); });
after(async () => { await h.close(); fs.rmSync(config, { recursive: true, force: true }); });

const HEAD = 'The person attached these files:';
const attach = (name: string, text = 'hello', on = h) => on.ok('attach_chat_file', { body: { name, type: 'text/plain', data: Buffer.from(text).toString('base64') } });
const turns = (n: number) => (events: Event[]) => events.filter((e) => e.kind === 'system' && e.turn !== undefined).length >= n;
const pointers = (err: { errors: { pointer: string }[] }) => err.errors.map((e) => e.pointer);

test('a file is saved and its path returned, as a person\'s operation only', async () => {
  const { file } = await attach('../../notes.txt');
  assert.equal(h.last().status, 201);
  assert.match(file.path, /^\.visionboard\/attachments\/\d{4}-\d{2}-\d{2}\/\d+-notes\.txt$/);
  assert.deepEqual([file.name, file.size], ['notes.txt', 5]);
  assert.equal(fs.readFileSync(path.join(h.project, file.path), 'utf8'), 'hello');
  const agent = await h.join('Agent');
  await h.fails('attach_chat_file', { body: { name: 'x', type: '', data: '' } }, 403, 'forbidden', agent.client);
  assert.notEqual((await attach('notes.txt')).file.path, file.path, 'a second of one name');
});

test('the board never serves an attached file: the path answers POST only', async () => {
  const res = await fetch(`${h.base}/api/chat/files`, { headers: { Cookie: h.cookie } });
  assert.deepEqual([res.status, res.headers.get('allow')], [405, 'POST']);
});

test('10 MB + 1 byte, and a body over the limit, are 413 in the file\'s words; bad base64 is 400; a bad body 422', async () => {
  const big = (n: number) => ({ body: { name: 'big.bin', type: '', data: Buffer.alloc(n).toString('base64') } });
  const near = await h.fails('attach_chat_file', big(ATTACHMENT_BYTES + 1), 413, 'too-large');
  const far = await h.fails('attach_chat_file', big(ATTACHMENT_BYTES * 2), 413, 'too-large');
  assert.equal(near.detail, far.detail);
  assert.match(near.detail, /10 MB/);
  await h.fails('attach_chat_file', { body: { name: 'a', type: '', data: 'not base64!' } }, 400, 'bad-request');
  await h.fails('attach_chat_file', { body: { name: 'a', data: '' } as never }, 422, 'invalid');
  await h.fails('attach_chat_file', { body: { name: 'a', type: '', data: '', extra: 1 } as never }, 422, 'invalid');
});

test('send_chat refuses a path it did not save, one outside, and one since deleted, each by its index, and nothing runs', async () => {
  const { session } = await h.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } });
  const good = (await attach('good.txt')).file;
  const gone = (await attach('gone.txt')).file;
  fs.rmSync(path.join(h.project, gone.path));
  const ran = fake.given().length;
  const err = await h.fails('send_chat', { session, body: { text: 'Look', files: [good.path, '.visionboard/attachments/2026-10-30/9-made-up.txt', '../outside.txt', gone.path, '.visionboard/ledger.jsonl'] } }, 422, 'invalid');
  assert.deepEqual(pointers(err), ['/files/1', '/files/2', '/files/3', '/files/4']);
  const many = Array.from({ length: 11 }, (_, i) => `.visionboard/attachments/2026-10-30/${i + 1}-a.txt`);
  const eleven = await h.fails('send_chat', { session, body: { text: 'Look', files: many } }, 422, 'invalid');
  assert.deepEqual(pointers(eleven), ['/files']);
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(fake.given().length, ran, 'no turn started');
});

test('the prompt carries the block once, after the words and before the board\'s blocks; message_in keeps the files', async () => {
  const { session } = await h.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } });
  const [a, b] = [(await attach('a.pdf')).file, (await attach('b.png')).file];
  const seen = fake.given().length;
  const sent = await h.ok('send_chat', { session, body: { text: 'Read these', files: [a.path, b.path], cards: [h.seeded.q] } });
  const run = await fake.run(seen + 1);
  const parts = run.prompt.split('\n\n');
  assert.equal(parts[0], 'Read these');
  assert.equal(parts[1], `${HEAD}\n${a.path}\n${b.path}`);
  assert.match(parts[2]!, /^The person selected these cards:/);
  assert.equal(parts.at(-1), 'Board: pricing');
  assert.equal(run.prompt.split(HEAD).length, 2, 'once');
  assert.deepEqual(sent.files, [a, b]);
  assert.deepEqual(schemaProblems(CHAT_EVENT_ID, sent), []);
  await readChat(h.base, h.cookie, session, turns(1));
});

test('a message of files alone goes, and says so in the feed; with none, no block', async () => {
  const { session } = await h.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } });
  const { file } = await attach('only.txt');
  const seen = fake.given().length;
  const sent = await h.ok('send_chat', { session, body: { files: [file.path] } });
  assert.equal((await fake.run(seen + 1)).prompt.split('\n\n')[0], `${HEAD}\n${file.path}`);
  assert.deepEqual([sent.text, sent.files], ['Attached files.', [file]]);
  await readChat(h.base, h.cookie, session, turns(1));
  const plain = await h.ok('send_chat', { session, body: { text: 'No files' } });
  assert.ok(!('files' in plain));
  assert.ok(!(await fake.run(seen + 2)).prompt.includes(HEAD));
});

test('a session in the folder takes files too, before it is told no board is open', async () => {
  const { session } = await h.ok('start_folder_chat', { body: { agent: 'claude' } });
  const { file } = await attach('folder.txt');
  const seen = fake.given().length;
  const sent = await h.ok('send_chat', { session, body: { files: [file.path] } });
  const parts = (await fake.run(seen + 1)).prompt.split('\n\n');
  assert.equal(parts[0], `${HEAD}\n${file.path}`);
  assert.match(parts[1]!, /^No board is open/);
  assert.deepEqual([sent.text, sent.files], ['Attached files.', [file]]);
  await readChat(h.base, h.cookie, session, turns(1));
});

test('a message that waits for the turn to end keeps its files, joined with the next message\'s, each once', async () => {
  const { session } = await h.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } });
  const [a, b] = [(await attach('wait-a.txt')).file, (await attach('wait-b.txt')).file];
  const seen = fake.given().length;
  fake.mode('hang');
  await h.ok('send_chat', { session, body: { text: 'First' } });
  await fake.run(seen + 1);
  fake.mode('replay');
  await h.ok('send_chat', { session, body: { text: 'One', files: [a.path] } });
  await h.ok('send_chat', { session, body: { text: 'Two', files: [a.path, b.path] } });
  await h.ok('stop_chat', { session });
  const { prompt } = await fake.run(seen + 2);
  assert.ok(prompt.startsWith(`One\n\nTwo\n\n${HEAD}\n${a.path}\n${b.path}\n\n`), prompt);
  const events = await readChat(h.base, h.cookie, session, (e) => e.filter((x) => x.kind === 'message_in').length >= 2);
  assert.deepEqual(events.filter((e) => e.kind === 'message_in').at(-1)!.files, [a, b]);
});

test('flag off: the operation is 404, files are refused, and a message without them is today\'s', async () => {
  const off = await startBoard({ chat: { adapters: fake.adapters }, flags: { chatAttachments: false } });
  try {
    await off.fails('attach_chat_file', { body: { name: 'a', type: '', data: '' } }, 404, 'not-found');
    assert.equal(fs.existsSync(path.join(off.project, '.visionboard', 'attachments')), false);
    const { session } = await off.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } });
    const err = await off.fails('send_chat', { session, body: { text: 'Look', files: ['.visionboard/attachments/2026-10-30/1-a.txt'] } }, 422, 'invalid');
    assert.deepEqual(pointers(err), ['/files']);
    const seen = fake.given().length;
    const sent = await off.ok('send_chat', { session, body: { text: 'Plain' } });
    assert.ok(!(await fake.run(seen + 1)).prompt.includes(HEAD));
    assert.ok(!('files' in sent));
    await readChat(off.base, off.cookie, session, turns(1));
  } finally { await off.close(); }
});
