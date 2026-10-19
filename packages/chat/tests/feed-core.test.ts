// The feed's core (FE_01 ruling 2): chat events in, the feed out. The person's message with its
// chips; the agent's words, interim then final; tools as one status line while they run and a
// change chip for a board write; approval cards settled in place; system lines.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activityLine, applyEvent, applyEvents, atBottom, BOTTOM_PX, changeLabel, EMPTY_CHAT, followAfterScroll, leavesLatest } from '../src/index.ts';
import type { Draft } from './support.ts';
import { COMMAND, SESSION, stamp, TURN, WRITE } from './support.ts';

const run = (drafts: Draft[], from = 1) => applyEvents(EMPTY_CHAT, stamp(drafts, from));

test('a whole turn: the person, the agent\'s words, one change chip; tools and the done line leave no entry', () => {
  const s = run(TURN);
  assert.deepEqual(s.entries.map((e) => e.type), ['person', 'agent', 'change', 'agent']);
  assert.deepEqual(s.entries[0], { type: 'person', key: 'e1', text: 'Draw the two options.', chips: [{ kind: 'card', ref: 4, label: 'Pricing tiers' }] });
  assert.deepEqual(s.entries[1], { type: 'agent', key: 'e4', text: 'Looking at the board first.', interim: true });
  assert.deepEqual(s.entries[2], { type: 'change', key: 'e6', board: 'pricing', cards: [5, 6], head: 12 });
  assert.deepEqual(s.entries[3], { type: 'agent', key: 'e7', text: 'I drew **two** options.', interim: false });
  assert.equal(s.busy, false);
  assert.deepEqual(s.running, []);
  assert.equal(s.seq, 8);
  assert.equal(s.session, SESSION);
});

test('the status line: thinking, a tool, the board, writing, waiting; none once the turn ends', () => {
  const at = (n: number) => activityLine(run(TURN.slice(0, n)));
  assert.equal(activityLine(EMPTY_CHAT), null);
  assert.equal(at(1), 'Thinking…');
  assert.equal(at(2), 'Using Read…');
  assert.equal(at(3), 'Thinking…');
  assert.equal(at(4), 'Writing…');
  assert.equal(at(5), 'Drawing on the board…');
  assert.equal(at(7), 'Writing…');
  assert.equal(at(8), null);
  const asking = run([TURN[0]!, { kind: 'tool_activity', call: 't9', tool: 'Write', state: 'running' },
    { kind: 'approval_request', approvalId: 'ap-1', facts: WRITE, expiresAt: '2026-10-08T09:02:00Z' }]);
  assert.equal(activityLine(asking), 'Waiting for your answer');
});

test('an approval card is settled in place by its result; the waiting list follows', () => {
  const asked = run([TURN[0]!, { kind: 'approval_request', approvalId: 'ap-1', facts: COMMAND, expiresAt: '2026-10-08T09:02:00Z' }]);
  assert.deepEqual(asked.pending, ['ap-1']);
  const card = asked.entries[1]!;
  assert.deepEqual(card, { type: 'approval', key: 'a-ap-1', approvalId: 'ap-1', facts: COMMAND, expiresAt: '2026-10-08T09:02:00Z' });
  const settled = applyEvent(asked, stamp([{ kind: 'approval_result', approvalId: 'ap-1', approved: false, status: 'denied' }], 3)[0]!);
  assert.deepEqual(settled.pending, []);
  assert.equal(settled.entries.length, 2);
  assert.deepEqual(settled.entries[1], { ...card, result: { approved: false, status: 'denied' } });
  // The unchanged entries are the same objects, so an element redraws only what changed.
  assert.equal(settled.entries[0], asked.entries[0]);
});

test('a result for an approval the feed never saw changes nothing', () => {
  const s = run([TURN[0]!]);
  const after = applyEvent(s, stamp([{ kind: 'approval_result', approvalId: 'ap-9', approved: true, status: 'approved', scope: 'once' }], 2)[0]!);
  assert.deepEqual(after.entries, s.entries);
  assert.equal(after.seq, 2);
});

test('stopped and error end the turn and stay shown; the next message clears them', () => {
  const stopped = run([TURN[0]!, TURN[1]!, { kind: 'system', text: 'Stopped.', turn: 'stopped' }]);
  assert.equal(stopped.busy, false);
  assert.equal(stopped.ended, 'stopped');
  assert.deepEqual(stopped.running, []);
  assert.deepEqual(stopped.entries.at(-1), { type: 'system', key: 'e3', text: 'Stopped.', turn: 'stopped' });
  const failed = run([TURN[0]!, { kind: 'system', text: 'Claude Code ended without a result.', turn: 'error' }]);
  assert.equal(failed.ended, 'error');
  const again = applyEvent(failed, stamp([TURN[0]!], 3)[0]!);
  assert.equal(again.ended, undefined);
  assert.equal(again.busy, true);
});

