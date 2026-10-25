// Worked examples are part of the contract (rule 6, task 2026-10-25_board-agent_tool-examples):
// each write item form carries an `examples` entry in its schema, every x-agent operation with a
// JSON body shows a request example, every example fits its own schema, and a refused item comes
// back with the example for its type (read from the schema, never written in code). The skill's
// one worked `write_board` call (SKILL.md § Writing cards) fits the body schema and writes.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

/** The skill's worked example: the first JSON block under § Writing cards in SKILL.md. */
function skillExample(): { board: string; items: { type: string; key?: string; from?: unknown; to?: unknown }[] } {
  const skill = readFileSync(new URL('../../../skills/vision-board/SKILL.md', import.meta.url), 'utf8');
  const section = skill.slice(skill.indexOf('\n## Writing cards\n'));
  const block = /```json\n([\s\S]*?)```/.exec(section.slice(0, section.indexOf('\n## ', 1)));
  assert.ok(block, 'Writing cards has a json block');
  return JSON.parse(block[1]!);
}

test('the skill\'s worked example fits write_board: a region, two nodes and a link by key, every item keyed', () => {
  const { board, items } = skillExample();
  assert.equal(typeof board, 'string');
  assert.deepEqual(schemaProblems(SPECS.write_board.body!, { items }), []);
  assert.deepEqual(items.map((i) => i.type), ['region', 'node', 'node', 'link']);
  assert.ok(items.every((i) => typeof i.key === 'string'), 'every item has a key');
  const link = items[3]!;
  assert.ok([link.from, link.to].every((x) => typeof x === 'object' && x !== null && 'key' in x), 'the link names its cards by key');
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

test('the skill\'s worked example writes on a new board of its own: every item answers ok', async () => {
  const { items } = skillExample();
  const r = await h.ok('write_board', { board: 'skill-example', body: { items: [{ type: 'board', key: 'skill-board', title: 'Pricing' }, ...items] } }, { as: A.client });
  assert.deepEqual(r.results.map((x: any) => x.ok), items.map(() => true).concat(true), JSON.stringify(r.results));
});
