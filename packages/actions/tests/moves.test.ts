// Moving cards between containers (3_FE_03 rulings 1, 2, 5 and 6, api.md 66-70): a person-only
// `move { n | nodes, region }` puts cards in a container on their board or in the built-in Later.
// The person's latest move wins over the region in the card's latest version; reads show where
// it is (`region`) and, when moved, where the agent has it (`moved_from`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent } from '../../format/src/index.ts';
import { boardView, eventProblems, LATER_REGION, readLedger } from '../../format/src/index.ts';
import {
  boardState, canWrite, nodeDetail, openItems, placedView, responsesAfter, validateAct,
} from '../src/index.ts';
import { A, B, Ledger } from './ledger-v3.ts';

const AT = '2026-10-05T10:00:00Z';
const base = { v: 6, seq: 9, at: AT, by: 'person', type: 'act' };

/** Board `b`: A holds `r` (items 1 and 2, topic 5), B holds `q` (item 3). Board `b2`: A, `x`, item 4. */
function moves(): Ledger {
  const l = new Ledger();
  l.v = 6;
  l.agent(A, { type: 'join', label: 'Pricing chat' });
  l.agent(B, { type: 'join', label: 'Review chat' });
  l.agent(A, { type: 'board', board: 'b', title: 'Board' });
  l.region(A, 'r');
  l.node(A, 1, 1, { region: 'r' });
  l.node(A, 2, 1, { region: 'r' });
  l.region(B, 'q');
  l.node(B, 3, 1, { region: 'q' });
  l.agent(A, { type: 'board', board: 'b2', title: 'Board two' });
  l.region(A, 'x', 'b2');
  l.node(A, 4, 1, { region: 'x' }, 'b2');
  l.node(A, 5, 1, { region: 'r', kind: 'topic', item: false });
  return l;
}

const next = (l: Ledger, f: Partial<ActEvent>): ActEvent =>
  ({ v: 6, seq: l.seq + 1, at: AT, by: 'person', type: 'act', action: 'move', ...f } as ActEvent);

test('shape: move names one card with n, or a group with nodes, and a region', () => {
  assert.deepEqual(eventProblems({ ...base, action: 'move', n: 1, region: 'q' }), []);
  assert.deepEqual(eventProblems({ ...base, action: 'move', n: 1, ver: 1, region: LATER_REGION }), []);
  assert.deepEqual(eventProblems({ ...base, action: 'move', nodes: [1, 2], region: 'q' }), []);
  const refused: [string, object][] = [
    ['no region', { action: 'move', n: 1 }],
    ['no card', { action: 'move', region: 'q' }],
    ['n and nodes', { action: 'move', n: 1, nodes: [1, 2], region: 'q' }],
    ['nodes and ver', { action: 'move', nodes: [1, 2], ver: 1, region: 'q' }],
    ['one node in nodes', { action: 'move', nodes: [1], region: 'q' }],
    ['a bad region id', { action: 'move', n: 1, region: 'Q q' }],
  ];
  for (const [name, f] of refused) assert.ok(eventProblems({ ...base, ...f }).length, name);
});

test('context: the region is a container on the cards\' board, or the built-in later', () => {
  const ok = moves();
  ok.act({ action: 'move', n: 1, region: 'q' });
  ok.act({ action: 'move', nodes: [1, 2], region: LATER_REGION });
  assert.deepEqual(readLedger(ok.lines).problems, []);
  for (const [f, word] of [
    [{ n: 1, region: 'nowhere' }, 'unknown "nowhere"'],
    [{ n: 1, region: 'x' }, 'unknown "x"'],
    [{ nodes: [1, 99], region: 'q' }, 'unknown node 99'],
  ] as const) {
    const l = moves();
    l.act({ action: 'move', ...f });
    assert.ok(readLedger(l.lines).problems.some((p) => p.includes(word)), `${JSON.stringify(f)}: ${readLedger(l.lines).problems.join('; ')}`);
  }
});

test('the built-in Later is reserved from ledger v6: an agent cannot draw a region named later', () => {
  const l = moves();
  l.region(A, LATER_REGION);
  assert.ok(readLedger(l.lines).problems.some((p) => p.includes('region.id') && p.includes('Later')));
  // An older line keeps its meaning (api.md 11): a v3 region named later stays valid.
  const old = moves();
  old.v = 3;
  old.region(A, LATER_REGION);
  assert.deepEqual(readLedger(old.lines).problems, []);
});

test('the person\'s latest move wins; an agent\'s later version naming its old region does not pull it back', () => {
  const l = moves();
  l.act({ action: 'move', n: 1, region: 'q' });
  assert.deepEqual([...boardState(l.state(), 'b').moves], [['1', 'q']]);
  assert.deepEqual([nodeDetail(l.state(), 1)!.region, nodeDetail(l.state(), 1)!.moved_from], ['q', 'r']);
  l.node(A, 1, 2, { region: 'r', title: 'Redrawn' });
  assert.deepEqual([nodeDetail(l.state(), 1)!.region, nodeDetail(l.state(), 1)!.moved_from], ['q', 'r']);
  // The agent's view is what it drew; the page places the card from `moves` (as with pins).
  assert.equal(boardView(l.state(), 'b').nodes.find((n) => n.id === '1')!.region, 'r');
  // Where the person put it and where the agent has it agree: nothing to show as moved.
  l.node(A, 1, 3, { region: 'q' });
  assert.deepEqual([...boardState(l.state(), 'b').moves], []);
  assert.equal(nodeDetail(l.state(), 1)!.moved_from, undefined);
});

