// A flow's direction as the board lays it out (BE_01, D-100 5, api.md 189): the agent's `direction` on a container
// draws; the person's Across for the board wins; Auto gives the agent's back; the person's choice for one container
// wins over theirs for the board. The page reads `directionOf` on the folded ledger, so another page reading the same
// ledger draws the same. The page's layout cache keys a container on its direction.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { View } from '#format';
import { boardView, directionOf, LEDGER_FORMAT, readLedger } from '#format';
import { foldLedger } from '#actions';
import type { Size } from '#layout';
import { layoutBoard } from '#layout';
import { createLayoutCache } from '../src/board/canvas/layout-cache.ts';

const AGENT = 'a-aaaa1111';
const stamp = (seq: number) => `2026-11-17T09:00:${String(seq).padStart(2, '0')}Z`;

/** A board `p` with a flow container `build` the agent drew `down`, four linked cards, and the person's acts. */
function ledger(acts: object[] = []): string[] {
  const lines: object[] = [
    { by: 'agent', agent: AGENT, type: 'join', label: 'Planner' },
    { by: 'agent', agent: AGENT, type: 'board', board: 'p', title: 'Plan' },
    { by: 'agent', agent: AGENT, type: 'region', board: 'p', region: { id: 'build', title: 'Build', mode: 'flow', direction: 'down' } },
    ...[1, 2, 3, 4].map((n) => ({ by: 'agent', agent: AGENT, type: 'node', board: 'p', n, ver: 1, node: { kind: 'topic', title: `Step ${n}`, region: 'build' } })),
    ...[[1, 2], [2, 3], [2, 4]].map(([a, b]) => ({ by: 'agent', agent: AGENT, type: 'link', from: a, to: b })),
    ...acts.map((a) => ({ by: 'person', type: 'act', ...a })),
  ];
  return lines.map((e, i) => JSON.stringify({ v: LEDGER_FORMAT, seq: i + 1, at: stamp(i + 1), ...e }));
}

/** Lay the board out as the page does: each container's direction from `directionOf` on the folded ledger. */
function draw(lines: string[]) {
  const read = readLedger(lines);
  assert.deepEqual(read.problems, []);
  const state = foldLedger(read.events);
  const view: View = boardView(state, 'p');
  const sizes = new Map<string, Size>(view.nodes.map((n) => [n.id, { w: 280, h: 120 }]));
  const directions = new Map(view.regions.map((r) => [r.id, directionOf(state, 'p', r.id)]));
  return { view, sizes, directions, layout: layoutBoard(view, sizes, { directions }) };
}

const runs = (l: ReturnType<typeof draw>) => (l.layout.downward.has('build') ? 'down' : 'across');

test('the agent\'s down draws down; the person\'s Across wins; Auto gives the agent\'s back; the container\'s choice wins over the board\'s', () => {
  assert.equal(runs(draw(ledger())), 'down');
  const across = [{ action: 'direction', board: 'p', direction: 'across' }];
  assert.equal(runs(draw(ledger(across))), 'across');
  assert.equal(runs(draw(ledger([...across, { action: 'direction', board: 'p', direction: 'auto' }]))), 'down');
  assert.equal(runs(draw(ledger([...across, { action: 'direction', board: 'p', region: 'build', direction: 'down' }]))), 'down');
  // Drawn down, the cards run top to bottom: each link goes lower on the board.
  const { view, layout } = draw(ledger());
  const card = (n: number) => layout.nodes.get(view.nodes.find((x) => x.n === n)!.id)!;
  assert.ok(card(2).y > card(1).y && card(3).y > card(2).y);
});

test('the same ledger read by another page draws the same picture', () => {
  const lines = ledger([{ action: 'direction', board: 'p', direction: 'across' }, { action: 'direction', board: 'p', region: 'build', direction: 'down' }]);
  assert.deepEqual(draw([...lines]).layout, draw(lines).layout);
});

test('the layout cache lays a container out again when its direction changes, and equals layoutBoard', () => {
  const { view, sizes, directions } = draw(ledger());
  const cache = createLayoutCache();
  const base = { pins: new Map(), modes: new Map(), hidden: new Set<string>() };
  const first = cache.run(view, sizes, { ...base, directions });
  assert.deepEqual(first.layout, layoutBoard(view, sizes, { directions }));
  assert.deepEqual(cache.run(view, sizes, { ...base, directions }).laidOut, [], 'nothing changed: nothing laid out');
  const across = new Map([['build', 'across' as const]]);
  const turned = cache.run(view, sizes, { ...base, directions: across });
  assert.deepEqual(turned.laidOut, ['build']);
  assert.deepEqual(turned.layout, layoutBoard(view, sizes, { directions: across }));
});
