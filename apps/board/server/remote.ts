// The remote door (D-117): a second door on 127.0.0.1, one port above the server's own, that only
// Tailscale Serve reaches. Its settings are the switch: `VB_REMOTE_URL` (the `https://host:port`
// address the other Mac types) and `VB_REMOTE_USERS` (the tailnet logins it lets in, comma-separated).
// Neither set: no remote door. One alone, or an address that is not `https://host:port`, stops the
// start. guard.ts checks every request at the door; app.ts builds it; server.ts listens it.
import * as httpWords from './words/http.ts';

/** The remote door's address and allow list. `host` is the `Host` Serve passes on (`host:port`). */
export interface RemoteDoor {
  readonly origin: string;
  readonly host: string;
  readonly users: ReadonlySet<string>;
}

/** The port the remote door listens on: the one above the server's own. */
export const remotePort = (port: number): number => port + 1;

/** A tailnet login as the allow list holds it: trimmed, lower case. */
export const loginKey = (login: string): string => login.trim().toLowerCase();

/** The remote door the two settings name, or undefined when neither is set. Throws the start refusal. */
export function remoteDoorOf(url: string | undefined, users: string | undefined): RemoteDoor | undefined {
  const u = url?.trim() ?? '';
  const list = (users ?? '').split(',').map(loginKey).filter(Boolean);
  if (!u && users === undefined) return undefined;
  if (!u || !list.length) throw new Error(httpWords.remoteNeedsBoth);
  let parsed: URL;
  try { parsed = new URL(u); } catch { throw new Error(httpWords.remoteUrlNotHttps(u)); }
  if (parsed.protocol !== 'https:' || !parsed.port || parsed.origin !== u.replace(/\/$/, '') || parsed.username || parsed.password)
    throw new Error(httpWords.remoteUrlNotHttps(u));
  return { origin: parsed.origin, host: parsed.host, users: new Set(list) };
}
