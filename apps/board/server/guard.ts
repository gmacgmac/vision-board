// Local-first safety (project rule 18, api.md 28): only this machine, only this page, only JSON.
import type { IncomingMessage } from 'node:http';
import { problem } from './problem.ts';
import * as httpWords from './words/http.ts';

export function allowedHosts(port: number): Set<string> {
  return new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
}

/** Rejects DNS rebinding (Host on every request) and cross-site writes (an Origin, when one is
 * sent, must be this server). */
export function guard(req: IncomingMessage, port: number): void {
  const hosts = allowedHosts(port);
  if (!hosts.has(req.headers.host ?? ''))
    throw problem('forbidden', httpWords.thisServerAnswersOnlyOn);
  if (req.method === 'GET' || req.method === 'HEAD' || req.headers.origin === undefined) return;
  const origin = req.headers.origin.replace(/^http:\/\//, '');
  if (!hosts.has(origin)) throw problem('forbidden', httpWords.writesAreAcceptedOnlyFrom);
}
