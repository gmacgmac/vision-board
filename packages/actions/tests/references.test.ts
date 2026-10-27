// The references table (BE_02, D-033): what belongs to what, and `scopeOf`, the board, container
// and cards a ledger line touches. One case per row, per event type and per action, each checked
// for coverage so a row added later without a case fails; and `scopeOf` and `placeOf` must equal
// the functions they replaced (kept here only as the oracle) on every line of every fixture ledger.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { ActEvent, ActionId, EventType, LedgerEvent } from '#format';
import { ACTION_IDS, EVENT_TYPES, LATER_REGION, latest, readLedger } from '#format';
import type { LedgerState, ReferenceKind, Scope } from '../src/index.ts';
import { applyEvent, emptyState, placeOf, REFERENCE_KINDS, REFERENCES, scopeOf } from '../src/index.ts';
import { cardsOf } from '../src/notes.ts';
import { A, B, C, Ledger } from './ledger-v3.ts';

const FIXTURES = [
  '../../format/fixtures/roadmap.ledger.jsonl',
  '../../format/fixtures/login-review.ledger.jsonl',
  '../../format/fixtures/login-layout.ledger.jsonl',
  '../../../apps/board/src/gallery/gallery.ledger.jsonl',
];

// ---- The oracle: the definitions this table replaced, as they were. ----

/** fold.ts `eventBoard`. */
function oldEventBoard(s: LedgerState, e: LedgerEvent): string | undefined {
  const nodeBoard = (n: number | undefined) => (n === undefined ? undefined : s.nodes.get(n)?.board);
  switch (e.type) {
    case 'board': case 'region': case 'node': case 'grant-request': return e.board;
    case 'link': case 'unlink': return nodeBoard(e.from);
    case 'reply': case 'propose': case 'park': return nodeBoard(e.id);
    case 'seen': return 'id' in e ? nodeBoard(e.id) : e.board; // the board form is v8 (BE_04)
    case 'retire': return e.board; // v12 (api.md 126): newer than the definitions it replaced
    case 'join': return undefined;
    case 'act':
      if (e.id !== undefined || e.nodes) return nodeBoard(e.id ?? e.nodes![0]);
      if (e.action === 'grant' || e.action === 'deny') return s.index.requests.get(e.request!)?.board;
      return e.board;
  }
}

/** pending.ts `cardsOfAct`. */
function oldCardsOfAct(s: LedgerState, e: ActEvent): number[] {
  if (e.nodes) return e.nodes;
  const ask = e.note === undefined ? undefined : s.asks.get(e.note);
  if (ask) return cardsOf(ask);
  return e.id === undefined ? [] : [e.id];
}

/** moves.ts `regionOf` and `movedFrom`. */
function oldRegionOf(s: LedgerState, n: number): string | undefined {
  const node = s.nodes.get(n);
  return node && (s.moves.get(n) ?? latest(node).region);
}
function oldMovedFrom(s: LedgerState, n: number): string | undefined {
  const node = s.nodes.get(n);
  const to = s.moves.get(n);
  const from = node && latest(node).region;
  return to !== undefined && to !== from ? from : undefined;
}

/** grants.ts `canWrite`'s `placeOf`. */
function oldWritePlace(s: LedgerState, n: number) {
  const exists = (board: string, region: string) => s.index.boards.get(board)?.has(region) ?? false;
  const x = s.nodes.get(n);
  if (!x) return undefined;
  const moved = s.moves.get(n);
  const here = moved !== undefined && exists(x.board, moved) ? moved : latest(x).region;
  return { board: x.board, region: here };
}

// ---- One ledger with every event type and every action, each with the scope it should have. ----

const on = (board: string, container: string, cards: number[] = []): Scope => ({ board, container, cards });
const bundle = { situation: 'S', background: 'B', assessment: 'A', recommendation: 'R' };

/** Board `b`: A holds `r` (cards 1, 2), B holds `q` (card 3). Board `b2`: A holds `x` (card 4).
 * Each named line is a case: an event type, `act:<action>`, or a named situation. */
