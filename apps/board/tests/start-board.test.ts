// Which board the page opens (page-polish ruling B, board/boards/start-board.ts): the hash always wins;
// with none, the board this viewer last looked at if it still exists; else the first, as before.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAST_BOARD_KEY, nextBoard, startBoard } from '../src/board/boards/start-board.ts';

const BOARDS = ['roadmap', 'pricing', 'hiring'];

test('startBoard: a board in the hash wins over the one last looked at', () => {
  assert.equal(startBoard(BOARDS, 'hiring', 'pricing'), 'hiring');
});

test('startBoard: no hash opens the board last looked at', () => {
  assert.equal(startBoard(BOARDS, '', 'pricing'), 'pricing');
});

test('startBoard: a hash naming no board falls back to the last looked at', () => {
  assert.equal(startBoard(BOARDS, 'gone', 'pricing'), 'pricing');
});

test('startBoard: a last board that no longer exists, or none kept, opens the first', () => {
  assert.equal(startBoard(BOARDS, '', 'gone'), 'roadmap');
  assert.equal(startBoard(BOARDS, '', null), 'roadmap');
});

test('startBoard: the key is in the vb. family', () => {
  assert.equal(LAST_BOARD_KEY, 'vb.lastBoard');
});

// N39 ruling 4: an archived board never opens by default; the next board after it does.
const ORDER = ['roadmap', 'old-plan', 'pricing', 'hiring'];

test('startBoard: a last board that is archived opens the next board after it', () => {
  assert.equal(startBoard(BOARDS, '', 'old-plan', ORDER), 'pricing');
  assert.equal(startBoard(BOARDS, 'old-plan', 'hiring', ORDER), 'pricing', 'an archived board in the hash gives way too');
});

test('nextBoard: the first shown board after it, else the nearest before it, else none', () => {
  assert.equal(nextBoard(ORDER, 'old-plan', BOARDS), 'pricing');
  assert.equal(nextBoard(ORDER, 'hiring', ['roadmap', 'pricing']), 'pricing');
  assert.equal(nextBoard(ORDER, 'roadmap', ['hiring']), 'hiring');
  assert.equal(nextBoard(ORDER, 'pricing', []), undefined);
  assert.equal(nextBoard(ORDER, 'gone', ['hiring']), 'hiring', 'a board not in the order: the first shown');
});
