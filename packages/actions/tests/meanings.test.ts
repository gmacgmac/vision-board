// What ✓ and ✗ mean on each kind, as the agent reads it (panel-send ruling 4, api.md 121): `means`
// on the acts `check_responses` reports, the kind and its word on each line of the numbered reply,
// and the round Send hands the chat panel's agent (`replyScope`: only what was answered since).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardView } from '../../format/src/index.ts';
import { actionWord, boardState, meaningOf, otherWords, replyScope, replyText, responsesPage } from '../src/index.ts';
import { A, scene } from './ledger-v3.ts';

test('one table: yes and no on a question, done for ✓ on an action, nothing elsewhere', () => {
  assert.deepEqual([meaningOf('ack', 'question'), meaningOf('drop', 'question'), meaningOf('ack', 'action')], ['yes', 'no', 'done']);
  assert.deepEqual([meaningOf('drop', 'action'), meaningOf('ack', 'finding'), meaningOf('comment', 'question')], [undefined, undefined, undefined]);
  assert.deepEqual([actionWord('ack', 'question'), actionWord('drop', 'action'), actionWord('later', 'question')], ['Yes', 'Drop', 'Save for later']);
  assert.deepEqual([otherWords('ack'), otherWords('drop'), otherWords('comment')], [['Yes', 'Done'], ['No'], []]);
});

/** Board `b` at v8 with an action (5) and a finding (6) beside the questions 1, 2 and 3. Card 4 is
 * on board b2, so on board b the action is card 4 and the finding card 5 (api.md 125): the lines
 * name identities, every answer board numbers. */
function kinds() {
  const l = scene();
  l.v = 8;
  l.node(A, 5, 1, { region: 'r', kind: 'action' });
  l.node(A, 6, 1, { region: 'r', kind: 'finding' });
  return l;
}

test('check_responses: each ✓ or ✗ says what it means on its card\'s kind', () => {
  const l = kinds();
  const from = l.seq;
  l.act({ action: 'drop', n: 1, ver: 1 });
  l.act({ action: 'ack', n: 2, ver: 1 });
  l.act({ action: 'ack', n: 5, ver: 1 });
  l.act({ action: 'drop', n: 5, ver: 1 });
  l.act({ action: 'comment', n: 6, ver: 1, text: 'Source?' });
  const page = responsesPage(l.state(), 'b', from, 100);
  assert.deepEqual(page.responses.map((e) => [e.n, e.action, e.means]), [
    [1, 'drop', 'no'], [2, 'ack', 'yes'], [4, 'ack', 'done'], [4, 'drop', undefined], [5, 'comment', undefined],
  ]);
  assert.ok(!('means' in page.responses[3]!), 'no field where the act means itself');
});

test('the numbered reply: each card with its kind and its word', () => {
  const l = kinds();
  l.act({ action: 'drop', n: 1, ver: 1 });
  l.act({ action: 'ack', n: 5, ver: 1 });
  l.act({ action: 'later', n: 6, ver: 1 });
  l.act({ action: 'comment', nodes: [2, 6], text: 'Same root cause.' });
  const s = l.state();
  assert.deepEqual(replyText(boardView(s, 'b'), boardState(s, 'b')).split('\n').slice(1), [
    '1 (question): no', '2, 5 (question, finding): comment: Same root cause.', '4 (action): done', '5 (finding): saved for later',
    'Still open: 3',
  ]);
});

test('a round: only what was answered after the cursor, with only the newer notes; still open is the board\'s', () => {
  const l = kinds();
  l.act({ action: 'comment', n: 1, ver: 1, text: 'Old words.' });
  l.act({ action: 'ack', n: 2, ver: 1 });
  l.act({ action: 'comment', board: 'b', region: 'q', text: 'Old container note.' });
  const since = l.act({ action: 'send', board: 'b' });
  l.act({ action: 'drop', n: 1, ver: 1 });
  l.act({ action: 'comment', n: 6, ver: 1, text: 'New words.' });
  l.act({ action: 'size', n: 2, size: 'l' });
  l.act({ action: 'comment', board: 'b', region: 'r', text: 'All of r.' });
  l.act({ action: 'send', board: 'b' });
  const s = l.state();
  const scope = replyScope(s, 'b', since);
  assert.deepEqual([[...scope.cards], [...scope.regions]], [[1, 5], ['r']], 'a size pick is no answer');
  assert.deepEqual(replyText(boardView(s, 'b'), boardState(s, 'b'), scope).split('\n').slice(1), [
    '1 (question): no', '5 (finding): comment: New words.', 'On container "r" comment: All of r.', 'Still open: 3, 4',
  ]);
  assert.deepEqual(replyScope(s, 'b', s.seq).cards.size, 0, 'nothing after the latest line');
});
