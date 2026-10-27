// `isRecord`: the one check on parsed JSON that nine modules each wrote (ARCH_06). `packages/agent/src/record.ts`
// keeps its own copy (the agent module imports nothing from this repo, D-037) and
// `packages/agent/tests/record.test.ts` holds it to this same table.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRecord } from '../src/index.ts';

const CASES: [unknown, boolean][] = [
  [{}, true], [{ a: 1 }, true], [Object.create(null), true],
  [null, false], [undefined, false], [[], false], [[1], false], ['a', false], [1, false], [true, false],
];

test('isRecord: an object is a record; null, an array and a primitive are not', () => {
  for (const [value, want] of CASES) assert.equal(isRecord(value), want, JSON.stringify(value));
});
