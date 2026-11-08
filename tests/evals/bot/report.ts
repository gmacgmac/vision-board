// The report: report.md (what was in force, the pass rate per check, every check with its evidence, the spend with its
// arithmetic) and results.json beside it, in the invocation's own out folder (gitignored).
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { FLAGS } from '#format';
import type { RunResult } from './eval.ts';
import { sha } from './eval.ts';
import { RUN_KILL_MS, RUN_TURNS, RUN_USD, WAIT_CLAMP_S } from './limits.ts';

export interface ReportMeta {
  started: string; dry: boolean; standalone?: boolean; fake?: string; model: string; cli: string | null;
  skill: { sha: string; lines: number } | null; skillPath?: string; flags: Record<string, boolean>;
  maxRuns: number; maxUsd: number; repeat: number; instructions: 'server' | 'none';
  runs: number; spent: number; stopped: string | null;
}

const cell = (s: string) => s.replace(/\s+/g, ' ').replace(/\|/g, '\\|');

/** Every flag in force, by name: the ones off, the ones this run set, and how many are on. */
export const flagsInForce = (overrides: Record<string, boolean> = {}) => {
  const all = Object.entries(FLAGS).map(([name, def]) => [name, overrides[name] ?? def.default] as const);
  const off = all.filter(([, on]) => !on).map(([name]) => name);
  const set = Object.entries(overrides).map(([name, on]) => `${name}=${on ? 'on' : 'off'}`);
  return `off: ${off.join(', ') || 'none'}; set by this run: ${set.join(', ') || 'none'}; on: the other ${all.length - off.length} (every one at its default unless set)`;
};

export function writeReport(out: string, meta: ReportMeta, results: RunResult[]): string {
  const seen = [...new Set(results.map((r) => r.model).filter(Boolean))].join(', ') || 'none';
  const said = results.map((r) => r.instructions).find((i) => i !== null);
  const costs = results.map((r) => r.costUsd.toFixed(4));
  const rates = new Map<string, { pass: number; of: number }>();
  for (const r of results.filter((x) => !x.exit.crashed || x.attempt > 1)) for (const c of r.checks) {
    const key = `${r.scenario}|${c.id}`;
    const now = rates.get(key) ?? { pass: 0, of: 0 };
    rates.set(key, { pass: now.pass + (c.pass ? 1 : 0), of: now.of + 1 });
  }
  const lines = [
    `# Bot eval, ${meta.started}`,
    '',
    `- **Mode**: ${meta.dry ? `dry (fake bot, \`${meta.fake ?? 'good'}\`)` : 'real model'}; ${meta.standalone ? 'standalone (SKILL.md, the real `vb-mcp`, a test board server with `ledgerFolders` and `readOnlyStart` on, opened for editing; calls read from the stream, `wait` not clamped)' : 'the plugin\'s bot (the eval host\'s door)'}`,
    `- **Model**: asked \`${meta.model}\`; the CLI's init said: ${seen}${meta.cli ? `; CLI ${meta.cli}` : ''}`,
    `- **Skill**: \`${meta.skillPath ?? 'dist/plugin/vision-board/skill.md'}\` ${meta.skill ? `sha256 ${meta.skill.sha}, ${meta.skill.lines} lines` : '(not built)'}`,
    `- **Server instructions the bot got** (${meta.standalone ? '`#mcp` `INSTRUCTIONS`, what `vb-mcp` sends with no secret' : `\`#mcp\` \`createMcpServer({ tools })\`, mode \`${meta.instructions}\``}): ${said ? `sha256 ${sha(said)}, "${cell(said.slice(0, 160))}…"` : 'none'}`,
    `- **Flags in force**: ${flagsInForce(meta.flags)}`,
    `- **Limits**: per run $${RUN_USD} (\`--max-budget-usd\`), ${RUN_TURNS} turns (\`--max-turns\`), kill at ${RUN_KILL_MS / 1000} s; \`wait\` clamped to ${WAIT_CLAMP_S} s at the door; this invocation \`--max-runs ${meta.maxRuns}\`, \`--max-usd ${meta.maxUsd}\`, \`--repeat ${meta.repeat}\``,
    `- **Runs**: ${meta.runs}; **spend** $${meta.spent.toFixed(4)}${costs.length ? ` = ${costs.join(' + ')}` : ''} (each run's last \`total_cost_usd\`; a run with no answer counts $${RUN_USD})`,
    `- **Stopped early**: ${meta.stopped ?? 'no'}`,
    '',
    '## Pass rate per check',
    '',
    '| Scenario | Check | Passed |',
    '|---|---|---|',
    ...[...rates].map(([key, v]) => { const [s, c] = key.split('|'); return `| ${s} | ${c} | ${v.pass}/${v.of} |`; }),
    '',
    '## Every check',
    '',
    '| Scenario | Rep | Check | Result | Evidence |',
    '|---|---|---|---|---|',
    ...results.flatMap((r) => r.checks.map((c) => `| ${r.scenario} | ${r.rep}${r.attempt > 1 ? ' (retry)' : ''} | ${c.id} | ${c.pass ? 'pass' : '**fail**'} | ${cell(c.evidence)} |`)),
    '',
    '## Runs',
    '',
    '| Scenario | Rep | Attempt | Seconds | Cost | Exit | Folder |',
    '|---|---|---|---|---|---|---|',
    ...results.map((r) => `| ${r.scenario} | ${r.rep} | ${r.attempt} | ${r.exit.seconds} | $${r.costUsd.toFixed(4)} | ${r.exit.killed ? 'killed' : r.exit.crashed ? `crashed${r.problem ? `: ${cell(r.problem)}` : ''}` : `code ${r.exit.code}`} | \`${path.basename(r.runDir)}\` |`),
    '',
  ];
  const file = path.join(out, 'report.md');
  writeFileSync(file, lines.join('\n'));
  writeFileSync(path.join(out, 'results.json'), `${JSON.stringify({ meta, results }, null, 2)}\n`);
  return file;
}
