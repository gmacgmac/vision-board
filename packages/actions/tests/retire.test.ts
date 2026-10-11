// Retiring cards in the action layer (field report batch 2 ruling 1, assumptions B and C, api.md
// 126-127): which cards a retire takes (the person's moves count), why it waits while a card still
// owes the person something, and that a retired card leaves every read and count but keeps its
// history and number. Board `b` holds identities 1, 2, 3, 5 and 6 (card 4 is on board b2), so its
// board numbers 4 and 5 are identities 5 and 6: a read that slips from one to the other fails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardView, readLedger } from '../../format/src/index.ts';
import {
  boardState, conditionsOf, containerDetail, counts, nodeDetail, openItems, pendingItems, retireCards, retireProblem,
} from '../src/index.ts';
import { A, B, scene } from './ledger-v3.ts';

const bundle = { situation: 'S', background: 'B', assessment: 'A', recommendation: 'R' };

type Scene = ReturnType<typeof scene>;
/** A v12 node line by A on board `b` (no old `item` mark). */
const draw = (l: Scene, n: number, ver: number, node: { region: string; kind: string; body?: string }) =>
  l.agent(A, { type: 'node', board: 'b', n, ver, node: { title: `Card ${n}`, ...node } });

/** The scene at v12 with a finding (5) and a question (6) in A's container `r`. */
function cards() {
  const l = scene();
  l.v = 12;
  draw(l, 5, 1, { region: 'r', kind: 'finding' });
  draw(l, 6, 1, { region: 'r', kind: 'question' });
  return l;
}

test('retireCards: the card named, or every card in the container now (the person\'s moves count)', () => {
  const l = cards();
  assert.deepEqual(retireCards(l.state(), { board: 'b', id: 5 }), [5]);
  assert.deepEqual(retireCards(l.state(), { board: 'b', region: 'r' }), [1, 5, 6]);
  l.act({ action: 'move', n: 2, region: 'r' });
  l.act({ action: 'move', n: 5, region: 'q' });
  l.act({ action: 'move', n: 6, region: 'later' });
  assert.deepEqual(retireCards(l.state(), { board: 'b', region: 'r' }), [1, 2], 'moved in goes; moved out or into Later stays');
  assert.deepEqual(retireCards(l.state(), { board: 'b', region: 'none' }), [], 'an unknown or empty container takes none');
});

