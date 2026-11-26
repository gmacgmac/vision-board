// The time the agent last wrote a card's text (card-times.ts `writtenOf`): the newest `drawn` time and its agent's
// label; ticks, crosses, notes and replies never count. Pure; the fixture is invented.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CardTime } from '../src/index.ts';
import { writtenOf } from '../src/index.ts';

const t = (seq: number, at: string, kind: CardTime['kind'], agent?: string): CardTime => ({ seq, at, kind, ...(agent && { agent }) });
const held = (list: CardTime[]) => ({ times: new Map([[7, list]]), agents: new Map([['a1', 'Claude']]) });

test('the newest drawn time, by the agent\'s label; the person\'s acts and replies do not count', () => {
  const s = held([
    t(1, '2026-11-26T09:00:00Z', 'drawn', 'a1'), t(2, '2026-11-26T09:30:00Z', 'drawn', 'a1'),
    t(3, '2026-11-26T10:00:00Z', 'check'), t(4, '2026-11-26T10:05:00Z', 'cross'), t(5, '2026-11-26T10:10:00Z', 'note-sent'),
    t(6, '2026-11-26T10:20:00Z', 'replied', 'a1'),
  ]);
  assert.deepEqual(writtenOf(s, 7), { at: '2026-11-26T09:30:00Z', agent: 'Claude' });
});

test('an agent with no label is named by its id; no agent leaves it out; a card never drawn has none', () => {
  assert.deepEqual(writtenOf(held([t(1, '2026-11-26T09:00:00Z', 'drawn', 'zz')]), 7), { at: '2026-11-26T09:00:00Z', agent: 'zz' });
  assert.deepEqual(writtenOf(held([t(1, '2026-11-26T09:00:00Z', 'drawn')]), 7), { at: '2026-11-26T09:00:00Z' });
  assert.equal(writtenOf(held([t(1, '2026-11-26T09:00:00Z', 'check')]), 7), undefined);
  assert.equal(writtenOf(held([]), 8), undefined);
});
