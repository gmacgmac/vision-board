// A board's versions (navigation FE_01 ruling 2): the runs of agent drawing lines on it, one
// version per run, labelled by the run's last line; "now" is the board's own head. Checked on a
// built ledger (runs, other boards and board seen ignored, a person act or another agent ends a
// run), for coverage (every drawing type is a case, so one added later without a case fails), and
// on every fixture ledger against a walk over the whole event list (the oracle), folded at once
// and line by line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import type { LedgerEvent } from '#format';
import { readLedger } from '#format';
import type { BoardRun, LedgerState } from '../src/index.ts';
import { applyEvent, boardVersions, DRAWING_EVENTS, emptyState, eventBoard, foldLedger } from '../src/index.ts';
import { A, B, Ledger } from './ledger-v3.ts';
import { FIXTURE_LEDGERS } from '#format/testing';

/** Every fixture ledger, the gallery's too: real ledgers in the real schema. */
const FIXTURES = Object.values(FIXTURE_LEDGERS);

/** The definition as a full scan: per board, its own lines in order (a board seen is none); an
 * agent's drawing line right after a drawing line by the same agent replaces that run's end. */
function walkedRuns(s: LedgerState, events: readonly LedgerEvent[]): Map<string, number[]> {
  const out = new Map<string, number[]>();
  const last = new Map<string, LedgerEvent>();
  for (const e of events) {
    const board = eventBoard(s, e);
    if (board === undefined || (e.type === 'seen' && 'board' in e)) continue;
    const prev = last.get(board);
    last.set(board, e);
    if (!DRAWING_EVENTS.has(e.type) || e.by !== 'agent') continue;
    const runs = out.get(board) ?? [];
    out.set(board, runs);
    if (prev && DRAWING_EVENTS.has(prev.type) && prev.by === 'agent' && prev.agent === e.agent) runs.pop();
    runs.push(e.seq);
  }
  return out;
}

const seqs = (s: LedgerState) => new Map([...s.runs].map(([b, rs]) => [b, rs.map((r) => r.seq)]));

test('versions: runs of one agent\'s drawing lines, newest first; now is the board\'s own head', () => {
  const l = new Ledger();
  l.v = 8;
  const types: string[] = [];
  const draw = (who: string, e: { type: string; [k: string]: unknown }) => { types.push(e.type); return l.agent(who, e); };
  draw(A, { type: 'board', board: 'b', title: 'Board' });
  draw(A, { type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'grid' } });
  draw(A, { type: 'node', board: 'b', n: 1, ver: 1, node: { region: 'r', kind: 'question', title: 'One', item: true } });
  const v1 = draw(A, { type: 'node', board: 'b', n: 2, ver: 1, node: { region: 'r', kind: 'question', title: 'Two', item: true } });
  l.act({ action: 'ack', n: 1, ver: 1 }); // a person act on the board ends the run
  const v2 = draw(A, { type: 'link', from: 1, to: 2 });
  // Another board's lines and the person's board seen are not this board's lines.
  draw(A, { type: 'board', board: 'other', title: 'Other' });
  l.seenBoard('b', v2);
  const v3 = draw(A, { type: 'unlink', from: 1, to: 2 }); // continues the run v2 ended
  const b1 = draw(B, { type: 'node', board: 'b', n: 3, ver: 1, node: { region: 'r', kind: 'question', title: 'Three', item: true } });
  const now = draw(B, { type: 'node', board: 'b', n: 3, ver: 2, node: { region: 'r', kind: 'question', title: 'Three again', item: true } });
  const s = l.state();
  assert.ok(b1 < now && v2 < v3);
  const at = (seq: number) => s.runs.get('b')!.find((r) => r.seq === seq)!.at;
  const run = (seq: number, agent: string): BoardRun => ({ seq, at: at(seq), agent });
  assert.deepEqual(boardVersions(s, 'b'), { now, past: [run(v3, A), run(v1, A)] });
  assert.deepEqual(s.runs.get('b')!.map((r) => r.seq), [v1, v3, now]);
  assert.equal(s.heads.get('b'), now);
  // A person act after the last run: the run is a past version and now is the act.
  const act = l.act({ action: 'ack', n: 3, ver: 2 });
  assert.deepEqual(boardVersions(l.state(), 'b')!.now, act);
  assert.deepEqual(boardVersions(l.state(), 'b')!.past.map((r) => r.seq), [now, v3, v1]);
  assert.deepEqual(boardVersions(s, 'other'), { now: s.heads.get('other'), past: [] });
  assert.equal(boardVersions(s, 'none'), undefined);
  // A retire takes cards off the board: a drawing line, so a version of its own (api.md 127).
  l.v = 12;
  const gone = draw(A, { type: 'retire', board: 'b', cards: [2] });
  assert.deepEqual(boardVersions(l.state(), 'b'), { now: gone, past: [now, v3, v1].map((x) => ({ ...l.state().runs.get('b')!.find((r) => r.seq === x)! })) });
  // Coverage: every drawing type has a case above.
  for (const type of DRAWING_EVENTS) assert.ok(types.includes(type), `no case for drawing type "${type}"`);
});

for (const file of FIXTURES) {
  const name = file.split('/').at(-1)!;
  test(`versions: the fold equals the full walk on ${name}, at once and line by line`, () => {
    const read = readLedger(fs.readFileSync(file, 'utf8').trim().split('\n'));
    assert.deepEqual(read.problems, [], file);
    const whole = foldLedger(read.events);
    assert.deepEqual(seqs(whole), walkedRuns(whole, read.events));
    assert.ok(whole.runs.size > 0);
    const s = emptyState();
    read.events.forEach((e, i) => {
      applyEvent(s, e);
      const prefix = read.events.slice(0, i + 1);
      assert.deepEqual(seqs(s), walkedRuns(foldLedger(prefix), prefix), `after seq ${e.seq}`);
    });
  });
}
