// Working alongside the agent (workAlongside flag, WORK_01): the board's mark follows the chat's own
// conditions (working while the turn runs, asking while a question waits, nothing once it ends); a
// reply is news only when it lands out of sight and after the page began following, interim words
// never; the count clears once the person can see the latest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ChatEvent } from '#chat';
import { applyEvents, EMPTY_CHAT } from '#chat';
import { agentWork, createReplyNews, isNewReply } from '../src/shell/chat-news.ts';

const S = 'session-1';
let seq = 0;
const at = (ms: number) => new Date(ms).toISOString();
const ev = (e: object, ms = 1000): ChatEvent => ({ at: at(ms), session: S, seq: ++seq, ...e }) as ChatEvent;
const write = { kind: 'write', op: 'create', path: 'notes.txt' };

test('the mark: working while the turn runs, asking while a question waits, nothing once the turn ends', () => {
  seq = 0;
  assert.equal(agentWork(EMPTY_CHAT), 'idle');
  const working = applyEvents(EMPTY_CHAT, [ev({ kind: 'message_in', text: 'Draw it' })]);
  assert.equal(agentWork(working), 'working');
  const asking = applyEvents(working, [ev({ kind: 'approval_request', approvalId: 'a1', facts: write, expiresAt: at(9000) })]);
  assert.equal(agentWork(asking), 'asking');
  const answered = applyEvents(asking, [ev({ kind: 'approval_result', approvalId: 'a1', approved: true, status: 'approved', scope: 'once' })]);
  assert.equal(agentWork(answered), 'working');
  assert.equal(agentWork(applyEvents(answered, [ev({ kind: 'system', text: 'Done.', turn: 'done' })])), 'idle');
  assert.equal(agentWork(applyEvents(asking, [ev({ kind: 'system', text: 'Stopped.', turn: 'stopped' })])), 'idle', 'Stop ends the ask too');
});

test('a reply is the words a turn ended on, landed at or after the page began following', () => {
  seq = 0;
  assert.equal(isNewReply(ev({ kind: 'message_out', text: 'Done' }, 2000), 2000), true);
  assert.equal(isNewReply(ev({ kind: 'message_out', text: 'Done' }, 1999), 2000), false, 'already there when the page opened');
  assert.equal(isNewReply(ev({ kind: 'message_out', text: 'Reading…', interim: true }, 3000), 2000), false, 'words partway through a turn');
  assert.equal(isNewReply(ev({ kind: 'system', text: 'Done.', turn: 'done' }, 3000), 2000), false);
});

test('news: counted and announced only out of sight; cleared once the latest can be seen; a new session starts over', () => {
  seq = 0;
  let [clock, seen, announced] = [1000, false, 0];
  const counts: number[] = [];
  const news = createReplyNews({ seen: () => seen, count: (n) => counts.push(n), announce: () => { announced++; }, now: () => clock });
  news.event(ev({ kind: 'message_out', text: 'Old reply' }, 500));
  assert.equal(news.count, 0, 'history is not news');
  news.event(ev({ kind: 'message_out', text: 'First' }, 1500));
  news.event(ev({ kind: 'message_out', text: 'Partway', interim: true }, 1600));
  news.event(ev({ kind: 'message_out', text: 'Second' }, 1700));
  assert.equal(news.count, 2);
  assert.equal(announced, 2);
  news.check();
  assert.equal(news.count, 2, 'still out of sight');
  seen = true;
  news.check();
  assert.equal(news.count, 0);
  news.event(ev({ kind: 'message_out', text: 'Seen as it lands' }, 1800));
  assert.equal(news.count, 0, 'a reply the person sees lands quietly');
  assert.equal(announced, 2);
  seen = false;
  news.event(ev({ kind: 'message_out', text: 'Third' }, 1900));
  clock = 5000;
  news.follow();
  assert.equal(news.count, 0, 'another session: nothing carried over');
  news.event(ev({ kind: 'message_out', text: 'Before the new session' }, 4000));
  assert.equal(news.count, 0);
  assert.deepEqual(counts, [1, 2, 0, 1, 0]);
});