function every(): { l: Ledger; want: Map<string, { seq: number; scope: Scope }> } {
  const l = new Ledger();
  l.v = 7;
  const want = new Map<string, { seq: number; scope: Scope }>();
  const at = (name: string, seq: number, scope: Scope) => { want.set(name, { seq, scope }); return seq; };
  at('join', l.agent(A, { type: 'join', label: 'Pricing chat' }), { cards: [] });
  l.agent(B, { type: 'join', label: 'Review chat' });
  l.agent(C, { type: 'join', label: 'Spare chat' });
  at('board', l.agent(A, { type: 'board', board: 'b', title: 'Board' }), { board: 'b', cards: [] });
  at('region', l.region(A, 'r'), on('b', 'r'));
  at('node', l.node(A, 1, 1, { region: 'r' }), on('b', 'r', [1]));
  l.node(A, 2, 1, { region: 'r' });
  l.region(B, 'q');
  l.node(B, 3, 1, { region: 'q' });
  l.agent(A, { type: 'board', board: 'b2', title: 'Board two' });
  l.region(A, 'x', 'b2');
  l.node(A, 4, 1, { region: 'x' }, 'b2');
  at('link', l.agent(A, { type: 'link', from: 1, to: 3 }), on('b', 'r', [1, 3]));
  at('unlink', l.agent(A, { type: 'unlink', from: 1, to: 3 }), on('b', 'r', [1, 3]));
  at('reply', l.agent(B, { type: 'reply', n: 3, text: 'Done.' }), on('b', 'q', [3]));
  const proposed = at('propose', l.agent(A, { type: 'propose', n: 4, ver: 1, action: 'ack', reason: 'Settled.' }), on('b2', 'x', [4]));
  at('park', l.agent(A, { type: 'park', n: 2, bundle }), on('b', 'r', [2]));
  at('seen', l.seen(4, 1), on('b2', 'x', [4]));
  at('a board seen', l.seenBoard('b', l.seq), { board: 'b', cards: [] });
  const asked = at('grant-request', l.request(A, 'q'), on('b', 'q'));
  const refused = l.request(C, 'r');
  at('act:grant', l.act({ action: 'grant', request: asked }), on('b', 'q'));
  at('act:deny', l.act({ action: 'deny', request: refused, text: 'Not now.' }), on('b', 'r'));
  at('act:revoke', l.act({ action: 'revoke', board: 'b', region: 'q', holder: A }), on('b', 'q'));
  at('act:ack', l.act({ action: 'ack', n: 1, ver: 1 }), on('b', 'r', [1]));
  l.v = 10; // api.md 93
  at('act:reject', l.act({ action: 'reject', n: 4, proposal: proposed }), on('b2', 'x', [4]));
  l.v = 7;
  at('act:drop', l.act({ action: 'drop', n: 4, ver: 1 }), on('b2', 'x', [4]));
  at('act:reopen', l.act({ action: 'reopen', n: 1, ver: 1 }), on('b', 'r', [1]));
  const group = at('act:comment', l.act({ action: 'comment', nodes: [1, 2], text: 'Same question.' }), on('b', 'r', [1, 2]));
  at('act:note-edit', l.act({ action: 'note-edit', n: 1, note: group, text: 'Same question, both.' }), on('b', 'r', [1, 2]));
  const whole = at('act:context', l.act({ action: 'context', board: 'b', region: 'q', text: 'Say more.' }), on('b', 'q'));
  at('act:note-remove', l.act({ action: 'note-remove', board: 'b', region: 'q', note: whole }), on('b', 'q'));
  at('act:later', l.act({ action: 'later', n: 2, ver: 1 }), on('b', 'r', [2]));
  at('act:pin', l.act({ action: 'pin', n: 1, x: 10, y: 20 }), on('b', 'r', [1]));
  at('act:unpin', l.act({ action: 'unpin', board: 'b', region: 'r' }), on('b', 'r'));
  at('act:size', l.act({ action: 'size', n: 3, size: 'l' }), on('b', 'q', [3]));
  at('act:mode', l.act({ action: 'mode', board: 'b', region: 'q', mode: 'grid' }), on('b', 'q'));
  at('act:widths', l.act({ action: 'widths', board: 'b', region: 'q', widths: 'own' }), on('b', 'q'));
  at('act:move', l.act({ action: 'move', nodes: [1, 2], region: LATER_REGION }), on('b', LATER_REGION, [1, 2]));
  at('act:send', l.act({ action: 'send', board: 'b' }), { board: 'b', cards: [] });
  at('a card in Later', l.agent(A, { type: 'reply', n: 1, text: 'Parked.' }), on('b', LATER_REGION, [1]));
  l.v = 12; // api.md 126, 128
  at('act:flag', l.act({ action: 'flag', n: 3 }), on('b', 'q', [3]));
  at('act:unflag', l.act({ action: 'unflag', n: 3 }), on('b', 'q', [3]));
  at('retire', l.agent(B, { type: 'retire', board: 'b', cards: [3] }), { board: 'b', cards: [3] });
  l.v = 14; // api.md 135
  at('act:archive', l.act({ action: 'archive', board: 'b2' }), { board: 'b2', cards: [] });
  at('act:restore', l.act({ action: 'restore', board: 'b2' }), { board: 'b2', cards: [] });
  l.v = 15; // api.md 138
  at('act:lock', l.act({ action: 'lock', board: 'b2' }), { board: 'b2', cards: [] });
  at('act:unlock', l.act({ action: 'unlock', board: 'b2' }), { board: 'b2', cards: [] });
  l.v = 17; // api.md 150: an app card, and the person's allow of its app, which is on no board and no card
  l.agent(A, { type: 'node', board: 'b', n: 5, ver: 1, node: { region: 'r', kind: 'app', title: 'Calculator', app: { id: 'calculator' } } });
  at('act:app-allow', l.act({ action: 'app-allow', app: 'calculator', hash: 'a'.repeat(64) }), { cards: [] });
  at('act:app-revoke', l.act({ action: 'app-revoke', app: 'calculator' }), { cards: [] });
  l.v = 18; // api.md 156: the hidden notes name a card, as the flag does (card 2 was moved to Later)
  at('act:notes-hide', l.act({ action: 'notes-hide', n: 2 }), on('b', LATER_REGION, [2]));
  at('act:notes-show', l.act({ action: 'notes-show', n: 2 }), on('b', LATER_REGION, [2]));
  return { l, want };
}

