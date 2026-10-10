// packages/client without a server (api.md 4): requests are built from the route table, problems
// are parsed into ApiProblem, and a missing path parameter is refused before any request.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPERATIONS } from '../../format/src/index.ts';
import { ApiProblem, buildRequest, createClient, urlFor } from '../src/index.ts';

const BASE = 'http://127.0.0.1:4466';

/** A fetch that records what it was asked and answers with `answer`. */
function fake(answer: () => Response) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetch = (async (url: string | URL | Request, init: RequestInit = {}) => {
    calls.push({ url: String(url), init });
    return answer();
  }) as typeof globalThis.fetch;
  return { calls, fetch };
}

const json = (body: unknown, status = 200, type = 'application/json; charset=utf-8') =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers: { 'Content-Type': type } });

test('every operation in the route table builds a request with its method and path', () => {
  for (const [id, op] of Object.entries(OPERATIONS)) {
    const input = Object.fromEntries(op.pathParams.map((p) => [p, p === 'n' ? 7 : 'x-1']));
    const r = buildRequest(BASE, id as keyof typeof OPERATIONS, op.method === 'GET' ? input : { ...input, body: {} });
    const path = op.path.replace(/\{n\}/, '7').replace(/\{[^}]+\}/g, 'x-1');
    assert.deepEqual([r.method, r.url], [op.method, `${BASE}${path}`], id);
  }
});

test('path parameters are encoded, the other inputs become the query, a GET has no body', () => {
  const r = buildRequest(BASE, 'show_node', { board: 'a b/c', n: 3, linked: true });
  assert.equal(r.url, `${BASE}/api/boards/a%20b%2Fc/nodes/3?linked=true`);
  assert.equal(r.body, undefined);
  assert.equal(r.headers['Content-Type'], undefined);
  assert.equal(r.headers.Accept, 'application/json, application/problem+json');
  assert.equal(urlFor('', 'check_responses', { board: 'roadmap', after: 4, limit: undefined, wait: 0 }), '/api/boards/roadmap/responses?after=4&wait=0');
});

test('a write sends its body as JSON, and the secret as a Bearer header', () => {
  const r = buildRequest(BASE, 'act', { board: 'roadmap', body: { type: 'act', action: 'ack', n: 1, ver: 1 } }, { secret: 's3cret' });
  assert.deepEqual([r.method, r.url], ['POST', `${BASE}/api/boards/roadmap/act`]);
  assert.equal(r.headers['Content-Type'], 'application/json');
  assert.equal(r.headers.Authorization, 'Bearer s3cret');
  assert.deepEqual(JSON.parse(r.body!), { type: 'act', action: 'ack', n: 1, ver: 1 });
  assert.equal(buildRequest(BASE, 'list_boards').headers.Authorization, undefined);
  assert.equal(buildRequest(BASE, 'read_ledger', {}, { accept: 'application/jsonl' }).headers.Accept, 'application/jsonl');
});

test('a folder is sent as VB-Project, percent-encoded so the header stays ASCII; none, no header', () => {
  assert.equal(buildRequest(BASE, 'list_boards', {}, { project: '/home/example/my projects/café' }).headers['VB-Project'], '/home/example/my%20projects/caf%C3%A9');
  assert.equal(buildRequest(BASE, 'list_boards').headers['VB-Project'], undefined);
});

test('a missing path parameter, a body on a GET or an unknown operation is refused before any request', async () => {
  const { calls, fetch } = fake(() => json({}));
  const client = createClient({ base: BASE, fetch });
  for (const [id, input] of [['get_board', {}], ['show_node', { board: 'roadmap' }], ['act', { board: '', body: {} }]] as const) {
    await assert.rejects(client.call(id, input), (err: unknown) =>
      err instanceof ApiProblem && err.code === 'bad-request' && err.status === 400 && /is part of the path/.test(err.detail));
  }
  await assert.rejects(client.call('list_boards', { body: {} }), /takes no body/);
  await assert.rejects(client.call('nope' as 'list_boards'), /no operation "nope"/);
  assert.equal(calls.length, 0);
});

test('call sends what buildRequest built, same-origin credentials included, and returns the parsed body', async () => {
  const { calls, fetch } = fake(() => json({ boards: [], head: 0 }));
  const client = createClient({ base: `${BASE}/`, secret: 'abc', fetch });
  assert.deepEqual(await client.call('list_boards'), { boards: [], head: 0 });
  assert.equal(calls[0]!.url, `${BASE}/api/boards`);
  assert.equal(calls[0]!.init.credentials, 'same-origin');
  assert.equal((calls[0]!.init.headers as Record<string, string>).Authorization, 'Bearer abc');
  assert.equal(client.url('get_board', { board: 'roadmap' }), `${BASE}/api/boards/roadmap`);
});

