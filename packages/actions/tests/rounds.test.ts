// NEW cards and what clears a card's label (stage5-follow-ups BE_01, api.md 97): where a board's
// latest round starts (rounds.ts: the first board seen, then each Send answered), the `item.new` row, and every card row's `clearedBy` checked
// against the fold, so a row that says what clears it and a fold that does otherwise disagree here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ClearedBy, ConditionKind, LedgerState } from '../src/index.ts';
import { clearsOnSelect, CONDITION_KINDS, CONDITIONS, conditionsOf, openItems } from '../src/index.ts';
import { roundStart } from '../src/rounds.ts';
import { A, B, Ledger } from './ledger-v3.ts';

/** Board `b` at v10, drawn by A in one run: region `r`, items 1 and 2. */
function drawn(): Ledger {
  const l = new Ledger();
  l.v = 10;
  l.agent(A, { type: 'join', label: 'Pricing chat' });
  l.agent(A, { type: 'board', board: 'b', title: 'Board' });
  l.region(A, 'r');
  l.node(A, 1, 1, { region: 'r' });
  l.node(A, 2, 1, { region: 'r' });
  return l;
}

const send = (l: Ledger) => l.act({ action: 'send', board: 'b' });
const fresh = (s: LedgerState) => conditionsOf(s, { board: 'b' }).filter((c) => c.kind === 'item.new').map((c) => c.n);
const holds = (s: LedgerState, kind: ConditionKind, n: number) => conditionsOf(s, { board: 'b' }).some((c) => c.kind === kind && c.n === n);

/** `drawn()`, then the person opens the board: their first board seen, at its last line. */
function opened(): Ledger {
  const l = drawn();
  l.seenBoard('b', l.seq);
  return l;
}

/** `opened()`, then item 3 from A: a card added after the person opened the board. */
function added(): Ledger {
  const l = opened();
  l.node(A, 3, 1, { region: 'r' });
  return l;
}

test('round start: before any Send, the person\'s first board seen; none before they open the board', () => {
  const l = drawn();
  assert.equal(roundStart(l.state(), 'b'), undefined, 'never opened');
  const head = l.seq;
  l.seenBoard('b', head);
  assert.equal(roundStart(l.state(), 'b'), head);
  l.node(A, 3, 1, { region: 'r' });
  l.seenBoard('b', l.seq);
  assert.equal(roundStart(l.state(), 'b'), head, 'a later board seen moves nothing');
  assert.equal(roundStart(l.state(), 'b2'), undefined, 'no board, no round');
});

test('round start: a Send with no drawing after it moves nothing; nor does an agent line that is not drawing', () => {
  const l = opened();
  const head = l.seq - 1; // the board seen's head: the line before it
  send(l);
  assert.equal(roundStart(l.state(), 'b'), head);
  l.agent(A, { type: 'reply', n: 1, text: 'Noted.' });
  assert.equal(roundStart(l.state(), 'b'), head, 'a reply is not drawing');
});

test('round start: the first drawing line after a Send; two rounds', () => {
  const l = opened();
  send(l);
  const first = l.node(A, 3, 1, { region: 'r' });
  assert.equal(roundStart(l.state(), 'b'), first);
  l.seen(3, 1);
  l.node(A, 4, 1, { region: 'r' });
  assert.equal(roundStart(l.state(), 'b'), first, 'more drawing in the same round');
  send(l);
  const second = l.node(B, 5, 1, { region: 'r' });
  assert.equal(roundStart(l.state(), 'b'), second, 'any agent drawing after the next Send');
});

test('two agents drawing in turn before the person first opens the board: no card is new', () => {
  const l = drawn();
  l.region(B, 'q');
  l.node(B, 3, 1, { region: 'q' });
  assert.deepEqual(fresh(l.state()), [], 'never opened: nothing is new');
  l.seenBoard('b', l.seq);
  assert.deepEqual(fresh(l.state()), [], 'both drawings were there when the person opened it');
});

test('with no board seen, no card is new, even after a Send and more drawing', () => {
  const l = drawn();
  send(l);
  l.node(A, 3, 1, { region: 'r' });
  assert.equal(roundStart(l.state(), 'b'), undefined);
  assert.deepEqual(fresh(l.state()), []);
});

