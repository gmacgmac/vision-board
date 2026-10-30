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
