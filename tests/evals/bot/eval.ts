// The eval's loop: each scenario (times `repeat`) as one run with its own host, board folder and bot process, its
// checks scored from the record, and the caps enforced before every run: the run counter and the spend (a run is
// started only if the spend so far plus a whole run's cap stays within `maxUsd`). One retry for a run that crashed,
// never for one that failed a check.
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { bounded, brief, itemsOf } from './checks.ts';
import { deadline, startEvalHost } from './host.ts';
import { CALL_MS, CEILING_RUNS, CEILING_USD, CRASH_RETRIES, RUN_TURNS, RUN_USD } from './limits.ts';
import { runCost, runTurns } from './model.ts';
import { picturesIn } from './scenarios/picture.ts';
import { SCENARIOS } from './scenarios/index.ts';
import type { RunRecord, Scenario, Stage } from './types.ts';

export const ROOT = path.resolve(import.meta.dirname, '../../..');
export const SKILL = path.join(ROOT, 'dist/plugin/board/skill.md');
const MCP_BOT = path.join(import.meta.dirname, 'mcp-bot.ts');
const FAKE_BOT = path.join(import.meta.dirname, 'fake-bot.ts');
const SERVER = 'vision-board';

export interface EvalOptions {
  dry: boolean;
  fake?: 'good' | 'bad';
  only?: string[];
  repeat: number;
  maxRuns: number;
  maxUsd: number;
  port: number;
  out: string;
  model: string;
  flags?: Record<string, boolean>;
  instructions: 'server' | 'none';
  killMs?: number;
  log: (line: string) => void;
}

export interface Scored { id: string; says: string; pass: boolean; evidence: string }
export interface RunResult {
  scenario: string; rep: number; attempt: number; runDir: string; costUsd: number;
  exit: RunRecord['exit']; problem: string | null; model: string | null; instructions: string | null; checks: Scored[];
}

export const sha = (text: string) => createHash('sha256').update(text).digest('hex').slice(0, 12);

/** The CLI's arguments for one run, as a host's bot: the plugin's skill, only the host's tools and `Write`. */
export function botArgs(o: { model: string; dir: string; mcp: string }): string[] {
  return [
    '-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
    '--model', o.model, '--system-prompt-file', SKILL,
    '--append-system-prompt', `The host: your Vision Board's board folder is ${o.dir}`,
    '--mcp-config', o.mcp, '--strict-mcp-config', '--tools', 'Write', '--allowedTools', `mcp__${SERVER}`,
    '--permission-mode', 'acceptEdits', '--permission-prompts', 'none', '--add-dir', o.dir,
    '--max-budget-usd', String(RUN_USD), '--max-turns', String(RUN_TURNS),
    '--no-session-persistence', '--disable-slash-commands', '--setting-sources', '', '--no-chrome',
  ];
}

/** Refuse caps past the ceilings: no flag makes the eval unbounded. */
export function checkCaps(o: Pick<EvalOptions, 'maxRuns' | 'maxUsd' | 'repeat'>): void {
  if (!(o.maxRuns >= 1 && o.maxRuns <= CEILING_RUNS)) throw new Error(`--max-runs must be 1 to ${CEILING_RUNS}`);
  if (!(o.maxUsd > 0 && o.maxUsd <= CEILING_USD)) throw new Error(`--max-usd must be above 0 and at most ${CEILING_USD}`);
  if (!(Number.isInteger(o.repeat) && o.repeat >= 1)) throw new Error('--repeat must be a whole number from 1');
}