const eventsOf = (lines: string[]): LedgerEvent[] => {
  const read = readLedger(lines);
  assert.deepEqual(read.problems, []);
  return read.events;
};

/** Fold `events` line by line, calling `check` with the state just after each one. */
function walk(events: readonly LedgerEvent[], check: (s: LedgerState, e: LedgerEvent) => void): LedgerState {
  const s = emptyState();
  for (const e of events) { applyEvent(s, e); check(s, e); }
  return s;
}

const { l: EVERY, want: WANT } = every();
const seqOf = (name: string) => WANT.get(name)!.seq;

// ---- Per event type and per action. ----

/** Every case `scopeOf` must have: each event type but `act`, and `act:<action>` for each action. */
const SCOPE_CASES: (Exclude<EventType, 'act'> | `act:${ActionId}`)[] = [
  ...EVENT_TYPES.filter((t): t is Exclude<EventType, 'act'> => t !== 'act'),
  ...ACTION_IDS.map((a) => `act:${a}` as const),
];

test('coverage: every event type and every action has a scopeOf case', () => {
  const missing = SCOPE_CASES.filter((name) => !WANT.has(name));
  assert.deepEqual(missing, [], 'add a line to every() for each');
});

test('scopeOf: each event type and each action touches the board, container and cards it should', () => {
  const byName = new Map([...WANT].map(([name, w]) => [w.seq, { name, ...w }]));
  walk(eventsOf(EVERY.lines), (s, e) => {
    const w = byName.get(e.seq);
    if (w) assert.deepEqual(scopeOf(s, e), w.scope, w.name);
  });
});

// ---- Per row of the table. ----

