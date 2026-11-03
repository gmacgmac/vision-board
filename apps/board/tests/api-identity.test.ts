// Callers and identity end to end (api.md 20-22, 25-28, 41): join and its stored hash, the 401s,
// the person cookie on person routes only, request_grant, the person's new acts, and scoped reads.
// Every call goes through packages/client and every answer is checked against openapi.json.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Answer } from './openapi-ajv.ts';
import { checkAnswer } from './openapi-ajv.ts';
import { ledgerFiles } from '#format';

let h: Harness;
before(async () => { h = await startBoard(); });
after(() => h.close());

const dataDir = () => path.dirname(h.ledger.file);
const agentsFile = () => ledgerFiles(dataDir()).agents;
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const ONLY_PERSON = 'Only the person can do this, on the board; send a propose or reply item instead.';

/** A raw request with exactly these headers, parsed as an Answer. */
async function raw(p: string, init: RequestInit): Promise<Answer> {
  const res = await fetch(`${h.base}${p}`, init);
  const text = await res.text();
  const media = (res.headers.get('content-type') ?? '').split(';')[0]!.trim();
  return { status: res.status, headers: res.headers, media, body: text ? JSON.parse(text) : undefined };
}

test('a stored hash with no join event is ignored (first, before the store is read)', async () => {
  const secret = 'x'.repeat(43);
  fs.writeFileSync(agentsFile(), JSON.stringify({ agents: [{ agent: 'a-zzzz9999', sha256: sha(secret) }] }));
  await h.fails('write_board', { board: 'pricing', body: { items: [{ type: 'board', title: 'X' }] } }, 401, 'not-authenticated', h.agent(secret));
});

test('the page is served with the person cookie: HttpOnly, SameSite=Strict, Path=/api', async () => {
  const res = await fetch(`${h.base}/`);
  const set = res.headers.get('set-cookie') ?? '';
  assert.match(set, /^vb_person=[A-Za-z0-9_-]{43}; HttpOnly; SameSite=Strict; Path=\/api$/);
  assert.equal(`${set.split(';')[0]}`, h.cookie, 'one cookie for the whole start');
  assert.doesNotMatch(await res.text(), /vb_person|[A-Za-z0-9_-]{43}/, 'never in the page body');
  const api = await fetch(`${h.base}/api/boards`);
  assert.equal(api.headers.get('set-cookie'), null);
});

let joined: Joined;
test('join: 201 with { agent, secret } once; only the hash is stored, git-ignored; the join line has the label', async () => {
  joined = await h.join('Pricing chat');
  assert.equal(h.last().status, 201);
  assert.match(joined.agent, /^a-[a-z0-9]{8}$/);
  assert.match(joined.secret, /^[A-Za-z0-9_-]{43}$/);
  const text = fs.readFileSync(agentsFile(), 'utf8');
  assert.equal(text.includes(joined.secret), false, 'the secret itself is never stored');
  assert.ok(JSON.parse(text).agents.some((x: any) => x.agent === joined.agent && x.sha256 === sha(joined.secret)));
  assert.match(fs.readFileSync(ledgerFiles(dataDir()).gitignore, 'utf8'), /^agents\.json$/m);
  const line = h.ledger.events().at(-1)!;
  assert.deepEqual(line.type === 'join' && [line.by, line.agent, line.label, 'key' in line], ['agent', joined.agent, 'Pricing chat', false]);
  const two = await h.join('Review chat');
  assert.notEqual(two.agent, joined.agent);
  assert.equal(JSON.parse(fs.readFileSync(agentsFile(), 'utf8')).agents.length, 3);
});

test('join: a key is not a join field; over 4 KB is too-large; a request with the person cookie is refused', async () => {
  const p = await h.fails('join', { body: { label: 'X', key: 'k' } }, 422, 'invalid');
  assert.deepEqual(p.errors.map((e) => e.pointer), ['/key']);
  const big = await h.fails('join', { body: { label: 'x'.repeat(5000) } }, 413, 'too-large');
  assert.equal(big.detail, 'The body is over the 4 KB limit. Split the items across several calls.');
  const cookie = await h.fails('join', { body: { label: 'X' } }, 403, 'forbidden', h.person);
  assert.doesNotMatch(cookie.detail, /cookie/i);
});