test('item.new: a freshly opened board has none; a card drawn after the first board seen, before any Send, is new, for the person only', () => {
  assert.deepEqual(fresh(opened().state()), []);
  const l = added();
  const s = l.state();
  assert.deepEqual(conditionsOf(s, { board: 'b' }).filter((c) => c.kind === 'item.new'), [{ kind: 'item.new', board: 'b', n: 3, seq: l.seq }]);
  assert.ok(!conditionsOf(s, { board: 'b', agent: A }).some((c) => c.kind === 'item.new'), 'agents are never told');
  l.node(A, 3, 2, { region: 'r', body: 'Changed.' });
  assert.deepEqual(fresh(l.state()), [3], 'a newer version keeps it new');
  assert.deepEqual(openItems(l.state(), 'b', A).filter((x) => x.unseen).map((x) => x.n), [1, 2, 3], 'list_open\'s unseen is unchanged');
});

test('item.new ends: seen at any version, an act naming it, a decision, or the next round', () => {
  const seen = added();
  seen.seen(3, 1);
  assert.deepEqual(fresh(seen.state()), [], 'seen');
  const acted = added();
  acted.act({ action: 'pin', n: 3, x: 10, y: 10 });
  assert.deepEqual(fresh(acted.state()), [], 'any act naming it');
  const decided = added();
  decided.act({ action: 'drop', n: 3, ver: 1 });
  assert.deepEqual(fresh(decided.state()), [], 'a decision');
  const round = added();
  send(round);
  assert.deepEqual(fresh(round.state()), [3], 'a Send alone keeps it');
  round.node(A, 4, 1, { region: 'r' });
  assert.deepEqual(fresh(round.state()), [4], 'the next round: only its own cards are new');
});

// ---- Every card row's `clearedBy`, against the fold. ----

/** A ledger where the card row `kind` holds for item 1 or 3, and that item. */
const HOLDING: Partial<Record<ConditionKind, () => { l: Ledger; n: number }>> = {
  'item.new': () => ({ l: added(), n: 3 }),
  'item.unseen': () => {
    const l = opened();
    l.node(A, 1, 2, { region: 'r', body: 'Changed.' });
    return { l, n: 1 };
  },
  'item.awaiting': () => {
    const l = opened();
    l.act({ action: 'later', n: 1, ver: 1 });
    return { l, n: 1 };
  },
  'proposal.open': () => {
    const l = opened();
    l.agent(A, { type: 'propose', n: 1, ver: 1, action: 'drop', reason: 'The client declined.' });
    return { l, n: 1 };
  },
  'proposal.stale': () => {
    const l = opened();
    l.agent(A, { type: 'propose', n: 1, ver: 1, action: 'drop', reason: 'The client declined.' });
    l.node(A, 1, 2, { region: 'r', body: 'Changed.' });
    return { l, n: 1 };
  },
};

/** What the person does, as ledger lines: selecting sends the card's `seen` at its latest version
 * (the page); an act is a comment, which decides nothing; a round is a Send, then the agent drawing. */
const DO: Record<ClearedBy, (l: Ledger, n: number) => void> = {
  select: (l, n) => { l.seen(n, l.state().nodes.get(n)!.versions.at(-1)!.ver); },
  act: (l, n) => { l.act({ action: 'comment', n, ver: l.state().nodes.get(n)!.versions.at(-1)!.ver, text: 'Why?' }); },
  round: (l) => { send(l); l.node(A, 9, 1, { region: 'r' }); },
};

const onCard = CONDITION_KINDS.filter((k) => CONDITIONS[k].shows.includes('card'));

test('clearedBy: every card row has a case here; a row not on a card clears by nothing', () => {
  assert.deepEqual(onCard.filter((k) => !(k in HOLDING)), [], 'add a case to HOLDING for each card row');
  for (const k of CONDITION_KINDS.filter((x) => !onCard.includes(x))) assert.deepEqual(CONDITIONS[k].clearedBy, [], k);
  assert.deepEqual(CONDITIONS['item.new'].clearedBy, ['select', 'act', 'round']);
  assert.deepEqual(CONDITIONS['item.unseen'].clearedBy, ['select', 'act']);
  assert.deepEqual(CONDITION_KINDS.filter(clearsOnSelect), ['item.new', 'item.unseen'], 'the rows selecting a card ends');
});

for (const kind of onCard) {
  test(`clearedBy: ${kind} ends on exactly what its row names`, () => {
    for (const what of Object.keys(DO) as ClearedBy[]) {
      const { l, n } = HOLDING[kind]!();
      assert.ok(holds(l.state(), kind, n), `${kind} holds before ${what}`);
      DO[what](l, n);
      assert.equal(!holds(l.state(), kind, n), CONDITIONS[kind].clearedBy.includes(what), `${kind} after ${what}`);
    }
  });
}
