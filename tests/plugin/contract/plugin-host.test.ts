// Holds tests/plugin/contract/README.md true: every copy under nclite/ is its source's bytes, by the sha256 the README
// names, once the README's one edit (the host's `pageChanged`, which nclite adds when it vendors) is undone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const read = (name: string) => fs.readFileSync(path.join(import.meta.dirname, name), 'utf8');
const ROWS = [...read('README.md').matchAll(/^\| `(nclite\/[^`]+)` \| `([0-9a-f]{64})` \|/gm)].map((m) => ({ file: m[1]!, sha: m[2]! }));

/** nclite's member for item 160, word for word as its handover gives it (the README). */
const PAGE_CHANGED = `\t/**
\t * Says that what \`pageChip()\` would answer may have changed: something else is on show, it emptied, or it filled.
\t * The host asks \`pageChip()\` again soon after and reads nothing from this call. Call it on every such change: the host
\t * coalesces calls. Never call it from \`unmount\` or after it.
\t */
\tpageChanged(): void;
`;

/** The README's edits, each `[the copy's text, the source's]`: the only lines in which a copy is not its source. */
const EDITS: Readonly<Record<string, readonly (readonly [string, string])[]>> = {
  'nclite/shared/plugin-host.ts': [[`\timageRoute: string;\n${PAGE_CHANGED}}`, '\timageRoute: string;\n}']],
};

test('every copy is its source, byte for byte once the README\'s edits are undone: the sha256 the README names', () => {
  assert.equal(ROWS.length, 6, 'the README names six copies');
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
