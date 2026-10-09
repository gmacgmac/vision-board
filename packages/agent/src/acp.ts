// A small Agent Client Protocol client (D-036; PLAN ruling 2): JSON-RPC 2.0 over a child's stdio,
// one JSON object per line. Requests we make are matched to their answers; requests and
// notifications the agent makes reach the handlers. Nothing here knows Kiro; kiro.ts uses it.
import type { ChildProcess } from 'node:child_process';
import { createInterface } from 'node:readline';

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A JSON-RPC error answer. */
export class RpcError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

export interface AcpHandlers {
  /** A notification from the agent. */
  notification(method: string, params: unknown): void;
  /** A request from the agent; the answer is its result. Throw to answer with an error. */
  request(method: string, params: unknown): Promise<unknown>;
  /** A line that was not JSON-RPC, or a message that makes no sense. */
  odd?(what: string): void;
  /** Every line, as it goes (`out`) or comes (`in`): to record a stream. */
  tap?(direction: 'in' | 'out', line: string): void;
}

export class AcpConnection {
  /** Settles when the child has ended. */
  readonly exited: Promise<void>;
  private readonly child: ChildProcess;
  private readonly handlers: AcpHandlers;
  private readonly waiting = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private next = 0;
  private ended = false;
  private tail = '';

  constructor(child: ChildProcess, handlers: AcpHandlers) {
    this.child = child;
    this.handlers = handlers;
    child.stderr?.on('data', (chunk: Buffer) => { this.tail = (this.tail + chunk.toString('utf8')).slice(-4000); });
    child.stdin?.on('error', () => { /* the agent exited: its ending says why */ });
    createInterface({ input: child.stdout!, crlfDelay: Infinity }).on('line', (line) => this.line(line));
    this.exited = new Promise<void>((resolve) => {
      const done = () => {
        this.ended = true;
        for (const w of this.waiting.values()) w.reject(new Error('the agent ended before it answered'));
        this.waiting.clear();
        resolve();
      };
      child.once('close', done);
      child.once('error', (err) => { this.tail = `${this.tail}${err.message}`; done(); });
    });
  }

  /** The end of what the agent wrote on stderr, for an error message. */
  stderrTail(): string {
    return this.tail.trim();
  }

  get alive(): boolean {
    return !this.ended;
  }

  /** Ask the agent; the result, or a rejection with its error or its ending. */
  request<T = unknown>(method: string, params: unknown): Promise<T> {
    if (this.ended) return Promise.reject(new Error('the agent has ended'));
    const id = ++this.next;
    return new Promise<T>((resolve, reject) => {
      this.waiting.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.send({ jsonrpc: '2.0', id, method, params });
    });
  }

  notify(method: string, params: unknown): void {
    if (!this.ended) this.send({ jsonrpc: '2.0', method, params });
  }

  /** SIGTERM, then SIGKILL after `graceMs`. */
  kill(graceMs: number): void {
    if (this.ended) return;
    this.child.kill('SIGTERM');
    setTimeout(() => { if (this.child.exitCode === null && this.child.signalCode === null) this.child.kill('SIGKILL'); }, graceMs).unref();
  }

  private send(message: Rec): void {
    const line = JSON.stringify(message);
    this.handlers.tap?.('out', line);
    this.child.stdin?.write(`${line}\n`);
  }

  private line(line: string): void {
    if (line.trim() === '') return;
    this.handlers.tap?.('in', line);
    let message: unknown;
    try { message = JSON.parse(line); } catch { this.handlers.odd?.('a line that is not JSON'); return; }
    if (!isRec(message)) { this.handlers.odd?.('a message that is not an object'); return; }
    const { id, method } = message;
    if (typeof method === 'string') {
      if (typeof id === 'number' || typeof id === 'string') void this.answer(id, method, message.params);
      else this.handlers.notification(method, message.params);
      return;
    }
    const w = typeof id === 'number' ? this.waiting.get(id) : undefined;
    if (!w || typeof id !== 'number') { this.handlers.odd?.('an answer to a request we did not make'); return; }
    this.waiting.delete(id);
    if (isRec(message.error)) w.reject(new RpcError(Number(message.error.code) || -32000, String(message.error.message ?? 'the agent refused')));
    else w.resolve(message.result);
  }

  private async answer(id: number | string, method: string, params: unknown): Promise<void> {
    try {
      this.send({ jsonrpc: '2.0', id, result: await this.handlers.request(method, params) ?? null });
    } catch (err) {
      const code = err instanceof RpcError ? err.code : -32603;
      this.send({ jsonrpc: '2.0', id, error: { code, message: err instanceof Error ? err.message : String(err) } });
    }
  }
}

/** The answer to a request the client does not offer (fs, terminal): method not found. */
export const NOT_OFFERED = (method: string): RpcError => new RpcError(-32601, `${method} is not offered by this client`);
