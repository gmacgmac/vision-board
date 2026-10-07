// The conditions table (BE_04, D-033, api.md 87): what needs attention. One case per row (when it
// is true, when it ends), checked for coverage so a row added later without a case fails; agent
// scoping through the permissions table (a board revoke ends what an agent is told it owes); and
// on every fixture ledger, for every board and every agent, the rows equal the functions they
// replaced (kept here only as the oracle).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { LedgerNode } from '../../format/src/index.ts';
import { latest, nodesOf, readLedger } from '../../format/src/index.ts';
import type { Condition, ConditionContext, ConditionKind, LedgerState } from '../src/index.ts';
import {
  boardNews, canWrite, CONDITION_KINDS, CONDITIONS, conditionsOf, foldLedger, grantRequests, holders, openContainers, openItems,
  pendingItems, REFERENCE_KINDS, responsesAfter,
} from '../src/index.ts';
import { cardsOf, latestAsk } from '../src/notes.ts';
import { DECIDED } from '../src/registry.ts';
import { A, B, C, Ledger, scene } from './ledger-v3.ts';

const FIXTURES = [
  '../../format/fixtures/roadmap.ledger.jsonl',
  '../../format/fixtures/login-review.ledger.jsonl',
  '../../format/fixtures/login-layout.ledger.jsonl',
  '../../../apps/board/src/gallery/gallery.ledger.jsonl',
];

// ---- The oracle: the checks this table replaced, as they were (pending.ts, reads.ts). ----

const replied = (s: LedgerState, seq: number, cards: number[]) =>
  (cards.length ? cards.map((n) => s.replies.get(n) ?? []) : [...s.replies.values()]).some((rs) => rs.some((r) => r.to === seq));

/** pending.ts `owedOn`: the owed ask and the owed "later", each when owed. */
function oldOwedOn(s: LedgerState, node: LedgerNode): { ask?: number; later?: number } | undefined {
  const status = s.items.get(node.n)?.status ?? 'open';
  const m = s.marks.get(node.n);
  if (!m || DECIDED.has(status)) return undefined;
  const { ask } = m;
  const made = ask && s.asks.get(ask.seq);
  const answered = ask && (latest(node).ver > ask.ver || replied(s, ask.seq, made ? cardsOf(made) : [node.n]));
  const parkOwed = status === 'later' && m.later !== undefined && (m.park ?? 0) < m.later;
  if ((!ask || answered) && !parkOwed) return undefined;
  return { ...(ask && !answered && { ask: ask.seq }), ...(parkOwed && { later: m.later }) };
}

/** pending.ts `pendingItems` and `owedContainers`, as conditions: an item's owed ask, else its "later". */
function oldOwed(s: LedgerState, board: string, agent?: string): Condition[] {
  const items: Condition[] = [];
  for (const node of nodesOf(s, board)) {
    if (!latest(node).item || (agent !== undefined && canWrite(s, agent, { type: 'reply', n: node.n }) !== 'ok')) continue;
    const o = oldOwedOn(s, node);
    if (o) items.push({ kind: 'item.owed', board, n: node.n, seq: (o.ask ?? o.later)! });
  }
  const containers: Condition[] = [];
  for (const [region, log] of s.regionLogs.get(board) ?? []) {
    if (agent !== undefined && !holders(s, board, region).includes(agent)) continue;
    const ask = latestAsk(log);
    if (ask && !replied(s, ask.seq, cardsOf(ask))) containers.push({ kind: 'container.owed', board, container: region, seq: ask.seq });
  }
  return [...items.sort((a, b) => a.n! - b.n!), ...containers];
}

/** pending.ts `unseenItems`. */
const oldUnseen = (s: LedgerState, board: string): number[] => nodesOf(s, board)
  .filter((x) => latest(x).item && latest(x).ver > (s.seen.get(x.n) ?? 0)).map((x) => x.n).sort((a, b) => a - b);

