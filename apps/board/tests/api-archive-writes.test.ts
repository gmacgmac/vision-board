// Archiving and restoring as the person, and the writes an archived board refuses (N39 rulings 2,
// 3, 7, 9, api.md 135-137). Only the person archives and restores, through `act`; an agent is
// forbidden. On an archived board every other person act, a rename and a chat are refused until it
// is restored; a seen still goes. An agent's batch making a board with an archived board's id is
// refused in words that say nothing of it, and nothing is written; a retry key used on the archived
// board is free again, and a `{ key }` naming one of its cards names nothing. The chat on the
// archived board can't take messages; another board's chat never names it. No server module but
// visibility.ts asks whether a board is archived (ruling 7).
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { UNAVAILABLE } from '#actions';
import { LEDGER_FORMAT } from '#format';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Rec } from './openapi-ajv.ts';
import { ROOT } from './openapi-ajv.ts';
import { fakeChat } from './chat-support.ts';
import { makeTempDir } from '#format/testing';

const config = makeTempDir('vb-archive-');
const fake = fakeChat(config);
let h: Harness;
let A: Joined;
let B: Joined;
let session = '';
before(async () => {
  h = await startBoard({ chat: { adapters: fake.adapters } });
  A = await h.join('Old plan chat');
  B = await h.join('New plan chat');
  const items = [
    { type: 'board', title: 'Multi-bot', key: 'old-board' },
    { type: 'region', region: { id: 'plan', title: 'Plan', mode: 'grid' }, key: 'old-plan' },
    { type: 'node', node: { region: 'plan', kind: 'question', title: 'Which bot first?' }, key: 'old-q' },
  ];
  await h.ok('write_board', { board: 'multi-bot', body: { items } }, { as: A.client });
  ({ session } = await h.ok('start_chat', { board: 'multi-bot', body: { agent: 'claude' } }));
});
after(async () => { await h.close(); fs.rmSync(config, { recursive: true, force: true }); });

const act = (board: string, body: Rec) => h.ok('act', { board, body: { type: 'act', ...body } });
const archive = (board = 'multi-bot') => act(board, { action: 'archive', board });
const restore = (board = 'multi-bot') => act(board, { action: 'restore', board });

test('archive and restore are the person\'s acts: stored by the person, refused to an agent', async () => {
  const line = await archive();
  assert.deepEqual([h.last().status, line.v, line.by, line.action, line.board, 'n' in line], [201, LEDGER_FORMAT, 'person', 'archive', 'multi-bot', false]);
  const refused = await h.fails('act', { board: 'multi-bot', body: { type: 'act', action: 'restore', board: 'multi-bot' } }, 403, 'forbidden', A.client);
  assert.match(refused.detail, /Only the person can do this/);
  assert.deepEqual((await restore()).action, 'restore');
});

test('archive twice, restore a board not archived, or an unknown board: refused in plain words', async () => {
  await archive();
  const twice = await h.fails('act', { board: 'multi-bot', body: { type: 'act', action: 'archive', board: 'multi-bot' } }, 422, 'invalid');
  assert.equal(twice.errors[0]!.detail, 'board: "multi-bot" is already archived');
  await restore();
  const again = await h.fails('act', { board: 'multi-bot', body: { type: 'act', action: 'restore', board: 'multi-bot' } }, 422, 'invalid');
  assert.equal(again.errors[0]!.detail, 'board: "multi-bot" isn\'t archived');
  await h.fails('act', { board: 'no-such', body: { type: 'act', action: 'archive', board: 'no-such' } }, 404, 'not-found');
  const elsewhere = await h.fails('act', { board: 'pricing', body: { type: 'act', action: 'archive', board: 'multi-bot' } }, 422, 'invalid');
  assert.match(elsewhere.errors[0]!.detail, /names board "multi-bot" but was sent to board "pricing"/);
});

test('archived: the person\'s other acts, a rename and a new chat are refused; a seen still goes; restored, they go', async () => {
  await archive();
  const words = 'board: "multi-bot" is archived; restore it from the board picker first';
  const comment = await h.fails('act', { board: 'multi-bot', body: { type: 'act', action: 'comment', n: 1, ver: 1, text: 'Why?' } }, 422, 'invalid');
  assert.equal(comment.errors[0]!.detail, words);
  const send = await h.fails('act', { board: 'multi-bot', body: { type: 'act', action: 'send', board: 'multi-bot' } }, 422, 'invalid');
  assert.equal(send.errors[0]!.detail, words);
  const rename = await h.fails('put_board', { board: 'multi-bot', body: { title: 'Renamed' } }, 422, 'invalid');
  assert.equal(rename.errors[0]!.detail, words);
  const chat = await h.fails('start_chat', { board: 'multi-bot', body: { agent: 'claude' } }, 422, 'invalid');
  assert.equal(chat.detail, 'Board "multi-bot" is archived, so no chat can start on it. Restore it from the board picker first.');
  await h.ok('mark_seen', { board: 'multi-bot', body: { board: 'multi-bot', head: h.ledger.state().seq } });
  assert.ok((await h.ok('list_chats', { board: 'multi-bot' })).sessions.length > 0);
  assert.ok((await h.ok('read_ledger', { board: 'multi-bot' })).events.some((e: Rec) => e.action === 'archive'));
  await restore();
  await act('multi-bot', { action: 'comment', n: 1, ver: 1, text: 'Why?' });
});

