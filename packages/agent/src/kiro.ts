// The Kiro adapter (D-036; PLAN ruling 2): `kiro-cli acp`, the Agent Client Protocol over stdio
// (acp.ts), engine v2 (kiro-cli 2.28.0's default; its session ids are the lowercase UUIDs the chat
// schema takes). One process per session, started with the session and again, with `session/load`,
// when it has ended; `session/prompt` per turn; `session/cancel` to stop. The board's tool server
// goes in `session/new` and again in every `session/load` (Kiro does not keep it). Permission
// requests become the board's approvals (kiro-permission.ts) over the same route the Claude gate
// uses. Kiro starts as the vision-board agent (kiro-agent.ts, N34): the skill is the agent's own
// prompt, so no message carries it (`instructionsFile` is Claude's), on the model asked for (Opus 5.5
// when none is, never `auto`) at effort high; a session that is not that agent, or does not offer
// that model, ends before any prompt.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import type { AgentAdapter, AgentSession, AgentUpdate, StartOptions } from './adapter.ts';
import type { AcpHandlers } from './acp.ts';
import { AcpConnection, NOT_OFFERED, RpcError } from './acp.ts';
import { refusalFor } from './approvals.ts';
import { askOverHttp, gateWaitMs } from './gate.ts';
import type { TurnClock } from './turn-clock.ts';
import { startTurnClock } from './turn-clock.ts';
import { KIRO_AGENT, KIRO_DEFAULT_MODEL, KIRO_EFFORT, sessionProblem } from './kiro-agent.ts';
import { KiroTurn } from './kiro-turn.ts';
import { outcome, pickOption, readRequest, verdictFor } from './kiro-permission.ts';
import { KILL_GRACE_MS, TURN_LIMIT_MS } from './claude.ts';

const SESSION_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
/** How long the board's tool server has to show it is ready after the session opens. */
const SERVERS_WAIT_MS = 20_000;

export interface KiroAdapterOptions {
  /** The CLI to run; tests point it at a fake. Default `kiro-cli` on PATH. */
  command?: { file: string; args?: string[] };
  turnLimitMs?: number;
  killGraceMs?: number;
  serversWaitMs?: number;
  /** The environment the CLI inherits. Default process.env. */
  env?: NodeJS.ProcessEnv;
  /** Where notes for the host go (an unknown update kind). Default stderr. */
  log?: (line: string) => void;
  /** Every protocol line, as it goes and comes (to record a stream). Never logs by itself. */
  tap?: AcpHandlers['tap'];
}

type Opts = Required<Omit<KiroAdapterOptions, 'tap'>> & Pick<KiroAdapterOptions, 'tap'>;

/** A queue the turn's updates go through: pushed by the protocol's callbacks, read by `prompt`. */
function channel<T>() {
  const items: T[] = [];
  let wake: (() => void) | undefined;
  let closed = false;
  return {
    push(item: T) { items.push(item); wake?.(); },
    end() { closed = true; wake?.(); },
    async *[Symbol.asyncIterator](): AsyncGenerator<T> {
      for (;;) {
        if (items.length > 0) yield items.shift()!;
        else if (closed) return;
        else await new Promise<void>((resolve) => { wake = resolve; });
      }
    },
  };
}

interface Turn {
  mapper: KiroTurn;
  push(update: AgentUpdate): void;
  abort: AbortController;
  cancelled: boolean;
  timedOut: boolean;
  clock?: TurnClock;
}

const reason = (err: unknown) => (err instanceof Error ? err.message : String(err));

class KiroSession implements AgentSession {
  /** Kiro's session id: known after `session/new`, or given to resume. */
  id: string;
  private readonly start: StartOptions;
  private readonly opts: Opts;
  private readonly model: string;
  private conn: AcpConnection | undefined;
  private turn: Turn | null = null;
  private ready = new Set<string>();
  private closed = false;

  constructor(start: StartOptions, opts: Opts) {
    this.start = start;
    this.opts = opts;
    this.model = start.model ?? KIRO_DEFAULT_MODEL;
    this.id = start.sessionId ?? '';
  }

