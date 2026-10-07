// The pure parts of `npm run board:watch`: the server arguments, the line prefixing and the
// first-build check.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { WATCH_PATHS, built, linePrefixer, serverArgs } from './board-watch.mjs';

test('the server restarts on server code and the shared packages only', () => {
  const args = serverArgs();
  assert.deepEqual(args.slice(0, -1), WATCH_PATHS.map((p) => `--watch-path=${p}`));
  assert.equal(args.at(-1), 'apps/board/server.ts');
  assert.ok(!args.some((a) => a.includes('src/board') || a.includes('dist')), 'page code must not restart the server');
});

test('every complete line gets the prefix; a partial line waits for its newline', () => {
  const out = [];
  const p = linePrefixer('page', (t) => out.push(t));
  p.push('one\ntw');
  assert.deepEqual(out, ['[page] one\n']);
  p.push('o\n\nthree');
  assert.deepEqual(out, ['[page] one\n', '[page] two\n', '[page] \n']);
  p.end();
  assert.equal(out.at(-1), '[page] three\n');
});

test('a page written before this run does not count as built', () => {
  const index = path.join(mkdtempSync(path.join(tmpdir(), 'vb-watch-')), 'index.html');
  assert.equal(built(index, 0), false, 'no file yet');
  writeFileSync(index, '<html></html>');
  utimesSync(index, new Date(1000), new Date(1000));
  assert.equal(built(index, 2000), false, 'stale');
  assert.equal(built(index, 500), true, 'written since the start');
});
