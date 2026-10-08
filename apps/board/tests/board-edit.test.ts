// A new board's id from its title (navigation BE_01 ruling 3): lowercase letters and digits joined
// by hyphens, within the id limit, unique among the boards; and the dialog's answer goes to the
// sender as one `put_board`, then the new board opens; Rename renames the open board.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ID_PATTERN } from '../../../packages/format/src/index.ts';
import { boardIdFor, createBoardEdit } from '../src/board/board-edit.ts';
import type { BoardFields } from '../src/board/io.ts';

const none = new Set<string>();

test('boardIdFor: lowercase and hyphens, accents dropped, within 64, unique', () => {
  assert.equal(boardIdFor('Hiring plan 2027', none), 'hiring-plan-2027');
  assert.equal(boardIdFor('  Café: prices & “tiers”!  ', none), 'cafe-prices-tiers');
  assert.equal(boardIdFor('???', none), 'board');
  assert.equal(boardIdFor('Pricing', new Set(['pricing', 'pricing-2'])), 'pricing-3');
  const long = boardIdFor(`${'word '.repeat(40)}end`, new Set([boardIdFor(`${'word '.repeat(40)}end`, none)]));
  for (const id of [long, boardIdFor('x'.repeat(300), none), boardIdFor('Ünïcödé 😀 board', none)]) assert.match(id, ID_PATTERN, id);
  assert.ok(long.endsWith('-2') && long.length <= 64, long);
});

test('save: New board puts a fresh id and opens it; Rename puts the open board; a refusal opens nothing', async () => {
  const sent: [string, BoardFields][] = [];
  const opened: string[] = [];
  let answer: string | null = null;
  const edit = createBoardEdit({
    sender: { board: async (id, fields) => { sent.push([id, fields]); return answer; } },
    state: () => ({ boards: new Map([['plan', {}]]) }) as never, id: () => 'plan', switchTo: (id) => opened.push(id),
  });
  assert.equal(await edit.save('new-board', { title: 'Plan' }), null);
  assert.equal(await edit.save('rename-board', { title: 'The plan', summary: 'Why.' }), null);
  answer = 'refused';
  assert.equal(await edit.save('new-board', { title: 'Other' }), 'refused');
  assert.deepEqual(sent, [['plan-2', { title: 'Plan' }], ['plan', { title: 'The plan', summary: 'Why.' }], ['other', { title: 'Other' }]]);
  assert.deepEqual(opened, ['plan-2']);
});
