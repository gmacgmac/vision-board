// Holds tests/plugin/contract/README.md true: every copy under nclite/ is its source's bytes, by the sha256 the README
// names, once the README's edits (the manifest's `scope`, which nclite adds when it vendors) are undone; and the one known
// difference (the change key) is still the one the README names.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { CHANGE_META } from './nclite/shared/plugin-host.ts';

const read = (name: string) => fs.readFileSync(path.join(import.meta.dirname, name), 'utf8');
const ROWS = [...read('README.md').matchAll(/^\| `(nclite\/[^`]+)` \| `([0-9a-f]{64})` \|/gm)].map((m) => ({ file: m[1]!, sha: m[2]! }));

/** The README's edits, each `[the copy's text, the source's]`: the only lines in which a copy is not its source. */
const EDITS: Readonly<Record<string, readonly (readonly [string, string])[]>> = {
  'nclite/shared/plugin-host.ts': [['\ticon?: string;\n\tscope?: string;\n', '\ticon?: string;\n']],
  'nclite/engine/plugins/stylesheet.ts': [
    ['(id: string, bytes: Uint8Array, scope?: string): string[] {', '(id: string, bytes: Uint8Array): string[] {'],
    ['{ scope: scope ?? id, reads:', '{ scope: css?.scope ?? id, reads:'],
  ],
};

test('every copy is its source, byte for byte once the README\'s edits are undone: the sha256 the README names', () => {
  assert.equal(ROWS.length, 5, 'the README names five copies');
  const readme = read('README.md');
  for (const { file, sha } of ROWS) {
    let text = read(file);
    for (const [copy, source] of EDITS[file] ?? []) {
      assert.equal(text.split(copy).length, 2, `${file}: the edit is there once: ${copy.trim()}`);
      for (const line of `${copy}\n${source}`.split('\n').map((l) => l.trim()).filter(Boolean)) assert.ok(readme.includes(line), `README names the edit: ${line}`);
      text = text.replace(copy, source);
    }
    assert.equal(createHash('sha256').update(text).digest('hex'), sha, file);
  }
});

test('the one known difference: the contract still says nclite/change, the board writes plugin/change (README)', () => {
  assert.equal(CHANGE_META, 'nclite/change', 'nclite has renamed the key: delete this test and the key move in plugin-types.test.ts');
});
