// Holds tests/plugin/contract/README.md true: every copy under nclite/ is its source's bytes, by the sha256 the README
// names, and the one known difference (the change key) is still the one the README names.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { CHANGE_META } from './nclite/shared/plugin-host.ts';

const read = (name: string) => fs.readFileSync(path.join(import.meta.dirname, name), 'utf8');
const ROWS = [...read('README.md').matchAll(/^\| `(nclite\/[^`]+)` \| `([0-9a-f]{64})` \|/gm)].map((m) => ({ file: m[1]!, sha: m[2]! }));

test('every copy is its source, byte for byte: the sha256 the README names', () => {
  assert.equal(ROWS.length, 5, 'the README names five copies');
  for (const { file, sha } of ROWS) assert.equal(createHash('sha256').update(read(file)).digest('hex'), sha, file);
});

test('the one known difference: the contract still says nclite/change, the board writes plugin/change (README)', () => {
  assert.equal(CHANGE_META, 'nclite/change', 'nclite has renamed the key: delete this test and the key move in plugin-types.test.ts');
});
