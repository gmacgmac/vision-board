// Notes beside cards over the API (2e_FE_01, api.md 58-61): the person edits and removes a note
// not yet sent through `act`; the server refuses a second note, and any change after a Send.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { LEDGER_FORMAT } from '../../../packages/format/src/index.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
before(async () => { h = await startBoard(); });
after(() => h.close());

const act = (body: object) => ({ board: 'roadmap', body: { type: 'act', ...body } });
const notesOf = async (n: number) => (await h.ok('show_node', { board: 'roadmap', n })).notes;

test('edit, then check_responses and show_node carry the latest text under the note\'s own seq', async () => {
  const [seeded] = await notesOf(1);
  const stored = await h.ok('act', act({ action: 'note-edit', n: 1, note: seeded.seq, text: 'Rule 6 needs two examples.' }));
  assert.equal(stored.v, LEDGER_FORMAT);
  assert.deepEqual((await notesOf(1)).map((x: any) => [x.seq, x.text, x.sent ?? false]),
    [[seeded.seq, 'Rule 6 needs two examples.', false]]);
  const r = await h.ok('check_responses', { board: 'roadmap', after: 0 });
  const mine = r.responses.filter((e: any) => e.n === 1);
  assert.deepEqual(mine.map((e: any) => [e.seq, e.action, e.text]), [[seeded.seq, 'comment', 'Rule 6 needs two examples.']]);
});

test('a second note on the same card is refused until Send', async () => {
  const p = await h.fails('act', act({ action: 'comment', n: 1, ver: 1, text: 'Another thought.' }), 422, 'invalid');
  assert.equal(p.errors[0]!.pointer, '/n');
  assert.match(p.errors[0]!.detail, /note-edit/);
});

test('after Send the note is history: note-edit and note-remove are refused with a pointer at note', async () => {
  const [note] = await notesOf(1);
  await h.ok('act', act({ action: 'send', board: 'roadmap' }));
  assert.equal((await notesOf(1))[0].sent, true);
  for (const body of [{ action: 'note-edit', text: 'Too late.' }, { action: 'note-remove' }]) {
    const p = await h.fails('act', act({ ...body, n: 1, note: note.seq }), 422, 'invalid');
    assert.equal(p.errors[0]!.pointer, '/note', body.action);
    assert.match(p.errors[0]!.detail, /sent/);
  }
  await h.ok('act', act({ action: 'comment', n: 1, ver: 1, text: 'A new note after Send.' }));
  assert.equal((await notesOf(1)).length, 2);
});

test('note-remove takes a note back: show_node and list_open no longer have it', async () => {
  const notes = await notesOf(1);
  const latest = notes.at(-1);
  await h.ok('act', act({ action: 'note-remove', n: 1, note: latest.seq }));
  assert.deepEqual((await notesOf(1)).map((x: any) => x.seq), [notes[0].seq]);
  const open = await h.ok('list_open', { board: 'roadmap' });
  assert.equal(open.items.find((x: any) => x.n === 1).pending, 'comment', 'the sent note is still owed');
});

test('a group note (3_FE_02): one act with nodes, shown on each card, seen once by the agent', async () => {
  const before = (await h.ok('check_responses', { board: 'roadmap', after: 0 })).head;
  const stored = await h.ok('act', act({ action: 'comment', nodes: [5, 6], text: 'Both need a source.' }));
  assert.deepEqual([stored.v, stored.nodes, stored.n, stored.ver], [LEDGER_FORMAT, [5, 6], undefined, undefined]);
  for (const n of [5, 6]) {
    assert.deepEqual((await notesOf(n)).map((x: any) => [x.seq, x.nodes, x.text]), [[stored.seq, [5, 6], 'Both need a source.']]);
  }
  const r = await h.ok('check_responses', { board: 'roadmap', after: before });
  assert.deepEqual(r.responses.map((e: any) => [e.seq, e.nodes]), [[stored.seq, [5, 6]]]);
  await h.ok('act', act({ action: 'note-edit', n: 6, note: stored.seq, text: 'Both need a source, please.' }));
  assert.equal((await notesOf(5))[0].text, 'Both need a source, please.');
  // Any cards, any kinds (api.md 118); a card that does not exist is refused.
  await h.ok('act', act({ action: 'comment', nodes: [5, 7], text: 'x' }));
  const p = await h.fails('act', act({ action: 'comment', nodes: [5, 999], text: 'x' }), 422, 'invalid');
  assert.deepEqual(p.errors, [{ pointer: '/nodes/1', detail: 'board roadmap has no card 999' }]);
});
