// Ledger v22 (D-108, api.md 201): a person's import writes its containers, cards and links as the person, so `region`,
// `node` and `link` lines join `PERSON_TOO`: by the person, they are accepted by the schema and `eventProblems` alike,
// with no `agent`; every other agent line stays the agent's. A format-21 ledger becomes 22 by a restamp: only `v`
// changes, and it reads as before.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEDGER_FORMAT, PERSON_TOO, eventProblems, readLedger, upgradeLines } from '#format';
import { fixtureLines } from '#format/testing';
import { LEDGER_EVENT_ID, schemaProblems } from '../server/schema.ts';
import { WRITE_ITEM_ID } from '../server/write-board.ts';
import { AGENT, PERSON } from './schema-cases.ts';

type Rec = Record<string, unknown>;
const verdict = (e: Rec) => ({ schema: schemaProblems(LEDGER_EVENT_ID, e).length === 0, hand: eventProblems(e).length === 0 });
const lines: Record<string, Rec> = {
  region: { type: 'region', board: 'b', region: { id: 'plan', title: 'Plan', mode: 'grid' } },
  node: { type: 'node', board: 'b', n: 1, ver: 1, node: { region: 'plan', kind: 'question', title: 'T' } },
  link: { type: 'link', from: 1, to: 2, label: 'leads to' },
};

test('format 22: a person\'s region, node and link lines are accepted by both checks, with no agent', () => {
  assert.ok(LEDGER_FORMAT >= 22);
  for (const t of ['region', 'node', 'link'] as const) {
    assert.ok(PERSON_TOO.has(t), t);
    assert.deepEqual(verdict({ ...PERSON, ...lines[t] }), { schema: true, hand: true }, `${t} by the person`);
    assert.deepEqual(verdict({ ...AGENT, ...lines[t] }), { schema: true, hand: true }, `${t} by an agent`);
  }
});

test('format 22: the agent\'s other lines stay the agent\'s alone', () => {
  for (const e of [{ type: 'unlink', from: 1, to: 2 }, { type: 'reply', n: 1, text: 'Yes' }, { type: 'propose', n: 1, ver: 1, action: 'ack', reason: 'R' }]) {
    assert.equal(PERSON_TOO.has(e.type as never), false, e.type);
    assert.deepEqual(verdict({ ...PERSON, ...e }), { schema: false, hand: false }, e.type);
  }
});

test('an imported line keeps its author in `from` (point 617): the person writes a reply, an agent a note, nothing else', () => {
  const said = { type: 'reply', n: 1, text: 'Yes', to: 3, from: { by: 'agent', agent: 'a-k3m9x2pq', label: 'pricing' } };
  const note = { type: 'act', action: 'comment', n: 1, ver: 1, text: 'Why?', from: { by: 'person' } };
  assert.deepEqual(verdict({ ...PERSON, ...said }), { schema: true, hand: true }, 'the person\'s imported reply');
  assert.deepEqual(verdict({ ...AGENT, ...note }), { schema: true, hand: true }, 'an agent\'s imported note');
  assert.deepEqual(verdict({ ...PERSON, ...said, from: { by: 'person' } }).hand, false, 'a reply\'s words are an agent\'s');
  assert.deepEqual(verdict({ ...PERSON, ...note, action: 'ack', text: undefined, from: { by: 'person' } }).hand, false, 'only a note');
  assert.deepEqual(verdict({ ...PERSON, ...said, from: { by: 'agent', colour: 'red' } }), { schema: false, hand: false }, 'no unknown field');
});

test('a format-21 ledger restamps to 22, line for line, only `v` changed, and reads the same', () => {
  const current = fixtureLines('gallery');
  const older = current.map((l) => l.replace(`{"v":${LEDGER_FORMAT},`, '{"v":21,'));
  assert.ok(older.every((l) => l.startsWith('{"v":21,')));
  const up = upgradeLines(older);
  assert.deepEqual([up.stops, up.newer, up.changed, up.byFormat], [[], [], older.length, { 21: older.length }]);
  assert.deepEqual(up.lines, current);
  assert.deepEqual(readLedger(up.lines).problems, []);
});

test('a container\'s centre: sent, a number or `{ key }`; stored, a ledger number only, in both checks', () => {
  const stored = (center: unknown) => ({ ...AGENT, ...lines.region, region: { id: 'wheel', title: 'Wheel', mode: 'radial', center } });
  assert.deepEqual(verdict(stored(3)), { schema: true, hand: true });
  assert.deepEqual(verdict(stored({ key: 'hub' })), { schema: false, hand: false });
  const sent = (center: unknown) => schemaProblems(WRITE_ITEM_ID, { type: 'region', region: { id: 'wheel', title: 'Wheel', mode: 'radial', center } });
  assert.deepEqual([sent(3), sent({ key: 'hub' })], [[], []]);
  assert.notDeepEqual(sent({ key: 'hub', n: 1 }), []);
});