  /** Start the CLI, say hello, and open the session (new, or loaded when there is an id). */
  async open(): Promise<void> {
    const { opts, start } = this;
    const args = [...(opts.command.args ?? ['acp']), '--agent', KIRO_AGENT, '--model', this.model, '--effort', KIRO_EFFORT];
    const child = spawn(opts.command.file, args, { cwd: start.cwd, stdio: ['pipe', 'pipe', 'pipe'], env: opts.env });
    this.ready = new Set();
    const handlers: AcpHandlers = {
      notification: (method, params) => this.notified(method, params),
      request: (method, params) => (method === 'session/request_permission' ? this.permission(params) : Promise.reject(NOT_OFFERED(method))),
      odd: (what) => opts.log(`kiro adapter: passed over ${what}`),
      ...(opts.tap && { tap: opts.tap }),
    };
    const conn = new AcpConnection(child, handlers);
    this.conn = conn;
    void conn.exited.then(() => { if (this.conn === conn) this.conn = undefined; });
    try {
      const init = await conn.request<{ agentCapabilities?: { loadSession?: boolean } }>('initialize', {
        protocolVersion: 1, clientCapabilities: {}, clientInfo: { name: 'vision-board', version: '1' },
      });
      const servers = Object.entries(start.mcpServers).map(([name, s]) => ({
        name, command: s.command, args: s.args ?? [], env: Object.entries(s.env ?? {}).map(([n, value]) => ({ name: n, value })),
      }));
      if (this.id === '') {
        const made = await conn.request<{ sessionId?: string }>('session/new', { cwd: start.cwd, mcpServers: servers });
        const problem = sessionProblem(made, this.model, true);
        if (problem) throw new Error(problem);
        this.id = String(made.sessionId ?? '');
        if (!SESSION_ID.test(this.id)) throw new Error('Kiro answered with a session id this board cannot keep.');
      } else {
        if (init.agentCapabilities?.loadSession !== true) throw new Error('This Kiro cannot load an earlier session.');
        const problem = sessionProblem(await conn.request('session/load', { sessionId: this.id, cwd: start.cwd, mcpServers: servers }), this.model, false);
        if (problem) throw new Error(problem);
      }
    } catch (err) {
      const tail = conn.stderrTail();
      conn.kill(opts.killGraceMs);
      this.conn = undefined;
      throw new Error(`Kiro could not be started: ${reason(err)}${tail ? ` ${tail.slice(-300)}` : ''}`);
    }
  }

  private notified(method: string, params: unknown): void {
    const p = (typeof params === 'object' && params !== null ? params : {}) as Record<string, unknown>;
    if (method === 'session/update' && p.sessionId === this.id && this.turn) {
      for (const update of this.turn.mapper.push(p.update)) this.turn.push(update);
    } else if (method === '_kiro.dev/mcp/server_initialized' && typeof p.serverName === 'string') {
      this.ready.add(p.serverName);
    }
  }

  /** Kiro's permission request, answered through the board's approval (kiro-permission.ts). */
  private async permission(params: unknown): Promise<unknown> {
    const req = readRequest(params);
    if (!req || req.sessionId !== this.id) throw new RpcError(-32602, 'not a permission request for this session');
    const turn = this.turn;
    if (!turn || turn.cancelled) return outcome(null);
    // Kiro's request says less than the tool call it asks about (no kind, no diff): add what the turn saw.
    const call = { ...turn.mapper.known(req.toolCall.toolCallId), ...req.toolCall };
    const own = req.server !== undefined && Object.hasOwn(this.start.mcpServers, req.server);
    const verdict = verdictFor(call, own, this.start.cwd, existsSync, this.start.strictAccess,
      this.start.ledgerFolder === undefined ? undefined : { folder: this.start.ledgerFolder });
    if ('allow' in verdict) return outcome(pickOption(req.options, true));
    if ('refuse' in verdict) {
      this.opts.log(`kiro adapter: refused a tool request: ${verdict.refuse}`);
      return outcome(pickOption(req.options, false));
    }
    try {
      const answer = await askOverHttp(this.start.gate.url, this.start.gate.token, gateWaitMs(this.start.approvalHold))(verdict.ask, turn.abort.signal);
      return outcome(pickOption(req.options, refusalFor(answer) === null));
    } catch {
      return outcome(pickOption(req.options, false));
    }
  }

