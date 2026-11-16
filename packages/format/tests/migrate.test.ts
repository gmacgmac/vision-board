// The upgrade chain (D-103; ledger review § 3, V2): one test per step, a frozen old line in and the line expected out;
// every format below the current one has a path to it, so a format bump without its step fails here; and over every
// frozen ledger (fixtures/legacy/): as many lines, the same `seq`, `at`, `by`, `type`, card identities and board ids on
// every line, a current line kept byte for byte, and a second run the bytes of the first.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LEDGER_FORMAT, UPGRADE_STEPS, eventProblems, isUpgradeStop, upgradeLine, upgradeLines } from '../src/index.ts';
import { FIXTURES_DIR } from '../src/files.ts';

type Line = Record<string, unknown>;
const LEGACY = `${FIXTURES_DIR}legacy/`;
const FROZEN = fs.readdirSync(LEGACY).filter((f) => f.endsWith('.ledger.jsonl'));
const linesOf = (f: string): string[] => fs.readFileSync(`${LEGACY}${f}`, 'utf8').split('\n').filter(Boolean);
const step = (from: number | 'none') => UPGRADE_STEPS.find((s) => s.from === from)!;
const stamp = (v: number, seq = 1) => ({ v, seq, at: '2026-10-02T09:00:00Z' });

test('every format below the current one, and a line with no v, has a path to the current format', () => {
  for (let from = 2; from < LEDGER_FORMAT; from++) {
    let v: number = from;
    for (let guard = 0; v !== LEDGER_FORMAT; guard++) {
      const next = UPGRADE_STEPS.find((s) => s.from === v);
      assert.ok(next && guard < 100, `format ${v} has no step: a format bump needs its step (packages/format/src/migrate/steps.ts)`);
      assert.ok(next.to > v, `the step from ${v} goes forward`);
      v = next.to;
    }
  }
  assert.equal(step('none').to, 2);
  assert.equal(new Set(UPGRADE_STEPS.map((s) => s.from)).size, UPGRADE_STEPS.length, 'one step per format');
});

test('step none: a line with no v that is a format-2 line is read as one, v put first', () => {
  const line = { seq: 1, at: '2026-10-02T09:00:00Z', by: 'agent', agent: 'kiro', type: 'board', board: 'b', title: 'Plans' };
  assert.deepEqual(step('none').up(line), { v: 2, ...line });
  const up = upgradeLine(line);
  assert.deepEqual(Object.keys(up), ['v', 'seq', 'at', 'by', 'type', 'board', 'title']);
  assert.equal((up as Line).v, LEDGER_FORMAT);
});

test('step none: a line with no v that is not a format-2 line stops, never guessed at', () => {
  const out = step('none').up({ seq: 1, at: '2026-10-02T09:00:00Z', by: 'agent', type: 'board', board: 'b', colour: 'red' });
  assert.ok(isUpgradeStop(out) && /no `v`/.test(out.stop) && /colour/.test(out.stop), JSON.stringify(out));
  assert.ok(isUpgradeStop(upgradeLine({ hello: 'world' })));
});

test('step 2: the free-text agent name is dropped (no creator, as before); a person line is only restamped', () => {
  const agent = { ...stamp(2), by: 'agent', agent: 'kiro', type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'grid' } };
  assert.deepEqual(step(2).up(agent), { ...stamp(3), by: 'agent', type: 'region', board: 'b', region: { id: 'r', title: 'R', mode: 'grid' } });
  const person = { ...stamp(2), by: 'person', type: 'act', action: 'ack', n: 1, ver: 1 };
  assert.deepEqual(step(2).up(person), { ...person, v: 3 });
});

test('step 2: a join keeps an agent that is an id, and stops on any other name', () => {
  const join = { ...stamp(2), by: 'agent', agent: 'a-abcdefgh', type: 'join', label: 'Chat' };
  assert.deepEqual(step(2).up(join), { ...join, v: 3 });
  const named = step(2).up({ ...join, agent: 'kiro' });
  assert.ok(isUpgradeStop(named) && named.stop.includes('"kiro"'));
});

