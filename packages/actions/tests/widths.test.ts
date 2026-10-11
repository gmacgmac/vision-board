// A container's card widths, the person's `widths` act (field-report batch 3 ruling 5, api.md 132):
// checked like `mode`, folded like `mode` (the latest choice per container wins, a retired container's
// left out of the board state), reported to the agents that may answer in the container and sorted
// at the lowest card in it, as `mode` is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActEvent } from '../../format/src/index.ts';
import { boardState, inCardOrder, responsesAfter, validateAct } from '../src/index.ts';
import { A, B, C, scene } from './ledger-v3.ts';

const widths = (region: string, w: string, board = 'b') => ({ action: 'widths', board, region, widths: w });
const asAct = (e: object): ActEvent => ({ v: 13, seq: 999, at: '2026-10-11T09:00:00Z', by: 'person', type: 'act', ...e }) as ActEvent;

function picked() {
  const l = scene();
  l.v = 13;
  const at = {
    ack1: l.act({ action: 'ack', n: 1, ver: 1 }),
    r1: l.act(widths('r', 'match')),
    q: l.act(widths('q', 'match')),
    r2: l.act(widths('r', 'own')),
    x: l.act(widths('x', 'match', 'b2')),
  };
  return { l, at };
}

test('checked like mode: a container on the board the act was sent to', () => {
  const s = picked().l.state();
  assert.deepEqual(validateAct(asAct(widths('r', 'match')), s, 'b'), []);
  assert.match(validateAct(asAct(widths('nope', 'match')), s, 'b').join(), /region: unknown "nope"/);
  assert.match(validateAct(asAct(widths('r', 'match')), s, 'b2').join(), /names board "b" but was sent to board "b2"/);
});

test('folded per board and container, the latest choice winning; a retired container is left out', () => {
  const { l } = picked();
  let s = l.state();
  assert.deepEqual([...s.widths.get('b')!], [['r', 'own'], ['q', 'match']]);
  assert.deepEqual([...boardState(s, 'b').widths], [['r', 'own'], ['q', 'match']]);
  assert.deepEqual([...boardState(s, 'b2').widths], [['x', 'match']]);
  l.agent(B, { type: 'retire', board: 'b', region: 'q', cards: [2] });
  s = l.state();
  assert.deepEqual([...boardState(s, 'b').widths], [['r', 'own']]);
});

test('reported to the agents that may answer in the container, at the lowest card in it', () => {
  const { l, at } = picked();
  const s = l.state();
  const seqs = (agent?: string) => responsesAfter(s, 'b', 0, agent).map((e) => e.seq);
  assert.deepEqual(seqs(A), [at.ack1, at.r1, at.r2], 'A holds r');
  assert.deepEqual(seqs(B), [at.q], 'B holds q');
  assert.deepEqual(seqs(C), [], 'C holds nothing');
  // r's widths sort at card 1 (after its ✓, in the order made); q's at card 2.
  assert.deepEqual(inCardOrder(s, responsesAfter(s, 'b', 0)).map((e) => e.seq), [at.ack1, at.r1, at.r2, at.q]);
});
