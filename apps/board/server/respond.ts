// The standalone server's answers: JSON, JSON Lines for `read_ledger` (api.md 44), problems as
// application/problem+json (api.md 38), and the engine's replies. Never cached.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { EngineReply } from './engine/index.ts';
import type { ProblemError } from './problem.ts';

export function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

/** One JSON value per line, each line ending in a newline. */
export function sendJsonLines(res: ServerResponse, values: readonly unknown[]): void {
  res.writeHead(200, { 'Content-Type': 'application/jsonl; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(values.map((v) => `${JSON.stringify(v)}\n`).join(''));
}

/** The `q` an Accept header gives `type`, or undefined when it does not name it. */
function quality(accept: string, type: string): number | undefined {
  for (const range of accept.split(',')) {
    const [name, ...params] = range.split(';').map((s) => s.trim().toLowerCase());
    if (name !== type) continue;
    const q = params.find((p) => p.startsWith('q='));
    return q ? Number(q.slice(2)) || 0 : 1;
  }
  return undefined;
}

/** True when the caller asked for `application/jsonl` at least as much as for JSON. */
export function wantsJsonLines(req: IncomingMessage): boolean {
  const accept = req.headers.accept ?? '';
  const lines = quality(accept, 'application/jsonl');
  return lines !== undefined && lines > 0 && lines >= (quality(accept, 'application/json') ?? 0);
}

export function sendProblem(res: ServerResponse, p: ProblemError): void {
  res.writeHead(p.status, {
    ...p.headers, 'Content-Type': 'application/problem+json; charset=utf-8', 'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(p.body));
}

/** An engine reply as the response: JSON, unless it is a problem (its own media type and headers). */
export function sendReply(res: ServerResponse, reply: EngineReply): void {
  res.writeHead(reply.status, { 'Content-Type': 'application/json; charset=utf-8', ...reply.headers, 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(reply.body));
}
