// Local-first safety (project rule 18, api.md 28): only this machine, only this page, only JSON.
// Two doors (D-117): the local one (127.0.0.1 or localhost at the server's port, every Tailscale header
// ignored) and, when its settings are given, the remote one only Tailscale Serve reaches (remote.ts).
import type { IncomingMessage } from 'node:http';
import { problem } from './problem.ts';
import type { RemoteDoor } from './remote.ts';
import { loginKey } from './remote.ts';
import * as httpWords from './words/http.ts';

/** Which door a request came in at. */
export type Door = 'local' | RemoteDoor;

export function allowedHosts(port: number): Set<string> {
  return new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
}

const isRead = (req: IncomingMessage): boolean => req.method === 'GET' || req.method === 'HEAD';

/** Rejects DNS rebinding (Host on every request) and cross-site writes (an Origin, when one is
 * sent, must be this server). At the remote door, also the tailnet user (`remoteGuard`). */
export function guard(req: IncomingMessage, port: number, door: Door = 'local'): void {
  if (door !== 'local') return remoteGuard(req, door);
  const hosts = allowedHosts(port);
  if (!hosts.has(req.headers.host ?? ''))
    throw problem('forbidden', httpWords.thisServerAnswersOnlyOn);
  if (isRead(req) || req.headers.origin === undefined) return;
  const origin = req.headers.origin.replace(/^http:\/\//, '');
  if (!hosts.has(origin)) throw problem('forbidden', httpWords.writesAreAcceptedOnlyFrom);
}

/** The remote door (D-117): its own address; never a Funnel request; a signed-in tailnet user on the allow list
 * (Serve sets the login and replaces any a caller sends); a write from exactly the remote page's origin. */
function remoteGuard(req: IncomingMessage, door: RemoteDoor): void {
  if (req.headers.host !== door.host) throw problem('forbidden', httpWords.thisDoorAnswersOnlyOn);
  const login = req.headers['tailscale-user-login'];
  if (req.headers['tailscale-funnel-request'] !== undefined || typeof login !== 'string' || !door.users.has(loginKey(login)))
    throw problem('forbidden', httpWords.thisDoorLetsInOnly);
  if (!isRead(req) && req.headers.origin !== door.origin) throw problem('forbidden', httpWords.writesAreAcceptedOnlyFrom);
}