test('the chat on an archived board can\'t take a message; restored, it can', async () => {
  await archive();
  const refused = await h.fails('send_chat', { session, body: { text: 'Draw the plan.' } }, 409, 'conflict');
  assert.equal(refused.detail, 'Board "multi-bot" is archived, so its chat can\'t take messages. Restore it from the board picker first.');
  assert.deepEqual(fake.given(), [], 'no agent ran');
  await restore();
  await h.ok('send_chat', { session, body: { text: 'Draw the plan.' } });
  assert.match((await fake.run(1)).prompt, /Board: multi-bot/);
});

test('an agent\'s batch making a board with an archived board\'s id is refused, saying nothing of it; nothing is written', async () => {
  await archive();
  const seq = h.ledger.state().seq;
  for (const [who, items, at] of [
    [A, [{ type: 'board', title: 'Multi-bot plan' }, { type: 'region', region: { id: 'plan', title: 'Plan', mode: 'grid' } }], 0],
    [B, [{ type: 'region', region: { id: 'plan', title: 'Plan', mode: 'grid' } }, { type: 'board', title: 'Mine' }], 1],
  ] as const) {
    const refused = await h.fails('write_board', { board: 'multi-bot', body: { items } }, 422, 'invalid', who.client);
    assert.equal(refused.detail, UNAVAILABLE);
    assert.deepEqual(refused.errors, [{ pointer: `/items/${at}`, detail: UNAVAILABLE }]);
    assert.doesNotMatch(JSON.stringify(h.last().body), /archiv|Multi-bot|Which bot/i);
  }
  assert.equal(h.ledger.state().seq, seq, 'never a write into it');
  // The ledger module refuses an agent's line there too, whatever route it came by (api.md 136).
  const card = h.ledger.state().index.cards.get('multi-bot')![0]!;
  assert.throws(() => h.ledger.append({ type: 'reply', n: card, text: 'Still here.' }, { by: 'agent', agent: A.agent }),
    (err: any) => err.body.errors[0].detail === UNAVAILABLE);
  assert.equal(h.ledger.state().seq, seq);
  await restore();
});

test('a retry key used on the archived board is free again; a { key } naming its card names nothing', async () => {
  await h.ok('request_grant', { body: { board: 'multi-bot', reason: 'Add a lane.', key: 'b-ask' } }, { as: B.client });
  await archive();
  const items = [
    { type: 'board', title: 'Multi-bot plan', key: 'old-board' },
    { type: 'region', region: { id: 'plan', title: 'Plan', mode: 'grid' }, key: 'old-plan' },
    { type: 'node', node: { region: 'plan', kind: 'question', title: 'Which bot first?' }, key: 'old-q' },
    { type: 'link', from: { key: 'old-q' }, to: { key: 'new-q' } },
  ];
  const r = await h.ok('write_board', { board: 'multi-bot-plan', body: { items } }, { as: A.client });
  assert.deepEqual(r.results.slice(0, 3).map((x: Rec) => [x.ok, x.replayed, x.n]), [[true, undefined, undefined], [true, undefined, undefined], [true, undefined, 1]]);
  assert.equal(r.results[3].problem.detail, 'No node you made has the key "new-q". Name the node by its number, or by the key of the node item that made it.');
  const own = await h.ok('write_board', { board: 'multi-bot-plan', body: { items: [{ type: 'reply', n: { key: 'old-q' }, text: 'On it.' }] } }, { as: A.client });
  assert.equal(own.results[0].ok, true, 'the key now names the new board\'s card');
  const grant = await h.ok('request_grant', { body: { board: 'pricing', reason: 'The options.', key: 'b-ask' } }, { as: B.client });
  assert.deepEqual([h.last().status, grant.board, grant.replayed], [201, 'pricing', undefined]);
  assert.doesNotMatch(JSON.stringify(r), /archiv/i);
  await restore();
});

test('another board\'s chat never names the archived board, nor do list_open and check_responses there', async () => {
  await archive();
  const other = await h.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } });
  const runs = fake.given().length;
  await h.ok('send_chat', { session: other.session, body: { text: 'What is left?' } });
  const run = await fake.run(runs + 1);
  assert.match(run.prompt, /Board: pricing/);
  assert.doesNotMatch(run.prompt, /multi-bot\b(?!-plan)|Multi-bot\b(?! plan)/);
  for (const id of ['list_open', 'check_responses'] as const) {
    assert.doesNotMatch(JSON.stringify(await h.ok(id, { board: 'pricing' }, { as: A.client })), /"multi-bot"|Which bot/, id);
  }
  await restore();
});

test('ruling 7: no server module but visibility.ts asks whether a board is archived', () => {
  const dir = path.join(ROOT, 'apps/board/server');
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    const asks = /\.archived\b|boardVisibility|visibleToAgents/.test(text.replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, ''));
    assert.equal(asks, file === 'visibility.ts', file);
  }
  const actions = path.join(ROOT, 'packages/actions/src');
  for (const file of fs.readdirSync(actions).filter((f) => f.endsWith('.ts'))) {
    const code = fs.readFileSync(path.join(actions, file), 'utf8').replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, '');
    assert.equal(/\.archived\b/.test(code.replace(/archived: new Map\(\)/, '')), file === 'archive.ts', file);
  }
});
