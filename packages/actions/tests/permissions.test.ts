// The permissions table (BE_03, D-033, D-034, api.md 81-86): who may write what. One case per row,
// checked for coverage so a row added later without a case fails; board access before container
// access; grants and revokes on a board; and every fixture ledger replayed against the rule this
// table replaced (kept here only as the oracle): no write that worked before is refused now for an
// agent that already held a container on that board.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { LedgerEvent } from '../../format/src/index.ts';
import { containerKey, latest, readLedger } from '../../format/src/index.ts';
import type { Container, LedgerState, Verdict, WriteItem, WriteKind } from '../src/index.ts';
import { applyEvent, canWrite, emptyState, holders, PERMISSIONS, placeOf, REFERENCES, scopeOf } from '../src/index.ts';
import { A, B, C, Ledger, scene } from './ledger-v3.ts';

const need = (board: string, region?: string) => ({ board, ...(region !== undefined && { region }) });
const node = (board: string, n: number, region: string): WriteItem => ({ type: 'node', board, n, node: { region } });

/** The scene, then C asks for the whole board `b` and the person answers `answer`. */
function boardAsked(answer?: 'grant' | 'deny'): Ledger {
  const l = scene();
  l.v = 8;
  const request = l.agent(C, { type: 'grant-request', board: 'b', reason: 'I review this board.' });
  if (answer) l.act({ action: answer, request });
  return l;
}

/** The scene with B's access to board `b` revoked: B still holds its containers q and later. */
function boardRevoked(): LedgerState {
  const l = scene();
  l.v = 8;
  l.act({ action: 'revoke', holder: B, board: 'b' });
  return l.state();
}

/** An answer on card 1 (A's, in A's container r): the reply, propose and park rows. */
function answers(type: 'reply' | 'propose' | 'park'): void {
  const s = scene().state();
  assert.equal(canWrite(s, A, { type, n: 1 }), 'ok', type);
  assert.deepEqual(canWrite(s, B, { type, n: 1 }), need('b', 'r'), type); // holds the board, not r
  assert.deepEqual(canWrite(s, C, { type, n: 1 }), need('b', 'r'), type); // a grant on r brings b too
  assert.equal(canWrite(s, C, { type, n: 999 }), 'ok', 'an unknown card is the context check\'s');
  // B redraws card 1 under a grant on r, then loses r: as its author it still answers it, but not
  // once it loses the board.
  const l = scene();
  l.v = 8;
  l.act({ action: 'grant', request: l.request(B, 'r') });
  l.node(B, 1, 2, { region: 'r' });
  l.act({ action: 'revoke', holder: B, board: 'b', region: 'r' });
  assert.equal(canWrite(l.state(), B, { type, n: 1 }), 'ok', type);
  l.act({ action: 'revoke', holder: B, board: 'b' });
  assert.deepEqual(canWrite(l.state(), B, { type, n: 1 }), need('b'), type);
}

