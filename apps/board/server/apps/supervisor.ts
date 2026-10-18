// The app host's processes (D-047 ruling 8, apps.md § Limits): one per app, started on its first
// call, never when the board starts. At most `inFlight` calls run at once per app and `queue` more
// wait in line; one more is busy. A call past `callMs` stops the process (`app-timeout`); the next
// call starts it again. A crash starts it again on the next call, after `restartMs`, doubling;
// `crashes` within `crashWindowMs` mark that version of the app broken. A process with no calls
// stops after `idleMs`; one whose code changed or was taken back stops at once; all stop when the
// folder closes. What running a version found (its tools, why it didn't load, why it broke) is kept
// per version, for the one state function (state.ts). Limits come from APP_LIMITS.
import type { AppProblem, AppToolResult } from '../../../../packages/format/src/index.ts';
import { APP_LIMITS } from '../../../../packages/format/src/index.ts';
import type { ProblemError } from '../problem.ts';
import { problem } from '../problem.ts';
import type { Answer, Child, StopReason } from './child.ts';
import { startChild } from './child.ts';
import type { RunFacts } from './state.ts';
import type { CheckedTool } from './tool-checks.ts';
import { checkInput, checkTools, resultOf } from './tool-checks.ts';

export type AppLimits = { [K in keyof typeof APP_LIMITS]: number };

/** One app as the host runs it: its id, the version of its code, its folder and tools file (real
 * paths, and the file's name for problems), and its env, read when its process starts. */
export interface RunSpec { id: string; hash: string; dir: string; file: string; fileName: string; env: () => Record<string, string> }

export interface Supervisor {
  call(spec: RunSpec, tool: string, input: Record<string, unknown>, signal?: AbortSignal): Promise<AppToolResult>;
  /** What running the app at this version found. */
  known: RunFacts;
  /** App `id`'s code is now `hash`, or may not run (undefined): a process running other code stops. */
  seen(id: string, hash: string | undefined): void;
  /** Stop every process (the folder closing). */
  close(): void;
}

/** The problem for an app whose files need fixing. */
export const appInvalid = (id: string, problems: readonly AppProblem[] = []): ProblemError =>
  problem('app-invalid', `The app "${id}" has problems in its files: ${problems.slice(0, 3).map((p) => `${p.file}${p.pointer ? ` ${p.pointer}` : ''}: ${p.detail}`).join(' ')} Fix them and try again.`);

/** A process and its tools, once loaded (rejects with the problem when they don't). */
interface Proc { child?: Child; tools: Promise<Map<string, CheckedTool>> }
interface Waiter { go: () => void; fail: (p: ProblemError) => void }

/** One app at one version. */
interface Entry {
  hash: string;
  proc?: Proc;
  running: number;
  line: Waiter[];
  crashes: number[];
  restartAt: number;
  idle?: NodeJS.Timeout;
  facts: { tools?: string[]; problems?: AppProblem[]; broken?: AppProblem };
}

