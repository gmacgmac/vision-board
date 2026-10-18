// The version of an app's code the person allows (D-047 ruling 7, apps.md § Approval): the SHA-256,
// in lowercase hex, of the bytes of `app.json` followed by the bytes of the tools file. The panel is
// not in it: it runs in its sandboxed frame, never on the board's server.
import { createHash } from 'node:crypto';

export function appHash(manifest: Buffer, tools?: Buffer): string {
  const hash = createHash('sha256').update(manifest);
  if (tools) hash.update(tools);
  return hash.digest('hex');
}
