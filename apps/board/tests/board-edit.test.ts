// A new board's id from its title (navigation BE_01 ruling 3): lowercase letters and digits joined
// by hyphens, within the id limit, unique among the boards, archived ones too; and the dialog's
// answer goes to the sender as one `put_board`, then the new board opens; Rename renames the open
// board. Archive board asks first, with the board's name and dates (N39 ruling 5), then archives the
// open board; Restore restores a board and opens it (ruling 6). Lock board locks the open board, or
// unlocks it when it is locked, with no confirm, and says so (N40 ruling 4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ID_PATTERN } from '../../../packages/format/src/index.ts';
import { archiveAsk, boardIdFor, createBoardEdit, dayOf, LOCK_DONE } from '../src/board/board-edit.ts';
import type { ActFields } from '../src/board/io.ts';
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
    sender: { board: async (id, fields) => { sent.push([id, fields]); return answer; }, actOn: async () => null },
    state: () => ({ boards: new Map([['plan', {}]]) }) as never, id: () => 'plan', switchTo: (id) => opened.push(id),
    confirm: async () => true,
  });
  assert.equal(await edit.save('new-board', { title: 'Plan' }), null);
  assert.equal(await edit.save('rename-board', { title: 'The plan', summary: 'Why.' }), null);
  answer = 'refused';
  assert.equal(await edit.save('new-board', { title: 'Other' }), 'refused');
  assert.deepEqual(sent, [['plan-2', { title: 'Plan' }], ['plan', { title: 'The plan', summary: 'Why.' }], ['other', { title: 'Other' }]]);
  assert.deepEqual(opened, ['plan-2']);
});

/** A board edit on board `plan` ("The plan"), archived board `old`, answering `answer`, asking `ok`. */
function archiving(ok: boolean, answer: string | null = null) {
  const acts: [string, ActFields][] = [];
  const opened: string[] = [];
  const asked: string[][] = [];
  const dates = { created: '2026-10-11T09:00:00Z', updated: '2026-10-11T18:00:00Z' };
  const edit = createBoardEdit({
    sender: { board: async () => null, actOn: async (id, fields) => { acts.push([id, fields]); return answer; } },
    state: () => ({ boards: new Map([['plan', { title: 'The plan' }]]), dates: new Map([['plan', dates]]) }) as never,
    id: () => 'plan', switchTo: (id) => opened.push(id),
    confirm: async (...ask) => { asked.push(ask); return ok; },
  });
  return { edit, acts, opened, asked };
}

test('archive: asks with the board\'s name and dates, then archives the open board; Cancel sends nothing', async () => {
  const yes = archiving(true);
  assert.equal(await yes.edit.archive(), null);
  assert.deepEqual(yes.asked, [archiveAsk('The plan', { created: '2026-10-11T09:00:00Z', updated: '2026-10-11T18:00:00Z' })]);
  assert.deepEqual(yes.acts, [['plan', { action: 'archive' }]]);
  const no = archiving(false);
  assert.equal(await no.edit.archive(), null);
  assert.deepEqual(no.acts, []);
  assert.equal(await archiving(true, 'refused').edit.archive(), 'refused');
});

test('restore: restores the board named and opens it; a refusal opens nothing', async () => {
  const ok = archiving(true);
  assert.equal(await ok.edit.restore('old'), null);
  assert.deepEqual([ok.acts, ok.opened], [[['old', { action: 'restore' }]], ['old']]);
  const refused = archiving(true, 'refused');
  assert.equal(await refused.edit.restore('old'), 'refused');
  assert.deepEqual(refused.opened, []);
});

test('archiveAsk: the confirm of ruling 5, its days in the viewer\'s words, the year only when not this one', () => {
  const now = new Date('2026-10-12T09:00:00Z');
  const day = (at: string) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  assert.deepEqual(archiveAsk('Multi-bot', { created: '2026-10-11T09:00:00Z', updated: '2026-10-11T18:00:00Z' }, now), [
    "Archive 'Multi-bot'?",
    `Created ${day('2026-10-11T09:00:00Z')}, last updated ${day('2026-10-11T18:00:00Z')}. Agents won't see it; you can restore it from the board picker.`,
    'Archive',
  ]);
  assert.match(dayOf('2025-03-02T12:00:00Z', now), /2025/);
  assert.doesNotMatch(dayOf('2026-03-02T12:00:00Z', now), /2026/);
});

test('a new board never takes an archived board\'s id: the boards it avoids are every board', () => {
  assert.equal(boardIdFor('Multi-bot', new Map([['multi-bot', {}]])), 'multi-bot-2');
});

/** A board edit on board `plan`, locked or not, answering `answer`. */
function locking(locked: boolean, answer: string | null = null) {
  const acts: [string, ActFields][] = [];
  const said: string[] = [];
  const asked: string[][] = [];
  const edit = createBoardEdit({
    sender: { board: async () => null, actOn: async (id, fields) => { acts.push([id, fields]); return answer; } },
    state: () => ({ boards: new Map([['plan', { title: 'The plan' }]]), locked: new Map(locked ? [['plan', 9]] : []), archived: new Map() }) as never,
    id: () => 'plan', switchTo: () => undefined, confirm: async (...ask) => { asked.push(ask); return true; }, toast: (t) => said.push(t),
  });
  return { edit, acts, said, asked };
}

test('lock: locks the open board, or unlocks it when it is locked; no confirm; the toast says so; a refusal says nothing', async () => {
  const open = locking(false);
  assert.equal(await open.edit.lock(), null);
  assert.deepEqual([open.acts, open.said, open.asked], [[['plan', { action: 'lock' }]], [LOCK_DONE.lock], []]);
  const shut = locking(true);
  assert.equal(await shut.edit.lock(), null);
  assert.deepEqual([shut.acts, shut.said], [[['plan', { action: 'unlock' }]], [LOCK_DONE.unlock]]);
  const refused = locking(false, 'refused');
  assert.equal(await refused.edit.lock(), 'refused');
  assert.deepEqual(refused.said, []);
});