/** One run of `scenario`: a fresh host and board folder, setup, the bot through every turn, then the record. */
async function runOnce(s: Scenario, o: EvalOptions, runDir: string, attempt: number): Promise<{ record: RunRecord; problem: string | null }> {
  mkdirSync(runDir, { recursive: true });
  const base = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'vb-eval-')));
  const dir = path.join(base, 'board');
  mkdirSync(dir);
  const host = await startEvalHost({ dir, port: o.port, dry: o.dry, ...(o.flags && { flags: o.flags }) });
  try {
    const facts: Record<string, number | string> = { boardDir: dir };
    const botBoard = () => host.calls.filter((c) => c.name === 'write_board' && typeof c.input.board === 'string').at(-1)?.input.board as string | undefined;
    const stage: Stage = { dir, tool: host.tool, person: host.person, facts, botBoard };
    if (s.setup) await deadline(s.setup(stage), CALL_MS, `${s.id} setup`);
    const mcp = path.join(runDir, 'mcp.json');
    const env = { VB_EVAL_DOOR: host.door, VB_EVAL_TOKEN: host.token, VB_EVAL_INSTRUCTIONS: o.instructions };
    writeFileSync(mcp, `${JSON.stringify({ mcpServers: { [SERVER]: { command: process.execPath, args: [MCP_BOT], env } } }, null, 2)}\n`);
    const args = botArgs({ model: o.model, dir, mcp });
    writeFileSync(path.join(runDir, 'args.json'), `${JSON.stringify(args, null, 2)}\n`);
    const turns = s.turns.map((t) => async () => {
      if (t.act) await deadline(t.act(stage), CALL_MS, `${s.id} person`);
      const sent = t.send ? await host.person.send(typeof t.send === 'function' ? t.send(stage) : t.send) : '';
      return [t.say, sent].filter(Boolean).join('\n\n');
    });
    const run = await runTurns({
      command: o.dry ? process.execPath : 'claude', args: o.dry ? [FAKE_BOT, ...args] : args, cwd: base, out: runDir,
      env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1', VB_EVAL_SCENARIO: s.id, VB_EVAL_FAKE: o.fake ?? 'good' },
      ...(o.killMs && { killMs: o.killMs }),
    }, turns, (i) => host.setTurn(i));
    const copy = path.join(runDir, 'board-folder');
    cpSync(dir, copy, { recursive: true });
    const record: RunRecord = {
      scenario: s.id, attempt, dir: copy, turns: run.turns, calls: host.calls, ledger: await host.ledger(), facts,
      exit: run.exit, model: run.model, instructions: host.seen.instructions, imageStatus: {},
      costUsd: o.dry ? 0 : runCost(run.turns.map((t) => t.end), RUN_USD), problem: run.problem,
    };
    const texts = itemsOf(record).map(({ item }) => String(item.node?.body ?? item.text ?? ''));
    for (const [, p] of picturesIn(texts)) record.imageStatus[p] = host.image(p);
    writeFileSync(path.join(runDir, 'calls.jsonl'), host.calls.map((c) => JSON.stringify(c)).join('\n') + '\n');
    writeFileSync(path.join(runDir, 'record.json'), `${JSON.stringify(record, null, 2)}\n`);
    return { record, problem: run.problem };
  } finally {
    await host.close();
    rmSync(base, { recursive: true, force: true });
  }
}

/** Score a record: the scenario's checks, then `bounded`. A check that throws fails, with why. */
export function score(s: Scenario, r: RunRecord): Scored[] {
  return [...s.checks, bounded()].map((c) => {
    try { return { id: c.id, says: c.says, ...c.run(r) }; } catch (err) { return { id: c.id, says: c.says, pass: false, evidence: `check threw: ${brief(String(err))}` }; }
  });
}

export async function runEval(o: EvalOptions): Promise<{ results: RunResult[]; runs: number; spent: number; stopped: string | null }> {
  checkCaps(o);
  const chosen = o.only?.length ? SCENARIOS.filter((s) => o.only!.includes(s.id)) : SCENARIOS;
  if (o.only?.length && chosen.length !== o.only.length) throw new Error(`unknown scenario in --only ${o.only.join(',')}`);
  const results: RunResult[] = [];
  let runs = 0;
  let spent = 0;
  let stopped: string | null = null;
  outer: for (let rep = 1; rep <= o.repeat; rep++) {
    for (const s of chosen) {
      for (let attempt = 1; attempt <= 1 + CRASH_RETRIES; attempt++) {
        if (runs >= o.maxRuns) { stopped = `run cap reached (${runs} of --max-runs ${o.maxRuns})`; break outer; }
        if (!o.dry && spent + RUN_USD > o.maxUsd) { stopped = `spend cap: $${spent.toFixed(4)} spent, a run may cost $${RUN_USD}, --max-usd ${o.maxUsd}`; break outer; }
        runs += 1;
        const runDir = path.join(o.out, `${s.id}-r${rep}-a${attempt}`);
        const { record, problem } = await runOnce(s, o, runDir, attempt);
        spent += record.costUsd;
        const checks = score(s, record);
        results.push({ scenario: s.id, rep, attempt, runDir, costUsd: record.costUsd, exit: record.exit, problem, model: record.model, instructions: record.instructions, checks });
        for (const c of checks) o.log(`${c.pass ? 'PASS' : 'FAIL'} ${s.id}/${c.id} (rep ${rep}${attempt > 1 ? `, retry` : ''}): ${c.evidence}`);
        o.log(`  run ${runs}: $${record.costUsd.toFixed(4)}, ${record.exit.seconds} s${record.exit.crashed ? `, CRASHED${problem ? `: ${problem}` : ''}` : ''}`);
        if (!record.exit.crashed) break;
      }
    }
  }
  return { results, runs, spent, stopped };
}

/** The skill the bot read, for the report: its hash and size. */
export const skillFacts = () => { try { const t = readFileSync(SKILL, 'utf8'); return { sha: sha(t), lines: t.split('\n').length }; } catch { return null; } };
