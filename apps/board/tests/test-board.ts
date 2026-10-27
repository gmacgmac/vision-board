// A real board server for a test, in the test's own process: the one way every test starts one (the
// API harness, the page suite's servers, the fixture server other modules spawn). A project folder
// (a new temp one unless given, removed on close), a fixture ledger copied in when it has none, the
// built page or a given one, any port (0: a free one). As server.ts starts it, less the folder lock
// (tests take none, project.ts) and the folder choice. Plus the person's cookie and a joined agent,
// the two callers a test acts as. Reached as `#board/testing` (support.ts).
import fs from 'node:fs';
import type http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeTempDir } from '#format/testing';
import type { BoardServerOptions } from '../server/app.ts';
import { createBoardServer } from '../server/app.ts';
import type { Ledger } from '../server/ledger.ts';
import { ledgerPath, openLedger } from '../server/ledger.ts';

/** The page `npm run build` writes: what the standalone server serves. */
export const DIST = fileURLToPath(new URL('../dist', import.meta.url));

export interface TestBoardOptions extends Omit<BoardServerOptions, 'ledger' | 'dist'> {
  /** A ledger already open (a test's own, or a broken one); default the project's. */
  ledger?: Ledger;
  /** The project folder (kept on close); default a new temp folder named `<prefix>…`, its real path (removed). */
  project?: string;
  prefix?: string;
  /** A ledger file copied in when the project has no ledger yet (VB_SEED). */
  seed?: string;
  dist?: string;
  /** 0 (default): a free port. */
  port?: number;
}

export interface TestBoard {
  base: string;
  port: number;
  project: string;
  ledger: Ledger;
  server: http.Server;
  close(): Promise<void>;
}

export async function startTestBoard({ project, prefix = 'vb-board-', seed, dist = DIST, port = 0, ledger: given, ...options }: TestBoardOptions = {}): Promise<TestBoard> {
  const dir = project ?? fs.realpathSync(makeTempDir(prefix));
  const file = ledgerPath(dir);
  if (seed && !fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.copyFileSync(seed, file);
  }
  const ledger = given ?? openLedger(file, () => {});
  const server = createBoardServer({ ...options, ledger, dist });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  const bound = (server.address() as AddressInfo).port;
  return {
    base: `http://127.0.0.1:${bound}`, port: bound, project: dir, ledger, server,
    close: () => new Promise<void>((resolve) => {
      server.closeAllConnections();
      server.close(() => {
        if (!project) fs.rmSync(dir, { recursive: true, force: true });
        resolve();
      });
    }),
  };
}

/** The person's cookie (`vb_person=…`), set with the page as a browser gets it (api.md 20). */
export async function personCookie(base: string): Promise<string> {
  const set = (await fetch(`${base}/`)).headers.get('set-cookie') ?? '';
  const cookie = /^(vb_person=[^;]+)/.exec(set)?.[1];
  if (!cookie) throw new Error('the page set no person cookie');
  return cookie;
}

async function post(base: string, url: string, body: unknown, headers: Record<string, string> = {}): Promise<unknown> {
  const r = await fetch(`${base}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${url} answered ${r.status}: ${await r.text()}`);
  return r.json();
}

/** A joined agent: its secret, and its writes, each item required to succeed. */
export interface TestAgent {
  secret: string;
  write(board: string, items: unknown[]): Promise<{ ok: boolean; n?: number }[]>;
}

export async function joinAgent(base: string, label: string): Promise<TestAgent> {
  const { secret } = await post(base, '/api/agents', { label }) as { secret: string };
  return {
    secret,
    async write(board, items) {
      const out = await post(base, `/api/boards/${board}/write`, { items }, { Authorization: `Bearer ${secret}` }) as { results: { ok: boolean; n?: number }[] };
      if (!out.results.every((x) => x.ok)) throw new Error(`the write failed: ${JSON.stringify(out.results)}`);
      return out.results;
    },
  };
}

/** The person's act on `board`, with the page's cookie. */
export async function personAct(base: string, cookie: string, board: string, body: Record<string, unknown>): Promise<void> {
  await post(base, `/api/boards/${board}/act`, { type: 'act', ...body }, { Cookie: cookie });
}