/** What a call answers when its process ended first, by why it ended. */
function endedProblem(why: StopReason | 'crashed', id: string, tool: string | undefined): ProblemError {
  const doing = tool ? `it ran "${tool}"` : 'its tools loaded';
  const words: Record<StopReason | 'crashed', string> = {
    crashed: `The app "${id}" stopped while ${doing}. It starts again on the next call.`,
    timeout: `The app "${id}" was stopped because another call ran too long. Try again.`,
    changed: `The app "${id}" was stopped while ${doing}, because its code changed or was taken back. Try again once it is allowed.`,
    invalid: `The app "${id}" was stopped because its tools don't fit their shape (list_apps says why).`,
    idle: `The app "${id}" was stopped while ${doing}. Try again.`,
    closed: `The board closed the app "${id}" while ${doing}. Try again.`,
  };
  return problem('app-failed', words[why]);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createSupervisor(overrides: Partial<AppLimits> = {}): Supervisor {
  const limits: AppLimits = { ...APP_LIMITS, ...overrides };
  const apps = new Map<string, Entry>();
  let closed = false;

  /** Stop the entry's process, and refuse the calls waiting in its line. */
  function stopAll(e: Entry, reason: StopReason, waiting?: ProblemError): void {
    clearTimeout(e.idle);
    e.proc?.child?.stop(reason);
    e.proc = undefined;
    if (waiting) for (const w of e.line.splice(0)) w.fail(waiting);
  }

  /** App `id` at version `hash`; a new version starts afresh and stops the old one's process. */
  function entry(id: string, hash: string): Entry {
    const old = apps.get(id);
    if (old?.hash === hash) return old;
    if (old) stopAll(old, 'changed', problem('app-failed', `The code of the app "${id}" changed while this call waited. Try again once it is allowed.`));
    const e: Entry = { hash, running: 0, line: [], crashes: [], restartAt: 0, facts: {} };
    apps.set(id, e);
    return e;
  }

  /** A slot to run in: at once, or after the calls ahead in line; busy when the line is full. */
  async function slot(e: Entry, id: string): Promise<void> {
    if (e.running < limits.inFlight) return void e.running++;
    if (e.line.length >= limits.queue) throw problem('app-busy', `The app "${id}" is busy with other calls. Try again in a moment.`);
    await new Promise<void>((go, fail) => e.line.push({ go, fail }));
  }

  /** Give the slot to the next call in line; with none, stop the process once it has been idle. */
  function release(e: Entry): void {
    const next = e.line.shift();
    if (next) return next.go();
    if (--e.running > 0) return;
    clearTimeout(e.idle);
    e.idle = setTimeout(() => { if (e.running === 0) stopAll(e, 'idle'); }, limits.idleMs);
    e.idle.unref();
  }

  /** The process ended: forget it; a crash counts, waits longer each time, and breaks the app at `crashes`. */
  function exited(e: Entry, proc: Proc, spec: RunSpec, crashed: boolean, said: string): void {
    if (e.proc === proc) e.proc = undefined;
    if (!crashed) return;
    const now = Date.now();
    e.crashes = [...e.crashes.filter((t) => now - t < limits.crashWindowMs), now];
    e.restartAt = now + limits.restartMs * 2 ** (e.crashes.length - 1);
    if (e.crashes.length < limits.crashes) return;
    const last = said ? ` The last time, it said: ${said.slice(-500)}` : '';
    e.facts.broken = { file: spec.fileName, detail: `Its tools stopped ${e.crashes.length} times within ${limits.crashWindowMs / 1000} s, so the board stopped running them.${last} Change the code to try again.` };
  }

  /** The app's process, started now (after any back-off) when it has none, and its checked tools. */
  function procOf(e: Entry, spec: RunSpec): Proc {
    if (e.proc) return e.proc;
    const proc: Proc = { tools: Promise.resolve(new Map()) };
    e.proc = proc;
    proc.tools = (async () => {
      const wait = e.restartAt - Date.now();
      if (wait > 0) await sleep(wait);
      if (e.proc !== proc) throw endedProblem('closed', spec.id, undefined);
      const child = startChild({
        dir: spec.dir, file: spec.file, env: spec.env(), callMs: limits.callMs, outputBytes: limits.outputBytes, memoryMb: limits.memoryMb,
        onExit: (crashed, said) => exited(e, proc, spec, crashed, said),
      });
      proc.child = child;
      const loaded = await child.loaded;
      if ('ended' in loaded) throw endedProblem(loaded.ended, spec.id, undefined);
      const checked = 'invalid' in loaded ? [{ file: spec.fileName, detail: loaded.invalid }] : checkTools(loaded.tools, spec.fileName);
      if (Array.isArray(checked)) {
        e.facts.problems = checked;
        child.stop('invalid');
        throw appInvalid(spec.id, checked);
      }
      e.facts.tools = [...checked.keys()];
      return checked;
    })();
    proc.tools.catch(() => {});
    return proc;
  }

  /** Send one call and wait for its answer, within `callMs`; past it, the process stops (and the
   * next call gets a new one). */
  async function timed(e: Entry, child: Child, spec: RunSpec, tool: string, input: unknown, signal?: AbortSignal): Promise<Answer> {
    const { id, answer } = child.call(tool, input);
    const cancel = () => child.cancel(id);
    signal?.addEventListener('abort', cancel, { once: true });
    let timer: NodeJS.Timeout | undefined;
    const late = new Promise<'late'>((r) => { timer = setTimeout(() => r('late'), limits.callMs); });
    try {
      const first = await Promise.race([answer, late]);
      if (first !== 'late') return first;
      child.cancel(id);
      if (e.proc?.child === child) e.proc = undefined;
      child.stop('timeout');
      throw problem('app-timeout', `The tool "${tool}" of the app "${spec.id}" took too long and was stopped. The next call starts the app again.`);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    }
  }

  return {
    async call(spec, tool, input, signal) {
      if (closed) throw endedProblem('closed', spec.id, tool);
      const e = entry(spec.id, spec.hash);
      if (e.facts.broken) throw problem('app-failed', `The app "${spec.id}" crashed too often, so the board stopped running its tools. It runs again once its code changes.`);
      if (e.facts.problems) throw appInvalid(spec.id, e.facts.problems);
      await slot(e, spec.id);
      clearTimeout(e.idle);
      try {
        if (signal?.aborted) throw problem('app-failed', 'The call was given up before it ran.');
        const proc = procOf(e, spec);
        const tools = await proc.tools;
        const checked = tools.get(tool);
        if (!checked) {
          const has = tools.size ? `Its tools: ${[...tools.keys()].join(', ')}.` : 'It has none.';
          throw problem('invalid', `The app "${spec.id}" has no tool "${tool}". ${has}`, { errors: [{ pointer: '/tool', detail: `no tool "${tool}". ${has}` }] });
        }
        checkInput(spec.id, checked, input);
        const answer = await timed(e, proc.child!, spec, tool, input, signal);
        if ('ended' in answer) throw e.facts.broken ? problem('app-failed', `The app "${spec.id}" stopped while it ran "${tool}", and has now crashed too often: the board stopped running its tools. It runs again once its code changes.`) : endedProblem(answer.ended, spec.id, tool);
        return resultOf(spec.id, checked, answer, limits.outputBytes);
      } finally {
        release(e);
      }
    },
    known(id, hash) {
      const e = apps.get(id);
      return e?.hash === hash ? { ...e.facts } : undefined;
    },
    seen(id, hash) {
      const e = apps.get(id);
      if (!e || e.hash === hash) return;
      stopAll(e, 'changed', problem('app-failed', `The code of the app "${id}" changed, or was taken back, while this call waited. Try again once it is allowed.`));
      apps.delete(id);
    },
    close() {
      closed = true;
      for (const [id, e] of apps) stopAll(e, 'closed', endedProblem('closed', id, undefined));
      apps.clear();
    },
  };
}
