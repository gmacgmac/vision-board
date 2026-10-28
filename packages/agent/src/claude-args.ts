// The Claude CLI's command line for one turn (PLAN ruling 3, after nclite's buildTurnArgs in
// container/harness-claude.ts), and how a session decides between starting and resuming.
import { existsSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { StartOptions } from './adapter.ts';
import { GATED_TOOLS } from './approvals.ts';
import { HELD_HOOK_TIMEOUT_S, HOOK_TIMEOUT_S } from './gate.ts';

/** The gate's executable, beside this package's source. */
export const GATE_BIN = fileURLToPath(new URL('../bin/gate.ts', import.meta.url));

/** Which session a turn names, and whether it continues it. */
export interface TurnSession {
  id: string;
  resume: boolean;
}

/** Single-quote for the shell that runs the hook command. */
const sh = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/**
 * The inline `--settings`: a PreToolUse hook on every gated tool. Inline, never a settings file the
 * agent could edit. `|| exit 2`: a gate that cannot even start blocks the tool rather than letting
 * it through (exit 2 blocks; any other failure would not). `hold` (approvalHold): the hook waits 24 hours.
 */
export function gateSettings(node = process.execPath, gate = GATE_BIN, hold = false): string {
  const command = `${sh(node)} --no-warnings ${sh(gate)} || exit 2`;
  return JSON.stringify({
    hooks: {
      PreToolUse: [{ matcher: `^(${GATED_TOOLS.join('|')})$`, hooks: [{ type: 'command', command, timeout: hold ? HELD_HOOK_TIMEOUT_S : HOOK_TIMEOUT_S }] }],
    },
  });
}

/** The `--mcp-config` file's content. Written to a private file, so a secret in `env` never reaches argv. */
export function mcpConfigJson(servers: StartOptions['mcpServers']): string {
  return JSON.stringify({ mcpServers: servers });
}

/**
 * One turn's arguments. No prompt: it goes in on stdin, out of `ps`. `--verbose` is required with
 * stream-json in print mode. `--append-system-prompt-file` every turn, since `--resume` drops it.
 * `--allowedTools` is variadic, so it comes last. Never `--bare` (it would skip the person's login).
 */
export function buildClaudeArgs(options: StartOptions, session: TurnSession, mcpConfigFile: string, settings = gateSettings(undefined, undefined, options.approvalHold)): string[] {
  const args = ['-p', '--output-format', 'stream-json', '--verbose', session.resume ? '--resume' : '--session-id', session.id];
  if (options.model) args.push('--model', options.model);
  if (options.instructionsFile) args.push('--append-system-prompt-file', options.instructionsFile);
  args.push('--mcp-config', mcpConfigFile, '--strict-mcp-config', '--permission-mode', 'default', '--settings', settings);
  if (options.allowedTools.length) args.push('--allowedTools', ...options.allowedTools);
  return args;
}

/** The CLI's transcript folder for a working folder: every run of non-alphanumerics becomes `-`. */
export function projectSlug(cwd: string): string {
  return cwd.replace(/[^a-zA-Z0-9]+/g, '-');
}

/**
 * Whether the CLI already has this session's transcript (a stat, never a read). It can be wrong
 * (another config folder, a moved project), so a turn whose flag the CLI refuses is run once more
 * with the other one (claude.ts), as nclite's createClaudeHarness does.
 */
export function transcriptExists(cwd: string, id: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const config = env.CLAUDE_CONFIG_DIR || path.join(homedir(), '.claude');
  const dirs = new Set([cwd]);
  try { dirs.add(realpathSync(cwd)); } catch { /* the folder is gone: the CLI will say so */ }
  return [...dirs].some((dir) => existsSync(path.join(config, 'projects', projectSlug(dir), `${id}.jsonl`)));
}

/** The CLI's two ways of saying the start-or-resume flag was the wrong one. */
export function isWrongSessionFlag(text: string): boolean {
  const t = text.toLowerCase();
  return t.includes('already in use') || t.includes('no conversation found');
}