test('steps 3 to 9 and 12 to 18 restamp only', () => {
  for (const from of [3, 4, 6, 7, 8, 9, 12, 13, 14, 15, 16, 17, 18].filter((f) => f < LEDGER_FORMAT)) {
    const line = { ...stamp(from), by: 'person', type: 'act', action: 'comment', n: 4, ver: 2, text: 'list' };
    assert.deepEqual(step(from).up(line), { ...line, v: from + 1 }, `from ${from}`);
  }
});

test('step 5: a container an agent named later before format 6 stops; any other line is restamped', () => {
  const later = { ...stamp(5), by: 'agent', agent: 'a-abcdefgh', type: 'region', board: 'plans', region: { id: 'later', title: 'Later', mode: 'grid' } };
  const out = step(5).up(later);
  assert.ok(isUpgradeStop(out) && out.stop.includes('"plans"'));
  assert.ok(isUpgradeStop(upgradeLine({ ...later, v: 2, agent: 'kiro' })), 'a format-2 line passes the same step');
  const other = { ...later, region: { id: 'soon', title: 'Soon', mode: 'grid' } };
  assert.deepEqual(step(5).up(other), { ...other, v: 6 });
  assert.equal(isUpgradeStop(upgradeLine({ ...later, v: 6 })), false, 'from format 6 the reader judges it');
});

test('step 10: a node loses item, every other key in its place', () => {
  const node = { ...stamp(10), by: 'agent', agent: 'a-abcdefgh', type: 'node', board: 'b', n: 3, ver: 1, node: { region: 'r', kind: 'question', title: 'Q', item: true, tags: ['x'] } };
  const out = step(10).up(node) as Line;
  assert.deepEqual(out, { ...node, v: 11, node: { region: 'r', kind: 'question', title: 'Q', tags: ['x'] } });
  assert.deepEqual(Object.keys(out.node as Line), ['region', 'kind', 'title', 'tags']);
  const act = { ...stamp(10), by: 'person', type: 'act', action: 'ack', n: 3, ver: 1 };
  assert.deepEqual(step(10).up(act), { ...act, v: 11 });
});

test('step 11: list becomes column, in a container and in the person\'s mode act; other modes are kept', () => {
  const region = { ...stamp(11), by: 'agent', agent: 'a-abcdefgh', type: 'region', board: 'b', region: { id: 'q', title: 'Q', mode: 'list' } };
  assert.deepEqual(step(11).up(region), { ...region, v: 12, region: { id: 'q', title: 'Q', mode: 'column' } });
  const act = { ...stamp(11), by: 'person', type: 'act', action: 'mode', board: 'b', region: 'q', mode: 'list' };
  assert.deepEqual(step(11).up(act), { ...act, v: 12, mode: 'column' });
  const grid = { ...act, mode: 'grid' };
  assert.deepEqual(step(11).up(grid), { ...grid, v: 12 });
});

test('upgradeLine: a current line comes back untouched; a newer or unknown format is the reader\'s to judge', () => {
  const current = { ...stamp(LEDGER_FORMAT), by: 'person', type: 'act', action: 'ack', n: 1, ver: 1 };
  assert.equal(upgradeLine(current), current);
  const newer = { ...current, v: LEDGER_FORMAT + 1 };
  assert.equal(upgradeLine(newer), newer);
  const odd = { ...current, v: 1 };
  assert.equal(upgradeLine(odd), odd);
});

