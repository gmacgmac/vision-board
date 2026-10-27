// The server's secrets (secrets.ts): a fresh token is 32 random bytes in base64url, and a compare
// of two texts is exact whatever their lengths.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newToken, sameText } from '../server/secrets.ts';

test('a token is 43 base64url characters and never repeats', () => {
  const tokens = new Set(Array.from({ length: 50 }, newToken));
  assert.equal(tokens.size, 50);
  for (const t of tokens) assert.match(t, /^[A-Za-z0-9_-]{43}$/);
});

test('sameText: equal texts match; a different text, a prefix and an empty one do not', () => {
  const t = newToken();
  assert.equal(sameText(t, t), true);
  assert.equal(sameText(t, `${t}x`), false);
  assert.equal(sameText(t, t.slice(0, -1)), false);
  assert.equal(sameText(t, newToken()), false);
  assert.equal(sameText('', ''), true);
  assert.equal(sameText('', t), false);
});
