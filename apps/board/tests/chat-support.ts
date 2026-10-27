// Chat test support: the agent package's fake `claude` (`#agent/testing` FAKE_CLAUDE, which replays
// a recorded real turn) as the server's Claude adapter, what each fake run was given, and
// a reader for a session's event stream. Not a test itself (no .test.ts).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createClaudeAdapter } from '#agent';
import { DRAW, FAKE_CLAUDE } from '#agent/testing';
import type { ChatAdapters } from '../server/chat-sessions.ts';

export { DRAW, FAKE_CLAUDE };

/** What one fake run was given. */
export interface Given {
  args: string[];
  prompt: string;
  gate: { url: string; token: string };
  mcpConfig: { mcpServers: Record<string, { command: string; args: string[]; env: Record<string, string> }> };
  pid: number;
  /** The folder the CLI ran in. */
  cwd: string;
}

export type Event = Record<string, any> & { kind: string; seq: number };

/** The fake as the server's Claude; `mode` switches it (replay, hang) for the next run. `config`
 * is the CLI's config folder, where a transcript would be. */
export function fakeChat(config: string) {
  const note = path.join(config, 'fake-claude-notes.jsonl');
  const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_CONFIG_DIR: config, FAKE_CLAUDE_FIXTURE: DRAW, FAKE_CLAUDE_MODE: 'replay', FAKE_CLAUDE_NOTE: note };
  delete env.ANTHROPIC_API_KEY;
  const adapters: ChatAdapters = {
    claude: () => createClaudeAdapter({ command: { file: process.execPath, args: [FAKE_CLAUDE] }, env, log: () => {} }),
  };
  const given = (): Given[] => (fs.existsSync(note) ? fs.readFileSync(note, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
  return {
    adapters,
    given,
    mode(m: 'replay' | 'hang') { env.FAKE_CLAUDE_MODE = m; },
    /** Wait for run number `n` (from 1) to have started, and return what it was given. */
    async run(n: number): Promise<Given> {
      for (let i = 0; i < 200; i++) {
        const runs = given();
        if (runs.length >= n) return runs[n - 1]!;
        await new Promise((r) => setTimeout(r, 25));
      }
      return assert.fail(`the fake CLI never ran a ${n}th time`);
    },
  };
}

/** Read a session's stream from `after` until `until` holds for what came, then close it. */
export async function readChat(base: string, cookie: string, session: string, until: (events: Event[]) => boolean, after = 0): Promise<Event[]> {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), 10_000);
  const res = await fetch(`${base}/api/chats/${session}/events?after=${after}`, { headers: { Cookie: cookie }, signal: stop.signal });
  assert.equal(res.status, 200);
  const events: Event[] = [];
  let text = '';
  try {
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      text += Buffer.from(chunk).toString('utf8');
      let end: number;
      while ((end = text.indexOf('\n\n')) >= 0) {
        const block = text.slice(0, end);
        text = text.slice(end + 2);
        const id = /^id: (\d+)$/m.exec(block)?.[1];
        const data = /^data: (.*)$/m.exec(block)?.[1];
        if (!/^event: chat$/m.test(block) || data === undefined) continue;
        const event = JSON.parse(data) as Event;
        assert.equal(Number(id), event.seq, 'the SSE id is the event\'s seq');
        events.push(event);
      }
      if (until(events)) break;
    }
  } catch (err) {
    if (!stop.signal.aborted) throw err;
    assert.fail(`the stream did not bring what was awaited; it brought ${JSON.stringify(events.map((e) => e.kind))}`);
  } finally {
    clearTimeout(timer);
    stop.abort();
  }
  return events;
}

/** The stream holds a turn's end. */
export const turnEnded = (events: Event[]) => events.some((e) => e.kind === 'system' && e.turn !== undefined);

/** POST facts to the gate's route as the gate does, with a run token. */
export function ask(base: string, token: string, facts: unknown): Promise<Response> {
  return fetch(`${base}/api/run/approvals`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(facts),
  });
}

export const alive = (pid: number): boolean => { try { process.kill(pid, 0); return true; } catch { return false; } };

/** Wait until `pid` has gone. */
export async function gone(pid: number): Promise<void> {
  for (let i = 0; i < 200 && alive(pid); i++) await new Promise((r) => setTimeout(r, 25));
  assert.ok(!alive(pid), `process ${pid} is still running`);
}