test('upgradeLines: current, blank, not-JSON and badly shaped lines kept byte for byte; v replaced in place', () => {
  const current = `{"v":${LEDGER_FORMAT},"seq":2,"at":"2026-10-02T09:00:01Z","by":"person","type":"act","action":"send","board":"b"}`;
  const old = '{"v":2,"seq":1,"at":"2026-10-02T09:00:00Z","by":"agent","agent":"kiro","type":"board","board":"b","title":"B"}';
  const bad = '{"v":7,"seq":3,"at":"2026-10-02T09:00:02Z","by":"person","type":"act","action":"ack","colour":"red"}';
  const out = upgradeLines([old, current, '', 'not json', bad, '[1]']);
  assert.deepEqual(out.lines, [
    `{"v":${LEDGER_FORMAT},"seq":1,"at":"2026-10-02T09:00:00Z","by":"agent","type":"board","board":"b","title":"B"}`,
    current, '', 'not json', bad, '[1]',
  ]);
  assert.equal(out.changed, 1);
  assert.deepEqual(out.byFormat, { 2: 1 });
  assert.deepEqual([out.stops, out.newer], [[], []]);
});

test('upgradeLines: a newer line is named and kept; a stop is named and the line kept', () => {
  const newer = `{"v":${LEDGER_FORMAT + 1},"seq":1,"at":"2026-10-02T09:00:00Z","by":"person","type":"act","action":"send","board":"b"}`;
  const later = '{"v":4,"seq":2,"at":"2026-10-02T09:00:00Z","by":"agent","agent":"a-abcdefgh","type":"region","board":"b","region":{"id":"later","title":"L","mode":"grid"}}';
  const out = upgradeLines([newer, later]);
  assert.deepEqual(out.lines, [newer, later]);
  assert.deepEqual(out.newer, [0]);
  assert.deepEqual(out.stops.map((s) => s.index), [1]);
  assert.equal(out.changed, 0);
});

/** What no step may change on a line (D-103 1, review V2). */
const identity = (text: string) => {
  const e = JSON.parse(text) as Line;
  const region = e.region as Line | string | undefined;
  return JSON.stringify([e.seq, e.at, e.by, e.type, e.n, e.board, typeof region === 'object' ? region.id : region,
    e.from, e.to, e.nodes, e.cards, e.proposal, e.note, e.request, e.head, e.action, e.id]);
};

for (const f of FROZEN) {
  test(`${f}: migrated line for line, every line current and well formed, and a second run changes nothing`, () => {
    const lines = linesOf(f);
    const once = upgradeLines(lines);
    assert.equal(once.lines.length, lines.length);
    assert.deepEqual([once.stops, once.newer], [[], []]);
    lines.forEach((l, i) => {
      assert.equal(identity(once.lines[i]!), identity(l), `${f} line ${i + 1}`);
      const e = JSON.parse(once.lines[i]!) as Line;
      assert.equal(e.v, LEDGER_FORMAT, `${f} line ${i + 1}`);
      assert.deepEqual(eventProblems(e), [], `${f} line ${i + 1}`);
      if ((JSON.parse(l) as Line).v === LEDGER_FORMAT) assert.equal(once.lines[i], l, 'a current line, byte for byte');
    });
    const twice = upgradeLines(once.lines);
    assert.deepEqual(twice.lines, once.lines);
    assert.equal(twice.changed, 0);
  });
}

test('the reader: a line from a newer build is its own kind, not a shape problem; validateLedger still names it', async () => {
  const { readLedger, validateLedger } = await import('../src/index.ts');
  const lines = [
    `{"v":${LEDGER_FORMAT},"seq":1,"at":"2026-10-02T09:00:00Z","by":"agent","agent":"a-abcdefgh","type":"join","label":"A"}`,
    `{"v":${LEDGER_FORMAT + 1},"seq":2,"at":"2026-10-02T09:00:01Z","by":"person","type":"act","action":"brand-new"}`,
    `{"v":${LEDGER_FORMAT},"seq":3,"at":"2026-10-02T09:00:02Z","by":"agent","agent":"a-abcdefgh","type":"board","board":"b","title":"B"}`,
  ];
  const read = readLedger(lines);
  assert.deepEqual([read.newer, read.problems, read.events.map((e) => e.seq)], [[2], [], [1, 3]]);
  assert.equal(read.index.seq, 3);
  assert.deepEqual(validateLedger(lines).length, 1);
  assert.match(validateLedger(lines)[0]!, /^line 2: .*newer Vision Board/);
});