test('retireProblem: a comment or More context with no answer, or a Later with no park, waits; words name the board number', () => {
  const l = cards();
  const s0 = l.state();
  assert.equal(retireProblem(s0, { board: 'b', id: 5 }, [5]), undefined, 'nothing owed');
  const asked = l.act({ action: 'comment', n: 5, ver: 1, text: 'Source?' });
  assert.equal(retireProblem(l.state(), { board: 'b', id: 5 }, [5]),
    'card 4 has a comment you haven\'t answered: answer it with a reply or an append first');
  l.agent(A, { type: 'reply', n: 5, text: 'The audit.', to: asked });
  assert.equal(retireProblem(l.state(), { board: 'b', id: 5 }, [5]), undefined, 'a reply answers it');
  l.act({ action: 'context', n: 6, ver: 1 });
  assert.match(retireProblem(l.state(), { board: 'b', region: 'r' }, [1, 5, 6])!, /^card 5 asks for more context/);
  draw(l, 6, 2, { region: 'r', kind: 'question', body: 'More.' });
  assert.equal(retireProblem(l.state(), { board: 'b', id: 6 }, [6]), undefined, 'a newer version (an append) answers it');
  l.act({ action: 'later', n: 6, ver: 2 });
  assert.match(retireProblem(l.state(), { board: 'b', id: 6 }, [6])!, /^card 5 is saved for later and its handover isn't written/);
  l.agent(A, { type: 'park', n: 6, bundle });
  assert.equal(retireProblem(l.state(), { board: 'b', id: 6 }, [6]), undefined);
});

test('retireProblem: a container whose note is unanswered waits too, even with no card in it', () => {
  const l = cards();
  const note = l.act({ action: 'comment', board: 'b', region: 'q', text: 'Is this still needed?' });
  assert.match(retireProblem(l.state(), { board: 'b', region: 'q' }, [2])!, /container "q" has a note you haven't answered/);
  l.agent(B, { type: 'reply', n: 2, text: 'No.', to: note });
  assert.equal(retireProblem(l.state(), { board: 'b', region: 'q' }, [2]), undefined);
});

test('a retired card leaves the board, its counts, lists and conditions; its number is kept and never given again', () => {
  const l = cards();
  l.act({ action: 'comment', n: 6, ver: 1, text: 'Why?' });
  const drop = l.agent(A, { type: 'propose', n: 6, ver: 1, action: 'drop', reason: 'Settled.' });
  const before = l.state();
  assert.deepEqual(pendingItems(before, 'b').map((x) => x.n), [5]);
  const gone = l.agent(A, { type: 'retire', board: 'b', cards: [6] });
  const s = l.state();
  const view = boardView(s, 'b');
  assert.deepEqual(view.nodes.map((x) => x.n), [1, 2, 3, 4], 'card 5 (identity 6) left; the others keep theirs');
  assert.deepEqual(counts(view, boardState(s, 'b')).total, 3);
  assert.equal(boardState(s, 'b').items.has('5'), false);
  assert.deepEqual(openItems(s, 'b').map((x) => x.n), [1, 2, 3]);
  assert.deepEqual(pendingItems(s, 'b'), [], 'a retired card owes nothing (the server refuses a retire while it does)');
  assert.deepEqual(conditionsOf(s, { board: 'b' }).filter((c) => c.id === 6), []);
  assert.deepEqual([s.proposals.get(drop)!.outcome, s.proposals.get(drop)!.decidedBy], ['closed', gone]);
  const detail = nodeDetail(s, 6)!;
  assert.deepEqual([detail.n, detail.retired, detail.versions.length, detail.notes.length], [5, gone, 1, 1], 'its history stays readable');
  assert.deepEqual(detail.proposals.map((p) => [p.n, p.outcome]), [[5, 'closed']]);
  // Assumption C: the next card is number 6, never 5 again.
  draw(l, 7, 1, { region: 'r', kind: 'topic' });
  assert.deepEqual(boardView(l.state(), 'b').nodes.map((x) => x.n), [1, 2, 3, 4, 6]);
});

test('a retired container leaves the board with its cards; show_container still answers, with retired', () => {
  const l = cards();
  const gone = l.agent(B, { type: 'retire', board: 'b', region: 'q', cards: [2] });
  const s = l.state();
  assert.deepEqual(boardView(s, 'b').regions.map((r) => r.id), ['r', 'later', 'old']);
  const box = containerDetail(s, 'b', 'q')!;
  assert.deepEqual([box.retired, box.region.id, box.nodes.map((x) => [x.n, x.retired])], [gone, 'q', [[2, gone]]]);
  assert.equal(containerDetail(s, 'b', 'r')!.retired, undefined);
  // The ledger refuses its id again, and a card into it.
  const again = readLedger([...l.lines, JSON.stringify({ v: 12, seq: l.seq + 1, at: '2026-10-11T10:00:00Z', by: 'agent', agent: B, type: 'region', board: 'b', region: { id: 'q', title: 'Q', mode: 'grid' } })]);
  assert.match(again.problems.join(), /container "q" was retired; pick another id/);
});

test('board numbers out: a group note and a proposal on board b name its cards by number', () => {
  const l = cards();
  l.act({ action: 'comment', nodes: [2, 6], text: 'Same thing.' });
  l.agent(A, { type: 'propose', n: 6, ver: 1, action: 'ack', reason: 'Yes.' });
  l.agent(A, { type: 'link', from: 5, to: 6 });
  const s = l.state();
  assert.deepEqual(boardState(s, 'b').items.get('5')!.notes.map((x) => x.nodes), [[2, 5]]);
  const d = nodeDetail(s, 6)!;
  assert.deepEqual([d.n, d.notes[0]!.nodes, d.proposals[0]!.n, d.links], [5, [2, 5], 5, [{ from: 4, to: 5 }]]);
  assert.equal(nodeDetail(s, 4)!.n, 1, 'card 4 is board b2\'s first');
});
