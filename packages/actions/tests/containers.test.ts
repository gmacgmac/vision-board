// Notes on a whole container and the person's container places (3_FE_04 rulings 1-4 and 6-7,
// api.md 71-76): a container note is a `comment` or `context` act with `board` + `region` in place
// of `n`/`ver`/`nodes`, changed by `note-edit`/`note-remove` the same way; a container place is a
// `pin`/`unpin` with `board` + `region`, in board coordinates. Person only; the built-in Later may
// be placed but takes no note.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent } from '../../format/src/index.ts';
import { boardView, eventProblems, LATER_REGION, readLedger } from '../../format/src/index.ts';
import { boardState, containerDetail, replyText, responsesAfter, validateAct } from '../src/index.ts';
import { A, B, Ledger } from './ledger-v3.ts';

const AT = '2026-10-05T10:00:00Z';
const base = { v: 7, seq: 9, at: AT, by: 'person', type: 'act' };
const on = { board: 'b', region: 'r' };

/** Board `b`: A holds `r` (item 1), B holds `q` (item 2). Board `b2`: A, `x`, item 3. */
function containers(): Ledger {
  const l = new Ledger();
  l.v = 7;
  l.agent(A, { type: 'join', label: 'Pricing chat' });
  l.agent(B, { type: 'join', label: 'Review chat' });
  l.agent(A, { type: 'board', board: 'b', title: 'Board' });
  l.region(A, 'r');
  l.node(A, 1, 1, { region: 'r' });
  l.region(B, 'q');
  l.node(B, 2, 1, { region: 'q' });
  l.agent(A, { type: 'board', board: 'b2', title: 'Board two' });
  l.region(A, 'x', 'b2');
  l.node(A, 3, 1, { region: 'x' }, 'b2');
  return l;
}

const next = (l: Ledger, f: Partial<ActEvent>): ActEvent =>
  ({ v: 7, seq: l.seq + 1, at: AT, by: 'person', type: 'act', action: 'comment', ...f } as ActEvent);

test('shape: a container note and a container place name board and region in place of n, ver and nodes', () => {
  for (const f of [
    { action: 'comment', ...on, text: 'Is this the right split?' },
    { action: 'context', ...on, text: 'Say more about the split.' },
    { action: 'pin', ...on, x: 420, y: -16 },
    { action: 'pin', board: 'b', region: LATER_REGION, x: 0, y: 900 },
    { action: 'unpin', ...on },
    { action: 'note-edit', ...on, note: 12, text: 'Edited', kind: 'context' },
    { action: 'note-remove', ...on, note: 12 },
  ]) assert.deepEqual(eventProblems({ ...base, ...f }), [], JSON.stringify(f));
  const refused: [string, object][] = [
    ['a note without board', { action: 'comment', region: 'r', text: 'x' }],
    ['a note with n as well', { action: 'comment', ...on, n: 1, text: 'x' }],
    ['a note with ver as well', { action: 'comment', ...on, ver: 1, text: 'x' }],
    ['a note with nodes as well', { action: 'comment', ...on, nodes: [1, 2], text: 'x' }],
    ['a more-context note without words', { action: 'context', ...on }],
    ['a place without y', { action: 'pin', ...on, x: 4 }],
    ['a place with n as well', { action: 'pin', ...on, n: 1, x: 4, y: 4 }],
    ['an unpin without board', { action: 'unpin', region: 'r' }],
    ['an edit without note', { action: 'note-edit', ...on, text: 'x' }],
  ];
  for (const [name, f] of refused) assert.ok(eventProblems({ ...base, ...f }).length, name);
});

test('context: the region is a container on that board; a place may name Later, a note may not', () => {
  const ok = containers();
  ok.act({ action: 'comment', ...on, text: 'Split it?' });
  ok.act({ action: 'pin', board: 'b', region: LATER_REGION, x: 10, y: 10 });
  ok.act({ action: 'pin', board: 'b', region: 'q', x: 10, y: 10 });
  assert.deepEqual(readLedger(ok.lines).problems, []);
  for (const [f, word] of [
    [{ action: 'comment', board: 'b', region: 'nowhere', text: 'x' }, 'unknown "nowhere"'],
    [{ action: 'comment', board: 'b', region: 'x', text: 'x' }, 'unknown "x"'],
    [{ action: 'comment', board: 'b', region: LATER_REGION, text: 'x' }, `unknown "${LATER_REGION}"`],
    [{ action: 'pin', board: 'zz', region: 'r', x: 1, y: 1 }, 'unknown "zz"'],
  ] as const) {
    const l = containers();
    l.act(f);
    assert.ok(readLedger(l.lines).problems.some((p) => p.includes(word)), `${JSON.stringify(f)}: ${readLedger(l.lines).problems.join('; ')}`);
  }
});

test('fold: the latest place wins, unpin puts it back, and the order is the order they were dropped', () => {
  const l = containers();
  l.act({ action: 'pin', ...on, x: 400, y: 0 });
  l.act({ action: 'pin', board: 'b', region: 'q', x: 0, y: 500 });
  l.act({ action: 'pin', ...on, x: 640, y: 20 });
  assert.deepEqual([...boardState(l.state(), 'b').regionPins], [['q', { x: 0, y: 500 }], ['r', { x: 640, y: 20 }]]);
  l.act({ action: 'unpin', board: 'b', region: 'q' });
  assert.deepEqual([...boardState(l.state(), 'b').regionPins], [['r', { x: 640, y: 20 }]]);
  // A container's place is not a card's: no card pin, and another board keeps none.
  assert.deepEqual([...boardState(l.state(), 'b').pins], []);
  assert.deepEqual([...boardState(l.state(), 'b2').regionPins], []);
  // The agent's view never holds a coordinate (rule 9).
  assert.ok(!JSON.stringify(boardView(l.state(), 'b')).includes('640'));
});

