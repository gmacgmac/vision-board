// The chat panel's page tests' own board server (chat-panel FE_02): started in the test process, so
// a test can switch the agent package's fake `claude` (packages/agent/tests/fake-claude.ts, which
// replays a recorded real turn, or hangs) and read what each run was given, the gate's run token
// among it. Never the real CLI. It serves the page the main test server built, on its own port
// (three above it) and its own empty project in the system temp folder, removed on close. Agents
// write through the API and the person acts with the page's cookie, as the board's other tests do.
// A test can hold a session's start (`holdStarts`), to send while a new session is starting.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import type { AgentAdapter } from '../../packages/agent/src/index.ts';
import { createBoardServer } from '../../apps/board/server/app.ts';
import { ledgerPath, openLedger } from '../../apps/board/server/ledger.ts';
import { fakeChat } from '../../apps/board/tests/chat-support.ts';
import { EMPTY_PORT } from './perf-server.ts';

export const CHAT_PORT = EMPTY_PORT + 1;
const DIST = fileURLToPath(new URL('../../apps/board/dist', import.meta.url));

export interface ChatServer {
  base: string;
  fake: ReturnType<typeof fakeChat>;
  /** An agent's write on `board`; the results, each `ok`. */
  write(board: string, items: unknown[]): Promise<{ n?: number }[]>;
  /** A person's act on `board`, with the page's cookie. */
  act(board: string, body: Record<string, unknown>): Promise<void>;
  /** Hold every session start until the returned release is called. */
  holdStarts(): () => void;
  close(): Promise<void>;
}

export async function startChatServer(): Promise<ChatServer> {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'vb-chat-pages-'));
  const fake = fakeChat(fs.mkdtempSync(path.join(project, 'cli-')));
  const file = ledgerPath(project);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  let held: Promise<void> | null = null;
  const claude = (): AgentAdapter => {
    const inner = fake.adapters.claude!();
    return { agent: inner.agent, async start(o) { await held; return inner.start(o); } };
  };
  const server = createBoardServer({ ledger: openLedger(file, () => {}), dist: DIST, chat: { adapters: { claude } } });
  await new Promise<void>((resolve) => server.listen(CHAT_PORT, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const cookie = /^(vb_person=[^;]+)/.exec((await fetch(`${base}/`)).headers.get('set-cookie') ?? '')?.[1] ?? '';
  const post = async (url: string, body: unknown, headers: Record<string, string>) => {
    const r = await fetch(`${base}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(`${url} answered ${r.status}: ${await r.text()}`);
    return r.json() as Promise<unknown>;
  };
  const { secret } = await post('/api/agents', { label: 'Page test agent' }, {}) as { secret: string };
  return {
    base, fake,
    async write(board, items) {
      const out = await post(`/api/boards/${board}/write`, { items }, { Authorization: `Bearer ${secret}` }) as { results: { ok: boolean; n?: number }[] };
      if (!out.results.every((x) => x.ok)) throw new Error(`the write failed: ${JSON.stringify(out.results)}`);
      return out.results;
    },
    async act(board, body) { await post(`/api/boards/${board}/act`, { type: 'act', ...body }, { Cookie: cookie }); },
    holdStarts() {
      let release = () => {};
      held = new Promise<void>((resolve) => { release = resolve; });
      return () => { held = null; release(); };
    },
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      fs.rmSync(project, { recursive: true, force: true });
    },
  };
}
