// The one atomic write (server/atomic-file.ts `writeFileAtomic`): the new text replaces the file by a
// rename (a new inode, so a reader holding the old file never sees half of the new one), leaves no
// temp file, and gives a new file the mode asked for.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { writeFileAtomic } from '../server/atomic-file.ts';
import { makeTempDir } from '#format/testing';

test('writeFileAtomic: replaces the file by a rename, leaves no temp file, and sets the mode', () => {
  const dir = makeTempDir('vb-atomic-');
  try {
    const file = path.join(dir, 'state.json');
    writeFileAtomic(file, '{"a":1}\n', 0o600);
    const first = fs.statSync(file);
    assert.equal(first.mode & 0o777, 0o600);
    const held = fs.openSync(file, 'r');
    writeFileAtomic(file, '{"a":2}\n', 0o600);
    assert.equal(fs.readFileSync(file, 'utf8'), '{"a":2}\n');
    assert.notEqual(fs.statSync(file).ino, first.ino, 'a new file renamed into place, not the old one written over');
    assert.equal(fs.readFileSync(held, 'utf8'), '{"a":1}\n', 'a reader that opened the old file still reads it whole');
    fs.closeSync(held);
    assert.deepEqual(fs.readdirSync(dir), ['state.json']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
