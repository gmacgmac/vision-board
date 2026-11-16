// A seen container (D-099 4, api.md 187; tracker N47): the person's `seen` naming a container with the `head` it saw.
// It ends `container.fresh` and the container notes' unseen replies up to that head, so a line that arrives while the
// person clicks stays fresh; `containerSeenDue` is true only when the line would change something. It moves no head.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readLedger, LEDGER_FORMAT } from '#format';
import type { LedgerState } from '../src/index.ts';
import { conditionsOf, containerSeenAt, containerSeenDue, unseenContainerReplies } from '../src/index.ts';
import type { Ledger } from './ledger-v3.ts';
import { A, scene } from './ledger-v3.ts';

const fresh = (s: LedgerState) => conditionsOf(s, { board: 'b' }).filter((c) => c.kind === 'container.fresh').map((c) => [c.container, c.seq]);
/** The person's seen of container `region` of board `b` up to `head` (api.md 187). */
const seeContainer = (l: Ledger, region: string, head: number) =>
  l.lines.push(JSON.stringify({ v: LEDGER_FORMAT, seq: ++l.seq, at: '2026-11-16T10:00:00Z', by: 'person', type: 'seen', board: 'b', region, head }));
const draw = (l: Ledger, n: number) =>
  l.agent(A, { type: 'node', board: 'b', n, ver: 1, node: { region: 'r', kind: 'finding', title: `New ${n}` } });

/** The scene at v20, the board seen, then a new card in A's container `r`. */
function drawn() {
  const l = scene();
  l.seenBoard('b', l.seq);
  const first = draw(l, 5);
  return { l, first };
}

test('a container seen at the head it saw ends container.fresh, and only then is one due', () => {
  const { l, first } = drawn();
  assert.deepEqual(fresh(l.state()), [['r', first]]);
  assert.equal(containerSeenDue(l.state(), 'b', 'r', first), true);
  assert.equal(containerSeenDue(l.state(), 'b', 'q', first), false, 'nothing new in q');
  const head = l.state().heads.get('b');
  seeContainer(l, 'r', first);
  const s = l.state();
  assert.deepEqual([fresh(s), containerSeenAt(s, 'b', 'r'), s.heads.get('b')], [[], first, head], 'it moves no head');
  assert.equal(containerSeenDue(s, 'b', 'r', s.seq), false, 'once seen, a second line would change nothing');
});

test('a container seen at an older head leaves a later line fresh', () => {
  const { l, first } = drawn();
  const later = draw(l, 6);
  seeContainer(l, 'r', first);
  const s = l.state();
  assert.deepEqual(fresh(s), [['r', later]]);
  assert.equal(containerSeenDue(s, 'b', 'r', first), false, 'the same head again changes nothing');
  assert.equal(containerSeenDue(s, 'b', 'r', later), true);
});

test('an agent\'s reply to a container\'s note is unseen until the container is seen past it (tracker N47)', () => {
  const l = scene();
  const note = l.act({ action: 'comment', board: 'b', region: 'q', text: 'Is q split right?' });
  const reply = l.agent(A, { type: 'reply', n: 2, text: 'Yes: by owner.', to: note });
  const s = l.state();
  assert.deepEqual(unseenContainerReplies(s, 'b', 'q').map((r) => r.seq), [reply]);
  assert.deepEqual(unseenContainerReplies(s, 'b', 'r'), []);
  assert.equal(containerSeenDue(s, 'b', 'q', reply), true);
  assert.equal(containerSeenDue(s, 'b', 'q', reply - 1), false, 'a head before the reply clears nothing');
  seeContainer(l, 'q', reply);
  assert.deepEqual(unseenContainerReplies(l.state(), 'b', 'q'), []);
});

test('the ledger: a container seen names a container of the board, a head it holds, and no card', () => {
  const { l } = drawn();
  const line = (e: object) => JSON.stringify({ v: LEDGER_FORMAT, seq: l.seq + 1, at: '2026-11-16T10:00:00Z', by: 'person', type: 'seen', board: 'b', ...e });
  assert.deepEqual(readLedger([...l.lines, line({ region: 'r', head: l.seq })]).problems, []);
  assert.match(readLedger([...l.lines, line({ region: 'nope', head: l.seq })]).problems.join(), /region: unknown "nope"/);
  assert.match(readLedger([...l.lines, line({ region: 'r', head: l.seq + 3 })]).problems.join(), /head: the ledger is at line/);
  assert.match(readLedger([...l.lines, line({ region: 'r' })]).problems.join(), /head: required/);
  assert.match(readLedger([...l.lines, line({ region: 'r', head: l.seq, n: 1, ver: 1, board: undefined })]).problems.join(), /not both/);
});
