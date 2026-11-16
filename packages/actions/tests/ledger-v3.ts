// A small ledger builder for the action tests: agents join, draw, ask for grants, and the person
// answers. Every line is in the current format (D-103) and goes through readLedger, so a test never
// folds an invalid ledger.
import assert from 'node:assert/strict';
import { readLedger, LEDGER_FORMAT } from '#format';
import type { LedgerState } from '../src/index.ts';
import { foldLedger } from '../src/index.ts';

export const A = 'a-aaaa1111';
export const B = 'a-bbbb2222';
export const C = 'a-cccc3333';

const stamp = (seq: number) =>
  `2026-10-05T09:${String(Math.floor(seq / 60)).padStart(2, '0')}:${String(seq % 60).padStart(2, '0')}Z`;

export class Ledger {
  lines: string[] = [];
  seq = 0;

  private add(e: object): number {
    this.lines.push(JSON.stringify({ v: LEDGER_FORMAT, seq: ++this.seq, at: stamp(this.seq), ...e }));
    return this.seq;
  }

  /** An agent-written event; returns its seq. */
  agent(who: string, e: object): number { return this.add({ by: 'agent', agent: who, ...e }); }
  /** A person act; returns its seq. */
  act(e: object): number { return this.add({ by: 'person', type: 'act', ...e }); }
  seen(n: number, ver: number): number { return this.add({ by: 'person', type: 'seen', n, ver }); }
  /** The person has looked at `board` up to line `head` (api.md 87). */
  seenBoard(board: string, head: number): number { return this.add({ by: 'person', type: 'seen', board, head }); }
  /** The person creates or renames `board` (a v9 line, api.md 90). */
  personBoard(board: string, title: string): number { return this.add({ by: 'person', type: 'board', board, title }); }
  /** An agent's line with no agent id on it, as a format-2 line reads once migrated (review V3): it makes no
   * creator and no holder. */
  anonymous(e: object): number {
    this.lines.push(JSON.stringify({ v: LEDGER_FORMAT, seq: ++this.seq, at: stamp(this.seq), by: 'agent', ...e }));
    return this.seq;
  }

  node(who: string, n: number, ver: number, node: object, board = 'b'): number {
    return this.agent(who, { type: 'node', board, n, ver, node: { kind: 'question', title: `Node ${n}`, ...node } });
  }
  region(who: string, id: string, board = 'b'): number {
    return this.agent(who, { type: 'region', board, region: { id, title: id, mode: 'grid' } });
  }
  request(who: string, region: string, board = 'b'): number {
    return this.agent(who, { type: 'grant-request', board, region, reason: `Adding to ${region}.` });
  }

  state(): LedgerState {
    const read = readLedger(this.lines);
    assert.deepEqual(read.problems, []);
    return foldLedger(read.events);
  }
}

/**
 * The shared scene. A and B join; A opens board `b` with region `r` (A holds it) and item 1; B
 * creates region `q` with item 2 and region `side`; a line with no agent id (a format-2 line, migrated)
 * adds region `old` with item 3; C joins and holds nothing. Board `b2` (A) has region `x` and item 4.
 */
export function scene(): Ledger {
  const l = new Ledger();
  l.agent(A, { type: 'join', label: 'Pricing chat' });
  l.agent(B, { type: 'join', label: 'Review chat' });
  l.agent(C, { type: 'join', label: 'Spare chat' });
  l.agent(A, { type: 'board', board: 'b', title: 'Board', key: 'board-b' });
  l.region(A, 'r');
  l.node(A, 1, 1, { region: 'r' });
  l.region(B, 'q');
  l.node(B, 2, 1, { region: 'q' });
  l.region(B, 'side');
  l.anonymous({ type: 'region', board: 'b', region: { id: 'old', title: 'Old', mode: 'grid' } });
  l.anonymous({ type: 'node', board: 'b', n: 3, ver: 1, node: { region: 'old', kind: 'question', title: 'Old item' } });
  l.agent(A, { type: 'board', board: 'b2', title: 'Board two' });
  l.region(A, 'x', 'b2');
  l.node(A, 4, 1, { region: 'x' }, 'b2');
  return l;
}
