// The server's secrets, one home (ARCH_06): a fresh token, and the constant-time compare of one
// against another. An agent's secret (api.md 21), the person's cookie and a chat run's token are all
// 32 random bytes, and each is checked here, so no check leaks how much of a guess was right.
import { randomBytes, timingSafeEqual } from 'node:crypto';

/** A fresh token: 32 random bytes, base64url (43 characters). */
export const newToken = (): string => randomBytes(32).toString('base64url');

/** Whether two texts are equal, compared in constant time for equal lengths. */
export function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
