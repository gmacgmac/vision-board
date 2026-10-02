import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Caller } from '../server/ledger.ts';
import { ledgerPath, openLedger } from '../server/ledger.ts';
import { HttpError } from '../server/guard.ts';

const AGENT: Caller = { by: 'agent', agent: 'kiro' };
const PERSON: Caller = { by: 'person' };
const dirs: string[] = [];
const quiet = () => {};

afterEach(() => { for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });

function tempFile(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-ledger-'));
  dirs.push(dir);
  return ledgerPath(dir);
}

/** A board with one region and `count` item nodes. */
function seeded(count = 2) {
  const file = tempFile();
  const ledger = openLedger(file, quiet);
  ledger.append({ type: 'board', board: 'review', title: 'Review' }, AGENT);
  ledger.append({ type: 'region', board: 'review', region: { id: 'main', title: 'Main', mode: 'grid' } }, AGENT);
  for (let i = 0; i < count; i++) ledger.append(node(`Item ${i + 1}`), AGENT);
  return { file, ledger };
}

const node = (title: string, n?: number) =>
  ({ type: 'node', board: 'review', ...(n !== undefined && { n }), node: { region: 'main', kind: 'question', title, item: true } });

const problemsOf = (fn: () => unknown): string[] => {
  try { fn(); } catch (err) {
    assert.ok(err instanceof HttpError);
    assert.equal(err.status, 422);
    return err.problems;
  }
  assert.fail('expected a 422');
};

const lineCount = (file: string) => fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).length;

test('ledgerPath: <project>/.visionboard/ledger.jsonl; an absent file opens empty', () => {
  const file = tempFile();
  assert.equal(path.basename(path.dirname(file)), '.visionboard');
  assert.equal(path.basename(file), 'ledger.jsonl');
  const ledger = openLedger(file, quiet);
  assert.deepEqual(ledger.problems, []);
  assert.equal(ledger.state().seq, 0);
  assert.equal(fs.existsSync(file), false);
});

test('append: stamps every event and creates .visionboard/ on first write', () => {
  const { file, ledger } = seeded(1);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  assert.equal(lines.pop(), '');
  const events = lines.map((l) => JSON.parse(l));
  assert.deepEqual(events.map((e) => e.seq), [1, 2, 3]);
  for (const e of events) {
    assert.equal(e.v, 2);
    assert.equal(e.by, 'agent');
    assert.equal(e.agent, 'kiro');
    assert.ok(!Number.isNaN(Date.parse(e.at)));
  }
  assert.equal(ledger.state().seq, 3);
});

test('numbers: assigned by the server and never reused', () => {
  const { ledger } = seeded(2);
  assert.deepEqual([...ledger.state().nodes.keys()], [1, 2]);
  const third = ledger.append(node('Third'), AGENT);
  assert.equal(third.type === 'node' && third.n, 3);
  // A client cannot pick a fresh number, and a number in use is a new version, not a new node.
  assert.match(problemsOf(() => ledger.append(node('Mine', 9), AGENT)).join(), /unknown node 9/);
  ledger.append(node('Item 1 again', 1), AGENT);
  assert.equal(ledger.state().nodes.size, 3);
  const next = ledger.append(node('Fourth'), AGENT);
  assert.equal(next.type === 'node' && next.n, 4);
});

test('versions: a second write to n gets ver 2, whatever the body says', () => {
  const { ledger } = seeded(1);
  const e = ledger.append({ ...node('Item 1, revised', 1), ver: 7 }, AGENT);
  assert.equal(e.type === 'node' && e.ver, 2);
  assert.deepEqual(ledger.state().nodes.get(1)!.versions.map((v) => [v.ver, v.title]), [[1, 'Item 1'], [2, 'Item 1, revised']]);
});

test('a bad event writes nothing and returns every problem', () => {
  const { file, ledger } = seeded(1);
  const before = fs.readFileSync(file, 'utf8');
  const seen: unknown[] = [];
  ledger.onAppend((e) => seen.push(e));
  const problems = problemsOf(() => ledger.append(
    { type: 'node', board: 'review', node: { region: 'main', kind: 'nope', title: '', x: 1 } }, AGENT));
  assert.equal(problems.length, 3, problems.join('; '));
  assert.ok(problems.some((p) => p.startsWith('node.x')));
  assert.ok(problems.some((p) => p.startsWith('node.kind')));
  assert.ok(problems.some((p) => p.startsWith('node.title')));
  assert.match(problemsOf(() => ledger.append('not an event', AGENT)).join(), /must be an object/);
  assert.match(problemsOf(() => ledger.append({ type: 'act', action: 'ack', n: 1, ver: 1 }, AGENT)).join(), /only the person/);
  assert.equal(fs.readFileSync(file, 'utf8'), before);
  assert.equal(ledger.state().seq, 3);
  assert.deepEqual(seen, []);
  // The failed attempts did not use up a seq.
  assert.equal(ledger.append({ type: 'act', action: 'ack', n: 1, ver: 1 }, PERSON).seq, 4);
});

