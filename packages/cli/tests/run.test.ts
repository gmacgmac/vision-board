// Whole invocations against a stub server: the request each command builds, the output, and the
// exit codes (0 done, 1 the call failed, 2 the arguments were wrong). join, request-grant and
// write-board are tested here only (their server side lands separately).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exec, json, problem } from './exec.ts';

test('a read: GET to the default server, the JSON answer on stdout, exit 0', async () => {
  const r = await exec(['list-boards'], { answers: [json({ boards: [], head: 0 })] });
  assert.equal(r.code, 0);
  assert.deepEqual(JSON.parse(r.out), { boards: [], head: 0 });
  assert.equal(r.err, '');
  assert.deepEqual(r.requests.map((q) => [q.method, q.url]), [['GET', 'http://127.0.0.1:4466/api/boards']]);
});

test('path and query inputs build the URL: check-responses --wait 60 is the wait loop', async () => {
  const r = await exec(['check-responses', '--board', 'pricing', '--after', '5', '--wait', '60']);
  assert.equal(r.code, 0);
  assert.equal(r.requests[0]!.url, 'http://127.0.0.1:4466/api/boards/pricing/responses?after=5&wait=60');
  const node = await exec(['show-node', '--board', 'pricing', '--n', '18', '--linked']);
  assert.equal(node.requests[0]!.url, 'http://127.0.0.1:4466/api/boards/pricing/nodes/18?linked=true');
});

test('the server comes from --server, then VB_SERVER, then the default', async () => {
  const env = { VB_SERVER: 'http://env.example:9/' };
  assert.equal((await exec(['list-boards'], { env })).requests[0]!.url, 'http://env.example:9/api/boards');
  assert.equal((await exec(['list-boards', '--server', 'http://flag.example:1'], { env })).requests[0]!.url, 'http://flag.example:1/api/boards');
});

test('the secret comes from --secret, then VB_AGENT_SECRET, and goes out as a Bearer token', async () => {
  const env = { VB_AGENT_SECRET: 'from-env' };
  assert.equal((await exec(['list-boards'], { env })).requests[0]!.headers.Authorization, 'Bearer from-env');
  assert.equal((await exec(['list-boards', '--secret', 'from-flag'], { env })).requests[0]!.headers.Authorization, 'Bearer from-flag');
  assert.equal((await exec(['list-boards'])).requests[0]!.headers.Authorization, undefined);
});

test('the project folder goes out as VB-Project (D-039); none, no header', async () => {
  assert.equal((await exec(['list-boards'], { project: '/work/projects/a' })).requests[0]!.headers['VB-Project'], '/work/projects/a');
  assert.equal((await exec(['list-boards'])).requests[0]!.headers['VB-Project'], undefined);
});

test('--text prints key: value lines through the generic formatter', async () => {
  const r = await exec(['list-boards', '--text'], { answers: [json({ boards: [{ board: 'roadmap', seq: 51 }], head: 51 })] });
  assert.equal(r.out, 'boards[0].board: roadmap\nboards[0].seq: 51\nhead: 51\n');
});

test('the open ledger prints beside the open folder, as the server names them (D-084 3, api.md 117)', async () => {
  const where = { project: '~/projects/multi', ledger: 'ui' };
  const listed = await exec(['list-boards', '--text'], { answers: [json({ ...where, boards: [], head: 0 })] });
  assert.equal(listed.out, 'project: ~/projects/multi\nledger: ui\nboards: []\nhead: 0\n');
  const joined = await exec(['join', '--label', 'A'], { answers: [json({ agent: 'a-k3m9x2pq', secret: 's', ...where }, 201)] });
  assert.deepEqual(JSON.parse(joined.out), { agent: 'a-k3m9x2pq', secret: 's', ...where });
});

test('a problem prints its detail and each error\'s pointer and detail to stderr, exit 1, nothing on stdout', async () => {
  const r = await exec(['get-board', '--board', 'nope'], {
    answers: [problem('bad-request', 400, 'Two things are wrong.', [{ pointer: '/items/0/node/title', detail: 'Give it a title.' }, { pointer: '', detail: 'Whole body.' }])],
  });
  assert.equal(r.code, 1);
  assert.equal(r.out, '');
  assert.equal(r.err, 'Two things are wrong.\n  /items/0/node/title: Give it a title.\n  /: Whole body.\n');
});

test('no answer at all is exit 1 with the address and the reason', async () => {
  const dropped: typeof fetch = async () => { throw new TypeError('fetch failed', { cause: new Error('connect ECONNREFUSED 127.0.0.1:4466') }); };
  const r = await exec(['list-boards'], { fetch: dropped });
  assert.equal(r.code, 1);
  assert.equal(r.err, 'Could not get an answer from http://127.0.0.1:4466: connect ECONNREFUSED 127.0.0.1:4466\n');
});

