// One app's process, from the board's side (D-047 ruling 8): `child_process.fork` of runner.mjs with
// Node's permission model (read the app's folder and the runner only: no writing, no processes, no
// workers, no addons), a capped heap, the app's folder as cwd and an environment holding only the
// declared keys. It waits for the module to load (within `callMs`), then sends calls by id over
// the IPC channel and hands each answer back. Everything the process sends is checked, since the
// app's code runs there. A process that ends while calls are open answers them `ended`, with why.
import type { ChildProcess } from 'node:child_process';
import { fork } from 'node:child_process';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as appsSupervisorWords from '../words/apps-supervisor.ts';

export const RUNNER = fs.realpathSync(fileURLToPath(new URL('./runner.mjs', import.meta.url)));

/** Why the board stopped a process: a call ran too long, it was idle, its code changed or was taken
 * back, its tools don't fit their shape, the board closed the folder. One that ended by itself
 * `crashed`. */
export type StopReason = 'timeout' | 'idle' | 'changed' | 'invalid' | 'closed';

/** One call's answer: the tool's result, its error, a refusal (too large, not JSON), or the end
 * of the process before it answered. */
export type Answer = { result: unknown } | { error: string } | { refused: 'too-large' | 'not-json' } | { ended: StopReason | 'crashed' };

/** The module loaded, with its tools' shapes (unchecked); or why not: its problem, or the end of
 * the process. */
export type Loaded = { tools: unknown[] } | { invalid: string } | { ended: StopReason | 'crashed' };

export interface ChildOptions {
  /** The app's folder and its tools file, real paths. */
  dir: string;
  file: string;
  env: Record<string, string>;
  callMs: number;
  outputBytes: number;
  memoryMb: number;
  /** Called once, when the process has ended: whether it crashed, and the end of what it wrote to stderr. */
  onExit: (crashed: boolean, said: string) => void;
}

export interface Child {
  readonly pid: number | undefined;
  readonly loaded: Promise<Loaded>;
  /** Send one call; its answer comes once. */
  call(tool: string, input: unknown): { id: number; answer: Promise<Answer> };
  /** Abort the call's `ctx.signal` (the panel went away, or the call ran out of time). */
  cancel(id: number): void;
  /** Stop the process now (SIGKILL: a tool can't hold it up). */
  stop(reason: StopReason): void;
}

const SAID = 2000;
const isRec = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** What a message from the process says about call `m.id`, when it is one. */
function answerOf(m: Record<string, unknown>): Answer {
  if ('result' in m) return { result: m.result };
  if (typeof m.error === 'string') return { error: m.error };
  if (m.refused === 'too-large' || m.refused === 'not-json') return { refused: m.refused };
  return { result: undefined };
}

export function startChild(o: ChildOptions): Child {
  const proc: ChildProcess = fork(RUNNER, [o.file, JSON.stringify(Object.keys(o.env)), String(o.outputBytes)], {
    cwd: o.dir, env: o.env, serialization: 'json', stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    execArgv: ['--permission', `--allow-fs-read=${o.dir}`, `--allow-fs-read=${RUNNER}`, `--max-old-space-size=${o.memoryMb}`],
  });
  let said = '';
  proc.stderr?.setEncoding('utf8');
  proc.stderr?.on('data', (chunk: string) => { said = (said + chunk).slice(-SAID); });
  let stopped: StopReason | undefined;
  let invalid = false;
  let ended = false;
  let next = 1;
  const open = new Map<number, (a: Answer) => void>();
  let settle!: (l: Loaded) => void;
  const loaded = new Promise<Loaded>((resolve) => { settle = resolve; });
  // The problem names the tools file, so these words don't.
  const loadTimer = setTimeout(() => {
    settle({ invalid: appsSupervisorWords.didNotFinishLoadingWithin(o.callMs / 1000) });
    stop('timeout');
  }, o.callMs);

  const stop = (reason: StopReason) => {
    if (ended || stopped) return;
    stopped = reason;
    proc.kill('SIGKILL');
  };
  const end = () => {
    if (ended) return;
    ended = true;
    clearTimeout(loadTimer);
    const why = stopped ?? 'crashed';
    settle({ ended: why });
    for (const done of open.values()) done({ ended: why });
    open.clear();
    o.onExit(stopped === undefined && !invalid, said.trim());
  };

  proc.on('message', (m: unknown) => {
    if (!isRec(m)) return;
    if (m.type === 'ready' && Array.isArray(m.tools)) {
      clearTimeout(loadTimer);
      return settle({ tools: m.tools });
    }
    if (m.type === 'invalid' && typeof m.detail === 'string') {
      clearTimeout(loadTimer);
      invalid = true;
      return settle({ invalid: m.detail });
    }
    const done = typeof m.id === 'number' ? open.get(m.id) : undefined;
    if (!done) return;
    open.delete(m.id as number);
    done(answerOf(m));
  });
  // `close`, not `exit`: by then the last of stderr has been read.
  proc.on('close', end);
  // A process that could not start has no pid, and may never send `exit`.
  proc.on('error', (err) => {
    said = `${said}\n${err.message}`.slice(-SAID);
    if (proc.pid === undefined) end();
  });

  return {
    get pid() { return proc.pid; },
    loaded,
    call(tool, input) {
      const id = next++;
      const answer = new Promise<Answer>((resolve) => {
        if (ended) return resolve({ ended: stopped ?? 'crashed' });
        open.set(id, resolve);
        proc.send({ type: 'call', id, tool, input }, (err) => { if (err && open.delete(id)) resolve({ ended: stopped ?? 'crashed' }); });
      });
      return { id, answer };
    },
    cancel(id) {
      if (!ended && proc.connected) proc.send({ type: 'cancel', id }, () => {});
    },
    stop,
  };
}
