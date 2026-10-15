// The person's side of a locked board (N40 rulings 1, 2, 4, 5, 7, api.md 138-140). Every act in
// the registry is walked through `act` on the locked board: each is refused 423 `locked` with the
// person's words but the person's own marks (the flag, archive, restore, lock, unlock), so a new
// action is covered or the test fails. A rename and a new chat are refused; a seen still goes. A
// running chat's messages still go, without the board's answers and recorded as no Send; unlocked,
// the answers go with the next message. Archiving locks the board and a restore returns the lock it
// had. No server module but visibility.ts asks whether a board is locked (ruling 7).
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ActionId } from '../../../packages/format/src/index.ts';
import { ACTION_IDS, LATER_REGION } from '../../../packages/format/src/index.ts';
import { boardLocked, LOCKED_PERSON, passesLock, ROUND_HEAD } from '../../../packages/actions/src/index.ts';
import type { Harness, Joined } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Rec } from './openapi-ajv.ts';
import { ROOT } from './openapi-ajv.ts';
import { fakeChat } from './chat-support.ts';

const VAULT = 'vault';
const config = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-lock-'));
const fake = fakeChat(config);
let h: Harness;
let A: Joined;
let B: Joined;
let session = '';
/** What the walk's acts point at: a note on card 1, a proposal on card 2 and a grant request. */
const at = { note: 0, proposal: 0, request: 0 };
before(async () => {
  h = await startBoard({ chat: { adapters: fake.adapters } });
  A = await h.join('Vault chat');
  B = await h.join('Other chat');
  const items = [
    { type: 'board', title: 'Vault', key: 'vault-board' },
    { type: 'region', region: { id: 'ideas', title: 'Ideas', mode: 'grid' }, key: 'vault-ideas' },
    { type: 'node', node: { region: 'ideas', kind: 'question', title: 'Keep it locked?' }, key: 'vault-1' },
    { type: 'node', node: { region: 'ideas', kind: 'decision', title: 'Ship on Friday?' }, key: 'vault-2' },
    { type: 'propose', n: 2, ver: 1, action: 'check', reason: 'Agreed in the meeting.', key: 'vault-p' },
  ];
  const wrote = await h.ok('write_board', { board: VAULT, body: { items } }, { as: A.client });
  at.proposal = wrote.results[4].seq;
  at.note = (await act({ action: 'comment', n: 1, ver: 1, text: 'Why lock it?' })).seq;
  at.request = (await h.ok('request_grant', { body: { board: VAULT, reason: 'Adding ideas.' } }, { as: B.client })).request;
  ({ session } = await h.ok('start_chat', { board: VAULT, body: { agent: 'claude' } }));
  // The chat's own agent draws a card, so the person's answer on it is owed to that agent (a round).
  const chatAgent = h.ledger.events().findLast((e) => e.type === 'grant-request')!.agent!;
  const as = { by: 'agent', agent: chatAgent } as const;
  h.ledger.append({ type: 'region', board: VAULT, region: { id: 'chat', title: 'From the chat', mode: 'grid' } }, as);
  h.ledger.append({ type: 'node', board: VAULT, node: { region: 'chat', kind: 'question', title: 'Lock it now?' } }, as);
});
after(async () => { await h.close(); fs.rmSync(config, { recursive: true, force: true }); });

function act(body: Rec) { return h.ok('act', { board: VAULT, body: { type: 'act', ...body } }); }
const mark = (action: string) => act({ action, board: VAULT });
/** Whether the board is locked now, as the action layer's one check says (an archived board counts). */
const locked = () => boardLocked(h.ledger.state(), VAULT);

/** One request of every action in the registry on "vault". A new action needs a line here, or this
 * file doesn't compile. */
function everyAct(): Record<ActionId, Rec> {
  const card = { n: 2, ver: 1 };
  return {
    ack: card, drop: card, comment: { ...card, text: 'Why?' }, context: card, later: card, reopen: card,
    pin: { n: 1, x: 10, y: 20 }, unpin: { n: 1 }, mode: { board: VAULT, region: 'ideas', mode: 'flow' },
    grant: { request: at.request }, deny: { request: at.request }, revoke: { holder: B.agent, board: VAULT },
    size: { n: 1, size: 'l' }, send: { board: VAULT }, 'note-edit': { n: 1, note: at.note, text: 'Why not?' },
    'note-remove': { n: 1, note: at.note }, move: { n: 1, ver: 1, region: LATER_REGION }, reject: { n: 2, proposal: at.proposal },
    flag: { n: 1 }, unflag: { n: 1 }, widths: { board: VAULT, region: 'ideas', widths: 'match' },
    archive: { board: VAULT }, restore: { board: VAULT }, lock: { board: VAULT }, unlock: { board: VAULT },
  };
}

/** What each of the person's own marks answers on the locked board, walked in registry order:
 * archive then restore come back to the lock, a second lock is refused, and the unlock ends it. */
const MARKS: Partial<Record<ActionId, number>> = { flag: 201, unflag: 201, archive: 201, restore: 201, lock: 422, unlock: 201 };