test('join sends {label}; request-grant sends its fields; neither needs a path', async () => {
  const join = await exec(['join', '--label', 'Pricing chat'], { answers: [json({ agent: 'a-k3m9x2pq', secret: 's' }, 201)] });
  assert.equal(join.code, 0);
  assert.deepEqual([join.requests[0]!.method, join.requests[0]!.url, join.requests[0]!.body], ['POST', 'http://127.0.0.1:4466/api/agents', { label: 'Pricing chat' }]);
  const grant = await exec(['request-grant', '--board', 'roadmap', '--region', 'review', '--reason', 'I need to update it.', '--key', 'k1'], { env: { VB_AGENT_SECRET: 's' } });
  assert.deepEqual(grant.requests[0]!.body, { board: 'roadmap', region: 'review', reason: 'I need to update it.', key: 'k1' });
  assert.equal(grant.requests[0]!.url, 'http://127.0.0.1:4466/api/grants');
});

test('write-board: the board in the path, the body from --json-body <file>, or - for stdin, or --items', async () => {
  const items = [{ type: 'node', node: { region: 'r', kind: 'note', title: 'T' } }];
  const file = await exec(['write-board', '--board', 'pricing', '--json-body', 'items.json'], { files: { 'items.json': JSON.stringify({ items }) } });
  assert.equal(file.code, 0, file.err);
  assert.deepEqual([file.requests[0]!.method, file.requests[0]!.url, file.requests[0]!.body], ['POST', 'http://127.0.0.1:4466/api/boards/pricing/write', { items }]);
  const stdin = await exec(['write-board', '--board', 'pricing', '--json-body', '-'], { stdin: JSON.stringify({ items }) });
  assert.deepEqual(stdin.requests[0]!.body, { items });
  const flag = await exec(['write-board', '--board', 'pricing', '--items', JSON.stringify(items)]);
  assert.deepEqual(flag.requests[0]!.body, { items });
});

test('request-grant: a body flag overrides the same field in --json-body', async () => {
  const r = await exec(['request-grant', '--json-body', '-', '--reason', 'flag wins'], { stdin: '{"board":"roadmap","region":"review","reason":"file"}' });
  assert.deepEqual(r.requests[0]!.body, { board: 'roadmap', region: 'review', reason: 'flag wins' });
});

test('help: exit 0 on stdout, from `help`, `--help`, `help <command>` and `<command> --help`', async () => {
  for (const argv of [['help'], ['--help'], ['-h']]) {
    const r = await exec(argv);
    assert.equal(r.code, 0);
    assert.match(r.out, /Commands:\n {2}list-boards/);
    assert.equal(r.requests.length, 0);
  }
  for (const argv of [['help', 'show-node'], ['show-node', '--help'], ['show-node', '-h']]) {
    const r = await exec(argv);
    assert.equal(r.code, 0);
    assert.match(r.out, /^vb show-node: /);
    assert.equal(r.requests.length, 0);
  }
});

test('bad arguments exit 2 with a plain message and a pointer to help, and send nothing', async () => {
  const cases: [string[], RegExp, Parameters<typeof exec>[1]?][] = [
    [[], /Commands:/],
    [['nope'], /There is no command "nope"\.\nRun `vb help`/],
    [['help', 'nope'], /There is no command "nope"/],
    [['show-node', '--board', 'r'], /show-node needs --n\.\nRun `vb show-node --help`/],
    [['show-node', '--n', 'x'], /--n must be a whole number/],
    [['list-boards', '--colour'], /Unknown flag --colour/],
    [['list-boards', '--server', 'not a url'], /must be an http or https address/],
    [['list-boards', '--server', 'ftp://x'], /must be an http or https address/],
    [['list-boards', '--json-body', '-'], /takes no body/],
    [['join', '--json-body', 'missing.json'], /cannot read missing\.json/],
    [['join', '--json-body', '-'], /is not JSON/, { stdin: 'nope' }],
    [['join', '--json-body', '-'], /must hold one JSON object/, { stdin: '[1]' }],
    [['join'], /join needs --label \(or a --json-body that has it\)/],
  ];
  for (const [argv, expected, setup] of cases) {
    const r = await exec(argv, setup);
    assert.equal(r.code, 2, argv.join(' '));
    assert.match(r.err, expected, argv.join(' '));
    assert.equal(r.out, '');
    assert.equal(r.requests.length, 0, argv.join(' '));
  }
});
