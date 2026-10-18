// Locking a board in the action layer (N40 rulings 1-7, api.md 138-140): the fold keeps the locked
// set; `boardLocked` counts an archived board as locked (archive implies lock) and a restore returns
// the lock it had; lock and unlock are the person's, moving no head and reaching no agent;
// `writeProblem` is the one "may this line be written" check: on a locked board every act in the
// registry is refused but the person's own marks, every agent line is refused, and an archived board
// is never named to an agent. Walks ACTION_IDS and EVENT_TYPES, so a new action or event is covered.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent, ActionId, EventType, LedgerEvent } from '../../format/src/index.ts';
import { ACTION_IDS, EVENT_TYPES, LATER_REGION } from '../../format/src/index.ts';
import type { LedgerState } from '../src/index.ts';
import {
  boardList, boardLocked, boardState, LOCKED, LOCKED_PERSON, lockedProblem, passesLock, responsesAfter, UNAVAILABLE, validateAct,
  writeProblem,
} from '../src/index.ts';
import { A, B, Ledger, scene } from './ledger-v3.ts';

const AT = '2026-10-12T09:00:00Z';
const asAct = (s: LedgerState, e: object): ActEvent => ({ v: 15, seq: s.seq + 1, at: AT, by: 'person', type: 'act', ...e }) as ActEvent;

/** The scene (boards `b` and `b2`), with a note, a proposal and a grant request on `b2`'s card 4,
 * then the person locks `b2`. */
function locked(): { l: Ledger; at: number; note: number; proposal: number; request: number } {
  const l = scene();
  l.v = 15;
  const note = l.act({ action: 'comment', n: 4, ver: 1, text: 'Why this one?' });
  const proposal = l.agent(A, { type: 'propose', n: 4, ver: 1, action: 'ack', reason: 'Done already.' });
  const request = l.request(B, 'x', 'b2');
  const at = l.act({ action: 'lock', board: 'b2' });
  return { l, at, note, proposal, request };
}

/** One act of every action in the registry, on card 4 of `b2` or on `b2` itself. A new action
 * needs a line here, or this file doesn't compile. */
function everyAct(f: { note: number; proposal: number; request: number }): Record<ActionId, object> {
  const card = { id: 4, ver: 1 };
  return {
    ack: card, drop: card, comment: { ...card, text: 'Why?' }, context: card, later: card, reopen: card,
    pin: { id: 4, x: 10, y: 20 }, unpin: { id: 4 }, mode: { board: 'b2', region: 'x', mode: 'flow' },
    grant: { request: f.request }, deny: { request: f.request }, revoke: { holder: A, board: 'b2' },
    size: { id: 4, size: 'l' }, send: { board: 'b2' }, 'note-edit': { id: 4, note: f.note, text: 'Why not?' },
    'note-remove': { id: 4, note: f.note }, move: { id: 4, region: LATER_REGION }, reject: { id: 4, proposal: f.proposal },
    flag: { id: 4 }, unflag: { id: 4 }, widths: { board: 'b2', region: 'x', widths: 'match' },
    archive: { board: 'b2' }, restore: { board: 'b2' }, lock: { board: 'b2' }, unlock: { board: 'b2' },
    'app-allow': { app: 'calculator', hash: 'a'.repeat(64) }, 'app-revoke': { app: 'calculator' },
  };
}

test('the fold keeps the locked set: lock adds the board, unlock takes it out', () => {
  const { l, at } = locked();
  assert.deepEqual([...l.state().locked], [['b2', at]]);
  l.act({ action: 'unlock', board: 'b2' });
  assert.deepEqual([...l.state().locked], []);
});

test('boardLocked: a locked board, an archived one (archive implies lock), never an open or unknown one', () => {
  const { l } = locked();
  l.act({ action: 'archive', board: 'b' });
  const s = l.state();
  assert.deepEqual(['b', 'b2', 'nope'].map((b) => boardLocked(s, b)), [true, true, false]);
  assert.deepEqual([...s.locked.keys()], ['b2'], 'archiving writes no lock of its own');
});

