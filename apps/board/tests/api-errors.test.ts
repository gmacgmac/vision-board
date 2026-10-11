// The dispatcher and the problems (api.md 28, 37-40, 53, 54): the handler table matches the
// route table, and every refusal is an RFC 9457 problem that fits the spec for its operation.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { OPERATIONS } from '../../../packages/format/src/index.ts';
import { createBoardServer } from '../server/app.ts';
import { HANDLERS } from '../server/handlers.ts';
import type { Ledger } from '../server/ledger.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Answer } from './openapi-ajv.ts';
import { checkAnswer, compileInline } from './openapi-ajv.ts';

let h: Harness;
before(async () => { h = await startBoard(); });
after(() => h.close());

const media = (r: Response) => (r.headers.get('content-type') ?? '').split(';')[0]!.trim();

/** A raw request (for what the client never sends), parsed as an Answer. */
async function raw(path: string, init: RequestInit = {}): Promise<Answer> {
  const res = await fetch(`${h.base}${path}`, init);
  const text = await res.text();
  return { status: res.status, headers: res.headers, media: media(res), body: text ? JSON.parse(text) : undefined };
}

/** A raw POST, as the board page sends it (with the person cookie). */
const json = (body: unknown, type = 'application/json'): RequestInit =>
  ({ method: 'POST', headers: { 'Content-Type': type, Cookie: h.cookie }, body: typeof body === 'string' ? body : JSON.stringify(body) });

test('the handler table has exactly one handler per operation of the route table (api.md 53)', () => {
  assert.deepEqual(Object.keys(HANDLERS).sort(), Object.keys(OPERATIONS).sort());
  for (const [id, fn] of Object.entries(HANDLERS)) assert.equal(typeof fn, 'function', id);
});

test('checkAnswer can fail: an undeclared status, a missing header, a body that does not fit', () => {
  const ok: Answer = { status: 200, headers: new Headers(), media: 'application/json', body: { project: '~/projects/example', boards: [], head: 0 } };
  checkAnswer('list_boards', ok);
  assert.throws(() => checkAnswer('list_boards', { ...ok, status: 404 }), /does not declare/);
  assert.throws(() => checkAnswer('list_boards', { ...ok, body: { project: '~/projects/example', boards: [], head: 0, extra: 1 } }), /list_boards 200/);
  assert.throws(() => checkAnswer('list_boards', { ...ok, media: 'text/plain' }), /not declared/);
  const p405 = { type: 'https://vision-board.invalid/problems/method-not-allowed', title: 'Method not allowed', status: 405, detail: 'No.' };
  assert.throws(() => checkAnswer('list_boards', { status: 405, headers: new Headers(), media: 'application/problem+json', body: p405 }), /Allow/);
});

test('an unknown path is not-found, as a problem', async () => {
  for (const path of ['/api/nope', '/api/boards/roadmap/nodes', '/api/boards/', '/api']) {
    const a = await raw(path);
    assert.deepEqual([a.status, a.media, (a.body as any).type], [404, 'application/problem+json', 'https://vision-board.invalid/problems/not-found'], path);
    assert.ok(compileInline({ $ref: '#/components/schemas/problem' })(a.body), path);
  }
});

test('a known path with the wrong method is method-not-allowed, with Allow', async () => {
  const a = await raw('/api/boards', json({}));
  assert.deepEqual([a.status, a.headers.get('allow'), (a.body as any).detail], [405, 'GET', 'This path answers GET only.']);
  checkAnswer('list_boards', a);
  const b = await raw('/api/boards/roadmap/act');
  assert.deepEqual([b.status, b.headers.get('allow')], [405, 'POST']);
  checkAnswer('act', b);
});

