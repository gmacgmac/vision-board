// The person's new board and rename end to end (api.md 90, D-034): put_board creates a board with
// no agent creator, renames any board, refuses unknown fields and every agent; an agent's write on
// the person's board needs the board granted, and its `board` item there is refused.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';

let h: Harness;
let A: Joined;
before(async () => {
  h = await startBoard();
  A = await h.join('Planning chat');
});
after(() => h.close());

const codes = (r: any) => r.results.map((x: any) => (x.ok ? 'ok' : x.problem.type.split('/').pop()));
const titleOf = async (board: string) => (await h.ok('list_boards')).boards.find((b: any) => b.board === board)?.title;

test('put_board: a new id is 201 and makes a board the person owns; no agent holds it', async () => {
  const line = await h.ok('put_board', { board: 'hiring', body: { title: 'Hiring plan', summary: 'Who we hire next.' } });
  assert.deepEqual([h.last().status, line.type, line.by, line.board, line.title, line.summary, 'agent' in line],
    [201, 'board', 'person', 'hiring', 'Hiring plan', 'Who we hire next.', false]);
  assert.equal(await titleOf('hiring'), 'Hiring plan');
  const board = await h.ok('get_board', { board: 'hiring' });
  assert.deepEqual([board.view.title, board.view.summary, 'boardHolders' in board], ['Hiring plan', 'Who we hire next.', false]);
});

test('an agent\'s write on the person\'s board needs the board; its board item there is forbidden; once granted it draws', async () => {
  const items = [{ type: 'region', region: { id: 'roles', title: 'Roles', mode: 'grid' }, key: 'roles' }];
  const refused = await h.ok('write_board', { board: 'hiring', body: { items } }, { as: A.client });
  assert.deepEqual([codes(refused), refused.results[0].problem.board], [['needs-grant'], 'hiring']);
  const own = await h.ok('write_board', { board: 'hiring', body: { items: [{ type: 'board', title: 'Mine now' }] } }, { as: A.client });
  assert.deepEqual(codes(own), ['forbidden']);
  const asked = await h.ok('request_grant', { body: { board: 'hiring', reason: 'Drawing the roles.' } }, { as: A.client });
  await h.ok('act', { board: 'hiring', body: { type: 'act', action: 'grant', request: asked.request } });
  assert.deepEqual(codes(await h.ok('write_board', { board: 'hiring', body: { items } }, { as: A.client })), ['ok']);
});

test('the refusal on a person-made board says the person made it; on an agent-made board, another agent', async () => {
  const items = [{ type: 'region', region: { id: 'extra', title: 'Extra', mode: 'grid' }, key: 'extra' }];
  await h.ok('put_board', { board: 'wording', body: { title: 'Wording' } });
  const person = await h.ok('write_board', { board: 'wording', body: { items } }, { as: A.client });
  assert.match(person.results[0].problem.detail, /^You may not write on board "wording" yet: the person made it\. Call request_grant once with just the board/);
  const maker = await h.join('Maker chat');
  await h.ok('write_board', { board: 'theirs', body: { items: [{ type: 'board', title: 'Theirs' }] } }, { as: maker.client });
  const agent = await h.ok('write_board', { board: 'theirs', body: { items } }, { as: A.client });
  assert.match(agent.results[0].problem.detail, /yet: another agent made it\. Call request_grant once with just the board/);
  const own = await h.ok('write_board', { board: 'wording', body: { items: [{ type: 'board', title: 'Mine' }] } }, { as: A.client });
  assert.match(own.results[0].problem.detail, /Only the person can change/);
  assert.equal(own.results[0].problem.errors[0].detail, 'board "wording" was made by the person');
});

test('put_board: an existing id is 200 and renames it, any board, keeping its containers; the summary is replaced', async () => {
  const before = h.ledger.state().boards.get('pricing')!.regions.length;
  const line = await h.ok('put_board', { board: 'pricing', body: { title: 'Pricing for 2027' } });
  assert.deepEqual([h.last().status, line.by, line.title, 'summary' in line], [200, 'person', 'Pricing for 2027', false]);
  assert.equal(await titleOf('pricing'), 'Pricing for 2027');
  assert.equal(h.ledger.state().boards.get('pricing')!.regions.length, before);
  await h.ok('put_board', { board: 'hiring', body: { title: 'Hiring' } });
  assert.deepEqual([(await h.ok('get_board', { board: 'hiring' })).view.title, await titleOf('hiring')], ['Hiring', 'Hiring']);
  assert.equal((await h.ok('get_board', { board: 'hiring' })).view.summary, undefined, 'left out, the summary is cleared');
});

test('put_board refuses unknown fields, a blank or long title, a bad id, and every agent', async () => {
  const bad = await h.fails('put_board', { board: 'x', body: { title: 'X', board: 'y' } }, 422, 'invalid');
  assert.deepEqual(bad.errors.map((e) => e.pointer), ['/board']);
  await h.fails('put_board', { board: 'x', body: { title: 'X', key: 'k' } }, 422, 'invalid');
  await h.fails('put_board', { board: 'x', body: { title: '  ' } }, 422, 'invalid');
  await h.fails('put_board', { board: 'x', body: { title: 'x'.repeat(201) } }, 422, 'invalid');
  await h.fails('put_board', { board: 'Not_An_Id', body: { title: 'X' } }, 400, 'bad-request');
  await h.fails('put_board', { board: 'x', body: { title: 'X' } }, 403, 'forbidden', A.client);
  await h.fails('put_board', { board: 'x', body: { title: 'X' } }, 403, 'forbidden', h.client);
  assert.equal(h.ledger.state().boards.has('x'), false);
});
