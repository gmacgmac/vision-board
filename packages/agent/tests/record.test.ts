// The agent module's own `isRecord` (record.ts) holds the same table as `packages/format/tests/records.test.ts`:
// it keeps a copy because the module imports nothing from this repo (D-037), so a test holds the two together.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRecord } from '../src/record.ts';

const CASES: [unknown, boolean][] = [
  [{}, true], [{ a: 1 }, true], [Object.create(null), true],
  [null, false], [undefined, false], [[], false], [[1], false], ['a', false], [1, false], [true, false],
];

test('isRecord: an object is a record; null, an array and a primitive are not', () => {
  for (const [value, want] of CASES) assert.equal(isRecord(value), want, JSON.stringify(value));
});
