// Kiro on the board server (chat-panel BE_04) with the agent package's fake `kiro-cli acp`
// replaying a recorded real turn: starting a session joins the board as "Kiro chat <id>" and
// records the grant; the secret reaches only the tool server's environment in session/new; a
// file change in the turn becomes an approval_request on the chat stream, and the person's answer
// goes back to Kiro as the option; the events are schema-valid; Stop and the server closing end
// the Kiro process.
import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createKiroAdapter } from '../../../packages/agent/src/index.ts';
import { CHAT_EVENT_ID, schemaProblems } from '../server/schema.ts';
import type { Harness } from './api-harness.ts';
import { startBoard } from './api-harness.ts';
import type { Event } from './chat-support.ts';
import { gone, readChat, turnEnded } from './chat-support.ts';

const agentTests = (rel: string) => fileURLToPath(new URL(`../../../packages/agent/tests/${rel}`, import.meta.url));
const FAKE_KIRO = agentTests('fake-kiro.ts');
const KIRO_DENIED = agentTests('fixtures/kiro-denied.jsonl');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-chat-kiro-'));
const note = path.join(work, 'notes.jsonl');
const env: NodeJS.ProcessEnv = { ...process.env, FAKE_KIRO_FIXTURE: KIRO_DENIED, FAKE_KIRO_MODE: 'replay', FAKE_KIRO_NOTE: note };
const adapter = () => createKiroAdapter({ command: { file: process.execPath, args: [FAKE_KIRO] }, env, log: () => {} });
const notes = (): any[] => (fs.existsSync(note) ? fs.readFileSync(note, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
let h: Harness;
before(async () => { h = await startBoard({ chat: { adapters: { kiro: adapter } } }); });
after(async () => { await h.close(); fs.rmSync(work, { recursive: true, force: true }); });

const valid = (events: Event[]) => { for (const e of events) assert.deepEqual(schemaProblems(CHAT_EVENT_ID, e), [], JSON.stringify(e)); };

test('start: Kiro joins the board as its agent; a message becomes a turn; a file change asks the person; the answer reaches Kiro', async () => {
  const before = h.ledger.state().seq;
  const session = await h.ok<{ session: string; agent: string }>('start_chat', { board: 'pricing', body: { agent: 'kiro' } });
  assert.deepEqual([session.agent, session.session], ['kiro', '00000000-0000-4000-8000-000000000001']);
  const lines = h.ledger.events().filter((e) => e.seq > before);
  assert.deepEqual(lines.map((e) => [e.type, e.by]), [['join', 'agent'], ['grant-request', 'agent'], ['act', 'person']]);
  assert.equal((lines[0] as { label?: string }).label, 'Kiro chat 00000000');

  await h.ok('send_chat', { session: session.session, body: { text: 'Draw two cards.' } });
  const asked = (await readChat(h.base, h.cookie, session.session, (e) => e.some((x) => x.kind === 'approval_request'))).at(-1)!;
  assert.deepEqual(asked.facts, { kind: 'write', op: 'create', path: '/private/work/project/note.txt', preview: 'hi\n' });
  const result = await h.ok('answer_approval', { session: session.session, approval: asked.approvalId, body: { approved: true } });
  assert.deepEqual([result.kind, result.status], ['approval_result', 'approved']);

  const events = await readChat(h.base, h.cookie, session.session, turnEnded);
  valid(events);
  assert.deepEqual(events.map((e) => e.seq), events.map((_, i) => i + 1));
  assert.deepEqual(events.map((e) => e.kind), [
    'message_in', 'message_out', 'tool_activity', 'tool_activity', 'approval_request', 'approval_result',
    'tool_activity', 'tool_activity', 'message_out', 'system',
  ]);
  assert.deepEqual([events[2]!.tool, events[2]!.board, events.at(-1)!.turn], ['write_board', 'pricing', 'done']);

  const sent = notes();
  const made = sent.find((n) => n.method === 'session/new');
  const secret = made.params.mcpServers[0].env.find((e: { name: string }) => e.name === 'VB_AGENT_SECRET').value as string;
  assert.match(secret, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(made.params.mcpServers[0].env.find((e: { name: string }) => e.name === 'VB_SERVER').value, h.base);
  assert.ok(!made.args.join(' ').includes(secret), 'not on the command line');
  for (const [where, text] of [['the events', JSON.stringify(events)], ['the ledger', fs.readFileSync(h.ledger.file, 'utf8')],
    ['the index', fs.readFileSync(path.join(h.project, '.visionboard', 'chat-sessions.json'), 'utf8')]] as const) {
    assert.ok(!text.includes(secret), `the secret is in ${where}`);
  }
  const options = sent.filter((n) => n.answered).map((n) => n.result.outcome.optionId).sort();
  assert.deepEqual(options, ['allow_once', 'allow_once'], 'the person\'s yes and the board tool\'s own go-ahead');
  const prompt = sent.find((n) => n.method === 'session/prompt').params.prompt[0].text as string;
  assert.ok(prompt.includes('# Vision Board') && prompt.endsWith('Board: pricing'), 'the skill leads, the board id ends');
});

test('Stop ends the turn, and closing the server ends the Kiro process', async () => {
  env.FAKE_KIRO_MODE = 'hang';
  const session = await h.ok<{ session: string }>('start_chat', { board: 'pricing', body: { agent: 'kiro' } });
  await h.ok('send_chat', { session: session.session, body: { text: 'Keep going.' } });
  for (let i = 0; i < 200 && !notes().some((n) => n.method === 'session/prompt' && n.pid !== notes()[0].pid); i++) await new Promise((r) => setTimeout(r, 25));
  const pid = notes().findLast((n) => n.method === 'session/prompt').pid as number;
  assert.deepEqual(await h.ok('stop_chat', { session: session.session }), { stopped: true });
  const events = await readChat(h.base, h.cookie, session.session, (ev) => ev.some((e) => e.turn === 'stopped'));
  valid(events);
  await h.close();
  await gone(pid);
  h = await startBoard({ chat: { adapters: { kiro: adapter } } });
});
