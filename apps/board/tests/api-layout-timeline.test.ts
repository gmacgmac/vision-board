// `show_layout` with a timeline (BE_01 step 6, D-105, api.md 133): a container's dated cards are reported under
// `timeline`, in the order and on the sides the page draws them (`structureOf` and `layoutRegion` share
// `timelineOrder`), and its other cards under `cards` as the mode arranges them. A container with no dated card leaves
// `timeline` out. The person's direction turns the sides to left and right. Every answer is held to openapi.json by
// the harness (a free port per run).
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { boardView, directionOf } from '#format';
import { layoutRegion, structureOf } from '#layout';
import { boardState, placedView } from '#actions';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
let A: Joined;
const card = (region: string, title: string, timeline?: string) =>
  ({ type: 'node', node: { region, kind: 'topic', title, ...(timeline && { timeline }) } });

before(async () => {
  h = await startBoard();
  A = await h.join('Launch chat');
  const r = await h.ok('write_board', {
    board: 'launch', body: {
      items: [
        { type: 'board', title: 'Launch' },
        { type: 'region', region: { id: 'plan', title: 'Plan', mode: 'grid', columns: 2 } },
        { type: 'region', region: { id: 'notes', title: 'Notes', mode: 'row' } },
        card('plan', 'Public launch', '2026-11-03'), card('plan', 'Owners'), card('plan', 'Private beta', '2026-10'),
        card('plan', 'Pricing live', '2026-11-03'), card('plan', 'Risks'), card('plan', 'Retro', '2027'),
        card('notes', 'An aside'), card('notes', 'Another'),
        { type: 'link', from: 1, to: 2 },
      ],
    },
  }, { as: A.client });
  assert.deepEqual(r.results.slice(3).map((x: any) => x.n), [1, 2, 3, 4, 5, 6, 7, 8, undefined]);
});
after(() => h.close());

const layout = (region: string) => h.ok('show_layout', { board: 'launch', region }, { as: A.client });
const act = (direction: string) => h.ok('act', { board: 'launch', body: { type: 'act', action: 'direction', board: 'launch', direction } });

/** The order and sides the page draws for `plan`, by board number. */
function drawn() {
  const s = h.ledger.state();
  const view = placedView(boardView(s, 'launch'), boardState(s, 'launch'));
  const region = view.regions.find((r) => r.id === 'plan')!;
  const nodes = view.nodes.filter((n) => n.region === 'plan');
  const sizes = new Map(nodes.map((n) => [n.id, { w: 280, h: 120 }]));
  const piece = layoutRegion(region, nodes, view.links, sizes, { direction: directionOf(s, 'launch', 'plan') });
  return piece.timeline!.dots.map((d) => ({ n: Number(d.id), side: d.side }));
}

test('a container with dated and undated cards reports both: the dated in drawn order, the rest as the mode lays them out', async () => {
  const out = await layout('plan');
  assert.deepEqual(out.timeline, {
    direction: 'across',
    cards: [
      { n: 3, at: '2026-10', side: 'above' }, { n: 1, at: '2026-11-03', side: 'below' },
      { n: 4, at: '2026-11-03', side: 'above' }, { n: 6, at: '2027', side: 'below' },
    ],
  });
  assert.deepEqual(out.timeline.cards.map(({ n, side }: any) => ({ n, side })), drawn(), 'the answer is the picture\'s');
  // The rest: cards 2 and 5 in the grid's two columns; the link 1 > 2 touches a dated card, so it is not the mode's.
  assert.deepEqual(out.cards, [{ n: 2, column: 1, row: 1 }, { n: 5, column: 2, row: 1 }]);
  assert.deepEqual([out.columns, out.links, out.crossing, out.empty, out.mode], [2, 0, 0, 0, 'grid']);
  assert.equal(out.widths, 'own', 'a grid with a timeline across, no choice: the timeline\'s default (After FE_02 (a))');
  const s = h.ledger.state();
  const view = placedView(boardView(s, 'launch'), boardState(s, 'launch'));
  const plan = view.regions.find((r) => r.id === 'plan')!;
  const st = structureOf(plan, view.nodes.filter((n) => n.region === 'plan'), view.links, 'grid', 'match');
  assert.deepEqual(out.timeline.cards.map((c: any) => String(c.n)), st.timeline!.cards.map((c) => c.id));
});

test('a container with no dated card leaves timeline out and answers as before', async () => {
  const out = await layout('notes');
  assert.ok(!('timeline' in out));
  assert.deepEqual(out.cards, [{ n: 7, column: 1, row: 1 }, { n: 8, column: 2, row: 1 }]);
  assert.deepEqual([out.columns, out.links, out.crossing, out.empty], [2, 0, 0, 0]);
  assert.equal(out.widths, 'own', 'a row\'s own default');
});

test('the person\'s direction turns the sides to left and right, alternating from the left; Auto gives them back', async () => {
  await act('down');
  const down = await layout('plan');
  assert.equal(down.timeline.direction, 'down');
  assert.deepEqual(down.timeline.cards.map((c: any) => c.side), ['left', 'right', 'left', 'right']);
  assert.deepEqual(down.timeline.cards.map(({ n, side }: any) => ({ n, side })), drawn());
  assert.equal(down.widths, 'match', 'run down, no choice: match');
  await act('auto');
  assert.deepEqual((await layout('plan')).timeline.cards.map((c: any) => c.side), ['above', 'below', 'above', 'below']);
});

// What an agent is told (the schema's descriptions, so api-reference.md) and the spec (api.md 194) say what the layout
// draws (D-106, FIX_02 M1): every side the answer can carry, and run down the line down the middle, the cards
// alternating left and right, the first on the left.
test('the schema and api.md describe the line the layout draws, across and down (D-106)', () => {
  const read = (f: string) => fs.readFileSync(new URL(`../../../${f}`, import.meta.url), 'utf8');
  const defs = JSON.parse(read('packages/format/schema/api/show-layout-response.schema.json')).$defs;
  const sides: string[] = defs.dated.properties.side.enum;
  assert.deepEqual(sides, ['above', 'below', 'left', 'right']);
  for (const text of [defs.timeline.description, defs.timeline.properties.direction.description]) {
    assert.match(text, /down`? the middle/);
    assert.doesNotMatch(text, /down the left/);
  }
  assert.match(defs.timeline.description, /alternating left and right, the first on the left/);
  const item = read('docs/specification/api.md').split(/\n(?=\d+\. )/).find((x) => x.startsWith('194. '))!;
  for (const side of sides) assert.ok(item.includes(`\`${side}\``), `api.md 194 names \`${side}\``);
  assert.doesNotMatch(item, /beside|until then/);
  assert.match(item, /down the middle/);
});
