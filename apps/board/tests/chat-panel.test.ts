// The chat panel's pure parts for the board's Send and the folder (panel-send FE_01): Send waits
// while the person's last message is the one the agent was answering when Send was pressed, and
// stops waiting at the next message (the answers handed over); a session in the folder opens the
// first board its agent drew, a board's session never jumps; the model picker names exact models
// (ruling 5), the 1M context as before; Kiro's are Opus 5.5 (first, so it is what picking Kiro
// gives) and Sonnet 5.5, never `auto` (N34 ruling 3).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatEvent } from '../../../packages/chat/src/index.ts';
import { applyEvents, EMPTY_CHAT } from '../../../packages/chat/src/index.ts';
import { firstBoard, firstModel, lastAsk, MODELS } from '../src/board/chat-panel.ts';
import type { ChatSessionInfo } from '../src/board/io.ts';

const S = 'session-1';
let seq = 0;
const ev = (e: object): ChatEvent => ({ at: '2026-10-10T10:00:00Z', session: S, seq: ++seq, ...e }) as ChatEvent;
const folder: ChatSessionInfo = { session: S, agent: 'claude', created: '2026-10-10T10:00:00Z' };

test('Send while the agent works waits for the next message; the answers going ends it', () => {
  seq = 0;
  const asked = applyEvents(EMPTY_CHAT, [ev({ kind: 'message_in', text: 'Draw it' }), ev({ kind: 'tool_activity', call: 'c1', tool: 'Read', state: 'running' })]);
  assert.equal(asked.busy, true);
  const at = lastAsk(asked);
  const queued = applyEvents(asked, [ev({ kind: 'system', text: 'Your answers go to the agent when it finishes this turn.' }), ev({ kind: 'system', text: 'Done.', turn: 'done' })]);
  assert.equal(lastAsk(queued), at, 'still waiting after the turn-end line');
  const handed = applyEvents(queued, [ev({ kind: 'message_in', text: 'The person updated the board:\nBoard "B" (v1)\n1 (question): yes' })]);
  assert.notEqual(lastAsk(handed), at, 'the message went');
  assert.equal(lastAsk(EMPTY_CHAT), '', 'no message yet');
});

test('a session in the folder opens the first board its agent drew; a board\'s session, or a write still running, never jumps', () => {
  seq = 0;
  const done = ev({ kind: 'tool_activity', call: 'c2', tool: 'write_board', state: 'done', board: 'launch', cards: [1], head: 4 });
  assert.equal(firstBoard(folder, done), 'launch');
  assert.equal(firstBoard({ ...folder, board: 'launch' }, done), undefined);
  assert.equal(firstBoard(null, done), undefined);
  assert.equal(firstBoard(folder, ev({ kind: 'tool_activity', call: 'c2', tool: 'write_board', state: 'running', board: 'launch' })), undefined);
  assert.equal(firstBoard(folder, ev({ kind: 'tool_activity', call: 'c3', tool: 'Read', state: 'done' })), undefined);
});

test('the model picker names exact models, with the 1M context; Default stays first', () => {
  assert.deepEqual(MODELS.claude, [
    { id: '', label: 'Default' }, { id: 'claude-opus-5-5[1m]', label: 'Opus 5.5' }, { id: 'claude-sonnet-5-5[1m]', label: 'Sonnet 5.5' },
  ]);
});

test('Kiro offers Opus 5.5 (picked with Kiro) and Sonnet 5.5 by Kiro\'s ids, and never auto', () => {
  assert.deepEqual(MODELS.kiro, [{ id: 'claude-opus-5.5', label: 'Opus 5.5' }, { id: 'claude-sonnet-5.5', label: 'Sonnet 5.5' }]);
  assert.equal(firstModel('kiro'), 'claude-opus-5.5');
  assert.equal(firstModel('claude'), '', 'Claude still starts on its default');
  assert.ok(!MODELS.kiro.some((m) => m.id === 'auto' || m.id === ''), 'no auto, and no left-out model for Kiro');
});