test('the body cannot set by, seq, at, v or agent', () => {
  const { file, ledger } = seeded(1);
  const e = ledger.append(
    { type: 'reply', n: 1, text: 'Noted.', by: 'person', seq: 99, at: '2000-01-01T00:00:00Z', v: 1, agent: 'someone-else' },
    AGENT);
  assert.deepEqual([e.by, e.seq, e.v, e.agent], ['agent', 4, 2, 'kiro']);
  assert.notEqual(e.at, '2000-01-01T00:00:00Z');
  // A person cannot pass as an agent by naming one in the body.
  const act = ledger.append({ type: 'act', action: 'ack', n: 1, ver: 1, by: 'agent', agent: 'kiro' }, PERSON);
  assert.equal(act.by, 'person');
  assert.equal('agent' in act, false);
  assert.equal(lineCount(file), 5);
});

test('a stale proposal cannot be accepted', () => {
  const { ledger } = seeded(1);
  const prop = ledger.append({ type: 'propose', n: 1, ver: 1, action: 'drop', reason: 'Client declined.' }, AGENT);
  ledger.append(node('Item 1, changed', 1), AGENT);
  const problems = problemsOf(() =>
    ledger.append({ type: 'act', action: 'drop', n: 1, ver: 2, proposal: prop.seq }, PERSON));
  assert.match(problems.join(), /out of date/);
  assert.equal(ledger.state().items.has(1), false);
  assert.equal(ledger.state().proposals.get(prop.seq)!.decidedBy, undefined);
});

test('a current proposal is accepted and marked decided', () => {
  const { ledger } = seeded(1);
  const prop = ledger.append({ type: 'propose', n: 1, ver: 1, action: 'drop', reason: 'Client declined.' }, AGENT);
  const act = ledger.append({ type: 'act', action: 'drop', n: 1, ver: 1, proposal: prop.seq }, PERSON);
  assert.equal(ledger.state().items.get(1)!.status, 'dropped');
  assert.equal(ledger.state().proposals.get(prop.seq)!.decidedBy, act.seq);
});

test('a corrupt line is reported while the rest loads, and the next seq is above it', () => {
  const { file } = seeded(2);
  fs.appendFileSync(file, 'not json\n');
  fs.appendFileSync(file, `${JSON.stringify({ v: 2, seq: 6, at: '2026-10-02T09:00:00Z', by: 'agent', type: 'node' })}\n`);
  const warned: string[] = [];
  const ledger = openLedger(file, (m) => warned.push(m));
  assert.equal(ledger.problems.length >= 2, true, ledger.problems.join('; '));
  assert.ok(ledger.problems.some((p) => p.startsWith('line 5: not JSON')));
  assert.ok(ledger.problems.some((p) => p.startsWith('line 6:')));
  assert.equal(warned.length, ledger.problems.length);
  assert.deepEqual([...ledger.state().nodes.keys()], [1, 2]);
  const e = ledger.append(node('Third'), AGENT);
  assert.equal(e.seq, 7);
  assert.equal(e.type === 'node' && e.n, 3);
  assert.deepEqual(openLedger(file, quiet).state(), ledger.state());
});

test('a torn last line does not swallow the next event', () => {
  const { file } = seeded(1);
  fs.appendFileSync(file, '{"v":2,"seq":4,"at":"2026');
  const ledger = openLedger(file, quiet);
  ledger.append(node('Second'), AGENT);
  const again = openLedger(file, quiet);
  assert.deepEqual([...again.state().nodes.keys()], [1, 2]);
  assert.equal(again.problems.length, 1);
});

test('onAppend: every listener hears each event until it unsubscribes', () => {
  const { ledger } = seeded(0);
  const heard: number[] = [];
  const off = ledger.onAppend((e) => heard.push(e.seq));
  ledger.append(node('One'), AGENT);
  off();
  ledger.append(node('Two'), AGENT);
  assert.deepEqual(heard, [3]);
});

test('reopening the file gives the same state', () => {
  const { file, ledger } = seeded(2);
  const prop = ledger.append({ type: 'propose', n: 2, ver: 1, action: 'ack', reason: 'Done in chat.' }, AGENT);
  ledger.append({ type: 'act', action: 'comment', n: 1, ver: 1, text: 'Why?' }, PERSON);
  ledger.append(node('Item 1, with the answer', 1), AGENT);
  ledger.append({ type: 'reply', n: 1, text: 'Answered on the card.' }, AGENT);
  ledger.append({ type: 'seen', n: 1, ver: 2 }, PERSON);
  ledger.append({ type: 'act', action: 'ack', n: 2, ver: 1, proposal: prop.seq }, PERSON);
  ledger.append({ type: 'link', from: 1, to: 2, label: 'depends on' }, AGENT);
  ledger.append({ type: 'act', action: 'pin', n: 2, x: 10, y: 20 }, PERSON);
  const again = openLedger(file, quiet);
  assert.deepEqual(again.problems, []);
  assert.deepEqual(again.state(), ledger.state());
  assert.equal(again.state().seq, 12);
});