test('JSON Lines come back as a list', async () => {
  const { fetch } = fake(() => json('{"seq":1}\n{"seq":2}\n', 200, 'application/jsonl'));
  const client = createClient({ base: BASE, fetch });
  assert.deepEqual(await client.call('read_ledger', {}, { accept: 'application/jsonl' }), [{ seq: 1 }, { seq: 2 }]);
});

test('a problem answer is thrown as an ApiProblem with every field', async () => {
  const doc = {
    type: 'https://vision-board.invalid/problems/conflict', title: 'Conflict', status: 409,
    detail: 'Node 4 is at version 3.', ver: 3, errors: [{ pointer: '/items/0/base', detail: 'stale' }],
  };
  const { fetch } = fake(() => json(doc, 409, 'application/problem+json'));
  const err = await createClient({ base: BASE, fetch }).call('get_board', { board: 'x' }).catch((e: unknown) => e);
  assert.ok(err instanceof ApiProblem);
  assert.deepEqual([err.code, err.status, err.title, err.detail, err.message, err.ver], ['conflict', 409, 'Conflict', doc.detail, doc.detail, 3]);
  assert.deepEqual(err.errors, doc.errors);
  assert.equal(err.board, undefined);
});

test('an error answer that is not a problem becomes server-error with its status', async () => {
  const { fetch } = fake(() => new Response('<html>Bad gateway</html>', { status: 502, headers: { 'Content-Type': 'text/html' } }));
  const err = await createClient({ base: BASE, fetch }).call('list_boards').catch((e: unknown) => e);
  assert.ok(err instanceof ApiProblem);
  assert.deepEqual([err.code, err.status], ['server-error', 502]);
  assert.deepEqual(err.errors, []);
});

test('watch: parsed data per named event, onOpen on every (re)connect, and a stop that closes', () => {
  class FakeSource extends EventTarget {
    static last: FakeSource;
    url: string;
    closed = false;
    constructor(url: string) { super(); this.url = url; FakeSource.last = this; }
    close() { this.closed = true; }
  }
  const g = globalThis as { EventSource?: unknown };
  const saved = g.EventSource;
  g.EventSource = FakeSource;
  try {
    const seen: unknown[] = [];
    let opened = 0;
    const stop = createClient({ base: BASE }).watch('watch_board', { board: 'roadmap' }, 'change', (d) => seen.push(d), () => { opened += 1; });
    const es = FakeSource.last;
    assert.equal(es.url, `${BASE}/api/boards/roadmap/events`);
    es.dispatchEvent(new Event('open'));
    es.dispatchEvent(Object.assign(new Event('change'), { data: '{"seq":7}' }));
    es.dispatchEvent(Object.assign(new Event('change'), { data: 'not json' }));
    es.dispatchEvent(new Event('open'));
    assert.deepEqual(seen, [{ seq: 7 }]);
    assert.equal(opened, 2);
    stop();
    assert.equal(es.closed, true);
  } finally {
    g.EventSource = saved;
  }
});

test('watch: several named events on one stream, each with its name', () => {
  class FakeSource extends EventTarget {
    static last: FakeSource;
    url: string;
    constructor(url: string) { super(); this.url = url; FakeSource.last = this; }
    close() { /* nothing to close */ }
  }
  const g = globalThis as { EventSource?: unknown };
  const saved = g.EventSource;
  g.EventSource = FakeSource;
  try {
    const seen: [unknown, string][] = [];
    createClient({ base: BASE }).watch('watch_project', {}, ['change', 'build'], (d, name) => seen.push([d, name]));
    const es = FakeSource.last;
    assert.equal(es.url, `${BASE}/api/events`);
    es.dispatchEvent(Object.assign(new Event('build'), { data: '{"build":"a-1"}' }));
    es.dispatchEvent(Object.assign(new Event('change'), { data: '{"seq":3}' }));
    es.dispatchEvent(Object.assign(new Event('other'), { data: '{}' }));
    assert.deepEqual(seen, [[{ build: 'a-1' }, 'build'], [{ seq: 3 }, 'change']]);
  } finally {
    g.EventSource = saved;
  }
});