test('lock and unlock move no head and no date, see no card, and no agent reads them', () => {
  const l = scene();
  const before = l.state();
  l.v = 15;
  l.act({ action: 'lock', board: 'b2' });
  l.act({ action: 'unlock', board: 'b2' });
  const s = l.state();
  assert.deepEqual([s.heads, s.dates, s.seen], [before.heads, before.dates, before.seen]);
  assert.equal(s.acts.length, before.acts.length, 'not among the acts check_responses reads');
  assert.deepEqual(responsesAfter(s, 'b2', 0), []);
  assert.deepEqual(s.unsent.get('b2'), before.unsent.get('b2'));
});

test('validateAct: lock a board that exists and is not locked; unlock one that is; only the person', () => {
  const { l } = locked();
  const s = l.state();
  assert.deepEqual(validateAct(asAct(s, { action: 'lock', board: 'b' }), s, 'b'), []);
  assert.deepEqual(validateAct(asAct(s, { action: 'unlock', board: 'b2' }), s, 'b2'), []);
  assert.deepEqual(validateAct(asAct(s, { action: 'lock', board: 'b2' }), s, 'b2'), ['board: "b2" is already locked']);
  assert.deepEqual(validateAct(asAct(s, { action: 'unlock', board: 'b' }), s, 'b'), ['board: "b" isn\'t locked']);
  assert.deepEqual(validateAct(asAct(s, { action: 'lock', board: 'nope' }), s), ['board: unknown "nope"']);
  assert.deepEqual(validateAct(asAct(s, { action: 'lock', board: 'b' }), s, 'b2'), ['board: this act names board "b" but was sent to board "b2"']);
  for (const action of ['lock', 'unlock']) {
    const e = { ...asAct(s, { action, board: 'b' }), by: 'agent', agent: A } as ActEvent;
    assert.match(validateAct(e, s, 'b')[0]!, /only the person can do this/, action);
  }
});

test('on a locked board every act in the registry is refused but the person\'s own marks; unlocked, they go', () => {
  const f = locked();
  const s = f.l.state();
  const acts = everyAct(f);
  const passing: ActionId[] = [];
  for (const action of ACTION_IDS) {
    const problems = validateAct(asAct(s, { action, ...acts[action] }), s, 'b2');
    if (passesLock({ type: 'act', action })) {
      passing.push(action);
      assert.ok(!problems.includes(LOCKED_PERSON), `${action}: ${problems.join('; ')}`);
    } else assert.deepEqual(problems, [LOCKED_PERSON], action);
  }
  // An app's allow and stop are on no board, so no board's lock holds them (api.md 150).
  assert.deepEqual(passing.sort(), ['app-allow', 'app-revoke', 'archive', 'flag', 'lock', 'restore', 'unflag', 'unlock']);
  f.l.act({ action: 'unlock', board: 'b2' });
  const open = f.l.state();
  for (const action of ['ack', 'note-edit', 'mode', 'send', 'grant', 'move'] as const)
    assert.deepEqual(validateAct(asAct(open, { action, ...acts[action] }), open, 'b2'), [], action);
});

