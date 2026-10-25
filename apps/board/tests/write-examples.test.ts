// Worked examples are part of the contract (rule 6, task 2026-10-25_board-agent_tool-examples):
// each write item form carries an `examples` entry in its schema, every x-agent operation with a
// JSON body shows a request example, every example fits its own schema, and a refused item comes
// back with the example for its type (read from the schema, never written in code).
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { OPERATIONS } from '../../../packages/format/src/index.ts';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { itemExample, itemTypes } from '../server/examples.ts';
import { SPECS } from '../server/spec.ts';
import { schemaProblems } from '../server/schema.ts';
import { WRITE_ITEM_ID } from '../server/write-board.ts';

const TEN = ['board', 'region', 'node', 'link', 'unlink', 'reply', 'propose', 'park', 'retire', 'append'];

test('the write item has ten forms and every one has an example that fits, with a key', () => {
  assert.deepEqual([...itemTypes()].sort(), [...TEN].sort());
  for (const type of itemTypes()) {
    const example = itemExample(type) as Record<string, unknown>;
    assert.ok(example, `${type} has an example`);
    assert.equal(example.type, type);
    assert.equal(typeof example.key, 'string', `${type}'s example carries a key`);
    assert.deepEqual(schemaProblems(WRITE_ITEM_ID, example), [], type);
  }
});

test('every x-agent operation with a JSON body has a request example, and it fits the body schema', () => {
  const withBody = Object.values(OPERATIONS).filter((o) => o.xAgent && SPECS[o.operationId].body);
  assert.ok(withBody.length >= 3);
  for (const { operationId } of withBody) {
    const { body, example } = SPECS[operationId];
    assert.ok(example, `${operationId} has a request example`);
    assert.deepEqual(schemaProblems(body!, example), [], operationId);
  }
});

test('the write_board request example draws a region, nodes and a link by key', () => {
  const items = (SPECS.write_board.example as { items: { type: string }[] }).items.map((x) => x.type);
  assert.ok(items.includes('region') && items.includes('link') && items.filter((t) => t === 'node').length >= 2, items.join());
});

let h: Harness;
let A: Joined;
before(async () => {
  h = await startBoard();
  A = await h.join('Example chat');
});
after(() => h.close());

const write = (items: unknown[]) => h.ok('write_board', { board: 'shapes', body: { items } }, { as: A.client });

test('a flat node item is refused with the wrapped node example', async () => {
  const r = await write([{ type: 'board', title: 'Shapes' }, { type: 'node', key: 'flat', title: 'A card', kind: 'question' }]);
  assert.equal(r.results[0].ok, true);
  const p = r.results[1].problem;
  assert.equal(p.type, 'https://vision-board.invalid/problems/invalid');
  assert.deepEqual(p.example, itemExample('node'));
  assert.deepEqual(p.errors.map((e: any) => e.pointer).sort(), ['/items/1/kind', '/items/1/node', '/items/1/title']);
});

test('a wrong or missing type lists the ten types and carries no example', async () => {
  for (const item of [{ type: 'card', title: 'x' }, { title: 'x' }]) {
    const p = (await write([item])).results[0].problem;
    assert.equal(p.example, undefined);
    for (const type of TEN) assert.ok(p.detail.includes(`\`${type}\``), `${type} in "${p.detail}"`);
  }
});

test('a refused write body carries the operation request example', async () => {
  const err = await h.fails('write_board', { board: 'shapes', body: {} }, 422, 'invalid', A.client);
  assert.deepEqual(err.example, SPECS.write_board.example);
});