/** reads.ts `boardAccess`'s open requests. */
const oldOpenRequests = (s: LedgerState, board: string): number[] => grantRequests(s, board).filter((r) => !r.answer).map((r) => r.seq);

const of = (s: LedgerState, ctx: ConditionContext, kind: ConditionKind) => conditionsOf(s, ctx).filter((c) => c.kind === kind);
const kinds = (s: LedgerState, ctx: ConditionContext, ...ks: ConditionKind[]) => conditionsOf(s, ctx).filter((c) => ks.includes(c.kind));

for (const file of FIXTURES) {
  const name = file.split('/').at(-1)!;
  test(`oracle: on ${name}, every board and every agent, the rows equal the checks they replaced`, () => {
    const read = readLedger(fs.readFileSync(new URL(file, import.meta.url), 'utf8').trim().split('\n'));
    assert.deepEqual(read.problems, []);
    const s = foldLedger(read.events);
    for (const board of s.boards.keys()) {
      for (const agent of [undefined, ...s.index.agents]) {
        assert.deepEqual(kinds(s, { board, agent }, 'item.owed', 'container.owed'), oldOwed(s, board, agent), `${board} ${agent}`);
      }
      assert.deepEqual(of(s, { board }, 'item.unseen').map((c) => c.n), oldUnseen(s, board), board);
      assert.deepEqual(of(s, { board }, 'grant.requested').map((c) => c.seq), oldOpenRequests(s, board), board);
    }
  });
}

// ---- One case per row: when it is true, and when it ends. ----

const bundle = { situation: 'S', background: 'B', assessment: 'A', recommendation: 'R' };
const v8 = (): Ledger => { const l = scene(); l.v = 8; return l; };

