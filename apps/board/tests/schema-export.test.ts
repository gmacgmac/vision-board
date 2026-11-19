// The export file and the import mode against their schemas (D-107; api.md 197-199): the export file takes a card of
// every kind as the write item that draws it, and only the three item types an export holds; its `v` is the code's
// `EXPORT_VERSION`; `write_board` takes `items` or `import`, never both; and what conditioning makes of a messy file
// is a file the schema takes, so the hand-written checks and the schema agree on what an export holds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXPORT_VERSION, KINDS, conditionExport } from '#format';
import { SCHEMA_BASE, compileSchema, schemaProblems } from '../server/schema.ts';

type Rec = Record<string, unknown>;
const API = `${SCHEMA_BASE}schema/api/`;
const EXPORT_ID = `${API}export-file.schema.json`;
const problems = (value: unknown, id = EXPORT_ID) => schemaProblems(id, value);
const details = (value: unknown, id = EXPORT_ID) => problems(value, id).map((p) => `${p.pointer} ${p.detail}`).join('\n');

const region = { type: 'region', key: 'plan', region: { id: 'plan', title: 'Plan', mode: 'grid' } };
const card = (kind: string, key = kind): Rec =>
  ({ type: 'node', key, node: { region: 'plan', kind, title: `A ${kind}`, ...(kind === 'app' && { app: { id: 'calculator' } }) } });
const file = (extra: Rec = {}): Rec => ({ v: EXPORT_VERSION, title: 'Pricing', items: [region, ...KINDS.map((k) => card(k))], ...extra });

test('export file: a card of every kind, its container and a link, with answers, places and notes', () => {
  const f = file({
    items: [region, ...KINDS.map((k) => card(k)), { type: 'link', key: 'l', from: { key: 'question' }, to: { key: 'note' }, label: 'leads to' }],
    answers: [{ key: 'question', answer: 'check' }, { key: 'decision', answer: 'cross' }],
    pins: [{ key: 'note', x: 12, y: -4.5 }],
    notes: [{ key: 'question', text: 'Why?', thread: [{ text: 'Because.' }] }, { keys: ['risk', 'topic'], text: 'Both' }, { key: 'plan', text: 'On the container' }],
  });
  assert.equal(details(f), '');
  assert.equal(details({ v: EXPORT_VERSION, title: 'Empty', items: [] }), '', 'an empty board exports');
});

test('export file: v is the code\'s EXPORT_VERSION, and the schema takes no other', () => {
  const schema = compileSchema(EXPORT_ID).schema as { properties: { v: { const: number } } };
  assert.equal(schema.properties.v.const, EXPORT_VERSION);
  assert.notEqual(details(file({ v: EXPORT_VERSION + 1 })), '');
  assert.notEqual(details(file({ v: 0 })), '');
});

test('export file: only region, node and link items; no unknown field; a note names `key` or `keys`, not both', () => {
  for (const item of [{ type: 'reply', n: 1, text: 'Hi' }, { type: 'board', title: 'B' }, { type: 'retire', cards: [1] }]) {
    assert.notEqual(details(file({ items: [region, item] })), '', String(item.type));
  }
  assert.notEqual(details(file({ made: 'today' })), '');
  assert.notEqual(details(file({ answers: [{ key: 'question', answer: 'maybe' }] })), '');
  assert.notEqual(details(file({ notes: [{ key: 'question', keys: ['a', 'b'], text: 'x' }] })), '');
  assert.notEqual(details(file({ notes: [{ text: 'x' }] })), '');
  assert.notEqual(details(file({ pins: [{ key: 'note', x: 1 }] })), '');
});

test('conditioning gives a file the schema takes, however messy the one it was given', () => {
  const messy = file({
    made: 'today',
    items: [{ ...region, region: { ...region.region, center: 3, colour: 'red' } }, card('question'), card('hologram', 'h'),
      { ...card('note'), n: 4, base: 1 }, { type: 'reply', n: 1, text: 'Hi' }, { type: 'link', from: 1, to: { key: 'note' } },
      { type: 'link', from: { key: 'h' }, to: { key: 'note' } }, { type: 'node', node: { region: 'plan', kind: 'topic', title: '', size: 'xl' } }],
    answers: [{ key: 'note', answer: 'check' }, { key: 'question', answer: 'cross', at: 'now' }],
    pins: [{ key: 'gone', x: 1, y: 1 }],
    notes: [{ keys: ['question'], text: 'One' }, { key: 'question', text: 'Kept', thread: [{ text: '' }, { text: 'Yes' }] }],
  });
  const { file: out, dropped } = conditionExport(messy);
  assert.equal(details(out), '');
  assert.ok(dropped.length >= 12, dropped.join('\n'));
});

const WRITE = `${API}write-request.schema.json`;
const RESULT = `${API}write-result.schema.json`;

test('write_board: `items` or `import`, never both and never neither; an import\'s file is any object until it is upgraded', () => {
  assert.equal(details({ import: { into: 'new', file: file() } }, WRITE), '');
  assert.equal(details({ import: { into: 'current', file: { v: 0, anything: true } } }, WRITE), '', 'an older or messy file reaches the upgrade');
  assert.notEqual(details({ import: { into: 'elsewhere', file: file() } }, WRITE), '');
  assert.notEqual(details({ import: { into: 'new' } }, WRITE), '');
  assert.notEqual(details({ import: { into: 'new', file: [] } }, WRITE), '');
  assert.match(details({ items: [card('note')], import: { into: 'new', file: file() } }, WRITE), /send `items` or `import`, not both/);
  assert.match(details({}, WRITE), /items/);
  assert.equal(details({ items: [card('note')] }, WRITE), '', 'a plain write is as it was');
});

test('write result: an import names what it dropped; a plain result is as it was', () => {
  const ok = { results: [{ index: 0, key: 'k', ok: true, seq: 3 }], head: 3, pending: [] };
  assert.equal(details(ok, RESULT), '');
  assert.equal(details({ ...ok, dropped: ['items[1].node.glow: not a field Vision Board knows'] }, RESULT), '');
  assert.notEqual(details({ ...ok, dropped: [1] }, RESULT), '');
});