test('fold: a container note, edited and removed the card-note way; Send makes it history', () => {
  const l = containers();
  const note = l.act({ action: 'comment', ...on, text: 'Is this the right split?' });
  l.act({ action: 'note-edit', ...on, note, text: 'Split by plan instead?', kind: 'context' });
  let notes = boardState(l.state(), 'b').regionNotes.get('r')!;
  assert.deepEqual(notes.map((x) => [x.seq, x.kind, x.text, x.region, x.sent]), [[note, 'context', 'Split by plan instead?', 'r', undefined]]);
  l.act({ action: 'send', board: 'b' });
  notes = boardState(l.state(), 'b').regionNotes.get('r')!;
  assert.equal(notes[0]!.sent, true);
  const second = l.act({ action: 'comment', ...on, text: 'Second thought.' });
  l.act({ action: 'note-remove', ...on, note: second });
  assert.deepEqual(boardState(l.state(), 'b').regionNotes.get('r')!.map((x) => x.seq), [note]);
  // A container note is no card's: no item gains a note or a status.
  assert.deepEqual([...boardState(l.state(), 'b').items], []);
});

test('validateAct: one unsent note per container, changed only by its writer before Send; Later takes none', () => {
  const l = containers();
  const s0 = l.state();
  assert.deepEqual(validateAct(next(l, { ...on, text: 'Split?' }), s0, 'b'), []);
  assert.deepEqual(validateAct(next(l, { action: 'pin', board: 'b', region: LATER_REGION, x: 1, y: 2 }), s0, 'b'), []);
  const refused = (f: Partial<ActEvent>, word: string, s = l.state(), board = 'b') => {
    const p = validateAct(next(l, f), s, board);
    assert.ok(p.some((x) => x.includes(word)), `${JSON.stringify(f)}: ${p.join('; ')}`);
  };
  refused({ board: 'b', region: LATER_REGION, text: 'x' }, 'Later takes no note');
  refused({ board: 'b', region: 'nowhere', text: 'x' }, 'unknown "nowhere"');
  refused({ board: 'b2', region: 'x', text: 'x' }, 'sent to board "b"');
  refused({ action: 'pin', board: 'b', region: 'nowhere', x: 1, y: 1 }, 'unknown "nowhere"');
  const note = l.act({ action: 'comment', ...on, text: 'Split?' });
  refused({ ...on, text: 'Again' }, 'already has a note not yet sent');
  assert.deepEqual(validateAct(next(l, { action: 'note-edit', ...on, note, text: 'Edited' }), l.state(), 'b'), []);
  refused({ action: 'note-edit', board: 'b', region: 'q', note, text: 'x' }, 'is on container "r"');
  l.act({ action: 'send', board: 'b' });
  refused({ action: 'note-remove', ...on, note }, 'history');
  assert.deepEqual(validateAct(next(l, { ...on, text: 'After Send' }), l.state(), 'b'), []);
  const agent = { ...next(l, { ...on, text: 'x' }), by: 'agent' as const, agent: A };
  assert.ok(validateAct(agent, l.state(), 'b')[0]!.includes('only the person'));
});

test('reads: show_container carries the latest note, shaped like a card note with region in place of n', () => {
  const l = containers();
  assert.equal(containerDetail(l.state(), 'b', 'r')!.note, undefined);
  const note = l.act({ action: 'comment', ...on, text: 'Split?' });
  assert.deepEqual(containerDetail(l.state(), 'b', 'r')!.note, { seq: note, kind: 'comment', text: 'Split?', at: l.state().acts.at(-1)!.at, region: 'r' });
  l.act({ action: 'send', board: 'b' });
  assert.equal(containerDetail(l.state(), 'b', 'r')!.note!.sent, true);
  assert.equal(containerDetail(l.state(), 'b', 'q')!.note, undefined);
});

test('check_responses: a container note reaches the container\'s holders, with its latest words; a removed one is gone', () => {
  const l = containers();
  const note = l.act({ action: 'comment', ...on, text: 'Split?' });
  l.act({ action: 'note-edit', ...on, note, text: 'Split by plan?' });
  const place = l.act({ action: 'pin', ...on, x: 9, y: 9 });
  assert.deepEqual(responsesAfter(l.state(), 'b', 0, A).map((e) => [e.seq, e.action, e.region, e.text]),
    [[note, 'comment', 'r', 'Split by plan?'], [place, 'pin', 'r', undefined]]);
  assert.deepEqual(responsesAfter(l.state(), 'b', 0, B), [], 'B holds q, not r');
  l.act({ action: 'note-remove', ...on, note });
  assert.deepEqual(responsesAfter(l.state(), 'b', 0, A).map((e) => e.seq), [place]);
});

test('the numbered reply names a container note once, as "on container <title>"', () => {
  const l = containers();
  l.act({ action: 'comment', ...on, text: 'Split by plan?' });
  l.act({ action: 'comment', board: 'b', region: 'q', text: 'More on review?' });
  const s = l.state();
  const text = replyText(boardView(s, 'b'), boardState(s, 'b'));
  assert.equal(text.split('\n').filter((x) => x.includes('on container')).length, 2);
  assert.ok(text.includes('on container r comment: Split by plan?'), text);
  assert.ok(text.includes('on container q comment: More on review?'), text);
});