const ROW_CASES: Record<ConditionKind, () => void> = {
  'item.owed': () => {
    const l = v8();
    const ask = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why?' });
    assert.deepEqual(of(l.state(), { board: 'b' }, 'item.owed'), [{ kind: 'item.owed', board: 'b', n: 1, seq: ask }]);
    assert.equal(of(l.state(), { board: 'b', agent: A }, 'item.owed').length, 1, 'A drew it');
    assert.deepEqual(of(l.state(), { board: 'b', agent: B }, 'item.owed'), [], 'B may not answer it');
    l.agent(A, { type: 'reply', n: 1, text: 'Because.', to: ask });
    assert.deepEqual(of(l.state(), { board: 'b' }, 'item.owed'), [], 'a reply naming it ends it');
    const later = l.act({ action: 'later', n: 1, ver: 1 });
    assert.deepEqual(of(l.state(), { board: 'b' }, 'item.owed').map((c) => c.seq), [later], 'a "later" with no park');
    l.agent(A, { type: 'park', n: 1, bundle });
    assert.deepEqual(of(l.state(), { board: 'b' }, 'item.owed'), [], 'a park ends it');
  },
  'container.owed': () => {
    const l = v8();
    const note = l.act({ action: 'context', board: 'b', region: 'r', text: 'Say more.' });
    assert.deepEqual(of(l.state(), { board: 'b' }, 'container.owed'), [{ kind: 'container.owed', board: 'b', container: 'r', seq: note }]);
    assert.equal(of(l.state(), { board: 'b', agent: A }, 'container.owed').length, 1, 'A holds r');
    assert.deepEqual(of(l.state(), { board: 'b', agent: B }, 'container.owed'), [], 'B does not');
    l.agent(A, { type: 'reply', n: 1, text: 'More.', to: note });
    assert.deepEqual(of(l.state(), { board: 'b' }, 'container.owed'), [], 'a reply naming it ends it');
  },
  'item.unseen': () => {
    const l = v8();
    const unseen = (board: string) => of(l.state(), { board }, 'item.unseen').map((c) => c.n);
    assert.deepEqual(unseen('b'), [1, 2, 3]);
    for (const n of [1, 2, 3]) l.seen(n, 1);
    assert.deepEqual(unseen('b'), [], 'the person\'s seen ends it');
    l.node(A, 1, 2, { region: 'r', body: 'Changed.' });
    assert.deepEqual(of(l.state(), { board: 'b' }, 'item.unseen'), [{ kind: 'item.unseen', board: 'b', n: 1 }], 'a newer version');
    assert.deepEqual(unseen('b2'), [4]);
  },
  'grant.requested': () => {
    const l = v8();
    const r = l.request(C, 'r');
    const whole = l.agent(C, { type: 'grant-request', board: 'b', reason: 'I review this board.' });
    assert.deepEqual(of(l.state(), { board: 'b' }, 'grant.requested'), [
      { kind: 'grant.requested', board: 'b', container: 'r', seq: r }, { kind: 'grant.requested', board: 'b', seq: whole },
    ]);
    assert.deepEqual(of(l.state(), { board: 'b2' }, 'grant.requested'), []);
    l.act({ action: 'grant', request: r });
    l.act({ action: 'deny', request: whole });
    assert.deepEqual(of(l.state(), {}, 'grant.requested'), [], 'grant and deny end it');
  },
  'board.drawn': () => {
    const l = v8();
    const drew = l.seq - 3; // the v2 node 3 line: board b's last drawing line
    assert.deepEqual(of(l.state(), { board: 'b' }, 'board.drawn'), [{ kind: 'board.drawn', board: 'b', seq: drew }]);
    assert.deepEqual(of(l.state(), {}, 'board.drawn'), [], 'only the open board');
    l.seenBoard('b', l.seq);
    assert.deepEqual(of(l.state(), { board: 'b' }, 'board.drawn'), [], 'the board seen ends it');
    l.act({ action: 'ack', n: 1, ver: 1 });
    assert.deepEqual(of(l.state(), { board: 'b' }, 'board.drawn'), [], 'the person acting is not drawing');
    const again = l.node(B, 2, 2, { region: 'q' });
    assert.deepEqual(of(l.state(), { board: 'b' }, 'board.drawn').map((c) => c.seq), [again]);
  },
  'board.new': () => {
    const l = v8();
    const heads = l.state().heads;
    assert.deepEqual(of(l.state(), {}, 'board.new'), [
      { kind: 'board.new', board: 'b', seq: heads.get('b') }, { kind: 'board.new', board: 'b2', seq: heads.get('b2') },
    ]);
    assert.deepEqual(of(l.state(), { board: 'b' }, 'board.new').map((c) => c.board), ['b2'], 'never the open board');
    l.seenBoard('b2', 1);
    assert.deepEqual(of(l.state(), {}, 'board.new').map((c) => c.board), ['b'], 'any board seen ends it');
  },
  'board.changed': () => {
    const l = v8();
    l.seenBoard('b2', l.state().heads.get('b2')!);
    assert.deepEqual(of(l.state(), {}, 'board.changed'), [], 'seen at its latest line');
    l.act({ action: 'ack', n: 4, ver: 1 });
    assert.deepEqual(of(l.state(), {}, 'board.changed'), [], 'the person\'s own acts never mark a board changed');
    const line = l.node(A, 4, 2, { region: 'x', body: 'Changed in another chat.' }, 'b2');
    assert.deepEqual(of(l.state(), { board: 'b' }, 'board.changed'), [{ kind: 'board.changed', board: 'b2', seq: line }]);
    assert.deepEqual(of(l.state(), { board: 'b2' }, 'board.changed'), [], 'never the open board');
    l.act({ action: 'ack', n: 4, ver: 2 });
    assert.deepEqual(of(l.state(), {}, 'board.changed').map((c) => c.seq), [line], 'the agent\'s line, not the person\'s after it');
    l.seenBoard('b2', line);
    assert.deepEqual(of(l.state(), {}, 'board.changed'), [], 'a board seen at the agent\'s line ends it');
    const reply = l.agent(A, { type: 'reply', n: 4, text: 'Answered in another chat.' });
    assert.deepEqual(of(l.state(), {}, 'board.changed').map((c) => c.seq), [reply], 'an agent\'s reply counts, not only drawing');
    assert.equal(boardNews(l.state(), 'b2')?.kind, 'board.changed', 'the same answer for the open board');
  },
};

