// Holds tests/plugin/contract/README.md true: the copy of the host contract is the source it names, by its sha256, with
// exactly the one change it names (the change key), and that key is the board's.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { CHANGE_META } from './plugin-host.ts';

const read = (name: string) => fs.readFileSync(path.join(import.meta.dirname, name), 'utf8');
const ONE_CHANGE = /^export const CHANGE_META = 'plugin\/change'; \/\/ [^\n]*$/m;

test('the contract copy is its source with one change: the sha256 the README names, once the change key is put back', () => {
  const copy = read('plugin-host.ts');
  assert.equal(copy.match(new RegExp(ONE_CHANGE.source, 'gm'))?.length, 1, 'the one changed line, once');
  const source = copy.replace(ONE_CHANGE, "export const CHANGE_META = 'nclite/change';");
  const sha = /Source sha256 \| `([0-9a-f]{64})`/.exec(read('README.md'))?.[1];
  assert.ok(sha, 'the README names the source sha256');
  assert.equal(createHash('sha256').update(source).digest('hex'), sha);
});

test('the change key is plugin/change', () => {
  assert.equal(CHANGE_META, 'plugin/change');
});
