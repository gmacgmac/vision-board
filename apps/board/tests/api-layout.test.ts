// `show_layout` and the person's `widths` act end to end (field-report batch 3 rulings 5 and 6,
// api.md 132-133). Board `plan` is drawn after roadmap and pricing, so its card numbers are far
// below the identities the ledger holds: an answer that slipped from one to the other fails. Every
// answer is held to openapi.json by the harness.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Mode, View } from '../../../packages/format/src/index.ts';
import { boardView, widthsOf } from '../../../packages/format/src/index.ts';
import type { BoardLayout } from '../../../packages/layout/src/index.ts';
import { layoutBoard } from '../../../packages/layout/src/index.ts';
import { boardState, placedView } from '../../../packages/actions/src/index.ts';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
let A: Joined;
before(async () => {
  h = await startBoard();
  A = await h.join('Plan chat');
  const r = await write([
    { type: 'board', title: 'Plan' },
    { type: 'region', region: { id: 'work', title: 'Work', mode: 'lanes', lanes: ['Now', 'Next', 'Later on'] } },
    { type: 'region', region: { id: 'steps', title: 'Steps', mode: 'flow' } },
    { type: 'region', region: { id: 'side', title: 'Side', mode: 'grid', columns: 2 } },
    { type: 'region', region: { id: 'gone', title: 'Gone', mode: 'grid' } },
    card('work', 'Draft', 'Now'), card('work', 'Review', 'Now'), card('work', 'Price', 'Next'), card('work', 'Ship', 'Next'),
    card('steps', 'Ask'), card('steps', 'Answer'), card('steps', 'Check'), card('steps', 'Old step'),
    card('side', 'Aside', 'Next'), card('side', 'Note'), card('gone', 'Lost'),
    link(1, 2), link(1, 3), link(3, 4), link(2, 4), link(5, 6), link(5, 7), link(6, 8), link(7, 2),
  ]);
  assert.deepEqual(r.results.slice(5, 16).map((x: any) => x.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});
after(() => h.close());

async function write(items: unknown[]): Promise<any> {
  return h.ok('write_board', { board: 'plan', body: { items } }, { as: A.client });
}
const card = (region: string, title: string, lane?: string) => ({ type: 'node', node: { region, kind: 'finding', title, ...(lane && { lane }) } });
const link = (from: number, to: number) => ({ type: 'link', from, to });
const act = (body: object) => h.ok('act', { board: 'plan', body: { type: 'act', ...body } });
const layout = (region: string, board = 'plan') => h.ok('show_layout', { board, region }, { as: A.client });

/** Each card's lane, column and row as the page lays the board out (`layoutBoard` over the placed
 * view, the person's modes and widths), read back from the picture: columns by left edge, rows by
 * top within a column (and lane). Cards of mixed sizes, as a page measures them. */
function pageCells(region: string): { n: number; lane?: string; column: number; row: number }[] {
  const s = h.ledger.state();
  const st = boardState(s, 'plan');
  const view: View = placedView(boardView(s, 'plan'), st);
  const sizes = new Map(view.nodes.map((n, i) => [n.id, { w: [280, 360, 464][i % 3]!, h: [120, 96, 180][i % 3]! }]));
  const modes = new Map<string, Mode>(st.modes);
  const widths = new Map(view.regions.map((r) => [r.id, widthsOf(modes.get(r.id) ?? r.mode, r.widths, st.widths.get(r.id))]));
  const out: BoardLayout = layoutBoard(view, sizes, { modes, widths });
  const frame = out.regions.find((r) => r.id === region)!;
  const boxes = view.nodes.filter((n) => n.region === region).map((n) => ({ n: n.n!, box: out.nodes.get(n.id)! }));
  const laneAt = (y: number) => frame.lanes?.find((l) => y >= l.y && y < l.y + l.h)?.name;
  const xs = [...new Set(boxes.map((b) => b.box.x))].sort((a, b) => a - b);
  return boxes.map(({ n, box }) => {
    const lane = laneAt(box.y);
    const above = boxes.filter((o) => o.box.x === box.x && laneAt(o.box.y) === lane && o.box.y < box.y).length;
    return { n, ...(lane !== undefined && { lane }), column: xs.indexOf(box.x) + 1, row: above + 1 };
  });
}

test('a lanes container: lanes, each card by board number in card order, as the page lays it out', async () => {
  const r = await layout('work');
  assert.deepEqual([r.board, r.region, r.mode, r.widths, r.lanes], ['plan', 'work', 'lanes', 'own', ['Now', 'Next', 'Later on']]);
  assert.deepEqual(r.cards.map((c: any) => c.n), [1, 2, 3, 4]);
  assert.deepEqual(r.cards, pageCells('work'));
  assert.deepEqual(r.cards.find((c: any) => c.n === 1), { n: 1, lane: 'Now', column: 1, row: 1 });
  // 1 > 2, 1 > 3, 3 > 4 and 2 > 4 join its cards; 7 > 2 comes from another container.
  assert.equal(r.links, 4);
  assert.equal(r.head, h.ledger.state().seq);
  assert.deepEqual(r.cards.map((c: any) => [c.n, c.lane, c.column]), [[1, 'Now', 1], [2, 'Now', 2], [3, 'Next', 2], [4, 'Next', 3]]);
  // 3 lanes x 3 columns; Now uses 1 and 2, Next 2 and 3, "Later on" none.
  assert.deepEqual([r.columns, r.crossing, r.empty], [3, 0, 5]);
});

test('a flow container: no lanes, the links between its cards, as the page lays it out', async () => {
  const r = await layout('steps');
  assert.deepEqual([r.mode, r.widths, 'lanes' in r], ['flow', 'own', false]);
  assert.deepEqual(r.cards, pageCells('steps'));
  assert.deepEqual(r.cards.map((c: any) => [c.n, c.column]), [[5, 1], [6, 2], [7, 2], [8, 3]]);
  assert.deepEqual([r.columns, r.links, r.crossing, r.empty], [3, 3, 0, 2]); // 3 columns x 2 rows, 4 cards
});

test('the person\'s moves count and retired cards are left out', async () => {
  await act({ action: 'move', n: 9, region: 'work' });
  const retired = await write([{ type: 'retire', n: 8 }]);
  assert.deepEqual(retired.results[0].retired, [8]);
  const work = await layout('work');
  assert.deepEqual(work.cards.map((c: any) => c.n), [1, 2, 3, 4, 9]);
  assert.deepEqual(work.cards, pageCells('work'));
  assert.equal(work.cards.at(-1).lane, 'Next');
  const steps = await layout('steps');
  assert.deepEqual(steps.cards.map((c: any) => c.n), [5, 6, 7]);
  assert.deepEqual([steps.links, steps.columns], [2, 2]);
  assert.deepEqual((await layout('side')).cards.map((c: any) => c.n), [10]);
});

test('widths: the person\'s act through act and check_responses; show_layout and get_board carry it', async () => {
  const head = (await h.ok('get_board', { board: 'plan' })).head;
  const stored = await act({ action: 'widths', board: 'plan', region: 'steps', widths: 'match' });
  assert.deepEqual([stored.action, stored.region, stored.widths], ['widths', 'steps', 'match']);
  const seen = await h.ok('check_responses', { board: 'plan', after: head }, { as: A.client });
  assert.deepEqual(seen.responses.map((e: any) => [e.action, e.region, e.widths]), [['widths', 'steps', 'match']]);
  assert.deepEqual((await h.ok('get_board', { board: 'plan' })).state.widths, { steps: 'match' });
  assert.equal((await layout('steps')).widths, 'match');
  await h.fails('act', { board: 'plan', body: { type: 'act', action: 'widths', board: 'plan', region: 'nope', widths: 'own' } }, 422, 'invalid');
  await h.fails('act', { board: 'plan', body: { type: 'act', action: 'widths', board: 'plan', region: 'steps', widths: 'wide' } }, 422, 'invalid');
});

test('the mode shown is the person\'s, else the container\'s; widths follow the shown mode unless chosen', async () => {
  const before = await layout('side');
  assert.deepEqual([before.mode, before.widths], ['grid', 'match']);
  await act({ action: 'mode', board: 'plan', region: 'side', mode: 'row' });
  const after = await layout('side');
  assert.deepEqual([after.mode, after.widths], ['row', 'own']);
  assert.deepEqual(after.cards, pageCells('side'));
});

test('two boards: each answers in its own board numbers', async () => {
  const r = await layout('options', 'pricing');
  const { q, d } = h.seeded;
  assert.deepEqual([r.board, r.mode, r.widths, r.columns], ['pricing', 'grid', 'match', 2]);
  assert.deepEqual(r.cards, [{ n: q, column: 1, row: 1 }, { n: d, column: 2, row: 1 }]);
  assert.deepEqual([r.links, r.crossing, r.empty], [1, 0, 0]);
});

test('refused like show_container: an unknown board or container, Later, and a retired container', async () => {
  await h.fails('show_layout', { board: 'nope', region: 'work' }, 404, 'not-found');
  await h.fails('show_layout', { board: 'plan', region: 'nope' }, 404, 'not-found');
  await act({ action: 'move', n: 10, region: 'later' });
  await h.fails('show_layout', { board: 'plan', region: 'later' }, 404, 'not-found');
  await write([{ type: 'retire', region: 'gone' }]);
  const gone = await h.fails('show_layout', { board: 'plan', region: 'gone' }, 404, 'not-found');
  assert.match(gone.detail, /was retired/);
  await h.ok('show_container', { board: 'plan', region: 'gone' }); // show_container still answers
});
