// The layout modes over the API (field report batch 2 ruling 4, api.md 129): `list` is renamed
// `column`, and `row` is new. The person's mode pick and an agent's region take `column` and `row`;
// a sent `list` is refused 422 with the words at its pointer, from the page's act and from a write.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import { LIST_RENAMED } from '../../../packages/format/src/index.ts';

let h: Harness;
before(async () => { h = await startBoard(); });
after(() => h.close());

const mode = (m: string) => ({ board: 'pricing', body: { type: 'act', action: 'mode', board: 'pricing', region: 'options', mode: m } });

test('the person picks column and row; list is refused at /mode', async () => {
  for (const m of ['column', 'row']) assert.equal((await h.ok('act', mode(m))).mode, m);
  const refused = await h.fails('act', mode('list'), 422, 'invalid');
  assert.ok(refused.errors.some((e) => e.pointer === '/mode'), JSON.stringify(refused.errors));
  assert.equal((await h.ok('get_board', { board: 'pricing' })).state.modes.options, 'row', 'the refused pick changed nothing');
});

test('an agent draws a container in column or row; list is refused at its pointer', async () => {
  const agent = await h.join('Modes chat');
  const items = [
    { type: 'board', title: 'Modes' },
    { type: 'region', region: { id: 'c', title: 'Column', mode: 'column' } },
    { type: 'region', region: { id: 'r', title: 'Row', mode: 'row' } },
    { type: 'region', region: { id: 'l', title: 'List', mode: 'list' } },
  ];
  const w = await h.ok('write_board', { board: 'modes', body: { items } }, { as: agent.client });
  assert.deepEqual(w.results.map((x: any) => x.ok), [true, true, true, false]);
  assert.deepEqual(w.results[3].problem.errors.map((e: any) => e.pointer), ['/items/3/region/mode']);
  assert.ok(w.results[3].problem.errors[0].detail.includes(LIST_RENAMED) || /column/.test(w.results[3].problem.errors[0].detail));
  assert.deepEqual((await h.ok('get_board', { board: 'modes' })).view.regions.map((r: any) => r.mode), ['column', 'row']);
});