test('a move clears the card\'s pin, which was local to the container it left (rule 9)', () => {
  const l = moves();
  l.act({ action: 'pin', n: 1, x: 40, y: 20 });
  l.act({ action: 'pin', n: 2, x: 0, y: 90 });
  l.act({ action: 'move', nodes: [1, 2], region: 'q' });
  assert.deepEqual([...boardState(l.state(), 'b').pins], []);
  l.act({ action: 'pin', n: 1, x: 5, y: 6 });
  assert.deepEqual([...boardState(l.state(), 'b').pins], [['1', { x: 5, y: 6 }]]);
});

test('reads show where an item is and where the agent has it: list_open and show_container', () => {
  const l = moves();
  l.act({ action: 'move', nodes: [1, 3], region: LATER_REGION });
  l.act({ action: 'move', n: 2, region: 'q' });
  const open = openItems(l.state(), 'b').map((x) => [x.n, x.region, x.moved_from]);
  assert.deepEqual(open, [[1, LATER_REGION, 'r'], [2, 'q', 'r'], [3, LATER_REGION, 'q']]);
});

test('validateAct: person only, cards on the board it was sent to, Later for any kind (api.md 118)', () => {
  const l = moves();
  const s = l.state();
  assert.deepEqual(validateAct(next(l, { n: 1, region: 'q' }), s, 'b'), []);
  assert.deepEqual(validateAct(next(l, { nodes: [1, 3], region: LATER_REGION }), s, 'b'), []);
  assert.deepEqual(validateAct(next(l, { n: 5, region: 'q' }), s, 'b'), [], 'a topic moves between containers');
  assert.deepEqual(validateAct(next(l, { n: 5, region: LATER_REGION }), s, 'b'), [], 'a topic can be saved for later');
  assert.deepEqual(validateAct(next(l, { nodes: [1, 5], region: LATER_REGION }), s, 'b'), []);
  const refused = (f: Partial<ActEvent>, word: string, board = 'b') => {
    const p = validateAct(next(l, f), s, board);
    assert.ok(p.some((x) => x.includes(word)), `${JSON.stringify(f)}: ${p.join('; ')}`);
  };
  refused({ n: 1, region: 'x' }, 'unknown "x"');
  refused({ n: 1, region: 'nowhere' }, 'unknown "nowhere"');
  refused({ nodes: [1, 4], region: 'r' }, 'one board');
  refused({ n: 4, region: 'x' }, 'not "b"');
  const agent = { ...next(l, { n: 1, region: 'q' }), by: 'agent' as const, agent: A };
  assert.ok(validateAct(agent, s, 'b')[0]!.includes('only the person'));
});

test('placedView: each card in its container, the built-in Later last, shown only when it holds a card or asked for', () => {
  const l = moves();
  const before = placedView(boardView(l.state(), 'b'), boardState(l.state(), 'b'));
  assert.deepEqual(before.regions.map((r) => r.id), ['r', 'q']);
  assert.deepEqual(placedView(boardView(l.state(), 'b'), boardState(l.state(), 'b'), { later: true }).regions.at(-1),
    { id: LATER_REGION, title: 'Later', mode: 'grid' });
  l.act({ action: 'move', n: 1, region: LATER_REGION });
  l.act({ action: 'move', n: 3, region: 'r' });
  const v = placedView(boardView(l.state(), 'b'), boardState(l.state(), 'b'));
  assert.deepEqual(v.regions.map((r) => r.id), ['r', 'q', LATER_REGION]);
  assert.deepEqual(v.nodes.map((n) => [n.id, n.region]), [['1', LATER_REGION], ['2', 'r'], ['3', 'r'], ['5', 'r']]);
  // Ids and numbers never change on a move (rule 10).
  assert.deepEqual(v.nodes.map((n) => n.n), [1, 2, 3, 5]);
});

test('a board whose older lines drew its own region named later keeps one Later frame', () => {
  const l = moves();
  l.v = 3;
  l.region(A, LATER_REGION);
  l.v = 6;
  l.act({ action: 'move', n: 1, region: LATER_REGION });
  const v = placedView(boardView(l.state(), 'b'), boardState(l.state(), 'b'), { later: true });
  assert.deepEqual(v.regions.map((r) => r.id), ['r', 'q', LATER_REGION]);
});

test('check_responses shows a move to the agents whose cards it moved', () => {
  const l = moves();
  const seq = l.act({ action: 'move', nodes: [1, 3], region: 'q' });
  assert.deepEqual(responsesAfter(l.state(), 'b', 0, A).map((e) => [e.seq, e.action, e.nodes]), [[seq, 'move', [1, 3]]]);
  assert.deepEqual(responsesAfter(l.state(), 'b', 0, B).map((e) => e.seq), [seq]);
});

test('grants follow the card: the holder of the container it is in may answer it; in Later, its agent\'s container', () => {
  const l = moves();
  l.act({ action: 'move', n: 1, region: 'q' });
  l.act({ action: 'move', n: 2, region: LATER_REGION });
  const s = l.state();
  assert.equal(canWrite(s, B, { type: 'reply', n: 1 }), 'ok', 'B holds q, where the person put it');
  assert.equal(canWrite(s, A, { type: 'reply', n: 1 }), 'ok', 'A wrote its latest version');
  assert.deepEqual(canWrite(s, B, { type: 'reply', n: 2 }), { board: 'b', region: 'r' }, 'Later has no holder: r decides');
  assert.equal(canWrite(s, A, { type: 'park', n: 2 }), 'ok');
});