test('a bad id in the path, or a bad query, is bad-request (400)', async () => {
  const id = await h.fails('get_board', { board: 'Bad_Id' }, 400, 'bad-request');
  assert.match(id.detail, /^The board id in the path is not a valid id/);
  await h.fails('show_node', { board: 'roadmap', n: 0 }, 400, 'bad-request');
  await h.fails('show_node', { board: 'roadmap', n: 'one' }, 400, 'bad-request');
  const limit = await h.fails('read_ledger', { limit: 501 }, 400, 'bad-request');
  assert.match(limit.detail, /`limit` must be at most 500/);
  await h.fails('check_responses', { board: 'roadmap', wait: 61 }, 400, 'bad-request');
  await h.fails('show_node', { board: 'roadmap', n: 1, linked: 'yes' }, 400, 'bad-request');
  const unknown = await h.fails('list_open', { board: 'roadmap', after: 3 }, 400, 'bad-request');
  assert.match(unknown.detail, /Unknown query parameter `after`/);
  const twice = await raw('/api/ledger?after=1&after=2');
  assert.equal(twice.status, 400);
  checkAnswer('read_ledger', twice);
});

test('an unknown board is not-found (404) on every board operation', async () => {
  const p = await h.fails('get_board', { board: 'nope' }, 404, 'not-found');
  assert.equal(p.detail, 'There is no board "nope". Call list_boards to see the boards.');
  for (const id of ['list_open', 'check_responses', 'watch_board'] as const) {
    const a = await raw(`/api/boards/nope/${{ list_open: 'open', check_responses: 'responses', watch_board: 'events' }[id]}`);
    assert.equal(a.status, 404, id);
    checkAnswer(id, a);
  }
  await h.fails('act', { board: 'nope', body: { type: 'act', action: 'ack', n: 1, ver: 1 } }, 404, 'not-found');
});

test('a body that is not application/json is unsupported-media-type (415); charset=utf-8 is allowed', async () => {
  const act = { type: 'act', action: 'pin', n: 3, x: 1, y: 2 };
  for (const type of ['text/plain', 'application/json; charset=latin1', 'application/jsonx', 'application/json; foo=bar']) {
    const a = await raw('/api/boards/roadmap/act', json(act, type));
    assert.equal(a.status, 415, type);
    checkAnswer('act', a);
  }
  const noType = await raw('/api/boards/roadmap/act', { method: 'POST', headers: { Cookie: h.cookie }, body: new Uint8Array([123, 125]) });
  assert.equal(noType.status, 415);
  for (const type of ['application/json; charset=utf-8', 'Application/JSON;charset="UTF-8"']) {
    const a = await raw('/api/boards/roadmap/act', json(act, type));
    assert.equal(a.status, 201, type);
    checkAnswer('act', a);
  }
});

test('a body over 64 KiB is too-large (413); text that is not JSON is bad-request (400)', async () => {
  const big = await raw('/api/boards/roadmap/act', json({ type: 'act', action: 'comment', n: 1, ver: 1, text: 'x'.repeat(70 * 1024) }));
  assert.deepEqual([big.status, (big.body as any).detail], [413, 'The body is over the 64 KiB limit. Split the items across several calls.']);
  checkAnswer('act', big);
  const bad = await raw('/api/boards/roadmap/act', json('{"type":'));
  assert.equal(bad.status, 400);
  checkAnswer('act', bad);
});

test('an act carrying an extra key is invalid (422) with a pointer, and nothing is stored', async () => {
  const before = h.ledger.state().seq;
  const p = await h.fails('act', { board: 'roadmap', body: { type: 'act', action: 'ack', n: 1, ver: 1, title: 'Sneaky' } }, 422, 'invalid');
  assert.deepEqual(p.errors, [{ pointer: '/title', detail: 'unknown field `title`' }]);
  const stamped = await h.fails('act', { board: 'roadmap', body: { type: 'act', action: 'ack', n: 1, ver: 1, by: 'agent' } }, 422, 'invalid');
  assert.deepEqual(stamped.errors.map((e) => e.pointer), ['/by']);
  const noType = await h.fails('act', { board: 'roadmap', body: { action: 'ack', n: 1, ver: 1 } }, 422, 'invalid');
  assert.deepEqual(noType.errors.map((e) => e.pointer), ['/type']);
  // Context rules come back with pointers too: a card number the board has not given (api.md 125).
  const other = await h.fails('act', { board: 'roadmap', body: { type: 'act', action: 'ack', n: 999, ver: 2 } }, 422, 'invalid');
  assert.equal(other.errors[0]!.pointer, '/n');
  assert.equal(other.errors[0]!.detail, 'board roadmap has no card 999');
  const mode = await h.fails('act', { board: 'roadmap', body: { type: 'act', action: 'mode', board: 'pricing', region: 'options', mode: 'column' } }, 422, 'invalid');
  assert.equal(mode.errors[0]!.pointer, '/board');
  await h.fails('mark_seen', { board: 'roadmap', body: { n: 999, ver: 1 } }, 422, 'invalid');
  await h.fails('mark_seen', { board: 'roadmap', body: { n: 1, ver: 1, extra: true } }, 422, 'invalid');
  assert.equal(h.ledger.state().seq, before);
});

