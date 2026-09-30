// Local-first safety (project rule 18): only this machine, only this page, only JSON.
import type { IncomingMessage } from 'node:http';

export class HttpError extends Error {
  status: number;
  problems: string[];
  constructor(status: number, message: string, problems: string[] = []) {
    super(message);
    this.status = status;
    this.problems = problems;
  }
}

export function allowedHosts(port: number): Set<string> {
  return new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
}

/** Rejects DNS rebinding (Host), cross-site writes (Origin) and non-JSON bodies. */
export function guard(req: IncomingMessage, port: number): void {
  const hosts = allowedHosts(port);
  if (!hosts.has(req.headers.host ?? '')) throw new HttpError(403, 'Host not allowed');
  if (req.method === 'GET' || req.method === 'HEAD') return;
  const origin = (req.headers.origin ?? '').replace(/^http:\/\//, '');
  if (!hosts.has(origin)) throw new HttpError(403, 'Origin not allowed');
  if (!(req.headers['content-type'] ?? '').startsWith('application/json'))
    throw new HttpError(415, 'JSON only');
}

export async function readJson(req: IncomingMessage, limit = 64 * 1024): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > limit) throw new HttpError(413, 'Body too large');
    chunks.push(chunk as Buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Body is not valid JSON');
  }
}
