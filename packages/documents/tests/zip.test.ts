// The zip guard and the expander (D-071; the guard's cases ported from KiroCrew `test/test_zip_vet.py`, Apache-2.0, see NOTICE): a declared
// size is a claim until counted, a name is hostile until read, and a refused archive gives back nothing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync } from 'fflate';
import { DocumentRefused, LIMITS, expandZip, zipGuard } from '../src/index.ts';
import { rawZip } from './support.ts';

const refusedWith = (code: string, fn: () => unknown) => assert.throws(fn, (e) => e instanceof DocumentRefused && e.code === code, code);
const text = (b: Uint8Array) => new TextDecoder().decode(b);

test('an archive expands in memory, every file with its path and its bytes, stored or deflated', () => {
  const made = zipSync({ 'a.txt': new TextEncoder().encode('hello'), 'dir/b.txt': [new TextEncoder().encode('there'), { level: 0 }], 'dir/': new Uint8Array() });
  const { files, skipped } = expandZip(made);
  assert.deepEqual(files.map((f) => [f.path, text(f.bytes)]), [['a.txt', 'hello'], ['dir/b.txt', 'there']]);
  assert.equal(skipped, 0);
});

test('what a Mac adds is left out, and counted', () => {
  const { files, skipped } = expandZip(rawZip([{ name: 'a.txt', data: 'x' }, { name: '__MACOSX/._a.txt', data: 'y' }, { name: 'd/.DS_Store', data: 'z' }]));
  assert.deepEqual([files.map((f) => f.path), skipped], [['a.txt'], 2]);
});

test('names that escape or mean more than they read are refused, whole archive', () => {
  for (const name of ['../x', '/x', 'a/../../x', 'a\\..\\x', '\\x', 'C:\\x', 'C:/x', 'a:b', '．．／x', '．．＼x', 'a/ .. /x', 'CON', 'con.txt', 'd/NUL', 'lpt1', 'COM9.log', 'a\u0000b', 'a//b', 'a\nb']) {
    refusedWith('badName', () => expandZip(rawZip([{ name: 'fine.txt', data: 'x' }, { name, data: 'y' }])));
  }
});

test('a path too long or too deep is refused', () => {
  refusedWith('badName', () => expandZip(rawZip([{ name: `${'a'.repeat(LIMITS.pathChars)}.txt`, data: 'x' }])));
  refusedWith('badName', () => expandZip(rawZip([{ name: `${'d/'.repeat(LIMITS.depth)}x`, data: 'x' }])));
});

test('a link entry is refused, and a device or pipe, and a Windows reparse point', () => {
  refusedWith('link', () => expandZip(rawZip([{ name: 'l', data: '/etc/passwd', madeBy: 0x031e, attributes: (0o120777 << 16) >>> 0 }])));
  refusedWith('link', () => expandZip(rawZip([{ name: 'p', madeBy: 0x031e, attributes: (0o010644 << 16) >>> 0 }])));
  refusedWith('link', () => expandZip(rawZip([{ name: 'r', madeBy: 0x0a00, attributes: 0x400 }])));
  assert.equal(expandZip(rawZip([{ name: 'f', data: 'x', madeBy: 0x031e, attributes: (0o100644 << 16) >>> 0 }])).files.length, 1);
});

test('a bomb declared small and really big stops at the first byte past its claim, and gives back nothing', () => {
  const started = performance.now();
  refusedWith('bomb', () => expandZip(rawZip([{ name: 'ok.txt', data: 'x' }, { name: 'bomb.bin', data: new Uint8Array(64 * 1024 * 1024), declared: 1024 }])));
  assert.ok(performance.now() - started < 5000);
});

test('declared sizes are checked before anything is inflated: one entry, and the total', () => {
  refusedWith('tooBig', () => zipGuard(rawZip([{ name: 'a', method: 0, data: '', declared: 0 }, { name: 'b', data: 'x', declared: LIMITS.entryBytes + 1 }])));
  const small = { ...LIMITS, entryBytes: 10, totalBytes: 15 };
  refusedWith('tooBig', () => zipGuard(rawZip([{ name: 'a', data: '12345678' }, { name: 'b', data: '12345678' }]), small));
});

