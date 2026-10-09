// Which board the page opens (page-polish ruling B, board/start-board.ts): the hash always wins;
// with none, the board this viewer last looked at if it still exists; else the first, as before.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAST_BOARD_KEY, startBoard } from '../src/board/start-board.ts';

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