test('a turn that ends with an approval still waiting leaves nothing waiting', () => {
  const s = run([TURN[0]!, { kind: 'approval_request', approvalId: 'ap-1', facts: WRITE, expiresAt: '2026-10-08T09:02:00Z' },
    { kind: 'system', text: 'Stopped.', turn: 'stopped' }]);
  assert.deepEqual(s.pending, []);
});

test('a system line that ends no turn is shown and leaves the turn as it was', () => {
  const s = run([{ kind: 'system', text: 'Session started.' }]);
  assert.deepEqual(s.entries, [{ type: 'system', key: 'e1', text: 'Session started.' }]);
  assert.equal(s.busy, false);
});

test('an event seen already is passed over; another session starts the feed over', () => {
  const events = stamp(TURN);
  const s = applyEvents(EMPTY_CHAT, events);
  assert.equal(applyEvents(s, events.slice(2, 5)), s);
  const other = applyEvent(s, { ...stamp([TURN[0]!], 1, 'another-session')[0]! });
  assert.equal(other.session, 'another-session');
  assert.deepEqual(other.entries.map((e) => e.key), ['e1']);
});

test('a failed board write draws no chip; a board write with no cards still says where it wrote', () => {
  const failed = run([TURN[0]!, { kind: 'tool_activity', call: 't2', tool: 'write_board', state: 'failed', board: 'pricing' }]);
  assert.deepEqual(failed.entries.map((e) => e.type), ['person']);
  const bare = run([TURN[0]!, { kind: 'tool_activity', call: 't2', tool: 'write_board', state: 'done', board: 'pricing', head: 9 }]);
  assert.deepEqual(bare.entries[1], { type: 'change', key: 'e2', board: 'pricing', cards: [], head: 9 });
});

test('changeLabel: the cards drawn and the board, by the name the host gives', () => {
  const s = run(TURN);
  const chip = s.entries[2]!;
  assert.equal(chip.type, 'change');
  if (chip.type !== 'change') return;
  assert.equal(changeLabel(chip), 'Drew 2 cards on pricing');
  assert.equal(changeLabel(chip, () => 'Pricing'), 'Drew 2 cards on Pricing');
  assert.equal(changeLabel({ ...chip, cards: [5] }, () => 'Pricing'), 'Drew 1 card on Pricing');
  assert.equal(changeLabel({ ...chip, cards: [] }, () => 'Pricing'), 'Wrote on Pricing');
});

// Following the latest: on by default; only the person's own scrolling away turns it off.
const log = (scrollTop: number, scrollHeight = 2000, clientHeight = 500) => ({ scrollTop, scrollHeight, clientHeight });

test('atBottom: the end of the log, within a few pixels', () => {
  assert.equal(atBottom(log(1500)), true);
  assert.equal(atBottom(log(1500 - BOTTOM_PX)), true);
  assert.equal(atBottom(log(1500 - BOTTOM_PX - 1)), false);
  assert.equal(atBottom(log(0, 300, 500)), true, 'a log that fits is at its end');
});

test('leavesLatest: a wheel or key that goes up, with room above, is the person scrolling away', () => {
  assert.equal(leavesLatest({ kind: 'wheel', deltaY: -80 }, log(1500)), true);
  assert.equal(leavesLatest({ kind: 'wheel', deltaY: 80 }, log(1500)), false);
  assert.equal(leavesLatest({ kind: 'wheel', deltaY: -80 }, log(0)), false, 'nothing above to scroll to');
  for (const key of ['PageUp', 'Home', 'ArrowUp']) assert.equal(leavesLatest({ kind: 'key', key, shift: false }, log(1500)), true, key);
  assert.equal(leavesLatest({ kind: 'key', key: ' ', shift: true }, log(1500)), true);
  for (const [key, shift] of [[' ', false], ['ArrowDown', false], ['PageDown', false], ['End', false], ['a', true]] as const) {
    assert.equal(leavesLatest({ kind: 'key', key, shift }, log(1500)), false, key);
  }
  assert.equal(leavesLatest({ kind: 'key', key: 'PageUp', shift: false }, log(0)), false);
});

test('followAfterScroll: moving down to the end follows; off the end it changes only while the person drags', () => {
  const [down, up] = [{ down: true, person: false }, { down: false, person: false }];
  assert.equal(followAfterScroll(false, log(1500), down), true);
  assert.equal(followAfterScroll(false, log(1498), up), false, 'a first step up from the end is not arriving');
  assert.equal(followAfterScroll(true, log(1498), up), true);
  assert.equal(followAfterScroll(true, log(900), up), true, 'a scroll the page made never turns it off');
  assert.equal(followAfterScroll(true, log(900), { down: false, person: true }), false, 'the person moving it away does');
  assert.equal(followAfterScroll(false, log(900), down), false);
});
