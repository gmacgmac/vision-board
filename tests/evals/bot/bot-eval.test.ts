// The eval's own test, in `npm test`, with no model and no cost (`--dry`): the host, the MCP pass-through, the person,
// the stream reader and every check run against the scripted fake bot, in both modes (the plugin's host, and the
// standalone board server with the real vb-mcp). The good script passes every check; the bad one fails the checks it breaks; a `wait` is recorded as asked and clamped; the caps refuse to be raised past their
// ceilings; a run that never answers is killed.
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, test } from 'node:test';
import { checkCaps, runEval, type EvalOptions } from './eval.ts';
import { CEILING_RUNS, CEILING_USD, RUN_USD, WAIT_CLAMP_S } from './limits.ts';
import { runCost, runTurns } from './model.ts';
import { SCENARIOS, STANDALONE } from './scenarios/index.ts';

const out = mkdtempSync(path.join(os.tmpdir(), 'vb-bot-eval-test-'));
after(() => rmSync(out, { recursive: true, force: true }));
const dry = (fake: 'good' | 'bad', extra: Partial<EvalOptions> = {}): EvalOptions => ({
  dry: true, fake, repeat: 1, maxRuns: 20, maxUsd: 1, port: 0, out: path.join(out, fake), model: 'sonnet',
  instructions: 'server', killMs: 60_000, log: () => {}, ...extra,
});

test('dry, good: every scenario runs once through the pass-through and passes every check', async () => {
  const { results, runs, spent, stopped } = await runEval(dry('good'));
  assert.equal(runs, SCENARIOS.length);
  assert.equal(spent, 0);
  assert.equal(stopped, null);
  const failed = results.flatMap((r) => r.checks.filter((c) => !c.pass).map((c) => `${r.scenario}/${c.id}: ${c.evidence}`));
  assert.deepEqual(failed, []);
  assert.ok(results.every((r) => r.model === 'fake-bot' && r.instructions?.startsWith('Vision Board')), 'the init line and the server\'s instructions are read');
});

test('dry, bad: each scenario\'s rule-breaking script fails the checks it breaks, and a wait is clamped as asked', async () => {
  const { results } = await runEval(dry('bad'));
  for (const s of SCENARIOS) {
    const r = results.find((x) => x.scenario === s.id)!;
    const failed = r.checks.filter((c) => !c.pass).map((c) => c.id);
    for (const id of s.fake.badFails ?? []) assert.ok(failed.includes(id), `${s.id}/${id} should fail: failed ${failed.join(', ')}`);
    assert.ok(r.checks.find((c) => c.id === 'bounded')!.pass, `${s.id} still ends on its own`);
  }
  const wait = results.find((x) => x.scenario === 'wait')!.checks.find((c) => c.id === 'no-wait')!;
  assert.match(wait.evidence, new RegExp(`wait 60 clamped to ${WAIT_CLAMP_S}`));
});

test('dry, standalone: the real vb-mcp on a test board server; good passes every check, bad fails the ones it breaks', async () => {
  const good = await runEval(dry('good', { standalone: true, out: path.join(out, 'standalone-good') }));
  assert.equal(good.runs, STANDALONE.length);
  assert.deepEqual(good.results.flatMap((r) => r.checks.filter((c) => !c.pass).map((c) => `${r.scenario}/${c.id}: ${c.evidence}`)), []);
  const bad = await runEval(dry('bad', { standalone: true, out: path.join(out, 'standalone-bad') }));
  for (const s of STANDALONE) {
    const failed = bad.results.find((x) => x.scenario === s.id)!.checks.filter((c) => !c.pass).map((c) => c.id);
    for (const id of s.fake.badFails ?? []) assert.ok(failed.includes(id), `${s.id}/${id} should fail: failed ${failed.join(', ')}`);
    assert.ok(!failed.includes('bounded'), `${s.id} still ends on its own`);
  }
});

test('caps: the run cap stops the eval, and no flag raises a cap past its ceiling', async () => {
  const { runs, stopped } = await runEval(dry('good', { maxRuns: 2, out: path.join(out, 'capped') }));
  assert.equal(runs, 2);
  assert.match(stopped ?? '', /run cap/);
  assert.throws(() => checkCaps({ maxRuns: CEILING_RUNS + 1, maxUsd: 1, repeat: 1 }), /--max-runs/);
  assert.throws(() => checkCaps({ maxRuns: 1, maxUsd: CEILING_USD + 1, repeat: 1 }), /--max-usd/);
  assert.throws(() => checkCaps({ maxRuns: 1, maxUsd: 0, repeat: 1 }), /--max-usd/);
});

test('spend: a run is its last turn\'s total, and a run with no answer counts the whole per-run cap', () => {
  assert.equal(runCost([{ costUsd: 0.04 }, { costUsd: 0.09 }], RUN_USD), 0.09);
  assert.equal(runCost([{ costUsd: 0.04 }, null], RUN_USD), RUN_USD);
  assert.equal(runCost([], RUN_USD), RUN_USD);
});

test('kill: a bot that never answers is killed at the wall clock, with its process group', async () => {
  const dir = mkdtempSync(path.join(out, 'kill-'));
  const hang = 'process.stdin.resume(); setInterval(() => {}, 1000);';
  const run = await runTurns({ command: process.execPath, args: ['-e', hang], cwd: dir, env: process.env, out: dir, killMs: 500 }, [async () => 'hello'], () => {});
  assert.equal(run.exit.killed, true);
  assert.equal(run.exit.crashed, false);
  assert.equal(run.turns[0]!.end, null);
});
