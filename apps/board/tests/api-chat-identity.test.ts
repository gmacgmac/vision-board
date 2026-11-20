// One chat identity per folder's ledger (D-114, Access Clarity T_02), with the agent package's fake `claude`
// (and the same fake standing in as Kiro): the ledger holds two earlier chats' agents, as before the change, and an
// MCP agent's board. The first chat after it starts as the newest earlier chat agent and is granted, once, what the
// other chat agent held: never what only the MCP agent holds, nor a locked board, nor what the person refused it.
// Every later chat, Claude's or Kiro's, on a board or in the folder, is that agent and writes nothing new; it writes in
// an earlier chat's container with no request, and still needs a grant for the MCP agent's. A read-only ledger refuses
// the start and every write.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ledgerFiles, ledgerFolder, projectFiles } from '#format';
import { makeTempDir } from '#format/testing';
import type { StoredSession } from '../server/chat-index.ts';
import type { Caller } from '../server/ledger.ts';
import { anEarlierChatHeldThis, thePersonStartedAChat } from '../server/words/server-chat.ts';
import type { Harness } from './api-harness.ts';
import { AGENT, startBoard } from './api-harness.ts';
import { fakeChat } from './chat-support.ts';

const config = makeTempDir('vb-chat-identity-');
const fake = fakeChat(config);
const OLDER = 'a-oldchat1';
const NEWER = 'a-oldchat2';
const PERSON: Caller = { by: 'person' };
let h: Harness;
let mark = 0;

const stored = () => JSON.parse(fs.readFileSync(projectFiles(h.project).chatSessions, 'utf8')).sessions as StoredSession[];
/** The ledger's lines since the last call, as [type, by, agent, board, region, action]. */
function since(): unknown[][] {
  const lines = h.ledger.events().filter((e) => e.seq > mark);
  mark = h.ledger.state().seq;
  return lines.map((e) => {
    const x = e as { type: string; by: string; agent?: string; board?: string; region?: string; action?: string };
    return [x.type, x.by, x.agent, x.board, x.region, x.action];
  });
}
/** The secret the session's newest run got, in the board MCP server's environment only: one message, then its run. */
async function secretOf(session: string): Promise<string> {
  const runs = fake.given().length;
  await h.ok('send_chat', { session, body: { text: 'Go on.' } });
  return (await fake.run(runs + 1)).mcpConfig.mcpServers['vision-board']!.env.VB_AGENT_SECRET!;
}
const codes = (r: { results: { ok: boolean; problem?: { type: string } }[] }) => r.results.map((x) => (x.ok ? 'ok' : x.problem!.type.split('/').pop()));
const card = (board: string, region: string, title: string) =>
  ({ board, body: { items: [{ type: 'node', node: { region, kind: 'question', title }, key: `${region}-${title}` }] } });

before(async () => {
  h = await startBoard({ flags: { ledgerFolders: false, readOnlyStart: true }, chat: { adapters: { ...fake.adapters, kiro: fake.adapters.claude } } });
  const add = (e: Record<string, unknown>, by: Caller, board?: string) => h.ledger.append(e, by, board ? { board } : undefined);
  const as = (agent: string): Caller => ({ by: 'agent', agent });
  const granted = (agent: string, board: string, region?: string) => {
    const request = add({ type: 'grant-request', board, ...(region && { region }), reason: 'Earlier.' }, as(agent)).seq;
    add({ type: 'act', action: 'grant', request }, PERSON, board);
  };
  // Two chats before the change, each its own agent; the older made "launch" and two containers on it, was granted
  // "options" on the MCP agent's "pricing", and made "frozen", which the person locked.
  add({ type: 'join', label: 'project' }, as(OLDER));
  add({ type: 'board', board: 'launch', title: 'Launch', key: 'launch' }, as(OLDER));
  for (const id of ['steps', 'extra']) add({ type: 'region', board: 'launch', region: { id, title: id, mode: 'grid' } }, as(OLDER));
  granted(OLDER, 'pricing', 'options');
  add({ type: 'board', board: 'frozen', title: 'Frozen', key: 'frozen' }, as(OLDER));
  add({ type: 'region', board: 'frozen', region: { id: 'ice', title: 'Ice', mode: 'grid' } }, as(OLDER));
  add({ type: 'act', action: 'lock', board: 'frozen' }, PERSON, 'frozen');
  // The newer chat asked for "extra" and the person refused it; the MCP agent made "mine" on its own board.
  add({ type: 'join', label: 'project' }, as(NEWER));
  const asked = add({ type: 'grant-request', board: 'launch', region: 'extra', reason: 'Earlier.' }, as(NEWER)).seq;
  add({ type: 'act', action: 'deny', request: asked }, PERSON, 'launch');
  add({ type: 'region', board: 'pricing', region: { id: 'mine', title: 'Mine', mode: 'grid' } }, AGENT);
  const session = (n: number, agentId: string): StoredSession =>
    ({ session: `0000000${n}-0000-4000-8000-000000000000`, board: 'launch', agent: 'claude', created: `2026-11-0${n}T10:00:00.000Z`, agentId });
  fs.writeFileSync(projectFiles(h.project).chatSessions, `${JSON.stringify({ sessions: [session(1, OLDER), session(2, NEWER)] })}\n`);
  mark = h.ledger.state().seq;
});
after(async () => { await h.close(); fs.rmSync(config, { recursive: true, force: true }); });