test('an agent write without a secret, or with one the server does not know, is 401 with WWW-Authenticate', async () => {
  const none = await h.fails('write_board', { board: 'pricing', body: { items: [] } }, 401, 'not-authenticated');
  assert.equal(h.last().headers.get('www-authenticate'), 'Bearer realm="vision-board"');
  assert.match(none.detail, /Authorization: Bearer/);
  const stranger = h.agent('y'.repeat(43));
  const unknown = await h.fails('request_grant', { body: { board: 'pricing', region: 'options', reason: 'x' } }, 401, 'not-authenticated', stranger);
  assert.equal(unknown.detail, 'The server does not know this secret. Call join again, then request_grant for each container you need; the person must approve again.');
  assert.equal(h.last().headers.get('www-authenticate'), 'Bearer realm="vision-board"');
  // A scoped read with an unknown secret is refused too, rather than answered unscoped.
  await h.fails('list_open', { board: 'pricing' }, 401, 'not-authenticated', stranger);
  await h.fails('check_responses', { board: 'pricing' }, 401, 'not-authenticated', stranger);
  const malformed = await raw('/api/boards/pricing/write', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Basic eDp5' }, body: '{"items":[]}' });
  assert.equal(malformed.status, 401);
  checkAnswer('write_board', malformed);
});

test('person routes need the page\'s cookie and refuse a Bearer; the refusal never names the cookie', async () => {
  const before = h.ledger.state().seq;
  const body = { type: 'act', action: 'send', board: 'pricing' };
  const asAgent = await h.fails('act', { board: 'pricing', body }, 403, 'forbidden', joined.client);
  assert.equal(asAgent.detail, ONLY_PERSON);
  await h.fails('act', { board: 'pricing', body }, 403, 'forbidden', h.client);
  await h.fails('mark_seen', { board: 'pricing', body: { n: h.seeded.q, ver: 1 } }, 403, 'forbidden', joined.client);
  // The page's cookie with a Bearer as well is refused: a person route never takes an agent's secret.
  const both = await raw('/api/boards/pricing/act', {
    method: 'POST', body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Cookie: h.cookie, Authorization: `Bearer ${joined.secret}` },
  });
  assert.equal(both.status, 403);
  checkAnswer('act', both);
  // A stale cookie (from before a restart) is refused the same way.
  const stale = await raw('/api/boards/pricing/act', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', Cookie: `vb_person=${'z'.repeat(43)}` } });
  assert.deepEqual([stale.status, (stale.body as any).detail], [403, ONLY_PERSON]);
  for (const a of [asAgent.detail, (both.body as any).detail]) assert.doesNotMatch(a, /cookie/i);
  assert.equal(h.ledger.state().seq, before, 'nothing was written');
});

test('agent writes refuse the person cookie; an Origin, when sent, must be this server', async () => {
  const items = { items: [{ type: 'reply', n: h.seeded.q, text: 'Hi' }] };
  const p = await h.fails('write_board', { board: 'pricing', body: items }, 403, 'forbidden', h.person);
  assert.doesNotMatch(p.detail, /cookie/i);
  await h.fails('request_grant', { body: { board: 'pricing', region: 'options', reason: 'x' } }, 403, 'forbidden', h.person);
  const evil = await raw('/api/boards/pricing/write', {
    method: 'POST', body: JSON.stringify(items),
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${joined.secret}`, Origin: 'http://evil.example' },
  });
  assert.equal(evil.status, 403);
  checkAnswer('write_board', evil);
});

const options = { board: 'pricing', region: 'options', reason: 'I want to add the numbers.' };

test('request_grant: 201 for a new request; a repeat while it is open is 200 with replayed; unknown containers are not-found', async () => {
  const first = await h.ok('request_grant', { body: options }, { as: joined.client });
  assert.equal(h.last().status, 201);
  assert.deepEqual(first, { request: h.ledger.state().seq, board: 'pricing', region: 'options' });
  const line = h.ledger.events().at(-1)!;
  assert.deepEqual([line.type, line.by, line.agent], ['grant-request', 'agent', joined.agent]);
  const again = await h.ok('request_grant', { body: { ...options, reason: 'Asking again.' } }, { as: joined.client });
  assert.equal(h.last().status, 200);
  assert.deepEqual(again, { ...first, replayed: true });
  assert.equal(h.ledger.state().seq, first.request, 'a repeat writes nothing');
  await h.fails('request_grant', { body: { ...options, region: 'nope' } }, 404, 'not-found', joined.client);
  await h.fails('request_grant', { body: { ...options, board: 'nope' } }, 404, 'not-found', joined.client);
  await h.fails('request_grant', { body: { board: 'pricing', region: 'options' } }, 422, 'invalid', joined.client);
});

test('scoped reads: with a Bearer, list_open and check_responses cover only what the caller may answer', async () => {
  const all = await h.ok('list_open', { board: 'pricing' });
  assert.ok(all.items.length > 0);
  const mine = await h.ok('list_open', { board: 'pricing' }, { as: joined.client });
  assert.deepEqual(mine.items, [], 'the new agent holds nothing on pricing');
  const theirs = await h.ok('check_responses', { board: 'pricing' }, { as: joined.client });
  // Only acts that concern this agent: none yet (the size and comment acts are in a container it does not hold).
  assert.deepEqual(theirs.responses.map((e: any) => e.action), []);
});

test('check_responses with wait ends when the person answers the caller\'s grant request; then the caller holds it', async () => {
  const from = h.ledger.state().seq;
  const request = (await h.ok('request_grant', { body: options }, { as: joined.client })).request;
  const waiting = h.ok('check_responses', { board: 'pricing', after: from, wait: 10 }, { as: joined.client });
  await new Promise((r) => setTimeout(r, 200));
  const start = Date.now();
  const grant = await h.ok('act', { board: 'pricing', body: { type: 'act', action: 'grant', request } });
  assert.deepEqual([grant.action, grant.by, grant.request], ['grant', 'person', request]);
  const r = await waiting;
  assert.ok(Date.now() - start < 3000);
  assert.deepEqual(r.responses.map((e: any) => [e.action, e.request]), [['grant', request]]);
  const held = await h.ok('request_grant', { body: options }, { as: joined.client });
  assert.deepEqual([h.last().status, held], [200, { board: 'pricing', region: 'options', held: true }]);
  const open = await h.ok('list_open', { board: 'pricing' }, { as: joined.client });
  assert.ok(open.items.length > 0, 'the grant brings the container\'s items into scope');
});

test('request_grant: a retry key after an answer returns that request; the same key for other content is invalid', async () => {
  const review = { board: 'roadmap', region: 'review', reason: 'I need the review items.', key: 'grant-review' };
  const first = await h.ok('request_grant', { body: review }, { as: joined.client });
  await h.ok('act', { board: 'roadmap', body: { type: 'act', action: 'deny', request: first.request, text: 'Not tonight.' } });
  const again = await h.ok('request_grant', { body: review }, { as: joined.client });
  assert.deepEqual([h.last().status, again], [200, { ...first, replayed: true }]);
  const other = await h.fails('request_grant', { body: { ...review, reason: 'Something else.' } }, 422, 'invalid', joined.client);
  assert.deepEqual(other.errors.map((e) => e.pointer), ['/key']);
});

test('act: grant, deny, revoke, size and send for the person; revoking a container\'s creator is refused', async () => {
  const creator = await h.fails('act', { board: 'pricing', body: { type: 'act', action: 'revoke', holder: 'a-k3m9x2pq', board: 'pricing', region: 'options' } }, 422, 'invalid');
  assert.match(creator.errors[0]!.detail, /creator cannot be removed/);
  const revoke = await h.ok('act', { board: 'pricing', body: { type: 'act', action: 'revoke', holder: joined.agent, board: 'pricing', region: 'options' } });
  assert.equal(h.last().status, 201);
  assert.equal(revoke.holder, joined.agent);
  const c = await h.ok('show_container', { board: 'pricing', region: 'options' });
  assert.deepEqual(c.holders, ['a-k3m9x2pq']);
  const size = await h.ok('act', { board: 'pricing', body: { type: 'act', action: 'size', n: h.seeded.d, size: 'l' } });
  assert.deepEqual([size.action, size.size], ['size', 'l']);
  await h.ok('act', { board: 'pricing', body: { type: 'act', action: 'size', n: h.seeded.d, size: 'auto' } });
  assert.equal((await h.ok('show_node', { board: 'pricing', n: h.seeded.d })).size, undefined);
  const send = await h.ok('act', { board: 'pricing', body: { type: 'act', action: 'send', board: 'pricing' } });
  assert.deepEqual([send.action, send.board], ['send', 'pricing']);
  const seen = await h.ok('mark_seen', { board: 'pricing', body: { n: h.seeded.q, ver: 2 } });
  assert.deepEqual([h.last().status, seen.type, seen.by], [201, 'seen', 'person']);
});
