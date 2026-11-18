// A node's `timeline` through write_board (api.md 190-191, D-105): a model's habits stored in the one spelling, the
// stored forms as sent; anything else refused with the four forms, at the field, with the node item's example; an app
// card refused; a rewrite without the key stores none; a retry in another habit form replays. The MCP check of the
// flattened tool schema lets every habit through, so the server's normaliser is the one that answers.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { TIMELINE_FORMS } from '#format';
import { TOOLS, checkArgs } from '#mcp';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
let bot: Joined;
before(async () => {
  h = await startBoard();
  bot = await h.join('Timeline chat');
  await write([
    { type: 'board', title: 'Plan', key: 'plan-board' },
    { type: 'region', region: { id: 'steps', title: 'Steps', mode: 'flow' }, key: 'plan-steps' },
  ]);
});
after(() => h.close());

type Rec = Record<string, any>;
function write(items: unknown[]): Promise<Rec> {
  return h.ok('write_board', { board: 'plan', body: { items } }, { as: bot.client });
}
const node = (timeline: unknown, extra: Rec = {}) => ({ type: 'node', node: { region: 'steps', kind: 'topic', title: 'Launch', timeline, ...extra } });
/** A card's `timeline` as get_board's view and show_node's latest version give it, by board number. */
async function readBack(n: number): Promise<unknown[]> {
  const view = (await h.ok('get_board', { board: 'plan' })).view;
  const versions = (await h.ok('show_node', { board: 'plan', n })).versions;
  return [view.nodes.find((x: Rec) => x.n === n)?.timeline, versions.at(-1).node.timeline];
}

const HABITS: [unknown, string][] = [
  ['2026-10-13T14:30:00Z', '2026-10-13T14:30'],
  ['2026-10-13T14:30:45.123+02:00', '2026-10-13T14:30'],
  ['2026-10-13T14:30-0500', '2026-10-13T14:30'],
  ['2026-10-13 14:30', '2026-10-13T14:30'],
  ['2026-10-13t14:30z', '2026-10-13T14:30'],
  [' 2026-10 ', '2026-10'],
  [2026, '2026'],
];

test('the four forms are stored as sent; each habit in its one spelling, and every read gives that spelling', async () => {
  const sent: [unknown, string][] = [...TIMELINE_FORMS.map((f): [string, string] => [f, f]), ...HABITS];
  const r = await write(sent.map(([raw], i) => ({ ...node(raw), key: `t-${i}` })));
  assert.deepEqual(r.results.map((x: Rec) => x.ok), sent.map(() => true));
  for (const [i, [raw, want]] of sent.entries()) {
    assert.deepEqual(await readBack(r.results[i].n), [want, want], JSON.stringify(raw));
  }
});

test('anything else is refused at the field with the four forms and the node example; nothing is written', async () => {
  const head = h.ledger.state().seq;
  const bad = ['2026-Q4', '2026-W42', 'next week', '2026-10-13T14', '2026-02-30', '26-10-13', 26, 2026.5, true, null, '', 'x'.repeat(41)];
  const r = await write(bad.map((raw, i) => ({ ...node(raw), key: `bad-${i}` })));
  for (const [i, x] of (r.results as Rec[]).entries()) {
    assert.equal(x.ok, false, JSON.stringify(bad[i]));
    assert.equal(x.problem.code ?? x.problem.type?.split('/').at(-1), 'invalid');
    assert.deepEqual(x.problem.errors.map((e: Rec) => e.pointer), [`/items/${i}/node/timeline`], JSON.stringify(bad[i]));
    const detail = String(x.problem.errors[0].detail);
    for (const form of TIMELINE_FORMS) assert.ok(detail.includes(`\`${form}\``), `${detail} names ${form}`);
    assert.match(detail, /quarter, a week or words/);
    assert.equal(x.problem.example?.type, 'node', 'the node item\'s example');
  }
  assert.equal(h.ledger.state().seq, head, 'nothing written');
});

test('an app card carries no date: refused with words saying why', async () => {
  const r = await write([{ type: 'node', node: { region: 'steps', kind: 'app', title: 'Panel', app: { id: 'counter' }, timeline: '2026-10' }, key: 'app-dated' }]);
  const [x] = r.results as Rec[];
  assert.equal(x!.ok, false);
  const errors = x!.problem.errors as Rec[];
  assert.ok(errors.some((e) => e.pointer === '/items/0/node/timeline' && /app card is a window with no header for a date/.test(e.detail)), JSON.stringify(errors));
});

test('a rewrite without the key stores none: the node leaves the line', async () => {
  const first = await write([{ ...node('2026-11-03'), key: 'off-1' }]);
  const n = first.results[0].n;
  assert.deepEqual(await readBack(n), ['2026-11-03', '2026-11-03']);
  const again = await write([{ type: 'node', n, node: { region: 'steps', kind: 'topic', title: 'Launch' }, key: 'off-2' }]);
  assert.equal(again.results[0].ok, true);
  assert.deepEqual(await readBack(n), [undefined, undefined]);
});

test('a retry in another habit form replays: one value is compared and stored', async () => {
  const first = await write([{ ...node('2026-10-13T09:15:00Z'), key: 'retry-1' }]);
  const head = h.ledger.state().seq;
  const retry = await write([{ ...node('2026-10-13 09:15'), key: 'retry-1' }]);
  assert.deepEqual([retry.results[0].ok, retry.results[0].replayed, retry.results[0].n], [true, true, first.results[0].n]);
  assert.equal(h.ledger.state().seq, head, 'nothing written');
  const other = await write([{ ...node('2026-10-14'), key: 'retry-1' }]);
  assert.equal(other.results[0].ok, false, 'another date under the same key is a conflict, not a replay');
});

test('the MCP tool check lets every habit through to the board, and holds a sent value to 40 characters', () => {
  const schema = TOOLS.get('write_board')!.inputSchema;
  const args = (timeline: unknown) => ({ board: 'plan', items: [node(timeline)] });
  for (const [raw] of HABITS) assert.deepEqual(checkArgs(schema, args(raw)).problems, [], JSON.stringify(raw));
  assert.deepEqual(checkArgs(schema, args('2026-Q4')).problems, [], 'the board, not the tool check, says why');
  assert.notDeepEqual(checkArgs(schema, args('x'.repeat(41))).problems, []);
});