test('the first chat after the change is the newest earlier chat agent, granted once what the other chat held', async () => {
  const from = mark;
  const started = await h.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } });
  assert.equal(stored().at(-1)!.agentId, NEWER);
  assert.equal(started.agentId, NEWER);
  const asks = (board: string, region?: string) => [['grant-request', 'agent', NEWER, board, region, undefined], ['act', 'person', undefined, undefined, undefined, 'grant']];
  assert.deepEqual(since(), [
    ...asks('pricing'), // the board it starts on, as before
    ...asks('pricing', 'options'), // granted to the older chat
    ...asks('launch', 'steps'), // made by the older chat; its board comes with it
  ], 'no join; not "extra" (refused to it), "frozen" (locked) or "mine" (only the MCP agent\'s)');
  const reasons = h.ledger.events().filter((e) => e.type === 'grant-request' && e.seq > from).map((e) => (e as { reason: string }).reason);
  assert.deepEqual(reasons, [thePersonStartedAChat, anEarlierChatHeldThis, anEarlierChatHeldThis]);
});

test('every later chat, Claude\'s or Kiro\'s, on a board or in the folder, is the same agent and writes nothing; a removal stays', async () => {
  h.ledger.append({ type: 'act', action: 'revoke', board: 'pricing', region: 'options', holder: NEWER }, PERSON, { board: 'pricing' });
  since();
  await h.ok('start_chat', { board: 'launch', body: { agent: 'kiro' } });
  await h.ok('start_folder_chat', { body: { agent: 'claude' } });
  await h.ok('start_chat', { board: 'pricing', body: { agent: 'claude' } });
  assert.deepEqual(stored().slice(2).map((e) => [e.agent, e.agentId]), [['claude', NEWER], ['kiro', NEWER], ['claude', NEWER], ['claude', NEWER]]);
  assert.deepEqual(since(), [], 'no join, no grant: it holds both boards, and "options" is not given back');
});

test('it writes in an earlier chat\'s container with no request; the MCP agent\'s, and the one removed, still need a grant', async () => {
  const chat = h.agent(await secretOf(stored().at(-1)!.session));
  since();
  assert.deepEqual(codes(await h.ok('write_board', card('launch', 'steps', 'First step'), { as: chat })), ['ok']);
  assert.deepEqual(codes(await h.ok('write_board', card('pricing', 'mine', 'Mine too'), { as: chat })), ['needs-grant']);
  assert.deepEqual(codes(await h.ok('write_board', card('pricing', 'options', 'Back in'), { as: chat })), ['needs-grant']);
  assert.deepEqual(since().map((l) => l.slice(0, 5)), [['node', 'agent', NEWER, 'launch', undefined]], 'the card, and no request');
});

test('a read-only ledger refuses a chat\'s start and every write it sends', async () => {
  const chat = h.agent(await secretOf(stored().at(-1)!.session));
  await h.ok('stop_editing');
  since();
  const agents = fs.readFileSync(ledgerFiles(ledgerFolder(h.project)).agents, 'utf8');
  try {
    await h.fails('start_chat', { board: 'launch', body: { agent: 'claude' } }, 409, 'read-only');
    await h.fails('start_folder_chat', { body: { agent: 'kiro' } }, 409, 'read-only');
    await h.fails('write_board', card('launch', 'steps', 'Second step'), 409, 'read-only', chat);
    assert.deepEqual(since(), []);
    assert.equal(fs.readFileSync(ledgerFiles(ledgerFolder(h.project)).agents, 'utf8'), agents, 'no fresh secret is stored');
  } finally { await h.ok('edit_ledger'); }
});
