// Chips (nclite plugin contract, draft v0.1, § Chips): the board adds a reference, and on send each
// chip is resolved to its current text, or refused when it is gone, removed, hidden, or its own
// words changed since it was added. A card's reference carries the version it was at, a note's the
// line that last edited it, so a chip survives edits elsewhere and not edits of itself.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { BoardRef, CardRef, Chip, ChipRefusal, NoteRef } from '../src/index.ts';
import { boardChip, boardData, boardJson, cardChip, noteChip, resolveChip, roundOf, ROUND_HEAD, turnOf } from '../src/index.ts';
import { A, scene } from './ledger-v3.ts';

/** The scene at v18 (notes can be hidden): board b's cards 1, 2 and 3, and board b2's card 4. */
const base = () => { const l = scene(); l.v = 18; return l; };
const chip = (c: Chip | ChipRefusal): Chip => { assert.ok(!('refused' in c), JSON.stringify(c)); return c; };
const cardRef = (c: Chip) => c.ref as CardRef;
const noteRef = (c: Chip) => c.ref as NoteRef;
const refused = (c: unknown, code: string, reason: RegExp) => {
  assert.ok(c && typeof c === 'object' && 'refused' in c, JSON.stringify(c));
  assert.equal((c as ChipRefusal).refused, code);
  assert.match((c as ChipRefusal).reason, reason);
};

test('a card chip is the contract\'s shape: the plugin, kind, a ref with the board, number and version, a label and a detail', () => {
  const s = base().state();
  assert.deepEqual(chip(cardChip(s, 'b', 1)), {
    plugin: 'board', kind: 'card', ref: { board: 'b', n: 1, ver: 1 }, label: 'Node 1', detail: 'Card 1 on board "b"',
  });
});

test('a card chip resolves to where it is and its title now', () => {
  const s = base().state();
  const c = chip(cardChip(s, 'b', 2));
  assert.deepEqual(resolveChip(s, 'card', cardRef(c)), { where: 'Board "b", card 2', text: 'Node 2' });
});

test('a card chip survives edits elsewhere, and is refused once the card itself changed', () => {
  const l = base();
  const c = chip(cardChip(l.state(), 'b', 1));
  l.act({ action: 'comment', n: 2, ver: 1, text: 'Elsewhere.' });
  l.node(A, 2, 2, { region: 'q', title: 'Node 2, redrawn', item: undefined });
  assert.ok('text' in resolveChip(l.state(), 'card', cardRef(c)), 'another card changed: still fine');
  l.node(A, 1, 2, { region: 'r', title: 'Node 1, redrawn', item: undefined });
  refused(resolveChip(l.state(), 'card', cardRef(c)), 'changed', /Card 1 on board "b" changed since you added it/);
});

test('a card chip is refused when the card is not there: no such number, no such board', () => {
  const s = base().state();
  refused(cardChip(s, 'b', 99), 'gone', /no card 99 on board "b"/);
  refused(cardChip(s, 'b', 4), 'gone', /no card 4 on board "b"/);
  refused(cardChip(s, 'nope', 1), 'gone', /no board "nope"/);
  refused(resolveChip(s, 'card', { board: 'b', n: 99, ver: 1 }), 'gone', /no card 99/);
  refused(resolveChip(s, 'card', { board: 'nope', n: 1, ver: 1 }), 'gone', /no board "nope"/);
});

test('a card chip is refused once the card was removed', () => {
  const l = base();
  const c = chip(cardChip(l.state(), 'b', 1));
  l.agent(A, { type: 'retire', board: 'b', cards: [1] });
  refused(resolveChip(l.state(), 'card', cardRef(c)), 'retired', /Card 1 on board "b" was removed/);
  refused(cardChip(l.state(), 'b', 1), 'retired', /was removed/);
});

test('a note chip: the ref is the board, the note\'s sequence and its last edit; it resolves to where it is and its words', () => {
  const l = base();
  const seq = l.act({ action: 'comment', n: 1, ver: 1, text: 'Why is this late?' });
  const c = chip(noteChip(l.state(), 'b', seq));
  assert.deepEqual(c, {
    plugin: 'board', kind: 'note', ref: { board: 'b', seq, rev: seq }, label: 'Why is this late?', detail: `Note ${seq} on card 1 "Node 1"`,
  });
  assert.deepEqual(resolveChip(l.state(), 'note', noteRef(c)), { where: `Board "b", note ${seq} on card 1 "Node 1"`, text: 'Why is this late?' });
});

test('a note chip on a group of cards names each card; one on a container names the container', () => {
  const l = base();
  const group = l.act({ action: 'comment', nodes: [1, 2], text: 'Both?' });
  const region = l.act({ action: 'comment', board: 'b', region: 'r', text: 'This container.' });
  const s = l.state();
  assert.equal(chip(noteChip(s, 'b', group)).detail, `Note ${group} on card 1 "Node 1", card 2 "Node 2"`);
  assert.equal(chip(noteChip(s, 'b', region)).detail, `Note ${region} on container "r"`);
});