test('coverage: every condition kind has a row and a case', () => {
  assert.deepEqual(Object.keys(CONDITIONS).sort(), [...CONDITION_KINDS].sort());
  assert.deepEqual(CONDITION_KINDS.filter((k) => !(k in ROW_CASES)), [], 'add a case to ROW_CASES for each');
});

for (const kind of CONDITION_KINDS) {
  test(`CONDITIONS['${kind}']: what it is about, who is told and where, when it holds and ends`, () => {
    const row = CONDITIONS[kind];
    assert.ok((REFERENCE_KINDS as readonly string[]).includes(row.about), row.about);
    assert.ok(['person', 'agent', 'both'].includes(row.audience));
    assert.equal(row.shows.length > 0, row.audience !== 'agent', 'the page shows what the person is told');
    assert.ok(row.trueWhen.length > 0 && row.endsWhen.length > 0);
    ROW_CASES[kind]();
  });
}

// ---- Who is told. ----

test('an agent is never told the person\'s rows; the person is told every agent\'s', () => {
  const l = v8();
  l.request(C, 'r');
  l.act({ action: 'comment', n: 1, ver: 1, text: 'For A.' });
  const person = new Set(CONDITION_KINDS.filter((k) => CONDITIONS[k].audience === 'person'));
  assert.ok(conditionsOf(l.state(), { board: 'b' }).some((c) => person.has(c.kind)));
  for (const agent of [A, B, C]) assert.ok(!conditionsOf(l.state(), { board: 'b', agent }).some((c) => person.has(c.kind)), agent);
});

test('a board revoke (D-034) ends what the agent is told it owes there, and the container acts it hears about', () => {
  const l = v8();
  const card = l.act({ action: 'comment', n: 2, ver: 1, text: 'For B.' });
  const note = l.act({ action: 'comment', board: 'b', region: 'q', text: 'On all of q.' });
  const mode = l.act({ action: 'mode', board: 'b', region: 'q', mode: 'list' });
  const owed = () => kinds(l.state(), { board: 'b', agent: B }, 'item.owed', 'container.owed').map((c) => c.seq);
  const heard = () => responsesAfter(l.state(), 'b', 0, B).map((e) => e.seq);
  assert.deepEqual(owed(), [card, note]);
  assert.deepEqual(heard(), [card, note, mode]);
  const revoke = l.act({ action: 'revoke', holder: B, board: 'b' });
  assert.deepEqual(owed(), []);
  assert.deepEqual(pendingItems(l.state(), 'b', B), []);
  assert.deepEqual([openItems(l.state(), 'b', B), openContainers(l.state(), 'b', B)], [[], []]);
  assert.deepEqual(heard(), [revoke], 'it hears only that it lost the board');
  assert.deepEqual(kinds(l.state(), { board: 'b' }, 'item.owed', 'container.owed').map((c) => c.seq), [card, note], 'still owed to the board');
});

// ---- Board seen in the fold. ----

test('a board seen keeps the highest head and moves no board head; the node form is unchanged', () => {
  const l = v8();
  const head = l.state().heads.get('b')!;
  l.seenBoard('b', head);
  l.seenBoard('b', 2);
  l.seen(1, 1);
  const s = l.state();
  assert.equal(s.seenBoards.get('b'), head);
  assert.equal(s.heads.get('b'), l.seq, 'the node seen is on board b, as before');
  l.seenBoard('b', l.seq);
  assert.equal(l.state().heads.get('b'), s.heads.get('b'), 'the board seen is not');
  assert.equal(l.state().seen.get(1), 1);
});
