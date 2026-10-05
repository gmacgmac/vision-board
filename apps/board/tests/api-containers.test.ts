// Notes on a whole container and container places over the API (3_FE_04, api.md 71-76): the
// person's `comment`/`context` and `pin`/`unpin` with `board` + `region`; `show_container`,
// `get_board` (`state.containerNotes`, `state.containerPins`) and `check_responses` carry them. Every
// response is checked against the spec (api.md 54).
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
before(async () => { h = await startBoard(); });
after(() => h.close());

const act = (body: object) => ({ board: 'roadmap', body: { type: 'act', ...body } });
const on = { board: 'roadmap', region: 'review' };

test('a container note: show_container, get_board and check_responses carry its latest words', async () => {
  const stored = await h.ok('act', act({ action: 'comment', ...on, text: 'Is review its own stage?' }));
  assert.deepEqual([stored.v, stored.action, stored.region, stored.n], [7, 'comment', 'review', undefined]);
  await h.ok('act', act({ action: 'note-edit', ...on, note: stored.seq, text: 'Should review be its own stage?' }));
  const box = await h.ok('show_container', { board: 'roadmap', region: 'review' });
  assert.deepEqual(box.notes.map((x: any) => [x.seq, x.text, x.sent]), [[stored.seq, 'Should review be its own stage?', undefined]]);
  const board = await h.ok('get_board', { board: 'roadmap' });
  assert.deepEqual(board.state.containerNotes.review.map((x: any) => x.seq), [stored.seq]);
  const r = await h.ok('check_responses', { board: 'roadmap', after: stored.seq - 1 });
  assert.deepEqual(r.responses.map((e: any) => [e.seq, e.region, e.text]), [[stored.seq, 'review', 'Should review be its own stage?']]);
  // One unsent note per container: a second is refused, pointing at the region.
  const p = await h.fails('act', act({ action: 'comment', ...on, text: 'Again' }), 422, 'invalid');
  assert.equal(p.errors[0]!.pointer, '/region');
  await h.ok('act', act({ action: 'note-remove', ...on, note: stored.seq }));
  assert.equal((await h.ok('get_board', { board: 'roadmap' })).state.containerNotes, undefined, 'left out when none');
});

test('a container place: get_board carries it in state.containerPins; unpin puts it back', async () => {
  await h.ok('act', act({ action: 'pin', ...on, x: 1800, y: 40 }));
  assert.deepEqual((await h.ok('get_board', { board: 'roadmap' })).state.containerPins, { review: { x: 1800, y: 40 } });
  assert.deepEqual((await h.ok('show_container', { board: 'roadmap', region: 'review' })).pin, { x: 1800, y: 40 });
  await h.ok('act', act({ action: 'unpin', ...on }));
  assert.equal((await h.ok('get_board', { board: 'roadmap' })).state.containerPins, undefined);
});

test('refused: a note on Later, an unknown container, a place without its board', async () => {
  let p = await h.fails('act', act({ action: 'comment', board: 'roadmap', region: 'later', text: 'x' }), 422, 'invalid');
  assert.match(p.errors[0]!.detail, /Later takes no note/);
  p = await h.fails('act', act({ action: 'pin', board: 'roadmap', region: 'nowhere', x: 1, y: 1 }), 422, 'invalid');
  assert.equal(p.errors[0]!.pointer, '/region');
  p = await h.fails('act', act({ action: 'pin', region: 'review', x: 1, y: 1 }), 422, 'invalid');
  assert.equal(p.errors[0]!.pointer, '/board');
});