/** One case per row: allowed, and refused with what to ask for. */
const ROW_CASES: Record<WriteKind, () => void> = {
  board: () => {
    const s = scene().state();
    assert.equal(canWrite(s, C, { type: 'board', board: 'fresh' }), 'ok', 'a new board is its writer\'s');
    assert.equal(canWrite(s, A, { type: 'board', board: 'b' }), 'ok', 'its creator (the context check still refuses a second line)');
    assert.equal(canWrite(s, B, { type: 'board', board: 'b' }), 'creator', 'a holder of the board is not its creator');
    assert.equal(canWrite(boardAsked('grant').state(), C, { type: 'board', board: 'b' }), 'creator', 'no grant makes another creator');
    // A board the person made (api.md 90) has no agent creator: no agent writes its line, and every
    // agent asks for the board before writing on it (D-034), until the person grants it.
    const l = scene();
    l.v = 9;
    l.personBoard('mine', 'Mine');
    const p = l.state();
    for (const agent of [A, B, C]) {
      assert.equal(canWrite(p, agent, { type: 'board', board: 'mine' }), 'creator', agent);
      assert.deepEqual(canWrite(p, agent, { type: 'region', board: 'mine', region: { id: 'fresh' } }), need('mine'), agent);
    }
    l.act({ action: 'grant', request: l.agent(C, { type: 'grant-request', board: 'mine', reason: 'Drawing the plan.' }) });
    assert.equal(canWrite(l.state(), C, { type: 'region', board: 'mine', region: { id: 'fresh' } }), 'ok', 'once granted');
  },
  region: () => {
    const s = scene().state();
    const region = (board: string, id: string): WriteItem => ({ type: 'region', board, region: { id } });
    assert.equal(canWrite(s, B, region('b', 'fresh')), 'ok', 'a new container on a board it holds');
    assert.deepEqual(canWrite(s, C, region('b', 'fresh')), need('b'), 'not on a board it does not hold');
    assert.equal(canWrite(s, A, region('b', 'r')), 'ok');
    assert.deepEqual(canWrite(s, B, region('b', 'r')), need('b', 'r'), 'another agent\'s container needs its grant');
    assert.equal(canWrite(s, C, region('nope', 'x')), 'ok', 'an unknown board is the context check\'s');
    assert.deepEqual(canWrite(boardRevoked(), B, region('b', 'q')), need('b'), 'its own container, without the board');
  },
  node: () => {
    const s = scene().state();
    assert.equal(canWrite(s, A, node('b', 50, 'r')), 'ok');
    assert.deepEqual(canWrite(s, B, node('b', 50, 'r')), need('b', 'r'));
    assert.deepEqual(canWrite(s, C, node('b', 50, 'r')), need('b', 'r'));
    assert.deepEqual(canWrite(s, C, node('b', 50, 'nope')), need('b'), 'an unknown container on a board it does not hold');
    assert.deepEqual(canWrite(s, A, node('b', 1, 'q')), need('b', 'q'), 'a move needs the target too');
    assert.deepEqual(canWrite(s, B, node('b', 1, 'q')), need('b', 'r'), 'and the source first');
    assert.deepEqual(canWrite(boardRevoked(), B, node('b', 2, 'q')), need('b'), 'its own card, without the board');
  },
  link: () => {
    const s = scene().state();
    assert.equal(canWrite(s, A, { type: 'link', from: 1, to: 2 }), 'ok');
    assert.equal(canWrite(s, B, { type: 'link', from: 2, to: 1 }), 'ok');
    assert.deepEqual(canWrite(s, B, { type: 'link', from: 1, to: 2 }), need('b', 'r'));
    assert.deepEqual(canWrite(boardRevoked(), B, { type: 'link', from: 2, to: 1 }), need('b'));
  },
  unlink: () => {
    const s = scene().state();
    assert.equal(canWrite(s, A, { type: 'unlink', from: 1, to: 2 }), 'ok');
    assert.deepEqual(canWrite(s, C, { type: 'unlink', from: 2, to: 1 }), need('b', 'q'));
    assert.deepEqual(canWrite(boardRevoked(), B, { type: 'unlink', from: 2, to: 1 }), need('b'));
  },
  reply: () => answers('reply'),
  propose: () => answers('propose'),
  park: () => answers('park'),
};

for (const kind of Object.keys(ROW_CASES) as WriteKind[]) test(`row ${kind}`, ROW_CASES[kind]);

test('coverage: every row of the table has a case, and every case a row', () => {
  assert.deepEqual(Object.keys(ROW_CASES).sort(), Object.keys(PERMISSIONS).sort());
});

test('board access: its creator, every agent that made or was granted a container on it, and board grants', () => {
  const s = scene().state();
  assert.deepEqual(holders(s, 'b'), [A, B]);
  assert.deepEqual(holders(s, 'b2'), [A]);
  const l = scene();
  l.act({ action: 'grant', request: l.request(C, 'r') });
  assert.deepEqual(holders(l.state(), 'b'), [A, B, C], 'a grant on a container brings its board');
  assert.deepEqual(holders(boardAsked('deny').state(), 'b'), [A, B], 'a refusal grants nothing');
});

test('a board grant lets the agent make and fill its own containers, not write in another\'s', () => {
  const s = boardAsked('grant').state();
  assert.deepEqual(holders(s, 'b'), [A, B, C]);
  assert.equal(canWrite(s, C, { type: 'region', board: 'b', region: { id: 'mine' } }), 'ok');
  assert.deepEqual(canWrite(s, C, node('b', 50, 'r')), need('b', 'r'));
  assert.deepEqual(canWrite(s, C, { type: 'region', board: 'b2', region: { id: 'mine' } }), need('b2'), 'one board only');
});

