// The API body schemas (packages/format/schema/api/) do what api.md says (34-39): closed bodies,
// limits, and the sent forms a write item may take.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCHEMA_BASE, schemaProblems } from '../server/schema.ts';

const API = `${SCHEMA_BASE}schema/api/`;
const problems = (file: string, value: unknown) => schemaProblems(`${API}${file}.schema.json`, value);
const PROBLEM = { type: 'https://vision-board.invalid/problems/conflict', title: 'Conflict', status: 409, detail: 'The node moved on.', ver: 3 };

test('problem: RFC 9457 members and the extensions, closed; a write item\'s form has no status', () => {
  assert.deepEqual(problems('problem', PROBLEM), []);
  assert.deepEqual(problems('problem', { ...PROBLEM, errors: [{ pointer: '/items/2/node/title', detail: '`title` is required' }] }), []);
  assert.notDeepEqual(problems('problem', { ...PROBLEM, type: 'https://vision-board.invalid/problems/nope' }), []);
  assert.notDeepEqual(problems('problem', { ...PROBLEM, extra: 1 }), []);
  assert.notDeepEqual(problems('problem', { ...PROBLEM, errors: [{ pointer: 'items', detail: 'x' }] }), []);
  const { status: _status, ...item } = PROBLEM;
  assert.notDeepEqual(problems('problem', item), []);
  assert.deepEqual(schemaProblems(`${API}problem.schema.json#/$defs/item`, item), []);
  assert.notDeepEqual(schemaProblems(`${API}problem.schema.json#/$defs/item`, PROBLEM), []);
});

test('write-request: { items }, at most 200, each one of the eight sent forms, no board in an item', () => {
  const node = { type: 'node', node: { region: 'options', kind: 'note', title: 'A note' } };
  assert.deepEqual(problems('write-request', { items: [node] }), []);
  assert.notDeepEqual(problems('write-request', { items: Array.from({ length: 201 }, () => node) }), []);
  assert.deepEqual(problems('write-request', { items: Array.from({ length: 200 }, () => node) }), []);
  assert.notDeepEqual(problems('write-request', { items: [] }), []);
  assert.notDeepEqual(problems('write-request', { items: [{ ...node, board: 'pricing' }] }), []);
  assert.notDeepEqual(problems('write-request', { items: [{ type: 'act', action: 'ack', n: 1, ver: 1 }] }), []);
  assert.notDeepEqual(problems('write-request', { items: [node], extra: true }), []);
  for (const type of ['board', 'region', 'node', 'link', 'unlink', 'reply', 'propose', 'park'])
    assert.notDeepEqual(problems('write-item', { type }), [], `${type} with no fields`);
});

test('write-result: one result per item, a success or a failure with a problem that has no status', () => {
  const ok = { index: 0, ok: true, seq: 81, key: 'k', n: 47, ver: 1 };
  const failed = { index: 1, ok: false, problem: { type: 'https://vision-board.invalid/problems/needs-grant', title: 'Needs a grant', detail: 'Ask.', board: 'pricing', region: 'later' } };
  assert.deepEqual(problems('write-result', { results: [ok, failed], head: 82, pending: [] }), []);
  assert.notDeepEqual(problems('write-result', { results: [ok], head: 82 }), []);
  assert.notDeepEqual(problems('write-result', { results: [{ ...failed, problem: { ...failed.problem, status: 403 } }], head: 82, pending: [] }), []);
  assert.notDeepEqual(problems('write-result', { results: [{ ...ok, problem: failed.problem }], head: 82, pending: [] }), []);
});

test('join, grant and seen: closed bodies; the secret is 32 bytes of base64url', () => {
  assert.deepEqual(problems('join-request', { label: 'Pricing chat' }), []);
  assert.notDeepEqual(problems('join-request', { label: 'Pricing chat', key: 'k' }), []);
  assert.notDeepEqual(problems('join-request', { label: ' ' }), []);
  assert.deepEqual(problems('join-response', { agent: 'a-k3m9x2pq', secret: 'ffwviAc-sVj5m18PEV0ZM0canfMeJizkYZEfaHD0o1o' }), []);
  assert.notDeepEqual(problems('join-response', { agent: 'a-k3m9x2pq', secret: 'short' }), []);
  assert.deepEqual(problems('grant-request-body', { board: 'pricing', region: 'later', reason: 'why', key: 'k' }), []);
  assert.notDeepEqual(problems('grant-request-body', { board: 'pricing', region: 'later' }), []);
  assert.deepEqual(problems('grant-response', { request: 54, board: 'pricing', region: 'later', replayed: true }), []);
  assert.deepEqual(problems('grant-response', { board: 'pricing', region: 'later', held: true }), []);
  assert.notDeepEqual(problems('grant-response', { request: 54, board: 'pricing', region: 'later', held: true }), []);
  assert.deepEqual(problems('seen-request', { n: 1, ver: 2 }), []);
  assert.notDeepEqual(problems('seen-request', { n: 1, ver: 2, type: 'seen' }), []);
});

test('act-request is the act sent form: the server stamps the rest, so a stamped field is refused', () => {
  assert.deepEqual(problems('act-request', { type: 'act', action: 'send', board: 'pricing' }), []);
  assert.deepEqual(problems('act-request', { type: 'act', action: 'size', n: 1, size: 'auto' }), []);
  assert.notDeepEqual(problems('act-request', { type: 'act', action: 'send', board: 'pricing', by: 'person' }), []);
  assert.notDeepEqual(problems('act-request', { type: 'act', action: 'send' }), []);
});
