// The chat panel's page tests' own board server (chat-panel FE_02): started in the test process, so
// a test can switch the agent package's fake `claude` (packages/agent/tests/fake-claude.ts, which
// replays a recorded real turn, or hangs) and read what each run was given, the gate's run token
// among it. Never the real CLI. It serves the page the global setup built, on the worker's chat port
// (ports.ts) and its own empty project in the system temp folder, removed on close. Agents
// write through the API and the person acts with the page's cookie, as the board's other tests do.
// A test can hold a session's start (`holdStarts`), to send while a new session is starting.
import fs from 'node:fs';
import path from 'node:path';
import type { AgentAdapter } from '#agent';
import { fakeChat, joinAgent, personAct, personCookie, startTestBoard } from '#board/testing';
import { PORTS } from './ports.ts';

export interface ChatServer {
  base: string;
  fake: ReturnType<typeof fakeChat>;
  /** An agent's write on `board` (this server's test agent, or the agent whose `secret` is given); the results, each `ok`. */
  write(board: string, items: unknown[], secret?: string): Promise<{ n?: number }[]>;
  /** A person's act on `board`, with the page's cookie. */
  act(board: string, body: Record<string, unknown>): Promise<void>;
  /** Hold every session start until the returned release is called. */
  holdStarts(): () => void;
  close(): Promise<void>;
}

export async function startChatServer(): Promise<ChatServer> {
  let held: Promise<void> | null = null;
  let fake: ReturnType<typeof fakeChat> | undefined;
  const claude = (): AgentAdapter => {
    const inner = fake!.adapters.claude!();
    return { agent: inner.agent, async start(o) { await held; return inner.start(o); } };
  };
  // A Kiro that is the same fake process (only the picker and the session record are under test).
  const kiro = (): AgentAdapter => ({ ...claude(), agent: 'kiro' });
  const board = await startTestBoard({ prefix: 'vb-chat-pages-', port: PORTS.chat, chat: { adapters: { claude, kiro } } });
  fake = fakeChat(fs.mkdtempSync(path.join(board.project, 'cli-')));
  const { base } = board;
  const cookie = await personCookie(base);
  const agent = await joinAgent(base, 'Page test agent');
  return {
    base, fake,
    async write(board, items, as = agent.secret) {
      const r = await fetch(`${base}/api/boards/${board}/write`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${as}` }, body: JSON.stringify({ items }),
      });
      if (!r.ok) throw new Error(`the write answered ${r.status}: ${await r.text()}`);
      const out = await r.json() as { results: { ok: boolean; n?: number }[] };
      if (!out.results.every((x) => x.ok)) throw new Error(`the write failed: ${JSON.stringify(out.results)}`);
      return out.results;
    },
    act: (board, body) => personAct(base, cookie, board, body),
    holdStarts() {
      let release = () => {};
      held = new Promise<void>((resolve) => { release = resolve; });
      return () => { held = null; release(); };
    },
    close: board.close,
  };
}
