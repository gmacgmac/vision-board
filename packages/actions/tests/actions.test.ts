import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { View } from '../../format/src/view.ts';
import type { TranscriptRecord } from '../../format/src/transcript.ts';
import { counts, makeRecord, reduceTranscript, statusOf, validateRecord, MAX_TEXT } from '../src/index.ts';

const view: View = JSON.parse(
  fs.readFileSync(new URL('../../format/fixtures/roadmap.json', import.meta.url), 'utf8'),
);
const item = view.nodes.find((n) => n.n !== undefined)!.id;
const plain = view.nodes.find((n) => n.n === undefined)!.id;
const rec = (f: Partial<TranscriptRecord>): TranscriptRecord =>
  makeRecord({ by: 'person', action: 'ack', version: 1, node: item, ...f } as Omit<TranscriptRecord, 'at'>);

test('a valid person ack passes', () => assert.deepEqual(validateRecord(rec({}), view), []));

test('agents cannot take decisions', () => {
  for (const action of ['ack', 'drop', 'later', 'reopen', 'pin', 'mode'] as const)
    assert.ok(validateRecord(rec({ by: 'agent', action }), view).some((p) => p.includes('only the person')), action);
});

test('agents may comment', () =>
  assert.deepEqual(validateRecord(rec({ by: 'agent', action: 'comment', text: 'hi' }), view), []));

test('item actions reject non-item nodes and unknown nodes', () => {
  assert.ok(validateRecord(rec({ node: plain }), view).some((p) => p.includes('not a numbered item')));
  assert.ok(validateRecord(rec({ node: 'ghost' }), view).some((p) => p.includes('unknown')));
});

test('comment needs text; text is capped', () => {
  assert.ok(validateRecord(rec({ action: 'comment', text: '  ' }), view).includes('text: required'));
  assert.ok(validateRecord(rec({ action: 'comment', text: 'x'.repeat(MAX_TEXT + 1) }), view).length);
});

test('unknown action is rejected', () =>
  assert.equal(validateRecord({ ...rec({}), action: 'delete' }, view).length, 1));

test('reduce: last record wins, notes accumulate, reopen reopens', () => {
  const s = reduceTranscript([
    rec({ action: 'comment', text: 'why?' }),
    rec({ action: 'ack' }),
    rec({ action: 'reopen' }),
    rec({ action: 'context', text: 'more' }),
  ]);
  assert.equal(statusOf(s, item), 'context');
  assert.deepEqual(s.items.get(item)!.notes.map((n) => n.kind), ['comment', 'context']);
});

test('reduce: pins, unpins and modes', () => {
  const region = view.regions[0]!.id;
  const s = reduceTranscript([
    rec({ action: 'pin', node: plain, x: 1, y: 2 }),
    rec({ action: 'pin', node: item, x: 3, y: 4 }),
    rec({ action: 'unpin', node: plain }),
    rec({ action: 'mode', node: undefined, region, mode: 'grid' }),
  ]);
  assert.deepEqual([...s.pins], [[item, { x: 3, y: 4 }]]);
  assert.equal(s.modes.get(region), 'grid');
});

test('counts split decided, later and open', () => {
  const items = view.nodes.filter((n) => n.n !== undefined).map((n) => n.id);
  const s = reduceTranscript([rec({ node: items[0] }), rec({ node: items[1], action: 'later' })]);
  const c = counts(view, s);
  assert.deepEqual(c, { total: items.length, decided: 1, later: 1, open: items.length - 2 });
});