  /** Wait for the board's tool servers to be ready; the problem, if one is not. */
  private async serversReady(): Promise<string | null> {
    const names = Object.keys(this.start.mcpServers);
    const until = Date.now() + this.opts.serversWaitMs;
    while (names.some((n) => !this.ready.has(n)) && Date.now() < until && this.conn?.alive) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    const missing = names.find((n) => !this.ready.has(n));
    return missing ? `The ${missing} tool server did not start in Kiro, so the turn was not run.` : null;
  }

  async *prompt(text: string): AsyncGenerator<AgentUpdate> {
    if (this.turn || this.closed) throw new Error(this.closed ? 'The session is closed.' : 'A turn is already running in this session.');
    const queue = channel<AgentUpdate>();
    const turn: Turn = {
      mapper: new KiroTurn(this.opts.log), push: (u) => queue.push(u), abort: new AbortController(), cancelled: false, timedOut: false,
    };
    this.turn = turn;
    turn.clock = startTurnClock(this.opts.turnLimitMs, () => { turn.timedOut = true; this.cancel(); });
    void this.run(turn, text).finally(() => { turn.clock?.stop(); queue.end(); });
    try {
      yield* queue;
    } finally {
      turn.clock?.stop();
      this.turn = null;
    }
  }

  private async run(turn: Turn, text: string): Promise<void> {
    const say = (update: AgentUpdate) => turn.push(update);
    try {
      if (!this.conn?.alive) await this.open();
      const problem = await this.serversReady();
      if (problem) return say({ type: 'error', message: problem });
      const answer = await this.conn!.request<{ stopReason?: string }>('session/prompt', {
        sessionId: this.id, prompt: [{ type: 'text', text }],
      });
      if (turn.timedOut) {
        for (const u of turn.mapper.end('cancelled')) if (u.type !== 'stopped') say(u);
        return say({ type: 'error', message: `The agent did not finish within ${Math.round(this.opts.turnLimitMs / 60_000)} minutes and was stopped.` });
      }
      for (const update of turn.mapper.end(answer.stopReason)) say(update);
    } catch (err) {
      const tail = this.conn?.stderrTail() ?? '';
      if (turn.timedOut) return say({ type: 'error', message: `The agent did not finish within ${Math.round(this.opts.turnLimitMs / 60_000)} minutes and was stopped.` });
      if (turn.cancelled) return say({ type: 'stopped' });
      say({ type: 'error', message: `Kiro could not answer: ${reason(err)}${tail ? ` ${tail.slice(-300)}` : ''}` });
    }
  }

  hold(on: boolean): void {
    this.turn?.clock?.hold(on);
  }

  cancel(): void {
    const turn = this.turn;
    if (!turn || turn.cancelled) return;
    turn.cancelled = true;
    turn.abort.abort();
    this.conn?.notify('session/cancel', { sessionId: this.id });
    const conn = this.conn;
    // Kiro should answer the prompt with "cancelled"; if it does not, end the process.
    setTimeout(() => { if (this.turn === turn) conn?.kill(this.opts.killGraceMs); }, this.opts.killGraceMs).unref();
  }

  close(): void {
    this.closed = true;
    this.cancel();
    this.conn?.kill(this.opts.killGraceMs);
  }
}

/** The Kiro adapter. `start` opens the CLI at once, so a bad login or a missing CLI is an error here. */
export function createKiroAdapter(options: KiroAdapterOptions = {}): AgentAdapter {
  const opts: Opts = {
    command: options.command ?? { file: 'kiro-cli', args: ['acp'] },
    turnLimitMs: options.turnLimitMs ?? TURN_LIMIT_MS,
    killGraceMs: options.killGraceMs ?? KILL_GRACE_MS,
    serversWaitMs: options.serversWaitMs ?? SERVERS_WAIT_MS,
    env: options.env ?? process.env,
    log: options.log ?? ((line: string) => { process.stderr.write(`${line}\n`); }),
    ...(options.tap && { tap: options.tap }),
  };
  return {
    agent: 'kiro',
    async start(start) {
      if (start.sessionId !== undefined && !SESSION_ID.test(start.sessionId)) throw new Error(`Not a session id: ${start.sessionId}`);
      if (start.model === 'auto') throw new Error('Kiro\'s auto model is not used here: name a model.');
      const session = new KiroSession(start, opts);
      await session.open();
      return session;
    },
  };
}
