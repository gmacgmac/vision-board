// A container sent with no `mode` is a `row` (region.schema.json `$defs.region`, `mode.default`); one sent with a
// mode keeps it, an update that names none keeps the layout it has, and a stored line always carries its mode.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { compileSchema, schemaProblems, LEDGER_SCHEMA_BASE } from '../server/schema.ts';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
let A: Joined;
before(async () => {
  h = await startBoard();
  A = await h.join('Row default');
});
after(() => h.close());

const write = (items: unknown[]) => h.ok('write_board', { board: 'rows', body: { items } }, { as: A.client });
const modeOf = (id: string): unknown => h.ledger.state().boards.get('rows')?.regions.find((r) => r.id === id)?.mode;
const storedRegions = () => h.ledger.events().filter((e) => e.type === 'region').map((e: any) => e.region);

test('a container sent with no mode is stored and shown as a row', async () => {
  const r = await write([{ type: 'board', title: 'Rows' }, { type: 'region', region: { id: 'plain', title: 'Plain' } }]);
  assert.deepEqual(r.results.map((x: any) => x.ok), [true, true], JSON.stringify(r.results));
  assert.equal(modeOf('plain'), 'row');
  assert.equal(storedRegions().find((x: any) => x.id === 'plain').mode, 'row');
});

test('a container sent with a mode keeps it, and an update naming none keeps the layout it has', async () => {
  await write([{ type: 'region', region: { id: 'tall', title: 'Tall', mode: 'column' } }]);
  assert.equal(modeOf('tall'), 'column');
  const r = await write([{ type: 'region', region: { id: 'tall', title: 'Taller' } }]);
  assert.equal(r.results[0].ok, true);
  assert.equal(modeOf('tall'), 'column');
  assert.equal(storedRegions().at(-1).mode, 'column');
});

test('the schema: a sent container may omit its mode, a stored line may not, and the default is row', () => {
  const sent = `${LEDGER_SCHEMA_BASE}events/region.schema.json#/$defs/sent`;
  const stored = `${LEDGER_SCHEMA_BASE}events/region.schema.json#/$defs/stored`;
  assert.deepEqual(schemaProblems(sent, { type: 'region', region: { id: 'a', title: 'A' } }), []);
  const line = { v: 19, seq: 1, at: '2026-11-06T10:00:00.000Z', type: 'region', by: 'agent', agent: 'a-abcd1234', board: 'b', region: { id: 'a', title: 'A' } };
  assert.ok(schemaProblems(stored, line).length > 0);
  assert.deepEqual(schemaProblems(stored, { ...line, region: { id: 'a', title: 'A', mode: 'row' } }), []);
  const region = compileSchema(`${LEDGER_SCHEMA_BASE}events/region.schema.json#/$defs/region`).schema as any;
  assert.equal(region.properties.mode.default, 'row');
});