test('the ledger module checks every line against the stored-line schema first, so an extra field is never stored', () => {
  const before = h.ledger.state().seq;
  // The schema's wording ("unknown field `title`"), not the hand validator's ("title: unknown field").
  assert.throws(() => h.ledger.append({ type: 'act', action: 'ack', n: 1, ver: 1, title: 'Sneaky' }, { by: 'person' }),
    (err: any) => err.code === 'invalid' && err.body.errors.length === 1 &&
      err.body.errors[0].pointer === '/title' && err.body.errors[0].detail === 'unknown field `title`');
  // `by` comes from the route, so a schema refusal of it is told as the wrong caller.
  assert.throws(() => h.ledger.append({ type: 'seen', n: 1, ver: 1 }, { by: 'agent', agent: 'a-k3m9x2pq' }),
    (err: any) => err.body.errors.length === 1 && /^only the person can do this/.test(err.body.errors[0].detail));
  assert.throws(() => h.ledger.append({ type: 'reply', n: 1, text: 'Hi' }, { by: 'person' }),
    (err: any) => err.body.errors.length === 1 && err.body.errors[0].detail === 'only an agent writes a reply event');
  assert.equal(h.ledger.state().seq, before);
});

/** A request with headers fetch will not send (Host). */
function rawHttp(path: string, headers: Record<string, string>, method = 'GET', body?: string): Promise<{ status: number; body: any }> {
  const url = new URL(h.base);
  return new Promise((resolve, reject) => {
    const req = http.request({ host: url.hostname, port: url.port, path, method, headers }, (res) => {
      let text = '';
      res.on('data', (c) => { text += c; });
      res.on('end', () => resolve({ status: res.statusCode!, body: JSON.parse(text) }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

test('a wrong Host, or a write from another Origin, is forbidden (403); no Origin is fine', async () => {
  const host = await rawHttp('/api/boards', { Host: 'evil.example:80' });
  assert.deepEqual([host.status, host.body.type], [403, 'https://vision-board.invalid/problems/forbidden']);
  const body = JSON.stringify({ type: 'act', action: 'pin', n: 3, x: 5, y: 6 });
  const port = new URL(h.base).port;
  const origin = await rawHttp('/api/boards/roadmap/act', { Host: `127.0.0.1:${port}`, Origin: 'http://evil.example', 'Content-Type': 'application/json', Cookie: h.cookie }, 'POST', body);
  assert.equal(origin.status, 403);
  const same = await rawHttp('/api/boards/roadmap/act', { Host: `localhost:${port}`, Origin: `http://localhost:${port}`, 'Content-Type': 'application/json', Cookie: h.cookie }, 'POST', body);
  assert.equal(same.status, 201);
});

test('anything unexpected is server-error (500) with a fixed detail; the stack goes to stderr only', async () => {
  const broken = { state() { throw new Error('secret internals at /home/x'); } } as unknown as Ledger;
  const server = createBoardServer({ ledger: broken, dist: '/nonexistent' });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const port = (server.address() as { port: number }).port;
  const logged: unknown[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => { logged.push(args); };
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/boards`);
    const body = await res.json() as any;
    checkAnswer('list_boards', { status: res.status, headers: res.headers, media: media(res), body });
    assert.equal(body.detail, 'Something went wrong on the server. Try again; if it keeps failing, tell the person.');
    assert.doesNotMatch(JSON.stringify(body), /secret|home/);
    assert.equal(logged.length, 1);
  } finally {
    console.error = original;
    server.close();
  }
});
