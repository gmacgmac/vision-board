import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { eventProblems, validateLedger } from '../src/index.ts';

const lines = () => fs.readFileSync(
  new URL('../fixtures/login-review.ledger.jsonl', import.meta.url), 'utf8').trim().split('\n');
const ev = (i: number) => {
  const line = lines()[i];
  if (line === undefined) throw new Error(`fixture has no line ${i}`);
  return JSON.parse(line);
};
const set = (ls: string[], i: number, e: unknown) => { ls[i] = JSON.stringify(e); return ls; };

test('fixture ledger is valid', () => assert.deepEqual(validateLedger(lines()), []));

test('an existing number only takes its next version', () => {
  const fresh = lines();
  set(fresh, 5, { ...ev(5), n: 1 }); // n 1 exists, ver 1 again
  assert.ok(validateLedger(fresh).some((p) => p.startsWith('line 6: ver: expected 2')));
});

test('new numbers are always above every number used before', () => {
  const ls = lines();
  set(ls, 3, { ...ev(3), n: 7 });
  set(ls, 4, { ...ev(4), n: 5 }); // 5 is below 7, the highest so far
  assert.ok(validateLedger(ls).some((p) => p.includes('n: 5 was already used')));
});

test('rejects coordinates in a node', () => {
  const e = ev(2);
  e.node.x = 10;
  assert.ok(eventProblems(e).some((p) => p.includes('no coordinates')));
});

test('only agents write nodes and proposals; only people write seen', () => {
  assert.ok(eventProblems({ ...ev(2), by: 'person' }).includes('node: written by an agent'));
  assert.ok(eventProblems({ ...ev(12), by: 'person' }).includes('propose: written by an agent'));
  assert.ok(eventProblems({ ...ev(13), by: 'agent' }).includes('seen: written by a person'));
});

test('a proposal made before the node changed cannot be accepted', () => {
  const ls = lines().slice(0, 14);
  ls.push(JSON.stringify({ ...ev(4), seq: 15, ver: 2, node: { ...ev(4).node, title: 'Changed' } }));
  ls.push(JSON.stringify({ ...ev(14), seq: 16 }));
  assert.ok(validateLedger(ls).some((p) => p.includes('proposal: out of date')));
});

test('an out-of-date proposal can still be rejected (api.md 93)', () => {
  const ls = lines().slice(0, 14);
  ls.push(JSON.stringify({ ...ev(4), seq: 15, ver: 2, node: { ...ev(4).node, title: 'Changed' } }));
  const { ver: _ver, action: _action, ...accept } = ev(14);
  ls.push(JSON.stringify({ ...accept, v: 10, seq: 16, action: 'reject' }));
  assert.deepEqual(validateLedger(ls), []);
});

test('a parked item needs a full handover bundle', () => {
  const e = ev(11);
  delete e.bundle.assessment;
  assert.ok(eventProblems(e).includes('bundle.assessment: required'));
});

test('references to unknown nodes and future versions are rejected', () => {
  const ls = lines();
  set(ls, 6, { ...ev(6), to: 99 });
  set(ls, 13, { ...ev(13), ver: 3 });
  const p = validateLedger(ls);
  assert.ok(p.includes('line 7: to: unknown node 99'));
  assert.ok(p.includes('line 14: ver: node 1 is at version 2'));
});

test('one bad line is reported without hiding the rest', () => {
  const ls = lines();
  ls[7] = '{not json';
  const p = validateLedger(ls);
  assert.deepEqual(p, ['line 8: not JSON']);
});
