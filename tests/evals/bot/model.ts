// One run of the bot: the model's CLI in print mode (or the fake bot, which takes the same arguments), one
// conversation for every turn of the scenario, as a host keeps one: the CLI reads the host's messages as stream-json
// on stdin, one per turn, and answers each with a `result` line. Its whole process group is killed at RUN_KILL_MS.
// The stream is kept as it came (stream.jsonl) and read into the run's turns: every text block (the chat), every tool
// use and its answer, the CLI's end of each turn.
import { spawn } from 'node:child_process';
import { createWriteStream, openSync } from 'node:fs';
import path from 'node:path';
import { createInterface } from 'node:readline';
import { KILL_GRACE_MS, RUN_KILL_MS } from './limits.ts';
import type { Exit, TurnRecord, Use } from './types.ts';

export interface Launch { command: string; args: string[]; cwd: string; env: NodeJS.ProcessEnv; out: string; killMs?: number }

const cut = (s: string, n = 4000) => (s.length > n ? `${s.slice(0, n)}…` : s);
const textOf = (content: unknown): string => (typeof content === 'string' ? content
  : Array.isArray(content) ? content.map((c) => (c && typeof c === 'object' && 'text' in c ? String(c.text) : JSON.stringify(c))).join('\n') : JSON.stringify(content));

/** The host's message, as one stream-json user line. */
export const userLine = (text: string) =>
  `${JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text }] }, parent_tool_use_id: null, session_id: '' })}\n`;

/** A spend that can't be read (no `result` line) counts as the whole per-run cap. */
export function runCost(ends: ({ costUsd: number } | null)[], capUsd: number): number {
  if (!ends.length || ends.some((e) => e === null)) return capUsd;
  // The CLI's `total_cost_usd` counts the whole session so far: the last turn's is the run's.
  return Math.max(...ends.map((e) => e!.costUsd));
}

/** The process groups running now, so the eval can end them when it is stopped itself. */
const running = new Set<number>();
export function killRunning(): void {
  for (const pid of running) { try { process.kill(-pid, 'SIGKILL'); } catch { /* gone */ } }
}

/** Run `turns` (each gives the host's next message, after the person's steps) through one process. */
export async function runTurns(l: Launch, turns: (() => Promise<string>)[], onTurn: (i: number) => void) {
  const started = Date.now();
  const stream = createWriteStream(path.join(l.out, 'stream.jsonl'));
  const child = spawn(l.command, l.args, { cwd: l.cwd, env: l.env, detached: true, stdio: ['pipe', 'pipe', openSync(path.join(l.out, 'stderr.txt'), 'w')] });
  const records: TurnRecord[] = [];
  const byId = new Map<string, Use>();
  let model: string | null = null;
  let killed = false;
  let ended: (() => void) | null = null;
  const group = (signal: NodeJS.Signals) => { try { process.kill(-child.pid!, signal); } catch { /* gone */ } };
  child.stdin!.on('error', () => { /* the process is gone: its exit says so */ });
  if (child.pid) running.add(child.pid);
  const exited = new Promise<{ code: number | null; signal: string | null }>((done) => {
    child.on('exit', (code, signal) => { running.delete(child.pid!); done({ code, signal }); });
    child.on('error', (err) => { child.stdout?.destroy(); done({ code: null, signal: `spawn failed: ${err.message}` }); });
  });
  const kill = setTimeout(() => {
    killed = true; group('SIGTERM');
    setTimeout(() => group('SIGKILL'), KILL_GRACE_MS).unref();
  }, l.killMs ?? RUN_KILL_MS);

  const lines = createInterface({ input: child.stdout! });
  const closed = new Promise<void>((done) => { lines.once('close', () => done()); setTimeout(done, (l.killMs ?? RUN_KILL_MS) + 2 * KILL_GRACE_MS).unref(); });
  lines.on('line', (line) => {
    stream.write(`${line}\n`);
    let row: any;
    try { row = JSON.parse(line); } catch { return; }
    const now = records.at(-1);
    if (row.type === 'system' && row.subtype === 'init') model = row.model ?? null;
    if (row.type === 'assistant' && now) for (const c of row.message?.content ?? []) {
      if (c.type === 'text') now.text = now.text ? `${now.text}\n${c.text}` : c.text;
      if (c.type === 'tool_use') { const use: Use = { name: c.name, input: c.input }; now.uses.push(use); byId.set(c.id, use); }
    }
    if (row.type === 'user' && Array.isArray(row.message?.content)) for (const c of row.message.content) {
      const use = c.type === 'tool_result' ? byId.get(c.tool_use_id) : undefined;
      if (use) Object.assign(use, { isError: Boolean(c.is_error), result: cut(textOf(c.content)) });
    }
    if (row.type === 'result' && now) {
      now.end = { subtype: String(row.subtype), numTurns: Number(row.num_turns ?? 0), costUsd: Number(row.total_cost_usd ?? 0), isError: Boolean(row.is_error) };
      ended?.();
    }
  });

  let problem: string | null = null;
  try {
    for (let i = 0; i < turns.length; i++) {
      const message = await turns[i]!();
      records.push({ message, text: '', uses: [], end: null });
      onTurn(i);
      const turnEnded = new Promise<void>((done) => { ended = done; });
      child.stdin!.write(userLine(message));
      const how = await Promise.race([turnEnded.then(() => 'ended'), exited.then(() => 'exited')]);
      if (how === 'exited') break;
    }
  } catch (err) {
    problem = String(err); // a harness step failed: the run stops here, and says why
    killed = false; group('SIGTERM');
  } finally {
    child.stdin!.end();
  }
  const { code, signal } = await exited;
  clearTimeout(kill);
  group('SIGTERM'); // what it started (the MCP pass-through) goes with it, at once
  await closed;
  await new Promise<void>((done) => stream.end(done));
  const missing = records.length < turns.length || records.some((r) => !r.end);
  const exit: Exit = {
    code, signal, killed, seconds: (Date.now() - started) / 1000,
    crashed: !killed && !problem && (missing || records.some((r) => r.end!.isError && !/^error_max/.test(r.end!.subtype))),
  };
  return { turns: records, exit, model, problem };
}