test('locked, every act in the registry is refused 423 with the person\'s words, but their own marks', async () => {
  await act({ action: 'ack', n: 3, ver: 1 }); // an answer to the chat's agent not yet sent, for the chat test below
  await mark('lock');
  const acts = everyAct();
  const seq = () => h.ledger.state().seq;
  for (const action of ACTION_IDS) {
    if (passesLock({ type: 'act', action })) {
      assert.ok(action in MARKS, `${action} passes the lock: say what it answers in MARKS`);
      try { await act({ action, ...acts[action] }); } catch { /* a refusal is checked by status */ }
      assert.equal(h.last().status, MARKS[action], action);
      if (action !== 'unlock') assert.equal(locked(), true, `${action} leaves the board locked`);
      continue;
    }
    const before = seq();
    const refused = await h.fails('act', { board: VAULT, body: { type: 'act', action, ...acts[action] } }, 423, 'locked');
    assert.equal(refused.detail, LOCKED_PERSON, action);
    assert.equal(seq(), before, `${action}: nothing written`);
  }
  assert.equal(locked(), false, 'the walk ends with the unlock');
  await act({ action: 'later', n: 2, ver: 1 });
});

test('locked, a rename and a new chat are refused; a seen, the ledger and the chat list still answer', async () => {
  await mark('lock');
  const rename = await h.fails('put_board', { board: VAULT, body: { title: 'Renamed' } }, 423, 'locked');
  assert.equal(rename.detail, LOCKED_PERSON);
  const chat = await h.fails('start_chat', { board: VAULT, body: { agent: 'claude' } }, 423, 'locked');
  assert.equal(chat.detail, 'Board "vault" is locked, so no chat can start on it. Unlock it from the "⋯" menu first.');
  await h.ok('mark_seen', { board: VAULT, body: { board: VAULT, head: h.ledger.state().seq } });
  await h.ok('mark_seen', { board: VAULT, body: { n: 1, ver: 1 } });
  assert.ok((await h.ok('list_chats', { board: VAULT })).sessions.length > 0);
  assert.ok((await h.ok('read_ledger', {})).events.some((e: Rec) => e.action === 'lock'));
  await mark('unlock');
  await h.ok('put_board', { board: VAULT, body: { title: 'Vault' } });
});

test('locked, the chat\'s messages still go, without the board\'s answers and recorded as no Send; unlocked, the answers go', async () => {
  await mark('lock');
  const sends = () => h.ledger.events().filter((e) => e.type === 'act' && e.action === 'send').length;
  const before = sends();
  const runs = fake.given().length;
  await h.ok('send_chat', { session, body: { text: 'What do you make of it?' } });
  const run = await fake.run(runs + 1);
  assert.match(run.prompt, /What do you make of it\?/);
  assert.match(run.prompt, /Board: vault/);
  assert.ok(!run.prompt.includes(ROUND_HEAD), 'no round of answers on a locked board');
  assert.equal(sends(), before, 'no Send recorded');
  await mark('unlock');
  // The answers are attached now, so the message goes, or waits for the first turn to end and goes then.
  await h.ok('send_chat', { session, body: { text: 'And now?' } });
  const next = await fake.run(runs + 2);
  assert.ok(next.prompt.includes(ROUND_HEAD), 'unlocked, the answers go with the next message');
  assert.match(next.prompt, /^3 \(question\): ✓$/m);
  assert.equal(sends(), before + 1, 'and the Send is recorded');
});

test('archive locks the board; a restore returns the lock it had (ruling 5)', async () => {
  await mark('archive');
  await mark('restore');
  assert.equal(locked(), false, 'open before, open after');
  await mark('lock');
  await mark('archive');
  const refused = await h.fails('act', { board: VAULT, body: { type: 'act', action: 'unlock', board: VAULT } }, 422, 'invalid');
  assert.equal(refused.errors[0]!.detail, 'board: "vault" is archived; restore it from the board picker first');
  await mark('restore');
  assert.equal(locked(), true, 'locked before, locked after');
  await mark('unlock');
});

test('ruling 7: no server module but visibility.ts asks whether a board is locked; the ledger module asks writeProblem', () => {
  const dir = path.join(ROOT, 'apps/board/server');
  const code = (file: string) => fs.readFileSync(path.join(dir, file), 'utf8').replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, '');
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    assert.equal(/boardLocked|lockedProblem|\.locked\b/.test(code(file)), file === 'visibility.ts', file);
    assert.equal(/writeProblem/.test(code(file)), file === 'ledger.ts', file);
  }
  const actions = path.join(ROOT, 'packages/actions/src');
  for (const file of fs.readdirSync(actions).filter((f) => f.endsWith('.ts'))) {
    const text = fs.readFileSync(path.join(actions, file), 'utf8').replace(/^\s*(\/\/|\*|\/\*\*).*$/gm, '');
    assert.equal(/\.locked\b/.test(text.replace(/locked: new Map\(\)/, '')), file === 'lock.ts', file);
  }
});