test('on a locked board every agent line is refused in plain words; the person\'s seen goes; other boards are untouched', () => {
  const { l, proposal } = locked();
  const s = l.state();
  const agent = (e: object) => ({ v: 15, seq: s.seq + 1, at: AT, by: 'agent', agent: A, ...e }) as LedgerEvent;
  const lines: Record<Exclude<EventType, 'act' | 'seen' | 'join'>, LedgerEvent> = {
    board: agent({ type: 'board', board: 'b2', title: 'Mine now' }),
    region: agent({ type: 'region', board: 'b2', region: { id: 'y', title: 'Y', mode: 'grid' } }),
    node: agent({ type: 'node', board: 'b2', id: 4, ver: 2, node: { region: 'x', kind: 'note', title: 'T' } }),
    link: agent({ type: 'link', from: 4, to: 4 }),
    unlink: agent({ type: 'unlink', from: 4, to: 4 }),
    reply: agent({ type: 'reply', id: 4, text: 'Done.' }),
    propose: agent({ type: 'propose', id: 4, ver: 1, action: 'drop', reason: 'Gone.' }),
    park: agent({ type: 'park', id: 4, situation: 'S', background: 'B', assessment: 'A', recommendation: 'R' }),
    retire: agent({ type: 'retire', board: 'b2', cards: [4] }),
    'grant-request': agent({ type: 'grant-request', board: 'b2', reason: 'Let me in.' }),
  };
  for (const t of EVENT_TYPES) {
    if (t === 'act' || t === 'seen' || t === 'join') continue;
    assert.equal(lockedProblem(s, lines[t]), LOCKED, t);
    assert.deepEqual(writeProblem(s, lines[t]), { code: 'locked', detail: LOCKED }, t);
  }
  assert.equal(lockedProblem(s, agent({ type: 'join', label: 'New chat' })), undefined, 'a join names no board');
  assert.equal(lockedProblem(s, agent({ type: 'node', board: 'b', id: 99, ver: 1, node: { region: 'r', kind: 'note', title: 'T' } })), undefined);
  const person = (e: object) => ({ v: 15, seq: s.seq + 1, at: AT, by: 'person', ...e }) as LedgerEvent;
  assert.equal(lockedProblem(s, person({ type: 'seen', board: 'b2', head: s.seq })), undefined);
  assert.equal(lockedProblem(s, person({ type: 'seen', id: 4, ver: 1 })), undefined);
  assert.equal(lockedProblem(s, person({ type: 'board', board: 'b2', title: 'Renamed' })), LOCKED_PERSON);
  assert.ok(proposal > 0);
});

test('writeProblem asks archived first: an agent is told an archived board\'s id isn\'t available, never that it is locked', () => {
  const { l } = locked();
  l.act({ action: 'archive', board: 'b2' });
  const s = l.state();
  const line = { v: 15, seq: s.seq + 1, at: AT, by: 'agent', agent: A, type: 'reply', id: 4, text: 'Done.' } as LedgerEvent;
  assert.deepEqual(writeProblem(s, line), { code: 'archived', detail: UNAVAILABLE });
});

test('archive implies lock, and a restore returns the lock the board had (ruling 5)', () => {
  const l = scene();
  l.v = 15;
  l.act({ action: 'archive', board: 'b' });
  assert.equal(boardLocked(l.state(), 'b'), true, 'an archived board is locked');
  l.act({ action: 'restore', board: 'b' });
  assert.equal(boardLocked(l.state(), 'b'), false, 'it was not locked before');
  l.act({ action: 'lock', board: 'b' });
  l.act({ action: 'archive', board: 'b' });
  const archived = l.state();
  for (const action of ['lock', 'unlock'])
    assert.deepEqual(validateAct(asAct(archived, { action, board: 'b' }), archived, 'b'), ['board: "b" is archived; restore it from the board picker first'], action);
  l.act({ action: 'restore', board: 'b' });
  assert.equal(boardLocked(l.state(), 'b'), true, 'it was locked before');
  l.act({ action: 'unlock', board: 'b' });
  assert.equal(boardLocked(l.state(), 'b'), false);
});

test('reads say it: boardList and boardState carry locked only while it stands', () => {
  const { l } = locked();
  const s = l.state();
  assert.deepEqual(boardList(s).map((b) => [b.board, b.locked]), [['b', undefined], ['b2', true]]);
  assert.equal(boardState(s, 'b2').locked, true);
  assert.ok(!('locked' in boardState(s, 'b')));
  l.act({ action: 'unlock', board: 'b2' });
  assert.ok(boardList(l.state()).every((b) => !('locked' in b)));
});