test('too many entries: by count, by the size of the table, and a count that lies about the table', () => {
  const three = rawZip([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
  refusedWith('tooMany', () => zipGuard(three, { ...LIMITS, entries: 2 }));
  refusedWith('tooMany', () => zipGuard(rawZip([{ name: `${'n'.repeat(600)}` }]), { ...LIMITS, entries: 1, centralEntryBytes: 512 }));
  refusedWith('malformed', () => zipGuard(rawZip([{ name: 'a' }, { name: 'b' }], { countDeclared: 1 })));
  refusedWith('malformed', () => zipGuard(rawZip([{ name: 'a' }], { countDeclared: 2 })));
});

test('encrypted entries are refused, by the flag and by the AES method', () => {
  refusedWith('encrypted', () => zipGuard(rawZip([{ name: 'a', data: 'x', flags: 0x0801 }])));
  refusedWith('encrypted', () => zipGuard(rawZip([{ name: 'a', method: 99, data: 'x' }])));
  refusedWith('method', () => zipGuard(rawZip([{ name: 'a', method: 12, data: 'x' }])));
});

test('ZIP64 is refused, by its saturated fields, its extra field and its locator', () => {
  refusedWith('zip64', () => zipGuard(rawZip([{ name: 'a', data: 'x', declared: 0xffffffff }])));
  refusedWith('zip64', () => zipGuard(rawZip([{ name: 'a', data: 'x', extra: new Uint8Array([1, 0, 0, 0]) }])));
  const made = rawZip([{ name: 'a', data: 'x' }]);
  const end = made.length - 22;
  const located = new Uint8Array([...made.subarray(0, end), 0x50, 0x4b, 0x06, 0x07, ...new Uint8Array(16), ...made.subarray(end)]);
  refusedWith('zip64', () => zipGuard(located));
});

test('a crafted ZIP64 of the GHSA-px8p-9vwx-vf98 shape ends in time, at the guard', () => {
  // Saturated sizes beside an extra field whose walk never moves on: the shape that hung fflate before 0.8.3.
  const crafted = rawZip([{ name: 'a', data: 'x', declared: 0xffffffff, compressedDeclared: 0xffffffff, offsetDeclared: 0xffffffff, extra: new Uint8Array([2, 0, 0, 0, 2, 0, 0, 0]) }]);
  const started = performance.now();
  refusedWith('zip64', () => expandZip(crafted));
  assert.ok(performance.now() - started < 1000);
});

test('a table or header that disagrees is refused: never believed on one reading', () => {
  refusedWith('notZip', () => zipGuard(new Uint8Array(10)));
  refusedWith('notZip', () => zipGuard(new TextEncoder().encode('PK\x03\x04 this is no archive at all, though long enough')));
  refusedWith('malformed', () => zipGuard(rawZip([{ name: 'a', data: 'x', offsetDeclared: 3 }])));
  refusedWith('malformed', () => zipGuard(rawZip([{ name: 'a', data: 'x', compressedDeclared: 1 << 24 }])));
  refusedWith('malformed', () => zipGuard(rawZip([{ name: 'same', data: 'x' }, { name: 'same', data: 'y' }])));
  refusedWith('malformed', () => expandZip(rawZip([{ name: 'a', method: 8, data: new Uint8Array(100), declared: 101 }])));
  const made = rawZip([{ name: 'name', data: 'x' }]);
  made[30] = 'N'.charCodeAt(0); // the local header's name, not the central one's
  refusedWith('malformed', () => zipGuard(made));
});

test('an entry whose data runs over the next entry is refused (the overlapping bomb)', () => {
  const body = 3; // 'x' deflated
  const next = 30 + 1 + body;
  refusedWith('malformed', () => zipGuard(rawZip([{ name: 'a', data: 'x', compressedDeclared: next + 30 + 1 + body - 31 }, { name: 'b', data: 'x' }])));
});

test('a garbled stream is refused, not thrown as fflate\'s own', () => {
  const made = rawZip([{ name: 'a', data: 'hello hello hello' }]);
  made[30 + 1] = 0xff; made[30 + 2] = 0xff; made[30 + 3] = 0xff;
  refusedWith('malformed', () => expandZip(made));
});

test('an empty archive is an empty answer', () => {
  assert.deepEqual(expandZip(rawZip([])), { files: [], skipped: 0 });
});

test('an end record outside the tail is none, and a comment that hides one does not fool the search', () => {
  const made = rawZip([{ name: 'a', data: 'x' }]);
  refusedWith('notZip', () => zipGuard(new Uint8Array([...made, ...new Uint8Array(70_000)])));
  assert.equal(zipGuard(rawZip([{ name: 'a', data: 'x' }], { comment: 'PK\x05\x06 a comment that looks like an end' })).length, 1);
});

test('caps belong to the caller: what one refuses another may take', () => {
  const made = rawZip([{ name: 'a' }, { name: 'b' }]);
  refusedWith('tooMany', () => zipGuard(made, { ...LIMITS, entries: 1 }));
  assert.equal(zipGuard(made, { ...LIMITS, entries: 2 }).length, 2);
});
