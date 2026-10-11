// A real round trip: `vb` reads from a real board server (the API harness, started as a child
// process on a free port over the roadmap fixture, since packages may not import apps). Only
// reads are tried here; join, request-grant and write-board are covered against a stub in
// run.test.ts.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { run } from '../src/index.ts';

const SERVER = fileURLToPath(new URL('../../../apps/board/tests/serve-fixture.ts', import.meta.url));
let child: ChildProcess;
let base = '';

before(async () => {
  child = spawn(process.execPath, [SERVER], { stdio: ['pipe', 'pipe', 'inherit'] });
  base = await new Promise<string>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`the fixture server exited (${code}) before it was ready`)));
    child.stdout!.once('data', (chunk: Buffer) => resolve(String(chunk).trim()));
  });
});

after(async () => {
  child.removeAllListeners('exit');
  const closed = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  child.stdin!.end();
  await closed;
});

async function vb(...argv: string[]): Promise<{ code: number; out: string; err: string }> {
  const r = { code: -1, out: '', err: '' };
  r.code = await run([...argv, '--server', base], {
    stdout: (t) => { r.out += t; }, stderr: (t) => { r.err += t; },
    readStdin: async () => '', readFile: () => '', env: {},
  });
  return r;
}

test('list-boards: the project\'s boards and the ledger head', async () => {
  const r = await vb('list-boards');
  assert.equal(r.code, 0, r.err);
  const answer = JSON.parse(r.out) as { boards: { board: string }[]; head: number };
  assert.deepEqual(answer.boards.map((b) => b.board), ['roadmap', 'pricing']);
  assert.ok(answer.head > 0);
});

test('get-board: one board as it is now', async () => {
  const r = await vb('get-board', '--board', 'pricing');
  assert.equal(r.code, 0, r.err);
  const answer = JSON.parse(r.out) as { view: { session: string; title: string }; head: number };
  assert.equal(answer.view.session, 'pricing');
  assert.equal(answer.view.title, 'Pricing options');
  assert.ok(answer.head > 0);
});

test('show-node: a node and its history, with --text giving the same facts as lines', async () => {
  const open = JSON.parse((await vb('list-open', '--board', 'pricing')).out) as { items: { n: number; title: string }[] };
  const first = open.items[0]!;
  const r = await vb('show-node', '--board', 'pricing', '--n', String(first.n));
  assert.equal(r.code, 0, r.err);
  assert.equal((JSON.parse(r.out) as { n: number }).n, first.n);
  const text = await vb('show-node', '--board', 'pricing', '--n', String(first.n), '--text');
  assert.ok(text.out.split('\n').includes(`n: ${first.n}`), text.out);
});

test('read-ledger is the page\'s, not an agent\'s: vb has no such command (api.md 130)', async () => {
  const r = await vb('read-ledger', '--limit', '2');
  assert.equal(r.code, 2);
  assert.match(r.err, /There is no command "read-ledger"/);
});

test('a real problem answer: an unknown board exits 1 with the server\'s own words', async () => {
  const r = await vb('get-board', '--board', 'no-such-board');
  assert.equal(r.code, 1);
  assert.equal(r.out, '');
  assert.ok(r.err.trim().length > 0 && r.err.includes('no-such-board'), r.err);
});

test('nothing listening: exit 1, not a crash', async () => {
  const r = { out: '', err: '' };
  const code = await run(['list-boards', '--server', 'http://127.0.0.1:1'], {
    stdout: (t) => { r.out += t; }, stderr: (t) => { r.err += t; }, readStdin: async () => '', readFile: () => '', env: {},
  });
  assert.equal(code, 1);
  assert.match(r.err, /^Could not get an answer from http:\/\/127\.0\.0\.1:1: /);
});