const ROW_CASES: Record<ReferenceKind, (s: LedgerState) => void> = {
  board: (s) => assert.deepEqual(REFERENCES.board.lookup(s, 'b2'), { board: 'b2', cards: [] }),
  container: (s) => assert.deepEqual(REFERENCES.container.lookup(s, { board: 'b', region: 'q' }), on('b', 'q')),
  card: (s) => {
    assert.deepEqual(REFERENCES.card.lookup(s, 3), on('b', 'q', [3]));
    assert.deepEqual(REFERENCES.card.lookup(s, 1), on('b', LATER_REGION, [1]));
    assert.deepEqual(placeOf(s, 1), { board: 'b', region: LATER_REGION, drawn: 'r' });
    assert.deepEqual(placeOf(s, 3), { board: 'b', region: 'q', drawn: 'q' });
    assert.equal(placeOf(s, 99), undefined);
  },
  note: (s) => {
    assert.deepEqual(REFERENCES.note.lookup(s, seqOf('act:comment')), on('b', LATER_REGION, [1, 2]));
    assert.deepEqual(REFERENCES.note.lookup(s, seqOf('act:context')), on('b', 'q'));
    assert.equal(REFERENCES.note.lookup(s, seqOf('act:send')), undefined);
  },
  link: (s) => assert.deepEqual(REFERENCES.link.lookup(s, { from: 3, to: 4 }), on('b', 'q', [3, 4])),
  request: (s) => {
    assert.deepEqual(REFERENCES.request.lookup(s, seqOf('grant-request')), on('b', 'q'));
    assert.equal(REFERENCES.request.lookup(s, seqOf('join')), undefined);
  },
  agent: (s) => {
    assert.deepEqual(REFERENCES.agent.lookup(s, A), [{ board: 'b', region: 'r' }, { board: 'b2', region: 'x' }]);
    assert.deepEqual(REFERENCES.agent.lookup(s, B), [{ board: 'b', region: 'q' }]);
    assert.deepEqual(REFERENCES.agent.lookup(s, C), []);
  },
  app: (s) => {
    assert.deepEqual(REFERENCES.app.lookup(s, 'calculator'), [5]);
    assert.deepEqual(REFERENCES.app.lookup(s, 'converter'), []);
  },
};

test('coverage: every row of REFERENCES has a case, and every kind has a row', () => {
  assert.deepEqual(Object.keys(REFERENCES).sort(), [...REFERENCE_KINDS].sort());
  assert.deepEqual(REFERENCE_KINDS.filter((k) => !(k in ROW_CASES)), [], 'add a case to ROW_CASES for each');
});

test('REFERENCES: each row says what its kind belongs to, and its lookup answers it', () => {
  const s = walk(eventsOf(EVERY.lines), () => {});
  for (const kind of REFERENCE_KINDS) {
    const row = REFERENCES[kind];
    assert.ok(row.meaning.length > 0, kind);
    for (const to of row.to) assert.ok((REFERENCE_KINDS as readonly string[]).includes(to), `${kind} -> ${to}`);
    ROW_CASES[kind](s);
  }
});

// ---- The same answers as the functions replaced, on every line of every fixture ledger. ----

const LEDGERS: [string, string[]][] = [
  ...FIXTURES.map((f): [string, string[]] => [f.split('/').at(-1)!, fs.readFileSync(new URL(f, import.meta.url), 'utf8').trim().split('\n')]),
  ['every()', EVERY.lines],
];

for (const [name, lines] of LEDGERS) {
  test(`oracle: scopeOf and placeOf equal the old definitions on ${name}`, () => {
    const s = walk(eventsOf(lines), (st, e) => {
      const scope = scopeOf(st, e);
      assert.equal(scope.board, oldEventBoard(st, e), `board of seq ${e.seq}`);
      if (e.type === 'act') assert.deepEqual(scope.cards, oldCardsOfAct(st, e), `cards of seq ${e.seq}`);
    });
    for (const n of s.nodes.keys()) {
      const p = placeOf(s, n)!;
      assert.equal(p.region, oldRegionOf(s, n), `region of ${n}`);
      assert.equal(p.region !== p.drawn ? p.drawn : undefined, oldMovedFrom(s, n), `moved_from of ${n}`);
      const judged = s.index.boards.get(p.board)?.has(p.region) ? p.region : p.drawn;
      assert.deepEqual({ board: p.board, region: judged }, oldWritePlace(s, n), `write place of ${n}`);
    }
  });
}