test('a board revoke removes the board, never its creator; a v2 board has none', () => {
  const s = boardRevoked();
  assert.deepEqual([holders(s, 'b'), holders(s, 'b', 'q')], [[A], [B]]);
  const v2 = new Ledger();
  v2.v2({ type: 'board', board: 'old', title: 'Old' });
  assert.deepEqual(holders(v2.state(), 'old'), []);
  assert.deepEqual(canWrite(v2.state(), C, { type: 'region', board: 'old', region: { id: 'r' } }), need('old'));
});

// ---- The oracle: the rule this table replaced (grants.ts `canWrite`), as it was. ----

function oldCanWrite(s: LedgerState, agent: string, item: WriteItem): 'ok' | Container {
  const exists = (c: Container) => s.index.boards.get(c.board)?.has(c.region) ?? false;
  const holds = (c: Container) => s.index.holders.get(containerKey(c.board, c.region))?.has(agent) ?? false;
  const want = (c: Container | undefined) => (c && exists(c) && !holds(c) ? c : undefined);
  const where = (n: number): Container | undefined => {
    const p = placeOf(s, n);
    return p && { board: p.board, region: exists(p) ? p.region : p.drawn };
  };
  switch (item.type) {
    case 'board': return 'ok';
    case 'region': return want({ board: item.board, region: item.region.id }) ?? 'ok';
    case 'node': {
      const target = { board: item.board, region: item.node.region };
      const now = where(item.n);
      if (!now) return want(target) ?? 'ok';
      const moves = now.board !== target.board || now.region !== target.region;
      return want(now) ?? (moves ? want(target) : undefined) ?? 'ok';
    }
    case 'link': case 'unlink': return want(where(item.from)) ?? 'ok';
    default: {
      const x = s.nodes.get(item.n);
      if (!x || latest(x).agent === agent) return 'ok';
      return want(where(item.n)) ?? 'ok';
    }
  }
}

const FIXTURES = [
  '../../format/fixtures/roadmap.ledger.jsonl',
  '../../format/fixtures/login-review.ledger.jsonl',
  '../../format/fixtures/login-layout.ledger.jsonl',
  '../../../apps/board/src/gallery/gallery.ledger.jsonl',
];
const lines = (rel: string) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8').split('\n');

/** Every agent write in `events`, judged before it is folded: the writes the old rule allowed
 * from an agent that already held a container on that board, and those of them refused now. */
function replay(events: readonly LedgerEvent[]): { checked: number; refused: string[] } {
  const s = emptyState();
  let checked = 0;
  const refused: string[] = [];
  for (const e of events) {
    if (e.by === 'agent' && e.agent !== undefined && e.v !== 2 && e.type in PERMISSIONS) {
      const board = scopeOf(s, e).board;
      const held = REFERENCES.agent.lookup(s, e.agent).some((c) => c.board === board);
      const item = e as unknown as WriteItem;
      if (held && oldCanWrite(s, e.agent, item) === 'ok') {
        checked++;
        const now: Verdict = canWrite(s, e.agent, item);
        if (now !== 'ok') refused.push(`line ${e.seq} (${e.type}): ${JSON.stringify(now)}`);
      }
    }
    applyEvent(s, e);
  }
  return { checked, refused };
}

test('every fixture ledger: no write that worked before is refused now for an agent holding a container on that board', () => {
  let checked = 0;
  for (const rel of FIXTURES) {
    const read = readLedger(lines(rel));
    assert.deepEqual(read.problems, [], rel);
    const r = replay(read.events);
    assert.deepEqual(r.refused, [], rel);
    checked += r.checked;
  }
  const own = scene();
  own.act({ action: 'grant', request: own.request(C, 'r') });
  own.node(C, 1, 2, { region: 'r' });
  own.agent(C, { type: 'reply', n: 1, text: 'Answered.' });
  const r = replay(readLedger(own.lines).events);
  assert.deepEqual(r.refused, []);
  assert.ok(checked + r.checked >= 20, `${checked + r.checked} writes checked`);
});
