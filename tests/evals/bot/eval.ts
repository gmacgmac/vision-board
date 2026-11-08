// The eval's loop: each scenario (times `repeat`) as one run with its own host, board folder and bot process, its
// checks scored from the record (the plugin's host by default; with `standalone`, the real SKILL.md and `vb-mcp` against a
// board server, standalone.ts, over the standalone scenarios), and the caps enforced before every run: the run counter and the spend (a run is
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
import { SCENARIOS, STANDALONE } from './scenarios/index.ts';
import { startStandaloneHost } from './standalone.ts';
import type { BotHost, RunRecord, Scenario, Stage } from './types.ts';

export const ROOT = path.resolve(import.meta.dirname, '../../..');
export const SKILL = path.join(ROOT, 'dist/plugin/vision-board/skill.md');
const MCP_BOT = path.join(import.meta.dirname, 'mcp-bot.ts');
const FAKE_BOT = path.join(import.meta.dirname, 'fake-bot.ts');
const SERVER = 'vision-board';

export interface EvalOptions {
  dry: boolean;
  /** The standalone bot (standalone.ts) and its scenarios, in place of the plugin's. */
  standalone?: boolean;
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

/** The CLI's arguments for one run: the host's skill and line, only the board's tools and the host's built-in ones. */
export function botArgs(o: { model: string; bot: BotHost['bot']; mcp: string }): string[] {
  return [
    '-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
    '--model', o.model, '--system-prompt-file', o.bot.skill, '--append-system-prompt', o.bot.prompt,
    '--mcp-config', o.mcp, '--strict-mcp-config', '--tools', o.bot.tools, '--allowedTools', `mcp__${SERVER}`,
    '--permission-mode', 'acceptEdits', '--permission-prompts', 'none', '--add-dir', o.bot.addDir,
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

/** The plugin's host (host.ts) as the bot sees it: the built skill, the pass-through to the door, `Write` only. */
async function pluginHost(o: EvalOptions, base: string): Promise<BotHost> {
  const dir = path.join(base, 'board');
  mkdirSync(dir);
  const host = await startEvalHost({ dir, port: o.port, dry: o.dry, ...(o.flags && { flags: o.flags }) });
  return {
    ...host, cwd: base, setReadOnly: host.setReadOnly, image: async (p) => host.image(p), record: () => {},
    openLedger: async () => { throw new Error('a host has one board folder: no other ledger to open'); },
    mcp: { command: process.execPath, args: [MCP_BOT], env: { VB_EVAL_DOOR: host.door, VB_EVAL_TOKEN: host.token, VB_EVAL_INSTRUCTIONS: o.instructions } },
    bot: { skill: SKILL, prompt: `The host: your Vision Board's board folder is ${dir}`, tools: 'Write', addDir: dir },
  };
}

/** One run of `scenario`: a fresh host and board folder, setup, the bot through every turn, then the record. */
async function runOnce(s: Scenario, o: EvalOptions, runDir: string, attempt: number): Promise<{ record: RunRecord; problem: string | null }> {
  mkdirSync(runDir, { recursive: true });
  const base = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'vb-eval-')));
  const flags = s.flags ? { ...o.flags, ...s.flags } : o.flags;
  const host = o.standalone ? await startStandaloneHost({ base, port: o.port, ...(flags && { flags }) }) : await pluginHost({ ...o, ...(flags && { flags }) }, base);
  const { dir } = host;
  try {
    const facts: Record<string, number | string> = { boardDir: dir };
    const botBoard = () => host.calls.filter((c) => c.name === 'write_board' && typeof c.input.board === 'string').at(-1)?.input.board as string | undefined;
    const stage: Stage = { dir, tool: host.tool, person: host.person, facts, botBoard, readOnly: host.setReadOnly, ledger: host.openLedger };
    if (s.setup) await deadline(s.setup(stage), CALL_MS, `${s.id} setup`);
    const mcp = path.join(runDir, 'mcp.json');
    writeFileSync(mcp, `${JSON.stringify({ mcpServers: { [SERVER]: host.mcp } }, null, 2)}\n`);
    const args = botArgs({ model: o.model, bot: host.bot, mcp });
    writeFileSync(path.join(runDir, 'args.json'), `${JSON.stringify(args, null, 2)}\n`);
    const turns = s.turns.map((t) => async () => {
      if (t.act) await deadline(t.act(stage), CALL_MS, `${s.id} person`);
      const sent = t.send ? await host.person.send(typeof t.send === 'function' ? t.send(stage) : t.send) : '';
      return [t.say, sent].filter(Boolean).join('\n\n');
    });
    const run = await runTurns({
      command: o.dry ? process.execPath : 'claude', args: o.dry ? [FAKE_BOT, ...args] : args, cwd: host.cwd, out: runDir,
      env: { ...process.env, CLAUDE_CODE_DISABLE_CLAUDE_MDS: '1', VB_EVAL_SCENARIO: s.id, VB_EVAL_FAKE: o.fake ?? 'good' },
      ...(o.killMs && { killMs: o.killMs }),
    }, turns, (i) => host.setTurn(i));
    host.record(run.turns);
    const copy = path.join(runDir, 'board-folder');
    cpSync(o.standalone ? path.dirname(dir) : dir, copy, { recursive: true });
    const record: RunRecord = {
      scenario: s.id, attempt, dir: o.standalone ? path.join(copy, path.basename(dir)) : copy, turns: run.turns, calls: host.calls,
      ledger: await host.ledger(), facts, exit: run.exit, model: run.model, instructions: host.seen.instructions, imageStatus: {},
      costUsd: o.dry ? 0 : runCost(run.turns.map((t) => t.end), RUN_USD), problem: run.problem,
    };
    const texts = itemsOf(record).map(({ item }) => String(item.node?.body ?? item.text ?? ''));
    for (const [, p] of picturesIn(texts)) record.imageStatus[p] = await host.image(p);
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
  const all = o.standalone ? STANDALONE : SCENARIOS;
  const chosen = o.only?.length ? all.filter((s) => o.only!.includes(s.id)) : all;
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
export const skillFacts = (file = SKILL) => { try { const t = readFileSync(file, 'utf8'); return { sha: sha(t), lines: t.split('\n').length }; } catch { return null; } };
