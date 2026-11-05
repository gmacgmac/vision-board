// `npm run eval:bot -- [options]`: the board's bot through every scenario, scored from what it did. On demand only,
// never in CI: a real run costs money. The limits are in limits.ts and enforced in the code, not here.
//   --dry                  the scripted fake bot, no model, no cost (`--fake bad` plays the rule-breaking scripts)
//   --standalone           the standalone bot: skills/vision-board/SKILL.md and the real vb-mcp against a test board
//                          server (standalone.ts), over the standalone scenarios; `--port` is that server's
//   --only a,b             these scenarios only        --repeat N      each scenario N times: a pass rate
//   --max-runs N           stop after N runs (default 16, at most 30)
//   --max-usd X            start no run that could pass $X in all (default 3, at most 10)
//   --model M              default sonnet              --port P        the door's port (default 6010)
//   --flags a,-b           engine flags on or off      --instructions server|none   what the bot's MCP server says
//   --out DIR              default tests/evals/bot/out/<timestamp>/
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT, SKILL, checkCaps, runEval, skillFacts } from './eval.ts';
import { BUILD_MS, MAX_RUNS, MAX_USD } from './limits.ts';
import { STANDALONE_SKILL } from './standalone.ts';
import { killRunning } from './model.ts';
import { writeReport } from './report.ts';

const { values: v } = parseArgs({
  options: {
    dry: { type: 'boolean', default: false }, standalone: { type: 'boolean', default: false }, fake: { type: 'string', default: 'good' },
    only: { type: 'string' }, repeat: { type: 'string', default: '1' },
    'max-runs': { type: 'string', default: String(MAX_RUNS) }, 'max-usd': { type: 'string', default: String(MAX_USD) },
    model: { type: 'string', default: 'sonnet' }, port: { type: 'string', default: '6010' },
    flags: { type: 'string' }, instructions: { type: 'string', default: 'server' }, out: { type: 'string' },
  },
});
const flags = v.flags ? Object.fromEntries(v.flags.split(',').filter(Boolean).map((f) => (f.startsWith('-') ? [f.slice(1), false] : [f, true]))) : undefined;
const options = {
  dry: v.dry!, standalone: v.standalone!, fake: v.fake === 'bad' ? 'bad' as const : 'good' as const, only: v.only?.split(',').filter(Boolean),
  repeat: Number(v.repeat), maxRuns: Number(v['max-runs']), maxUsd: Number(v['max-usd']), model: v.model!,
  port: Number(v.port), instructions: v.instructions === 'none' ? 'none' as const : 'server' as const, ...(flags && { flags }),
};
checkCaps(options);
if (options.standalone && options.instructions === 'none') throw new Error('--instructions none: the standalone bot runs the real vb-mcp, whose instructions are its own');
const skill = options.standalone ? STANDALONE_SKILL : SKILL;
const started = new Date().toISOString();
const out = path.resolve(v.out ?? path.join(import.meta.dirname, 'out', started.replace(/[:.]/g, '-')));
mkdirSync(out, { recursive: true });

for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { killRunning(); console.error(`eval: ${signal}, runs stopped`); process.exit(130); });

let cli: string | null = null;
if (!options.dry) {
  if (!options.standalone) execFileSync(process.execPath, ['apps/board/bin/build-plugin.ts'], { cwd: ROOT, timeout: BUILD_MS, stdio: 'inherit' });
  if (!existsSync(skill)) throw new Error(`no ${skill}${options.standalone ? '' : ' after the build'}`);
  cpSync(skill, path.join(out, 'skill.md'));
  cli = execFileSync('claude', ['--version'], { timeout: 15_000, encoding: 'utf8' }).trim();
}
const { results, runs, spent, stopped } = await runEval({ ...options, out, log: (line) => console.log(line) });
const file = writeReport(out, { started, ...options, cli, skill: skillFacts(skill), skillPath: path.relative(ROOT, skill), flags: flags ?? {}, runs, spent, stopped }, results);
const checks = results.flatMap((r) => r.checks);
console.log(`\n${checks.filter((c) => c.pass).length}/${checks.length} checks passed in ${runs} run(s), $${spent.toFixed(4)}${stopped ? `; stopped: ${stopped}` : ''}`);
console.log(`report: ${path.relative(ROOT, file)}`);
