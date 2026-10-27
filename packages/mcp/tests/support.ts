// Test support: a real board server (the API harness, started as a child process on a free port,
// since packages may not import apps) and the MCP server itself as a spawned child, spoken to over
// its stdin and stdout exactly as an MCP client would. Not a test itself (no .test.ts).
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/vb-mcp.ts', import.meta.url));
// The board's fixture server, run as a child: its test door (`#board/testing`) serves when run.
const BOARD = fileURLToPath(import.meta.resolve('#board/testing'));

/** The `_meta` a 2026-07-28 client sends on every request. */
export const MODERN_META = {
  'io.modelcontextprotocol/protocolVersion': '2026-07-28',
  'io.modelcontextprotocol/clientCapabilities': {},
  'io.modelcontextprotocol/clientInfo': { name: 'vb-mcp-test', version: '1.0.0' },
};

/** Stop a child by closing its stdin, and wait for it to exit. */
async function stop(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null) return;
  const closed = new Promise<void>((resolve) => child.once('exit', () => resolve()));
  child.stdin!.end();
  await closed;
}

export interface Board { base: string; close(): Promise<void> }

/** The API harness over the roadmap fixture plus the seeded `pricing` board. */
export async function startBoard(): Promise<Board> {
  const child = spawn(process.execPath, [BOARD], { stdio: ['pipe', 'pipe', 'inherit'] });
  const base = await new Promise<string>((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`the fixture server exited (${code}) before it was ready`)));
    child.stdout!.once('data', (chunk: Buffer) => resolve(String(chunk).trim()));
  });
  child.removeAllListeners('exit');
  return { base, close: () => stop(child) };
}

export interface Session {
  /** Send a request and resolve to its whole JSON-RPC response. */
  request(method: string, params?: Record<string, unknown>): Promise<any>;
  /** Send a notification (no answer comes). */
  notify(method: string, params?: Record<string, unknown>): void;
  /** Write a raw line to the server's stdin. */
  raw(line: string): void;
  /** Every message the server wrote to stdout, in order. */
  readonly lines: any[];
  close(): Promise<void>;
}

/** Spawn the MCP server with exactly these extra environment variables, in the temp folder (in no
 * project, so it names no folder: the repo's own `.visionboard/` is not the fixture server's). */
export function startMcp(env: Record<string, string>): Session {
  const childEnv: Record<string, string | undefined> = { ...process.env };
  delete childEnv.VB_AGENT_SECRET;
  delete childEnv.VB_SERVER;
  delete childEnv.VB_PROJECT;
  const child = spawn(process.execPath, [BIN], { stdio: ['pipe', 'pipe', 'pipe'], cwd: tmpdir(), env: { ...childEnv, ...env } });
  child.stderr!.resume(); // logs; read so the pipe never fills
  const lines: any[] = [];
  const waiting = new Map<number | string, (msg: any) => void>();
  createInterface({ input: child.stdout! }).on('line', (line) => {
    const msg = JSON.parse(line);
    lines.push(msg);
    waiting.get(msg.id)?.(msg);
    waiting.delete(msg.id);
  });
  let next = 1;
  const write = (msg: unknown) => { child.stdin!.write(`${JSON.stringify(msg)}\n`); };
  return {
    lines,
    request(method, params) {
      const id = next++;
      const answer = new Promise<any>((resolve) => waiting.set(id, resolve));
      write({ jsonrpc: '2.0', id, method, ...(params && { params }) });
      return answer;
    },
    notify(method, params) { write({ jsonrpc: '2.0', method, ...(params && { params }) }); },
    raw(line) { child.stdin!.write(`${line}\n`); },
    close: () => stop(child),
  };
}

/** A `tools/call` as a 2026-07-28 client sends it; resolves to the result (or the error response). */
export async function call(s: Session, name: string, args: Record<string, unknown>): Promise<any> {
  const r = await s.request('tools/call', { name, arguments: args, _meta: MODERN_META });
  return r.result ?? r;
}
