// The Claude adapter (D-036; PLAN ruling 3): one `claude -p` process per prompt, the prompt on
// stdin, `--session-id` the first time and `--resume` after (claude-args.ts), the person's own
// login. Cancel is SIGTERM, then SIGKILL after KILL_GRACE_MS (nclite's); a turn has a time limit that
// counts only the agent's own working time (`hold`, turn-clock.ts).
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import type { AgentAdapter, AgentSession, AgentUpdate, StartOptions } from './adapter.ts';
import type { TurnSession } from './claude-args.ts';
import { buildClaudeArgs, isWrongSessionFlag, mcpConfigJson, transcriptExists } from './claude-args.ts';
import { ClaudeStream } from './claude-stream.ts';
import { GATE_TOKEN_ENV, GATE_URL_ENV, GATE_WAIT_ENV, gateWaitMs } from './gate.ts';
import { startTurnClock } from './turn-clock.ts';

/** Between SIGTERM and SIGKILL (nclite's KILL_GRACE_MS). */
export const KILL_GRACE_MS = 3_000;
/** How long one turn may work before it is stopped (time spent waiting for the person's answer is not counted). */
export const TURN_LIMIT_MS = 10 * 60_000;
const SESSION_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;

export interface ClaudeAdapterOptions {
  /** The CLI to run; tests point it at a fake. Default `claude` on PATH. */
  command?: { file: string; args?: string[] };
  /** Start even though ANTHROPIC_API_KEY is set (the CLI would then bill the key, not the login). */
  allowApiKey?: boolean;
  turnLimitMs?: number;
  killGraceMs?: number;
  /** The environment the CLI inherits. Default process.env. */
  env?: NodeJS.ProcessEnv;
  /** Where notes for the host go (an unknown event shape). Default stderr. */
  log?: (line: string) => void;
}

const duration = (ms: number) => (ms >= 60_000 ? `${Math.round(ms / 60_000)} minutes` : `${Math.round(ms / 1000)} seconds`);

/** One run of the CLI: its updates as they come, then its ending. */
async function* runOnce(
  opts: Opts,
  start: StartOptions,
  session: TurnSession,
  text: string,
  turn: Turn,
  retry: { wrongFlag: boolean },
): AsyncGenerator<AgentUpdate> {
  const config = path.join(tmpdir(), `agent-mcp-${randomUUID()}.json`);
  writeFileSync(config, mcpConfigJson(start.mcpServers), { mode: 0o600 });
  const child = spawn(opts.command.file, [...(opts.command.args ?? []), ...buildClaudeArgs(start, session, config)], {
    cwd: start.cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...opts.env, [GATE_URL_ENV]: start.gate.url, [GATE_TOKEN_ENV]: start.gate.token,
      ...(start.approvalHold && { [GATE_WAIT_ENV]: String(gateWaitMs(true)) }),
    },
  });
  const closed = new Promise<void>((resolve) => { child.once('close', () => resolve()); child.once('error', () => resolve()); });
  let spawnError = '';
  child.once('error', (err) => { spawnError = err.message; });
  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => { stderr = (stderr + chunk.toString('utf8')).slice(-4000); });
  child.stdin.on('error', () => { /* the CLI exited before reading: its ending says why */ });
  child.stdin.end(text);

  let killed = false;
  let timedOut = false;
  const kill = () => {
    if (killed) return;
    killed = true;
    child.kill('SIGTERM');
    setTimeout(() => { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }, opts.killGraceMs).unref();
  };
  turn.kill = kill;
  if (turn.cancelled) kill();
  const clock = startTurnClock(opts.turnLimitMs, () => { timedOut = true; kill(); });
  turn.hold = clock.hold;
  const stream = new ClaudeStream(Object.keys(start.mcpServers), opts.log);
  let plain = '';
  try {
    for await (const line of createInterface({ input: child.stdout, crlfDelay: Infinity })) {
      if (line.trim() === '') continue;
      let event: unknown;
      try { event = JSON.parse(line); } catch { plain = (plain + line).slice(-4000); continue; }
      const updates = stream.push(event);
      if (stream.problem) { kill(); break; }
      for (const update of updates) yield update;
    }
    await closed;
  } finally {
    clock.stop();
    turn.hold = undefined;
    if (!killed && child.exitCode === null && child.signalCode === null) kill();
    rmSync(config, { force: true });
    turn.kill = undefined;
  }
  if (!stream.sawEvent && !killed && isWrongSessionFlag(`${plain}\n${stderr}`)) {
    retry.wrongFlag = true;
    return;
  }
  if (turn.cancelled) { yield { type: 'stopped' }; return; }
  if (timedOut) { yield { type: 'error', message: `The agent did not finish within ${duration(opts.turnLimitMs)} and was stopped.` }; return; }
  if (spawnError) { yield { type: 'error', message: `Claude Code could not be started: ${spawnError}` }; return; }
  yield* stream.end(stderr || plain);
}

type Opts = Required<Omit<ClaudeAdapterOptions, 'allowApiKey'>>;

/** The running turn: how to kill it, whether it was cancelled, and how to hold its clock. */
interface Turn { kill?: () => void; hold?: (on: boolean) => void; cancelled: boolean }

class ClaudeSession implements AgentSession {
  readonly id: string;
  private readonly start: StartOptions;
  private readonly opts: Opts;
  private started: boolean;
  private turn: Turn | null = null;

  constructor(id: string, resuming: boolean, start: StartOptions, opts: Opts) {
    this.id = id;
    this.start = start;
    this.opts = opts;
    this.started = resuming && transcriptExists(start.cwd, id, opts.env);
  }

  async *prompt(text: string): AsyncGenerator<AgentUpdate> {
    if (this.turn) throw new Error('A turn is already running in this session.');
    const turn: Turn = { cancelled: false };
    this.turn = turn;
    try {
      for (const resume of [this.started, !this.started]) {
        const retry = { wrongFlag: false };
        for await (const update of runOnce(this.opts, this.start, { id: this.id, resume }, text, turn, retry)) {
          this.started = true;
          yield update;
        }
        if (!retry.wrongFlag) return;
      }
      yield { type: 'error', message: 'Claude Code refused this session both as new and as resumed.' };
    } finally {
      this.turn = null;
    }
  }

  hold(on: boolean): void {
    this.turn?.hold?.(on);
  }

  cancel(): void {
    if (!this.turn) return;
    this.turn.cancelled = true;
    this.turn.kill?.();
  }
}

/** The Claude adapter. `start` refuses when ANTHROPIC_API_KEY is set, unless `allowApiKey`. */
export function createClaudeAdapter(options: ClaudeAdapterOptions = {}): AgentAdapter {
  const opts = {
    command: options.command ?? { file: 'claude' },
    turnLimitMs: options.turnLimitMs ?? TURN_LIMIT_MS,
    killGraceMs: options.killGraceMs ?? KILL_GRACE_MS,
    env: options.env ?? process.env,
    log: options.log ?? ((line: string) => { process.stderr.write(`${line}\n`); }),
  };
  return {
    agent: 'claude',
    async start(start) {
      if (opts.env.ANTHROPIC_API_KEY && !options.allowApiKey) {
        throw new Error('ANTHROPIC_API_KEY is set, so Claude Code would bill that key instead of your own login. Unset it, or allow it explicitly.');
      }
      if (start.sessionId !== undefined && !SESSION_ID.test(start.sessionId)) throw new Error(`Not a session id: ${start.sessionId}`);
      return new ClaudeSession(start.sessionId ?? randomUUID(), start.sessionId !== undefined, start, opts);
    },
  };
}