test('a note chip is refused once its own words were edited, and a new chip of it resolves', () => {
  const l = base();
  const seq = l.act({ action: 'comment', n: 1, ver: 1, text: 'First words.' });
  const old = chip(noteChip(l.state(), 'b', seq));
  const edit = l.act({ action: 'note-edit', n: 1, note: seq, text: 'Second words.' });
  refused(resolveChip(l.state(), 'note', noteRef(old)), 'changed', new RegExp(`Note ${seq} on board "b" changed since you added it`));
  const fresh = chip(noteChip(l.state(), 'b', seq));
  assert.deepEqual(fresh.ref, { board: 'b', seq, rev: edit });
  assert.equal((resolveChip(l.state(), 'note', noteRef(fresh)) as { text: string }).text, 'Second words.');
});

test('a note chip survives a note elsewhere being edited', () => {
  const l = base();
  const seq = l.act({ action: 'comment', n: 1, ver: 1, text: 'Mine.' });
  const other = l.act({ action: 'comment', n: 2, ver: 1, text: 'Theirs.' });
  const c = chip(noteChip(l.state(), 'b', seq));
  l.act({ action: 'note-edit', n: 2, note: other, text: 'Theirs, edited.' });
  assert.ok('text' in resolveChip(l.state(), 'note', noteRef(c)));
});

test('a note chip is refused when the note is gone: removed, unknown, on another board, or on a board that is not there', () => {
  const l = base();
  const seq = l.act({ action: 'comment', n: 1, ver: 1, text: 'Soon gone.' });
  const c = chip(noteChip(l.state(), 'b', seq));
  refused(noteChip(l.state(), 'b', 9999), 'gone', /no note 9999 on board "b"/);
  refused(noteChip(l.state(), 'b2', seq), 'gone', new RegExp(`no note ${seq} on board "b2"`));
  refused(noteChip(l.state(), 'nope', seq), 'gone', /no board "nope"/);
  l.act({ action: 'note-remove', n: 1, note: seq });
  refused(resolveChip(l.state(), 'note', noteRef(c)), 'gone', new RegExp(`no note ${seq}`));
});

test('a note chip is refused when its card was removed, and when its container was', () => {
  const l = base();
  const onCard = l.act({ action: 'comment', n: 1, ver: 1, text: 'On a card.' });
  const onRegion = l.act({ action: 'comment', board: 'b', region: 'r', text: 'On a container.' });
  const cards = chip(noteChip(l.state(), 'b', onCard));
  const region = chip(noteChip(l.state(), 'b', onRegion));
  l.agent(A, { type: 'retire', board: 'b', cards: [1] });
  refused(resolveChip(l.state(), 'note', noteRef(cards)), 'retired', /card note \d+ is on was removed/);
  l.agent(A, { type: 'retire', board: 'b', cards: [], region: 'r' });
  refused(resolveChip(l.state(), 'note', noteRef(region)), 'retired', /Container "r" on board "b" was removed/);
});

test('a note chip is refused while the notes on its card are hidden, and resolves again once shown', () => {
  const l = base();
  const seq = l.act({ action: 'comment', n: 1, ver: 1, text: 'Put away.' });
  const c = chip(noteChip(l.state(), 'b', seq));
  l.act({ action: 'notes-hide', n: 1 });
  refused(resolveChip(l.state(), 'note', noteRef(c)), 'hidden', new RegExp(`Note ${seq} is hidden`));
  l.act({ action: 'notes-show', n: 1 });
  assert.ok('text' in resolveChip(l.state(), 'note', noteRef(c)));
});

test('a board chip is the board\'s title and its head; it resolves to the board as the bot reads it, and is never "changed"', () => {
  const l = base();
  const s = l.state();
  const c = chip(boardChip(s, 'b'));
  assert.deepEqual(c, { plugin: 'board', kind: 'board', ref: { board: 'b', head: s.seq }, label: c.label, detail: 'Board "b"' });
  assert.equal(c.label, s.boards.get('b')!.title);
  const now = resolveChip(s, 'board', c.ref as BoardRef);
  assert.deepEqual(now, { where: 'Board "b"', text: JSON.stringify(boardJson(boardData(s, 'b'))) });
  l.act({ action: 'comment', n: 1, ver: 1, text: 'Moves the head.' });
  const later = resolveChip(l.state(), 'board', c.ref as BoardRef);
  assert.ok('text' in later, 'the board moved on, the chip still resolves');
  assert.notEqual(later.text, (now as { text: string }).text, 'and says the board as it is now');
});

test('a board chip is refused when the board is not there, and when it is archived', () => {
  const l = base();
  const c = chip(boardChip(l.state(), 'b2'));
  refused(boardChip(l.state(), 'nope'), 'gone', /no board "nope"/);
  refused(resolveChip(l.state(), 'board', { board: 'nope', head: 1 }), 'gone', /no board "nope"/);
  l.act({ action: 'archive', board: 'b2' });
  refused(boardChip(l.state(), 'b2'), 'retired', /Board "b2" is archived/);
  refused(resolveChip(l.state(), 'board', c.ref as BoardRef), 'retired', /Board "b2" is archived/);
});

test('turnOf: the answers since the last message are roundOf\'s, none is none, and a board that is not there is refused', () => {
  const l = base();
  assert.equal(turnOf(l.state(), 'b', 0), undefined, 'nothing answered');
  l.act({ action: 'ack', n: 1, ver: 1 });
  const s = l.state();
  const turn = turnOf(s, 'b', 0, A);
  assert.deepEqual(turn, roundOf(s, 'b', 0, A));
  assert.ok(turn && !('refused' in turn) && turn.text.startsWith(ROUND_HEAD) && turn.count === 1);
  refused(turnOf(s, 'nope', 0), 'gone', /no board "nope"/);
});
